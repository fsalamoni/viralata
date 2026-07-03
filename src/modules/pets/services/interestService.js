/**
 * @fileoverview Serviço de Interesses de Adoção — coleção `adoption_interests`
 * ID determinístico: `{petId}_{userId}`
 */
import {
  doc, getDoc, setDoc, updateDoc, getDocs,
  collection, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import { createNotification, NOTIFICATION_TYPE } from '@/core/services/notificationService';
import { getPetById, updatePet } from './petService';

const COLLECTION = 'adoption_interests';

function interestId(petId, userId) {
  return `${petId}_${userId}`;
}

/** Registra o interesse de um adotante em um pet. */
export async function createInterest(petId, userId, actor, formAnswers = null) {
  if (!db || !petId || !userId) throw new Error('Dados inválidos');
  const id = interestId(petId, userId);
  const ref = doc(db, COLLECTION, id);
  const existing = await getDoc(ref);
  if (existing.exists()) return existing.data();

  const pet = await getPetById(petId);
  if (!pet) throw new Error('Pet não encontrado');

  const payload = {
    pet_id: petId,
    user_id: userId,
    user_name: actor?.displayName || '',
    user_photo: actor?.photoURL || '',
    status: 'pending',
    created_at: serverTimestamp(),
  };
  // Respostas do formulário de adoção montado na plataforma (item 5). Só grava
  // quando há de fato respostas — mantém o documento enxuto para pets sem form.
  if (formAnswers && typeof formAnswers === 'object' && Object.keys(formAnswers).length > 0) {
    payload.form_answers = formAnswers;
  }

  await setDoc(ref, payload);

  // Notifica o dono do pet
  await createNotification({
    userId: pet.owner_id,
    title: 'Novo interesse em adoção!',
    message: `${actor?.displayName || 'Alguém'} demonstrou interesse em ${pet.title || pet.name || 'seu pet'}.`,
    type: NOTIFICATION_TYPE.ADOPTION_INTEREST,
    link: `/pets/${petId}?tab=interests`,
    actor: { uid: userId, displayName: actor?.displayName },
  });

  await createAuditLog({ action: 'adoption_interest_registered', actor, details: { pet_id: petId } });
  return { id, pet_id: petId, user_id: userId, status: 'pending' };
}

/** Lista todos os interessados em um pet (visão do dono). */
export async function getInterestsByPet(petId) {
  if (!db || !petId) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('pet_id', '==', petId), orderBy('created_at', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Lista todos os interesses de um adotante. */
export async function getInterestsByUser(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(
    query(collection(db, COLLECTION), where('user_id', '==', userId), orderBy('created_at', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Verifica se um usuário já demonstrou interesse em um pet. */
export async function hasInterest(petId, userId) {
  if (!db || !petId || !userId) return false;
  const snap = await getDoc(doc(db, COLLECTION, interestId(petId, userId)));
  return snap.exists();
}

/** Atualiza o status de um interesse (aprovado, rejeitado, chat aberto). */
export async function updateInterestStatus(petId, userId, status, actor, options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  const id = interestId(petId, userId);
  await updateDoc(doc(db, COLLECTION, id), { status, updated_at: serverTimestamp() });

  // Ao abrir uma conversa com um candidato, o pet entra em processo de adoção.
  if (status === 'chat_opened') {
    const pet = await getPetById(petId);
    if (pet?.status === 'available') {
      await updatePet(petId, { status: 'in_process' }, actor);
    }
  }

  const notifType = status === 'rejected' ? NOTIFICATION_TYPE.ADOPTION_REJECTED : NOTIFICATION_TYPE.ADOPTION_MATCH;
  const message = status === 'rejected'
    ? 'Infelizmente seu interesse não foi selecionado desta vez.'
    : 'Boa notícia! O responsável pelo pet quer conversar com você.';

  await createNotification({
    userId,
    title: status === 'rejected' ? 'Interesse não selecionado' : 'Interesse aprovado!',
    message,
    type: notifType,
    link: status !== 'rejected'
      ? (options.conversationId ? `/chat?c=${options.conversationId}` : '/chat')
      : '/feed',
    actor: { uid: actor?.uid, displayName: actor?.displayName },
  });

  await createAuditLog({ action: 'interest_status_updated', actor, details: { pet_id: petId, user_id: userId, status } });
}
