/**
 * @fileoverview Serviço de Timeline do Animal (Fase 2).
 *
 * CRUD + queries sobre a subcoleção `pets/{petId}/timeline/{eventId}`.
 * Esta é a primeira subcoleção com multi-tenant enforcement: cada evento
 * carrega `shelter_club_id` e o Firestore rule garante que só o abrigo
 * correto lê/escreve.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 2 + § 11.1
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  timelineEventCreateSchema,
  timelineEventUpdateSchema,
  validateTimelinePayload,
  TIMELINE_EVENT_TYPES,
} from '@/modules/shelter/domain/core/timeline';

const PETS_COLLECTION = 'pets';
const TIMELINE_SUBCOLLECTION = 'timeline';

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Lista os eventos da timeline de um pet, em ordem decrescente por data.
 *
 * @param {string} petId
 * @param {string} shelterClubId - filtra por abrigo (multi-tenant)
 * @param {object} options
 * @param {number} options.maxResults - default 100
 * @returns {Promise<Array<{id, pet_id, shelter_club_id, type, event_date, recorded_by_uid, recorded_by_name, data, created_at}>>}
 */
export async function listTimelineEvents(petId, shelterClubId, options = {}) {
  if (!db) return [];
  if (!petId) throw new Error('petId é obrigatório');
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  const { maxResults = 100 } = options;

  const q = query(
    collection(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    orderBy('event_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Busca um evento específico. Retorna null se não existir ou se não
 * pertencer ao abrigo (multi-tenant check no client como defense-in-depth;
 * Firestore rule é a fonte da verdade).
 */
export async function getTimelineEvent(petId, eventId, shelterClubId) {
  if (!db || !petId || !eventId) return null;
  const ref = doc(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION, eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (shelterClubId && data.shelter_club_id !== shelterClubId) {
    logger.warn('timelineService.getTimelineEvent', {
      msg: 'cross-tenant access blocked',
      petId,
      eventId,
    });
    return null;
  }
  return { id: snap.id, ...data };
}

// ─── Write ──────────────────────────────────────────────────────────────

/**
 * Adiciona um evento na timeline.
 *
 * @param {string} petId
 * @param {object} input - {type, event_date?, data, recorded_by_name?}
 * @param {object} actor - {uid, displayName?}
 * @returns {Promise<{id: string}>}
 *
 * Valida o payload específico do tipo (discriminated union). O
 * `shelter_club_id` é derivado do `actor.uid` (busca abrigo do usuário)
 * OU passado explicitamente. Para evitar lookup, exigimos que o caller
 * passe via options.
 */
export async function addTimelineEvent(petId, input, actor, options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  if (!petId) throw new Error('petId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!options.shelterClubId) {
    throw new Error('shelterClubId é obrigatório nas options (multi-tenant)');
  }

  // 1. Validação geral (campos top-level)
  const top = timelineEventCreateSchema.parse(input);

  // 2. Validação específica do payload (discriminated por type)
  const data = validateTimelinePayload(top.type, top.data);

  // 3. Monta o doc final
  const event_date = top.event_date || new Date().toISOString();
  const payload = {
    pet_id: petId,
    shelter_club_id: options.shelterClubId,
    type: top.type,
    event_date,
    recorded_by_uid: actor.uid,
    recorded_by_name: top.recorded_by_name || actor.displayName || null,
    data,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION),
    payload,
  );

  // 4. Audit log
  await createAuditLog({
    action: 'timeline_event_added',
    actor,
    details: {
      pet_id: petId,
      event_id: ref.id,
      type: top.type,
      shelter_club_id: options.shelterClubId,
    },
  }).catch((err) => {
    logger.warn('timelineService.addTimelineEvent', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id };
}

/**
 * Atualiza um evento. Só permite alterar `event_date` e `data`. Outros
 * campos (type, pet_id, shelter_club_id, recorded_by_uid) são IMUTÁVEIS
 * (defesa contra fraude na timeline).
 */
export async function updateTimelineEvent(petId, eventId, updates, actor, options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  if (!petId || !eventId) throw new Error('petId e eventId são obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!options.shelterClubId) {
    throw new Error('shelterClubId é obrigatório');
  }

  const top = timelineEventUpdateSchema.parse(updates);

  // SEMPRE buscar o evento atual para validar existência e tenant.
  // (Mesmo se só `event_date` mudou — temos que checar tenant.)
  const ref = doc(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION, eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Evento não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== options.shelterClubId) {
    throw new Error('Evento não pertence a este abrigo.');
  }

  // Se `data` mudou, valida contra o tipo atual
  let newData = top.data;
  if (newData) {
    newData = validateTimelinePayload(current.type, newData);
  }

  const delta = {};
  if (top.event_date) delta.event_date = top.event_date;
  if (newData) delta.data = newData;
  if (Object.keys(delta).length === 0) return { changed_fields: [], noop: true };

  delta.updated_at = serverTimestamp();
  delta.last_edited_by_uid = actor.uid;

  await updateDoc(
    doc(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION, eventId),
    delta,
  );

  await createAuditLog({
    action: 'timeline_event_updated',
    actor,
    details: { pet_id: petId, event_id: eventId, changed: Object.keys(delta) },
  }).catch(() => {});

  return { changed_fields: Object.keys(delta) };
}

/**
 * Soft delete: marca `deleted_at` e `deleted_by`. Não remove físico
 * (audit trail preservado). Eventos deletados somem do feed padrão.
 */
export async function deleteTimelineEvent(petId, eventId, actor, options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  if (!petId || !eventId) throw new Error('petId e eventId são obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!options.shelterClubId) {
    throw new Error('shelterClubId é obrigatório');
  }

  const ref = doc(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION, eventId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Evento não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== options.shelterClubId) {
    throw new Error('Evento não pertence a este abrigo.');
  }

  await updateDoc(ref, {
    deleted_at: new Date().toISOString(),
    deleted_by_uid: actor.uid,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'timeline_event_deleted',
    actor,
    details: { pet_id: petId, event_id: eventId, type: current.type },
  }).catch(() => {});

  return { ok: true };
}

// ─── Bulk: Backfill (Fase 2 inicial) ───────────────────────────────────

/**
 * Backfill do evento `intake` para um pet que já tinha cadastro legado.
 * Idempotente: só cria se não existir evento `intake` para esse pet
 * naquele abrigo.
 */
export async function backfillIntakeEvent(petId, shelterClubId, actor, intakeData) {
  if (!db) return null;
  // Checar se já existe
  const existing = await getDocs(query(
    collection(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    where('type', '==', 'intake'),
    limit(1),
  ));
  if (!existing.empty) {
    return { skipped: true, reason: 'intake event already exists' };
  }

  return addTimelineEvent(
    petId,
    {
      type: 'intake',
      event_date: intakeData.event_date || new Date().toISOString(),
      data: {
        intake_type: intakeData.intake_type || 'rescue',
        source: intakeData.source,
      },
      recorded_by_name: actor?.displayName,
    },
    actor,
    { shelterClubId },
  );
}

// ─── Read helper (sem tenant filter, só para o próprio abrigo) ──────────

/**
 * Conta eventos de um tipo específico (para dashboards/indicadores).
 * Não filtra por tenant porque o caller é o próprio abrigo.
 */
export async function countEventsByType(petId, shelterClubId, type) {
  if (!db) return 0;
  if (!TIMELINE_EVENT_TYPES.includes(type)) {
    throw new Error('Tipo de evento inválido');
  }
  const q = query(
    collection(db, PETS_COLLECTION, petId, TIMELINE_SUBCOLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    where('type', '==', type),
  );
  const snap = await getDocs(q);
  return snap.size;
}
