/**
 * @fileoverview Cloud Function: healthAlertsCron (TASK-137).
 *
 * Diária às 08:00 BRT. Varre collectionGroup `medical` com
 * `next_visit_date` na janela de 7 dias e notifica os admins do
 * abrigo (in-app). Núcleo testável em `healthAlertsCore.js`.
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { processHealthAlerts, recordsDueSoon, ALERT_WINDOW_DAYS } = require('./healthAlertsCore');

exports.healthAlertsCron = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const db = admin.firestore();
    const now = Date.now();
    const endIso = new Date(now + ALERT_WINDOW_DAYS * 24 * 3600 * 1000).toISOString();
    const nowIso = new Date(now).toISOString();

    functions.logger.info('healthAlertsCron: starting', { window: [nowIso, endIso] });

    const snap = await db.collectionGroup('medical')
      .where('next_visit_date', '>=', nowIso)
      .where('next_visit_date', '<=', endIso)
      .limit(500)
      .get();

    // Defensive re-filter (fuso/formatos) via núcleo puro.
    const eligible = snap.docs.filter((d) => recordsDueSoon([d.data()], now).length === 1);

    if (eligible.length === 0) {
      functions.logger.info('healthAlertsCron: nothing due');
      return { created: 0 };
    }

    // Resolve admins do abrigo (cacheado por clubId dentro da execução).
    const cache = new Map();
    const resolveAdminUids = async (clubId) => {
      if (cache.has(clubId)) return cache.get(clubId);
      const membersSnap = await db.collection('clubs').doc(clubId)
        .collection('organization_members')
        .where('role', 'in', ['admin', 'owner'])
        .get();
      const uids = membersSnap.docs.map((m) => m.data().user_id).filter(Boolean);
      cache.set(clubId, uids);
      return uids;
    };

    const result = await processHealthAlerts(
      { db },
      eligible,
      resolveAdminUids,
      { error: functions.logger.error, info: functions.logger.info },
    );

    functions.logger.info('healthAlertsCron: done', result);
    return result;
  });
