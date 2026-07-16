/**
 * @fileoverview Serviço: Perfil do Adotante (Fase 4).
 *
 * Subcoleção GLOBAL do user: `users/{uid}/adopter_profile/main`.
 * O perfil pertence ao adotante — não ao abrigo. Abrigos só veem se o
 * adotante marcou `is_public_to_shelters=true`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 4
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp, deleteField } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { validateCpfServer } from '@/core/services/cpfValidationService';
import {
  createAdopterProfileSchema,
  updateAdopterProfileSchema,
  computeProfileCompleteness,
  getMissingFields,
} from '@/modules/shelter/domain/operational/adopterProfile';

const USERS_COLLECTION = 'users';
const PROFILE_DOC = 'main';   // subdoc path: users/{uid}/adopter_profile/main

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Lê o perfil do adotante. Retorna null se não existir.
 */
export async function getAdopterProfile(uid) {
  if (!db || !uid) return null;
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid, 'adopter_profile', PROFILE_DOC));
  if (!snap.exists()) return null;
  return { id: snap.id, user_uid: uid, ...snap.data() };
}

// ─── Create ─────────────────────────────────────────────────────────────

/**
 * Cria o perfil pela primeira vez. Falha se já existe.
 *
 * @param {object} input - {user_uid, full_name, ...campos opcionais}
 * @param {object} actor - {uid, displayName}
 */
export async function createAdopterProfile(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (input.user_uid && input.user_uid !== actor.uid) {
    throw new Error('user_uid deve bater com actor.uid');
  }

  // TASK-321: server-side CPF digit validation (fonte da verdade)
  if (input.cpf) {
    const cpfResult = await validateCpfServer(input.cpf);
    if (!cpfResult.valid) {
      throw new Error(`CPF inválido: ${cpfResult.reason}`);
    }
  }

  const parsed = createAdopterProfileSchema.parse(input);
  const ref = doc(db, USERS_COLLECTION, actor.uid, 'adopter_profile', PROFILE_DOC);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('Perfil já existe. Use updateAdopterProfile para modificar.');
  }

  const full = { ...parsed, user_uid: actor.uid };
  const completeness = computeProfileCompleteness(full);

  await setDoc(ref, {
    ...full,
    profile_completeness: completeness,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'adopter_profile_created',
    actor,
    details: { user_uid: actor.uid, completeness },
  }).catch((err) => {
    logger.warn('adopterProfileService.createAdopterProfile', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return { id: PROFILE_DOC, user_uid: actor.uid, completeness };
}

// ─── Update ─────────────────────────────────────────────────────────────

/**
 * Atualiza campos do perfil. Recalcula `profile_completeness`.
 *
 * Suporta "limpar" um campo passando `null` — usa `deleteField()` para
 * remover do Firestore.
 */
export async function updateAdopterProfile(updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  // Detecta nulls ANTES do Zod parse (Zod não aceita null em campos
  // string). Mantemos em `nullFields` e removemos de updates.
  const nullFields = [];
  const updatesForParse = {};
  for (const [k, v] of Object.entries(updates || {})) {
    if (v === null) nullFields.push(k);
    else updatesForParse[k] = v;
  }

  // TASK-321: server-side CPF digit validation (fonte da verdade)
  if (updatesForParse.cpf) {
    const cpfResult = await validateCpfServer(updatesForParse.cpf);
    if (!cpfResult.valid) {
      throw new Error(`CPF inválido: ${cpfResult.reason}`);
    }
  }

  const parsed = updateAdopterProfileSchema.parse(updatesForParse);
  if (Object.keys(parsed).length === 0 && nullFields.length === 0) {
    return { changed_fields: [], noop: true };
  }

  const ref = doc(db, USERS_COLLECTION, actor.uid, 'adopter_profile', PROFILE_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Perfil não existe. Crie primeiro com createAdopterProfile.');
  }
  const current = snap.data() || {};

  // Detecta deltas
  const delta = {};
  // 1) Campos null explicitamente -> deleteField
  for (const k of nullFields) {
    if (current[k] !== undefined) {
      delta[k] = deleteField();
    }
  }
  // 2) Campos com valor -> comparar com atual
  for (const [k, v] of Object.entries(parsed)) {
    if (!deepEqual(current[k] ?? null, v)) {
      delta[k] = v;
    }
  }
  if (Object.keys(delta).length === 0) {
    return { changed_fields: [], noop: true };
  }

  // Recalcula completude após aplicar delta
  const projected = { ...current };
  for (const [k, v] of Object.entries(delta)) {
    if (v === deleteField()) {
      delete projected[k];
    } else {
      projected[k] = v;
    }
  }
  const completeness = computeProfileCompleteness(projected);

  await updateDoc(ref, {
    ...delta,
    profile_completeness: completeness,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'adopter_profile_updated',
    actor,
    details: {
      user_uid: actor.uid,
      changed_fields: Object.keys(delta).filter((k) => delta[k] !== deleteField()),
      completeness,
    },
  }).catch((err) => {
    logger.warn('adopterProfileService.updateAdopterProfile', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return {
    changed_fields: Object.keys(delta).filter((k) => delta[k] !== deleteField()),
    completeness,
    missing: getMissingFields(projected),
  };
}

/**
 * Versão "soft" para o abrigo marcar o consentimento de uso de dados.
 * (O abrigo não edita o perfil; o adotante aceita via este endpoint.)
 */
export async function recordConsent(consentType, granted, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!consentType) throw new Error('consentType é obrigatório');

  const ref = doc(db, USERS_COLLECTION, actor.uid, 'adopter_profile', PROFILE_DOC);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('Perfil não existe.');
  }
  const current = snap.data() || {};
  const consents = current.consents || [];
  const idx = consents.findIndex((c) => c.type === consentType);
  const newConsent = {
    type: consentType,
    granted,
    granted_at: new Date().toISOString(),
  };
  if (idx >= 0) {
    consents[idx] = newConsent;
  } else {
    consents.push(newConsent);
  }

  await updateDoc(ref, {
    consents,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'adopter_consent_recorded',
    actor,
    details: { consent_type: consentType, granted },
  }).catch(() => {});

  return { type: consentType, granted };
}

// ─── Helpers ────────────────────────────────────────────────────────────

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
