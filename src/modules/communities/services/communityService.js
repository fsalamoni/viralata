import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
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
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
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
