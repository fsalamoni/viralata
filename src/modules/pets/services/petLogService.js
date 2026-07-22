/**
 * @fileoverview petLogService — log imutável de mudanças do pet.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): subcoleção `pets/{petId}/pet_audit_log`.
 * Cada operação (create/update/delete de pet + subcoleções) é registrada
 * com:
 *  - actor: { uid, displayName }
 *  - action: enum (pet_created, pet_updated, pet_field_changed, etc.)
 *  - target: { collection, doc_id }
 *  - details: objeto livre
 *  - created_at: serverTimestamp
 *
 * D-PET-LOG-IMMUTABLE: pet_audit_log é append-only. Não há update/delete.
 *
 * @see docs/REGENCY_PET_OPS_V3.md
 */
import {
  collection, getDocs, query, orderBy, limit, serverTimestamp, addDoc,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

export const PET_LOG_ACTIONS = {
  PET_CREATED: 'pet_created',
  PET_UPDATED: 'pet_updated',
  PET_DELETED: 'pet_deleted',
  PET_FIELD_CHANGED: 'pet_field_changed',
  PET_PHOTO_ADDED: 'pet_photo_added',
  PET_PHOTO_REMOVED: 'pet_photo_removed',
  VET_VISIT_CREATED: 'vet_visit_created',
  VET_VISIT_UPDATED: 'vet_visit_updated',
  VET_VISIT_DELETED: 'vet_visit_deleted',
  TREATMENT_CREATED: 'treatment_created',
  TREATMENT_UPDATED: 'treatment_updated',
  TREATMENT_DELETED: 'treatment_deleted',
  CARE_LOG_CREATED: 'care_log_created',
  CARE_LOG_UPDATED: 'care_log_updated',
  CARE_LOG_DELETED: 'care_log_deleted',
  MEDICATION_CREATED: 'medication_created',
  MEDICATION_UPDATED: 'medication_updated',
  MEDICATION_DELETED: 'medication_deleted',
  DEVOLUTION_CREATED: 'devolution_created',
  DEVOLUTION_UPDATED: 'devolution_updated',
  DEVOLUTION_DELETED: 'devolution_deleted',
  ADOPTER_HISTORY_CREATED: 'adopter_history_created',
  ADOPTER_HISTORY_UPDATED: 'adopter_history_updated',
  ADOPTER_HISTORY_DELETED: 'adopter_history_deleted',
  NOTE_CREATED: 'note_created',
  NOTE_DELETED: 'note_deleted',
};

/** Registra um evento no log imutável do pet. Não bloqueia a operação principal se falhar. */
export async function appendPetLog(petId, { action, actor, target, details = {} }) {
  if (!db || !petId || !action) return { ok: false, reason: 'missing-params' };
  try {
    const entry = {
      action,
      actor_uid: actor?.uid || null,
      actor_name: actor?.displayName || actor?.name || actor?.email || 'Sistema',
      actor_email: actor?.email || null,
      target_collection: target?.collection || null,
      target_doc_id: target?.docId || null,
      details,
      created_at: serverTimestamp(),
    };
    await addDoc(collection(db, 'pets', petId, 'pet_audit_log'), entry);
    return { ok: true };
  } catch (err) {
    logger.warn('[petLog] appendPetLog falhou', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Lista as últimas N entradas do log do pet (mais recentes primeiro). */
export async function listPetLog(petId, maxResults = 100) {
  if (!db || !petId) return [];
  try {
    const q = query(
      collection(db, 'pets', petId, 'pet_audit_log'),
      orderBy('created_at', 'desc'),
      limit(maxResults),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.warn('[petLog] listPetLog falhou', err);
    return [];
  }
}
