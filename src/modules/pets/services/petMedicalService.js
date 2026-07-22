/**
 * @fileoverview petMedicalService — CRUD de subcoleções médicas do pet.
 *
 * TASK-V3-PET-DETAIL-FULL-04: subcoleções `vet_visits`, `treatments`,
 * `care_log` em `pets/{petId}/`. Cada subcoleção é ordenada por data
 * decrescente.
 *
 * Regras (firestore.rules):
 *  - read: público (transparência)
 *  - write: dono do pet ou platform_admin
 *
 * DEFENSE-IN-DEPTH (2026-07-20): TODAS as escritas chamam `ensureCanMutatePet`
 * ANTES de tocar o Firestore. As Firestore rules JÁ bloqueiam no servidor,
 * mas esta camada dá feedback claro ao usuário.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { ensureCanMutatePet } from './petService';
import { appendPetLog, PET_LOG_ACTIONS } from './petLogService';

// ============================================================================
// VET VISITS — Consultas Veterinárias
// ============================================================================

/**
 * Lista as últimas N consultas veterinárias do pet.
 *
 * @param {string} petId
 * @param {number} [maxResults=50]
 * @returns {Promise<VetVisit[]>}
 */
export async function listVetVisits(petId, maxResults = 50) {
  if (!db || !petId) return [];
  const q = query(
    collection(db, 'pets', petId, 'vet_visits'),
    orderBy('visit_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria uma nova consulta veterinária. Só canManage.
 *
 * @param {string} petId
 * @param {object} data
 *   - visit_date: ISO string
 *   - vet_name: string
 *   - vet_clinic: string
 *   - reason: string
 *   - diagnosis: string
 *   - treatment: string
 *   - notes: string
 *   - cost_cents: number (opcional)
 * @param {object} actor (uid + name)
 * @returns {Promise<string>} id da consulta criada
 */
export async function createVetVisit(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  const payload = {
    ...data,
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'vet_visits'), payload);
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.VET_VISIT_CREATED,
    actor,
    target: { collection: 'vet_visits', docId: ref.id },
    details: { visit_date: data?.visit_date, reason: data?.reason },
  });
  logger.info('[petMedical] vet visit criada', { petId, visitId: ref.id });
  return ref.id;
}

/**
 * Atualiza uma consulta existente. Só canManage.
 */
export async function updateVetVisit(petId, visitId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await updateDoc(doc(db, 'pets', petId, 'vet_visits', visitId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.VET_VISIT_UPDATED,
    actor,
    target: { collection: 'vet_visits', docId: visitId },
    details: { changed_fields: Object.keys(updates || {}) },
  });
}

/**
 * Deleta uma consulta. Só canManage (Firestore rules também exigem
 * platform_admin para delete — aqui exigimos o mínimo: ownership ou
 * admin do clube. A Firestore rule vai recusar platform_admin-only).
 */
export async function deleteVetVisit(petId, visitId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await deleteDoc(doc(db, 'pets', petId, 'vet_visits', visitId));
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.VET_VISIT_DELETED,
    actor,
    target: { collection: 'vet_visits', docId: visitId },
  });
}

// ============================================================================
// TREATMENTS — Tratamentos em curso
// ============================================================================

/**
 * Lista os tratamentos do pet.
 */
export async function listTreatments(petId, maxResults = 50) {
  if (!db || !petId) return [];
  const q = query(
    collection(db, 'pets', petId, 'treatments'),
    orderBy('start_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria um novo tratamento. Só canManage.
 */
export async function createTreatment(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  const payload = {
    ...data,
    status: data.status || 'in_progress',
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'treatments'), payload);
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.TREATMENT_CREATED,
    actor,
    target: { collection: 'treatments', docId: ref.id },
    details: { name: data?.name, status: payload.status },
  });
  logger.info('[petMedical] tratamento criado', { petId, treatmentId: ref.id });
  return ref.id;
}

export async function updateTreatment(petId, treatmentId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await updateDoc(doc(db, 'pets', petId, 'treatments', treatmentId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.TREATMENT_UPDATED,
    actor,
    target: { collection: 'treatments', docId: treatmentId },
    details: { changed_fields: Object.keys(updates || {}) },
  });
}

export async function deleteTreatment(petId, treatmentId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await deleteDoc(doc(db, 'pets', petId, 'treatments', treatmentId));
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.TREATMENT_DELETED,
    actor,
    target: { collection: 'treatments', docId: treatmentId },
  });
}

// ============================================================================
// CARE LOG — Cuidados (banho, tosa, escovação, dental, unhas)
// ============================================================================

/**
 * Lista o histórico de cuidados do pet.
 */
export async function listCareLog(petId, maxResults = 100) {
  if (!db || !petId) return [];
  const q = query(
    collection(db, 'pets', petId, 'care_log'),
    orderBy('care_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria um registro de cuidado. Só canManage.
 */
export async function createCareLog(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  const payload = {
    ...data,
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'care_log'), payload);
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.CARE_LOG_CREATED,
    actor,
    target: { collection: 'care_log', docId: ref.id },
    details: { care_type: data?.care_type, care_date: data?.care_date },
  });
  logger.info('[petMedical] care log criado', { petId, careId: ref.id });
  return ref.id;
}

export async function updateCareLog(petId, careId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await updateDoc(doc(db, 'pets', petId, 'care_log', careId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.CARE_LOG_UPDATED,
    actor,
    target: { collection: 'care_log', docId: careId },
    details: { changed_fields: Object.keys(updates || {}) },
  });
}

export async function deleteCareLog(petId, careId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await deleteDoc(doc(db, 'pets', petId, 'care_log', careId));
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.CARE_LOG_DELETED,
    actor,
    target: { collection: 'care_log', docId: careId },
  });
}

// ============================================================================
// MEDICATIONS — Medicação contínua
// ============================================================================

/**
 * Lista medicações contínuas do pet.
 */
export async function listMedications(petId, maxResults = 30) {
  if (!db || !petId) return [];
  const q = query(
    collection(db, 'pets', petId, 'medications'),
    orderBy('start_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria uma medicação contínua. Só canManage.
 */
export async function createMedication(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  const payload = {
    ...data,
    status: data.status || 'active',
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'medications'), payload);
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.MEDICATION_CREATED,
    actor,
    target: { collection: 'medications', docId: ref.id },
    details: { name: data?.name, dosage: data?.dosage },
  });
  logger.info('[petMedical] medicação criada', { petId, medicationId: ref.id });
  return ref.id;
}

export async function updateMedication(petId, medicationId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await updateDoc(doc(db, 'pets', petId, 'medications', medicationId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.MEDICATION_UPDATED,
    actor,
    target: { collection: 'medications', docId: medicationId },
    details: { changed_fields: Object.keys(updates || {}) },
  });
}

export async function deleteMedication(petId, medicationId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await deleteDoc(doc(db, 'pets', petId, 'medications', medicationId));
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.MEDICATION_DELETED,
    actor,
    target: { collection: 'medications', docId: medicationId },
  });
}
