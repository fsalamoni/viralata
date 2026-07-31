/**
 * @fileoverview petHealthRecordsService — CRUD de `health_records`
 * (vacinas e vermifugação) em `pets/{petId}/health_records`.
 *
 * Subcoleção pública para LEITURA (transparência — igual às demais
 * subcoleções médicas); escrita só por quem gerencia o pet
 * (`ensureCanMutatePet` + firestore.rules).
 *
 * Campo de data nativo: `application_date` (ISO). Suporta agendamento
 * via `scheduled_for` (ver domain/operational/petOpsScheduling.js).
 */
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { ensureCanMutatePet } from './petService';
import { appendPetLog, PET_LOG_ACTIONS } from './petLogService';

const SUB = 'health_records';

/** Tipos de registro de saúde (vacina / vermífugo / antipulgas / outro). */
export const HEALTH_RECORD_TYPES = Object.freeze({
  VACCINE: 'vaccine',
  DEWORMING: 'deworming',
  FLEA_TICK: 'flea_tick',
  OTHER: 'other',
});

export const HEALTH_RECORD_TYPE_LABELS = Object.freeze({
  vaccine: 'Vacina',
  deworming: 'Vermifugação',
  flea_tick: 'Antipulgas/carrapatos',
  other: 'Outro',
});

/**
 * Lista os registros de saúde (vacinas/vermifugação) do pet.
 * @param {string} petId
 * @param {number} [maxResults=100]
 * @returns {Promise<object[]>}
 */
export async function listHealthRecords(petId, maxResults = 100) {
  if (!db || !petId) return [];
  const q = query(
    collection(db, 'pets', petId, SUB),
    orderBy('application_date', 'desc'),
    limit(maxResults),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Cria um registro de saúde. Só canManage.
 * @param {string} petId
 * @param {object} data
 *   - type: 'vaccine' | 'deworming' | 'flea_tick' | 'other'
 *   - name: string (nome da vacina/produto)
 *   - application_date: ISO
 *   - dose: string (opcional)
 *   - vet_name: string (opcional)
 *   - notes: string (opcional)
 *   - scheduled_for: ISO (opcional — agendamento futuro)
 * @param {object} actor
 * @returns {Promise<string>} id
 */
export async function createHealthRecord(petId, data, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  const payload = {
    ...data,
    type: data.type || HEALTH_RECORD_TYPES.VACCINE,
    created_at: serverTimestamp(),
    created_by: actor?.uid || null,
    created_by_name: actor?.displayName || actor?.name || 'Sistema',
  };
  const ref = await addDoc(collection(db, 'pets', petId, SUB), payload);
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.HEALTH_RECORD_CREATED,
    actor,
    target: { collection: SUB, docId: ref.id },
    details: { type: payload.type, name: data?.name, application_date: data?.application_date },
  }).catch(() => {});
  logger.info('[petHealthRecords] registro criado', { petId, recordId: ref.id });
  return ref.id;
}

/**
 * Atualiza um registro de saúde. Só canManage.
 */
export async function updateHealthRecord(petId, recordId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await updateDoc(doc(db, 'pets', petId, SUB, recordId), {
    ...updates,
    updated_at: serverTimestamp(),
  });
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.HEALTH_RECORD_UPDATED,
    actor,
    target: { collection: SUB, docId: recordId },
    details: { changed_fields: Object.keys(updates || {}) },
  }).catch(() => {});
}

/**
 * Remove um registro de saúde. Só canManage.
 */
export async function deleteHealthRecord(petId, recordId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  await ensureCanMutatePet(petId, actor);
  await deleteDoc(doc(db, 'pets', petId, SUB, recordId));
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.HEALTH_RECORD_DELETED,
    actor,
    target: { collection: SUB, docId: recordId },
  }).catch(() => {});
}
