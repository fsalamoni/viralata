/**
 * @fileoverview Cloud Function: galleryPurgeCron (Fase 10)
 *
 * Scheduled function que varre `pet_photos/` por docs com `deleted_at`
 * há mais de 30 dias. Para cada um:
 *   1. Deleta o arquivo do Storage (path original + thumb)
 *   2. Remove o doc do Firestore
 *
 * Implementa o §11.2 do roadmap (soft delete + purge 30d no Storage).
 *
 * Schedule: todo dia às 04:00 BRT (07:00 UTC). Diferente do CRON de
 * pós-adoção (03:00 BRT) pra não concentrar carga.
 *
 * O núcleo testável está em `galleryPurgeCronCore.js`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.2
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { processGalleryPurge, PURGE_DAYS } = require('./galleryPurgeCronCore');

/**
 * Cloud Function agendada — purga fotos soft-deletadas há >30d.
 * Roda em 07:00 UTC (04:00 BRT) diariamente.
 */
exports.galleryPurgeCron = functions.pubsub
  .schedule('0 7 * * *')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const db = admin.firestore();
    const storage = admin.storage();

    const cutoffIso = new Date(Date.now() - PURGE_DAYS * 24 * 3600 * 1000).toISOString();

    functions.logger.info('galleryPurgeCron: starting', { cutoffIso });

    // Busca docs deletados há mais de 30d
    const photosSnap = await db.collection('pet_photos')
      .where('deleted_at', '<', cutoffIso)
      .limit(200)
      .get();

    if (photosSnap.empty) {
      functions.logger.info('galleryPurgeCron: nothing to purge');
      return { purged: 0 };
    }

    const result = await processGalleryPurge(
      { db, storage },
      photosSnap.docs,
      { error: functions.logger.error, info: functions.logger.info },
    );

    functions.logger.info('galleryPurgeCron: done', { purged: result.purged, errors: result.errors });
    return result;
  });
