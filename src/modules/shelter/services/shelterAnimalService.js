/**
 * @fileoverview Serviço de Cadastro Único do Animal (Fase 1).
 *
 * Encapsula a manipulação dos campos do perfil de abrigo no doc `pets/{id}`.
 * Mantém backward-compat: pets sem esses campos continuam funcionando; pets
 * novos ganham defaults ao serem criados via createShelterAnimalProfile.
 *
 * Multi-tenant: o campo `shelter_owner_club_id` é o que vai isolar dados
 * por abrigo nas próximas fases. Esta Fase 1 só *coleta* o valor; o
 * enforcement rigoroso vem em Fases 2+ (subcoleções) e Fase 19 (rules).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 1
 */

import { db } from '@/core/config/firebase';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  shelterAnimalProfileUpdateSchema,
  diffShelterProfile,
  hasShelterProfile as _hasShelterProfile,
} from '@/modules/shelter/domain/core/animal';

const PETS_COLLECTION = 'pets';

/**
 * Lê o perfil de abrigo de um pet. Retorna {} se o pet não tem nenhum campo
 * do schema preenchido (não é erro).
 */
export async function getShelterAnimalProfile(petId) {
  if (!db || !petId) return null;
  const snap = await getDoc(doc(db, PETS_COLLECTION, petId));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  return {
    id: snap.id,
    ..._pickShelterFields(data),
  };
}

/**
 * Atualiza o perfil de abrigo de um pet. Aplica a validação Zod e só envia
 * os campos que mudaram (delta). Faz audit log com o diff.
 *
 * @param {string} petId
 * @param {object} updates - objeto com subset do schema
 * @param {object} actor - {uid, displayName?} do usuário que está editando
 * @returns {Promise<{changed_fields: string[]}>}
 *
 * @throws Error se validação Zod falhar (campo inválido)
 * @throws Error se o pet não existir
 */
export async function updateShelterAnimalProfile(petId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!petId) throw new Error('petId é obrigatório');
  if (!updates || typeof updates !== 'object') {
    throw new Error('updates deve ser um objeto');
  }
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  // 1. Validação Zod — rejeita silenciosamente campos extras (`.strict()`)
  //    e valida formato (microchip 15 dígitos, UF, ISO 8601, etc.)
  const parsed = shelterAnimalProfileUpdateSchema.parse(updates);

  // 2. Carrega o estado atual para calcular o diff
  const currentSnap = await getDoc(doc(db, PETS_COLLECTION, petId));
  if (!currentSnap.exists()) {
    throw new Error('Pet não encontrado.');
  }
  const current = currentSnap.data() || {};

  // 3. Monta o delta: só os campos efetivamente alterados
  const delta = {};
  for (const [k, v] of Object.entries(parsed)) {
    // null = "limpar" — enviamos null para o Firestore
    if (v === undefined) continue;
    if (!deepEqual(current[k] ?? null, v)) {
      delta[k] = v;
    }
  }

  if (Object.keys(delta).length === 0) {
    return { changed_fields: [], noop: true };
  }

  // 4. Adiciona metadados de auditoria
  delta.shelter_profile_updated_at = new Date().toISOString();
  delta.shelter_profile_updated_by_uid = actor.uid;

  // 5. Persiste
  await updateDoc(doc(db, PETS_COLLECTION, petId), {
    ...delta,
    updated_at: serverTimestamp(),
  });

  // 6. Audit log com diff legível
  const changes = diffShelterProfile(current, { ...current, ...delta });
  await createAuditLog({
    action: 'shelter_animal_profile_updated',
    actor,
    details: {
      pet_id: petId,
      changed_fields: changes.map((c) => c.field),
      diff: changes,
    },
  }).catch((err) => {
    // Audit é best-effort — não bloquear UX se falhar
    logger.warn('shelterAnimalService.updateShelterAnimalProfile', {
      msg: 'audit log failed (non-blocking)',
      err: String(err),
    });
  });

  return { changed_fields: changes.map((c) => c.field) };
}

/**
 * Aplica o backfill de defaults a um pet (idempotente).
 * Usado na migração inicial: se um pet tem `status='available'` e
 * `intake_type` indefinido, marcamos como `intake_type='rescue'`.
 *
 * Não muda comportamento de UI — só adiciona campos se ausentes.
 */
export async function backfillShelterProfileFields(petId) {
  if (!db || !petId) return null;
  const ref = doc(db, PETS_COLLECTION, petId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  const delta = {};
  if (!data.asilomar_status) delta.asilomar_status = 'undetermined';
  // Não setamos intake_type em backfill — campo opcional, sem default.
  // Se o pet foi criado via createShelterAnimalProfile, ele já tem o que setamos.
  if (Object.keys(delta).length === 0) return null;
  await updateDoc(ref, { ...delta, updated_at: serverTimestamp() });
  return { id: petId, added: Object.keys(delta) };
}

// ─── Helpers internos ───────────────────────────────────────────────────

function _pickShelterFields(petData) {
  const fields = [
    'rescue_name', 'rescue_date', 'rescue_by_uid', 'rescue_by_name',
    'rescue_location', 'microchip_id', 'intake_type', 'intake_subtype',
    'intake_notes', 'asilomar_status', 'asilomar_evaluated_at',
    'asilomar_evaluated_by_uid', 'shelter_owner_club_id', 'cross_posting',
    'deceased_at', 'death_cause',
    'shelter_profile_updated_at', 'shelter_profile_updated_by_uid',
  ];
  const out = {};
  for (const f of fields) {
    if (petData[f] !== undefined) out[f] = petData[f];
  }
  return out;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}
