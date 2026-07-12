/**
 * @fileoverview Cloud Function: accountPurgeCron (TASK-186 · LGPD
 * Art. 18 VI — exclusão definitiva após 30 dias de soft-delete).
 *
 * Roda diariamente às 07:30 UTC (04:30 BRT), logo após o
 * galleryPurgeCron. Busca `users` com `deleted_at` anterior ao
 * cutoff de 30 dias e faz recursiveDelete (doc + subcoleções).
 *
 * O núcleo testável está em `accountPurgeCronCore.js`.
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { processAccountPurge, PURGE_DAYS, BATCH_LIMIT } = require('./accountPurgeCronCore');

exports.accountPurgeCron = functions.pubsub
  .schedule('30 7 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const db = admin.firestore();
    const cutoff = new Date(Date.now() - PURGE_DAYS * 24 * 3600 * 1000);

    functions.logger.info('accountPurgeCron: starting', { cutoff: cutoff.toISOString() });

    const snap = await db.collection('users')
      .where('deleted_at', '<', cutoff)
      .limit(BATCH_LIMIT)
      .get();

    if (snap.empty) {
      functions.logger.info('accountPurgeCron: nothing to purge');
      return { purged: 0 };
    }

    const result = await processAccountPurge(
      { db },
      snap.docs,
      { error: functions.logger.error, info: functions.logger.info },
    );

    functions.logger.info('accountPurgeCron: done', result);
    return result;
  });
