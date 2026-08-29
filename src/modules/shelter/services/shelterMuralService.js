/**
 * Serviço do Mural V2 do abrigo (ROADMAP · Fase 4 · SHELTER_MURAL_V2).
 *
 * Escreve nos MESMOS documentos `club_posts` do mural atual, apenas com campos
 * ADITIVOS (`status`, `scheduled_for`, `pinned`, `pinned_at`, `tags`,
 * `mentions`, `moderation.hidden_comment_ids`). Nenhuma coleção nova é criada
 * e nenhuma regra do Firestore precisa mudar: o caminho de update de posts já
 * permite que owner/admin ou quem tem a permissão `feed` grave campos extras
 * (não há `hasOnly()` nesse ramo). Com a flag OFF este serviço não é chamado.
 *
 * As checagens de permissão são feitas na UI e reforçadas pelas regras do
 * Firestore no servidor. Aqui garantimos apenas payload saneado e trilha de
 * auditoria.
 */

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { CLUB_COLLECTIONS } from '@/modules/organizations/domain/constants';
import { normalizeMuralPostInput, POST_STATUS } from '@/modules/shelter/domain/engagement/mural';

const COL = CLUB_COLLECTIONS;

function authorFields(user, profile) {
  return {
    author_id: user.uid,
    author_name:
      profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Membro',
    author_photo: profile?.photo_url || user.photoURL || '',
  };
}

/** Campos avançados (aditivos) derivados do input normalizado. */
function advancedFields(norm, now) {
  return {
    status: norm.status,
    scheduled_for: norm.scheduled_for ?? null,
    tags: norm.tags,
    mentions: norm.mentions,
    pinned: norm.pinned,
    ...(norm.pinned ? { pinned_at: now } : {}),
  };
}

/* ============================== Criação / edição ============================== */

export async function createMuralPost(clubId, input, user, profile, now = Date.now()) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizeMuralPostInput(input, now);
  if (!norm.hasContent) throw new Error('Escreva um título, uma mensagem ou anexe uma imagem.');

  const id = doc(collection(db, COL.posts)).id;
  const payload = {
    id,
    club_id: clubId,
    ...authorFields(user, profile),
    title: norm.title,
    content: norm.content,
    attachments: norm.attachments,
    allow_likes: norm.allow_likes,
    allow_comments: norm.allow_comments,
    allow_interaction: norm.allow_interaction,
    likes_count: 0,
    comments_count: 0,
    ...advancedFields(norm, now),
    created_at_ms: now,
    created_at: serverTimestamp(),
  };
  await setDoc(doc(db, COL.posts, id), payload);
  await createAuditLog({
    action: 'club_mural_post_created',
    actor: user,
    details: { club_id: clubId, post_id: id, status: norm.status, scheduled: !!norm.scheduled_for },
  });
  return id;
}

export async function updateMuralPost(postId, input, user, now = Date.now()) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizeMuralPostInput(input, now);
  if (!norm.hasContent) throw new Error('Escreva uma mensagem ou anexe uma imagem.');
  const sanitized = {
    title: norm.title,
    content: norm.content,
    attachments: norm.attachments,
    allow_likes: norm.allow_likes,
    allow_comments: norm.allow_comments,
    allow_interaction: norm.allow_interaction,
    ...advancedFields(norm, now),
    updated_at: serverTimestamp(),
    edited: true,
  };
  await updateDoc(doc(db, COL.posts, postId), sanitized);
  await createAuditLog({
    action: 'club_mural_post_updated',
    actor: user,
    details: { post_id: postId, status: norm.status },
  });
}

/* ============================== Fixar / arquivar / publicar ============================== */

export async function setPostPinned(postId, pinned, actor, now = Date.now()) {
  if (!actor?.uid) throw new Error('Usuário não autenticado.');
  await updateDoc(doc(db, COL.posts, postId), {
    pinned: !!pinned,
    ...(pinned ? { pinned_at: now } : { pinned_at: null }),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: pinned ? 'club_mural_post_pinned' : 'club_mural_post_unpinned',
    actor,
    details: { post_id: postId },
  });
}

/**
 * Muda o `status` de um post. Ao publicar (a partir de rascunho/agendado)
 * limpa `scheduled_for`. Usado por arquivar/desarquivar/publicar.
 */
export async function setPostStatus(postId, status, actor) {
  if (!actor?.uid) throw new Error('Usuário não autenticado.');
  if (!Object.values(POST_STATUS).includes(status)) throw new Error('Status inválido.');
  const patch = { status, updated_at: serverTimestamp() };
  if (status === POST_STATUS.PUBLISHED) patch.scheduled_for = null;
  await updateDoc(doc(db, COL.posts, postId), patch);
  await createAuditLog({
    action: 'club_mural_post_status_changed',
    actor,
    details: { post_id: postId, status },
  });
}

export function archivePost(postId, actor) {
  return setPostStatus(postId, POST_STATUS.ARCHIVED, actor);
}

export function publishPost(postId, actor) {
  return setPostStatus(postId, POST_STATUS.PUBLISHED, actor);
}

/* ============================== Moderação de comentários ============================== */

export async function hideComment(postId, commentId, actor) {
  if (!actor?.uid) throw new Error('Usuário não autenticado.');
  if (!commentId) throw new Error('Comentário inválido.');
  await updateDoc(doc(db, COL.posts, postId), {
    'moderation.hidden_comment_ids': arrayUnion(commentId),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'club_mural_comment_hidden',
    actor,
    details: { post_id: postId, comment_id: commentId },
  });
}

export async function unhideComment(postId, commentId, actor) {
  if (!actor?.uid) throw new Error('Usuário não autenticado.');
  if (!commentId) throw new Error('Comentário inválido.');
  await updateDoc(doc(db, COL.posts, postId), {
    'moderation.hidden_comment_ids': arrayRemove(commentId),
    updated_at: serverTimestamp(),
  });
  await createAuditLog({
    action: 'club_mural_comment_unhidden',
    actor,
    details: { post_id: postId, comment_id: commentId },
  });
}

/** Lê um post (helper para revalidação otimista quando necessário). */
export async function getMuralPost(postId) {
  if (!db || !postId) return null;
  const snap = await getDoc(doc(db, COL.posts, postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
