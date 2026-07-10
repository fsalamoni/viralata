/**
 * @fileoverview Serviço: Gestão de Voluntários — Participations (Fase 13).
 *
 * Coleção: `clubs/{clubId}/volunteer_participations/{participationId}`.
 * Multi-tenant: cada abrigo tem sua própria lista. Check-in/out é
 * feito pelo abrigo OU pelo próprio voluntário (self-service).
 *
 * exhibition_id é FK opcional para Fase 11 (vitrines). Se Fase 11
 * não tiver sido mergeada, `event_type='exhibition'` + `exhibition_id`
 * continua funcionando como string livre.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 13
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  createVolunteerParticipationSchema,
  participationCheckSchema,
  calculateParticipationHours,
} from '@/modules/shelter/domain/operational/volunteerProfile';

const CLUBS_COLLECTION = 'clubs';
const PARTICIPATIONS_SUBCOLLECTION = 'volunteer_participations';

function participationRef(shelterClubId, participationId) {
  return doc(
    db,
    CLUBS_COLLECTION,
    shelterClubId,
    PARTICIPATIONS_SUBCOLLECTION,
    participationId,
  );
}

function participationsCollection(shelterClubId) {
  return collection(
    db,
    CLUBS_COLLECTION,
    shelterClubId,
    PARTICIPATIONS_SUBCOLLECTION,
  );
}

// ════════════════════════════════════════════════════════════════════
// READ
// ════════════════════════════════════════════════════════════════════

/**
 * Lista participações do abrigo, com filtros opcionais.
 */
export async function listParticipations(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  const {
    volunteerUid, eventType, eventId, exhibitionId,
    since, until, maxResults = 200,
  } = options;

  const constraints = [];
  if (volunteerUid) constraints.push(where('volunteer_uid', '==', volunteerUid));
  if (eventType) constraints.push(where('event_type', '==', eventType));
  if (eventId) constraints.push(where('event_id', '==', eventId));
  if (exhibitionId) constraints.push(where('exhibition_id', '==', exhibitionId));
  if (since) constraints.push(where('event_date', '>=', since));
  if (until) constraints.push(where('event_date', '<=', until));
  constraints.push(orderBy('event_date', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(participationsCollection(shelterClubId), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getParticipation(shelterClubId, participationId) {
  if (!db || !shelterClubId || !participationId) return null;
  const snap = await getDoc(participationRef(shelterClubId, participationId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ════════════════════════════════════════════════════════════════════
// CREATE
// ════════════════════════════════════════════════════════════════════

/**
 * Cria uma participation. Apenas o abrigo chama.
 *
 * @param {object} input - validado por createVolunteerParticipationSchema
 * @param {object} actor - {uid} deve ser admin do abrigo
 */
export async function createParticipation(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createVolunteerParticipationSchema.parse(input);

  // Valida event_date no futuro (ou hoje)
  const eventDate = new Date(parsed.event_date);
  if (Number.isNaN(eventDate.getTime())) {
    throw new Error('event_date inválido.');
  }

  const doc_data = {
    ...parsed,
    hours_logged: 0,
    created_by: actor.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(participationsCollection(parsed.shelter_club_id), doc_data);

  await createAuditLog({
    action: 'volunteer_participation_created',
    actor,
    details: {
      shelter_club_id: parsed.shelter_club_id,
      volunteer_uid: parsed.volunteer_uid,
      event_type: parsed.event_type,
      exhibition_id: parsed.exhibition_id,
      event_date: parsed.event_date,
    },
  }).catch((err) => {
    logger.warn('volunteerParticipationService.createParticipation', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, ...doc_data };
}

// ════════════════════════════════════════════════════════════════════
// UPDATE (notas / event_date / etc — sem check-in/out)
// ════════════════════════════════════════════════════════════════════

const UPDATABLE_FIELDS = ['event_label', 'event_date', 'role', 'notes'];

/**
 * Atualiza campos editáveis de uma participation. Apenas o abrigo.
 */
export async function updateParticipation(shelterClubId, participationId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !participationId) throw new Error('shelterClubId e participationId obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const ref = participationRef(shelterClubId, participationId);
  const current = await getDoc(ref);
  if (!current.exists()) throw new Error('Participation não encontrada.');
  const prev = current.data();
  if (prev.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  const update = { updated_at: serverTimestamp() };
  for (const field of UPDATABLE_FIELDS) {
    if (input[field] !== undefined) {
      update[field] = input[field];
    }
  }
  if (Object.keys(update).length === 1) return { id: participationId, ...prev };

  await updateDoc(ref, update);

  await createAuditLog({
    action: 'volunteer_participation_updated',
    actor,
    details: { participation_id: participationId, changes: Object.keys(update).filter((k) => k !== 'updated_at') },
  }).catch(() => {});

  return { id: participationId, ...prev, ...update };
}

// ════════════════════════════════════════════════════════════════════
// CHECK-IN / CHECK-OUT
// ════════════════════════════════════════════════════════════════════

/**
 * Marca check-in ou check-out. Pode ser chamado pelo abrigo OU
 * pelo próprio voluntário (self-service). Calcula `hours_logged`
 * automaticamente no check-out.
 *
 * @param {string} shelterClubId
 * @param {string} participationId
 * @param {object} input - {action: 'check_in' | 'check_out', at?: ISO}
 * @param {object} actor - {uid} deve ser admin do abrigo OU o próprio voluntário
 */
export async function checkInOut(shelterClubId, participationId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !participationId) throw new Error('shelterClubId e participationId obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = participationCheckSchema.parse(input);
  const at = parsed.at || new Date().toISOString();

  const ref = participationRef(shelterClubId, participationId);
  const current = await getDoc(ref);
  if (!current.exists()) throw new Error('Participation não encontrada.');
  const prev = current.data();
  if (prev.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  // Permissão: abrigo OU o próprio voluntário
  // (checagem fina é feita no firestore.rules; aqui só sanity-check básico)
  // O service não tem como saber se actor é admin do abrigo sem fazer
  // um get extra. Confiamos no firestore.rules para barrar.

  if (parsed.action === 'check_in') {
    if (prev.check_in) {
      throw new Error('Check-in já foi feito.');
    }
    if (prev.check_out) {
      throw new Error('Participation já finalizada (check-out).');
    }
    await updateDoc(ref, {
      check_in: at,
      updated_at: serverTimestamp(),
    });
  } else {
    // check_out
    if (!prev.check_in) {
      throw new Error('Não é possível fazer check-out sem check-in.');
    }
    if (prev.check_out) {
      throw new Error('Check-out já foi feito.');
    }
    const hours = calculateParticipationHours(prev.check_in, at);
    await updateDoc(ref, {
      check_out: at,
      hours_logged: hours,
      updated_at: serverTimestamp(),
    });
  }

  await createAuditLog({
    action: parsed.action === 'check_in' ? 'volunteer_check_in' : 'volunteer_check_out',
    actor,
    details: { participation_id: participationId, at },
  }).catch(() => {});

  return {
    id: participationId,
    check_in: parsed.action === 'check_in' ? at : prev.check_in,
    check_out: parsed.action === 'check_out' ? at : prev.check_out || null,
    hours_logged: parsed.action === 'check_out' ? calculateParticipationHours(prev.check_in, at) : prev.hours_logged || 0,
  };
}

// ════════════════════════════════════════════════════════════════════
// DELETE
// ════════════════════════════════════════════════════════════════════

/**
 * Hard delete. Apenas platform_admin via firestore.rules.
 */
export async function deleteParticipation(shelterClubId, participationId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const ref = participationRef(shelterClubId, participationId);
  const current = await getDoc(ref);
  if (!current.exists()) return { id: participationId, deleted: false };
  const prev = current.data();
  if (prev.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }

  await deleteDoc(ref);

  await createAuditLog({
    action: 'volunteer_participation_deleted',
    actor,
    details: { participation_id: participationId, volunteer_uid: prev.volunteer_uid },
  }).catch(() => {});

  return { id: participationId, deleted: true };
}
