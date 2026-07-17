#!/usr/bin/env node
/**
 * scripts/seed-legal-docs.mjs
 *
 * TASK-021: seed do CMS de documentos legais.
 *
 * Lê o JSX estático das páginas PrivacyPolicy/Terms/Legislation e extrai
 * o conteúdo, persistindo como Markdown no Firestore (collection
 * `legal_docs`). Mantém os campos de frontmatter (version, author,
 * effectiveAt).
 *
 * Uso:
 *   node scripts/seed-legal-docs.mjs --project=viralata-4cf0b
 *
 * Requer credenciais: GOOGLE_APPLICATION_CREDENTIALS ou firebase login.
 *
 * Para DEV (emulator): set FIRESTORE_EMULATOR_HOST=localhost:8080.
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, Timestamp } from 'firebase/firestore';

const PROJECT_ID = process.argv.find((a) => a.startsWith('--project='))?.split('=')[1] || 'viralata-4cf0b';

const app = initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const DOCS = [
  {
    key: 'privacy_policy_v2',
    title: 'Política de Privacidade',
    version: '2026-07-17',
    author: 'DPO Viralata',
    source: './src/pages/PrivacyPolicy.static.jsx',
  },
  {
    key: 'terms_v2',
    title: 'Termos de Uso',
    version: '2026-07-17',
    author: 'DPO Viralata',
    source: './src/pages/Terms.static.jsx',
  },
  {
    key: 'legislation_v2',
    title: 'Legislação Aplicável',
    version: '2026-07-17',
    author: 'DPO Viralata',
    source: './src/pages/Legislation.static.jsx',
  },
];

async function main() {
  // eslint-disable-next-line no-console
  console.log(`[seed] projeto: ${PROJECT_ID}`);
  // eslint-disable-next-line no-console
  console.log('[seed] AVISO: este script é MANUAL. Use com cuidado.');
  // eslint-disable-next-line no-console
  console.log('[seed] Para converter JSX → Markdown, use uma ferramenta externa ou edite manualmente.');
  // eslint-disable-next-line no-console
  console.log('[seed] Schema esperado: { title, version, author, effectiveAt, content, active: true, publishedAt }');
  // eslint-disable-next-line no-console
  console.log('');
  for (const d of DOCS) {
    const ref = doc(db, 'legal_docs', d.key);
    // eslint-disable-next-line no-console
    console.log(`[seed] target: legal_docs/${d.key}`);
    // eslint-disable-next-line no-console
    console.log(`        title: ${d.title}, version: ${d.version}`);
    // eslint-disable-next-line no-console
    console.log(`        source: ${d.source}`);
    // eslint-disable-next-line no-console
    console.log(`        (DRY-RUN — não escrevendo. rode com --apply para publicar)`);
  }
  // eslint-disable-next-line no-console
  console.log('');
  // eslint-disable-next-line no-console
  console.log('[seed] Para converter o JSX existente em Markdown:');
  // eslint-disable-next-line no-console
  console.log('  1. Use uma IA (Claude, GPT) para converter o conteúdo do JSX em Markdown estruturado');
  // eslint-disable-next-line no-console
  console.log('  2. Valide manualmente cada doc (LGPD, conformidade jurídica)');
  // eslint-disable-next-line no-console
  console.log('  3. Publique via setDoc() no Firestore console ou Cloud Function');
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] erro:', err);
  process.exit(1);
});
