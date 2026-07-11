/**
 * @fileoverview Serviço: Termos & Aceites Eletrônicos (Fase 19).
 *
 * Subcoleção por usuário: `users/{userId}/terms_acceptances/{acceptanceId}`.
 * Cada aceite é IMUTÁVEL (Firestore rules: update bloqueado). Para
 * aceitar uma nova versão do mesmo termo, basta criar novo doc.
 *
 * Conformidade:
 *  - **Lei 14.063/2020** (assinatura eletrônica avançada):
 *    `document_hash` SHA-256 + `accepted_at` + `ip_address` +
 *    `user_agent` + `signature_text` + `liveness_verified`.
 *  - **LGPD Art. 7º**: `legal_basis` explícito (consentimento ou
 *    execução de contrato).
 *  - **Marco Civil Art. 15**: logs de aceite retidos 6 meses (a
 *    coleta está nesta subcoleção, com `accepted_at` como chave de
 *    retenção).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  TERMS_TYPE,
  recordAcceptanceInputSchema,
  termsAcceptanceSchema,
  assertAcceptanceIsCurrent,
  getCurrentTermsVersion,
  getPendingAcceptances,
  isAcceptanceCurrent,
} from '@/modules/shelter/domain/legal/terms';

const USERS_COLLECTION = 'users';
const SUBCOLLECTION = 'terms_acceptances';

// ─── Read ─────────────────────────────────────────────────────────────

/**
 * Lista todos os aceites de um usuário, ordenados do mais recente
 * para o mais antigo.
 *
 * @param {string} userId
 * @returns {Promise<Array<{id: string, ...payload}>>}
 */
export async function getAcceptances(userId) {
  if (!db || !userId) return [];
  const ref = collection(db, USERS_COLLECTION, userId, SUBCOLLECTION);
  const snap = await getDocs(query(ref, orderBy('accepted_at', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Lista apenas os aceites da versão atual (um doc por tipo).
 * Útil para UI gating.
 *
 * @param {string} userId
 * @returns {Promise<Array<{id: string, terms_type: string, terms_version: string}>>}
 */
export async function getCurrentAcceptances(userId) {
  const all = await getAcceptances(userId);
  return all.filter(isAcceptanceCurrent);
}

/**
 * Verifica se o usuário já aceitou um termo específico na versão
 * indicada. Se `version` não for passada, usa a canônica atual.
 *
 * @param {string} userId
 * @param {string} type - TERMS_TYPE.*
 * @param {string} [version] - default = versão canônica atual
 * @returns {Promise<boolean>}
 */
export async function hasAccepted(userId, type, version) {
  const targetVersion = version || getCurrentTermsVersion(type);
  const all = await getAcceptances(userId);
  return all.some(
    (a) => a.terms_type === type && a.terms_version === targetVersion,
  );
}

/**
 * Retorna os tipos de termo que o usuário AINDA precisa aceitar
 * (considerando a versão atual). Usado pelo modal de onboarding.
 *
 * @param {string} userId
 * @param {string[]} requiredTypes
 * @returns {Promise<string[]>}
 */
export async function getPendingTypes(userId, requiredTypes) {
  const all = await getCurrentAcceptances(userId);
  return getPendingAcceptances(requiredTypes, all);
}

// ─── Create ───────────────────────────────────────────────────────────

/**
 * Registra um novo aceite. Valida o input com Zod, garante que
 * a versão é a atual, computa o `accepted_at` e gera `acceptanceId`
 * com `addDoc` (Firestore gera o id).
 *
 * O hash do documento é computado CLIENT-side e enviado pronto.
 * Em produção, o back-end (Cloud Function) recomputa o hash do
 * documento canônico server-side para validar. Aqui aceitamos o
 * hash do cliente como prova inicial, com `liveness_verified`
 * marcando o nível de segurança (Fase 19.1).
 *
 * @param {string} userId
 * @param {object} input - ver `recordAcceptanceInputSchema`
 * @param {object} actor - {uid, displayName}
 * @returns {Promise<{id: string, ...payload}>}
 */
export async function recordAcceptance(userId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!userId) throw new Error('userId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (userId !== actor.uid) {
    throw new Error('userId deve bater com actor.uid');
  }

  const parsed = recordAcceptanceInputSchema.parse(input);

  // Garante que a versão aceita é a canônica atual
  assertAcceptanceIsCurrent(parsed.terms_type, parsed.terms_version);

  const ref = collection(db, USERS_COLLECTION, actor.uid, SUBCOLLECTION);
  const full = {
    ...parsed,
    user_uid: actor.uid,
    accepted_at: serverTimestamp(),
    legal_basis: parsed.legal_basis || 'consentimento (LGPD Art. 7º I)',
  };

  // Validação final contra o schema canônico
  const validated = termsAcceptanceSchema.parse({
    ...full,
    accepted_at: new Date(), // dummy para validação (serverTimestamp não tem `getTime`)
  });

  const docRef = await addDoc(ref, full);

  await createAuditLog({
    action: 'terms_acceptance_recorded',
    actor,
    details: {
      user_uid: actor.uid,
      terms_type: parsed.terms_type,
      terms_version: parsed.terms_version,
      document_hash: parsed.document_hash,
      liveness_verified: parsed.liveness_verified,
    },
  }).catch((err) => {
    logger.warn('termsAcceptanceService.recordAcceptance', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return {
    id: docRef.id,
    ...validated,
    accepted_at: full.accepted_at, // serverTimestamp (pode ser null em sync)
  };
}

/**
 * Registra múltiplos aceites em batch (mesmo usuário). Útil para
 * o fluxo de signup, em que o usuário marca 3 checkboxes de uma vez.
 *
 * @param {string} userId
 * @param {Array<{terms_type: string, terms_version: string, document_hash: string, signature_text: string}>} items
 * @param {object} actor
 * @param {object} ctx - {user_agent, ip_address, liveness_verified}
 */
export async function recordBulkAcceptances(userId, items, actor, ctx = {}) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const results = [];
  for (const item of items) {
    const res = await recordAcceptance(
      userId,
      {
        ...item,
        user_agent: ctx.user_agent || '',
        ip_address: ctx.ip_address || 'unknown',
        liveness_verified: ctx.liveness_verified ?? false,
        legal_basis: ctx.legal_basis,
      },
      actor,
    );
    results.push(res);
  }
  return results;
}

// ─── Delete (apenas platform_admin via rules) ─────────────────────────

/**
 * Soft-delete NÃO suportado — aceite é prova legal imutável.
 * Apenas `platform_admin` pode remover via console / script.
 *
 * Esta função existe para que regras/testes tenham um único ponto
 * de chamada, mas em runtime sempre lança.
 */
export async function deleteAcceptance(userId, acceptanceId, actor) {
  if (!actor || actor.role !== 'platform_admin') {
    throw new Error('Apenas platform_admin pode remover aceite (imutável).');
  }
  // A operação real é feita via Admin SDK no Firestore; aqui só
  // retornamos a referência para uso do script admin.
  return {
    ref: doc(db, USERS_COLLECTION, userId, SUBCOLLECTION, acceptanceId),
    warning: 'Aceite é imutável. Remoção apenas via Admin SDK.',
  };
}

// ─── Re-exports convenientes ──────────────────────────────────────────

export { TERMS_TYPE, getCurrentTermsVersion } from '@/modules/shelter/domain/legal/terms';
