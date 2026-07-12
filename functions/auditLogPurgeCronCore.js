/**
 * @fileoverview Núcleo puro de `auditLogPurgeCron` (testável sem
 * firebase-functions). Contém apenas a lógica de negócio.
 *
 * O teste em `auditLogPurgeCron.test.js` importa este módulo (que não
 * depende de firebase-functions) e mocks o firebase-admin via
 * vitest.config (alias para `__mocks__/firebase-admin-firestore.cjs`).
 *
 * Retenção (Marco Civil Art. 15, Lei 14.063/2020, Receita Federal):
 *   - operational:    180 dias (6 meses) — Marco Civil Art. 15
 *   - term_acceptance: 1825 dias (5 anos) — Lei 14.063/2020 art. 6º
 *   - payment:        2555 dias (7 anos) — Receita Federal
 *
 * Os pares (category, dias) determinam cutoffMs = now - days*oneDayMs.
 * Apenas docs com `category === X` E `created_at_ms < cutoffMs` são
 * elegíveis para deleção. Categorias com retenção maior NUNCA são
 * purgadas antes do seu próprio cutoff.
 *
 * @see auditLogPurgeCron.js (wrapper)
 * @see docs/SHELTER_MGMT_ROADMAP.md § LGPD / Marco Civil
 */

const RETENTION_DAYS = {
  operational: 180,
  term_acceptance: 1825,
  payment: 2555,
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Calcula o cutoff (em ms epoch) para uma categoria. Retorna
 * `now - retentionDays * oneDayMs`.
 *
 * @param {'operational'|'term_acceptance'|'payment'} category
 * @param {number} now - ms epoch (default Date.now())
 * @returns {number} cutoffMs
 */
function cutoffFor(category, now = Date.now(), overrides = {}) {
  const base = RETENTION_DAYS[category];
  if (typeof base !== 'number') {
    throw new Error(`auditLogPurgeCronCore: unknown category "${category}"`);
  }
  // TASK-171: retenção configurável (platform_settings.audit_retention_days).
  // O override NUNCA reduz abaixo do piso legal da categoria — o Marco
  // Civil (180d) e a Lei 14.063 (5a) são mínimos, não sugestões. LGPD
  // permite retenção MAIOR com justificativa registrada.
  const override = Number(overrides?.[category]);
  const days = Number.isFinite(override) && override > base ? override : base;
  return now - days * ONE_DAY_MS;
}

/**
 * Classifica um `action` numa categoria de retenção. Mesma lógica
 * que o client (`auditService.classifyAuditCategory`) — mantemos
 * cópias porque a função roda no Admin SDK e o client não pode
 * importá-la aqui diretamente. Os dois lados DEVEM ser mantidos em
 * sync (ver auditLogPurgeCron.test.js — assertion sobre o set).
 *
 * @param {string} action
 * @returns {'operational'|'term_acceptance'|'payment'}
 */
function classifyAction(action) {
  if (TERM_ACCEPTANCE_ACTIONS.has(action)) return 'term_acceptance';
  if (PAYMENT_ACTIONS.has(action)) return 'payment';
  return 'operational';
}

const TERM_ACCEPTANCE_ACTIONS = new Set([
  'terms_accepted',
  'privacy_policy_accepted',
  'code_of_conduct_accepted',
  'adoption_terms_accepted',
  'donation_terms_accepted',
  'volunteer_terms_accepted',
  'foster_terms_accepted',
  'shelter_terms_accepted',
  'terms_acceptance_recorded',
]);

const PAYMENT_ACTIONS = new Set([
  'donation_received',
  'donation_failed',
  'subscription_started',
  'subscription_cancelled',
  'payment_refunded',
]);

/**
 * Itera as categorias, busca docs elegíveis em `collection` e deleta
 * em batch. Recebe `db` injetado (mockável em teste).
 *
 * Cada categoria é processada independentemente; um erro em uma
 * categoria NÃO impede as outras. Retorna contadores por categoria.
 *
 * @param {object} deps
 * @param {object} deps.db - firebase-admin/firestore
 * @param {string} deps.collectionName - nome da collection (default 'audit_logs')
 * @param {number} deps.batchLimit - máximo de docs por categoria por execução (default 500)
 * @param {number} [deps.now] - ms epoch opcional para tornar testes determinísticos
 * @param {object} [deps.logger] - {info, error}
 * @returns {Promise<{operational:number, term_acceptance:number, payment:number, errors:number}>}
 */
async function runAuditLogPurge(deps) {
  const {
    db,
    collectionName = 'audit_logs',
    batchLimit = 500,
    now = Date.now(),
    logger = console,
    retentionOverrides = {},
  } = deps;

  const counters = { operational: 0, term_acceptance: 0, payment: 0, errors: 0 };

  for (const [category, _days] of Object.entries(RETENTION_DAYS)) {
    const cutoffMs = cutoffFor(category, now, retentionOverrides);

    try {
      const snap = await db.collection(collectionName)
        .where('category', '==', category)
        .where('created_at_ms', '<', cutoffMs)
        .limit(batchLimit)
        .get();

      if (snap.empty) {
        logger.info?.('auditLogPurgeCron: nothing to purge', { category, cutoffMs });
        continue;
      }

      const batch = db.batch();
      snap.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      counters[category] = snap.size;
      logger.info?.('auditLogPurgeCron: purged', {
        category,
        count: snap.size,
        cutoff_iso: new Date(cutoffMs).toISOString(),
      });
    } catch (err) {
      counters.errors++;
      logger.error?.('auditLogPurgeCron: error purging category', {
        category,
        error: String(err?.message || err),
      });
    }
  }

  logger.info?.('auditLogPurgeCron: run complete', counters);
  return counters;
}

module.exports = {
  RETENTION_DAYS,
  ONE_DAY_MS,
  TERM_ACCEPTANCE_ACTIONS,
  PAYMENT_ACTIONS,
  cutoffFor,
  classifyAction,
  runAuditLogPurge,
};
