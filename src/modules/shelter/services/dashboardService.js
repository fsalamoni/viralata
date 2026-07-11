/**
 * @fileoverview Serviço: Dashboard do Abrigo (Fase 14).
 *
 * Implementa:
 *  - `subscribeDashboard(clubId, callback)` — inscreve em todas as
 *    collections subjacentes via `onSnapshot`, mantém um agregado
 *    `Map<collection, count/list>` com debounce de 1s, e chama o callback
 *    com o `DashboardData` produzido por `computeDashboardSummary`.
 *  - `getDashboardWidgets(clubId)` — lista widgets customizados.
 *  - `createWidget`, `updateWidget`, `deleteWidget` — CRUD com audit log.
 *
 * Multi-tenant: `shelter_club_id` é o filtro de TODAS as queries
 * (defense-in-depth: redundante no doc do widget também).
 *
 * Real-time: cada `onSnapshot` atualiza o agregado. Um debounce de 1s
 * evita render-spam quando vários snapshots chegam em sequência
 * (ex.: adoção de um pet dispara update em pets + adoption_workflow
 * + post_adoption).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 14
 */

import {
  collection, collectionGroup, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, onSnapshot,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  computeDashboardSummary,
  createWidgetSchema,
  updateWidgetSchema,
  DASHBOARD_COLLECTIONS,
} from '@/modules/shelter/domain/operational/dashboard';

const CLUBS_COLLECTION = 'clubs';
const PETS_COLLECTION = 'pets';
const WIDGETS_SUBCOLLECTION = 'dashboard_widgets';
const MEDICATIONS_SUBCOLLECTION = 'medications';
const EXHIBITIONS_COLLECTION = 'exhibitions';
const DEBOUNCE_MS = 1000;

// ─── subscribeDashboard ─────────────────────────────────────────────────

/**
 * Assina todas as collections relevantes do dashboard de um abrigo.
 *
 * @param {string} clubId
 * @param {(data: import('@/modules/shelter/domain/operational/dashboard').DashboardData) => void} callback
 * @param {object} [options]
 * @param {import('@/modules/shelter/domain/operational/dashboard').DashboardCardData[]} [options.customWidgets]
 * @returns {() => void} unsubscribe
 */
export function subscribeDashboard(clubId, callback, options = {}) {
  if (!clubId) throw new Error('clubId é obrigatório');
  if (typeof callback !== 'function') throw new Error('callback deve ser função');
  if (!db) {
    // Em ambiente de teste / sem Firebase, retorna unsubscribe no-op
    logger.warn('dashboardService.subscribeDashboard', { msg: 'Firebase indisponível; no-op' });
    callback(computeDashboardSummary(clubId, { errors: { _init: 'db_unavailable' } }));
    return () => {};
  }

  // Snapshot agregado: {pets: [...], adoptions: [...], postAdoptions: [...], ...}
  const state = {
    pets: [],
    adoptions: [],
    postAdoptions: [],
    fosters: [],
    exhibitions: [],
    medicationsCount: 0,
    medicationsDueToday: 0,
    customCounts: {},
    errors: {},
    ready: { pets: false, adoptions: false, postAdoptions: false, fosters: false, exhibitions: false, medications: false },
  };

  let timer = null;
  let unsubscribers = [];
  let disposed = false;

  function flush() {
    if (disposed) return;
    timer = null;
    try {
      const data = {
        pets: state.pets,
        adoptions: state.adoptions,
        postAdoptions: state.postAdoptions,
        fosters: state.fosters,
        exhibitions: state.exhibitions,
        medicationsCount: state.medicationsCount,
        medicationsDueToday: state.medicationsDueToday,
        customCounts: state.customCounts,
        errors: state.errors,
      };
      const summary = computeDashboardSummary(clubId, data, {
        now: new Date(),
        customWidgets: options.customWidgets || [],
      });
      callback(summary);
    } catch (err) {
      logger.error('dashboardService.subscribeDashboard.flush', { err: String(err) });
    }
  }

  function scheduleFlush() {
    if (disposed) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  }

  function onData(key, docs) {
    state[key] = docs;
    state.ready[key] = true;
    scheduleFlush();
  }

  function onError(key, err) {
    logger.warn('dashboardService.subscribeDashboard', {
      msg: `snapshot error on ${key}`,
      err: String(err?.message || err),
    });
    state.errors[key] = err?.message || 'unknown';
    scheduleFlush();
  }

  // 1) Pets do abrigo (raiz com filtro shelter_owner_club_id)
  const petsQ = query(
    collection(db, PETS_COLLECTION),
    where('shelter_owner_club_id', '==', clubId),
    limit(500),
  );
  unsubscribers.push(
    onSnapshot(
      petsQ,
      (snap) => onData('pets', snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError('pets', err),
    ),
  );

  // 2) Adoption workflow (subcoleção do abrigo)
  const appsQ = query(
    collection(db, CLUBS_COLLECTION, clubId, DASHBOARD_COLLECTIONS.ADOPTION_WORKFLOW),
    limit(500),
  );
  unsubscribers.push(
    onSnapshot(
      appsQ,
      (snap) => onData('adoptions', snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError('adoptions', err),
    ),
  );

  // 3) Post-adoption (subcoleção do abrigo)
  const postQ = query(
    collection(db, CLUBS_COLLECTION, clubId, DASHBOARD_COLLECTIONS.POST_ADOPTION),
    where('status', '==', 'active'),
    limit(500),
  );
  unsubscribers.push(
    onSnapshot(
      postQ,
      (snap) => onData('postAdoptions', snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError('postAdoptions', err),
    ),
  );

  // 4) Fosters (subcoleção do abrigo, ativos)
  const fostersQ = query(
    collection(db, CLUBS_COLLECTION, clubId, DASHBOARD_COLLECTIONS.FOSTERS),
    where('status', '==', 'active'),
    limit(500),
  );
  unsubscribers.push(
    onSnapshot(
      fostersQ,
      (snap) => onData('fosters', snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError('fosters', err),
    ),
  );

  // 5) Exhibitions (Fase 11 — vitrines com shelter_club_id; pode estar vazio se Fase 11 não está ativa)
  const exQ = query(
    collection(db, EXHIBITIONS_COLLECTION),
    where('shelter_club_id', '==', clubId),
    limit(200),
  );
  unsubscribers.push(
    onSnapshot(
      exQ,
      (snap) => onData('exhibitions', snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => onError('exhibitions', err),
    ),
  );

  // 6) Medicações: collectionGroup em 'medications' filtrado por shelter_club_id.
  //    (Subcoleção de pets/{petId}/medications/{medId}. collectionGroup precisa
  //    de índice single-field em shelter_club_id, que é auto-criado pelo
  //    Firestore — sem declaração no firestore.indexes.json.)
  const medsQ = query(
    collectionGroup(db, MEDICATIONS_SUBCOLLECTION),
    where('shelter_club_id', '==', clubId),
    where('status', '==', 'active'),
    limit(1000),
  );
  unsubscribers.push(
    onSnapshot(
      medsQ,
      (snap) => {
        const now = Date.now();
        let dueToday = 0;
        const docs = snap.docs.map((d) => {
          const data = { id: d.id, ...d.data() };
          // Conta doses pendentes hoje
          const next = data.next_dose_at || data.scheduled_for;
          if (next) {
            const t = new Date(next).getTime();
            const dayMs = 24 * 60 * 60 * 1000;
            if (t <= now && t > now - dayMs) dueToday += 1;
          }
          return data;
        });
        state.medicationsCount = docs.length;
        state.medicationsDueToday = dueToday;
        state.ready.medications = true;
        scheduleFlush();
      },
      (err) => onError('medications', err),
    ),
  );

  // Cleanup
  return function unsubscribe() {
    disposed = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    for (const u of unsubscribers) {
      try { u(); } catch (err) { /* noop */ }
    }
    unsubscribers = [];
  };
}

// ─── CRUD de widgets customizados ──────────────────────────────────────

/**
 * Lista widgets customizados do abrigo, ordenados por `order`.
 */
export async function getDashboardWidgets(clubId) {
  if (!db) return [];
  if (!clubId) throw new Error('clubId é obrigatório');
  const q = query(
    collection(db, CLUBS_COLLECTION, clubId, WIDGETS_SUBCOLLECTION),
    orderBy('order', 'asc'),
    limit(100),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria um widget customizado.
 *
 * @param {object} input - {shelter_club_id, type, title, query, ...}
 * @param {object} actor - {uid, displayName}
 */
export async function createWidget(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createWidgetSchema.parse(input);

  const payload = {
    ...parsed,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, CLUBS_COLLECTION, parsed.shelter_club_id, WIDGETS_SUBCOLLECTION),
    payload,
  );

  await createAuditLog({
    action: 'dashboard_widget_created',
    actor,
    details: {
      widget_id: ref.id,
      shelter_club_id: parsed.shelter_club_id,
      type: parsed.type,
      title: parsed.title,
    },
  }).catch((err) => {
    logger.warn('dashboardService.createWidget', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, ...payload };
}

/**
 * Atualiza um widget existente. Verifica tenant antes de salvar.
 */
export async function updateWidget(clubId, widgetId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!clubId || !widgetId) throw new Error('clubId e widgetId obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateWidgetSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  // Verifica tenant
  const ref = doc(db, CLUBS_COLLECTION, clubId, WIDGETS_SUBCOLLECTION, widgetId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Widget não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== clubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  await updateDoc(ref, {
    ...parsed,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'dashboard_widget_updated',
    actor,
    details: {
      widget_id: widgetId,
      shelter_club_id: clubId,
      changed: Object.keys(parsed),
    },
  }).catch(() => {});

  return { changed_fields: Object.keys(parsed) };
}

/**
 * Deleta um widget.
 */
export async function deleteWidget(clubId, widgetId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!clubId || !widgetId) throw new Error('clubId e widgetId obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const ref = doc(db, CLUBS_COLLECTION, clubId, WIDGETS_SUBCOLLECTION, widgetId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Widget não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== clubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  await deleteDoc(ref);

  await createAuditLog({
    action: 'dashboard_widget_deleted',
    actor,
    details: {
      widget_id: widgetId,
      shelter_club_id: clubId,
      title: current.title,
    },
  }).catch(() => {});

  return { id: widgetId, deleted: true };
}
