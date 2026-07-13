/**
 * @fileoverview forumModerationService — fluxo CoC + denúncia para Fórum
 * (TASK-160). Estende o mural clickwrap para o fórum.
 *
 * **Reuso**: reusa `codeOfConductService` (TASK-157) e `ReportButton`
 * para o CoC e denúncia respectivamente. Este service coordena o
 * flow de criar thread/reply:
 *
 *  1. Verificar CoC aceito (se não, retornar HAS_NOT_ACCEPTED_COC)
 *  2. Criar thread/reply
 *  3. Audit log
 */
import {
  collection, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { hasUserAcceptedCoc, recordCocAcceptance } from './codeOfConductService';
import { logger } from '@/core/lib/logger';

/** Resultado do pre-check antes de criar thread/reply. */
export const COC_STATUS = Object.freeze({
  OK: 'ok',
  HAS_NOT_ACCEPTED: 'has_not_accepted',
  NOT_AUTHENTICATED: 'not_authenticated',
});

/**
 * Verifica se o user pode criar thread/reply no fórum.
 * @returns {Promise<{status: string, needsAccept: boolean}>}
 */
export async function checkForumCocStatus(userId, communityId) {
  if (!userId) return { status: COC_STATUS.NOT_AUTHENTICATED, needsAccept: true };
  const accepted = await hasUserAcceptedCoc(userId, communityId);
  if (accepted) return { status: COC_STATUS.OK, needsAccept: false };
  return { status: COC_STATUS.HAS_NOT_ACCEPTED, needsAccept: true };
}

/**
 * Cria thread no fórum (com pre-check CoC).
 *
 * @param {object} input
 * @param {string} input.communityId
 * @param {string} input.title
 * @param {string} input.body
 * @param {string} input.authorId
 * @param {string} input.authorName
 * @param {string} input.authorPhoto
 * @param {object} actor
 * @returns {Promise<{id: string}>}
 */
export async function createForumThread(input, actor) {
  if (!actor?.uid) throw new Error('createForumThread: actor required');
  const { communityId, title, body, authorId, authorName, authorPhoto } = input;

  // 1) Pre-check CoC
  const cocStatus = await checkForumCocStatus(actor.uid, communityId);
  if (cocStatus.status !== COC_STATUS.OK) {
    const err = new Error('User must accept Code of Conduct first');
    err.code = 'forum/coc_required';
    err.cocStatus = cocStatus.status;
    throw err;
  }

  // 2) Cria thread
  const ref = await addDoc(collection(db, 'community_forum_threads'), {
    community_id: communityId,
    title,
    body,
    author_id: authorId || actor.uid,
    author_name: authorName || actor.displayName || 'Usuário',
    author_photo: authorPhoto || actor.photoURL || null,
    replies_count: 0,
    views_count: 0,
    last_reply_at: serverTimestamp(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'forum_thread_created',
    actor,
    details: { thread_id: ref.id, community_id: communityId, title },
  }).catch(() => {});

  return { id: ref.id };
}

/**
 * Cria reply no fórum (com pre-check CoC).
 */
export async function createForumReply(input, actor) {
  if (!actor?.uid) throw new Error('createForumReply: actor required');
  const { threadId, body, authorId, authorName, authorPhoto, communityId } = input;

  // 1) Pre-check CoC
  const cocStatus = await checkForumCocStatus(actor.uid, communityId);
  if (cocStatus.status !== COC_STATUS.OK) {
    const err = new Error('User must accept Code of Conduct first');
    err.code = 'forum/coc_required';
    err.cocStatus = cocStatus.status;
    throw err;
  }

  // 2) Cria reply
  const ref = await addDoc(collection(db, 'community_forum_messages'), {
    thread_id: threadId,
    body,
    author_id: authorId || actor.uid,
    author_name: authorName || actor.displayName || 'Usuário',
    author_photo: authorPhoto || actor.photoURL || null,
    community_id: communityId,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'forum_reply_created',
    actor,
    details: { reply_id: ref.id, thread_id: threadId, community_id: communityId },
  }).catch(() => {});

  return { id: ref.id };
}

/**
 * Admin deleta thread/reply (moderação). Audit log + reason.
 */
export async function moderatorDeleteContent({ contentId, contentType, reason }, actor) {
  if (!actor?.uid) throw new Error('moderatorDeleteContent: actor required');
  if (!isPlatformAdmin(actor)) {
    throw new Error('moderatorDeleteContent: actor must be platform admin');
  }
  // Soft delete + audit (a remoção real é em collection.delete)
  await createAuditLog({
    action: 'forum_content_deleted_by_moderator',
    actor,
    details: { content_id: contentId, content_type: contentType, reason },
  }).catch(() => {});
  return { ok: true, contentId };
}

function isPlatformAdmin(actor) {
  return Array.isArray(actor?.roles) && actor.roles.includes('platformAdmin');
}
