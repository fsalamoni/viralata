/**
 * @fileoverview Serviço: Lares Temporários (Fase 7).
 *
 * Subcoleção `clubs/{clubId}/fosters/{fosterId}`. Multi-tenant: cada
 * placement pertence a um abrigo. Snapshot do perfil do LT no momento
 * do aceite (defense-in-depth: mudanças no profile do LT não alteram
 * placements já iniciados).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 7
 */

import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp, limit,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { addTimelineEvent } from '@/modules/shelter/services/timelineService';
import {
  fosterPlacementSchema,
  createFosterPlacementSchema,
  acceptFosterPlacementSchema,
  extendFosterPlacementSchema,
  endFosterPlacementSchema,
  assertValidFosterTransition,
} from '@/modules/shelter/domain/operational/foster';

const CLUBS_COLLECTION = 'clubs';
const FOSTERS_SUBCOLLECTION = 'fosters';

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Lista placements do abrigo, com filtros opcionais.
 */
export async function listFosterPlacements(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');
  const { status, fosterUid, petId, maxResults = 100 } = options;

  const constraints = [];
  if (status) constraints.push(where('status', '==', status));
  if (fosterUid) constraints.push(where('foster_uid', '==', fosterUid));
  if (petId) constraints.push(where('pet_id', '==', petId));
  constraints.push(orderBy('start_date', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, CLUBS_COLLECTION, shelterClubId, FOSTERS_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getFosterPlacement(shelterClubId, fosterId) {
  if (!db || !shelterClubId || !fosterId) return null;
  const snap = await getDoc(
    doc(db, CLUBS_COLLECTION, shelterClubId, FOSTERS_SUBCOLLECTION, fosterId),
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Create (proposta de LT) ───────────────────────────────────────────

/**
 * Cria um placement em status 'pending' (ainda não foi aceito pelo LT).
 *
 * O abrigo chama isto quando identifica um LT e propõe receber o pet.
 * O LT (foster_uid) precisa aceitar depois via acceptFosterPlacement().
 */
export async function proposeFosterPlacement(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createFosterPlacementSchema.parse(input);

  // Valida datas
  const start = new Date(parsed.start_date);
  const end = new Date(parsed.end_date);
  if (end <= start) {
    throw new Error('end_date deve ser maior que start_date');
  }

  // Snapshot do perfil (sem terms_accepted_at — só após aceite)
  const foster_profile_snapshot = {
    full_name: parsed.full_name,
    email: parsed.email,
    phone: parsed.phone,
    cpf: parsed.cpf,
    address: parsed.address,
    environment: parsed.environment,
    has_yard: parsed.has_yard,
    has_fence: parsed.has_fence,
    other_pets: parsed.other_pets,
    experience: parsed.experience,
    years_experience: parsed.years_experience,
  };

  const ref = await addDoc(
    collection(db, CLUBS_COLLECTION, parsed.shelter_club_id, FOSTERS_SUBCOLLECTION),
    {
      shelter_club_id: parsed.shelter_club_id,
      pet_id: parsed.pet_id,
      foster_uid: parsed.foster_uid,
      foster_profile_snapshot,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      status: 'pending',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
  );

  await createAuditLog({
    action: 'foster_placement_proposed',
    actor,
    details: {
      foster_id: ref.id,
      pet_id: parsed.pet_id,
      foster_uid: parsed.foster_uid,
      shelter_club_id: parsed.shelter_club_id,
    },
  }).catch((err) => {
    logger.warn('fosterService.proposeFosterPlacement', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, status: 'pending' };
}

// ─── Accept (LT aceita o termo) ────────────────────────────────────────

/**
 * LT aceita o placement. Marca status como 'active' e registra o
 * aceite do termo.
 *
 * @param {string} shelterClubId
 * @param {string} fosterId
 * @param {object} acceptance - {terms_version, signature_text}
 * @param {object} actor - {uid} (deve ser o foster_uid)
 */
export async function acceptFosterPlacement(shelterClubId, fosterId, acceptance, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = acceptFosterPlacementSchema.parse(acceptance);

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, FOSTERS_SUBCOLLECTION, fosterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Placement não encontrado.');
  const current = snap.data();

  // Verifica tenant
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  // Verifica que o actor é o LT
  if (current.foster_uid !== actor.uid) {
    throw new Error('Só o lar temporário (foster_uid) pode aceitar.');
  }
  // Valida transição
  assertValidFosterTransition(current.status, 'active');

  const now = new Date().toISOString();
  const updatedProfile = {
    ...current.foster_profile_snapshot,
    terms_accepted_at: now,
    terms_version: parsed.terms_version,
  };

  await updateDoc(ref, {
    status: 'active',
    foster_profile_snapshot: updatedProfile,
    signature_text: parsed.signature_text,
    updated_at: serverTimestamp(),
  });

  // Cria evento na timeline do pet
  try {
    await addTimelineEvent(
      current.pet_id,
      {
        type: 'note',
        event_date: now,
        data: {
          text: `Animal entrou em lar temporário (foster placement ${fosterId})`,
          visibility: 'internal',
        },
      },
      { uid: actor.uid, displayName: actor.displayName },
      { shelterClubId },
    );
  } catch (err) {
    logger.warn('fosterService.acceptFosterPlacement', {
      msg: 'timeline event failed (non-blocking)',
      err: String(err),
    });
  }

  await createAuditLog({
    action: 'foster_placement_accepted',
    actor,
    details: { foster_id: fosterId, terms_version: parsed.terms_version },
  }).catch(() => {});

  return { id: fosterId, status: 'active', terms_accepted_at: now };
}

// ─── Extend (prorrogar prazo) ─────────────────────────────────────────

export async function extendFosterPlacement(shelterClubId, fosterId, extension, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = extendFosterPlacementSchema.parse(extension);

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, FOSTERS_SUBCOLLECTION, fosterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Placement não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  assertValidFosterTransition(current.status, 'extended');

  // Valida nova data
  const newEnd = new Date(parsed.new_end_date);
  const currentEnd = new Date(current.end_date);
  if (newEnd <= currentEnd) {
    throw new Error('new_end_date deve ser maior que end_date atual.');
  }

  const update = {
    status: 'extended',
    end_date: parsed.new_end_date,
    extension_reason: parsed.reason,
    updated_at: serverTimestamp(),
  };
  if (!current.original_end_date) {
    update.original_end_date = current.end_date;
  }

  await updateDoc(ref, update);

  await createAuditLog({
    action: 'foster_placement_extended',
    actor,
    details: { foster_id: fosterId, new_end_date: parsed.new_end_date, reason: parsed.reason },
  }).catch(() => {});

  return { id: fosterId, status: 'extended', end_date: parsed.new_end_date };
}

// ─── End (finalizar) ──────────────────────────────────────────────────

export async function endFosterPlacement(shelterClubId, fosterId, endData, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = endFosterPlacementSchema.parse(endData);

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, FOSTERS_SUBCOLLECTION, fosterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Placement não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  assertValidFosterTransition(current.status, 'ended');

  const now = new Date().toISOString();
  await updateDoc(ref, {
    status: 'ended',
    ended_at: now,
    ended_by_uid: actor.uid,
    ended_reason: parsed.reason,
    pet_returned_healthy: parsed.pet_returned_healthy,
    foster_rating: parsed.foster_rating,
    foster_feedback: parsed.foster_feedback,
    updated_at: serverTimestamp(),
  });

  // Cria evento na timeline
  try {
    await addTimelineEvent(
      current.pet_id,
      {
        type: 'note',
        event_date: now,
        data: {
          text: `Lar temporário finalizado: ${parsed.reason}`,
          visibility: 'internal',
        },
      },
      { uid: actor.uid, displayName: actor.displayName },
      { shelterClubId },
    );
  } catch (err) {
    logger.warn('fosterService.endFosterPlacement', {
      msg: 'timeline event failed (non-blocking)',
      err: String(err),
    });
  }

  await createAuditLog({
    action: 'foster_placement_ended',
    actor,
    details: { foster_id: fosterId, reason: parsed.reason, healthy: parsed.pet_returned_healthy },
  }).catch(() => {});

  return { id: fosterId, status: 'ended' };
}

// ─── Cancel (cancelar antes de começar) ────────────────────────────────

export async function cancelFosterPlacement(shelterClubId, fosterId, reason, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !fosterId || !actor?.uid) {
    throw new Error('Parâmetros inválidos');
  }
  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, FOSTERS_SUBCOLLECTION, fosterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Placement não encontrado.');
  const current = snap.data();
  if (current.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  assertValidFosterTransition(current.status, 'cancelled');

  await updateDoc(ref, {
    status: 'cancelled',
    ended_at: new Date().toISOString(),
    ended_by_uid: actor.uid,
    ended_reason: reason || 'Cancelado pelo abrigo',
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'foster_placement_cancelled',
    actor,
    details: { foster_id: fosterId, reason },
  }).catch(() => {});

  return { id: fosterId, status: 'cancelled' };
}
