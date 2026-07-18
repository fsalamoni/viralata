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
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

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
 * Cria uma nova consulta veterinária.
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
  const payload = {
    ...data,
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'vet_visits'), payload);
  logger.info('[petMedical] vet visit criada', { petId, visitId: ref.id });
  return ref.id;
}

/**
 * Atualiza uma consulta existente.
 */
export async function updateVetVisit(petId, visitId, updates) {
  if (!db) throw new Error('Firebase não disponível');
  await updateDoc(doc(db, 'pets', petId, 'vet_visits', visitId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

/**
 * Deleta uma consulta (apenas platform_admin).
 */
export async function deleteVetVisit(petId, visitId) {
  if (!db) throw new Error('Firebase não disponível');
  await deleteDoc(doc(db, 'pets', petId, 'vet_visits', visitId));
}

// ============================================================================
// TREATMENTS — Tratamentos em curso
// ============================================================================

/**
 * Lista os tratamentos do pet.
 *
 * @param {string} petId
 * @returns {Promise<Treatment[]>}
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
 * Cria um novo tratamento.
 *
 * @param {string} petId
 * @param {object} data
 *   - name: string (ex: "Sarna", "Ferida pata", "Otite")
 *   - type: enum (parasitic, injury, infection, chronic, rehab, other)
 *   - status: enum (in_progress, completed, suspended, paused)
 *   - start_date: ISO
 *   - end_date: ISO (opcional, se status=completed)
 *   - description: string
 *   - medication: string (opcional)
 *   - dosage: string (opcional)
 *   - vet_name: string
 */
export async function createTreatment(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const payload = {
    ...data,
    status: data.status || 'in_progress',
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'treatments'), payload);
  logger.info('[petMedical] tratamento criado', { petId, treatmentId: ref.id });
  return ref.id;
}

export async function updateTreatment(petId, treatmentId, updates) {
  if (!db) throw new Error('Firebase não disponível');
  await updateDoc(doc(db, 'pets', petId, 'treatments', treatmentId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteTreatment(petId, treatmentId) {
  if (!db) throw new Error('Firebase não disponível');
  await deleteDoc(doc(db, 'pets', petId, 'treatments', treatmentId));
}

// ============================================================================
// CARE LOG — Cuidados (banho, tosa, escovação, dental, unhas)
// ============================================================================

/**
 * Lista o histórico de cuidados do pet.
 *
 * @param {string} petId
 * @returns {Promise<CareLog[]>}
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
 * Cria um registro de cuidado.
 *
 * @param {string} petId
 * @param {object} data
 *   - care_type: enum (bath, grooming, brushing, dental, nails, exercise, other)
 *   - care_date: ISO
 *   - next_due_date: ISO (opcional)
 *   - frequency_days: number (opcional)
 *   - performed_by: string (ex: "Abrigo SP", "João da tosa")
 *   - notes: string
 */
export async function createCareLog(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const payload = {
    ...data,
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'care_log'), payload);
  logger.info('[petMedical] care log criado', { petId, careId: ref.id });
  return ref.id;
}

export async function updateCareLog(petId, careId, updates) {
  if (!db) throw new Error('Firebase não disponível');
  await updateDoc(doc(db, 'pets', petId, 'care_log', careId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteCareLog(petId, careId) {
  if (!db) throw new Error('Firebase não disponível');
  await deleteDoc(doc(db, 'pets', petId, 'care_log', careId));
}
