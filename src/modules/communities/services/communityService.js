import {
  increment,
  runTransaction,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  addDoc,
  updateDoc,
  where,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { COMMUNITY_COLLECTION, COMMUNITY_VISIBILITY, normalizeCommunityVisibility } from '@/modules/communities/domain/constants';
import { sortCommunities } from '@/modules/communities/domain/directory';
import {
  postInputSchema,
  commentInputSchema,
  threadInputSchema,
  threadMessageInputSchema,
  communityEventInputSchema,
  parseOrThrow,
} from '@/modules/communities/domain/schemas';

function trimmed(value) {
  return String(value ?? '').trim();
}

function toPriority(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Mesmo formato do código de convite das organizações (clubService).
function inviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function authorFields(user, profile) {
  return {
    author_id: user.uid,
    author_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
    author_photo: profile?.photo_url || user.photoURL || '',
  };
}

function sanitizeCommunity(data = {}) {
  return {
    name: trimmed(data.name),
    description: trimmed(data.description),
    city: trimmed(data.city),
    state: trimmed(data.state),
    cover_url: trimmed(data.cover_url),
    featured: Boolean(data.featured),
    priority: toPriority(data.priority),
    visibility: normalizeCommunityVisibility(data.visibility),
  };
}

async function updateLinkedClubs(communityId, payload) {
  const clubsSnap = await getDocs(query(collection(db, 'clubs'), where('community_id', '==', communityId)));
  const docs = clubsSnap.docs;
  // Firestore aceita no máximo 500 operações por batch; usamos 450 para manter
  // margem segura caso este fluxo cresça com metadados adicionais.
  const chunkSize = 450;

  for (let start = 0; start < docs.length; start += chunkSize) {
    const batch = writeBatch(db);
    docs.slice(start, start + chunkSize).forEach((item) => {
      batch.update(item.ref, {
        ...payload,
        updated_at: serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return clubsSnap.size;
}

export async function listCommunities({ includeHidden = false } = {}) {
  if (!db) return [];
  const snap = await getDocs(collection(db, COMMUNITY_COLLECTION));
  const communities = snap.docs.map((item) => ({ id: item.id, ...item.data() }));
  const filtered = includeHidden
    ? communities
    : communities.filter((community) => normalizeCommunityVisibility(community.visibility) === COMMUNITY_VISIBILITY.PUBLIC);
  return sortCommunities(filtered);
}

export async function getCommunity(id) {
  if (!db || !id) return null;
  const snap = await getDoc(doc(db, COMMUNITY_COLLECTION, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createCommunity(data, actor) {
  if (!db) throw new Error('Banco indisponível.');
  const payload = sanitizeCommunity(data);
  if (!payload.name) throw new Error('Informe o nome da comunidade.');

  const id = doc(collection(db, COMMUNITY_COLLECTION)).id;
  await setDoc(doc(db, COMMUNITY_COLLECTION, id), {
    id,
    ...payload,
    invite_code: inviteCode(),
    owner_id: actor?.uid || null,
    member_count: 1,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  
  if (actor?.uid) {
    await setDoc(doc(db, 'community_members', `${id}_${actor.uid}`), {
      community_id: id,
      user_id: actor.uid,
      role: 'admin',
      joined_at: serverTimestamp()
    });
  }

  await createAuditLog({ action: 'community_created', actor, details: { community_id: id, name: payload.name } });
  return id;
}

export async function updateCommunity(id, updates, actor) {
  if (!db || !id) throw new Error('Comunidade inválida.');
  const payload = sanitizeCommunity(updates);
  if (!payload.name) throw new Error('Informe o nome da comunidade.');
  await updateDoc(doc(db, COMMUNITY_COLLECTION, id), {
    ...payload,
    updated_at: serverTimestamp(),
  });
  const linkedClubs = await updateLinkedClubs(id, { community_name: payload.name });
  await createAuditLog({ action: 'community_updated', actor, details: { community_id: id, fields: Object.keys(payload) } });
  return linkedClubs;
}

export async function deleteCommunity(id, actor) {
  if (!db || !id) throw new Error('Comunidade inválida.');
  const detachedClubs = await updateLinkedClubs(id, { community_id: '', community_name: '' });
  await deleteDoc(doc(db, COMMUNITY_COLLECTION, id));
  await createAuditLog({ action: 'community_deleted', actor, details: { community_id: id, detached_clubs: detachedClubs } });
}

export async function joinCommunity(communityId, userId) {
  const memberRef = doc(db, 'community_members', `${communityId}_${userId}`);
  await setDoc(memberRef, {
    community_id: communityId,
    user_id: userId,
    role: 'member',
    joined_at: serverTimestamp()
  });
}

export async function leaveCommunity(communityId, userId) {
  if (!db || !communityId || !userId) return;
  await deleteDoc(doc(db, 'community_members', `${communityId}_${userId}`));
}

/** Associação do usuário à comunidade (id determinista `communityId_userId`), ou null. */
export async function getMyCommunityMembership(communityId, userId) {
  if (!db || !communityId || !userId) return null;
  const snap = await getDoc(doc(db, 'community_members', `${communityId}_${userId}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Contagem real de membros via agregação — o `member_count` gravado no doc é
 * cosmético (as regras só deixam o dono editar o doc da comunidade, então
 * ingressos de terceiros não conseguem incrementá-lo).
 */
export async function getCommunityMemberCount(communityId) {
  if (!db || !communityId) return 0;
  const snap = await getCountFromServer(
    query(collection(db, 'community_members'), where('community_id', '==', communityId)),
  );
  return snap.data().count;
}

/** Busca comunidade pelo código de convite (para o card "Tem um convite?" do diretório). */
export async function findCommunityByInviteCode(code) {
  if (!db) return null;
  const normalized = trimmed(code).toUpperCase();
  if (!normalized) return null;
  const snap = await getDocs(query(
    collection(db, COMMUNITY_COLLECTION),
    where('invite_code', '==', normalized),
    limit(1),
  ));
  const first = snap.docs[0];
  return first ? { id: first.id, ...first.data() } : null;
}

export async function getCommunityPosts(communityId) {
  const q = query(collection(db, 'community_posts'), where('community_id', '==', communityId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPost(communityId, text, user, profile, attachments = []) {
  // Autor desnormalizado no doc (nome/foto), padrão do repo — evita leitura
  // cruzada de `users` na renderização do mural.
  const postRef = await addDoc(collection(db, 'community_posts'), {
    community_id: communityId,
    ...authorFields(user, profile),
    text,
    attachments,
    likes_count: 0,
    comments_count: 0,
    author_name: authorMeta?.author_name || null,
    author_photo: authorMeta?.author_photo || null,
    created_at: serverTimestamp()
  });

  await createAuditLog({
    action: 'community_post_created',
    actor: user,
    details: { community_id: communityId, post_id: postRef.id }
  });

  return postRef;
}

export async function deletePost(postId, userId) {
  await deleteDoc(doc(db, 'community_posts', postId));
  
  if (userId) {
    await createAuditLog({
      action: 'community_post_deleted',
      actor: { uid: userId },
      details: { post_id: postId }
    });
  }
}

export async function toggleThreadLike(threadId, userId) {
  const likeRef = doc(db, 'community_forum_threads', threadId, 'likes', userId);
  const snap = await getDoc(likeRef);

  if (snap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'community_forum_threads', threadId), { likes_count: increment(-1) });
    return false; // unliked
  } else {
    await setDoc(likeRef, { created_at: serverTimestamp() });
    await updateDoc(doc(db, 'community_forum_threads', threadId), { likes_count: increment(1) });
    return true; // liked
  }
}

export async function getThreadLikes(threadId) {
  const q = query(collection(db, 'community_forum_threads', threadId, 'likes'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.id);
}

export async function toggleMessageLike(messageId, userId) {
  const likeRef = doc(db, 'community_forum_messages', messageId, 'likes', userId);
  const snap = await getDoc(likeRef);

  if (snap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(doc(db, 'community_forum_messages', messageId), { likes_count: increment(-1) });
    return false; // unliked
  } else {
    await setDoc(likeRef, { created_at: serverTimestamp() });
    await updateDoc(doc(db, 'community_forum_messages', messageId), { likes_count: increment(1) });
    return true; // liked
  }
}

export async function getMessageLikes(messageId) {
  const q = query(collection(db, 'community_forum_messages', messageId, 'likes'));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.id);
}

export async function votePoll(entityType, entityId, optionIndex, userId) {
  // entityType: 'thread' | 'message'
  const collectionName = entityType === 'thread' ? 'community_forum_threads' : 'community_forum_messages';
  const voteRef = doc(db, collectionName, entityId, 'poll_votes', userId);
  const entityRef = doc(db, collectionName, entityId);

  const voteSnap = await getDoc(voteRef);
  const isUpdate = voteSnap.exists();
  const oldOption = isUpdate ? voteSnap.data().optionIndex : null;

  await setDoc(voteRef, { optionIndex, updated_at: serverTimestamp() });

  // We don't increment a counter here to avoid transaction complexity if multiple vote,
  // typically poll voting recalculates from reading all votes, or we can use transactions.
  // For simplicity we just record the vote. The UI will fetch all votes to calculate %.
}

export async function getPollVotes(entityType, entityId) {
  const collectionName = entityType === 'thread' ? 'community_forum_threads' : 'community_forum_messages';
  const q = query(collection(db, collectionName, entityId, 'poll_votes'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ userId: d.id, ...d.data() }));
}



export async function togglePostLike(postId, userId) {
  const likeId = `${postId}_${userId}`;
  const likeRef = doc(db, 'community_post_likes', likeId);
  const postRef = doc(db, 'community_posts', postId);
  
  await runTransaction(db, async (transaction) => {
    const likeDoc = await transaction.get(likeRef);
    const postDoc = await transaction.get(postRef);
    if (!postDoc.exists()) throw new Error('Post not found');
    
    if (likeDoc.exists()) {
      transaction.delete(likeRef);
      transaction.update(postRef, { likes_count: increment(-1) });
    } else {
      transaction.set(likeRef, { post_id: postId, user_id: userId, created_at: serverTimestamp() });
      transaction.update(postRef, { likes_count: increment(1) });
    }
  });
}

export async function getPostLikes(postId) {
  const snap = await getDocs(query(collection(db, 'community_post_likes'), where('post_id', '==', postId)));
  return snap.docs.map(d => d.data().user_id);
}

/** Ids dos posts curtidos pelo usuário (uma query só; filtra por comunidade no client). */
export async function getMyLikedPostIds(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(query(collection(db, 'community_post_likes'), where('user_id', '==', userId)));
  return snap.docs.map(d => d.data().post_id);
}

export async function getPostComments(postId) {
  const q = query(collection(db, 'community_post_comments'), where('post_id', '==', postId), orderBy('created_at', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPostComment(postId, text, user, profile) {
   const input = parseOrThrow(commentInputSchema, { text });
   const ref = doc(collection(db, 'community_post_comments'));
   await setDoc(ref, {
     post_id: postId,
     text: input.text,
     author_id: user.uid,
     author_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
     author_photo: profile?.photo_url || user.photoURL || '',
     created_at: serverTimestamp()
   });
   await updateDoc(doc(db, 'community_posts', postId), { comments_count: increment(1) });
   return ref.id;
}

export async function deletePostComment(commentId, postId) {
   await deleteDoc(doc(db, 'community_post_comments', commentId));
   await updateDoc(doc(db, 'community_posts', postId), { comments_count: increment(-1) });
}

export async function getForumThreads(communityId) {
  const q = query(collection(db, 'community_forum_threads'), where('community_id', '==', communityId), orderBy('updated_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createForumThread(communityId, title, text, user, profile, attachments = [], poll = null) {
   const input = parseOrThrow(threadInputSchema, { title, text, attachments, poll });
   const ref = doc(collection(db, 'community_forum_threads'));
   await setDoc(ref, {
     community_id: communityId,
     title: input.title,
     text: input.text,
     attachments: input.attachments,
     poll: input.poll,
     author_id: user.uid,
     author_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
     author_photo: profile?.photo_url || user.photoURL || '',
     messages_count: 0,
     likes_count: 0,
     created_at: serverTimestamp(),
     updated_at: serverTimestamp()
   });
   return ref.id;
}

export async function deleteForumThread(threadId) {
  await deleteDoc(doc(db, 'community_forum_threads', threadId));
}

export async function getThreadMessages(threadId) {
  const q = query(collection(db, 'community_forum_messages'), where('thread_id', '==', threadId), orderBy('created_at', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addThreadMessage(threadId, text, user, profile, attachments = [], poll = null) {
   const input = parseOrThrow(threadMessageInputSchema, { text, attachments, poll });
   const ref = doc(collection(db, 'community_forum_messages'));
   await setDoc(ref, {
     thread_id: threadId,
     text: input.text,
     attachments: input.attachments,
     poll: input.poll,
     author_id: user.uid,
     author_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
     author_photo: profile?.photo_url || user.photoURL || '',
     likes_count: 0,
     created_at: serverTimestamp()
   });
   await updateDoc(doc(db, 'community_forum_threads', threadId), { 
     messages_count: increment(1),
     updated_at: serverTimestamp() 
   });
   return ref.id;
}

export async function deleteThreadMessage(messageId, threadId) {
  await deleteDoc(doc(db, 'community_forum_messages', messageId));
  if (threadId) {
    await updateDoc(doc(db, 'community_forum_threads', threadId), {
      messages_count: increment(-1)
    });
  }
}

// ─── Eventos da comunidade (coleção `community_events`) ─────────────────────

export async function listCommunityEvents(communityId) {
  if (!db || !communityId) return [];
  // `where` único usa índice automático; a ordenação é client-side para não
  // exigir um índice composto novo (listas pequenas por comunidade).
  const snap = await getDocs(query(
    collection(db, 'community_events'),
    where('community_id', '==', communityId),
  ));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(a.starts_at || '').localeCompare(String(b.starts_at || '')));
}

export async function createCommunityEvent(communityId, data, user, profile) {
  if (!db) throw new Error('Banco indisponível.');
  const payload = {
    community_id: communityId,
    title: trimmed(data.title),
    description: trimmed(data.description),
    location: trimmed(data.location),
    starts_at: trimmed(data.starts_at),
    created_by: user.uid,
    creator_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
    created_at: serverTimestamp(),
  };
  if (!payload.title) throw new Error('Informe o título do evento.');
  const ref = await addDoc(collection(db, 'community_events'), payload);
  await createAuditLog({
    action: 'community_event_created',
    actor: user,
    details: { community_id: communityId, event_id: ref.id, title: payload.title },
  });
  return ref.id;
}

export async function deleteCommunityEvent(eventId, actor) {
  if (!db || !eventId) return;
  await deleteDoc(doc(db, 'community_events', eventId));
  await createAuditLog({ action: 'community_event_deleted', actor, details: { event_id: eventId } });
}
