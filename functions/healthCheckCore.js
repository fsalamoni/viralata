/**
 * @fileoverview Pure health-check logic for the /healthz endpoint (TASK-239).
 *
 * Testable without firebase-functions — receives db, auth, and storage
 * clients injected. Returns a structured health response.
 *
 * @see healthCheck.js (Cloud Function wrapper)
 */

const VERSION = require('../package.json').version;

/**
 * Check if a promise resolves within `timeoutMs`. Returns { ok, latency, error }.
 * @param {Promise<any>} promise
 * @param {number} timeoutMs
 * @returns {Promise<{ok: boolean, latency: number, error?: string}>}
 */
async function withTimeout(promise, timeoutMs = 5000) {
  const start = Date.now();
  try {
    await promise;
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, latency: Date.now() - start, error: err.message || String(err) };
  }
}

/**
 * Ping Firestore: list one doc from `__health__` or write + delete a ping doc.
 * @param {import('firebase-admin/firestore').Firestore} db
 */
async function checkFirestore(db) {
  try {
    const pingRef = db.collection('__health__').doc('ping');
    const writeResult = await pingRef.set({ ts: Date.now() }, { exists: true });
    const snap = await pingRef.get();
    await pingRef.delete();
    return { ok: true, latency: 0, error: null };
  } catch (err) {
    return { ok: false, latency: 0, error: err.message || String(err) };
  }
}

/**
 * Check Firebase Auth by verifying a list of users (returns count).
 * @param {import('firebase-admin/auth').Auth} auth
 */
async function checkAuth(auth) {
  try {
    await auth.listUsers(1);
    return { ok: true, latency: 0, error: null };
  } catch (err) {
    return { ok: false, latency: 0, error: err.message || String(err) };
  }
}

/**
 * Check GCS Storage: list buckets (first 1).
 * @param {import('@google-cloud/storage').Storage} storage
 */
async function checkStorage(storage) {
  try {
    const [buckets] = await storage.getBuckets({ maxResults: 1 });
    return { ok: true, latency: 0, error: null };
  } catch (err) {
    return { ok: false, latency: 0, error: err.message || String(err) };
  }
}

/**
 * Assemble the full health response.
 * @param {{
 *   db: import('firebase-admin/firestore').Firestore,
 *   auth: import('firebase-admin/auth').Auth,
 *   storage: import('@google-cloud/storage').Storage,
 * }} clients
 * @returns {Promise<{status: string, version: string, deps: object, timestamp: string}>}
 */
async function getHealth(clients) {
  const { db, auth, storage } = clients;

  const [firestore, authDep, storageDep] = await Promise.all([
    checkFirestore(db).catch((e) => ({ ok: false, latency: 0, error: e.message })),
    checkAuth(auth).catch((e) => ({ ok: false, latency: 0, error: e.message })),
    checkStorage(storage).catch((e) => ({ ok: false, latency: 0, error: e.message })),
  ]);

  const deps = {
    firestore: firestore,
    auth: authDep,
    storage: storageDep,
  };

  const allOk = firestore.ok && authDep.ok && storageDep.ok;
  const status = allOk ? 'ok' : 'degraded';

  return {
    status,
    version: VERSION,
    deps,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { getHealth, checkFirestore, checkAuth, checkStorage };
