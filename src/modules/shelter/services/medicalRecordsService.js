/**
 * @fileoverview Serviço: Prontuário Médico (Fase 8).
 *
 * Subcoleção `pets/{petId}/medical/{recordId}`. Multi-tenant via
 * `shelter_club_id`. Defense-in-depth: o client checa tenant antes
 * de cada operação; o Firestore rule é a fonte da verdade.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 8
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
  createMedicalRecordSchema,
  updateMedicalRecordSchema,
  needsFollowUp,
} from '@/modules/shelter/domain/clinical/medicalRecords';

const PETS_COLLECTION = 'pets';
const MEDICAL_SUBCOLLECTION = 'medical';

// ─── Helpers internos ──────────────────────────────────────────────────

/**
 * Verifica que o pet existe e que o shelter_club_id bate com o pet.
 * Lança erro se não.
 */
async function _verifyPetTenant(petId, shelterClubId) {
  if (!petId || !shelterClubId) {
    throw new Error('petId e shelterClubId são obrigatórios');
  }
  const petRef = doc(db, PETS_COLLECTION, petId);
  const petSnap = await getDoc(petRef);
  if (!petSnap.exists()) throw new Error('Pet não encontrado.');
  const pet = petSnap.data();
  // Pet pode não ter shelter_owner_club_id (pet individual, não de abrigo)
  if (pet.shelter_owner_club_id && pet.shelter_owner_club_id !== shelterClubId) {
    throw new Error('Pet pertence a outro abrigo.');
  }
  return pet;
}

/**
 * Verifica que o registro existe e pertence ao abrigo.
 */
async function _verifyRecordTenant(petId, recordId, shelterClubId) {
  const ref = doc(db, PETS_COLLECTION, petId, MEDICAL_SUBCOLLECTION, recordId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Registro médico não encontrado.');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data };
}

// ─── Read ───────────────────────────────────────────────────────────────

export async function listMedicalRecords(petId, shelterClubId, options = {}) {
  if (!db) return [];
  if (!petId || !shelterClubId) throw new Error('petId e shelterClubId obrigatórios');
  const { type, maxResults = 100 } = options;

  const constraints = [where('shelter_club_id', '==', shelterClubId)];
  if (type) constraints.push(where('type', '==', type));
  constraints.push(orderBy('exam_date', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, PETS_COLLECTION, petId, MEDICAL_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getMedicalRecord(petId, recordId, shelterClubId) {
  if (!db) return null;
  try {
    return await _verifyRecordTenant(petId, recordId, shelterClubId);
  } catch (err) {
    logger.warn('medicalRecordsService.getMedicalRecord', {
      msg: 'access blocked or not found',
      err: String(err?.message || err),
    });
    return null;
  }
}

// ─── Create ────────────────────────────────────────────────────────────

/**
 * Cria um registro médico.
 *
 * @param {string} petId
 * @param {string} shelterClubId
 * @param {object} input
 * @param {object} actor - {uid, displayName}
 */
export async function createMedicalRecord(petId, shelterClubId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyPetTenant(petId, shelterClubId);

  const parsed = createMedicalRecordSchema.parse(input);
  const exam_date = parsed.exam_date || new Date().toISOString();

  const payload = {
    pet_id: petId,
    shelter_club_id: shelterClubId,
    type: parsed.type,
    exam_date,
    vet_uid: actor.uid,
    vet_name: parsed.vet_name || actor.displayName || null,
    vet_crmv: parsed.vet_crmv || null,
    chief_complaint: parsed.chief_complaint || null,
    diagnosis: parsed.diagnosis || null,
    treatment: parsed.treatment || null,
    prescription: parsed.prescription || null,
    notes: parsed.notes || null,
    exam_results: parsed.exam_results || [],
    attachments: parsed.attachments || [],
    cost_cents: parsed.cost_cents || null,
    paid_by: parsed.paid_by || null,
    next_visit_date: parsed.next_visit_date || null,
    next_visit_notes: parsed.next_visit_notes || null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, PETS_COLLECTION, petId, MEDICAL_SUBCOLLECTION),
    payload,
  );

  // Cria evento 'vet_visit' na timeline se for consulta
  if (parsed.type === 'consultation' || parsed.type === 'surgery') {
    try {
      await addTimelineEvent(
        petId,
        {
          type: 'vet_visit',
          event_date: exam_date,
          data: {
            reason: parsed.chief_complaint || 'Consulta veterinária',
            diagnosis: parsed.diagnosis,
            treatment: parsed.treatment,
            attended_by: parsed.vet_name,
            cost_cents: parsed.cost_cents,
          },
        },
        { uid: actor.uid, displayName: actor.displayName },
        { shelterClubId },
      );
    } catch (err) {
      logger.warn('medicalRecordsService.createMedicalRecord', {
        msg: 'timeline event failed (non-blocking)',
        err: String(err),
      });
    }
  }

  await createAuditLog({
    action: 'medical_record_created',
    actor,
    details: {
      pet_id: petId,
      record_id: ref.id,
      type: parsed.type,
      shelter_club_id: shelterClubId,
    },
  }).catch((err) => {
    logger.warn('medicalRecordsService.createMedicalRecord', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, ...payload, exam_date, type: parsed.type };
}

// ─── Update ───────────────────────────────────────────────────────────

export async function updateMedicalRecord(petId, recordId, shelterClubId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyRecordTenant(petId, recordId, shelterClubId);

  const parsed = updateMedicalRecordSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  const ref = doc(db, PETS_COLLECTION, petId, MEDICAL_SUBCOLLECTION, recordId);
  await updateDoc(ref, {
    ...parsed,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'medical_record_updated',
    actor,
    details: { pet_id: petId, record_id: recordId, changed: Object.keys(parsed) },
  }).catch(() => {});

  return { changed_fields: Object.keys(parsed) };
}

// ─── Delete (soft) ────────────────────────────────────────────────────

/**
 * Soft delete: marca deleted_at e deleted_by. Não remove o doc
 * (preserva audit trail). Registro deletado não aparece em listagens.
 */
export async function deleteMedicalRecord(petId, recordId, shelterClubId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyRecordTenant(petId, recordId, shelterClubId);

  const ref = doc(db, PETS_COLLECTION, petId, MEDICAL_SUBCOLLECTION, recordId);
  await updateDoc(ref, {
    deleted_at: new Date().toISOString(),
    deleted_by_uid: actor.uid,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'medical_record_deleted',
    actor,
    details: { pet_id: petId, record_id: recordId },
  }).catch(() => {});

  return { ok: true };
}

// ─── Aggregates / helpers ─────────────────────────────────────────────

/**
 * Conta total de registros por tipo (para dashboards).
 */
export async function countRecordsByType(petId, shelterClubId, type) {
  if (!db) return 0;
  const q = query(
    collection(db, PETS_COLLECTION, petId, MEDICAL_SUBCOLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    where('type', '==', type),
  );
  const snap = await getDocs(q);
  return snap.size;
}

export { needsFollowUp };
