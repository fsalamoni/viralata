/**
 * @fileoverview Service de alertas de segurança (Fase 20).
 *
 * Lado-client: o `securityAlertsService` consulta a coleção
 * `platform_security_alerts` (somente leitura — escrita só pela Cloud
 * Function `triggerSecurityAlert` / Admin SDK) e expõe helpers para o
 * painel admin:
 *
 *   - listAlerts(filters)         → snapshot em tempo real (onSnapshot)
 *   - getAlert(alertId)           → leitura única
 *   - resolveAlert(alertId, uid)  → marca como resolvido
 *   - triggerAlert({...})         → chama a Cloud Function onCall
 *
 * O Firestore rules dessa coleção só permite leitura para
 * platform_admin; quem não for vai receber permissão negada e o
 * service degrada graciosamente (retorna array vazio).
 *
 * @see functions/securityAlerts.js
 * @see firestore.rules (match /platform_security_alerts)
 * @see src/modules/admin/pages/SecurityAlerts.jsx
 */

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  limit,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { parseTimestamp } from '@/core/utils/timestamp';

const COLLECTION = 'platform_security_alerts';

/** Enums espelhando functions/securityAlerts.js (validado no server). */
export const ALERT_TYPE = Object.freeze({
  LOGIN_SUSPICIOUS: 'login_suspicious',
  RULES_CHANGE: 'rules_change',
  BILLING_SPIKE: 'billing_spike',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  RLS_DENIED: 'rls_denied',
  MANUAL: 'manual',
});

export const ALERT_SEVERITY = Object.freeze({
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

export const ALERT_SOURCE = Object.freeze({
  AUTH: 'auth',
  FIRESTORE: 'firestore',
  STORAGE: 'storage',
  FUNCTIONS: 'functions',
  CLIENT: 'client',
});

/** Labels pt-BR para a UI. */
export const ALERT_TYPE_LABELS = Object.freeze({
  [ALERT_TYPE.LOGIN_SUSPICIOUS]: 'Login suspeito',
  [ALERT_TYPE.RULES_CHANGE]: 'Alteração de regras',
  [ALERT_TYPE.BILLING_SPIKE]: 'Pico de billing',
  [ALERT_TYPE.RATE_LIMIT_HIT]: 'Rate limit atingido',
  [ALERT_TYPE.RLS_DENIED]: 'Acesso negado por RLS',
  [ALERT_TYPE.MANUAL]: 'Alerta manual',
});

export const ALERT_SEVERITY_LABELS = Object.freeze({
  [ALERT_SEVERITY.LOW]: 'Baixa',
  [ALERT_SEVERITY.MEDIUM]: 'Média',
  [ALERT_SEVERITY.HIGH]: 'Alta',
  [ALERT_SEVERITY.CRITICAL]: 'Crítica',
});

/** Cores Tailwind/badge para severidade (consistente com o resto do admin). */
export const ALERT_SEVERITY_BADGE_CLASS = Object.freeze({
  [ALERT_SEVERITY.LOW]: 'bg-slate-100 text-slate-700 border-slate-200',
  [ALERT_SEVERITY.MEDIUM]: 'bg-amber-100 text-amber-800 border-amber-200',
  [ALERT_SEVERITY.HIGH]: 'bg-orange-100 text-orange-800 border-orange-200',
  [ALERT_SEVERITY.CRITICAL]: 'bg-red-100 text-red-800 border-red-300',
});

/**
 * Constrói a query base. Suporta filtros por severity/type/source/
 * resolved. Aplica `limit` por último para garantir que o índice
 * composto (quando houver) seja usado.
 *
 * @param {object} [filters]
 * @param {string} [filters.severity]
 * @param {string} [filters.type]
 * @param {string} [filters.source]
 * @param {boolean} [filters.resolved]
 * @param {number} [filters.max] default 50
 */
export function buildAlertsQuery(filters = {}) {
  if (!db) return null;
  const conds = [];
  if (filters.severity) conds.push(where('severity', '==', filters.severity));
  if (filters.type) conds.push(where('type', '==', filters.type));
  if (filters.source) conds.push(where('source', '==', filters.source));
  if (typeof filters.resolved === 'boolean') {
    conds.push(where('resolved', '==', filters.resolved));
  }
  const max = Number.isFinite(filters.max) && filters.max > 0 ? filters.max : 50;
  const base = collection(db, COLLECTION);
  // ordering + limit juntos — o Firestore vai exigir índice se houver
  // where adicionais; aceitamos `failed-precondition` em runtime (UI
  // degrada pra lista vazia) até o índice ser criado.
  return query(base, ...conds, orderBy('created_at', 'desc'), limit(max));
}

/**
 * Assina em tempo real os alertas que satisfazem os filtros.
 * Retorna uma função de cleanup. Falha de permissão / índice ausente
 * é logada mas não derruba o caller — o array fica vazio.
 *
 * @param {object} filters
 * @param {(alerts: SecurityAlert[]) => void} onChange
 * @param {(err: Error) => void} [onError]
 * @returns {() => void} unsubscribe
 */
export function subscribeAlerts(filters, onChange, onError) {
  const q = buildAlertsQuery(filters);
  if (!q) {
    onChange([]);
    return () => {};
  }
  try {
    return onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => normalizeAlert(d.id, d.data()));
        onChange(items);
      },
      (err) => {
        logger.warn('securityAlertsService: subscribeAlerts falhou', { error: String(err) });
        onChange([]);
        if (onError) onError(err);
      },
    );
  } catch (err) {
    logger.warn('securityAlertsService: erro síncrono em subscribeAlerts', { error: String(err) });
    onChange([]);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Versão one-shot (getDocs) — útil em testes.
 * @param {object} [filters]
 * @returns {Promise<SecurityAlert[]>}
 */
export async function listAlerts(filters = {}) {
  if (!db) return [];
  const { getDocs } = await import('firebase/firestore');
  const q = buildAlertsQuery(filters);
  if (!q) return [];
  try {
    const snap = await getDocs(q);
    return snap.docs.map((d) => normalizeAlert(d.id, d.data()));
  } catch (err) {
    logger.warn('securityAlertsService: listAlerts falhou', { error: String(err) });
    return [];
  }
}

/**
 * Lê um alerta único.
 * @param {string} alertId
 * @returns {Promise<SecurityAlert|null>}
 */
export async function getAlert(alertId) {
  if (!db || !alertId) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, alertId));
    if (!snap.exists()) return null;
    return normalizeAlert(snap.id, snap.data());
  } catch (err) {
    logger.warn('securityAlertsService: getAlert falhou', { error: String(err) });
    return null;
  }
}

/**
 * Marca um alerta como resolvido. ATENÇÃO: o Firestore rules atual
 * bloqueia `write` direto do client na coleção
 * `platform_security_alerts` (só Admin SDK pode). Esta função
 * tenta o update e, se for negado, loga e retorna `false`. Em
 * produção, isso deve virar uma Cloud Function callable (e.g.
 * `resolveSecurityAlert`) — por ora deixamos a porta entreaberta
 * com try/catch explícito.
 *
 * @param {string} alertId
 * @param {string} userId
 * @returns {Promise<boolean>} true se atualizado
 */
export async function resolveAlert(alertId, userId) {
  if (!db || !alertId || !userId) return false;
  try {
    await updateDoc(doc(db, COLLECTION, alertId), {
      resolved: true,
      resolved_by: userId,
      resolved_at: serverTimestamp(),
    });
    return true;
  } catch (err) {
    logger.warn('securityAlertsService: resolveAlert bloqueado pelo RLS', { error: String(err) });
    return false;
  }
}

/**
 * Reabre um alerta (resolved → false). Mesmo caveat do resolveAlert
 * — fica como utilidade client-side, mas a fonte de verdade é o
 * Admin SDK / Cloud Function.
 */
export async function reopenAlert(alertId, userId) {
  if (!db || !alertId || !userId) return false;
  try {
    await updateDoc(doc(db, COLLECTION, alertId), {
      resolved: false,
      resolved_by: null,
      resolved_at: null,
      last_reopened_by: userId,
      last_reopened_at: serverTimestamp(),
    });
    return true;
  } catch (err) {
    logger.warn('securityAlertsService: reopenAlert bloqueado pelo RLS', { error: String(err) });
    return false;
  }
}

/**
 * Cria um alerta manualmente via Cloud Function onCall
 * `triggerSecurityAlert`. Disponível para platform_admin (a função
 * checa role e retorna 403 caso contrário).
 *
 * @param {object} params
 * @param {string} params.type
 * @param {string} params.severity
 * @param {string} [params.source]
 * @param {object} [params.context]
 * @returns {Promise<{ alert_id: string }|null>}
 */
export async function triggerAlert({ type, severity, source, context }) {
  if (!functions) return null;
  try {
    const callable = httpsCallable(functions, 'triggerSecurityAlert');
    const res = await callable({ type, severity, source, context });
    return res.data || null;
  } catch (err) {
    logger.warn('securityAlertsService: triggerAlert falhou', { error: String(err) });
    return null;
  }
}

/**
 * Normaliza um documento do Firestore para a forma consumida pela UI.
 * Garante que `resolved`, `severity` e `type` tenham defaults seguros
 * caso o doc esteja incompleto.
 *
 * @param {string} id
 * @param {Record<string, any> | undefined | null} data
 * @returns {SecurityAlert}
 */
export function normalizeAlert(id, data) {
  const d = data || {};
  // context deve ser objeto "puro" — não-array. Arrays no topo
  // são pegadinhas comuns (typeof === 'object').
  const safeContext = d.context && typeof d.context === 'object' && !Array.isArray(d.context)
    ? d.context
    : {};
  return {
    id,
    type: d.type || ALERT_TYPE.MANUAL,
    severity: d.severity || ALERT_SEVERITY.LOW,
    source: d.source || ALERT_SOURCE.CLIENT,
    context: safeContext,
    created_at: d.created_at || null,
    created_at_ms: typeof d.created_at_ms === 'number' ? d.created_at_ms : null,
    created_by: d.created_by || null,
    resolved: Boolean(d.resolved),
    resolved_by: d.resolved_by || null,
    resolved_at: d.resolved_at || null,
    notes: d.notes || null,
  };
}

/**
 * Formata um Timestamp / Date / ms para a string pt-BR local.
 * @param {{seconds: number}|Date|number|null|undefined} value
 * @param {number} [fallbackMs]
 * @returns {string}
 */
export function formatAlertDate(value, fallbackMs) {
  const date = toDate(value) || (fallbackMs ? new Date(fallbackMs) : null);
  if (!date) return '—';
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * @typedef {Object} SecurityAlert
 * @property {string} id
 * @property {string} type
 * @property {string} severity
 * @property {string} source
 * @property {Record<string, any>} context
 * @property {any} created_at
 * @property {number|null} created_at_ms
 * @property {string|null} created_by
 * @property {boolean} resolved
 * @property {string|null} resolved_by
 * @property {any} resolved_at
 * @property {string|null} notes
 */

// `setDoc`/`doc` exports — mantidos aqui para evitar import duplicado
// se outros módulos do admin quiserem escrever (ex: testes).
export { setDoc, doc };
