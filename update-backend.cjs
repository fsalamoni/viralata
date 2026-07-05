const fs = require('fs');

let code = fs.readFileSync('src/modules/communities/services/communityService.js', 'utf8');

if (!code.includes('runTransaction')) {
  code = code.replace("import {", "import {\n  increment,\n  runTransaction,");
}

const extra = `
export async function togglePostLike(postId, userId) {
  const likeId = \`\${postId}_\${userId}\`;
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
`;

if (!code.includes('getPostComments')) {
  fs.writeFileSync('src/modules/communities/services/communityService.js', code + '\n' + extra);
}

const data = JSON.parse(fs.readFileSync('firestore.indexes.json', 'utf8'));
const newIndexes = [
  { collectionGroup: 'community_post_comments', queryScope: 'COLLECTION', fields: [{ fieldPath: 'post_id', order: 'ASCENDING' }, { fieldPath: 'created_at', order: 'ASCENDING' }] },
  { collectionGroup: 'community_forum_threads', queryScope: 'COLLECTION', fields: [{ fieldPath: 'community_id', order: 'ASCENDING' }, { fieldPath: 'updated_at', order: 'DESCENDING' }] },
  { collectionGroup: 'community_forum_messages', queryScope: 'COLLECTION', fields: [{ fieldPath: 'thread_id', order: 'ASCENDING' }, { fieldPath: 'created_at', order: 'ASCENDING' }] }
];

newIndexes.forEach(idx => {
  if (!data.indexes.find(i => i.collectionGroup === idx.collectionGroup)) {
    data.indexes.push(idx);
  }
});
fs.writeFileSync('firestore.indexes.json', JSON.stringify(data, null, 2));
