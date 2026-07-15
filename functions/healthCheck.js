/**
 * @fileoverview Cloud Function: HTTP GET /healthCheck (TASK-239).
 *
 * Returns JSON { status, version, deps: { firestore, auth, storage }, timestamp }.
 * No auth required — for internal/load-balancer health probes only.
 * Deploy: functions/index.js exports.healthCheck.
 */

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { Storage } = require('@google-cloud/storage');

if (!global.__viralataInitialized && getApps().length === 0) {
  initializeApp();
  global.__viralataInitialized = true;
}

const { getHealth } = require('./healthCheckCore');

const REGION = 'southamerica-east1';

/** HTTP handler — no CORS needed for health probes. */
exports.healthCheck = onRequest(
  { region: REGION, invoker: 'public' },
  async (req, res) => {
    // Only allow GET
    if (req.method !== 'GET') {
      res.status(405).json({ error: 'Method Not Allowed' });
      return;
    }

    const DATABASE_ID = 'viralata';
    try {
      const db = getFirestore(DATABASE_ID);
      const auth = getAuth();
      const storage = new Storage();

      const result = await getHealth({ db, auth, storage });
      const httpStatus = result.status === 'ok' ? 200 : 503;
      res.status(httpStatus).json(result);
    } catch (err) {
      res.status(503).json({
        status: 'error',
        version: require('../package.json').version,
        deps: {},
        timestamp: new Date().toISOString(),
        error: err.message || String(err),
      });
    }
  }
);
