/**
 * @fileoverview Lógica pura para `createContract` (TASK-298).
 *
 * Testável sem firebase-functions. Usa Firebase Admin SDK diretamente
 * (firestore + storage) — sem regras do Firestore para esta operação.
 *
 * O Cloud Function wrapper (`createContract.cjs`) é responsável por:
 *   - autenticação
 *   - extração de IP / user-agent
 *   - auditoria
 *
 * Este módulo foca em: validação, upload do PDF, hash SHA-256,
 * escrita do contrato, audit log.
 *
 * @see createContract.cjs
 */

'use strict';

const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const crypto = require('crypto');

const db = getFirestore();
const storage = getStorage();
const BUCKET = process.env.GCLOUD_PROJECT
  ? `${process.env.GCLOUD_PROJECT}.appspot.com`
  : undefined;

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Computa SHA-256 de um Blob/Buffer (Node.js).
 * @param {Buffer|Uint8Array} data
 * @returns {Promise<string>} hex
 */
function computeSha256(data) {
  return crypto.subtle.digest('SHA-256', data).then((buf) => {
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  });
}

/**
 * Normaliza pdfBlob (base64 string ou Uint8Array) para Buffer.
 * @param {string|Uint8Array|number[]} raw
 * @returns {Buffer}
 */
function normalizePdfBlob(raw) {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw instanceof Uint8Array) return Buffer.from(raw);
  if (Array.isArray(raw)) return Buffer.from(raw);
  if (typeof raw === 'string') return Buffer.from(raw, 'base64');
  throw new Error('pdfBlob: esperado base64 string, Uint8Array ou Buffer');
}

/**
 * Gera path determinístico de storage.
 */
function buildPdfStoragePath({ clubId, contractId }) {
  return `clubs/${clubId}/contracts/${contractId}.pdf`;
}

/**
 * Gera ID determinístico do contrato (mesmo input = mesmo output).
 * Base: applicationId_adopterUid
 */
function buildContractDocId({ applicationId, adopterUid }) {
  return `${applicationId}_${adopterUid}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Valida o payload do cliente e retorna { ok, error, input }.
 *
 * Regras:
 * - callerUid deve ser igual a input.adopterUid (defesa em profundidade)
 * - campos obrigatórios presentes
 * - pdfBlob presente e com tamanho razoável (até 20 MB)
 */
function validateCreateContractInput(data, callerUid) {
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'Payload inválido.' };
  }

  const {
    clubId,
    applicationId,
    petId,
    adopterUid,
    adopterSignatureText,
    documentVersion,
    pdfBlob,
  } = data;

  if (!clubId || typeof clubId !== 'string') {
    return { ok: false, error: 'clubId é obrigatório.' };
  }
  if (!applicationId || typeof applicationId !== 'string') {
    return { ok: false, error: 'applicationId é obrigatório.' };
  }
  if (!petId || typeof petId !== 'string') {
    return { ok: false, error: 'petId é obrigatório.' };
  }
  if (!adopterUid || typeof adopterUid !== 'string') {
    return { ok: false, error: 'adopterUid é obrigatório.' };
  }
  if (adopterUid !== callerUid) {
    return {
      ok: false,
      error: 'Apenas o próprio adotante pode criar este contrato.',
    };
  }
  if (!adopterSignatureText || typeof adopterSignatureText !== 'string' || adopterSignatureText.trim().length < 3) {
    return { ok: false, error: 'adopterSignatureText inválido (mín. 3 caracteres).' };
  }
  if (!documentVersion || typeof documentVersion !== 'string') {
    return { ok: false, error: 'documentVersion é obrigatório.' };
  }
  if (!pdfBlob) {
    return { ok: false, error: 'pdfBlob é obrigatório.' };
  }

  // Tamanho máximo 20 MB (base64 = ~27% overhead → 20 MB binário ≈ 27 MB base64)
  let blobSize;
  try {
    const buf = normalizePdfBlob(pdfBlob);
    blobSize = buf.length;
  } catch {
    return { ok: false, error: 'pdfBlob com encoding inválido.' };
  }
  const MAX_BYTES = 20 * 1024 * 1024;
  if (blobSize > MAX_BYTES) {
    return { ok: false, error: 'PDF excede o tamanho máximo de 20 MB.' };
  }
  if (blobSize < 100) {
    return { ok: false, error: 'pdfBlob muito pequeno para ser um PDF válido.' };
  }

  return {
    ok: true,
    input: {
      clubId: String(clubId).trim(),
      applicationId: String(applicationId).trim(),
      petId: String(petId).trim(),
      adopterUid: String(adopterUid).trim(),
      adopterSignatureText: String(adopterSignatureText).trim(),
      documentVersion: String(documentVersion).trim(),
      pdfBlob,
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CORE LOGIC
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Cria o contrato no Firestore e faz upload do PDF ao Storage.
 *
 * @param {object} params
 * @param {{ clubId, applicationId, petId, adopterUid, adopterSignatureText, documentVersion, pdfBlob, adopterIp?, adopterUserAgent? }} params.input
 * @param {{ uid: string, displayName?: string }} params.actor
 * @returns {Promise<{ id: string, pdfUrl: string }>}
 */
async function runCreateContract({ input, actor }) {
  const {
    clubId,
    applicationId,
    petId,
    adopterUid,
    adopterSignatureText,
    documentVersion,
    pdfBlob,
    adopterIp = null,
    adopterUserAgent = null,
  } = input;

  // 1) PDF hash (integridade Lei 14.063/2020)
  const pdfBuffer = normalizePdfBlob(pdfBlob);
  const documentHash = await computeSha256(pdfBuffer);

  // 2) Contract ID determinístico + storage path
  const contractId = buildContractDocId({ applicationId, adopterUid });
  const pdfPath = buildPdfStoragePath({ clubId, contractId });

  // 3) Upload do PDF (Admin SDK — sem regras do Firestore/Storage)
  const bucket = storage.bucket(BUCKET);
  const file = bucket.file(pdfPath);
  await file.save(pdfBuffer, {
    contentType: 'application/pdf',
    metadata: {
      contentDisposition: `attachment; filename="${contractId}.pdf"`,
      customMetadata: {
        contractId,
        adopterUid,
        documentHash,
      },
    },
  });

  // 4) URL pública do PDF
  const [pdfUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '03-01-2030',
  });

  // 5) Monta payload do contrato
  const now = new Date().toISOString();
  const payload = {
    application_id: applicationId,
    pet_id: petId,
    adopter_uid: adopterUid,
    adopter_signature_text: adopterSignatureText,
    adopter_signed_at: now,
    adopter_ip: adopterIp,
    adopter_user_agent: adopterUserAgent,
    shelter_club_id: clubId,
    document_hash: documentHash,
    document_version: documentVersion,
    pdf_storage_path: pdfPath,
    pdf_size_bytes: pdfBuffer.length,
    status: 'pending_shelter_signature',
    created_at: now,
    updated_at: now,
  };

  // 6) Persiste no Firestore
  const contractRef = db.collection('clubs').doc(clubId).collection('contracts').doc(contractId);
  await contractRef.create(payload);

  // 7) Audit log redundante (sem PII nos details — apenas IDs + metadata)
  await db.collection('audit_logs').add({
    action: 'contract_created',
    actor_uid: actor.uid,
    actor_display_name: actor.displayName || null,
    details: {
      contract_id: contractId,
      club_id: clubId,
      application_id: applicationId,
      adopter_uid: adopterUid,
      document_hash: documentHash,
      pdf_size_bytes: pdfBuffer.length,
      adopter_ip: adopterIp || null,   // pode ser null se header não disponível
      adopter_user_agent: adopterUserAgent ? 'presente' : null,
    },
    created_at: now,
    source: 'cloud_function',
    function: 'createContract',
  });

  return { id: contractId, pdfUrl };
}

module.exports = {
  runCreateContract,
  validateCreateContractInput,
  // Expostos para facilitar testes unitários
  computeSha256,
  normalizePdfBlob,
  buildPdfStoragePath,
  buildContractDocId,
};
