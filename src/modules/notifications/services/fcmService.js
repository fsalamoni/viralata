/**
 * @fileoverview fcmService — token management do Firebase Cloud Messaging.
 *
 * Por que existe: notificações push para shift reminders, BG check status,
 * milestones do programa de voluntários (TASK-222/229).
 *
 * iOS Safari limitation: FCM só funciona em PWAs instaladas na home screen.
 * Fallback automático para email se messaging permission for negada ou
 * browser não suportar.
 *
 * Token storage: `users/{uid}.fcm_tokens[]` é um array de
 * `{ token, created_at, platform, last_used_at }`. Permite múltiplos
 * devices por usuário (web + mobile).
 *
 * Token rotation: FCM tokens podem ser rotacionados pelo Google. O handler
 * `onTokenRefresh` deve chamar `unregisterFCMToken(oldToken)` antes de
 * `registerFCMToken(uid)`. (TASK-229 inclui esse handler.)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22
 * @see TASK-229
 */

import { doc, setDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db, getMessagingInstance } from '@/core/config/firebase';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

/**
 * Pede permissão para notificações. Retorna:
 *   - 'granted'   → user aceitou
 *   - 'denied'    → user bloqueou
 *   - 'default'   → dismissou sem decidir
 *   - 'unsupported' → browser não suporta Notification API
 */
export async function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Registra o device atual para receber push notifications.
 * Salva o token em `users/{uid}.fcm_tokens[]`.
 *
 * @param {string} uid
 * @returns {Promise<{ok: boolean, token?: string, reason?: string, error?: string}>}
 */
export async function registerFCMToken(uid) {
  if (!uid) return { ok: false, reason: 'no_uid' };
  if (!VAPID_KEY) return { ok: false, reason: 'no_vapid_key' };

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'permission_denied', permission };
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return { ok: false, reason: 'unsupported' };

  try {
    const { getToken } = await import('firebase/messaging');
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return { ok: false, reason: 'no_token' };

    await setDoc(doc(db, 'users', uid), {
      fcm_tokens: arrayUnion({
        token,
        created_at: serverTimestamp(),
        last_used_at: serverTimestamp(),
        platform: 'web',
      }),
    }, { merge: true });

    return { ok: true, token };
  } catch (err) {
    console.error('[fcmService] registerFCMToken failed:', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Remove um token do array do usuário (logout, token rotation, opt-out).
 *
 * @param {string} uid
 * @param {string} token
 */
export async function unregisterFCMToken(uid, token) {
  if (!uid || !token) return { ok: false, reason: 'missing_params' };
  try {
    await setDoc(doc(db, 'users', uid), {
      fcm_tokens: arrayRemove({ token }),
    }, { merge: true });
    return { ok: true };
  } catch (err) {
    console.error('[fcmService] unregisterFCMToken failed:', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Registra handler para mensagens em foreground (app aberto).
 * Retorna função de unsubscribe.
 *
 * @param {(payload: import('firebase/messaging').MessagePayload) => void} callback
 * @returns {Promise<() => void>}
 */
export async function onForegroundMessage(callback) {
  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};
  const { onMessage } = await import('firebase/messaging');
  return onMessage(messaging, callback);
}
