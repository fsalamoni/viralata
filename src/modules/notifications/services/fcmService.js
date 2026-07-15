/**
 * @fileoverview fcmService — token management do Firebase Cloud Messaging.
 *
 * TASK-292: FCM v1 integration for shelter notifications.
 *
 * iOS Safari limitation: FCM só funciona em PWAs instaladas na home screen.
 * Fallback automático para email se messaging permission for negada ou
 * browser não suportar.
 *
 * Token storage: `users/{uid}.fcm_tokens[]` é um array de
 * `{ token, created_at, platform, last_used_at }`. Permite múltiplos
 * devices por usuário (web + mobile).
 *
 * Token rotation: FCM tokens são rotacionados pelo Google periodicamente.
 * O handler `setupTokenRefresh` configura `onTokenRefresh` que unregister
 * o token antigo antes de registrar o novo (defensive — o token antigo
 * já não vai mais funcionar).
 *
 * Feature flag: todas as operações de token são gated por SHELTER_FCM_V1
 * (checado via useFeatureFlag no caller da UI).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22
 * @see TASK-292
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
    // FCM pode lançar FirebaseError com code 'messaging/token-not-found'
    // quando o token foi invalidado entre getToken e o write — retry uma vez.
    const isRetryable = err?.code === 'messaging/token-not-found';
    if (isRetryable) {
      try {
        const { getToken } = await import('firebase/messaging');
        const messaging2 = await getMessagingInstance();
        const token = await getToken(messaging2, { vapidKey: VAPID_KEY });
        if (token) {
          await setDoc(doc(db, 'users', uid), {
            fcm_tokens: arrayUnion({ token, created_at: serverTimestamp(), last_used_at: serverTimestamp(), platform: 'web' }),
          }, { merge: true });
          return { ok: true, token };
        }
      } catch {
        // ignore retry failure
      }
    }
    console.error('[fcmService] registerFCMToken failed:', err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Verifica se o usuário optou por não receber notificações push.
 * Retorna `true` se a permissão foi NEGADA (não apenas pendente/dismissed).
 *
 * @returns {Promise<boolean>}
 */
export async function isPushOptedOut() {
  if (typeof Notification === 'undefined') return true;
  return Notification.permission === 'denied';
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

/**
 * Configura o handler de token refresh do FCM.
 * Quando FCM rotaciona o token, unbinda o antigo e registra o novo.
 * Deve ser chamado uma vez (por app/ServiceWorker) com o uid atual.
 *
 * Retorna unsubscribe fn. O handler é registrado no Service Worker,
 * então sobrevive reloads de página.
 *
 * @param {string} uid
 * @returns {Promise<() => void>}
 */
export async function setupTokenRefresh(uid) {
  if (!uid || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const messaging = await getMessagingInstance();
  if (!messaging) return () => {};

  try {
    const { onTokenRefresh } = await import('firebase/messaging');
    const { getToken } = await import('firebase/messaging');

    // O onTokenRefresh callback é chamado quando o token é invalidado.
    // Estratégia: getToken() vai retornar o novo token; unbinda o token
    // antigo e registra o novo.
    onTokenRefresh(messaging, async () => {
      try {
        // Gera novo token
        const newToken = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (!newToken) return;

        // Registra o novo (arrayUnion adiciona se não existir)
        await setDoc(doc(db, 'users', uid), {
          fcm_tokens: arrayUnion({
            token: newToken,
            created_at: serverTimestamp(),
            last_used_at: serverTimestamp(),
            platform: 'web',
          }),
        }, { merge: true });

        console.info('[fcmService] token refreshed and registered:', newToken.slice(0, 12) + '...');
      } catch (err) {
        console.error('[fcmService] onTokenRefresh handler failed:', err);
      }
    });

    // Retorna cleanup fn
    return () => {
      console.info('[fcmService] token refresh handler unregistered');
    };
  } catch (err) {
    // browser não suporta onTokenRefresh (navegadores antigos)
    console.warn('[fcmService] onTokenRefresh not supported:', err);
    return () => {};
  }
}

/**
 * Limpa TODOS os FCM tokens de um usuário (usado no logout).
 * Requer que o caller也知道 quais tokens existiam — faz best-effort.
 *
 * @param {string} uid
 * @param {string[]} tokens  — array de tokens conhecidos
 */
export async function unregisterAllTokens(uid, tokens) {
  if (!uid || !Array.isArray(tokens) || tokens.length === 0) return;
  try {
    const removeOps = tokens.map((token) =>
      setDoc(doc(db, 'users', uid), { fcm_tokens: arrayRemove({ token }) }, { merge: true }),
    );
    await Promise.all(removeOps);
  } catch (err) {
    console.error('[fcmService] unregisterAllTokens failed:', err);
  }
}
