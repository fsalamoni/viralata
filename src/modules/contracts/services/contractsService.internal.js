/**
 * @fileoverview Helpers puros para contractsService (TASK-288).
 *
 * Mantidos puros (sem side-effects, sem I/O) para serem testáveis isoladamente.
 */

/**
 * Computa SHA-256 hex de um Blob via Web Crypto API.
 * @param {Blob} blob
 * @returns {Promise<string>} SHA-256 hex (64 chars)
 */
export async function computeSha256(blob) {
  if (blob == null) throw new Error('computeSha256: blob required');
  // Aceita Blob, File, ArrayBuffer, Uint8Array
  let buf;
  if (typeof blob.arrayBuffer === 'function') {
    buf = await blob.arrayBuffer();
  } else if (blob instanceof ArrayBuffer) {
    buf = blob;
  } else if (ArrayBuffer.isView(blob)) {
    buf = blob.buffer;
  } else {
    throw new Error('computeSha256: blob must have arrayBuffer() or be ArrayBuffer/Uint8Array');
  }
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constrói o path do PDF no Storage.
 * @param {{clubId: string, contractId: string}} input
 * @returns {string} ex: "clubs/{clubId}/contracts/{contractId}.pdf"
 */
export function buildPdfStoragePath({ clubId, contractId }) {
  if (!clubId || !contractId) throw new Error('buildPdfStoragePath: clubId + contractId required');
  return `clubs/${clubId}/contracts/${contractId}.pdf`;
}

/**
 * Constrói um contractId determinístico a partir do applicationId + adopterUid.
 * Vantagem: idempotente — re-tentar não duplica.
 * @param {{applicationId: string, adopterUid: string}} input
 * @returns {string}
 */
export function buildContractDocId({ applicationId, adopterUid }) {
  if (!applicationId || !adopterUid) {
    throw new Error('buildContractDocId: applicationId + adopterUid required');
  }
  // Sufixo curto com hash para evitar colisões teóricas
  return `${applicationId.slice(0, 32)}_${adopterUid.slice(0, 12)}`;
}

/**
 * Constrói URL pública do Storage path (helper para testes).
 * @param {string} path
 * @returns {string}
 */
export function buildStorageUrl(path) {
  if (!path) throw new Error('buildStorageUrl: path required');
  return `https://storage.googleapis.com/${path}`;
}
