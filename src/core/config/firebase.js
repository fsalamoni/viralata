import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

const requiredFirebaseConfig = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.appId,
];

export const firebaseServicesEnabled = requiredFirebaseConfig.every(Boolean);
export const firebaseDisabledReason = firebaseServicesEnabled
  ? null
  : 'Firebase não está configurado neste ambiente local.';

export const app = firebaseServicesEnabled ? initializeApp(firebaseConfig) : null;

const firestoreDatabaseId = import.meta.env.VITE_FIRESTORE_DATABASE_ID || 'viralata';
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app, firestoreDatabaseId) : null;
export const functions = app ? getFunctions(app, 'southamerica-east1') : null;
export const storage = app ? getStorage(app) : null;

let _messaging = null;
let _messagingInit = null;

/**
 * Retorna a instância do Firebase Messaging (FCM) se suportada pelo browser.
 *
 * Por que lazy: FCM só funciona em browsers com Service Worker + Push API
 * (Chrome, Firefox, Edge). Safari iOS só suporta em PWAs instaladas na home
 * screen. Retornar `null` em ambientes não suportados permite fallback para
 * email no caller.
 *
 * @returns {Promise<Messaging|null>}
 */
export async function getMessagingInstance() {
  if (!app) return null;
  if (_messaging) return _messaging;
  if (_messagingInit) return _messagingInit;
  if (typeof window === 'undefined') return null;
  _messagingInit = (async () => {
    const { getMessaging, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) return null;
    _messaging = getMessaging(app);
    return _messaging;
  })();
  return _messagingInit;
}

export const googleProvider = auth ? new GoogleAuthProvider() : null;
googleProvider?.setCustomParameters({ prompt: 'select_account' });

const isBrowser = typeof window !== 'undefined';
const hasMeasurementId = Boolean(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID);
const analyticsEnabled = isBrowser && hasMeasurementId && import.meta.env.VITE_ENABLE_FIREBASE_ANALYTICS === 'true';
const performanceEnabled = isBrowser && import.meta.env.VITE_ENABLE_FIREBASE_PERFORMANCE === 'true';

export const analyticsPromise = app && analyticsEnabled
  ? import('firebase/analytics')
    .then(async ({ getAnalytics, isSupported }) => (await isSupported() ? getAnalytics(app) : null))
    .catch(() => null)
  : Promise.resolve(null);

export const performancePromise = app && performanceEnabled
  ? import('firebase/performance')
    .then(async ({ getPerformance, isSupported }) => (await isSupported() ? getPerformance(app) : null))
    .catch(() => null)
  : Promise.resolve(null);

if (app && auth && db && functions && import.meta.env.VITE_FIREBASE_USE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    if (storage) connectStorageEmulator(storage, 'localhost', 9199);
  } catch {
    // already connected
  }
}

// ─── App Check (Fase 20 — TASK-226) ────────────────────────────────────
// Bot defense global. reCAPTCHA Enterprise como provedor primário;
// o provider consome o site key do env. Se o key não estiver configurado,
// App Check é desabilitado (modo permissivo) e a defesa fica por conta
// das Cloud Functions e do hCaptcha client-side (VolunteerSignupCaptcha).
//
// Bypass: DEV e emulador (App Check quebra testes locais). Em produção,
// o firestore.rules checa `request.auth.token.app_check == true`.
let appCheckInstance = null;
export function getAppCheckInstance() {
  if (appCheckInstance) return appCheckInstance;
  if (typeof window === 'undefined') return null;
  if (!app) return null;
  if (import.meta.env.DEV) {
    return null;
  }
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    return null;
  }
  try {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // initializeAppCheck lança se já foi inicializado (HMR) — ignora.
    if (err?.code !== 'appCheck/already-initialized') {
      // eslint-disable-next-line no-console
      console.warn('[appCheck] failed to initialize:', err?.message ?? err);
    }
  }
  return appCheckInstance;
}
