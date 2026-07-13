/**
 * @fileoverview Health snapshot da plataforma para o painel
 * admin master (Fase 21).
 *
 * Coleta métricas agregadas de saúde, custo, capacidade e
 * movimentação. Tudo client-side por enquanto — Firestore suporta
 * a query pesada por `count()` e `listCollections()`. Algumas
 * métricas (latência, error rate, billing) só ficam completas
 * quando rodamos a Cloud Function `platformHealthCron` ou
 * integramos com a Firebase Billing API (roadmap).
 *
 * Toda a leitura de coleções é admin-only (regra Firestore: só
 * platform_admin lê `platform_health_snapshots` e `platform_alert_config`).
 *
 * Os snapshots são materializados pelo CRON em
 * `functions/platformHealthCron.js` e caem em
 * `platform_health_snapshots/{timestamp}`.
 */

import {
  collection,
  count,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  doc,
  where,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { parseTimestamp } from '@/core/utils/timestamp';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

/** Janela em ms para agregações. */
export const WINDOWS = Object.freeze({
  LAST_24H: ONE_DAY_MS,
  LAST_7D: SEVEN_DAYS_MS,
  LAST_30D: 30 * ONE_DAY_MS,
});

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Calcula a janela inicial em milissegundos (epoch) para um
 * período expresso em ms antes de `now`.
 * @param {number} windowMs
 * @param {Date} [now]
 * @returns {number}
 */
export function windowStartMs(windowMs, now = new Date()) {
  return now.getTime() - Number(windowMs);
}

/**
 * Agrega contadores simples sobre uma collection filtrada por
 * um campo timestamp em milissegundos. Usado para o MVP do painel
 * de saúde (active users, signups, etc).
 *
 * @param {string} collectionName
 * @param {string} timestampField nome do campo timestamp (segundos ou ms)
 * @param {number} windowMs
 * @returns {Promise<{total: number, inWindow: number}>}
 */
export async function countRecentDocs(collectionName, timestampField, windowMs) {
  if (!db) return { total: 0, inWindow: 0 };
  try {
    const totalSnap = await getCountFromServer(collection(db, collectionName));
    const start = windowStartMs(windowMs);
    const inWindowSnap = await getCountFromServer(
      query(
        collection(db, collectionName),
        where(`${timestampField}_ms`, '>=', start),
      ),
    );
    return { total: totalSnap.data().count, inWindow: inWindowSnap.data().count };
  } catch (err) {
    logger.warn(`platformHealth: countRecentDocs(${collectionName}) failed`, err);
    return { total: 0, inWindow: 0 };
  }
}

/**
 * Métricas de auth: usuários ativos e signups em uma janela.
 * client-side; Firestore retorna via `count()` (admin SDK) ou
 * `getCountFromServer` (web SDK). Para Fase 21: contadores
 * simples. Em produção, integrar com Firebase Auth telemetry.
 *
 * @param {number} [windowMs=86400000]
 * @returns {Promise<{active_users_24h: number, signups_24h: number}>}
 */
export async function getAuthMetrics(windowMs = WINDOWS.LAST_24H) {
  const [active, signups] = await Promise.all([
    countRecentDocs('users', 'last_seen_at', windowMs),
    countRecentDocs('users', 'created_at', windowMs),
  ]);
  return {
    active_users_24h: active.inWindow,
    signups_24h: signups.inWindow,
    total_users: active.total,
  };
}

/**
 * Funções: invocations e errors. Para o MVP, derivamos de
 * `audit_logs` filtrando por `action === 'function_error'` ou
 * categorias equivalentes. Quando a Cloud Function
 * `platformHealthCron` popular este snapshot, esses valores
 * podem ser lidos direto de `platform_health_snaphots`.
 *
 * @param {number} [windowMs=86400000]
 * @returns {Promise<{invocations_24h: number, errors_24h: number}>}
 */
export async function getFunctionsMetrics(windowMs = WINDOWS.LAST_24H) {
  if (!db) return { invocations_24h: 0, errors_24h: 0 };
  const start = windowStartMs(windowMs);
  try {
    const [invSnap, errSnap] = await Promise.all([
      getCountFromServer(
        query(
          collection(db, 'function_invocations'),
          where('created_at_ms', '>=', start),
        ),
      ),
      getCountFromServer(
        query(
          collection(db, 'function_invocations'),
          where('created_at_ms', '>=', start),
          where('status', '==', 'error'),
        ),
      ),
    ]);
    return {
      invocations_24h: invSnap.data().count,
      errors_24h: errSnap.data().count,
    };
  } catch (err) {
    // collection não existe ainda — retorna zeros (cold start do MVP)
    return { invocations_24h: 0, errors_24h: 0 };
  }
}

/**
 * Hosting: último deploy + uptime. Lê do doc
 * `platform_health_snapshots` ordenado por `created_at_ms` desc.
 *
 * @returns {Promise<{last_deploy_at: Date|null, uptime_30d: number}>}
 */
export async function getHostingMetrics() {
  if (!db) return { last_deploy_at: null, uptime_30d: 100 };
  try {
    const snap = await getDocs(
      query(collection(db, 'platform_health_snapshots'), orderBy('created_at_ms', 'desc'), limit(1)),
    );
    if (snap.empty) return { last_deploy_at: null, uptime_30d: 100 };
    const data = snap.docs[0].data();
    return {
      last_deploy_at: toDate(data.last_deploy_at) || null,
      uptime_30d: Number(data.uptime_30d ?? 100),
    };
  } catch (err) {
    return { last_deploy_at: null, uptime_30d: 100 };
  }
}

/**
 * Latência agregada. Lê das métricas materializadas (CRON). Se
 * ainda não há snapshot, retorna zeros — o painel exibe
 * "aguardando primeira coleta".
 *
 * @returns {Promise<{latency_p50: number, latency_p99: number, error_rate: number}>}
 */
export async function getFirestoreLatency() {
  const hosting = await getHostingMetrics();
  // Lê snapshot mais recente dentro do doc `platform_health_snapshots/latest_firestore`
  if (!db) return { latency_p50: 0, latency_p99: 0, error_rate: 0 };
  try {
    const snap = await getDocs(
      query(collection(db, 'platform_health_snapshots'), orderBy('created_at_ms', 'desc'), limit(5)),
    );
    if (snap.empty) return { latency_p50: 0, latency_p99: 0, error_rate: 0 };
    const samples = snap.docs
      .map((d) => d.data().firestore || null)
      .filter(Boolean);
    if (samples.length === 0) return { latency_p50: 0, latency_p99: 0, error_rate: 0 };
    // média simples — Fase 21 MVP
    const avg = (key) =>
      samples.reduce((acc, s) => acc + (Number(s[key]) || 0), 0) / samples.length;
    return {
      latency_p50: Math.round(avg('latency_p50')),
      latency_p99: Math.round(avg('latency_p99')),
      error_rate: Number(avg('error_rate').toFixed(4)),
    };
  } catch (err) {
    return { latency_p50: 0, latency_p99: 0, error_rate: 0, _uptime_30d: hosting.uptime_30d };
  }
}

/**
 * Snapshot agregado para o painel "Saúde". Combina todas as
 * métricas acima. É a função principal que a página
 * `/admin/saude` consome.
 *
 * @param {object} [opts]
 * @param {number} [opts.windowMs]
 * @returns {Promise<{
 *   firestore: {latency_p50: number, latency_p99: number, error_rate: number},
 *   auth: {active_users_24h: number, signups_24h: number, total_users: number},
 *   functions: {invocations_24h: number, errors_24h: number},
 *   hosting: {last_deploy_at: Date|null, uptime_30d: number},
 *   generated_at: string,
 * }>}
 */
export async function getHealthSnapshot({ windowMs = WINDOWS.LAST_24H } = {}) {
  const [auth, fns, hosting, firestore] = await Promise.all([
    getAuthMetrics(windowMs),
    getFunctionsMetrics(windowMs),
    getHostingMetrics(),
    getFirestoreLatency(),
  ]);
  return {
    firestore,
    auth,
    functions: fns,
    hosting,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Billing summary manual. Para Fase 21 MVP o admin marca o uso
 * em `platform_billing/{periodId}`. Quando integrarmos com
 * Firebase Billing API (roadmap), esta função vira apenas um
 * adapter.
 *
 * @param {{start: Date, end: Date}} period
 * @returns {Promise<{
 *   period: {start: string, end: string},
 *   reads: number, writes: number, deletes: number,
 *   storage_gb: number, bandwidth_gb: number,
 *   estimated_cost_usd: number, manual: boolean,
 * }>}
 */
export async function getBillingSummary(period) {
  if (!db) {
    return emptyBillingSummary(period);
  }
  const periodId = periodIdForRange(period.start, period.end);
  try {
    const snap = await getDocs(collection(db, 'platform_billing'));
    const matching = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((entry) => entry.id === periodId);
    if (!matching) return emptyBillingSummary(period, false);
    return {
      period: { start: period.start.toISOString(), end: period.end.toISOString() },
      reads: Number(matching.reads || 0),
      writes: Number(matching.writes || 0),
      deletes: Number(matching.deletes || 0),
      storage_gb: Number(matching.storage_gb || 0),
      bandwidth_gb: Number(matching.bandwidth_gb || 0),
      estimated_cost_usd: Number(matching.estimated_cost_usd || 0),
      manual: true,
    };
  } catch (err) {
    logger.warn('platformHealth: getBillingSummary failed', err);
    return emptyBillingSummary(period);
  }
}

/**
 * Salva o billing do período (admin marca manualmente o uso).
 * @param {{start: Date, end: Date}} period
 * @param {{
 *   reads: number, writes: number, deletes: number,
 *   storage_gb: number, bandwidth_gb: number,
 *   estimated_cost_usd: number,
 * }} payload
 * @param {object} actor
 */
export async function upsertBillingSummary(period, payload, actor) {
  if (!db) throw new Error('Firestore não inicializado.');
  const periodId = periodIdForRange(period.start, period.end);
  await setDoc(doc(db, 'platform_billing', periodId), {
    period_start: period.start.toISOString(),
    period_end: period.end.toISOString(),
    reads: Number(payload.reads || 0),
    writes: Number(payload.writes || 0),
    deletes: Number(payload.deletes || 0),
    storage_gb: Number(payload.storage_gb || 0),
    bandwidth_gb: Number(payload.bandwidth_gb || 0),
    estimated_cost_usd: Number(payload.estimated_cost_usd || 0),
    manual: true,
    updated_by: actor?.uid || null,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'platform_billing_summary_updated',
    actor,
    details: { period_id: periodId, ...payload },
  });
  return { id: periodId };
}

/**
 * Estatísticas de collections via `count()` (Firestore web SDK).
 * Para Fase 21: top-N collections mais usadas. Coleções vazias
 * aparecem com count 0.
 *
 * @param {{limit?: number}} [opts]
 * @returns {Promise<Array<{name: string, count: number}>>}
 */
export async function getCollectionStats({ limit: limitCount = 30 } = {}) {
  if (!db) return [];
  const KNOWN = [
    'users', 'pets', 'clubs', 'communities', 'adoption_interests',
    'adoption_ratings', 'abuse_reports', 'audit_logs', 'notifications',
    'club_campaigns', 'club_ledger', 'club_events', 'club_posts',
    'pet_photos', 'platform_health_snapshots', 'platform_alert_config',
    'platform_billing', 'community_posts', 'community_forum_threads',
    'shelter_profiles',
  ];
  const counts = await Promise.all(
    KNOWN.map(async (name) => {
      try {
        const c = await getCountFromServer(collection(db, name));
        return { name, count: c.data().count };
      } catch (err) {
        return { name, count: 0 };
      }
    }),
  );
  return counts
    .sort((a, b) => b.count - a.count)
    .slice(0, limitCount);
}

/**
 * Heurística simples de índices faltando: compara os
 * `firestore.indexes.json` declarados com queries registradas
 * em `slow_queries`. Para Fase 21 MVP, retornamos apenas o
 * número de queries lentas e a lista dos fingerprints mais
 * comuns — não é a integração completa com a Firebase Console.
 *
 * @param {{limit?: number}} [opts]
 * @returns {Promise<{
 *   missing_count: number,
 *   fingerprints: Array<{fingerprint: string, count: number, sample_query: string}>,
 * }>}
 */
export async function getMissingIndexes({ limit: limitCount = 10 } = {}) {
  if (!db) return { missing_count: 0, fingerprints: [] };
  try {
    const snap = await getDocs(
      query(
        collection(db, 'slow_queries'),
        orderBy('created_at_ms', 'desc'),
        limit(200),
      ),
    );
    const counts = new Map();
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const fingerprint = String(data.fingerprint || data.query || '');
      if (!fingerprint) continue;
      const existing = counts.get(fingerprint) || { count: 0, sample_query: fingerprint };
      existing.count += 1;
      counts.set(fingerprint, existing);
    }
    const fingerprints = [...counts.entries()]
      .map(([fingerprint, v]) => ({ fingerprint, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limitCount);
    return {
      missing_count: fingerprints.length,
      fingerprints,
    };
  } catch (err) {
    return { missing_count: 0, fingerprints: [] };
  }
}

/**
 * Top N queries mais lentas dentro do período.
 * @param {{periodDays?: number, limit?: number}} [opts]
 * @returns {Promise<Array<{fingerprint: string, latency_ms: number, created_at: Date|null}>>}
 */
export async function getSlowQueries({ periodDays = 7, limit: limitCount = 10 } = {}) {
  if (!db) return [];
  const start = windowStartMs(periodDays * ONE_DAY_MS);
  try {
    const snap = await getDocs(
      query(
        collection(db, 'slow_queries'),
        where('created_at_ms', '>=', start),
        orderBy('latency_ms', 'desc'),
        limit(limitCount),
      ),
    );
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        fingerprint: String(data.fingerprint || data.query || ''),
        latency_ms: Number(data.latency_ms || 0),
        collection: String(data.collection || ''),
        created_at: toDate(data.created_at),
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Lista o audit log com filtros client-side (Fase 21 MVP). A
 * collection `audit_logs` é global (já existe) e o componente
 * `AuditLogTable` já consome. Aqui só centralizamos a função
 * `getAuditLogEntries` que páginas admin podem usar.
 *
 * @param {{
 *   category?: string,  // 'pet'|'community'|'club'|'shelter' (filtra por prefixo de action)
 *   action?: string,
 *   userId?: string,
 *   startDate?: Date|null,
 *   endDate?: Date|null,
 *   limit?: number,
 * }} [filters]
 * @returns {Promise<Array<Record<string, any>>>}
 */
export async function getAuditLogEntries(filters = {}) {
  if (!db) return [];
  const limitCount = filters.limit ?? 200;
  const constraints = [];
  if (filters.action) constraints.push(where('action', '==', filters.action));
  if (filters.userId) constraints.push(where('user_id', '==', filters.userId));
  const q = constraints.length > 0
    ? query(collection(db, 'audit_logs'), ...constraints, limit(limitCount))
    : query(collection(db, 'audit_logs'), limit(limitCount));
  const snap = await getDocs(q);
  const startMs = filters.startDate ? filters.startDate.getTime() : null;
  const endMs = filters.endDate ? filters.endDate.getTime() : null;
  const category = filters.category ? String(filters.category).toLowerCase() : null;
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((entry) => {
      const ms = Number(entry.created_at_ms || 0);
      if (startMs !== null && ms < startMs) return false;
      if (endMs !== null && ms > endMs) return false;
      if (category) {
        const action = String(entry.action || '').toLowerCase();
        if (category === 'pet' && !action.startsWith('pet_')) return false;
        if (category === 'community' && !action.includes('community_')) return false;
        if (category === 'club' && !action.startsWith('club_')) return false;
        if (category === 'shelter' && !action.startsWith('shelter_')) return false;
      }
      return true;
    });
}

/** @internal export só para testes */
export const __testing = { ONE_DAY_MS, SEVEN_DAYS_MS, periodIdForRange };

function emptyBillingSummary(period, manual = false) {
  return {
    period: { start: period.start.toISOString(), end: period.end.toISOString() },
    reads: 0,
    writes: 0,
    deletes: 0,
    storage_gb: 0,
    bandwidth_gb: 0,
    estimated_cost_usd: 0,
    manual,
  };
}

function periodIdForRange(start, end) {
  const fmt = (d) => d.toISOString().slice(0, 10);
  return `${fmt(start)}_${fmt(end)}`;
}

// Re-exporta `count` para os testes (mock helper)
export { count };
