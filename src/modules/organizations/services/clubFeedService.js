/**
 * Serviço do Mural da ONG — posts, likes e comentários.
 *
 * Regras de segurança (firestore.rules):
 *  - Posts: leitura pública; criação exige membership + permissão `feed`
 *    (ou admin).
 *  - Likes (club_post_likes): id = `${postId}_${uid}`; só cria se o post
 *    tiver `allow_likes === true`.
 *  - Comments (club_post_comments): leitura pública; criação exige
 *    `allow_comments === true`.
 *
 * Helpers puros:
 *  - `normalizePostInput` para criar/atualizar posts com `allow_interaction`.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  increment,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { CLUB_COLLECTIONS, POST_INTERACTION, ORG_MURAL_LIMITS } from '../domain/constants.js';
import { normalizePostInput, normalizeCommentInput } from '../domain/validators.js';

const COL = CLUB_COLLECTIONS;

function trimmed(value) {
  return String(value ?? '').trim();
}

function likeId(postId, userId) {
  return `${postId}_${userId}`;
}

/* ============================== Posts ============================== */

export async function listClubPosts(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, COL.posts), where('club_id', '==', clubId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0));
}

export async function getClubPost(postId) {
  if (!db || !postId) return null;
  const snap = await getDoc(doc(db, COL.posts, postId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createClubPost(clubId, input, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizePostInput(input);
  if (!norm.hasContent) throw new Error('Escreva um título, uma mensagem ou anexe uma imagem.');

  const id = doc(collection(db, COL.posts)).id;
  const payload = {
    id,
    club_id: clubId,
    author_id: user.uid,
    author_name: profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Membro',
    author_photo: profile?.photo_url || user.photoURL || '',
    title: norm.title,
    content: norm.content,
    attachments: norm.attachments,
    allow_likes: norm.allow_likes,
    allow_comments: norm.allow_comments,
    allow_interaction: norm.allow_interaction,
    likes_count: 0,
    comments_count: 0,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  };
  await setDoc(doc(db, COL.posts, id), payload);
  await createAuditLog({ action: 'club_post_created', actor: user, details: { club_id: clubId, post_id: id } });
  return id;
}

export async function updateClubPost(postId, input, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const norm = normalizePostInput(input);
  if (!norm.hasContent) throw new Error('Escreva uma mensagem ou anexe uma imagem.');
  const sanitized = {
    title: norm.title,
    content: norm.content,
    attachments: norm.attachments,
    allow_likes: norm.allow_likes,
    allow_comments: norm.allow_comments,
    allow_interaction: norm.allow_interaction,
    updated_at: serverTimestamp(),
    edited: true,
  };
  await updateDoc(doc(db, COL.posts, postId), sanitized);
  await createAuditLog({ action: 'club_post_updated', actor: user, details: { post_id: postId } });
}

export async function deleteClubPost(postId, actor) {
  // Apaga o post. As regras de firestore já impedem apagar um post com
  // curtidas/comentários; este service confere no cliente para mensagem
  // amigável antes do servidor recusar.
  const post = await getClubPost(postId);
  if (post && (post.likes_count > 0 || post.comments_count > 0)) {
    // Backend vai recusar — não há como apagar com interação.
    // Para isso o admin pode usar a flag "force" — mas o MVP exige apagar
    // um a um (curtida/comentário). Mantemos a checagem para mensagem clara.
    throw new Error('Apague primeiro as curtidas e comentários para excluir este post.');
  }
  await deleteDoc(doc(db, COL.posts, postId));
  await createAuditLog({ action: 'club_post_deleted', actor, details: { post_id: postId } });
}

/* ============================== Likes ============================== */

/** Retorna um Set com os IDs dos posts que o usuário curtiu nesta ONG. */
export async function listMyLikedPostIds(clubId, userId) {
  if (!db || !clubId || !userId) return [];
  // Pega todos os likes do user (sem filtro por club) — coleções são
  // particionadas por ONG, então o caller pode ter curtido em qualquer uma.
  const snap = await getDocs(query(collection(db, COL.postLikes), where('user_id', '==', userId)));
  return snap.docs
    .map((d) => d.data().post_id)
    .filter(Boolean);
}

/** Curte / descurte um post (idempotente). Usa transação para manter
 *  `likes_count` consistente. */
export async function toggleClubPostLike(post, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!post) throw new Error('Post inválido.');
  if (!post.allow_likes) throw new Error('Este post não permite curtidas.');

  const likeRef = doc(db, COL.postLikes, likeId(post.id, user.uid));
  const postRef = doc(db, COL.posts, post.id);

  return runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likes_count: increment(-1) });
      return { liked: false };
    }
    tx.set(likeRef, {
      id: likeRef.id,
      post_id: post.id,
      club_id: post.club_id,
      user_id: user.uid,
      created_at: serverTimestamp(),
    });
    tx.update(postRef, { likes_count: increment(1) });
    return { liked: true };
  });
}

/* ============================== Comments ============================== */

export async function listClubPostComments(postId) {
  if (!db || !postId) return [];
  try {
    const snap = await getDocs(
      query(collection(db, COL.postComments), where('post_id', '==', postId), orderBy('created_at_ms', 'asc')),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    logger.info('listClubPostComments: fallback sem orderBy', { postId, err: err?.code });
    const snap = await getDocs(query(collection(db, COL.postComments), where('post_id', '==', postId)));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.created_at_ms || 0) - (b.created_at_ms || 0));
  }
}

export async function addClubPostComment(post, text, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!post?.allow_comments) throw new Error('Este post não permite comentários.');
  const { text: clean } = normalizeCommentInput({ text });
  const ref = doc(collection(db, COL.postComments));
  await setDoc(ref, {
    id: ref.id,
    post_id: post.id,
    club_id: post.club_id,
    author_id: user.uid,
    author_name: profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Membro',
    author_photo: profile?.photo_url || user.photoURL || '',
    text: clean,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  });
  await updateDoc(doc(db, COL.posts, post.id), { comments_count: increment(1) });
  return ref.id;
}

export async function updateClubPostComment(postId, commentId, text, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  const clean = trimmed(text);
  if (!clean) throw new Error('Comentário vazio.');
  await updateDoc(doc(db, COL.postComments, commentId), {
    text: clean.slice(0, ORG_MURAL_LIMITS.COMMENT_MAX),
    edited: true,
    updated_at: serverTimestamp(),
  });
}

export async function deleteClubPostComment(postId, commentId, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  // Apaga o comentário e decrementa o contador do post.
  const postRef = doc(db, COL.posts, postId);
  const cmtRef = doc(db, COL.postComments, commentId);
  await runTransaction(db, async (tx) => {
    const cmt = await tx.get(cmtRef);
    if (!cmt.exists()) return;
    tx.delete(cmtRef);
    tx.update(postRef, { comments_count: increment(-1) });
  });
}
