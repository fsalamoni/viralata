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
import { doc, getDoc, serverTimestamp, updateDoc, runTransaction } from 'firebase/firestore';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
// BUG-31 (2026-07-20): updateShelterAnimalProfile muta diretamente o doc
// do pet. Defense em profundidade: validate que o actor pode MUTAR o pet
// antes do updateDoc.
import { ensureCanMutatePet } from '@/modules/pets/services/petService';
import {
  shelterAnimalProfileUpdateSchema,
  diffShelterProfile,
  hasShelterProfile as _hasShelterProfile,
  speciesRescueCode,
  formatRescueNumber,
} from '@/modules/shelter/domain/core/animal';

const PETS_COLLECTION = 'pets';
const CLUBS_COLLECTION = 'clubs';

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

  // BUG-31 (2026-07-20): defense-in-depth — valida permissão ANTES de
  // qualquer escrita no doc do pet. Firestore rules também bloqueiam
  // (canManagePet), mas aqui dá feedback claro em PT-BR.
  await ensureCanMutatePet(petId, actor);

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

/**
 * Atribui um número de resgate sequencial ao pet, se ainda não tiver.
 * Sequência POR abrigo + espécie + ano (ex.: C-00001/26). Atômico: usa uma
 * transação que incrementa o contador `clubs/{clubId}/counters/{code}-{yy}`
 * e grava `rescue_number` no pet no mesmo commit — sem corrida.
 *
 * Idempotente: se o pet já tem `rescue_number`, retorna o existente sem
 * consumir a sequência.
 *
 * @param {string} petId
 * @param {object} opts
 * @param {string} opts.clubId  abrigo dono do animal (escopo da sequência)
 * @param {string} opts.species espécie do pet (define a letra: cão=C, gato=G…)
 * @param {object} opts.actor   {uid, displayName?}
 * @param {string} [opts.date]  data do resgate ISO (define o ano; default hoje)
 * @returns {Promise<{ rescue_number: string, created: boolean }>}
 */
export async function assignRescueNumber(petId, { clubId, species, actor, date } = {}) {
  if (!db) throw new Error('Firebase não disponível');
  if (!petId) throw new Error('petId é obrigatório');
  if (!clubId) throw new Error('clubId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  // Defense-in-depth: valida permissão de mutar o pet antes de escrever.
  await ensureCanMutatePet(petId, actor);

  const code = speciesRescueCode(species);
  const year = date ? new Date(date) : new Date();
  const yy = String(year.getFullYear() % 100).padStart(2, '0');
  const counterId = `rescue-${code}-${yy}`;
  const counterRef = doc(db, CLUBS_COLLECTION, clubId, 'counters', counterId);
  const petRef = doc(db, PETS_COLLECTION, petId);

  const result = await runTransaction(db, async (tx) => {
    const petSnap = await tx.get(petRef);
    if (!petSnap.exists()) throw new Error('Pet não encontrado.');
    const existing = petSnap.data()?.rescue_number;
    if (existing) return { rescue_number: existing, created: false };

    const counterSnap = await tx.get(counterRef);
    const currentSeq = Number(counterSnap.data()?.seq || 0);
    const nextSeq = currentSeq + 1;
    const rescueNumber = formatRescueNumber(code, nextSeq, year);

    tx.set(
      counterRef,
      { seq: nextSeq, code, year_yy: yy, updated_at: serverTimestamp() },
      { merge: true },
    );
    tx.update(petRef, {
      rescue_number: rescueNumber,
      shelter_owner_club_id: petSnap.data()?.shelter_owner_club_id || clubId,
      updated_at: serverTimestamp(),
    });
    return { rescue_number: rescueNumber, created: true };
  });

  if (result.created) {
    await createAuditLog({
      action: 'shelter_animal_rescue_number_assigned',
      actor,
      details: { pet_id: petId, club_id: clubId, rescue_number: result.rescue_number },
    }).catch((err) => {
      logger.warn('shelterAnimalService.assignRescueNumber', {
        msg: 'audit log failed (non-blocking)', err: String(err),
      });
    });
  }
  return result;
}

// ─── Helpers internos ───────────────────────────────────────────────────

function _pickShelterFields(petData) {
  const fields = [
    'rescue_number', 'rescue_name', 'rescue_date', 'rescue_by_uid', 'rescue_by_name',
    'rescue_responsible_name', 'rescue_location', 'rescue_photos', 'birth_date',
    'microchip_id', 'intake_type', 'intake_subtype',
    'intake_notes', 'asilomar_status', 'asilomar_evaluated_at',
    'asilomar_evaluated_by_uid',
    'status_changed_at', 'current_location', 'current_location_notes',
    'legal_process_number', 'observations',
    'shelter_owner_club_id', 'cross_posting',
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
