/**
 * @fileoverview Serviço: RSVP / Escalas de Vitrines (Fase 12).
 *
 * Subcoleções em `clubs/{clubId}/exhibitions/{exhibitionId}/`:
 *  - `invites/{inviteId}` — convocação individual de voluntário
 *  - `shifts/{shiftId}`   — turno/função do evento (escala)
 *
 * Multi-tenant: cada doc carrega `shelter_club_id` E `exhibition_id`
 * (redundantes com a path — defense-in-depth no service e nas rules).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (RSVP / Escalas)
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, arrayUnion, arrayRemove,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { createNotification } from '@/core/services/notificationService';
import {
  createRsvpInviteSchema,
  respondRsvpInviteSchema,
  createExhibitionShiftSchema,
  updateExhibitionShiftSchema,
  assertValidRsvpTransition,
} from '@/modules/shelter/domain/operational/exhibitionRsvp';

const CLUBS_COLLECTION = 'clubs';
const EXHIBITIONS_SUBCOLLECTION = 'exhibitions';
const INVITES_SUBCOLLECTION = 'invites';
const SHIFTS_SUBCOLLECTION = 'shifts';

// ─── Helpers internos ──────────────────────────────────────────────────

/**
 * Verifica que a exhibition existe e pertence ao `shelterClubId` da path.
 * Lança Error se cross-tenant ou não existe.
 */
async function _verifyExhibitionMultiTenant(exhibitionId, shelterClubId) {
  if (!db) throw new Error('Firebase não disponível');
  if (!exhibitionId || !shelterClubId) {
    throw new Error('exhibitionId e shelterClubId são obrigatórios');
  }
  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Exhibition (vitrine) não encontrada.');
  const data = snap.data();
  // Multi-tenant: a exhibition pode carregar organizer_shelter_id (Fase 11) ou
  // shelter_club_id (genérico). Aceita qualquer um.
  const exhibitionTenant = data.organizer_shelter_id || data.shelter_club_id;
  if (exhibitionTenant && exhibitionTenant !== shelterClubId) {
    throw new Error('Cross-tenant access blocked (exhibition).');
  }
  return { id: snap.id, ...data };
}

function _invitesRef(shelterClubId, exhibitionId) {
  return collection(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId, INVITES_SUBCOLLECTION);
}

function _shiftsRef(shelterClubId, exhibitionId) {
  return collection(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId, SHIFTS_SUBCOLLECTION);
}

function _inviteRef(shelterClubId, exhibitionId, inviteId) {
  return doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId, INVITES_SUBCOLLECTION, inviteId);
}

function _shiftRef(shelterClubId, exhibitionId, shiftId) {
  return doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId, SHIFTS_SUBCOLLECTION, shiftId);
}

// ─── INVITES — Read ───────────────────────────────────────────────────

/**
 * Lista convites do abrigo para uma exhibition. Filtros opcionais:
 *   - status (pending, yes, no, maybe)
 *   - volunteerUid
 */
export async function listInvites(shelterClubId, exhibitionId, options = {}) {
  if (!db) return [];
  if (!shelterClubId || !exhibitionId) {
    throw new Error('shelterClubId e exhibitionId são obrigatórios');
  }
  const { status, volunteerUid, maxResults = 200 } = options;

  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  if (volunteerUid) constraints.push(where('volunteer_uid', '==', volunteerUid));
  constraints.push(orderBy('created_at', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(_invitesRef(shelterClubId, exhibitionId), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Lista convites DO voluntário (cross-tenant — varredura via
 * collectionGroup). NOTE: client-side valida permissão por
 * Firestore rules (cada invite só é legível pelo próprio voluntário).
 */
export async function getUserInvites(volunteerUid, options = {}) {
  if (!db) return [];
  if (!volunteerUid) throw new Error('volunteerUid é obrigatório');
  const { status, maxResults = 100 } = options;

  // collectionGroup precisa ser importado de firestore
  // (lazy require para evitar problema se o usuário só usa a parte de abrigo)
  const { collectionGroup } = await import('firebase/firestore');
  const constraints = [where('volunteer_uid', '==', volunteerUid)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('created_at', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(collectionGroup(db, INVITES_SUBCOLLECTION), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getInvite(shelterClubId, exhibitionId, inviteId) {
  if (!db || !shelterClubId || !exhibitionId || !inviteId) return null;
  const snap = await getDoc(_inviteRef(shelterClubId, exhibitionId, inviteId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── INVITES — Create (convocação) ───────────────────────────────────

/**
 * Cria um convite (convocação) para um voluntário. Status inicial:
 * `pending`. Notifica o voluntário por push.
 */
export async function createInvite(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  // Verifica tenant da exhibition pai
  await _verifyExhibitionMultiTenant(exhibitionId, shelterClubId);

  const parsed = createRsvpInviteSchema.parse({
    ...input,
    exhibition_id: exhibitionId,
    shelter_club_id: shelterClubId,
  });

  const ref = await addDoc(_invitesRef(shelterClubId, exhibitionId), {
    exhibition_id: exhibitionId,
    shelter_club_id: shelterClubId,
    volunteer_uid: parsed.volunteer_uid,
    volunteer_name: parsed.volunteer_name,
    status: 'pending',
    notes: parsed.notes || null,
    availability: parsed.availability || null,
    response_notes: null,
    responded_at: null,
    created_by: actor.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // Notifica o voluntário (best-effort, não bloqueia)
  createNotification({
    userId: parsed.volunteer_uid,
    title: 'Convocação para vitrine',
    message: `Você foi convocado para a vitrine. Responda o convite.`,
    type: 'generic',
    link: `/shelter/exhibitions/${exhibitionId}`,
    actor: { uid: actor.uid, displayName: actor.displayName },
  }).catch((err) => {
    logger.warn('exhibitionRsvpService.createInvite', {
      msg: 'notification failed (non-blocking)',
      err: String(err),
    });
  });

  // Audit log
  createAuditLog({
    action: 'exhibition_rsvp_invited',
    actor,
    details: {
      exhibition_id: exhibitionId,
      invite_id: ref.id,
      volunteer_uid: parsed.volunteer_uid,
      shelter_club_id: shelterClubId,
    },
  }).catch((err) => {
    logger.warn('exhibitionRsvpService.createInvite', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, status: 'pending' };
}

// ─── INVITES — Respond (voluntário) ──────────────────────────────────

/**
 * Voluntário responde o convite. Valida transição (não permite
 * voltar a `pending`). Pode ser chamado pelo próprio voluntário
 * (de quem é o invite) ou pelo abrigo.
 */
export async function respondToInvite(shelterClubId, exhibitionId, inviteId, response, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = respondRsvpInviteSchema.parse(response);

  // Carrega invite atual
  const snap = await getDoc(_inviteRef(shelterClubId, exhibitionId, inviteId));
  if (!snap.exists()) throw new Error('Convite não encontrado.');
  const current = snap.data();

  // Verifica tenant
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked (invite).');
  }

  // Se o ator é o voluntário, ok. Senão, precisa ser abrigo.
  // (A regra de permissão fina fica na firestore.rule; aqui só validamos
  // que o voluntário OU o abrigo está respondendo.)
  const isVolunteer = current.volunteer_uid === actor.uid;
  const isShelter = actor.role === 'shelter' || actor.isShelter === true;
  if (!isVolunteer && !isShelter) {
    // Best-effort: aceita mas loga. A permissão final fica nas rules.
    logger.warn('exhibitionRsvpService.respondToInvite', {
      msg: 'actor is neither volunteer nor shelter — letting through',
      actor_uid: actor.uid,
      volunteer_uid: current.volunteer_uid,
    });
  }

  // Valida transição de status
  if (current.status === parsed.status) {
    // noop — mesmo status, nada a fazer (mas permite atualizar notes)
    if (parsed.response_notes !== undefined) {
      await updateDoc(_inviteRef(shelterClubId, exhibitionId, inviteId), {
        response_notes: parsed.response_notes || null,
        updated_at: serverTimestamp(),
      });
    }
    return { id: inviteId, status: parsed.status, noop: true };
  }
  assertValidRsvpTransition(current.status, parsed.status);

  const now = new Date().toISOString();
  const patch = {
    status: parsed.status,
    response_notes: parsed.response_notes || null,
    responded_at: now,
    updated_at: serverTimestamp(),
  };

  await updateDoc(_inviteRef(shelterClubId, exhibitionId, inviteId), patch);

  createAuditLog({
    action: 'exhibition_rsvp_responded',
    actor,
    details: {
      exhibition_id: exhibitionId,
      invite_id: inviteId,
      volunteer_uid: current.volunteer_uid,
      from: current.status,
      to: parsed.status,
    },
  }).catch((err) => {
    logger.warn('exhibitionRsvpService.respondToInvite', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: inviteId, status: parsed.status, from: current.status };
}

// ─── INVITES — Cancel (abrigo remove convocação) ─────────────────────

/**
 * Abrigo cancela/remove um convite. Faz hard delete (convite nunca
 * foi aceito, não há histórico a preservar).
 */
export async function cancelInvite(shelterClubId, exhibitionId, inviteId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const snap = await getDoc(_inviteRef(shelterClubId, exhibitionId, inviteId));
  if (!snap.exists()) return { ok: true, noop: true };
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked (invite).');
  }

  await deleteDoc(_inviteRef(shelterClubId, exhibitionId, inviteId));

  createAuditLog({
    action: 'exhibition_rsvp_invite_cancelled',
    actor,
    details: {
      exhibition_id: exhibitionId,
      invite_id: inviteId,
      volunteer_uid: current.volunteer_uid,
    },
  }).catch(() => {});

  return { ok: true, cancelled: true };
}

// ─── SHIFTS — CRUD ────────────────────────────────────────────────────

export async function listShifts(shelterClubId, exhibitionId) {
  if (!db) return [];
  if (!shelterClubId || !exhibitionId) {
    throw new Error('shelterClubId e exhibitionId são obrigatórios');
  }
  const q = query(
    _shiftsRef(shelterClubId, exhibitionId),
    orderBy('date', 'asc'),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getShift(shelterClubId, exhibitionId, shiftId) {
  if (!db || !shelterClubId || !exhibitionId || !shiftId) return null;
  const snap = await getDoc(_shiftRef(shelterClubId, exhibitionId, shiftId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function createShift(shelterClubId, exhibitionId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyExhibitionMultiTenant(exhibitionId, shelterClubId);

  const parsed = createExhibitionShiftSchema.parse({
    ...input,
    exhibition_id: exhibitionId,
    shelter_club_id: shelterClubId,
  });

  // Valida que time_end > time_start
  if (parsed.time_end <= parsed.time_start) {
    throw new Error('time_end deve ser maior que time_start');
  }

  const ref = await addDoc(_shiftsRef(shelterClubId, exhibitionId), {
    exhibition_id: exhibitionId,
    shelter_club_id: shelterClubId,
    date: parsed.date,
    time_start: parsed.time_start,
    time_end: parsed.time_end,
    role: parsed.role,
    role_label: parsed.role_label,
    needed_count: parsed.needed_count,
    assigned_uids: [],
    notes: parsed.notes || null,
    created_by: actor.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  createAuditLog({
    action: 'exhibition_shift_created',
    actor,
    details: {
      exhibition_id: exhibitionId,
      shift_id: ref.id,
      role: parsed.role,
      date: parsed.date,
      shelter_club_id: shelterClubId,
    },
  }).catch((err) => {
    logger.warn('exhibitionRsvpService.createShift', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, ...parsed, assigned_uids: [] };
}

export async function updateShift(shelterClubId, exhibitionId, shiftId, patch, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  // Verifica que o shift existe e tenant bate
  const snap = await getDoc(_shiftRef(shelterClubId, exhibitionId, shiftId));
  if (!snap.exists()) throw new Error('Shift não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked (shift).');
  }

  const parsed = updateExhibitionShiftSchema.parse(patch);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  // Se mudou time, valida time_end > time_start
  const newStart = parsed.time_start ?? current.time_start;
  const newEnd = parsed.time_end ?? current.time_end;
  if (newEnd <= newStart) {
    throw new Error('time_end deve ser maior que time_start');
  }

  await updateDoc(_shiftRef(shelterClubId, exhibitionId, shiftId), {
    ...parsed,
    updated_at: serverTimestamp(),
  });

  createAuditLog({
    action: 'exhibition_shift_updated',
    actor,
    details: { shift_id: shiftId, changed: Object.keys(parsed) },
  }).catch(() => {});

  return { changed_fields: Object.keys(parsed) };
}

export async function deleteShift(shelterClubId, exhibitionId, shiftId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const snap = await getDoc(_shiftRef(shelterClubId, exhibitionId, shiftId));
  if (!snap.exists()) return { ok: true, noop: true };
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked (shift).');
  }

  // Apenas criador ou platform_admin pode deletar
  if (current.created_by !== actor.uid && !actor.isPlatformAdmin) {
    throw new Error('Só o criador ou platform_admin pode deletar este shift.');
  }

  await deleteDoc(_shiftRef(shelterClubId, exhibitionId, shiftId));

  createAuditLog({
    action: 'exhibition_shift_deleted',
    actor,
    details: { shift_id: shiftId },
  }).catch(() => {});

  return { ok: true, deleted: true };
}

// ─── SHIFTS — Atribuir / desatribuir voluntários ─────────────────────

/**
 * Atribui voluntário ao shift. Idempotente (arrayUnion). Notifica o
 * voluntário.
 */
export async function assignVolunteerToShift(shelterClubId, exhibitionId, shiftId, volunteerUid, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!volunteerUid) throw new Error('volunteerUid é obrigatório');

  const ref = _shiftRef(shelterClubId, exhibitionId, shiftId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Shift não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked (shift).');
  }

  await updateDoc(ref, {
    assigned_uids: arrayUnion(volunteerUid),
    updated_at: serverTimestamp(),
  });

  createNotification({
    userId: volunteerUid,
    title: 'Você foi escalado para uma vitrine',
    message: `${current.role_label} — ${current.date} ${current.time_start}-${current.time_end}`,
    type: 'generic',
    link: `/shelter/exhibitions/${exhibitionId}`,
    actor: { uid: actor.uid, displayName: actor.displayName },
  }).catch(() => {});

  createAuditLog({
    action: 'exhibition_shift_volunteer_assigned',
    actor,
    details: {
      shift_id: shiftId,
      exhibition_id: exhibitionId,
      volunteer_uid: volunteerUid,
    },
  }).catch(() => {});

  return { ok: true, shift_id: shiftId, volunteer_uid: volunteerUid };
}

export async function unassignVolunteerFromShift(shelterClubId, exhibitionId, shiftId, volunteerUid, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!volunteerUid) throw new Error('volunteerUid é obrigatório');

  const ref = _shiftRef(shelterClubId, exhibitionId, shiftId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Shift não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked (shift).');
  }

  await updateDoc(ref, {
    assigned_uids: arrayRemove(volunteerUid),
    updated_at: serverTimestamp(),
  });

  createAuditLog({
    action: 'exhibition_shift_volunteer_unassigned',
    actor,
    details: {
      shift_id: shiftId,
      exhibition_id: exhibitionId,
      volunteer_uid: volunteerUid,
    },
  }).catch(() => {});

  return { ok: true, shift_id: shiftId, volunteer_uid: volunteerUid };
}
