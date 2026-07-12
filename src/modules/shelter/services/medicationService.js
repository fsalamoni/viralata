/**
 * @fileoverview Serviço: Medicação (Fase 9).
 *
 * Subcoleção `pets/{petId}/medications/{medId}`. Multi-tenant via
 * `shelter_club_id`. Doses são **calculadas em runtime** (não pré-criadas).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 9
 */

import {
  collection, collectionGroup, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { addTimelineEvent } from '@/modules/shelter/services/timelineService';
import {
  createMedicationSchema,
  updateMedicationSchema,
  recordDoseSchema,
} from '@/modules/shelter/domain/clinical/medication';

const PETS_COLLECTION = 'pets';
const MEDICATIONS_SUBCOLLECTION = 'medications';
const DOSES_SUBCOLLECTION = 'doses';

// ─── Helpers internos ──────────────────────────────────────────────────

async function _verifyPetTenant(petId, shelterClubId) {
  if (!petId || !shelterClubId) {
    throw new Error('petId e shelterClubId são obrigatórios');
  }
  const petRef = doc(db, PETS_COLLECTION, petId);
  const petSnap = await getDoc(petRef);
  if (!petSnap.exists()) throw new Error('Pet não encontrado.');
  const pet = petSnap.data();
  if (pet.shelter_owner_club_id && pet.shelter_owner_club_id !== shelterClubId) {
    throw new Error('Pet pertence a outro abrigo.');
  }
  return pet;
}

async function _verifyMedTenant(petId, medId, shelterClubId) {
  const ref = doc(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION, medId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Medicação não encontrada.');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data };
}

// ─── Read ───────────────────────────────────────────────────────────────

export async function listMedications(petId, shelterClubId, options = {}) {
  if (!db) return [];
  if (!petId || !shelterClubId) throw new Error('petId e shelterClubId obrigatórios');
  const { status, maxResults = 100 } = options;

  const constraints = [where('shelter_club_id', '==', shelterClubId)];
  if (status) constraints.push(where('status', '==', status));
  constraints.push(orderBy('start_date', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION),
    ...constraints,
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * TASK-138: medicações ativas do abrigo inteiro (cross-pet) para o
 * card do dashboard. CollectionGroup em `medications` filtrado pelo
 * tenant. Requer rule de collection-group (read por membro do abrigo)
 * e índice composto shelter_club_id + status.
 */
export async function listShelterActiveMedications(shelterClubId, { maxResults = 100 } = {}) {
  if (!db || !shelterClubId) return [];
  const q = query(
    collectionGroup(db, MEDICATIONS_SUBCOLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    where('status', '==', 'active'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  // pet_id vem da path: pets/{petId}/medications/{medId}
  return snap.docs.map((d) => ({ id: d.id, pet_id: d.ref.path.split('/')[1], ...d.data() }));
}

export async function getMedication(petId, medId, shelterClubId) {
  if (!db) return null;
  try {
    return await _verifyMedTenant(petId, medId, shelterClubId);
  } catch (err) {
    logger.warn('medicationService.getMedication', {
      msg: 'access blocked or not found',
      err: String(err?.message || err),
    });
    return null;
  }
}

// ─── Create ────────────────────────────────────────────────────────────

export async function createMedication(petId, shelterClubId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyPetTenant(petId, shelterClubId);

  const parsed = createMedicationSchema.parse(input);
  const start_date = parsed.start_date || new Date().toISOString();

  // Se tem duration_days mas não end_date, calcula
  let end_date = parsed.end_date || null;
  if (!end_date && parsed.duration_days) {
    const sd = new Date(start_date);
    sd.setDate(sd.getDate() + parsed.duration_days);
    end_date = sd.toISOString();
  }

  const payload = {
    pet_id: petId,
    shelter_club_id: shelterClubId,
    medication: parsed.medication,
    dosage: parsed.dosage || null,
    start_date,
    end_date,
    frequency: parsed.frequency,
    custom_frequency_hours: parsed.custom_frequency_hours || null,
    times: parsed.times || [],
    duration_days: parsed.duration_days || null,
    notes: parsed.notes || null,
    status: 'active',
    responsible_uid: actor.uid,
    administered_count: 0,
    skipped_count: 0,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION),
    payload,
  );

  // Cria evento 'medication_start' na timeline
  try {
    await addTimelineEvent(
      petId,
      {
        type: 'medication',
        event_date: start_date,
        data: {
          medication: parsed.medication,
          dosage: parsed.dosage,
          frequency: parsed.frequency,
          duration_days: parsed.duration_days,
        },
      },
      { uid: actor.uid, displayName: actor.displayName },
      { shelterClubId },
    );
  } catch (err) {
    logger.warn('medicationService.createMedication', {
      msg: 'timeline event failed (non-blocking)',
      err: String(err),
    });
  }

  await createAuditLog({
    action: 'medication_created',
    actor,
    details: {
      pet_id: petId,
      medication_id: ref.id,
      medication: parsed.medication,
      shelter_club_id: shelterClubId,
    },
  }).catch((err) => {
    logger.warn('medicationService.createMedication', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: ref.id, ...payload, status: 'active' };
}

// ─── Update ───────────────────────────────────────────────────────────

export async function updateMedication(petId, medId, shelterClubId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyMedTenant(petId, medId, shelterClubId);

  const parsed = updateMedicationSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  const ref = doc(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION, medId);
  await updateDoc(ref, {
    ...parsed,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'medication_updated',
    actor,
    details: { pet_id: petId, medication_id: medId, changed: Object.keys(parsed) },
  }).catch(() => {});

  return { changed_fields: Object.keys(parsed) };
}

// ─── Pausa / retoma / cancela / conclui ───────────────────────────────

export async function pauseMedication(petId, medId, shelterClubId, reason, actor) {
  return updateMedication(petId, medId, shelterClubId, {
    status: 'paused',
    notes: reason ? `PAUSADA: ${reason}` : undefined,
  }, actor);
}

export async function resumeMedication(petId, medId, shelterClubId, actor) {
  return updateMedication(petId, medId, shelterClubId, { status: 'active' }, actor);
}

export async function cancelMedication(petId, medId, shelterClubId, reason, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await _verifyMedTenant(petId, medId, shelterClubId);
  const ref = doc(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION, medId);
  await updateDoc(ref, {
    status: 'cancelled',
    notes: reason ? `CANCELADA: ${reason}` : undefined,
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'medication_cancelled',
    actor,
    details: { pet_id: petId, medication_id: medId, reason },
  }).catch(() => {});
  return { ok: true };
}

export async function completeMedication(petId, medId, shelterClubId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await _verifyMedTenant(petId, medId, shelterClubId);
  const ref = doc(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION, medId);
  await updateDoc(ref, {
    status: 'completed',
    end_date: new Date().toISOString(),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'medication_completed',
    actor,
    details: { pet_id: petId, medication_id: medId },
  }).catch(() => {});
  return { ok: true };
}

// ─── Dose records (sub-subcoleção) ────────────────────────────────────

/**
 * Registra uma dose como administrada ou pulada.
 * Cria doc em `pets/{petId}/medications/{medId}/doses/{doseId}`.
 * Idempotente: se já existir doc com mesmo scheduled_at, atualiza.
 */
export async function recordDose(petId, medId, shelterClubId, doseInput, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  await _verifyMedTenant(petId, medId, shelterClubId);

  const parsed = recordDoseSchema.parse({
    ...doseInput,
    by_uid: doseInput.by_uid || actor.uid,
  });

  const dosesRef = collection(
    db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION, medId, DOSES_SUBCOLLECTION,
  );

  // Verifica idempotência: busca por scheduled_at
  const existingQ = query(dosesRef, where('scheduled_at', '==', parsed.scheduled_at), limit(1));
  const existingSnap = await getDocs(existingQ);

  const doseDoc = {
    medication_id: medId,
    pet_id: petId,
    shelter_club_id: shelterClubId,
    scheduled_at: parsed.scheduled_at,
    administered_at: parsed.administered_at || (parsed.skipped ? null : new Date().toISOString()),
    by_uid: parsed.by_uid,
    by_name: parsed.by_name || actor.displayName || null,
    skipped: parsed.skipped,
    notes: parsed.notes || null,
    created_at: serverTimestamp(),
  };

  let doseRef;
  if (!existingSnap.empty) {
    doseRef = existingSnap.docs[0].ref;
    await updateDoc(doseRef, {
      administered_at: doseDoc.administered_at,
      by_uid: doseDoc.by_uid,
      by_name: doseDoc.by_name,
      skipped: doseDoc.skipped,
      notes: doseDoc.notes,
    });
  } else {
    doseRef = await addDoc(dosesRef, doseDoc);
  }

  // Atualiza contadores no doc principal
  const medRef = doc(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION, medId);
  const medSnap = await getDoc(medRef);
  const medData = medSnap.data();
  await updateDoc(medRef, {
    administered_count: (medData.administered_count || 0) + (parsed.skipped ? 0 : 1),
    skipped_count: (medData.skipped_count || 0) + (parsed.skipped ? 1 : 0),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: parsed.skipped ? 'dose_skipped' : 'dose_administered',
    actor,
    details: {
      pet_id: petId,
      medication_id: medId,
      dose_id: doseRef.id,
      scheduled_at: parsed.scheduled_at,
    },
  }).catch(() => {});

  return { id: doseRef.id, ...doseDoc };
}

/**
 * Lista doses registradas (não futuras). Usado para histórico.
 */
export async function listDoses(petId, medId, shelterClubId, options = {}) {
  if (!db) return [];
  if (!petId || !medId || !shelterClubId) throw new Error('parâmetros obrigatórios');
  await _verifyMedTenant(petId, medId, shelterClubId);
  const { maxResults = 50 } = options;
  const q = query(
    collection(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION, medId, DOSES_SUBCOLLECTION),
    orderBy('scheduled_at', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Aggregates ────────────────────────────────────────────────────────

/**
 * Conta medicações ativas de um pet (para dashboard).
 */
export async function countActiveMedications(petId, shelterClubId) {
  if (!db) return 0;
  const q = query(
    collection(db, PETS_COLLECTION, petId, MEDICATIONS_SUBCOLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    where('status', '==', 'active'),
  );
  const snap = await getDocs(q);
  return snap.size;
}
