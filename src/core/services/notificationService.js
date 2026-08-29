/**
 * Serviço de notificações — cria avisos que aparecem no sino do cabeçalho.
 *
 * A coleção `notifications` é lida em tempo real por `useNotifications`
 * (onSnapshot filtrando por `user_id`). Aqui ficam apenas as ESCRITAS.
 *
 * Decisões de robustez:
 *  - Defensivo: nunca lança erro para o chamador. Notificar é um efeito
 *    colateral e jamais deve interromper o fluxo principal (enviar mensagem,
 *    comentar, etc.). Falhas são apenas logadas.
 *  - O ator (quem gera o evento) nunca é notificado de si mesmo.
 *  - Escritas em lote (writeBatch) para vários destinatários.
 */

import { collection, doc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

export const NOTIFICATION_COLLECTION = 'notifications';

/**
 * Notificações acionáveis (Fase 0 — SHELTER_ACTIONABLE_NOTIFICATIONS_V1).
 *
 * Uma notificação pode carregar uma AÇÃO executável inline (ex.: aceitar ou
 * recusar um convite direto no sino). Os campos abaixo são ADITIVOS e
 * retrocompatíveis: notificações antigas simplesmente não os possuem e a UI
 * as trata como não-acionáveis. Escrever esses campos é inofensivo mesmo com
 * a flag OFF — a UI só renderiza os botões quando a flag está ON.
 */
export const NOTIFICATION_ACTION_KIND = Object.freeze({
  // Convite de membro de organização/abrigo (club_member_invites)
  CLUB_INVITE: 'club_invite',
});

export const NOTIFICATION_ACTION_STATE = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  EXPIRED: 'expired',
});

const ACTION_KIND_VALUES = new Set(Object.values(NOTIFICATION_ACTION_KIND));
const ACTION_STATE_VALUES = new Set(Object.values(NOTIFICATION_ACTION_STATE));

/**
 * Sanitiza `action_ref`: mantém apenas pares chave→(string|número|boolean),
 * limitando tamanho e quantidade de chaves. Objetos aninhados/valores
 * inesperados são descartados (evita `undefined`, que o Firestore rejeita).
 */
function sanitizeActionRef(ref) {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) return null;
  const out = {};
  let count = 0;
  for (const [k, v] of Object.entries(ref)) {
    if (count >= 12) break;
    const key = String(k).slice(0, 60);
    if (typeof v === 'string') out[key] = v.slice(0, 300);
    else if (typeof v === 'number' && Number.isFinite(v)) out[key] = v;
    else if (typeof v === 'boolean') out[key] = v;
    else continue;
    count += 1;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Constrói os campos de ação (aditivos). SEMPRE retorna as três chaves — com
 * `null` quando não há ação — porque o Firestore rejeita `undefined`.
 * @param {{kind?: string, ref?: object, state?: string}} [action]
 */
export function buildNotificationActionFields(action) {
  const kind = action?.kind;
  if (!kind || !ACTION_KIND_VALUES.has(kind)) {
    return { action_kind: null, action_ref: null, action_state: null };
  }
  const state = ACTION_STATE_VALUES.has(action?.state)
    ? action.state
    : NOTIFICATION_ACTION_STATE.PENDING;
  return {
    action_kind: kind,
    action_ref: sanitizeActionRef(action?.ref),
    action_state: state,
  };
}

/** Tipos de notificação conhecidos (para ícones/agrupamento futuro). */
export const NOTIFICATION_TYPE = Object.freeze({
  // TASK-174: broadcast segmentado do admin master
  ADMIN_BROADCAST: 'admin_broadcast',
  // Chat
  CHAT_MESSAGE: 'chat_message',
  CHAT_INVITE: 'chat_invite',
  // Adoção
  ADOPTION_INTEREST: 'adoption_interest',
  ADOPTION_MATCH: 'adoption_match',
  ADOPTION_REJECTED: 'adoption_rejected',
  ADOPTION_COMPLETED: 'adoption_completed',
  // Pets
  PET_STATUS_CHANGED: 'pet_status_changed',
  PET_RADAR_MATCH: 'pet_radar_match',
  // Organizações (coleções `club_*` — ver domain/constants.js do módulo)
  CLUB_INVITE: 'club_invite',
  CLUB_INVITE_ACCEPTED: 'club_invite_accepted',
  CLUB_JOIN_REQUEST: 'club_join_request',
  CLUB_JOIN_APPROVED: 'club_join_approved',
  CLUB_JOIN_REJECTED: 'club_join_rejected',
  CLUB_EVENT_PUBLISHED: 'club_event_published',
  EVENT_INVITE: 'event_invite',
  // Fórum
  FORUM_REPLY: 'forum_reply',
  FORUM_MENTION: 'forum_mention',
  // Plataforma
  PROFILE_REMINDER: 'profile_reminder',
  GENERIC: 'generic',
});

function trimText(value, max) {
  const text = String(value ?? '').trim();
  return max ? text.slice(0, max) : text;
}

export function normalizeNotificationLink(link) {
  const raw = trimText(link, 400);
  if (!raw) return null;
  try {
    const safeBase = 'http://localhost';
    const parsed = new URL(raw, safeBase);
    const isAbsolute = /^https?:\/\//i.test(raw);
    if (isAbsolute) {
      const currentOrigin = typeof window !== 'undefined' ? window.location?.origin : null;
      if (!currentOrigin || parsed.origin !== currentOrigin) return null;
    }
    const pathname = decodeURIComponent(parsed.pathname);
    if (!pathname.startsWith('/')) return null;
    if (pathname.split('/').some((segment) => segment === '..')) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    logger.warn('Link de notificação inválido ignorado:', raw);
    return null;
  }
}

export function getNotificationFallbackLink(type) {
  switch (type) {
    case NOTIFICATION_TYPE.CHAT_MESSAGE:
    case NOTIFICATION_TYPE.CHAT_INVITE:
      return '/chat';
    case NOTIFICATION_TYPE.ADOPTION_INTEREST:
    case NOTIFICATION_TYPE.PET_STATUS_CHANGED:
      return '/meus-pets';
    case NOTIFICATION_TYPE.ADOPTION_MATCH:
    case NOTIFICATION_TYPE.ADOPTION_REJECTED:
    case NOTIFICATION_TYPE.ADOPTION_COMPLETED:
    case NOTIFICATION_TYPE.PET_RADAR_MATCH:
      return '/feed';
    case NOTIFICATION_TYPE.CLUB_INVITE:
    case NOTIFICATION_TYPE.CLUB_INVITE_ACCEPTED:
    case NOTIFICATION_TYPE.CLUB_JOIN_REQUEST:
    case NOTIFICATION_TYPE.CLUB_JOIN_APPROVED:
    case NOTIFICATION_TYPE.CLUB_JOIN_REJECTED:
    case NOTIFICATION_TYPE.CLUB_EVENT_PUBLISHED:
    case NOTIFICATION_TYPE.EVENT_INVITE:
    case NOTIFICATION_TYPE.FORUM_REPLY:
    case NOTIFICATION_TYPE.FORUM_MENTION:
      return '/comunidade';
    case NOTIFICATION_TYPE.PROFILE_REMINDER:
      return '/onboarding';
    default:
      return '/feed';
  }
}

export function resolveNotificationTarget(notification) {
  return normalizeNotificationLink(notification?.link) || getNotificationFallbackLink(notification?.type);
}

/** Normaliza e remove duplicados/vazios de uma lista de uids destinatários. */
function normalizeRecipients(userIds, actorId) {
  const set = new Set();
  (Array.isArray(userIds) ? userIds : [userIds]).forEach((id) => {
    const uid = String(id || '').trim();
    if (uid && uid !== actorId) set.add(uid);
  });
  return Array.from(set);
}

function buildPayload({ userId, title, message, type, link, actor, action }) {
  return {
    user_id: userId,
    title: trimText(title, 140) || 'Nova atividade',
    message: trimText(message, 300),
    type: type || NOTIFICATION_TYPE.GENERIC,
    link: normalizeNotificationLink(link),
    actor_id: actor?.uid || null,
    actor_name: trimText(actor?.displayName || actor?.name, 140) || null,
    read: false,
    read_at: null,
    created_at: serverTimestamp(),
    created_at_ms: Date.now(),
    ...buildNotificationActionFields(action),
  };
}

/**
 * Cria uma notificação para um único usuário. Best-effort.
 */
export async function createNotification({ userId, title, message, type, link, actor, action } = {}) {
  if (!db || !userId) return;
  if (actor?.uid && actor.uid === userId) return; // não notifica a si mesmo
  try {
    const ref = doc(collection(db, NOTIFICATION_COLLECTION));
    const batch = writeBatch(db);
    batch.set(ref, buildPayload({ userId, title, message, type, link, actor, action }));
    await batch.commit();
  } catch (err) {
    logger.error('Falha ao criar notificação:', err);
  }
}

/**
 * Cria a mesma notificação para vários usuários (exceto o ator). Best-effort.
 * Divide em lotes de 400 operações para respeitar o limite do Firestore (500).
 */
export async function notifyUsers(userIds, { title, message, type, link, actor, action } = {}) {
  if (!db) return;
  const recipients = normalizeRecipients(userIds, actor?.uid);
  if (recipients.length === 0) return;
  try {
    const CHUNK = 400;
    for (let i = 0; i < recipients.length; i += CHUNK) {
      const slice = recipients.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      slice.forEach((uid) => {
        const ref = doc(collection(db, NOTIFICATION_COLLECTION));
        batch.set(ref, buildPayload({ userId: uid, title, message, type, link, actor, action }));
      });
      await batch.commit();
    }
  } catch (err) {
    logger.error('Falha ao notificar usuários:', err);
  }
}

/**
 * Atualiza o estado da ação de uma notificação acionável (ex.: depois de o
 * dono aceitar/recusar um convite inline). Diferente das escritas acima, esta
 * função PROPAGA erros: o chamador (UI) precisa saber se a resposta gravou
 * para dar feedback. Só o dono da notificação pode atualizá-la (regra
 * Firestore `notifications`). Marca como lida por padrão.
 * @param {string} notificationId
 * @param {string} state — um de NOTIFICATION_ACTION_STATE
 * @param {{markRead?: boolean}} [opts]
 */
export async function updateNotificationActionState(notificationId, state, { markRead = true } = {}) {
  if (!db || !notificationId) throw new Error('Notificação inválida.');
  if (!ACTION_STATE_VALUES.has(state)) throw new Error('Estado de ação inválido.');
  const patch = { action_state: state };
  if (markRead) {
    patch.read = true;
    patch.read_at = serverTimestamp();
  }
  await updateDoc(doc(db, NOTIFICATION_COLLECTION, notificationId), patch);
}
