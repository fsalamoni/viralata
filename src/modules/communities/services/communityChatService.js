/** TASK-349: Chat admin de comunidade. */
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, serverTimestamp, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

export const COMMUNITY_CHAT_STATUS = Object.freeze({ OPEN: 'open', ARCHIVED: 'archived' });
export function makeCommunityThreadId(communityId, uid) { return `${communityId}_${uid}`; }

export async function getOrCreateThread(communityId, uid, userSnapshot = null) {
  const threadId = makeCommunityThreadId(communityId, uid);
  const ref = doc(db, 'community_chat_threads', threadId);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: threadId, ...snap.data() };
  const data = {
    community_id: communityId, user_id: uid,
    user_display_name: userSnapshot?.displayName || userSnapshot?.name || null,
    user_photo_url: userSnapshot?.photoURL || userSnapshot?.photoUrl || null,
    status: COMMUNITY_CHAT_STATUS.OPEN, last_message_at: serverTimestamp(),
    last_message_preview: null, unread_by_admin: 0, unread_by_user: 0, created_at: serverTimestamp(),
  };
  await setDoc(ref, data);
  return { id: threadId, ...data };
}

export async function sendMessage(communityId, uid, senderRole, text) {
  if (!text || !text.trim()) throw new Error('text required');
  const threadId = makeCommunityThreadId(communityId, uid);
  await getOrCreateThread(communityId, uid);
  await addDoc(collection(db, 'community_chat_threads', threadId, 'messages'), {
    sender_id: uid, sender_role: senderRole, text: text.trim(), created_at: serverTimestamp(),
  });
  await updateDoc(doc(db, 'community_chat_threads', threadId), {
    last_message_at: serverTimestamp(),
    last_message_preview: text.trim().slice(0, 120),
  });
}

export async function listThreadsForCommunity(communityId) {
  const q = query(collection(db, 'community_chat_threads'), where('community_id', '==', communityId), orderBy('last_message_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function listThreadsForUser(uid) {
  const q = query(collection(db, 'community_chat_threads'), where('user_id', '==', uid), orderBy('last_message_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export function subscribeMessages(communityId, uid, callback) {
  const q = query(collection(db, 'community_chat_threads', makeCommunityThreadId(communityId, uid), 'messages'), orderBy('created_at', 'asc'));
  return onSnapshot(q, (snap) => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))), (err) => logger.error('subscribeMessages', err));
}

export async function archiveThread(communityId, uid) {
  await updateDoc(doc(db, 'community_chat_threads', makeCommunityThreadId(communityId, uid)), { status: COMMUNITY_CHAT_STATUS.ARCHIVED, archived_at: serverTimestamp() });
}

export default { COMMUNITY_CHAT_STATUS, makeCommunityThreadId, getOrCreateThread, sendMessage, listThreadsForCommunity, listThreadsForUser, subscribeMessages, archiveThread };
