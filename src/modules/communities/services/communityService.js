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

export async function getCommunityPosts(communityId) {
  const q = query(collection(db, 'community_posts'), where('community_id', '==', communityId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function createPost(communityId, authorId, text, attachments = []) {
  const postRef = await addDoc(collection(db, 'community_posts'), {
    community_id: communityId,
    author_id: authorId,
    text,
    attachments,
    likes_count: 0,
    comments_count: 0,
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

export async function getPostComments(postId) {
  const q = query(collection(db, 'community_post_comments'), where('post_id', '==', postId), orderBy('created_at', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addPostComment(postId, text, user, profile) {
   const ref = doc(collection(db, 'community_post_comments'));
   await setDoc(ref, {
     post_id: postId,
     text,
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

export async function createForumThread(communityId, title, text, user, profile) {
   const ref = doc(collection(db, 'community_forum_threads'));
   await setDoc(ref, {
     community_id: communityId,
     title,
     text,
     author_id: user.uid,
     author_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
     author_photo: profile?.photo_url || user.photoURL || '',
     messages_count: 0,
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

export async function addThreadMessage(threadId, text, user, profile) {
   const ref = doc(collection(db, 'community_forum_messages'));
   await setDoc(ref, {
     thread_id: threadId,
     text,
     author_id: user.uid,
     author_name: profile?.platform_name || user.displayName || user.email || 'Usuário',
     author_photo: profile?.photo_url || user.photoURL || '',
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
