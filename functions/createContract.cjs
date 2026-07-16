/**
 * @fileoverview Cloud Function onCall: `createContract` (TASK-298).
 *
 * Rota segura para a criação de contratos de adoção:
 * - Valida que o caller é o próprio adotante (defesa em profundidade)
 * - Extrai `__CF_CONNECTING_IP` (Cloudflare) ou `x-forwarded-for` como IP do assinante
 * - Extrai `user-agent` do header da requisição
 * - Persiste `adopter_ip` + `adopter_user_agent` no contrato (Lei 14.063/2020 art. 6º)
 * - Faz upload do PDF ao Storage via Admin SDK (criptografia at-rest default GCS)
 * - Grava audit_log redundante com idempotência
 *
 * A lógica pura (validação, upload, write) vive em `createContractCore.cjs` —
 * testável sem `firebase-functions`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22 / TASK-298
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const {
  runCreateContract,
  validateCreateContractInput,
} = require('./createContractCore.cjs');

if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}

/** Extrai IP real do cliente a partir dos headers da requisição. */
function extractClientIp(request) {
  // Cloudflare: `__CF_CONNECTING_IP` é o IP real do visitante,
  // preenchido pelo proxy antes de chegar ao origin.
  if (request.rawRequest?.headers?.['cf-connecting-ip']) {
    return String(request.rawRequest.headers['cf-connecting-ip']).split(',')[0].trim();
  }
  // Fallback genérico (Vercel, load balancer, etc.)
  const forwarded = request.rawRequest?.headers?.['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return null;
}

/** Extrai user-agent do header da requisição. */
function extractUserAgent(request) {
  const ua = request.rawRequest?.headers?.['user-agent'];
  return ua ? String(ua).slice(0, 500) : null;
}

/**
 * Cloud Function callable exportada.
 *
 * @param {object} data - payload do cliente
 * @param {object} request - contexto firebase-functions/v2
 * @returns {Promise<{ id: string, pdfUrl: string }>}
 */
exports.createContract = onCall(
  { region: 'southamerica-east1', cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;

    // ── Autenticação ────────────────────────────────────────────────
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Autenticação obrigatória.');
    }

    // ── Validação de input ──────────────────────────────────────────
    const inputValidation = validateCreateContractInput(request.data, callerUid);
    if (!inputValidation.ok) {
      throw new HttpsError('invalid-argument', inputValidation.error);
    }

    const { input } = inputValidation;

    // ── IP + user-agent (Lei 14.063/2020 art. 6º) ─────────────────
    const adopterIp = extractClientIp(request);
    const adopterUserAgent = extractUserAgent(request);

    // ── Auditoria ───────────────────────────────────────────────────
    logger.info('createContract: invoked', {
      callerUid,
      adopterIp,
      adopterUserAgent: adopterUserAgent ? adopterUserAgent.slice(0, 80) + '…' : null,
      applicationId: input.applicationId,
      clubId: input.clubId,
    });

    // ── Execução (Admin SDK) ────────────────────────────────────────
    try {
      const result = await runCreateContract({
        input: {
          ...input,
          adopterIp,
          adopterUserAgent,
        },
        actor: {
          uid: callerUid,
          displayName: request.auth?.token?.name || request.auth?.uid,
        },
      });

      logger.info('createContract: success', {
        contractId: result.id,
        callerUid,
        adopterIp,
      });

      return result;
    } catch (err) {
      logger.error('createContract: failed', {
        error: String(err),
        callerUid,
        applicationId: input.applicationId,
      });

      if (err instanceof HttpsError) throw err;
      throw new HttpsError('internal', 'Falha ao criar contrato. Tente novamente.');
    }
  },
);
