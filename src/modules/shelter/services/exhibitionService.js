/**
 * @fileoverview Serviço: Vitrines / Eventos (Fase 11).
 *
 * Subcoleção `clubs/{clubId}/exhibitions/{exhibitionId}`. Multi-tenant:
 * cada evento pertence ao abrigo organizador (`organizer_shelter_id`,
 * redundante com a path). Coalizão entre múltiplos abrigos é
 * suportada via `co_organizers` (outros clubIds) e `external_pets`
 * (pets pertencentes a outros abrigos).
 *
 * State machine: `planned → active → done`, com `cancelled` como
 * estado terminal alternativo.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 10 (numeração do doc)
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.3
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, limit,
  arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  exhibitionSchema,
  createExhibitionSchema,
  updateExhibitionSchema,
  addOutcomeSchema,
  cancelExhibitionSchema,
  assertValidExhibitionTransition,
  isTerminalExhibitionStatus,
  exhibitionIsUpcoming,
  exhibitionIsPast,
} from '@/modules/shelter/domain/operational/exhibition';

const CLUBS_COLLECTION = 'clubs';
const EXHIBITIONS_SUBCOLLECTION = 'exhibitions';

// ─── Helpers internos ──────────────────────────────────────────────

/**
 * Valida que `organizer_shelter_id` do input é igual ao clubId da path.
 * Defense-in-depth: redundante com a path do Firestore.
 */
function _validateMultiTenant(input, clubId) {
  if (input.organizer_shelter_id && input.organizer_shelter_id !== clubId) {
    throw new Error(
      `organizer_shelter_id (${input.organizer_shelter_id}) deve coincidir com clubId (${clubId}).`,
    );
  }
}

async function _verifyExhibitionTenant(exhibitionId, shelterClubId) {
  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Vitrine não encontrada.');
  }
  const data = snap.data();
  if (data.organizer_shelter_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ref, ...data };
}

// ─── Read ───────────────────────────────────────────────────────────

/**
 * Lista vitrines do abrigo.
 *
 * Filtros:
 *   - `status`: planned | active | done | cancelled
 *   - `upcoming` (boolean): filtra para data >= now
 *   - `past` (boolean): filtra para data < now
 *   - `coOrganizer` (string): inclui vitrines onde o abrigo é co-organizador
 *   - `maxResults` (number): default 100
 */
export async function listExhibitions(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  const { status, upcoming, past, maxResults = 100 } = options;

  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('date', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (upcoming) docs = docs.filter((d) => exhibitionIsUpcoming(d.date, d.time_start));
  if (past) docs = docs.filter((d) => exhibitionIsPast(d.date, d.time_end));

  return docs;
}

/**
 * Retorna uma vitrine por id (com validação de tenant).
 * Retorna `null` se não encontrada OU se o tenant não bate.
 */
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

// ─── Create ────────────────────────────────────────────────────────

/**
 * Cria uma nova vitrine. Status inicial = 'planned'.
 */
export async function createExhibition(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createExhibitionSchema.parse(input);

  // Multi-tenant defense-in-depth
  _validateMultiTenant(parsed, parsed.organizer_shelter_id);

  const ref = await addDoc(
    collection(db, CLUBS_COLLECTION, parsed.organizer_shelter_id, EXHIBITIONS_SUBCOLLECTION),
    {
      title: parsed.title,
      organizer_shelter_id: parsed.organizer_shelter_id,
      co_organizers: parsed.co_organizers || [],
      location: parsed.location,
      date: parsed.date,
      time_start: parsed.time_start,
      time_end: parsed.time_end,
      status: 'planned',
      responsible_uids: parsed.responsible_uids,
      animals: parsed.animals || [],
      external_pets: parsed.external_pets || [],
      post_event_log: [],
      notes: parsed.notes || null,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      created_by: actor.uid,
    },
  );

  await createAuditLog({
    action: 'shelter_exhibition_created',
    actor,
    details: {
      exhibition_id: ref.id,
      organizer_shelter_id: parsed.organizer_shelter_id,
      title: parsed.title,
      co_organizers: parsed.co_organizers || [],
    },
  }).catch((err) => {
    logger.warn('exhibitionService.createExhibition', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, status: 'planned' };
}

// ─── Update ────────────────────────────────────────────────────────

/**
 * Atualiza campos editáveis de uma vitrine. NÃO permite trocar
 * `organizer_shelter_id` (imutável) nem `status` (transições via
 * activate/complete/cancel).
 */
export async function updateExhibition(shelterClubId, exhibitionId, patch, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateExhibitionSchema.parse(patch);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);

  // Defense-in-depth: bloqueia update em status terminal via update genérico.
  if (isTerminalExhibitionStatus(current.status)) {
    throw new Error(
      `Vitrine em status terminal (${current.status}). Use cancel/activate/complete no service.`,
    );
  }

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  await updateDoc(ref, {
    ...parsed,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'shelter_exhibition_updated',
    actor,
    details: {
      exhibition_id: exhibitionId,
      organizer_shelter_id: shelterClubId,
      changed: Object.keys(parsed),
    },
  }).catch(() => {});

  return { changed_fields: Object.keys(parsed) };
}

// ─── State transitions ────────────────────────────────────────────

/**
 planned → active (no dia do evento).
 */
export async function activateExhibition(shelterClubId, exhibitionId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  assertValidExhibitionTransition(current.status, 'active');

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  await updateDoc(ref, {
    status: 'active',
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'shelter_exhibition_activated',
    actor,
    details: { exhibition_id: exhibitionId, organizer_shelter_id: shelterClubId },
  }).catch(() => {});

  return { id: exhibitionId, status: 'active' };
}

/**
 * active → done, registrando o log de outcomes (pode ser vazio se
 * o abrigo for registrar depois individualmente).
 */
export async function completeExhibition(shelterClubId, exhibitionId, postEventLog, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  assertValidExhibitionTransition(current.status, 'done');

  // Valida outcomes se fornecidos
  const validatedLog = Array.isArray(postEventLog) ? postEventLog : [];
  for (const entry of validatedLog) {
    addOutcomeSchema.parse(entry);
  }

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  await updateDoc(ref, {
    status: 'done',
    post_event_log: validatedLog,
    completed_at: new Date().toISOString(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'shelter_exhibition_completed',
    actor,
    details: {
      exhibition_id: exhibitionId,
      organizer_shelter_id: shelterClubId,
      outcomes_count: validatedLog.length,
    },
  }).catch(() => {});

  return { id: exhibitionId, status: 'done', post_event_log: validatedLog };
}

/**
 * planned | active → cancelled (terminal).
 */
export async function cancelExhibition(shelterClubId, exhibitionId, reason, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !exhibitionId || !actor?.uid) {
    throw new Error('Parâmetros inválidos');
  }

  const parsed = cancelExhibitionSchema.parse({ reason });

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  assertValidExhibitionTransition(current.status, 'cancelled');

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  const now = new Date().toISOString();
  await updateDoc(ref, {
    status: 'cancelled',
    cancelled_at: now,
    cancelled_by: actor.uid,
    cancellation_reason: parsed.reason || null,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'shelter_exhibition_cancelled',
    actor,
    details: {
      exhibition_id: exhibitionId,
      organizer_shelter_id: shelterClubId,
      reason: parsed.reason,
    },
  }).catch(() => {});

  return { id: exhibitionId, status: 'cancelled' };
}

// ─── Animals (pets do abrigo) ──────────────────────────────────────

/**
 * Adiciona um pet do abrigo à lista de animais levados. Idempotente.
 */
export async function addExhibitionAnimal(shelterClubId, exhibitionId, petId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!petId) throw new Error('petId é obrigatório');

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  if (isTerminalExhibitionStatus(current.status)) {
    throw new Error(`Vitrine em status terminal (${current.status}). Não é possível editar animais.`);
  }

  // Idempotente: não duplica
  if ((current.animals || []).includes(petId)) {
    return { ok: true, noop: true, animals: current.animals };
  }

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  await updateDoc(ref, {
    animals: arrayUnion(petId),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'shelter_exhibition_animal_added',
    actor,
    details: { exhibition_id: exhibitionId, pet_id: petId },
  }).catch(() => {});

  return { ok: true, animals: [...(current.animals || []), petId] };
}

/**
 * Remove um pet do abrigo da lista de animais levados. Idempotente.
 */
export async function removeExhibitionAnimal(shelterClubId, exhibitionId, petId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!petId) throw new Error('petId é obrigatório');

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  if (isTerminalExhibitionStatus(current.status)) {
    throw new Error(`Vitrine em status terminal (${current.status}). Não é possível editar animais.`);
  }

  if (!(current.animals || []).includes(petId)) {
    return { ok: true, noop: true, animals: current.animals || [] };
  }

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  await updateDoc(ref, {
    animals: arrayRemove(petId),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'shelter_exhibition_animal_removed',
    actor,
    details: { exhibition_id: exhibitionId, pet_id: petId },
  }).catch(() => {});

  return { ok: true, animals: (current.animals || []).filter((p) => p !== petId) };
}

// ─── Post-event outcomes ───────────────────────────────────────────

/**
 * Adiciona uma entrada em `post_event_log`. Usado após o evento
 * (status idealmente = 'done') para registrar o destino de cada
 * animal. Também funciona em 'active' para registro parcial.
 */
export async function addExhibitionOutcome(shelterClubId, exhibitionId, outcome, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = addOutcomeSchema.parse(outcome);

  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  if (current.status === 'cancelled') {
    throw new Error('Vitrine cancelada. Não é possível registrar outcomes.');
  }

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  const now = new Date().toISOString();
  const entry = {
    pet_id: parsed.pet_id,
    outcome: parsed.outcome,
    adopter_uid: parsed.adopter_uid || null,
    notes: parsed.notes || null,
    recorded_at: now,
    recorded_by: actor.uid,
  };

  await updateDoc(ref, {
    post_event_log: arrayUnion(entry),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'shelter_exhibition_outcome_recorded',
    actor,
    details: {
      exhibition_id: exhibitionId,
      pet_id: parsed.pet_id,
      outcome: parsed.outcome,
    },
  }).catch(() => {});

  return { ok: true, entry };
}

// ─── Aggregates ────────────────────────────────────────────────────

/**
 * Conta vitrines do abrigo por status (ou total se sem filtro).
 */
export async function countExhibitions(shelterClubId, status = null) {
  if (!db) return 0;
  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(limit(500));
  const q = query(
    collection(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.size;
}
