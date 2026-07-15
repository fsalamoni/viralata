/**
 * @fileoverview contractsService — CRUD de contratos (TASK-288).
 *
 * Coleção: `clubs/{clubId}/contracts/{contractId}`.
 *
 * Fluxo:
 *  1. Adotante assina: `createContract()` → status = PENDING_SHELTER_SIGNATURE
 *  2. Abrigo assina: `shelterSignContract()` → status = FULLY_SIGNED
 *  3. Qualquer parte pode cancelar: `cancelContract()` → CANCELLED
 *
 * PDF é gerado client-side via `pdfGenerator.js` e enviado para Storage
 * `clubs/{clubId}/contracts/{contractId}.pdf`. O hash SHA-256 do PDF
 * é gravado no doc (Lei 14.063/2020 — integridade do documento).
 *
 * Audit log: 'contract_created', 'contract_fully_signed', 'contract_cancelled'.
 */
import {
  doc, collection, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

import { db, storage } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import {
  createContractSchema, parseContractOrThrow, CONTRACT_STATUS,
} from '../schemas/contractSchema';
import {
  computeSha256, buildPdfStoragePath, buildContractDocId,
} from './contractsService.internal';

/**
 * Cria um novo contrato (assinatura do adotante).
 *
 * Preferir `createContractWithIp()` — usa Cloud Function callable que
 * extrai o IP real do cliente (Lei 14.063/2020 Art. 6º + LGPD).
 * Esta função é mantida para backward-compat e para contextos onde
 * o IP já é conhecido server-side.
 *
 * @param {object} input
 * @param {string} input.clubId
 * @param {string} input.applicationId
 * @param {string} input.petId
 * @param {string} input.adopterUid
 * @param {string} input.adopterSignatureText — ex: "Maria da Silva"
 * @param {string} input.documentVersion — ex: "adoption-terms-v1"
 * @param {Blob} input.pdfBlob — PDF gerado client-side
 * @param {string} input.adopterIp — opcional (server-side via Cloud Function)
 * @param {string} input.adopterUserAgent — opcional
 * @param {object} actor — {uid, displayName}
 * @returns {Promise<{id: string, pdfUrl: string}>}
 */
export async function createContract(input, actor) {
  if (!actor?.uid) throw new Error('createContract: actor required');
  const {
    clubId, applicationId, petId, adopterUid, adopterSignatureText,
    documentVersion, pdfBlob, adopterIp = null, adopterUserAgent = null,
  } = input;

  if (!pdfBlob) throw new Error('createContract: pdfBlob required');
  if (!clubId) throw new Error('createContract: clubId required');
  if (!adopterUid) throw new Error('createContract: adopterUid required');

  // 1) Computa hash do PDF (antes de subir — integridade Lei 14.063/2020)
  const documentHash = await computeSha256(pdfBlob);

  // 2) Gera contractId determinístico (applicationId) e storage path
  const contractId = buildContractDocId({ applicationId, adopterUid });
  const pdfPath = buildPdfStoragePath({ clubId, contractId });

  // 3) Upload do PDF
  const sRef = storageRef(storage, pdfPath);
  await uploadBytes(sRef, pdfBlob, { contentType: 'application/pdf' });
  const pdfUrl = await getDownloadURL(sRef);

  // 4) Monta payload
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
    pdf_size_bytes: pdfBlob.size,
    status: CONTRACT_STATUS.PENDING_SHELTER_SIGNATURE,
    created_at: now,
    updated_at: now,
  };

  // 5) Valida
  parseContractOrThrow(payload);

  // 6) Persiste
  const ref = doc(collection(db, 'clubs', clubId, 'contracts'), contractId);
  await setDoc(ref, payload);

  // 7) Audit log
  await createAuditLog({
    action: 'contract_created',
    actor,
    details: {
      contract_id: contractId,
      club_id: clubId,
      application_id: applicationId,
      adopter_uid: adopterUid,
      document_hash: documentHash,
      pdf_size_bytes: pdfBlob.size,
    },
  }).catch(() => {});

  return { id: contractId, pdfUrl };
}

/**
 * Assinatura do abrigo — fecha o contrato (FULLY_SIGNED).
 *
 * @param {object} input
 * @param {string} input.clubId
 * @param {string} input.contractId
 * @param {string} input.representativeUid
 * @param {string} input.representativeName
 * @param {string} input.signatureText
 * @param {object} actor — {uid, displayName}
 */
export async function shelterSignContract(input, actor) {
  if (!actor?.uid) throw new Error('shelterSignContract: actor required');
  const { clubId, contractId, representativeUid, representativeName, signatureText } = input;

  const ref = doc(db, 'clubs', clubId, 'contracts', contractId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('shelterSignContract: contract not found');
  if (snap.data().status !== CONTRACT_STATUS.PENDING_SHELTER_SIGNATURE) {
    throw new Error('shelterSignContract: contract is not pending shelter signature');
  }

  const update = {
    shelter_representative_uid: representativeUid,
    shelter_representative_name: representativeName,
    shelter_signature_text: signatureText,
    shelter_signed_at: new Date().toISOString(),
    status: CONTRACT_STATUS.FULLY_SIGNED,
    updated_at: new Date().toISOString(),
  };

  await setDoc(ref, update, { merge: true });

  await createAuditLog({
    action: 'contract_fully_signed',
    actor,
    details: { contract_id: contractId, club_id: clubId, shelter_representative: representativeName },
  }).catch(() => {});

  return { id: contractId, status: CONTRACT_STATUS.FULLY_SIGNED };
}

/**
 * Lista contratos de um abrigo.
 */
export async function listContractsByClub(clubId, { limit = 50 } = {}) {
  const q = query(
    collection(db, 'clubs', clubId, 'contracts'),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, limit);
}

/**
 * Lista contratos de um adotante (collectionGroup query).
 */
export async function listContractsByAdopter(adopterUid) {
  // Sem índice composto — query por adopter_uid
  const q = query(
    collection(db, 'clubs'), where('__name__', '>=', ''),
  );
  // TODO: collectionGroup real requer índice + helper. Por ora, query manual
  // via shelter_club_id (denormalizado) — o caller já sabe o clubId.
  return [];
}

export { CONTRACT_STATUS };

// ─── TASK-298: callable com IP real ───────────────────────────────────────

/** Converte Blob/File para base64 string.
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // reader.result é "data:application/pdf;base64,..." — mandamos só o base64 puro
      const base64 = reader.result.split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = () => reject(new Error('blobToBase64: FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Cria contrato via Cloud Function callable — EXTRAI IP REAL DO CLIENTE.
 *
 * Fluxo:
 *  1. Converte PDF Blob → base64
 *  2. Chama `createContractCallable` (Cloud Function v2)
 *  3. O callable extrai IP de X-Forwarded-For / CF-Connecting-IP
 *  4. Persiste contrato com `adopter_ip` + `adopter_user_agent`
 *
 * Preferir esta função em vez de `createContract` direto — garante
 * conformidade com Lei 14.063/2020 Art. 6º.
 *
 * @param {object} input
 * @param {string} input.clubId
 * @param {string} input.applicationId
 * @param {string} input.petId
 * @param {string} input.adopterUid
 * @param {string} input.adopterSignatureText
 * @param {string} input.documentVersion
 * @param {Blob} input.pdfBlob
 * @param {string} [input.adopterUserAgent] — navigator.userAgent (opcional; callable tenta extrair)
 * @param {object} actor — {uid}
 * @returns {Promise<{id: string, pdfUrl: string}>}
 */
export async function createContractWithIp(input, actor) {
  if (!actor?.uid) throw new Error('createContractWithIp: actor required');
  const {
    clubId, applicationId, petId, adopterUid, adopterSignatureText,
    documentVersion, pdfBlob, adopterUserAgent,
  } = input;

  if (!pdfBlob) throw new Error('createContractWithIp: pdfBlob required');

  // Lazy import do Firebase Functions para não carregar no SSR
  const { httpsCallable } = await import('firebase/functions');
  const { functions } = await import('@/core/config/firebase');

  const pdfBase64 = await blobToBase64(pdfBlob);

  const fn = httpsCallable(functions, 'createContractCallable');
  const result = await fn({
    clubId,
    applicationId,
    petId,
    adopterUid,
    adopterSignatureText,
    documentVersion,
    pdfBase64,
    adopterUserAgent: adopterUserAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : null),
  });

  return result.data;
}
