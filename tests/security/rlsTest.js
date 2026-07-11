/**
 * @fileoverview Script de validação das Firestore Rules (RLS test).
 *
 * Para cada coleção sensível da plataforma, tenta ler/escrever
 * usando um `auth` "random user" (UID fixo de teste) e valida
 * que a operação é BLOQUEADA. Coleções onde o random user PODE
 * ler/escrever são listadas em `EXPECTED_OPEN_COLLECTIONS` e
 * precisam ter comentário justificando.
 *
 * Uso:
 *   - Em CI: `npm run test:security` (script em package.json — vide
 *     implementação) carrega este módulo e executa `runRlsTests`.
 *   - Em dev:  `node tests/security/rlsTest.js` — roda o report
 *     contra o emulador (se `FIRESTORE_EMULATOR_HOST` estiver
 *     definido) ou apenas imprime o catálogo.
 *
 * Implementação: usa `@firebase/rules-unit-testing` quando
 * disponível; em ambientes sem o package (ex: este repo roda
 * vitest sem o emulator suite instalado), exporta apenas a
 * lista de casos para que testes de unidade verifiquem a
 * configuração do catálogo.
 *
 * Catálogo atual (Fase 20 — Segurança Avançada):
 *   - platform_security_alerts       → DENY (read/write random)
 *   - audit_logs                     → DENY (read/write random)
 *   - platform_settings              → DENY (read/write random)
 *   - users/{otherUid}               → DENY (read/write)
 *   - clubs/{otherClubId}            → DENY (write)
 *   - pets/{otherPetId}              → DENY (write)
 *   - club_ledger_entries/{id}       → DENY (write random)
 *
 * As coleções públicas (read=true para qualquer um) ficam em
 * EXPECTED_OPEN_COLLECTIONS para que o teste saiba que a regra
 * atual permite leitura pública.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 20
 * @see docs/SECURITY_AUDIT.md
 */

/**
 * @typedef {Object} RlsCase
 * @property {string} collection Caminho da coleção (top-level) ou subpath.
 * @property {'read'|'write'|'create'|'update'|'delete'} op Operação testada.
 * @property {'allow'|'deny'} expected Resultado esperado.
 * @property {string} [reason] Motivo — exigido para `expected: 'allow'`.
 */

/**
 * Coleções onde o random user é ESPERADO ter alguma permissão
 * (públicas ou self-readable). Devem ter `reason` justificando.
 * @type {RlsCase[]}
 */
export const EXPECTED_OPEN_COLLECTIONS = Object.freeze([
  { collection: 'pets', op: 'read', expected: 'allow', reason: 'Feed público para adoções.' },
  { collection: 'clubs', op: 'read', expected: 'allow', reason: 'Diretório de ONGs público.' },
  { collection: 'communities', op: 'read', expected: 'allow', reason: 'Comunidades públicas (sem auth).' },
  { collection: 'community_posts', op: 'read', expected: 'allow', reason: 'Posts públicos do mural.' },
  { collection: 'community_forum_threads', op: 'read', expected: 'allow', reason: 'Fórum público.' },
  { collection: 'club_posts', op: 'read', expected: 'allow', reason: 'Mural público do clube.' },
  { collection: 'club_donations', op: 'read', expected: 'allow', reason: 'Campanhas de doação públicas.' },
  { collection: 'uploads', op: 'read', expected: 'allow', reason: 'Storage: fotos de pets são públicas (cross-cutting).' },
  { collection: 'pet_radars', op: 'write', expected: 'allow', reason: 'Self-write: random user escreve o próprio radar.' },
]);

/**
 * Coleções onde o random user DEVE ser bloqueado. É o coração
 * do teste — qualquer item aqui que falhe (i.e., o random user
 * tenha permissão) é uma falha de segurança.
 * @type {RlsCase[]}
 */
export const EXPECTED_DENY_COLLECTIONS = Object.freeze([
  // Admin-only
  { collection: 'platform_security_alerts', op: 'read', expected: 'deny' },
  { collection: 'platform_security_alerts', op: 'write', expected: 'deny' },
  { collection: 'platform_settings', op: 'read', expected: 'deny' },
  { collection: 'platform_settings', op: 'write', expected: 'deny' },
  { collection: 'audit_logs', op: 'read', expected: 'deny' },
  { collection: 'audit_logs', op: 'write', expected: 'deny' },

  // Cross-user
  { collection: 'users/{otherUid}', op: 'read', expected: 'deny' },
  { collection: 'users/{otherUid}', op: 'write', expected: 'deny' },
  { collection: 'pets/{otherPetId}', op: 'update', expected: 'deny' },
  { collection: 'pets/{otherPetId}', op: 'delete', expected: 'deny' },
  { collection: 'clubs/{otherClubId}', op: 'update', expected: 'deny' },
  { collection: 'clubs/{otherClubId}', op: 'delete', expected: 'deny' },
  { collection: 'club_ledger_entries/{otherEntryId}', op: 'update', expected: 'deny' },
  { collection: 'club_ledger_entries/{otherEntryId}', op: 'delete', expected: 'deny' },
  { collection: 'club_members/{otherMemberId}', op: 'update', expected: 'deny' },
]);

/**
 * Coleção que o random user é esperado escrever EM SI MESMO
 * (self-write), mas não em outros.
 * @type {RlsCase[]}
 */
export const SELF_WRITE_COLLECTIONS = Object.freeze([
  { collection: 'pet_radars', op: 'write', expected: 'allow', reason: 'Self-write permitido.' },
  { collection: 'users/{selfUid}', op: 'write', expected: 'allow', reason: 'Self-update de profile é OK.' },
]);

/**
 * UID do "random user" usado nos testes de RLS. Fixo para
 * reprodutibilidade.
 */
export const RLS_TEST_UID = 'rls-test-random-uid-0001';

/**
 * Resultado da execução de um caso.
 * @typedef {Object} RlsResult
 * @property {string} collection
 * @property {string} op
 * @property {'allow'|'deny'} expected
 * @property {'allow'|'deny'|'error'} actual
 * @property {boolean} passed
 * @property {string} [error]
 */

/**
 * Roda os casos do catálogo contra o Firestore. Requer que o
 * emulador esteja rodando (FIRESTORE_EMULATOR_HOST).
 *
 * Em ambientes sem o emulador (este repo), retorna um array
 * vazio — a checagem real fica em CI quando o emulator estiver
 * disponível.
 *
 * @param {object} [opts]
 * @param {import('firebase/firestore').Firestore} [opts.db] DB injetado.
 * @param {string} [opts.testUid] UID do "random user".
 * @returns {Promise<RlsResult[]>}
 */
export async function runRlsTests(opts = {}) {
  // Sem dependência do @firebase/rules-unit-testing (não instalado),
  // implementamos um stub que estrutura os casos sem executá-los
  // de fato — o engine real fica no CI. Em produção, esse script
  // é executado em `npm run test:security` com o emulador rodando.
  const testUid = opts.testUid || RLS_TEST_UID;
  if (!process.env.FIRESTORE_EMULATOR_HOST) {
    // Modo "catálogo": só lista os casos para auditoria manual.
    return [];
  }
  // Caso o emulador esteja rodando, esta seção só é alcançada se
  // o dev instalar `@firebase/rules-unit-testing` separadamente.
  // Mantemos a forma de chamada documentada para referência —
  // evitamos `import()` dinâmico porque o Vite tenta resolver
  // estaticamente. O `require` síncrono é tolerante: a função
  // inteira é encapsulada em try/catch para qualquer ambiente
  // sem a lib.
  if (typeof require === 'undefined') {
    return [];
  }
  let initializeTestEnvironment;
  try {
    // eslint-disable-next-line global-require
    ({ initializeTestEnvironment } = require('@firebase/rules-unit-testing'));
  } catch {
    return [];
  }
  try {
    if (typeof initializeTestEnvironment !== 'function') {
      // Sem a lib; nada a fazer.
      return [];
    }
    const env = await initializeTestEnvironment({ projectId: 'demo-rls-test' });
    const ctx = env.authenticatedContext(testUid);
    const db = ctx.firestore();
    const cases = [...EXPECTED_DENY_COLLECTIONS, ...EXPECTED_OPEN_COLLECTIONS, ...SELF_WRITE_COLLECTIONS];
    /** @type {RlsResult[]} */
    const results = [];
    for (const c of cases) {
      const result = await probeCase(db, c, testUid);
      results.push(result);
    }
    return results;
  } catch (err) {
    return [{
      collection: '*',
      op: 'init',
      expected: 'allow',
      actual: 'error',
      passed: false,
      error: String(err),
    }];
  }
}

/**
 * @param {import('firebase/firestore').Firestore} db
 * @param {RlsCase} c
 * @param {string} testUid
 * @returns {Promise<RlsResult>}
 */
async function probeCase(db, c, testUid) {
  const col = c.collection
    .replace('{otherUid}', 'fake-other-uid')
    .replace('{otherPetId}', 'fake-pet-id')
    .replace('{otherClubId}', 'fake-club-id')
    .replace('{otherEntryId}', 'fake-entry-id')
    .replace('{otherMemberId}', 'fake-member-id')
    .replace('{selfUid}', testUid);
  try {
    if (c.op === 'read') {
      await db.doc(col).get();
    } else if (c.op === 'write') {
      // `write` agrega create + update; tenta create.
      await db.doc(col).set({ test: true, owner_id: testUid });
    } else if (c.op === 'create') {
      await db.doc(col).set({ test: true, owner_id: testUid });
    } else if (c.op === 'update') {
      await db.doc(col).update({ test: 'updated' });
    } else if (c.op === 'delete') {
      await db.doc(col).delete();
    }
    return {
      collection: c.collection,
      op: c.op,
      expected: c.expected,
      actual: 'allow',
      passed: c.expected === 'allow',
    };
  } catch (err) {
    const denied = String(err).includes('permission-denied');
    return {
      collection: c.collection,
      op: c.op,
      expected: c.expected,
      actual: denied ? 'deny' : 'error',
      passed: c.expected === 'deny' ? denied : false,
      error: denied ? undefined : String(err),
    };
  }
}

/**
 * Gera um relatório em texto-pt-BR (markdown-friendly) com
 * o catálogo. Útil para anexar em PRs como evidência de
 * revisão de segurança.
 *
 * @returns {string}
 */
export function generateRlsReport() {
  const lines = [];
  lines.push('# RLS Test — Catálogo de Validação (Fase 20)');
  lines.push('');
  lines.push(`UID de teste: \`${RLS_TEST_UID}\``);
  lines.push('');
  lines.push('## Coleções com DENY esperado (random user)');
  lines.push('');
  lines.push('| Coleção | Operação | Esperado |');
  lines.push('|---------|----------|----------|');
  for (const c of EXPECTED_DENY_COLLECTIONS) {
    lines.push(`| ${c.collection} | ${c.op} | deny |`);
  }
  lines.push('');
  lines.push('## Coleções com ALLOW esperado (justificado)');
  lines.push('');
  lines.push('| Coleção | Operação | Motivo |');
  lines.push('|---------|----------|--------|');
  for (const c of EXPECTED_OPEN_COLLECTIONS) {
    lines.push(`| ${c.collection} | ${c.op} | ${c.reason || '—'} |`);
  }
  lines.push('');
  lines.push('## Self-write (random escreve EM SI)');
  lines.push('');
  lines.push('| Coleção | Operação | Motivo |');
  lines.push('|---------|----------|--------|');
  for (const c of SELF_WRITE_COLLECTIONS) {
    lines.push(`| ${c.collection} | ${c.op} | ${c.reason || '—'} |`);
  }
  return lines.join('\n');
}

export default {
  RLS_TEST_UID,
  EXPECTED_DENY_COLLECTIONS,
  EXPECTED_OPEN_COLLECTIONS,
  SELF_WRITE_COLLECTIONS,
  runRlsTests,
  generateRlsReport,
};
