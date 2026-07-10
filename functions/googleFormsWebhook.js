/**
 * @fileoverview Cloud Function helper: Google Forms webhook.
 *
 * Recebe payload do Google Apps Script, valida, e cria application no
 * `clubs/{clubId}/adoption_workflow/`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 5
 */

const { FieldValue } = require('firebase-admin/firestore');

/**
 * Encontra a config do abrigo pelo form_id.
 * Como é uma subcoleção, fazemos query: collectionGroup
 * `integrations/google_forms` filtrando por form_id.
 * Requer índice: (form_id ASC).
 */
async function getGoogleFormsConfigByFormId(db, formId) {
  if (!formId) return null;
  const configsSnap = await db.collectionGroup('integrations')
    .where('form_id', '==', formId)
    .limit(1)
    .get();
  if (configsSnap.empty) return null;
  const doc = configsSnap.docs[0];
  // shelter_club_id é derivado do path: clubs/{clubId}/integrations/google_forms
  const pathSegments = doc.ref.path.split('/');
  const shelterClubId = pathSegments[1];
  return {
    id: doc.id,
    shelter_club_id: shelterClubId,
    ...doc.data(),
  };
}

/**
 * Processa o payload do webhook e cria o application.
 *
 * @param {Firestore} db - Admin SDK
 * @param {object} payload - {form_id, response_id, timestamp, responses, secret, shelter_club_id}
 * @param {object} config - config do abrigo
 * @returns {Promise<{application_id, status}>}
 */
async function processFormsWebhook(db, payload, config) {
  // 1. Extrai pet_id do field_map
  const petFieldName = config.field_map?.pet_id;
  if (!petFieldName) {
    throw new Error('Config sem field_map.pet_id');
  }
  const petId = payload.responses?.[petFieldName];
  if (!petId) {
    throw new Error(`Field "${petFieldName}" não encontrado nas responses`);
  }

  // 2. Converte responses → applicant_form
  const applicantForm = _convertToApplicantForm(payload.responses, config.field_map);

  // 3. Resolve applicant_uid
  const applicantUid = _resolveApplicantUid(applicantForm.email);

  // 4. Cria o application
  const appRef = await db
    .collection('clubs').doc(payload.shelter_club_id)
    .collection('adoption_workflow').add({
      pet_id: petId,
      shelter_club_id: payload.shelter_club_id,
      applicant_uid: applicantUid,
      applicant_form: applicantForm,
      status: 'applied',
      source: 'google_forms',
      google_forms_response_id: payload.response_id,
      google_forms_timestamp: payload.timestamp,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

  // 5. Atualiza métricas da config
  await db.collection('clubs').doc(payload.shelter_club_id)
    .collection('integrations').doc('google_forms')
    .update({
      last_received_at: new Date().toISOString(),
      total_received: FieldValue.increment(1),
    });

  return {
    application_id: appRef.id,
    status: 'applied',
    shelter_club_id: payload.shelter_club_id,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────

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

function _resolveApplicantUid(email) {
  if (!email) {
    throw new Error('Email é obrigatório para identificar o adotante externo.');
  }
  // Determinístico a partir do hash do email (mesmo adotante = mesmo uid)
  const crypto = require('crypto');
  return `gforms_${crypto.createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 28)}`;
}

module.exports = { getGoogleFormsConfigByFormId, processFormsWebhook };
