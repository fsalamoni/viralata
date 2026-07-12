/**
 * @fileoverview Cloud Function: scheduledFirestoreBackup (TASK-240).
 *
 * Scheduled function semanal que exporta TODO o Firestore para
 * `gs://<BACKUP_BUCKET>/<YYYY-MM-DD>/`. Compliance:
 *   - AGENTS.md §LGPD: "Backup imutável (WORM) no GCS, lifecycle 90d"
 *   - Lei 14.063/2020 art. 6º: prova de aceite recuperável em desastre
 *
 * Schedule: domingo 05:00 UTC (= 02:00 BRT, America/Sao_Paulo é UTC-3).
 * Bucket:   `BACKUP_BUCKET` env var (default `viralata-backups`).
 * WORM:     enforceado por bucket-level IAM + lifecycle 90d (ver
 *           docs/DR_PLAN.md §Bucket policy).
 * Restore:  `docs/DR_PLAN.md` (runbook).
 *
 * O núcleo testável vive em `backupCronCore.js`. Aqui só amarramos
 * o pubsub schedule e injetamos dependências.
 *
 * @see backupCronCore.js
 * @see docs/DR_PLAN.md
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { FirestoreAdminClient } = require('@google-cloud/firestore').v1;
const { runScheduledBackup, DEFAULT_BUCKET } = require('./backupCronCore');

if (!global.__viralataInitialized) {
  admin.initializeApp();
  global.__viralataInitialized = true;
}

const db = admin.firestore();

/**
 * Cloud Function agendada — export semanal do Firestore para GCS.
 * Roda domingo 05:00 UTC (02:00 BRT).
 */
exports.scheduledFirestoreBackup = functions.pubsub
  .schedule('0 5 * * 0')
  .timeZone('UTC')
  .onRun(async () => {
    const projectId = process.env.GCLOUD_PROJECT
      || process.env.GCP_PROJECT
      || admin.instanceId().app.options.projectId;
    const bucketName = process.env.BACKUP_BUCKET || DEFAULT_BUCKET;

    const client = new FirestoreAdminClient();

    functions.logger.info('scheduledFirestoreBackup: trigger fired', {
      projectId,
      bucketName,
    });

    const result = await runScheduledBackup({
      db,
      client,
      projectId,
      bucketName,
      logger: {
        info: functions.logger.info.bind(functions.logger),
        warn: functions.logger.warn.bind(functions.logger),
        error: functions.logger.error.bind(functions.logger),
      },
    });

    functions.logger.info('scheduledFirestoreBackup: done', result);
    return result;
  });
