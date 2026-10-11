/**
 * @fileoverview Public mirrors — Cloud Functions v2 (TASK-939 / TASK-949).
 *
 * Escreve os espelhos públicos lidos anonimamente pelas páginas
 * /vitrines, /vitrines/:id, /eventos e /lares-temporarios:
 *   clubs/{clubId}/exhibitions/{id}  →  exhibitions_public/{id}
 *   clubs/{clubId}/fosters/{id}      →  foster_placements_public/{id}
 *
 * Segurança: só o Admin SDK escreve (firestore.rules: read true / write false).
 * Campos projetados pela allowlist em publicMirrorsCore.js (zero PII).
 *
 * Backfill one-shot: scripts/backfill-public-mirrors.mjs
 */

'use strict';

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, getApps } = require('firebase-admin/app');
const { logger } = require('firebase-functions');
const { buildExhibitionPublicDoc, buildFosterPublicDoc } = require('./publicMirrorsCore');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

if (!global.__viralataInitialized && getApps().length === 0) {
  initializeApp();
  global.__viralataInitialized = true;
}
const db = getFirestore(DATABASE_ID);

async function readDoc(path) {
  const snap = await db.doc(path).get();
  return snap.exists ? snap.data() : null;
}

async function upsertOrDelete(path, doc) {
  if (doc) {
    await db.doc(path).set(doc, { merge: false });
    logger.info(`${path} mirrored`);
  } else {
    await db.doc(path).delete().catch(() => {});
    logger.info(`${path} removed`);
  }
}

exports.onExhibitionWriteMirror = onDocumentWritten(
  { document: 'clubs/{clubId}/exhibitions/{exhibitionId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const { clubId, exhibitionId } = event.params;
    const exhibition = event.data?.after.data() ?? null;
    try {
      const club = exhibition ? await readDoc(`clubs/${clubId}`) : null;
      const doc = buildExhibitionPublicDoc({ id: exhibitionId, clubId, exhibition, club });
      await upsertOrDelete(`exhibitions_public/${exhibitionId}`, doc);
    } catch (err) {
      logger.error('onExhibitionWriteMirror error:', err);
    }
  },
);

exports.onFosterWriteMirror = onDocumentWritten(
  { document: 'clubs/{clubId}/fosters/{fosterId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const { clubId, fosterId } = event.params;
    const placement = event.data?.after.data() ?? null;
    try {
      const [club, pet] = placement
        ? await Promise.all([readDoc(`clubs/${clubId}`), placement.pet_id ? readDoc(`pets/${placement.pet_id}`) : null])
        : [null, null];
      const doc = buildFosterPublicDoc({ id: fosterId, clubId, placement, pet, club });
      await upsertOrDelete(`foster_placements_public/${fosterId}`, doc);
    } catch (err) {
      logger.error('onFosterWriteMirror error:', err);
    }
  },
);
