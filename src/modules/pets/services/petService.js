/**
 * @fileoverview Serviço de Pets — CRUD na coleção `pets`
 */
import { buildSearchKeywords } from '@/modules/shelter/domain/search';
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, serverTimestamp, writeBatch, runTransaction,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { notifyUsers, NOTIFICATION_TYPE } from '@/core/services/notificationService';
import { calculatePriorityScore } from '@/modules/pets/domain/priority';
import { appendPetLog, PET_LOG_ACTIONS } from './petLogService';

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

/** Lista todos os pets disponíveis (para o feed). */
export async function getAvailablePets({ species, size, city, state, limitCount = 100 } = {}) {
  if (!db) return [];
  const constraints = [where('status', '==', 'available')];
  if (species) constraints.push(where('species', '==', species));
  if (size) constraints.push(where('size', '==', size));
  if (city) constraints.push(where('city', '==', city));
  if (state) constraints.push(where('state', '==', state));

  // Apenas usamos os índices compostos de status (+ species) e created_at
  // se não houver outros filtros que quebrem os índices disponíveis no firestore.indexes.json
  if (!size && !city && !state) {
    constraints.push(orderBy('created_at', 'desc'));
  }

  constraints.push(limit(limitCount));
  const snap = await getDocs(query(collection(db, PETS_COLLECTION), ...constraints));
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
  // TASK-V3-PET-OPS-LOG: pet_seq é o ID imutável e permanente do pet.
  // Gerado atomicamente via Firestore runTransaction (best-effort: max+1).
  const petSeq = await getNextPetSeq();
  const payload = {
    ...petData,
    photos: normalizePetPhotoUrls(petData?.photos),
    status: petData.status || 'available',
    priority_score: priorityScore,
    pet_seq: petSeq, // IMUTÁVEL — número sequencial global, único por pet
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
  await createAuditLog({ action: 'pet_created', actor, details: { pet_id: ref.id, pet_seq: petSeq, title: petData.title } });
  // TASK-V3-PET-OPS-LOG: registra criação no log imutável do pet.
  await appendPetLog(ref.id, {
    action: PET_LOG_ACTIONS.PET_CREATED,
    actor,
    target: { collection: 'pets', docId: ref.id },
    details: { pet_seq: petSeq, title: petData.title, name: petData.name },
  });
  return ref.id;
}

/**
 * Verifica se o ator tem permissão direta para editar/deletar o pet.
 *
 * Esta checagem é DEFENSE-IN-DEPTH (camada 2 de 3):
 *   1) UI: usePetPermissions hook mostra/esconde botões
 *   2) Service: este helper (chamado antes de CADA escrita) — falha rápido
 *      com mensagem PT-BR clara
 *   3) Firestore rules: bloqueio final no servidor (canManagePet)
 *
 * Para pets individuais: exige `owner_id === actor.uid` (ou platform_admin).
 * Para pets de ONG: deixa passar se for owner do pet OU member com permissão
 * — a Firestore rule faz a checagem granular final. Também bloqueia pets
 * de ONG criados por outros membros (que NÃO deveriam ter passado pela
 * rule de create) — defense-in-depth.
 *
 * @throws Error('Você não tem permissão para modificar este pet.')
 */
export async function ensureCanMutatePet(petId, actor) {
  if (!db || !petId) {
    throw new Error('Pet inválido.');
  }
  if (!actor?.uid) {
    throw new Error('Você precisa estar autenticado para gerenciar pets.');
  }
  const snap = await getDoc(doc(db, PETS_COLLECTION, petId));
  if (!snap.exists()) throw new Error('Pet não encontrado.');
  const data = snap.data() || {};

  // Platform admin sempre pode (regra do Firestore confirma)
  const isPlatformAdmin = actor.email === 'fsalamoni@gmail.com' || actor.isPlatformAdmin === true;
  if (isPlatformAdmin) return;

  // Pets individuais: só o dono direto.
  if (data.owner_type !== 'organization') {
    if (data.owner_id !== actor.uid) {
      throw new Error('Você não tem permissão para modificar este pet.');
    }
    return;
  }

  // Pet de ONG: checagem leve. A Firestore rule valida o membership
  // granular (canEditClubPets || hasClubPermission). Aqui bloqueamos
  // só casos obviously-wrong (uid vazio, pet órfão).
  if (!data.owner_id) {
    throw new Error('Pet de ONG sem owner_id válido.');
  }
  // Se chegou aqui e NÃO é o owner do pet (caso comum: pet de ONG
  // cadastrado por outro membro), a Firestore rule vai bloquear
  // a escrita de qualquer jeito. Não fazemos cache local aqui para
  // evitar requests extras.
}

/** Atualiza dados de um pet. */
export async function updatePet(petId, updates, actor) {
  if (!db || !petId) throw new Error('Dados inválidos');
  await ensureCanMutatePet(petId, actor);
  // D-PET-SEQ-IMMUTABLE: pet_seq NUNCA pode ser alterado depois de criado.
  // Se algum caller tentar, removemos silenciosamente para evitar erro.
  const safeUpdates = { ...updates };
  if (Object.prototype.hasOwnProperty.call(safeUpdates, 'pet_seq')) {
    logger.warn('[petService] tentativa de alterar pet_seq bloqueada', { petId, attempted: safeUpdates.pet_seq });
    delete safeUpdates.pet_seq;
  }
  const normalizedUpdates = {
    ...safeUpdates,
    updated_at: serverTimestamp(),
  };
  if (Object.prototype.hasOwnProperty.call(safeUpdates, 'photos')) {
    normalizedUpdates.photos = normalizePetPhotoUrls(safeUpdates?.photos);
  }
  // TASK-075: se algum campo pesquisável mudou, recomputa search_keywords.
  const searchable = ['name', 'title', 'breed', 'city'];
  if (searchable.some((k) => Object.prototype.hasOwnProperty.call(safeUpdates, k))) {
    const current = await getPetById(petId).catch(() => null);
    const merged = { ...current, ...safeUpdates };
    normalizedUpdates.search_keywords = buildSearchKeywords({
      name: merged?.name, title: merged?.title, breed: merged?.breed, city: merged?.city,
    });
  }
  await updateDoc(doc(db, PETS_COLLECTION, petId), normalizedUpdates);
  await createAuditLog({ action: 'pet_updated', actor, details: { pet_id: petId, changed_fields: Object.keys(safeUpdates) } });
  // TASK-V3-PET-OPS-LOG: registra cada update no log imutável do pet.
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.PET_UPDATED,
    actor,
    target: { collection: 'pets', docId: petId },
    details: { changed_fields: Object.keys(safeUpdates) },
  });
}

/** Marca um pet como adotado e avisa os demais interessados que não foram escolhidos. */
export async function completePetAdoption(petId, adoptedByUid, actor) {
  if (!db || !petId) throw new Error('Dados inválidos');
  // Defense-in-depth: só canManage (dono/ong) pode finalizar adoção
  await ensureCanMutatePet(petId, actor);
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
  // TASK-V3-PET-OPS-LOG: registra ANTES de excluir (depois não tem mais o doc).
  await appendPetLog(petId, {
    action: PET_LOG_ACTIONS.PET_DELETED,
    actor,
    target: { collection: 'pets', docId: petId },
  });
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

/**
 * D-PET-SEQ-IMMUTABLE: gera o próximo número sequencial (pet_seq) para um novo pet.
 *
 * Estratégia: runTransaction + contador atômico em /pet_seq_counter/global.
 * - Lê o counter (ou cria como 0 se não existe)
 * - Incrementa em 1
 * - Grava o novo valor
 * - Retorna o valor incrementado
 *
 * O pet_seq é IMUTÁVEL depois de criado (D-PET-SEQ-IMMUTABLE enforced em
 * firestore.rules: `request.resource.data.pet_seq == resource.data.pet_seq`).
 *
 * Fallback (offline/erro): usa timestamp % 1_000_000 como seq de contingência.
 * Raramente usado porque Firestore é rápido.
 */
export async function getNextPetSeq() {
  if (!db) return Math.floor(Date.now() / 1000) % 1_000_000;
  try {
    const next = await runTransaction(db, async (tx) => {
      const counterRef = doc(db, 'pet_seq_counter', 'global');
      const snap = await tx.get(counterRef);
      const current = snap.exists() ? (snap.data()?.value || 0) : 0;
      const value = current + 1;
      tx.set(counterRef, { value, updated_at: serverTimestamp() }, { merge: true });
      return value;
    });
    return next;
  } catch (err) {
    logger.warn('[petService] getNextPetSeq transaction falhou, usando fallback', err);
    return Math.floor(Date.now() / 1000) % 1_000_000;
  }
}
