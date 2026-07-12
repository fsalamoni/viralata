/**
 * @fileoverview Testes do auditLogPurgeCronCore (núcleo puro).
 *
 * O Cloud Function `auditLogPurgeCron` é testado indiretamente via
 * `runAuditLogPurge` (núcleo puro, sem dependência do
 * firebase-functions/v1 pubsub).
 *
 * O mock do db é inline (mesmo padrão de securityAlerts.test.js) —
 * não usamos `vi.mock('firebase-admin/...')` porque a coleção é
 * construída em runtime via `db.collection(...)`.
 *
 * A chain é: `db.collection(name).where(...).where(...).limit(N).get()`.
 * O mock é um objeto cuja cada método retorna `self` (chainable),
 * exceto `get()` que devolve um Promise<snapshot>.
 *
 * @see auditLogPurgeCronCore.js
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  RETENTION_DAYS,
  TERM_ACCEPTANCE_ACTIONS,
  PAYMENT_ACTIONS,
  cutoffFor,
  classifyAction,
  runAuditLogPurge,
} from './auditLogPurgeCronCore';

/**
 * Cria um mock de db com snapshots configuráveis por categoria.
 * @param {Object} snapshots - mapa { category: { empty, docs, size } }
 */
function makeDb(snapshots = {}) {
  let currentSnapshot = { empty: true, docs: [], size: 0 };
  const calls = { where: [], limit: [], get: [] };

  // O terminal da chain é um objeto com `get`.
  // Cada chamada de `where`/`limit` substitui o terminal.
  // O snapshot é decidido pelo ÚLTIMO `where('category','==',X)` —
  // a 1ª chamada no encadeamento. Isso é uma simplificação: na vida
  // real o Firestore avalia toda a query, mas como só categorizamos
  // pelo 1º `where`, isso é suficiente.
  let categoryForThisQuery = null;
  const terminal = {};
  terminal.where = vi.fn((field, op, value) => {
    calls.where.push({ field, op, value });
    if (field === 'category' && op === '==') {
      categoryForThisQuery = value;
    }
    return chain;
  });
  terminal.limit = vi.fn((n) => {
    calls.limit.push(n);
    return chain;
  });
  terminal.get = vi.fn(() => {
    calls.get.push(true);
    const snap =
      (categoryForThisQuery && snapshots[categoryForThisQuery]) || {
        empty: true,
        docs: [],
        size: 0,
      };
    return Promise.resolve(snap);
  });

  const chain = {
    where: terminal.where,
    limit: terminal.limit,
    get: terminal.get,
  };

  const batchDelete = vi.fn();
  const batchCommit = vi.fn(() => Promise.resolve());
  const db = {
    collection: vi.fn(() => chain),
    batch: vi.fn(() => ({
      delete: batchDelete,
      commit: batchCommit,
    })),
    _batchDelete: batchDelete,
    _batchCommit: batchCommit,
    _calls: calls,
    _chain: chain,
  };
  return db;
}

describe('auditLogPurgeCronCore — constantes de retenção', () => {
  it('expoe 3 categorias com prazos distintos', () => {
    expect(RETENTION_DAYS.operational).toBe(180);
    expect(RETENTION_DAYS.term_acceptance).toBe(1825);
    expect(RETENTION_DAYS.payment).toBe(2555);
  });

  it('term_acceptance > operational (Lei 14.063 prevalece sobre Marco Civil)', () => {
    expect(RETENTION_DAYS.term_acceptance).toBeGreaterThan(RETENTION_DAYS.operational);
  });

  it('payment > term_acceptance (Receita Federal prevalece)', () => {
    expect(RETENTION_DAYS.payment).toBeGreaterThan(RETENTION_DAYS.term_acceptance);
  });

  it('TERM_ACCEPTANCE_ACTIONS inclui todos os termos legais', () => {
    expect(TERM_ACCEPTANCE_ACTIONS.has('volunteer_terms_accepted')).toBe(true);
    expect(TERM_ACCEPTANCE_ACTIONS.has('adoption_terms_accepted')).toBe(true);
    expect(TERM_ACCEPTANCE_ACTIONS.has('foster_terms_accepted')).toBe(true);
    expect(TERM_ACCEPTANCE_ACTIONS.has('donation_terms_accepted')).toBe(true);
    expect(TERM_ACCEPTANCE_ACTIONS.has('privacy_policy_accepted')).toBe(true);
    expect(TERM_ACCEPTANCE_ACTIONS.has('code_of_conduct_accepted')).toBe(true);
    expect(TERM_ACCEPTANCE_ACTIONS.has('shelter_terms_accepted')).toBe(true);
  });

  it('PAYMENT_ACTIONS inclui fluxos financeiros', () => {
    expect(PAYMENT_ACTIONS.has('donation_received')).toBe(true);
    expect(PAYMENT_ACTIONS.has('donation_failed')).toBe(true);
    expect(PAYMENT_ACTIONS.has('subscription_started')).toBe(true);
    expect(PAYMENT_ACTIONS.has('subscription_cancelled')).toBe(true);
    expect(PAYMENT_ACTIONS.has('payment_refunded')).toBe(true);
  });
});

describe('auditLogPurgeCronCore — cutoffFor', () => {
  it('retorna now - 180d para operational', () => {
    const now = 1_700_000_000_000;
    const days = 180;
    expect(cutoffFor('operational', now)).toBe(now - days * 24 * 60 * 60 * 1000);
  });

  it('retorna now - 1825d para term_acceptance', () => {
    const now = 1_700_000_000_000;
    const days = 1825;
    expect(cutoffFor('term_acceptance', now)).toBe(now - days * 24 * 60 * 60 * 1000);
  });

  it('retorna now - 2555d para payment', () => {
    const now = 1_700_000_000_000;
    const days = 2555;
    expect(cutoffFor('payment', now)).toBe(now - days * 24 * 60 * 60 * 1000);
  });

  it('lança em categoria inválida', () => {
    expect(() => cutoffFor('unknown_category', Date.now())).toThrow(/unknown category/);
  });

  it('cutoff de term_acceptance é MENOR (mais antigo) que operational', () => {
    const now = 1_700_000_000_000;
    expect(cutoffFor('term_acceptance', now)).toBeLessThan(cutoffFor('operational', now));
  });
});

describe('auditLogPurgeCronCore — classifyAction', () => {
  it('classifica termos legais como term_acceptance', () => {
    expect(classifyAction('volunteer_terms_accepted')).toBe('term_acceptance');
    expect(classifyAction('adoption_terms_accepted')).toBe('term_acceptance');
    expect(classifyAction('foster_terms_accepted')).toBe('term_acceptance');
  });

  it('classifica pagamentos como payment', () => {
    expect(classifyAction('donation_received')).toBe('payment');
    expect(classifyAction('subscription_cancelled')).toBe('payment');
    expect(classifyAction('payment_refunded')).toBe('payment');
  });

  it('classifica o resto como operational', () => {
    expect(classifyAction('club_created')).toBe('operational');
    expect(classifyAction('user_banned')).toBe('operational');
    expect(classifyAction('pet_created')).toBe('operational');
    expect(classifyAction('random_action')).toBe('operational');
  });
});

describe('auditLogPurgeCronCore — runAuditLogPurge', () => {
  let loggerInfo;
  let loggerError;

  beforeEach(() => {
    loggerInfo = vi.fn();
    loggerError = vi.fn();
  });

  it('retorna counters zerados quando nada para purgar', async () => {
    const db = makeDb();
    const result = await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(result).toEqual({
      operational: 0,
      term_acceptance: 0,
      payment: 0,
      errors: 0,
    });
    expect(db._batchCommit).not.toHaveBeenCalled();
    expect(db._batchDelete).not.toHaveBeenCalled();
  });

  it('purges apenas categoria operacional (varre todas as 3)', async () => {
    const opDocs = [
      { ref: { id: 'op-1' } },
      { ref: { id: 'op-2' } },
      { ref: { id: 'op-3' } },
    ];
    const db = makeDb({
      operational: { empty: false, docs: opDocs, size: 3 },
    });
    const result = await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(result.operational).toBe(3);
    expect(result.term_acceptance).toBe(0);
    expect(result.payment).toBe(0);
    expect(result.errors).toBe(0);
    expect(db._batchDelete).toHaveBeenCalledTimes(3);
    expect(db._batchCommit).toHaveBeenCalledTimes(1);
  });

  it('purges term_acceptance se houver (5 anos)', async () => {
    const termDocs = [{ ref: { id: 'term-1' } }];
    const db = makeDb({
      term_acceptance: { empty: false, docs: termDocs, size: 1 },
    });
    const result = await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(result.term_acceptance).toBe(1);
    expect(result.operational).toBe(0);
    expect(result.payment).toBe(0);
    expect(db._batchDelete).toHaveBeenCalledTimes(1);
  });

  it('purges payment se houver (7 anos)', async () => {
    const payDocs = [{ ref: { id: 'pay-1' } }, { ref: { id: 'pay-2' } }];
    const db = makeDb({
      payment: { empty: false, docs: payDocs, size: 2 },
    });
    const result = await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(result.payment).toBe(2);
    expect(result.operational).toBe(0);
    expect(result.term_acceptance).toBe(0);
  });

  it('purges todas as 3 categorias independentemente', async () => {
    const db = makeDb({
      operational: {
        empty: false,
        docs: [{ ref: { id: 'op-1' } }],
        size: 1,
      },
      term_acceptance: {
        empty: false,
        docs: [{ ref: { id: 'term-1' } }, { ref: { id: 'term-2' } }],
        size: 2,
      },
      payment: {
        empty: false,
        docs: [{ ref: { id: 'pay-1' } }],
        size: 1,
      },
    });
    const result = await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(result.operational).toBe(1);
    expect(result.term_acceptance).toBe(2);
    expect(result.payment).toBe(1);
    expect(result.errors).toBe(0);
    expect(db._batchDelete).toHaveBeenCalledTimes(4);
    expect(db._batchCommit).toHaveBeenCalledTimes(3);
  });

  it('incrementa errors mas não bloqueia as outras categorias', async () => {
    // Monta um mock que rejeita na 1ª chamada (operational) e resolve
    // nas seguintes.
    let callCount = 0;
    const db = {
      collection: vi.fn(() => ({
        where: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              get: vi.fn(() => {
                callCount++;
                if (callCount === 1) return Promise.reject(new Error('Firestore down'));
                return Promise.resolve({ empty: true, docs: [], size: 0 });
              }),
            })),
          })),
        })),
      })),
      batch: vi.fn(() => ({
        delete: vi.fn(),
        commit: vi.fn(() => Promise.resolve()),
      })),
    };

    const result = await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(result.errors).toBeGreaterThan(0);
    // O cron não trava — tentou as 3 categorias
    expect(callCount).toBe(3);
    expect(loggerError).toHaveBeenCalled();
  });

  it('respeita batchLimit no .limit()', async () => {
    const db = makeDb();
    await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      batchLimit: 250,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(db._chain.limit).toHaveBeenCalledWith(250);
    expect(db._chain.limit).toHaveBeenCalledTimes(3);
  });

  it('usa a collection "audit_logs" por padrão', async () => {
    const db = makeDb();
    await runAuditLogPurge({
      db,
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(db.collection).toHaveBeenCalledWith('audit_logs');
    expect(db.collection).toHaveBeenCalledTimes(3);
  });

  it('aceita collectionName customizado', async () => {
    const db = makeDb();
    await runAuditLogPurge({
      db,
      collectionName: 'custom_audit',
      now: 1_700_000_000_000,
      logger: { info: loggerInfo, error: loggerError },
    });
    expect(db.collection).toHaveBeenCalledWith('custom_audit');
  });

  it('passa category no where() e created_at_ms < cutoff', async () => {
    const db = makeDb();
    const now = 1_700_000_000_000;
    await runAuditLogPurge({
      db,
      now,
      logger: { info: loggerInfo, error: loggerError },
    });
    const whereCalls = db._calls.where;
    // Esperamos 6 chamadas: 3 categorias × 2 where (category, created_at_ms)
    expect(whereCalls.length).toBe(6);

    const categoryWheres = whereCalls.filter((c) => c.field === 'category');
    const categories = categoryWheres.map((c) => c.value);
    expect(categories).toContain('operational');
    expect(categories).toContain('term_acceptance');
    expect(categories).toContain('payment');

    // O cutoff de operational = now - 180d
    const opCreatedAt = whereCalls.find(
      (c) => c.field === 'created_at_ms' && whereCalls.indexOf(c) > whereCalls.findIndex((x) => x.value === 'operational' && x.field === 'category'),
    );
    // Como a ordem pode variar, vamos só verificar que existe pelo menos
    // um cutoff de 180d.
    const op180 = now - 180 * 24 * 60 * 60 * 1000;
    const term1825 = now - 1825 * 24 * 60 * 60 * 1000;
    const pay2555 = now - 2555 * 24 * 60 * 60 * 1000;
    const cutoffs = whereCalls.filter((c) => c.field === 'created_at_ms').map((c) => c.value);
    expect(cutoffs).toContain(op180);
    expect(cutoffs).toContain(term1825);
    expect(cutoffs).toContain(pay2555);
  });
});
