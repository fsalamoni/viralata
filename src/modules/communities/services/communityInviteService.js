import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

export const COMMUNITY_INVITE_STATUS = Object.freeze({ PENDING: 'pending', ACCEPTED: 'accepted', DECLINED: 'declined' });
export const COMMUNITY_INVITE_ROLES = Object.freeze({ MEMBER: 'member', MODERATOR: 'moderator' });

export async function createInvite({ communityId, communityName, invitedUid, invitedEmail, invitedBy, role = 'member' }) {
  const ref = doc(db, 'community_member_invites', `${communityId}_${invitedUid}`);
  const data = { community_id: communityId, community_name: communityName || null, invited_uid: invitedUid, invited_email: invitedEmail || null, invited_by: invitedBy, role, status: COMMUNITY_INVITE_STATUS.PENDING, created_at: serverTimestamp(), updated_at: serverTimestamp() };
  await setDoc(ref, data);
  return { id: ref.id, ...data };
}

export async function listInvitesForUser(uid) {
  const snap = await getDocs(query(collection(db, 'community_member_invites'), where('invited_uid', '==', uid), orderBy('created_at', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function acceptInvite(communityId, invitedUid) {
  await updateDoc(doc(db, 'community_member_invites', `${communityId}_${invitedUid}`), { status: COMMUNITY_INVITE_STATUS.ACCEPTED, updated_at: serverTimestamp(), accepted_at: serverTimestamp() });
}

export async function declineInvite(communityId, invitedUid) {
  await updateDoc(doc(db, 'community_member_invites', `${communityId}_${invitedUid}`), { status: COMMUNITY_INVITE_STATUS.DECLINED, updated_at: serverTimestamp(), declined_at: serverTimestamp() });
}

export default { COMMUNITY_INVITE_STATUS, COMMUNITY_INVITE_ROLES, createInvite, listInvitesForUser, acceptInvite, declineInvite };
