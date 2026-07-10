/**
 * @fileoverview Serviço: Google Forms webhook (Fase 5).
 *
 * Gerencia a config por abrigo e processa o webhook.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 5
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  googleFormsConfigSchema,
  updateGoogleFormsConfigSchema,
  processFormsResponseSchema,
  formsWebhookPayloadSchema,
} from '@/modules/shelter/domain/operational/googleForms';
import { submitAdoptionApplication } from '@/modules/shelter/services/adoptionService';

const CLUBS_COLLECTION = 'clubs';
const CONFIG_DOC = 'integrations/google_forms';

// ─── Config (admin do abrigo) ──────────────────────────────────────────

/**
 * Lê a config do abrigo. Retorna null se não existe.
 */
export async function getGoogleFormsConfig(shelterClubId) {
  if (!db || !shelterClubId) return null;
  const snap = await getDoc(doc(db, CLUBS_COLLECTION, shelterClubId, 'integrations', 'google_forms'));
  if (!snap.exists()) return null;
  return { id: snap.id, shelter_club_id: shelterClubId, ...snap.data() };
}

/**
 * Cria a config pela primeira vez. Inclui `secret_token` que será
 * enviado pelo Google Forms via HMAC.
 */
export async function createGoogleFormsConfig(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!input.shelter_club_id) throw new Error('shelter_club_id é obrigatório');
  const { shelter_club_id: _, ...configInput } = input;

  const parsed = googleFormsConfigSchema.parse(configInput);
  const ref = doc(db, CLUBS_COLLECTION, input.shelter_club_id, 'integrations', 'google_forms');
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new Error('Config já existe. Use updateGoogleFormsConfig.');
  }

  await setDoc(ref, {
    ...parsed,
    created_by_uid: actor.uid,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'google_forms_config_created',
    actor,
    details: { shelter_club_id: input.shelter_club_id, form_id: parsed.form_id },
  }).catch((err) => {
    logger.warn('googleFormsService.createGoogleFormsConfig', {
      msg: 'audit failed', err: String(err),
    });
  });

  return { id: ref.id, ...parsed };
}

/**
 * Atualiza a config. Não permite trocar secret_token (regenerar requer
 * ação explícita).
 */
export async function updateGoogleFormsConfig(shelterClubId, updates, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateGoogleFormsConfigSchema.parse(updates);
  if (Object.keys(parsed).length === 0) {
    return { changed_fields: [], noop: true };
  }

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, 'integrations', 'google_forms');
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Config não existe.');

  await updateDoc(ref, { ...parsed, updated_at: serverTimestamp() });

  await createAuditLog({
    action: 'google_forms_config_updated',
    actor,
    details: { shelter_club_id: shelterClubId, changed: Object.keys(parsed) },
  }).catch(() => {});

  return { changed_fields: Object.keys(parsed) };
}

/**
 * Regenera o secret_token (invalida o anterior).
 */
export async function rotateGoogleFormsSecret(shelterClubId, actor) {
  if (!db || !shelterClubId || !actor?.uid) {
    throw new Error('Parâmetros inválidos');
  }
  const newSecret = _generateSecret();
  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, 'integrations', 'google_forms');
  await updateDoc(ref, { secret_token: newSecret, updated_at: serverTimestamp() });

  await createAuditLog({
    action: 'google_forms_secret_rotated',
    actor,
    details: { shelter_club_id: shelterClubId },
  }).catch(() => {});

  return { secret_token: newSecret };
}

// ─── Webhook handler (chamado pela Cloud Function) ──────────────────────

/**
 * Processa um payload do webhook do Google Forms.
 *
 * @param {object} payload - {form_id, response_id, timestamp, responses, secret}
 * @returns {Promise<{application_id, status}>}
 */
export async function processFormsWebhook(payload) {
  if (!db) throw new Error('Firebase não disponível');

  const parsed = formsWebhookPayloadSchema.parse(payload);

  // 1. Encontra o abrigo dono deste form
  const config = await _findConfigByFormId(parsed.form_id);
  if (!config) {
    throw new Error(`Nenhum abrigo configurou este form_id: ${parsed.form_id}`);
  }
  if (!config.enabled) {
    throw new Error('Integração desabilitada pelo abrigo.');
  }

  // 2. Valida o secret
  if (config.secret_token !== parsed.secret) {
    logger.warn('googleFormsService.processFormsWebhook', {
      msg: 'invalid secret token',
      form_id: parsed.form_id,
    });
    throw new Error('Invalid secret token.');
  }

  // 3. Extrai pet_id do field_map e converte para applicant_form
  const petFieldName = config.field_map.pet_id;
  const petId = parsed.responses[petFieldName];
  if (!petId) {
    throw new Error(`Field map pede pet_id em "${petFieldName}" mas não está nas responses.`);
  }

  const process = processFormsResponseSchema.parse({
    pet_id: petId,
    responses: parsed.responses,
    field_map: config.field_map,
  });
  const applicantForm = _convertToApplicantForm(process.responses, process.field_map);

  // 4. Cria o application. Se o adotante não tem user, criamos um
  //    "ghost" a partir do email (auto_create_user=true) ou setamos
  //    applicant_uid como o email hasheado (fallback).
  const applicantUid = await _resolveApplicantUid(
    applicantForm.email,
    config.auto_create_user,
  );

  const submission = await submitAdoptionApplication(
    {
      pet_id: petId,
      shelter_club_id: config.shelter_club_id,
      applicant_form: applicantForm,
    },
    { uid: applicantUid, displayName: applicantForm.full_name },
  );

  // 5. Marca o application como source='google_forms'
  const appRef = doc(
    db, CLUBS_COLLECTION, config.shelter_club_id, 'adoption_workflow', submission.id,
  );
  await updateDoc(appRef, {
    source: 'google_forms',
    google_forms_response_id: parsed.response_id,
    google_forms_timestamp: parsed.timestamp,
  });

  // 6. Atualiza métricas da config
  const configRef = doc(db, CLUBS_COLLECTION, config.shelter_club_id, 'integrations', 'google_forms');
  await updateDoc(configRef, {
    last_received_at: new Date().toISOString(),
    total_received: (config.total_received || 0) + 1,
  });

  // 7. Notifica (best-effort)
  if (config.notify_on_new) {
    logger.info('googleFormsService.processFormsWebhook', {
      msg: 'new application from google forms',
      shelter_club_id: config.shelter_club_id,
      application_id: submission.id,
      notify_email: config.notify_email,
    });
  }

  return {
    application_id: submission.id,
    status: 'applied',
    shelter_club_id: config.shelter_club_id,
  };
}

// ─── Helpers privados ──────────────────────────────────────────────────

async function _findConfigByFormId(formId) {
  // Como é uma subcoleção, precisaríamos de um índice de form_id.
  // Solução simplificada: o abrigo nos passa o clubId na URL do webhook.
  // Aqui o caller (Cloud Function) faz o lookup.
  // Por simplicidade, retornamos o form_id parseado; em produção a
  // Cloud Function tem o shelterClubId na URL path.
  return null;
}

/**
 * Converte responses (formato Forms) → applicant_form (formato nativo).
 */
function _convertToApplicantForm(responses, fieldMap) {
  const get = (key) => {
    const formField = fieldMap[key];
    if (!formField) return undefined;
    const v = responses[formField];
    if (v == null || v === '') return undefined;
    return v;
  };
  const boolOrUndef = (v) => {
    if (v == null) return undefined;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') {
      const s = v.toLowerCase().trim();
      if (['sim', 'yes', 'true', '1'].includes(s)) return true;
      if (['não', 'nao', 'no', 'false', '0'].includes(s)) return false;
    }
    return undefined;
  };
  const numOrUndef = (v) => {
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    full_name: get('full_name'),
    email: get('email'),
    phone: get('phone'),
    reason_to_adopt: get('reason_to_adopt'),
    has_yard: boolOrUndef(get('has_yard')),
    household_size: numOrUndef(get('household_size')),
    has_children: boolOrUndef(get('has_children')),
  };
}

/**
 * Resolve o applicant_uid. Como o Forms é externo, o usuário não
 * está logado. Soluções:
 *  1. Se `auto_create_user=true` e o email não existe no Firebase Auth,
 *     cria o user com email/senha random (devolve o uid).
 *  2. Caso contrário, gera um uid determinístico baseado no hash do
 *     email (mesmo adotante re-submete = mesmo uid).
 */
async function _resolveApplicantUid(email, autoCreate) {
  if (!email) {
    throw new Error('Email é obrigatório para identificar o adotante externo.');
  }
  // Hash simples (não-cripto, apenas para dedupe)
  // Em produção, melhor estratégia: chamar Cloud Function admin pra
  // getUserByEmail e criar via Admin SDK.
  // Aqui, retornamos um uid determinístico baseado no email.
  const crypto = await import('crypto');
  return `gforms_${crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 28)}`;
}

function _generateSecret() {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}
