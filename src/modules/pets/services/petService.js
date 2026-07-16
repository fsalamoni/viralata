/**
 * @fileoverview Serviço de Pets — CRUD na coleção `pets`
 */
import { buildSearchKeywords } from '@/modules/shelter/domain/search';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { notifyUsers, NOTIFICATION_TYPE } from '@/core/services/notificationService';
import { calculatePriorityScore } from '@/modules/pets/domain/priority';

const PETS_COLLECTION = 'pets';
const INTERESTS_COLLECTION = 'adoption_interests';

export function normalizePetPhotoUrls(photos) {
  return Array.isArray(photos)
    ? photos
      .map((photo) => (typeof photo === 'string' ? photo.trim() : (typeof photo?.url === 'string' ? photo.url.trim() : null)))
      .filter(Boolean)
    : [];
}

function normalizePetRecord(id, data) {
  return {
    id,
    ...data,
    photos: normalizePetPhotoUrls(data?.photos),
  };
}

/** Busca um pet por ID. */
export async function getPetById(petId) {
  if (!db || !petId) return null;
  const snap = await getDoc(doc(db, PETS_COLLECTION, petId));
  return snap.exists() ? normalizePetRecord(snap.id, snap.data()) : null;
}

/**
 * Lista todos os pets disponíveis (para o feed).
 *
 * Propositalmente UMA única forma de query (status + created_at), coberta
 * pelo índice composto existente em `firestore.indexes.json`. Espécie,
 * porte, cidade e raio são aplicados client-side pelo domínio puro
 * (`domain/feedFilters.js`) — cada combinação de `where` extra exigiria um
 * índice composto próprio e a ausência de um deles derruba o feed inteiro
 * com `failed-precondition` em runtime.
 */
export async function getAvailablePets({ limitCount = 500 } = {}) {
  if (!db) return [];
  const snap = await getDocs(query(
    collection(db, PETS_COLLECTION),
    where('status', '==', 'available'),
    orderBy('created_at', 'desc'),
    limit(limitCount),
  ));
  return snap.docs.map((d) => normalizePetRecord(d.id, d.data()));
}

/** Lista pets de um dono (usuário ou organização). */
export async function getPetsByOwner(ownerId) {
  if (!db || !ownerId) return [];
  const snap = await getDocs(
    query(collection(db, PETS_COLLECTION), where('owner_id', '==', ownerId), orderBy('created_at', 'desc'))
  );
  return snap.docs.map((d) => normalizePetRecord(d.id, d.data()));
}

/** Cria um novo pet. */
export async function createPet(petData, actor) {
  if (!db) throw new Error('Firebase não disponível');
  const priorityScore = calculatePriorityScore({ created_at: { seconds: Date.now() / 1000 } });
  const payload = {
    ...petData,
    photos: normalizePetPhotoUrls(petData?.photos),
    status: petData.status || 'available',
    priority_score: priorityScore,
    // TASK-075 (Fase 18): keywords normalizados p/ Smart Search
    // (array-contains server-side).
    search_keywords: buildSearchKeywords({
      name: petData?.name,
      title: petData?.title,
      breed: petData?.breed,
      city: petData?.city,
    }),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, PETS_COLLECTION), payload);
  await createAuditLog({ action: 'pet_created', actor, details: { pet_id: ref.id, title: petData.title } });
  return ref.id;
}

/**
 * Verifica se o ator tem permissão direta para editar/deletar o pet.
 * Para pets individuais, exige `owner_id === actor.uid`. Para pets de ONG e
 * platform_admin, delega ao Firestore (já tem a regra de
 * `isClubAdmin || canEditClubPets || hasClubPermission || isPlatformAdmin`).
 *
 * Defense-in-depth: chama ANTES do update/delete para dar feedback claro ao
 * usuário em vez do erro genérico `permission-denied`.
 *
 * @throws Error('Você não tem permissão para modificar este pet.')
 */
async function ensureCanMutatePet(petId, actor) {
  if (!db || !petId) return;
  const snap = await getDoc(doc(db, PETS_COLLECTION, petId));
  if (!snap.exists()) throw new Error('Pet não encontrado.');
  const data = snap.data() || {};
  // Pets individuais: só o dono direto.
  if (data.owner_type !== 'organization' && data.owner_id !== actor?.uid) {
    throw new Error('Você não tem permissão para modificar este pet.');
  }
  // Platform admin sempre pode (regra do Firestore confirma). Pets de ONG
  // caem através daqui — a regra do Firestore aplica as checagens granulares
  // (isClubAdmin / hasClubPermission / etc.) por baixo dos panos.
}

/** Atualiza dados de um pet. */
export async function updatePet(petId, updates, actor) {
  if (!db || !petId) throw new Error('Dados inválidos');
  await ensureCanMutatePet(petId, actor);
  const normalizedUpdates = {
    ...updates,
    updated_at: serverTimestamp(),
  };
  if (Object.prototype.hasOwnProperty.call(updates || {}, 'photos')) {
    normalizedUpdates.photos = normalizePetPhotoUrls(updates?.photos);
  }
  // TASK-075: se algum campo pesquisável mudou, recomputa search_keywords.
  const searchable = ['name', 'title', 'breed', 'city'];
  if (searchable.some((k) => Object.prototype.hasOwnProperty.call(updates || {}, k))) {
    const current = await getPetById(petId).catch(() => null);
    const merged = { ...current, ...updates };
    normalizedUpdates.search_keywords = buildSearchKeywords({
      name: merged?.name, title: merged?.title, breed: merged?.breed, city: merged?.city,
    });
  }
  await updateDoc(doc(db, PETS_COLLECTION, petId), normalizedUpdates);
  await createAuditLog({ action: 'pet_updated', actor, details: { pet_id: petId, changed_fields: Object.keys(updates) } });
}

/** Marca um pet como adotado e avisa os demais interessados que não foram escolhidos. */
export async function completePetAdoption(petId, adoptedByUid, actor) {
  if (!db || !petId) throw new Error('Dados inválidos');
  const pet = await getPetById(petId);

  const batch = writeBatch(db);
  batch.update(doc(db, PETS_COLLECTION, petId), {
    status: 'adopted',
    adopted_by: adoptedByUid,
    adopted_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  const otherInterestsSnap = await getDocs(
    query(collection(db, INTERESTS_COLLECTION), where('pet_id', '==', petId), where('status', 'in', ['pending', 'chat_opened']))
  );
  const otherInterests = otherInterestsSnap.docs.filter((d) => d.data().user_id !== adoptedByUid);
  otherInterests.forEach((d) => batch.update(d.ref, { status: 'rejected', updated_at: serverTimestamp() }));

  await batch.commit();
  // TASK-351: targetUserId = adotante que recebeu o pet
  await createAuditLog({ action: 'adoption_completed', actor, targetUserId: adoptedByUid, details: { pet_id: petId } });

  const otherUserIds = otherInterests.map((d) => d.data().user_id);
  if (otherUserIds.length > 0) {
    await notifyUsers(otherUserIds, {
      title: 'Interesse não selecionado',
      message: `${pet?.title || pet?.name || 'O pet'} foi adotado por outra pessoa. Continue procurando no feed!`,
      type: NOTIFICATION_TYPE.ADOPTION_REJECTED,
      link: '/feed',
      actor,
    });
  }
}

/** Remove um pet (apenas se ainda disponível). */
export async function deletePet(petId, actor) {
  if (!db || !petId) throw new Error('Dados inválidos');
  await ensureCanMutatePet(petId, actor);
  await deleteDoc(doc(db, PETS_COLLECTION, petId));
  await createAuditLog({ action: 'pet_deleted', actor, details: { pet_id: petId } });
}

/** Recalcula e atualiza o priority_score de todos os pets disponíveis. */
export async function recalculatePriorityScores() {
  if (!db) return;
  const snap = await getDocs(query(collection(db, PETS_COLLECTION), where('status', '==', 'available')));
  const BATCH_SIZE = 400;
  const docs = snap.docs;
  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    docs.slice(i, i + BATCH_SIZE).forEach((d) => {
      const score = calculatePriorityScore(d.data());
      batch.update(d.ref, { priority_score: score });
    });
    await batch.commit().catch((err) => logger.error('recalculatePriorityScores batch error', err));
  }
}
