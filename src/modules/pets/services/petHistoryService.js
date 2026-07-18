/**
 * @fileoverview petHistoryService — CRUD de subcoleções de histórico do pet.
 *
 * TASK-V3-PET-DETAIL-FULL-05: subcoleções `devolutions`, `adopters_history`
 * em `pets/{petId}/`.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

// ============================================================================
// DEVOLUTIONS — Devoluções
// ============================================================================

/**
 * Lista devoluções do pet.
 */
export async function listDevolutions(petId, maxResults = 50) {
  if (!db || !petId) return [];
  const q = query(
    collection(db, 'pets', petId, 'devolutions'),
    orderBy('devolution_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Registra uma devolução.
 *
 * @param {string} petId
 * @param {object} data
 *   - devolution_date: ISO
 *   - reason: string (≥ 10 chars) — motivo principal
 *   - reason_category: enum (allergy, behavior, housing, health, family_change, other)
 *   - returned_by_uid: uid do adotante que devolveu
 *   - returned_by_name: nome
 *   - notes: string (opcional)
 *   - pet_condition: enum (excellent, good, fair, poor) — estado do pet na devolução
 *   - foster_to_shelter: boolean — se veio via LT
 * @param {object} actor (uid + displayName)
 */
export async function createDevolution(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!data.reason || data.reason.trim().length < 10) {
    throw new Error('Motivo da devolução deve ter ao menos 10 caracteres');
  }
  const payload = {
    ...data,
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'devolutions'), payload);
  logger.info('[petHistory] devolução registrada', { petId, devolutionId: ref.id });
  return ref.id;
}

export async function updateDevolution(petId, devolutionId, updates) {
  if (!db) throw new Error('Firebase não disponível');
  await updateDoc(doc(db, 'pets', petId, 'devolutions', devolutionId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteDevolution(petId, devolutionId) {
  if (!db) throw new Error('Firebase não disponível');
  await deleteDoc(doc(db, 'pets', petId, 'devolutions', devolutionId));
}

// ============================================================================
// ADOPTERS HISTORY — Histórico de adotantes
// ============================================================================

/**
 * Lista o histórico de adotantes do pet.
 */
export async function listAdoptersHistory(petId, maxResults = 50) {
  if (!db || !petId) return [];
  const q = query(
    collection(db, 'pets', petId, 'adopters_history'),
    orderBy('start_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Registra um adotante no histórico.
 *
 * @param {string} petId
 * @param {object} data
 *   - adopter_uid: uid
 *   - adopter_name: string
 *   - adopter_email: string
 *   - adopter_phone: string
 *   - start_date: ISO (data da adoção)
 *   - end_date: ISO (data de devolução, null se ativo)
 *   - status: enum (active, returned, transferred, deceased)
 *   - adoption_id: id da adoption (link)
 *   - notes: string
 */
export async function createAdopterHistory(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const payload = {
    ...data,
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, 'adopters_history'), payload);
  logger.info('[petHistory] adotante registrado', { petId, adopterId: data?.adopter_uid });
  return ref.id;
}

export async function updateAdopterHistory(petId, historyId, updates) {
  if (!db) throw new Error('Firebase não disponível');
  await updateDoc(doc(db, 'pets', petId, 'adopters_history', historyId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
}

export async function deleteAdopterHistory(petId, historyId) {
  if (!db) throw new Error('Firebase não disponível');
  await deleteDoc(doc(db, 'pets', petId, 'adopters_history', historyId));
}

// ============================================================================
// PET CODE GENERATOR — Geração do ID único do pet
// ============================================================================

/**
 * Gera um pet_code único no formato VLT-XXXXXX.
 *
 * Usa o último pet cadastrado (ordenado por created_at desc) para
 * incrementar o número. Se o firestore falhar, gera um fallback
 * com base em timestamp.
 *
 * @returns {Promise<string>} pet_code (ex: "VLT-000123")
 */
export async function generatePetCode() {
  if (!db) return fallbackPetCode();
  try {
    const { getDocs, query, collection, orderBy, limit } = await import('firebase/firestore');
    const q = query(
      collection(db, 'pets'),
      orderBy('created_at', 'desc'),
      limit(1),
    );
    const snap = await getDocs(q);
    let next = 1;
    if (!snap.empty) {
      const lastCode = snap.docs[0].data().pet_code;
      if (lastCode && typeof lastCode === 'string') {
        const match = lastCode.match(/VLT-(\d+)/);
        if (match) next = parseInt(match[1], 10) + 1;
      }
    }
    return `VLT-${String(next).padStart(6, '0')}`;
  } catch (err) {
    logger.warn('[petHistory] generatePetCode falhou, usando fallback', err);
    return fallbackPetCode();
  }
}

function fallbackPetCode() {
  const n = Math.floor(Math.random() * 999999) + 1;
  return `VLT-${String(n).padStart(6, '0')}`;
}
