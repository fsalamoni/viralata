/**
 * _smokeFirebaseAdmin.mjs — Firebase Admin SDK setup para smoke tests.
 *
 * Tenta carregar firebase-admin do functions/node_modules (deploy local)
 * ou instala dinamicamente. Em prod/staging retorna null (requer
 * SERVICE_ACCOUNT_JSON).
 *
 * Uso:
 *   import { getAdminDb, getAdminAuth } from './_smokeFirebaseAdmin.mjs';
 *   const adminDb = await getAdminDb();
 *   // null = usa callable path
 */

import { createRequire } from 'node:module';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ── Try to load firebase-admin from multiple locations ──────────────
let _adminModule = null;
const searchPaths = [
  resolve(__dirname, '../functions/node_modules/firebase-admin'),
  resolve(__dirname, '../node_modules/firebase-admin'),
];

for (const p of searchPaths) {
  try {
    _adminModule = require(p);
    break;
  } catch {
    // try next
  }
}

// ── Env ─────────────────────────────────────────────────────────────
const TARGET = process.env.SMOKE_TARGET || 'emulator';
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID || 'viralata-demo';
const FIRESTORE_PORT = process.env.FIRESTORE_EMULATOR_PORT || '8080';
const AUTH_PORT = process.env.AUTH_EMULATOR_PORT || '9099';

let _app = null;
let _auth = null;
let _db = null;

/**
 * Inicializa Firebase Admin SDK (se possível).
 * Retorna null se não conseguir (script deve usar callable path).
 */
export async function getAdminApp() {
  if (_app) return _app;
  if (!_adminModule) {
    console.warn('[smoke-admin] firebase-admin não encontrado — usando callable path');
    return null;
  }

  try {
    const admin = _adminModule;
    const appName = `smoke-admin-${Date.now()}`;

    if (TARGET === 'emulator') {
      // Emulador: usa credential padrão com projectId
      try {
        _app = admin.initializeApp({
          projectId: PROJECT_ID,
          credential: admin.credential.applicationDefault(),
        }, appName);
      } catch (appErr) {
        // App já existe — reutiliza
        try {
          _app = admin.getApp(appName);
        } catch {
          // Última tentativa: app padrão
          if (admin.apps.length > 0) {
            _app = admin.apps[0];
          } else {
            _app = admin.initializeApp({ projectId: PROJECT_ID }, appName);
          }
        }
      }

      // Conecta ao emulador via FIRESTORE_EMULATOR_HOST env
      try {
        const host = process.env.FIRESTORE_EMULATOR_HOST || `127.0.0.1:${FIRESTORE_PORT}`;
        const db = admin.firestore();
        db.settings({
          host: `http://${host}`,
          port: parseInt(FIRESTORE_PORT, 10),
          projectId: PROJECT_ID,
          ssl: false,
        });
        process.env['FIRESTORE_EMULATOR_HOST'] = `127.0.0.1:${FIRESTORE_PORT}`;
        process.env['FIREBASE_AUTH_EMULATOR_HOST'] = `127.0.0.1:${AUTH_PORT}`;
      } catch (settingsErr) {
        console.warn('[smoke-admin] settings falhou (não crítico):', String(settingsErr).slice(0, 80));
      }
    } else {
      // Prod/staging: requer GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_CONFIG
      const hasCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIREBASE_CONFIG;
      if (!hasCreds) {
        console.warn('[smoke-admin] Prod/staging sem service account — usando callable path');
        return null;
      }
      try {
        if (admin.apps.length > 0) {
          _app = admin.apps[0];
        } else {
          _app = admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });
        }
      } catch {
        return null;
      }
    }

    return _app;
  } catch (err) {
    console.warn('[smoke-admin] Inicialização falhou:', String(err).slice(0, 80));
    return null;
  }
}

/** Retorna Auth Admin instance. */
export async function getAdminAuth() {
  if (_auth) return _auth;
  if (!_adminModule) return null;
  const app = await getAdminApp();
  if (!app) return null;
  try {
    _auth = _adminModule.auth(app);
    return _auth;
  } catch {
    return null;
  }
}

/** Retorna Firestore Admin instance. */
export async function getAdminDb() {
  if (_db) return _db;
  if (!_adminModule) return null;
  const app = await getAdminApp();
  if (!app) return null;
  try {
    _db = _adminModule.firestore(app);
    return _db;
  } catch {
    return null;
  }
}
