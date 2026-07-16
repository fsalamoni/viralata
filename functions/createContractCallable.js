/**
 * @fileoverview createContractCallable — TASK-298.
 *
 * Cloud Function callable v2 que:
 *  1. Extrai IP real do cliente (X-Forwarded-For / CF-Connecting-IP /
 *     request.rawRequest.ip) — Lei 14.063/2020 Art. 6º + LGPD.
 *  2. Recebe o PDF como base64 (sem dependência do Storage client SDK).
 *  3. Faz upload via Admin SDK (Firebase Storage com Admin SDK).
 *  4. Persiste o doc em `clubs/{clubId}/contracts/{contractId}` com
 *     `adopter_ip` + `adopter_user_agent`.
 *  5. Grava audit log `contract_created`.
 *
 * Por que callable em vez de client-side direto?
 *  - Cliente não tem acesso ao IP real (Cloudflare, proxy, CGNAT).
 *  - Garante integridade: PDF + hash + IP + UA ficam no mesmo doc
 *    criado atomicamente pelo servidor.
 *
 * Segurança:
 *  - Callable exige `request.auth` (mesmo gate do Admin SDK).
 *  - Somente o próprio adotante pode criar contrato para si.
 *  - PDF size limit: 10 MB (base64 ~33% maior).
 *
 * @see TASK-298
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const crypto = require('node:crypto');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

/** Max PDF size: 10 MB base64 → ~7.5 MB decoded */
const MAX_PDF_BASE64_BYTES = 10 * 1024 * 1024;

/**
 * Extrai o IP real do cliente a partir do raw request.
 * Prioridade: X-Forwarded-For (proxy) > CF-Connecting-IP (Cloudflare) >
 * x-real-ip (nginx) > request.ip (Express fallback).
 *
 * @param {import('express').Request} rawRequest
 * @returns {string}
 */
function extractClientIp(rawRequest) {
  try {
    const headers = rawRequest.headers || {};

    // Cloudflare: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/
    const cfIp = headers['cf-connecting-ip'] || headers['cf-connecting-ip '.toLowerCase()];
    if (cfIp && typeof cfIp === 'string' && cfIp.trim()) {
      // Cloudflare pode enviar múltiplos IPs separados por vírgula
      return cfIp.split(',')[0].trim();
    }

    // X-Forwarded-For: "client, proxy1, proxy2"
    const xff = headers['x-forwarded-for'];
    if (xff && typeof xff === 'string' && xff.trim()) {
      return xff.split(',')[0].trim();
    }

    // nginx / ingress
    const xRealIp = headers['x-real-ip'];
    if (xRealIp && typeof xRealIp === 'string' && xRealIp.trim()) {
      return xRealIp.trim();
    }

    // Express default (request.ip) — confiável quando há proxy configurado
    if (rawRequest.ip && rawRequest.ip !== '127.0.0.1' && rawRequest.ip !== '::1') {
      return rawRequest.ip;
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Valida o input do callable.
 * @throws HttpsError 'invalid-argument'
 */
function validateInput(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    throw new HttpsError('invalid-argument', 'Payload inválido.');
  }

  if (!data.clubId || typeof data.clubId !== 'string') {
    errors.push('clubId (string) é obrigatório.');
  }
  if (!data.applicationId || typeof data.applicationId !== 'string') {
    errors.push('applicationId (string) é obrigatório.');
  }
  if (!data.petId || typeof data.petId !== 'string') {
    errors.push('petId (string) é obrigatório.');
  }
  if (!data.adopterUid || typeof data.adopterUid !== 'string') {
    errors.push('adopterUid (string) é obrigatório.');
  }
  if (!data.adopterSignatureText || typeof data.adopterSignatureText !== 'string') {
    errors.push('adopterSignatureText (string) é obrigatório.');
  }
  if (!data.documentVersion || typeof data.documentVersion !== 'string') {
    errors.push('documentVersion (string) é obrigatório.');
  }
  if (!data.pdfBase64 || typeof data.pdfBase64 !== 'string') {
    errors.push('pdfBase64 (string) é obrigatório.');
  }

  if (data.adopterSignatureText && (data.adopterSignatureText.length < 3 || data.adopterSignatureText.length > 200)) {
    errors.push('adopterSignatureText deve ter entre 3 e 200 caracteres.');
  }

  // Size guard (base64 ~33% maior que binary)
  if (data.pdfBase64 && data.pdfBase64.length > MAX_PDF_BASE64_BYTES) {
    errors.push(`PDF excede ${MAX_PDF_BASE64_BYTES / (1024 * 1024)} MB.`);
  }

  if (errors.length > 0) {
    throw new HttpsError('invalid-argument', errors.join(' '));
  }
}

/**
 * Computa SHA-256 hex de um Buffer (Node.js built-in crypto).
 * @param {Buffer} buf
 * @returns {string}
 */
function computeSha256Node(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * Constrói contractId determinístico (mesma lógica do client-side).
 * @param {{applicationId: string, adopterUid: string}} input
 * @returns {string}
 */
function buildContractDocId({ applicationId, adopterUid }) {
  return `${applicationId.slice(0, 32)}_${adopterUid.slice(0, 12)}`;
}

/**
 * Constrói storage path (mesma lógica do client-side).
 * @param {{clubId: string, contractId: string}} input
 * @returns {string}
 */
function buildPdfStoragePath({ clubId, contractId }) {
  return `clubs/${clubId}/contracts/${contractId}.pdf`;
}

/**
 * createContractCallable — callable v2.
 *
 * Input:
 *   - clubId, applicationId, petId, adopterUid: string
 *   - adopterSignatureText: string (nome completo digitado)
 *   - documentVersion: string (ex: "adoption-terms-v1")
 *   - pdfBase64: string (PDF em base64)
 *   - adopterUserAgent: string (opcional — navigator.userAgent do cliente)
 *
 * Output:
 *   - { id: string, pdfUrl: string }
 *
 * @throws HttpsError 'unauthenticated' | 'invalid-argument' | 'internal'
 */
exports.createContractCallable = onCall(
  { region: REGION, cors: true, memory: '256MiB', timeoutSeconds: 60 },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Callable requer autenticação.');
    }

    const data = request.data || {};
    validateInput(data);

    const {
      clubId,
      applicationId,
      petId,
      adopterUid,
      adopterSignatureText,
      documentVersion,
      pdfBase64,
      adopterUserAgent = null,
    } = data;

    // Segurança: caller só pode criar contrato para si mesmo
    if (callerUid !== adopterUid) {
      throw new HttpsError(
        'permission-denied',
        'Apenas o próprio adotante pode criar um contrato em seu nome.',
      );
    }

    // Extrai IP real (Lei 14.063/2020 Art. 6º)
    let adopterIp = 'unknown';
    try {
      if (request.rawRequest && typeof request.rawRequest === 'object') {
        adopterIp = extractClientIp(request.rawRequest);
      }
    } catch (err) {
      logger.warn('createContractCallable: extractClientIp falhou', { err: String(err) });
    }

    // Decodifica PDF
    let pdfBuffer;
    try {
      // Remove data URI prefix se presente
      const base64Data = pdfBase64.replace(/^data:application\/pdf;base64,/, '');
      pdfBuffer = Buffer.from(base64Data, 'base64');
    } catch (err) {
      throw new HttpsError('invalid-argument', 'pdfBase64 inválido: falha ao decodificar base64.');
    }

    // Computa hash do PDF (integridade — Lei 14.063/2020)
    const documentHash = computeSha256Node(pdfBuffer);
    const contractId = buildContractDocId({ applicationId, adopterUid });
    const pdfPath = buildPdfStoragePath({ clubId, contractId });

    // Upload PDF via Admin SDK Storage
    let pdfUrl;
    try {
      const bucket = getStorage().bucket();
      const file = bucket.file(pdfPath);
      await file.save(pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          contentDisposition: `inline; filename="contrato_${contractId}.pdf"`,
          metadata: {
            contractId,
            adopterUid,
            clubId,
          },
        },
      });
      // Gera URL signed (válida por 1 ano — suficiente para audit)
      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
      });
      pdfUrl = signedUrl;
    } catch (err) {
      logger.error('createContractCallable: Storage upload failed', {
        err: String(err),
        pdfPath,
        contractId,
      });
      throw new HttpsError('internal', 'Falha ao fazer upload do PDF.');
    }

    // Persiste contrato no Firestore
    const now = new Date().toISOString();
    const contractPayload = {
      application_id: applicationId,
      pet_id: petId,
      adopter_uid: adopterUid,
      adopter_signature_text: adopterSignatureText,
      adopter_signed_at: now,
      adopter_ip: adopterIp,           // TASK-298: IP real capturado no server
      adopter_user_agent: adopterUserAgent, // TASK-298: user-agent do cliente
      shelter_club_id: clubId,
      document_hash: documentHash,
      document_version: documentVersion,
      pdf_storage_path: pdfPath,
      pdf_url: pdfUrl,
      pdf_size_bytes: pdfBuffer.length,
      status: 'pending_shelter_signature',
      created_at: now,
      updated_at: now,
    };

    try {
      const db = getFirestore(DATABASE_ID);
      await db.doc(`clubs/${clubId}/contracts/${contractId}`).set(contractPayload);
    } catch (err) {
      logger.error('createContractCallable: Firestore write failed', {
        err: String(err),
        clubId,
        contractId,
      });
      throw new HttpsError('internal', 'Falha ao salvar o contrato.');
    }

    // Audit log (best-effort — não falha o contrato se der errado)
    try {
      const db = getFirestore(DATABASE_ID);
      await db.collection('audit_logs').add({
        action: 'contract_created',
        actor_uid: callerUid,
        actor_display_name: request.auth.token?.name || null,
        details: {
          contract_id: contractId,
          club_id: clubId,
          application_id: applicationId,
          adopter_uid: adopterUid,
          document_hash: documentHash,
          pdf_size_bytes: pdfBuffer.length,
          adopter_ip: adopterIp,
          adopter_user_agent: adopterUserAgent,
        },
        created_at: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.warn('createContractCallable: audit log falhou (não-bloqueante)', {
        err: String(err),
        contractId,
      });
    }

    logger.info('createContractCallable: contrato criado', {
      contractId,
      clubId,
      adopterUid,
      adopterIp,
    });

    return { id: contractId, pdfUrl };
  },
);
