/**
 * @fileoverview notificationPrefsService — CRUD das preferências de notificação do user.
 *
 * TASK-PREFERENCIAS-1: novo doc em `users/{uid}/prefs/notifications` com:
 *  - email_notifications: bool (master switch)
 *  - interest_received: bool (alguém demonstrou interesse em um pet meu)
 *  - interest_accepted: bool (meu interesse foi aceito)
 *  - interest_rejected: bool (meu interesse foi rejeitado)
 *  - chat_message: bool (nova mensagem no chat)
 *  - adoption_completed: bool (adoção concluída)
 *  - weekly_digest: bool (resumo semanal de atividades)
 *  - product_updates: bool (novidades do Viralata)
 *
 * @see src/pages/Preferences.jsx
 */
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

const DEFAULT_PREFS = Object.freeze({
  email_notifications: true,
  interest_received: true,
  interest_accepted: true,
  interest_rejected: true,
  chat_message: true,
  adoption_completed: true,
  weekly_digest: false,
  product_updates: true,
});

function prefsRef(uid) {
  return doc(db, 'users', uid, 'prefs', 'notifications');
}

/**
 * Lê as preferências (uma vez). Retorna defaults se não existir.
 */
export async function getNotificationPrefs(uid) {
  if (!db || !uid) return { ...DEFAULT_PREFS };
  try {
    const snap = await getDoc(prefsRef(uid));
    if (!snap.exists()) return { ...DEFAULT_PREFS };
    return { ...DEFAULT_PREFS, ...snap.data() };
  } catch (err) {
    console.warn('[notifPrefs] getNotificationPrefs falhou:', err);
    return { ...DEFAULT_PREFS };
  }
}

/**
 * Salva as preferências (merge).
 */
export async function setNotificationPrefs(uid, prefs) {
  if (!db || !uid) throw new Error('uid obrigatório');
  await setDoc(prefsRef(uid), {
    ...prefs,
    updated_at: new Date().toISOString(),
  }, { merge: true });
}

/**
 * Observa as preferências em tempo real.
 */
export function subscribeNotificationPrefs(uid, cb) {
  if (!db || !uid) {
    cb({ ...DEFAULT_PREFS });
    return () => {};
  }
  try {
    return onSnapshot(prefsRef(uid), (snap) => {
      if (!snap.exists()) {
        cb({ ...DEFAULT_PREFS });
      } else {
        cb({ ...DEFAULT_PREFS, ...snap.data() });
      }
    }, (err) => {
      console.warn('[notifPrefs] subscribeNotificationPrefs erro:', err);
      cb({ ...DEFAULT_PREFS });
    });
  } catch (err) {
    console.warn('[notifPrefs] subscribe falhou:', err);
    cb({ ...DEFAULT_PREFS });
    return () => {};
  }
}

export { DEFAULT_PREFS };
