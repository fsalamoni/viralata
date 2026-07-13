/**
 * @fileoverview codeOfConductService — gerencia aceite de Código de
 * Conduta por user em cada comunidade (TASK-157).
 *
 * Storage: `community_coc_acceptance/{userId}` — doc simples:
 *   {
 *     user_id: string,
 *     accepted_community_ids: string[],  // comunidades onde aceitou
 *     last_accepted_at: ISO 8601,
 *     last_version: string,  // 'v1'
 *   }
 *
 * Idempotência: re-add em array é OK (Firestore aceita duplicatas em
 * array, mas o handler dedup antes de gravar).
 */
import {
  doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { logger } from '@/core/lib/logger';

const COC_VERSION = 'v1';
const COLLECTION = 'community_coc_acceptance';

export function getCodeOfConductVersion() {
  return COC_VERSION;
}

/**
 * Verifica se o user aceitou a versão atual do CoC para a comunidade.
 * @returns {Promise<boolean>}
 */
export async function hasUserAcceptedCoc(userId, communityId) {
  if (!db) return false;
  try {
    const ref = doc(db, COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;
    const data = snap.data();
    return Array.isArray(data.accepted_community_ids)
      && data.accepted_community_ids.includes(communityId)
      && data.last_version === COC_VERSION;
  } catch (err) {
    logger.warn('codeOfConductService.hasUserAcceptedCoc', { err: String(err) });
    return false;
  }
}

/**
 * Registra aceite do CoC. Audit log + LGPD Art. 7º, §1º.
 */
export async function recordCocAcceptance(userId, communityId, actor) {
  if (!db) throw new Error('recordCocAcceptance: db not available');
  if (!userId || !communityId) throw new Error('recordCocAcceptance: userId + communityId required');

  const ref = doc(db, COLLECTION, userId);
  const now = new Date().toISOString();

  try {
    // updateDoc + arrayUnion — idempotente (Firestore dedup)
    await updateDoc(ref, {
      user_id: userId,
      last_accepted_at: now,
      last_version: COC_VERSION,
      accepted_community_ids: arrayUnion(communityId),
    }).catch(async () => {
      // Se o doc não existe, cria
      await setDoc(ref, {
        user_id: userId,
        last_accepted_at: now,
        last_version: COC_VERSION,
        accepted_community_ids: [communityId],
      });
    });

    // Audit log
    await createAuditLog({
      action: 'coc_accepted',
      actor: actor || { uid: userId },
      details: {
        user_id: userId,
        community_id: communityId,
        version: COC_VERSION,
      },
    }).catch(() => {});

    return { ok: true };
  } catch (err) {
    logger.error('codeOfConductService.recordCocAcceptance', { err: String(err) });
    throw err;
  }
}
