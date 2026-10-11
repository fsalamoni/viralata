#!/usr/bin/env node
/**
 * Backfill one-shot dos espelhos públicos (TASK-939 / TASK-949).
 *
 *   exhibitions_public        ← clubs/{clubId}/exhibitions (status scheduled|active|completed)
 *   foster_placements_public  ← clubs/{clubId}/fosters     (status pending|active)
 *
 * Uso (exige credencial admin — roda fora do browser):
 *   GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/backfill-public-mirrors.mjs [--dry-run]
 *
 * Idempotente: set() sobrescreve o espelho; docs fora do allowlist são apagados.
 * Batches de 400 (limite Firestore 500). Mesma projeção dos triggers
 * (functions/publicMirrorsCore.js) — não duplicar lógica aqui.
 */
import { createRequire } from 'node:module';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const require = createRequire(import.meta.url);
const { buildExhibitionPublicDoc, buildFosterPublicDoc } = require('../functions/publicMirrorsCore.js');

const DRY_RUN = process.argv.includes('--dry-run');
const DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'viralata';

initializeApp({ credential: applicationDefault() });
const db = getFirestore(DATABASE_ID);

const clubCache = new Map();
async function club(clubId) {
  if (!clubCache.has(clubId)) {
    const snap = await db.doc(`clubs/${clubId}`).get();
    clubCache.set(clubId, snap.exists ? snap.data() : null);
  }
  return clubCache.get(clubId);
}

let batch = db.batch();
let pending = 0;
const stats = { exhibitions: 0, fosters: 0, removed: 0 };

async function queue(path, doc) {
  if (doc) batch.set(db.doc(path), doc, { merge: false });
  else { batch.delete(db.doc(path)); stats.removed += 1; }
  pending += 1;
  if (pending >= 400) await flush();
}
async function flush() {
  if (!pending) return;
  if (!DRY_RUN) await batch.commit();
  batch = db.batch();
  pending = 0;
}

for (const snap of (await db.collectionGroup('exhibitions').get()).docs) {
  const clubId = snap.ref.parent.parent?.id;
  if (!clubId) continue;
  const doc = buildExhibitionPublicDoc({ id: snap.id, clubId, exhibition: snap.data(), club: await club(clubId) });
  if (doc) stats.exhibitions += 1;
  await queue(`exhibitions_public/${snap.id}`, doc);
}

for (const snap of (await db.collectionGroup('fosters').get()).docs) {
  const clubId = snap.ref.parent.parent?.id;
  if (!clubId) continue;
  const placement = snap.data();
  const petSnap = placement.pet_id ? await db.doc(`pets/${placement.pet_id}`).get() : null;
  const doc = buildFosterPublicDoc({
    id: snap.id, clubId, placement, pet: petSnap?.exists ? petSnap.data() : null, club: await club(clubId),
  });
  if (doc) stats.fosters += 1;
  await queue(`foster_placements_public/${snap.id}`, doc);
}

await flush();
console.log(`${DRY_RUN ? '[dry-run] ' : ''}espelhados: vitrines=${stats.exhibitions} lares=${stats.fosters} removidos=${stats.removed}`);
