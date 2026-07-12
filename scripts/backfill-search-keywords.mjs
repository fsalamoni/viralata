#!/usr/bin/env node
/**
 * Backfill de `search_keywords` em pets existentes (TASK-080, Fase 18).
 *
 * Uso (exige credencial admin — roda fora do browser):
 *   GOOGLE_APPLICATION_CREDENTIALS=sa.json node scripts/backfill-search-keywords.mjs [--dry-run]
 *
 * Idempotente: pula docs cujo search_keywords já bate com o recomputado.
 * Processa em batches de 400 (limite Firestore 500).
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const DRY_RUN = process.argv.includes('--dry-run');

// Réplica do tokenizador do domain (src/modules/shelter/domain/search) —
// o domain é ESM browser-oriented com alias @/, não importável aqui sem
// bundler. Manter em sync com normalizeText/tokenize/buildSearchKeywords.
function normalizeText(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
}
function tokenize(text) {
  return normalizeText(text).split(/\s+/).filter(Boolean);
}
function buildSearchKeywords(fields = {}) {
  const keywords = new Set();
  for (const value of Object.values(fields).filter((v) => typeof v === 'string' && v)) {
    for (const token of tokenize(value)) {
      if (token.length < 2) continue;
      keywords.add(token);
      for (let i = 3; i < token.length && keywords.size < 100; i += 1) keywords.add(token.slice(0, i));
      if (keywords.size >= 100) break;
    }
    if (keywords.size >= 100) break;
  }
  return Array.from(keywords).sort();
}

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const snap = await db.collection('pets').get();
console.log(`pets: ${snap.size} docs`);
let updated = 0;
let batch = db.batch();
let inBatch = 0;
for (const docSnap of snap.docs) {
  const d = docSnap.data();
  const kw = buildSearchKeywords({ name: d.name, title: d.title, breed: d.breed, city: d.city });
  const current = Array.isArray(d.search_keywords) ? d.search_keywords : [];
  if (JSON.stringify(current) === JSON.stringify(kw)) continue;
  updated += 1;
  if (DRY_RUN) continue;
  batch.update(docSnap.ref, { search_keywords: kw });
  inBatch += 1;
  if (inBatch >= 400) {
    await batch.commit();
    batch = db.batch();
    inBatch = 0;
  }
}
if (!DRY_RUN && inBatch > 0) await batch.commit();
console.log(`${DRY_RUN ? '[dry-run] atualizaria' : 'atualizados'}: ${updated} docs`);
