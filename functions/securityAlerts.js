/**
 * @fileoverview Cloud Function onCall: `triggerSecurityAlert`.
 *
 * Cria um documento em `platform_security_alerts/{alertId}` quando o
 * client sinaliza um evento de segurança. Usado pelo:
 *   - Frontend (após tentativas suspeitas de login / ações bloqueadas
 *     pelo rate limiter / erros de RLS)
 *   - Outras Cloud Functions (quando o rate limiter bloqueia um IP)
 *
 * Apenas `platform_admin` autenticado pode chamar a função
 * (defesa em profundidade — o Firestore rules já bloqueia leitura/
 * escrita direta de outros roles; aqui evitamos criar ruído no banco).
 *
 * Schema do documento (Firestore):
 *   platform_security_alerts/{alertId} = {
 *     type:       'login_suspicious' | 'rules_change' | 'billing_spike'
 *               | 'rate_limit_hit'   | 'rls_denied'   | 'manual',
 *     severity:   'low' | 'medium' | 'high' | 'critical',
 *     source:     'auth' | 'firestore' | 'storage' | 'functions' | 'client',
 *     context:    { ... },    // IP, userId, action, route, etc.
 *     created_at: serverTimestamp(),
 *     created_by: '<uid do caller>',
 *     resolved:   false,
 *     resolved_by: null,
 *     resolved_at: null,
 *     notes:      null,
 *   }
 *
 * A lógica pura (validação, normalização, criação do doc) vive em
 * `securityAlertsCore.js` — testável sem firebase-functions.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 20
 * @see docs/SECURITY_AUDIT.md
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp } = require('firebase-admin/app');
const {
  validateAlertPayload,
  createSecurityAlertRecord,
  ALLOWED_TYPES,
  ALLOWED_SEVERITIES,
  ALLOWED_SOURCES,
} = require('./securityAlertsCore');

if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}
const db = getFirestore();

/**
 * Cloud Function onCall exportada.
 *
 * @param {object} data Payload validado.
 * @param {object} context Contexto Auth do firebase-functions/v2.
 * @returns {Promise<{ alert_id: string }>}
 */
exports.triggerSecurityAlert = onCall(
  { region: 'southamerica-east1' },
  async (data, context) => {
    if (!context.auth || !context.auth.uid) {
      throw new HttpsError('unauthenticated', 'Autenticação obrigatória.');
    }
    // Defesa em profundidade: só platform_admin cria alerta.
    const userSnap = await db.collection('users').doc(context.auth.uid).get();
    const role = userSnap.exists ? userSnap.get('role') : null;
    if (role !== 'platform_admin') {
      throw new HttpsError('permission-denied', 'Apenas platform_admin pode criar alertas.');
    }

    const validation = validateAlertPayload(data);
    if (!validation.ok) {
      throw new HttpsError('invalid-argument', validation.error);
    }

    try {
      const result = await createSecurityAlertRecord({
        callerUid: context.auth.uid,
        alert: validation.value,
        db,
      });
      logger.info('security_alert: created', {
        alert_id: result.alert_id,
        type: validation.value.type,
        severity: validation.value.severity,
        source: validation.value.source,
        caller: context.auth.uid,
      });
      return result;
    } catch (err) {
      logger.error('security_alert: failed to create', { error: String(err) });
      throw new HttpsError('internal', 'Falha ao registrar alerta.');
    }
  },
);

// Re-exports para retro-compatibilidade com testes e callers que
// importem do módulo principal.
module.exports = {
  ...module.exports,
  validateAlertPayload,
  createSecurityAlertRecord,
  ALLOWED_TYPES,
  ALLOWED_SEVERITIES,
  ALLOWED_SOURCES,
};
