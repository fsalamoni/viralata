import {
  increment,
  runTransaction,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
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
  parseOrThrow,
} from '@/modules/communities/domain/contentSchemas';

function trimmed(value) {
  return String(value ?? '').trim();
}

function toPriority(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
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

/**
 * Claim de ownership para uma comunidade LEGADA cujo doc foi criado em uma
 * versão antiga do `createCommunity` que não setava o campo `owner_id`.
 *
 * Comportamento esperado:
 *  - Só funciona se `community.owner_id` for `null` ou inexistente.
 *  - Seta `community.owner_id = currentUserUid`. Outras campos do doc não
 *    são tocados (a Firestore rule do PR que introduziu essa função
 *    restringe o update a `owner_id` apenas — sem mudar nada mais).
 *  - Lança erro se a comunidade não existe ou se já tem owner.
 *
 * Defense-in-depth: o client checa (community.owner_id == null) antes de
 * chamar; o Firestore rule reforça que o destino tem que ser == auth.uid
 * e a origem tem que ser null.
 *
 * @param {string} communityId
 * @param {string} currentUserUid  o usuário que está fazendo o claim
 * @returns {Promise<void>}
 */
export async function claimCommunityOwnership(communityId, currentUserUid) {
  if (!db) throw new Error('Banco indisponível.');
  if (!communityId || !currentUserUid) throw new Error('Argumentos inválidos.');
  const ref = doc(db, COMMUNITY_COLLECTION, communityId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Comunidade não encontrada.');
  const data = snap.data();
  if (data.owner_id) {
    throw new Error('Esta comunidade já tem um dono definido. Operação cancelada.');
  }
  await updateDoc(ref, {
    owner_id: currentUserUid,
    updated_at: serverTimestamp(),
  });
}


export async function getCommunityMembership(communityId, userId) {
  if (!db || !communityId || !userId) return null;
  const snap = await getDoc(doc(db, 'community_members', `${communityId}_${userId}`));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function isCommunityAdmin(communityId, userId) {
  const membership = await getCommunityMembership(communityId, userId);
  return membership?.role === 'admin';
}

export async function listCommunityEvents(communityId) {
  const q = query(collection(db, 'community_events'), where('community_id', '==', communityId), orderBy('starts_at', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createCommunityEvent(communityId, data, user) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!data.title) throw new Error('Informe o título do evento.');

  const ref = doc(collection(db, 'community_events'));
  await setDoc(ref, {
    community_id: communityId,
    title: data.title,
    description: data.description || '',
    location: data.location || '',
    starts_at: data.starts_at || null,
    created_by: user.uid,
    created_at: serverTimestamp()
  });
  return ref.id;
}

export async function deleteCommunityEvent(eventId) {
  await deleteDoc(doc(db, 'community_events', eventId));
}

export async function getCommunityPosts(communityId) {
  const q = query(collection(db, 'community_posts'), where('community_id', '==', communityId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Cria um post no mural da comunidade. Aceita um quinto argumento opcional
 * `authorMeta` com `author_name` e `author_photo` para denormalizar no doc
 * (evita 1 GET por post só pra mostrar o nome do autor).
 */
export async function createPost(communityId, authorId, text, attachments = [], authorMeta = {}) {
  const input = parseOrThrow(postInputSchema, { text, attachments });
  const postRef = await addDoc(collection(db, 'community_posts'), {
    community_id: communityId,
    author_id: authorId,
    text: input.text,
    attachments: input.attachments,
    likes_count: 0,
    comments_count: 0,
    author_name: authorMeta?.author_name || null,
    author_photo: authorMeta?.author_photo || null,
    created_at: serverTimestamp()
  });

  await createAuditLog({
    action: 'community_post_created',
    actor: { uid: authorId },
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

/**
 * Retorna os IDs de todos os posts curtidos por um usuário. Usado pelo mural
 * para pré-marcar quais curtidas já estão ativas sem precisar buscar
 * like-a-like em cada post.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getMyLikedPostIds(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(query(collection(db, 'community_post_likes'), where('user_id', '==', userId)));
  return snap.docs.map((d) => d.data().post_id);
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

// Admin Panel specific functions

export async function listCommunityMembers(communityId) {
  const q = query(collection(db, 'community_members'), where('community_id', '==', communityId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setCommunityMemberRole(communityId, targetUserId, newRole, actor) {
  const memberRef = doc(db, 'community_members', `${communityId}_${targetUserId}`);
  await updateDoc(memberRef, { role: newRole });
  await createAuditLog({ action: 'community_member_role_updated', actor, details: { community_id: communityId, target_user: targetUserId, role: newRole } });
}

export async function setCommunityMemberPermissions(communityId, targetUserId, permissions, actor) {
  const memberRef = doc(db, 'community_members', `${communityId}_${targetUserId}`);
  await updateDoc(memberRef, { permissions });
  await createAuditLog({ action: 'community_member_permissions_updated', actor, details: { community_id: communityId, target_user: targetUserId, permissions } });
}

export async function removeCommunityMember(communityId, targetUserId, actor) {
  const memberRef = doc(db, 'community_members', `${communityId}_${targetUserId}`);
  await deleteDoc(memberRef);
  await createAuditLog({ action: 'community_member_removed', actor, details: { community_id: communityId, target_user: targetUserId } });
}

// ─── Community Event RSVP ─────────────────────────────────────────────────────

const COMMUNITY_EVENT_RSVP_COLLECTION = 'community_event_rsvps';

export async function getCommunityEvent(communityId, eventId) {
  if (!db || !eventId) return null;
  const snap = await getDoc(doc(db, 'community_events', eventId));
  if (!snap.exists() || snap.data().community_id !== communityId) return null;
  return { id: snap.id, ...snap.data() };
}

export async function getCommunityEventRsvps(eventId) {
  if (!db || !eventId) return [];
  const q = query(
    collection(db, COMMUNITY_EVENT_RSVP_COLLECTION),
    where('event_id', '==', eventId),
    orderBy('created_at', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function setCommunityEventRsvp(eventId, userId, userName, userPhoto, status) {
  if (!db || !eventId || !userId) throw new Error('Parâmetros obrigatórios não informados.');
  const rsvpId = `${eventId}_${userId}`;
  await setDoc(doc(db, COMMUNITY_EVENT_RSVP_COLLECTION, rsvpId), {
    event_id: eventId,
    user_id: userId,
    user_name: userName || 'Membro',
    user_photo: userPhoto || '',
    status,
    created_at: serverTimestamp(),
  });
}

export async function removeCommunityEventRsvp(eventId, userId) {
  if (!db || !eventId || !userId) return;
  await deleteDoc(doc(db, COMMUNITY_EVENT_RSVP_COLLECTION, `${eventId}_${userId}`));
}
