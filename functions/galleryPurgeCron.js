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
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.2
 */

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

const PURGE_DAYS = 30;
const BATCH_SIZE = 200;

function daysSince(isoDate) {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return ms / (24 * 3600 * 1000);
}

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
      .limit(BATCH_SIZE)
      .get();

    if (photosSnap.empty) {
      functions.logger.info('galleryPurgeCron: nothing to purge');
      return { purged: 0 };
    }

    let purged = 0;
    let errors = 0;
    const batch = db.batch();

    for (const doc of photosSnap.docs) {
      const data = doc.data();
      try {
        // 1. Deletar arquivo do Storage
        if (data.storage_path) {
          const file = storage.bucket().file(data.storage_path);
          await file.delete({ ignoreNotFound: true });
        }
        // 2. Remover doc do Firestore
        batch.delete(doc.ref);
        purged++;
      } catch (err) {
        functions.logger.error('galleryPurgeCron: failed to purge photo', {
          photo_id: doc.id,
          err: String(err?.message || err),
        });
        errors++;
      }
    }

    if (purged > 0) {
      await batch.commit();
    }

    functions.logger.info('galleryPurgeCron: done', { purged, errors });
    return { purged, errors };
  });
