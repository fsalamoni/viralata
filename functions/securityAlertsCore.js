/**
 * @fileoverview Núcleo puro de `securityAlerts` (testável sem
 * firebase-functions). Contém apenas validação, normalização e
 * a função `createSecurityAlertRecord` que escreve no Firestore.
 *
 * O Cloud Function onCall real vive em `securityAlerts.js` e
 * importa deste módulo — assim os testes unitários não
 * precisam do runtime do Firebase Functions.
 *
 * @see securityAlerts.js
 * @see firestore.rules (match /platform_security_alerts)
 */

const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const ALLOWED_TYPES = Object.freeze(new Set([
  'login_suspicious',
  'rules_change',
  'billing_spike',
  'rate_limit_hit',
  'rls_denied',
  'manual',
]));

const ALLOWED_SEVERITIES = Object.freeze(new Set(['low', 'medium', 'high', 'critical']));
const ALLOWED_SOURCES = Object.freeze(new Set(['auth', 'firestore', 'storage', 'functions', 'client']));

/**
 * Valida o payload. Retorna `{ ok: true, value }` em caso de sucesso
 * ou `{ ok: false, error }` com mensagem amigável em caso de falha.
 *
 * @param {unknown} data
 */
function validateAlertPayload(data) {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Payload deve ser um objeto.' };
  }
  const payload = /** @type {Record<string, unknown>} */ (data);
  const { type, severity, source, context } = payload;

  if (typeof type !== 'string' || !ALLOWED_TYPES.has(type)) {
    return { ok: false, error: `type inválido. Esperado um de: ${[...ALLOWED_TYPES].join(', ')}.` };
  }
  if (typeof severity !== 'string' || !ALLOWED_SEVERITIES.has(severity)) {
    return { ok: false, error: `severity inválida. Esperado um de: ${[...ALLOWED_SEVERITIES].join(', ')}.` };
  }
  if (source != null && (typeof source !== 'string' || !ALLOWED_SOURCES.has(source))) {
    return { ok: false, error: `source inválido. Esperado um de: ${[...ALLOWED_SOURCES].join(', ')}.` };
  }
  if (context != null && (typeof context !== 'object' || Array.isArray(context))) {
    return { ok: false, error: 'context deve ser objeto (sem arrays no topo).' };
  }

  return {
    ok: true,
    value: {
      type,
      severity,
      source: source || 'client',
      context: context || {},
    },
  };
}

/**
 * Cria o documento no Firestore e retorna o id gerado. Núcleo
 * puro (recebe `db` injetado), usado tanto pela Cloud Function
 * quanto pelos testes.
 *
 * @param {object} params
 * @param {string} params.callerUid   UID do caller autenticado.
 * @param {object} params.alert       Payload validado.
 * @param {import('firebase-admin/firestore').Firestore} [params.db]
 * @param {(label: string) => string} [params.idGenerator] Injetável.
 * @returns {Promise<{ alert_id: string }>}
 */
async function createSecurityAlertRecord({ callerUid, alert, db, idGenerator }) {
  if (!callerUid) throw new Error('callerUid obrigatório');
  const firestore = db || getFirestore();
  const alertsCol = firestore.collection('platform_security_alerts');
  const newId = idGenerator ? idGenerator('sec_alert') : alertsCol.doc().id;

  const ctx = { ...alert.context };
  if (alert.context && alert.context.user_id) {
    ctx.caller_uid = callerUid;
  } else {
    ctx.caller_uid = callerUid;
  }
  const record = {
    type: alert.type,
    severity: alert.severity,
    source: alert.source,
    context: ctx,
    created_at: FieldValue.serverTimestamp(),
    created_by: callerUid,
    resolved: false,
    resolved_by: null,
    resolved_at: null,
    notes: null,
  };
  await alertsCol.doc(newId).set(record);
  return { alert_id: newId };
}

module.exports = {
  ALLOWED_TYPES,
  ALLOWED_SEVERITIES,
  ALLOWED_SOURCES,
  validateAlertPayload,
  createSecurityAlertRecord,
};
