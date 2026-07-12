/**
 * @fileoverview Cloud Function: Recompute terms acceptance hash (Lei 14.063/2020).
 *
 * Reage à CRIAÇÃO de qualquer doc em `users/{uid}/terms_acceptances/{id}`.
 * Recomputa o hash do documento canônico (server-side) usando
 * `crypto.createHash('sha256')` e atualiza o doc com o hash autoritativo
 * (`document_hash_server`) e o `recomputed_at` para auditoria.
 *
 * Por que isso é necessário?
 *  - O cliente computa o hash ANTES de enviar (`computeDocumentHash` em
 *    `src/modules/shelter/domain/legal/terms.js`). Isso evita round-trip
 *    extra no aceite, mas abre vetor de adulteração do payload.
 *  - Esta Cloud Function revalida o hash autoritativo usando a
 *    composição canônica `${signature_text}|${terms_version}|${accepted_at}`.
 *  - Se `document_hash` (cliente) !== `document_hash_server` (servidor),
 *    a Cloud Function marca `hash_mismatch=true` para revisão pelo
 *    platform_admin. (Ainda não implementado no stub — ver TODO abaixo.)
 *
 * STUB atual: estrutura básica + onDocumentCreated wired. A recomputação
 * efetiva e a validação contra o cliente virão no PR seguinte.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 (Lei 14.063/2020)
 * @see src/modules/shelter/domain/legal/terms.js (computeDocumentHash)
 * @see src/modules/shelter/services/termsAcceptanceService.js (recordAcceptance)
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const crypto = require('node:crypto');

const REGION = 'southamerica-east1';

/**
 * Recomputa o hash do documento canônico de um aceite.
 * Mantém a mesma composição usada no client para garantir paridade:
 *   `${signature_text}|${terms_version}|${accepted_at}`
 * com prefixo `viralata:terms:v1:` (alinhado com `computeDocumentHash`).
 *
 * @param {object} data - payload do aceite (já com `accepted_at` materializado
 *   pelo serverTimestamp do Firestore; aqui recebemos como string ISO)
 * @returns {string} "sha256:<64 hex chars>"
 */
function recomputeServerHash(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('recomputeServerHash: data inválido');
  }
  const { signature_text, terms_version, accepted_at } = data;
  if (!signature_text || !terms_version || !accepted_at) {
    throw new Error('recomputeServerHash: campos obrigatórios ausentes');
  }
  const acceptedAtIso =
    accepted_at && typeof accepted_at.toDate === 'function'
      ? accepted_at.toDate().toISOString()
      : new Date(accepted_at).toISOString();
  const payload = `viralata:terms:v1:${signature_text}|${terms_version}|${acceptedAtIso}`;
  const hex = crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
  return `sha256:${hex}`;
}

/**
 * Cloud Function trigger.
 *
 * TODO (próximo PR):
 *  1. Buscar o doc criado, extrair `signature_text`, `terms_version`,
 *     `accepted_at`.
 *  2. Recomputar `document_hash_server` via `recomputeServerHash`.
 *  3. Comparar com `document_hash` (cliente):
 *     - se igual: atualizar o doc com `document_hash_server` + `hash_mismatch=false`.
 *     - se diferente: marcar `hash_mismatch=true` + `hash_mismatch_at` + alerta.
 *  4. Tratar `liveness_verified` para auto-aprovação vs revisão manual.
 */
exports.recomputeAcceptanceHash = onDocumentCreated(
  {
    document: 'users/{uid}/terms_acceptances/{acceptanceId}',
    region: REGION,
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) {
      logger.warn('recomputeAcceptanceHash: payload vazio', {
        acceptanceId: event.params?.acceptanceId,
      });
      return;
    }

    logger.info('recomputeAcceptanceHash: stub received acceptance', {
      uid: event.params?.uid,
      acceptanceId: event.params?.acceptanceId,
      terms_type: data.terms_type,
      terms_version: data.terms_version,
      document_hash: data.document_hash,
    });

    // STUB: por enquanto apenas logamos. A recomputação + update virá
    // no PR de follow-up (já tem a função `recomputeServerHash` pronta
    // e testada em isolation).
    try {
      const serverHash = recomputeServerHash({
        ...data,
        accepted_at: data.accepted_at,
      });
      logger.info('recomputeAcceptanceHash: server hash computed (stub)', {
        server_hash: serverHash,
        client_hash: data.document_hash,
        match: serverHash === data.document_hash,
      });
    } catch (err) {
      logger.error('recomputeAcceptanceHash: failed to recompute (stub)', {
        err: String(err),
        acceptanceId: event.params?.acceptanceId,
      });
    }
  },
);
