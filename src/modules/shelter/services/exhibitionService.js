/**
 * @fileoverview Serviço: Vitrines / Eventos (Fase 11).
 *
 * Coleções multi-tenant:
 *   clubs/{clubId}/exhibitions/{exhibitionId}                       (vitrine)
 *   clubs/{clubId}/exhibitions/{exhibitionId}/shifts/{shiftId}      (escala)
 *   clubs/{clubId}/exhibitions/{exhibitionId}/post_event_log/{logId} (destino)
 *
 * Regras de multi-tenant defense-in-depth:
 *  - shelter_club_id == clubId da path (validado em todo read/write)
 *  - organizer_uid imutável (write-once — validado em update e rules)
 *  - status transições validadas em todos os services de mudança de estado
 *
 * Audit: toda mutação gera entrada imutável em `audit_logs` (best-effort).
 * Timeline: eventos relevantes são materializados em `pet_timeline`
 *           via `addTimelineEvent` (best-effort, non-blocking).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 11
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { addTimelineEvent } from '@/modules/shelter/services/timelineService';
import {
  createExhibitionSchema,
  updateExhibitionSchema,
  createShiftSchema,
  updateShiftSchema,
  createPostEventLogSchema,
  addInternalPetSchema,
  removeInternalPetSchema,
  addExternalPetSchema,
  removeExternalPetSchema,
  cancelExhibitionSchema,
  assertValidExhibitionTransition,
  isExhibitionTerminal,
  EXHIBITION_STATUS,
  POST_EVENT_DESTINATIONS,
} from '@/modules/shelter/domain/operational/exhibition';

const CLUBS_COLLECTION = 'clubs';
const EXHIBITIONS_SUBCOLLECTION = 'exhibitions';
const SHIFTS_SUBCOLLECTION = 'shifts';
const POST_EVENT_LOG_SUBCOLLECTION = 'post_event_log';

// ─── Helpers internos ──────────────────────────────────────────────────

async function _verifyExhibitionTenant(exhibitionId, shelterClubId) {
  if (!exhibitionId || !shelterClubId) {
    throw new Error('exhibitionId e shelterClubId são obrigatórios');
  }
  const ref = doc(
    db, CLUBS_COLLECTION, shelterClubId,
    EXHIBITIONS_SUBCOLLECTION, exhibitionId,
  );
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Vitrine não encontrada.');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data, _ref: ref };
}

function _exhibitionRef(shelterClubId, exhibitionId) {
  return doc(
    db, CLUBS_COLLECTION, shelterClubId,
    EXHIBITIONS_SUBCOLLECTION, exhibitionId,
  );
}

function _exhibitionsCollection(shelterClubId) {
  return collection(
    db, CLUBS_COLLECTION, shelterClubId,
    EXHIBITIONS_SUBCOLLECTION,
  );
}

function _shiftsCollection(shelterClubId, exhibitionId) {
  return collection(
    db, CLUBS_COLLECTION, shelterClubId,
    EXHIBITIONS_SUBCOLLECTION, exhibitionId,
    SHIFTS_SUBCOLLECTION,
  );
}

function _shiftRef(shelterClubId, exhibitionId, shiftId) {
  return doc(
    db, CLUBS_COLLECTION, shelterClubId,
    EXHIBITIONS_SUBCOLLECTION, exhibitionId,
    SHIFTS_SUBCOLLECTION, shiftId,
  );
}

function _postEventLogCollection(shelterClubId, exhibitionId) {
  return collection(
    db, CLUBS_COLLECTION, shelterClubId,
    EXHIBITIONS_SUBCOLLECTION, exhibitionId,
    POST_EVENT_LOG_SUBCOLLECTION,
  );
}

function _postEventLogRef(shelterClubId, exhibitionId, logId) {
  return doc(
    db, CLUBS_COLLECTION, shelterClubId,
    EXHIBITIONS_SUBCOLLECTION, exhibitionId,
    POST_EVENT_LOG_SUBCOLLECTION, logId,
  );
}

// ─── Read: exhibitions ─────────────────────────────────────────────────

/**
 * Lista vitrines do abrigo, com filtros opcionais.
 */
export async function listExhibitions(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  const { status, organizerUid, fromDate, toDate, maxResults = 100 } = options;

  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  if (organizerUid) constraints.push(where('organizer_uid', '==', organizerUid));
  if (fromDate) constraints.push(where('datetime_start', '>=', fromDate));
  if (toDate) constraints.push(where('datetime_start', '<=', toDate));
  constraints.push(orderBy('datetime_start', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(_exhibitionsCollection(shelterClubId), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getExhibition(shelterClubId, exhibitionId) {
  if (!db || !shelterClubId || !exhibitionId) return null;
  try {
    return await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  } catch (err) {
    logger.warn('exhibitionService.getExhibition', {
      msg: 'access blocked or not found',
      err: String(err?.message || err),
    });
    return null;
  }
}

// ─── Create: exhibition ────────────────────────────────────────────────

/**
 * Cria uma nova vitrine em status 'scheduled'.
 */
export async function createExhibition(shelterClubId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createExhibitionSchema.parse({
    ...input,
    shelter_club_id: shelterClubId,
  });

  const ref = await addDoc(_exhibitionsCollection(shelterClubId), {
    shelter_club_id: shelterClubId,
    title: parsed.title,
    organizer_uid: parsed.organizer_uid,
    organizer_name: parsed.organizer_name || null,
    co_organizers_uids: parsed.co_organizers_uids,
    venue: parsed.venue,
    datetime_start: parsed.datetime_start,
    datetime_end: parsed.datetime_end,
    status: 'scheduled',
    pet_ids: [],
    external_pets: [],
    requires_volunteers: parsed.requires_volunteers,
    notes: parsed.notes || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
    created_by_uid: actor.uid,
    updated_by_uid: actor.uid,
  });

  await createAuditLog({
    action: 'exhibition_created',
    actor,
    details: {
      exhibition_id: ref.id,
      shelter_club_id: shelterClubId,
      title: parsed.title,
      datetime_start: parsed.datetime_start,
      datetime_end: parsed.datetime_end,
    },
  }).catch((err) => {
    logger.warn('exhibitionService.createExhibition', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, status: 'scheduled' };
}

// ─── Update: exhibition ────────────────────────────────────────────────

/**
 * Atualiza uma vitrine. Campos imutáveis (organizer_uid, organizer_name,
 * shelter_club_id, created_at, created_by_uid) NÃO são aceitos aqui.
 */
export async function updateExhibition(shelterClubId, exhibitionId, patch, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateExhibitionSchema.parse(patch);

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  if (isExhibitionTerminal(current.status)) {
    throw new Error(
      `Vitrine está "${current.status}" (terminal) — não pode ser editada.`,
    );
  }

  // Se mudar datetimes, valida ordem
  const newStart = parsed.datetime_start || current.datetime_start;
  const newEnd = parsed.datetime_end || current.datetime_end;
  if (new Date(newEnd) <= new Date(newStart)) {
    throw new Error('datetime_end deve ser maior que datetime_start');
  }

  const update = {
    ...parsed,
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  };

  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), update);

  await createAuditLog({
    action: 'exhibition_updated',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      fields_updated: Object.keys(parsed),
    },
  }).catch((err) => {
    logger.warn('exhibitionService.updateExhibition', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: exhibitionId, ...current, ...parsed };
}

// ─── Status transitions ────────────────────────────────────────────────

/**
 * Inicia uma vitrine (scheduled → active).
 */
export async function startExhibition(shelterClubId, exhibitionId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  assertValidExhibitionTransition(current.status, 'active');

  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    status: 'active',
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  });

  await createAuditLog({
    action: 'exhibition_started',
    actor,
    details: { exhibition_id: exhibitionId, shelter_club_id: shelterClubId },
  }).catch(() => {});

  return { id: exhibitionId, status: 'active' };
}

/**
 * Conclui uma vitrine (active → completed).
 */
export async function completeExhibition(shelterClubId, exhibitionId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  assertValidExhibitionTransition(current.status, 'completed');

  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    status: 'completed',
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  });

  await createAuditLog({
    action: 'exhibition_completed',
    actor,
    details: { exhibition_id: exhibitionId, shelter_club_id: shelterClubId },
  }).catch(() => {});

  return { id: exhibitionId, status: 'completed' };
}

/**
 * Cancela uma vitrine (scheduled | active → cancelled).
 * Requer motivo.
 */
export async function cancelExhibition(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = cancelExhibitionSchema.parse(input);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  assertValidExhibitionTransition(current.status, 'cancelled');

  const now = new Date().toISOString();
  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    status: 'cancelled',
    cancelled_at: now,
    cancelled_by_uid: actor.uid,
    cancellation_reason: parsed.reason,
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  });

  await createAuditLog({
    action: 'exhibition_cancelled',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      reason: parsed.reason,
    },
  }).catch(() => {});

  return { id: exhibitionId, status: 'cancelled' };
}

// ─── Pet management (internos) ──────────────────────────────────────────

/**
 * Adiciona um pet interno à vitrine. Idempotente.
 */
export async function addInternalPet(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = addInternalPetSchema.parse(input);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  if (isExhibitionTerminal(current.status)) {
    throw new Error(`Vitrine "${current.status}" (terminal) — não pode ser editada.`);
  }

  if ((current.pet_ids || []).includes(parsed.pet_id)) {
    return { id: exhibitionId, pet_ids: current.pet_ids, idempotent: true };
  }

  const newPetIds = [...(current.pet_ids || []), parsed.pet_id];
  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    pet_ids: newPetIds,
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  });

  // Cria evento na timeline do pet
  try {
    await addTimelineEvent(
      parsed.pet_id,
      {
        type: 'note',
        event_date: new Date().toISOString(),
        data: {
          text: `Animal incluído na vitrine "${current.title}" (${exhibitionId})`,
          visibility: 'internal',
        },
      },
      { uid: actor.uid, displayName: actor.displayName },
      { shelterClubId },
    );
  } catch (err) {
    logger.warn('exhibitionService.addInternalPet', {
      msg: 'timeline event failed (non-blocking)',
      err: String(err),
    });
  }

  await createAuditLog({
    action: 'exhibition_pet_added',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      pet_id: parsed.pet_id,
      pet_origin: 'internal',
    },
  }).catch(() => {});

  return { id: exhibitionId, pet_ids: newPetIds };
}

export async function removeInternalPet(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = removeInternalPetSchema.parse(input);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  if (isExhibitionTerminal(current.status)) {
    throw new Error(`Vitrine "${current.status}" (terminal) — não pode ser editada.`);
  }

  const newPetIds = (current.pet_ids || []).filter((p) => p !== parsed.pet_id);
  if (newPetIds.length === (current.pet_ids || []).length) {
    return { id: exhibitionId, pet_ids: current.pet_ids, idempotent: true };
  }

  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    pet_ids: newPetIds,
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  });

  await createAuditLog({
    action: 'exhibition_pet_removed',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      pet_id: parsed.pet_id,
      pet_origin: 'internal',
    },
  }).catch(() => {});

  return { id: exhibitionId, pet_ids: newPetIds };
}

// ─── Pet management (externos) ──────────────────────────────────────────

export async function addExternalPet(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = addExternalPetSchema.parse(input);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  if (isExhibitionTerminal(current.status)) {
    throw new Error(`Vitrine "${current.status}" (terminal) — não pode ser editada.`);
  }

  // Idempotência: mesmo pet_id + owner_shelter_id
  const exists = (current.external_pets || []).some(
    (p) => p.pet_id === parsed.pet_id && p.owner_shelter_id === parsed.owner_shelter_id,
  );
  if (exists) {
    return { id: exhibitionId, external_pets: current.external_pets, idempotent: true };
  }

  const newExternal = [...(current.external_pets || []), parsed];
  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    external_pets: newExternal,
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  });

  await createAuditLog({
    action: 'exhibition_pet_added',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      pet_id: parsed.pet_id,
      pet_origin: 'external',
      owner_shelter_id: parsed.owner_shelter_id,
    },
  }).catch(() => {});

  return { id: exhibitionId, external_pets: newExternal };
}

export async function removeExternalPet(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = removeExternalPetSchema.parse(input);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  if (isExhibitionTerminal(current.status)) {
    throw new Error(`Vitrine "${current.status}" (terminal) — não pode ser editada.`);
  }

  const newExternal = (current.external_pets || []).filter(
    (p) => p.pet_id !== parsed.pet_id,
  );
  if (newExternal.length === (current.external_pets || []).length) {
    return { id: exhibitionId, external_pets: current.external_pets, idempotent: true };
  }

  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    external_pets: newExternal,
    updated_at: serverTimestamp(),
    updated_by_uid: actor.uid,
  });

  await createAuditLog({
    action: 'exhibition_pet_removed',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      pet_id: parsed.pet_id,
      pet_origin: 'external',
    },
  }).catch(() => {});

  return { id: exhibitionId, external_pets: newExternal };
}

// ─── Shifts (escalas) ──────────────────────────────────────────────────

export async function listShifts(shelterClubId, exhibitionId) {
  if (!db) return [];
  if (!shelterClubId || !exhibitionId) {
    throw new Error('shelterClubId e exhibitionId obrigatórios');
  }
  // Verifica tenant da vitrine antes de listar
  await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  const q = query(
    _shiftsCollection(shelterClubId, exhibitionId),
    orderBy('start_at', 'asc'),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createShift(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createShiftSchema.parse({
    ...input,
    shelter_club_id: shelterClubId,
    exhibition_id: exhibitionId,
  });
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  if (isExhibitionTerminal(current.status)) {
    throw new Error(`Vitrine "${current.status}" (terminal) — não pode adicionar escalas.`);
  }

  const ref = await addDoc(
    _shiftsCollection(shelterClubId, exhibitionId),
    {
      shelter_club_id: shelterClubId,
      exhibition_id: exhibitionId,
      start_at: parsed.start_at,
      end_at: parsed.end_at,
      role: parsed.role,
      slots_total: parsed.slots_total,
      slots_filled: 0,
      notes: parsed.notes || null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by_uid: actor.uid,
    },
  );

  await createAuditLog({
    action: 'exhibition_shift_created',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      shift_id: ref.id,
      role: parsed.role,
      slots_total: parsed.slots_total,
    },
  }).catch(() => {});

  return { id: ref.id, ...parsed, slots_filled: 0 };
}

export async function updateShift(shelterClubId, exhibitionId, shiftId, patch, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateShiftSchema.parse(patch);

  // Verifica tenant
  await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const shiftRef = _shiftRef(shelterClubId, exhibitionId, shiftId);
  const snap = await getDoc(shiftRef);
  if (!snap.exists()) throw new Error('Escala não encontrada.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  // slots_filled não pode passar slots_total
  const newFilled = parsed.slots_filled !== undefined ? parsed.slots_filled : current.slots_filled;
  const newTotal = parsed.slots_total !== undefined ? parsed.slots_total : current.slots_total;
  if (newFilled > newTotal) {
    throw new Error('slots_filled não pode exceder slots_total.');
  }

  // Valida datas se ambas presentes
  const newStart = parsed.start_at || current.start_at;
  const newEnd = parsed.end_at || current.end_at;
  if (new Date(newEnd) <= new Date(newStart)) {
    throw new Error('end_at deve ser maior que start_at');
  }

  await updateDoc(shiftRef, {
    ...parsed,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'exhibition_shift_updated',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      shift_id: shiftId,
      fields_updated: Object.keys(parsed),
    },
  }).catch(() => {});

  return { id: shiftId, ...current, ...parsed };
}

export async function deleteShift(shelterClubId, exhibitionId, shiftId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const shiftRef = _shiftRef(shelterClubId, exhibitionId, shiftId);
  const snap = await getDoc(shiftRef);
  if (!snap.exists()) throw new Error('Escala não encontrada.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  await updateDoc(shiftRef, {
    deleted_at: new Date().toISOString(),
    slots_total: 0,
  });

  await createAuditLog({
    action: 'exhibition_shift_deleted',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      shift_id: shiftId,
    },
  }).catch(() => {});

  return { id: shiftId, deleted: true };
}

// ─── Post-event log ────────────────────────────────────────────────────

/**
 * Lista logs pós-evento de uma vitrine.
 */
export async function listPostEventLogs(shelterClubId, exhibitionId) {
  if (!db) return [];
  if (!shelterClubId || !exhibitionId) {
    throw new Error('shelterClubId e exhibitionId obrigatórios');
  }
  await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  const q = query(
    _postEventLogCollection(shelterClubId, exhibitionId),
    orderBy('logged_at', 'desc'),
    limit(500),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Registra o destino de um animal após o evento.
 * Idempotente: (pet_id + destination) é a chave lógica — se já existir,
 * retorna o existente.
 */
export async function logPostEvent(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createPostEventLogSchema.parse({
    ...input,
    shelter_club_id: shelterClubId,
    exhibition_id: exhibitionId,
  });
  const exhibition = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  // Valida pet_origin vs pet_ids/external_pets
  if (parsed.pet_origin === 'internal') {
    if (!(exhibition.pet_ids || []).includes(parsed.pet_id)) {
      throw new Error('Pet interno não está na lista da vitrine.');
    }
  } else {
    const found = (exhibition.external_pets || []).some(
      (p) => p.pet_id === parsed.pet_id,
    );
    if (!found) {
      throw new Error('Pet externo não está na lista da vitrine.');
    }
  }

  // Idempotência
  const q = query(
    _postEventLogCollection(shelterClubId, exhibitionId),
    where('pet_id', '==', parsed.pet_id),
    limit(1),
  );
  const existing = await getDocs(q);
  if (!existing.empty) {
    const docSnap = existing.docs[0];
    return { id: docSnap.id, idempotent: true, ...docSnap.data() };
  }

  const now = new Date().toISOString();
  const ref = await addDoc(
    _postEventLogCollection(shelterClubId, exhibitionId),
    {
      shelter_club_id: shelterClubId,
      exhibition_id: exhibitionId,
      pet_id: parsed.pet_id,
      pet_origin: parsed.pet_origin,
      destination: parsed.destination,
      notes: parsed.notes || null,
      logged_at: now,
      logged_by_uid: actor.uid,
      logged_by_name: actor.displayName || null,
      adopter_uid: parsed.adopter_uid || null,
      transferred_to_shelter_id: parsed.transferred_to_shelter_id || null,
      transferred_to_shelter_name: parsed.transferred_to_shelter_name || null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
  );

  // Cria evento na timeline do pet (apenas para internal)
  if (parsed.pet_origin === 'internal') {
    try {
      await addTimelineEvent(
        parsed.pet_id,
        {
          type: 'note',
          event_date: now,
          data: {
            text: `Destino pós-vitrine "${exhibition.title}": ${parsed.destination}`,
            visibility: 'internal',
          },
        },
        { uid: actor.uid, displayName: actor.displayName },
        { shelterClubId },
      );
    } catch (err) {
      logger.warn('exhibitionService.logPostEvent', {
        msg: 'timeline event failed (non-blocking)',
        err: String(err),
      });
    }
  }

  await createAuditLog({
    action: 'exhibition_post_event_logged',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shelter_club_id: shelterClubId,
      log_id: ref.id,
      pet_id: parsed.pet_id,
      pet_origin: parsed.pet_origin,
      destination: parsed.destination,
    },
  }).catch(() => {});

  return { id: ref.id, ...parsed, logged_at: now };
}

// Re-export enums for convenience
export { EXHIBITION_STATUS, POST_EVENT_DESTINATIONS };
