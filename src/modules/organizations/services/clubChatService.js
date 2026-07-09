/**
 * Serviço de Chat dedicado entre um usuário e uma ONG.
 *
 * Modelo:
 *  - A coleção `club_chat_threads` contém UM documento por par
 *    (clube, usuário). Id determinístico: `${clubId}_${uid}` — assim cada
 *    usuário tem no máximo uma thread por ONG.
 *  - As mensagens vivem em subcoleção `messages`.
 *  - O usuário cria a thread na primeira vez que inicia uma conversa.
 *  - A equipe da ONG pode ler todas as threads da ONG e responder.
 *
 * Regras de segurança (firestore.rules) — já implementadas:
 *  - create da thread: auth + thread.user_id == uid.
 *  - read da thread: o próprio user OU membro da ONG.
 *  - create de mensagem: sender_id == uid.
 *  - update da mensagem: só o próprio sender (e só o campo `text`).
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { CLUB_COLLECTIONS, CHAT_THREAD_STATUS, ORG_CHAT_LIMITS } from '../domain/constants.js';
import { normalizeChatMessageInput } from '../domain/validators.js';

const COL = CLUB_COLLECTIONS;

function threadDocId(clubId, userId) {
  return `${clubId}_${userId}`;
}

function trimmed(value) {
  return String(value ?? '').trim();
}

/** Retorna a thread existente ou null. */
export async function getClubChatThread(clubId, userId) {
  if (!db || !clubId || !userId) return null;
  const snap = await getDoc(doc(db, COL.chatThreads, threadDocId(clubId, userId)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Garante que existe uma thread entre `userId` e a ONG `clubId`. Se já
 * existir, retorna a existente (reabre se estiver `archived`). Se não,
 * cria uma nova. Idempotente.
 */
export async function openOrCreateChatThread(club, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!club?.id) throw new Error('Organização inválida.');
  const id = threadDocId(club.id, user.uid);
  const ref = doc(db, COL.chatThreads, id);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data();
    if (data.status === CHAT_THREAD_STATUS.ARCHIVED) {
      await updateDoc(ref, { status: CHAT_THREAD_STATUS.OPEN, updated_at: serverTimestamp() });
    }
    return { id, ...data };
  }
  const payload = {
    id,
    club_id: club.id,
    club_name: trimmed(club.name),
    user_id: user.uid,
    user_name: profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Usuário',
    user_email: user.email || '',
    user_photo: profile?.photo_url || user.photoURL || '',
    status: CHAT_THREAD_STATUS.OPEN,
    last_message: '',
    last_message_at_ms: Date.now(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };
  await setDoc(ref, payload);
  await createAuditLog({ action: 'club_chat_thread_opened', actor: user, details: { club_id: club.id } });
  return { id, ...payload };
}

/** Lista as mensagens de uma thread em ordem cronológica. */
export async function listClubChatMessages(threadId) {
  if (!db || !threadId) return [];
  try {
    const snap = await getDocs(
      query(
        collection(db, COL.chatThreads, threadId, COL.chatMessages),
        orderBy('created_at_ms', 'asc'),
      ),
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Fallback sem orderBy (índice pode não estar pronto em ambiente de dev).
    logger.info('listClubChatMessages: fallback sem orderBy', { threadId, err: err?.code });
    const snap = await getDocs(collection(db, COL.chatThreads, threadId, COL.chatMessages));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.created_at_ms || 0) - (b.created_at_ms || 0));
  }
}

/** Envia uma mensagem numa thread. Atualiza `last_message` na thread. */
export async function sendClubChatMessage(threadId, input, user, profile) {
  if (!user?.uid) throw new Error('Usuário não autenticado.');
  if (!threadId) throw new Error('Conversa inválida.');
  const { text } = normalizeChatMessageInput(input);
  const ref = doc(collection(db, COL.chatThreads, threadId, COL.chatMessages));
  const payload = {
    id: ref.id,
    thread_id: threadId,
    sender_id: user.uid,
    sender_name: profile?.platform_name || profile?.full_name || user.displayName || user.email || 'Usuário',
    sender_photo: profile?.photo_url || user.photoURL || '',
    sender_role: profile?.__role || 'user', // 'user' ou 'ong_member' — setado pelo caller
    text: text.slice(0, ORG_CHAT_LIMITS.MESSAGE_MAX),
    edited: false,
    created_at_ms: Date.now(),
    created_at: serverTimestamp(),
  };
  await setDoc(ref, payload);
  await updateDoc(doc(db, COL.chatThreads, threadId), {
    last_message: payload.text,
    last_message_at_ms: payload.created_at_ms,
    last_message_sender_id: user.uid,
    status: CHAT_THREAD_STATUS.OPEN,
    updated_at: serverTimestamp(),
  }).catch(() => {});
  return { id: ref.id, ...payload };
}

/** Edita uma mensagem (somente o próprio autor). */
export async function updateClubChatMessage(threadId, messageId, text) {
  const next = trimmed(text);
  if (!next) throw new Error('Mensagem vazia.');
  await updateDoc(doc(db, COL.chatThreads, threadId, COL.chatMessages, messageId), {
    text: next.slice(0, ORG_CHAT_LIMITS.MESSAGE_MAX),
    edited: true,
    updated_at: serverTimestamp(),
  });
}

/** Exclui uma mensagem (autor ou admin da ONG). */
export async function deleteClubChatMessage(threadId, messageId) {
  await updateDoc(doc(db, COL.chatThreads, threadId, COL.chatMessages, messageId), {
    text: '',
    deleted: true,
    updated_at: serverTimestamp(),
  });
}

/** Fecha / arquiva uma thread. */
export async function setClubChatThreadStatus(threadId, status) {
  await updateDoc(doc(db, COL.chatThreads, threadId), {
    status,
    updated_at: serverTimestamp(),
  });
}

/** Lista as threads de uma ONG (uso da equipe). */
export async function listClubChatThreads(clubId) {
  if (!db || !clubId) return [];
  const snap = await getDocs(query(collection(db, COL.chatThreads), where('club_id', '==', clubId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.last_message_at_ms || 0) - (a.last_message_at_ms || 0));
}

/** Lista as threads de um usuário (uso do próprio usuário). */
export async function listMyClubChatThreads(userId) {
  if (!db || !userId) return [];
  const snap = await getDocs(query(collection(db, COL.chatThreads), where('user_id', '==', userId)));
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.last_message_at_ms || 0) - (a.last_message_at_ms || 0));
}
