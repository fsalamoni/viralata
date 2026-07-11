/**
 * @fileoverview Núcleo puro de `galleryPurgeCron` (testável sem
 * firebase-functions). Contém apenas a lógica de negócio.
 *
 * O teste em `galleryPurgeCron.test.js` importa este módulo (que não
 * depende de firebase-functions) e mocks o firebase-admin no vitest
 * config.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.2
 */

const PURGE_DAYS = 30;
const BATCH_SIZE = 200;

/**
 * Calcula quantos dias se passaram desde uma data ISO.
 * @param {string|null} isoDate
 * @returns {number}
 */
function daysSince(isoDate) {
  if (!isoDate) return 0;
  const ms = Date.now() - new Date(isoDate).getTime();
  return ms / (24 * 3600 * 1000);
}

/**
 * Nucleo puro — processa uma lista de photos do Firestore (docs com
 * `deleted_at` antigo) e deleta do Storage + Firestore.
 *
 * Recebe `db` e `storage` injetados (permite mock nos testes).
 *
 * @param {{ collection: Function, logger: object }} deps
 * @param {Array<{id: string, data: Function, ref: object}>} photos
 * @param {object} logger
 * @returns {Promise<{purged: number, errors: number}>}
 */
async function processGalleryPurge(deps, photos, logger = console) {
  const { db, storage } = deps;

  let purged = 0;
  let errors = 0;
  const batch = db.batch();

  for (const doc of photos) {
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
      logger.error?.('galleryPurgeCron: failed to purge photo', {
        photo_id: doc.id,
        err: String(err?.message || err),
      });
      errors++;
    }
  }

  if (purged > 0) {
    await batch.commit();
  }

  return { purged, errors };
}

module.exports = { daysSince, processGalleryPurge, PURGE_DAYS, BATCH_SIZE };
