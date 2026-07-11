/**
 * @fileoverview Testes do CRON de saúde da plataforma (Fase 21).
 */

import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

const mockSet = vi.fn();
const mockDelete = vi.fn();
const mockCommit = vi.fn();
const mockGet = vi.fn();
const mockCountGet = vi.fn();
const mockBatch = vi.fn(() => ({
  set: mockSet,
  delete: mockDelete,
  commit: mockCommit,
}));

function makeCollectionChain() {
  // Cada call de `collection()` retorna uma NOVA chain. Assim os
  // `.where()` encadeados não se sobrescrevem entre calls.
  const chain = {
    where: vi.fn(() => chain),
    where: vi.fn(() => chain),
    count: vi.fn(() => chain),
    get: mockGet,
    limit: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
  };
  return chain;
}

const mockCollection = vi.fn(() => {
  const chain = {
    where: vi.fn(function where() { return this; }),
    count: vi.fn(function count() { return { get: mockCountGet }; }),
    doc: vi.fn(() => ({ set: mockSet, delete: mockDelete, get: mockGet })),
    orderBy: vi.fn(function orderBy() { return { limit: () => ({ get: mockGet }) }; }),
    limit: vi.fn(function limit() { return { get: mockGet }; }),
    get: mockGet,
  };
  // Encadeia: where() retorna o próprio chain.
  chain.where.mockImplementation(() => chain);
  // Para evaluateAlertsForSnapshot: .where().where().get()
  // cada `.where()` deve retornar o chain.
  return chain;
});

const mockDoc = vi.fn(() => ({ set: mockSet, get: mockGet, delete: mockDelete }));

const mockFieldValue = {
  serverTimestamp: () => ({ __serverTimestamp: true }),
};

const mockDb = {
  collection: mockCollection,
  doc: mockDoc,
  batch: mockBatch,
};

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  default: { initializeApp: vi.fn() },
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: mockFieldValue,
  Timestamp: { fromMillis: (ms) => ({ __timestamp: true, ms }) },
  default: {
    getFirestore: () => mockDb,
    FieldValue: mockFieldValue,
    Timestamp: { fromMillis: (ms) => ({ __timestamp: true, ms }) },
  },
}));

let mod;
beforeAll(async () => {
  mod = await import('./platformHealthCron.js');
});

beforeEach(() => {
  mockSet.mockReset().mockResolvedValue(undefined);
  mockDelete.mockReset();
  mockCommit.mockReset().mockResolvedValue(undefined);
  mockBatch.mockReset();
  mockGet.mockReset();
  mockCountGet.mockReset();
  mod.setLogger(null);
});

describe('platformHealthCron — constantes', () => {
  it('ONE_DAY_MS = 24h em ms', () => {
    expect(mod.ONE_DAY_MS).toBe(24 * 60 * 60 * 1000);
  });

  it('ONE_HOUR_MS = 1h em ms', () => {
    expect(mod.ONE_HOUR_MS).toBe(60 * 60 * 1000);
  });
});

describe('collectHealthMetrics', () => {
  it('coleta auth + functions + hosting', async () => {
    mockCountGet
      .mockResolvedValueOnce({ data: () => ({ count: 100 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 12 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 800 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 8 }) });
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await mod.collectHealthMetrics(mockDb);
    expect(result.auth.active_users_24h).toBe(100);
    expect(result.auth.signups_24h).toBe(12);
    expect(result.functions.invocations_24h).toBe(800);
    expect(result.functions.errors_24h).toBe(8);
    expect(result.firestore.error_rate).toBe(0.01);
    expect(result.firestore.latency_p50).toBe(45);
    expect(result.hosting.uptime_30d).toBe(99.95);
    expect(result.hosting.last_deploy_at).toBeNull();
  });

  it('error_rate = 0 quando não há invocations', async () => {
    mockCountGet
      .mockResolvedValueOnce({ data: () => ({ count: 50 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 0 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 0 }) })
      .mockResolvedValueOnce({ data: () => ({ count: 0 }) });
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });

    const result = await mod.collectHealthMetrics(mockDb);
    expect(result.firestore.error_rate).toBe(0);
  });
});

describe('evaluateAlertsForSnapshot', () => {
  it('dispara evento quando value >= threshold (error_rate)', async () => {
    // O 1º check é error_rate — retorna a config.
    // Os outros 3 (latency_p99, uptime, billing) são empty.
    mockGet
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          { id: 'cfg-1', data: () => ({ type: 'error_rate', threshold: 0.05, enabled: true }) },
        ],
      })
      .mockResolvedValueOnce({ empty: true, docs: [] })
      .mockResolvedValueOnce({ empty: true, docs: [] })
      .mockResolvedValueOnce({ empty: true, docs: [] });

    const metrics = {
      firestore: { latency_p50: 45, latency_p99: 120, error_rate: 0.08 },
      auth: { active_users_24h: 1, signups_24h: 1 },
      functions: { invocations_24h: 100, errors_24h: 8 },
      hosting: { uptime_30d: 99.95, last_deploy_at: null },
    };
    await mod.evaluateAlertsForSnapshot(mockDb, metrics);
    expect(mockSet).toHaveBeenCalled();
    const payload = mockSet.mock.calls[0][0];
    expect(payload.type).toBe('error_rate');
    expect(payload.current_value).toBe(0.08);
    expect(payload.threshold).toBe(0.05);
    expect(payload.severity).toBe('critical');
  });

  it('NÃO dispara quando value < threshold (error_rate)', async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: 'cfg-1', data: () => ({ type: 'error_rate', threshold: 0.10, enabled: true }) },
      ],
    });
    const metrics = {
      firestore: { error_rate: 0.05, latency_p50: 0, latency_p99: 0 },
      auth: { active_users_24h: 0, signups_24h: 0 },
      functions: { invocations_24h: 0, errors_24h: 0 },
      hosting: { uptime_30d: 100, last_deploy_at: null },
    };
    await mod.evaluateAlertsForSnapshot(mockDb, metrics);
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('uptime: dispara quando value < threshold', async () => {
    // A função itera 4 checks (error_rate, latency_p99, uptime, billing).
    // Cada check faz um `get()`. Para o uptime disparar, só a
    // resposta de uptime importa — as outras são empty.
    mockGet
      .mockResolvedValueOnce({ empty: true, docs: [] })  // error_rate
      .mockResolvedValueOnce({ empty: true, docs: [] })  // latency_p99
      .mockResolvedValueOnce({
        empty: false,
        docs: [
          { id: 'cfg-uptime', data: () => ({ type: 'uptime', threshold: 99.9, enabled: true }) },
        ],
      })
      .mockResolvedValueOnce({ empty: true, docs: [] });  // billing
    const metrics = {
      firestore: { error_rate: 0, latency_p50: 0, latency_p99: 0 },
      auth: { active_users_24h: 0, signups_24h: 0 },
      functions: { invocations_24h: 0, errors_24h: 0 },
      hosting: { uptime_30d: 99.5, last_deploy_at: null },
    };
    await mod.evaluateAlertsForSnapshot(mockDb, metrics);
    expect(mockSet).toHaveBeenCalled();
    const payload = mockSet.mock.calls[0][0];
    expect(payload.type).toBe('uptime');
    expect(payload.current_value).toBe(99.5);
  });
});

describe('pruneOldSnapshots', () => {
  it('deleta snapshots antigos em batch', async () => {
    mockGet.mockResolvedValueOnce({
      empty: false,
      size: 2,
      docs: [
        { ref: { id: 'a' } },
        { ref: { id: 'b' } },
      ],
    });
    await mod.pruneOldSnapshots(mockDb);
    expect(mockBatch).toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledTimes(2);
    expect(mockCommit).toHaveBeenCalled();
  });

  it('não chama batch quando vazio', async () => {
    mockGet.mockResolvedValueOnce({ empty: true, size: 0, docs: [] });
    await mod.pruneOldSnapshots(mockDb);
    expect(mockBatch).not.toHaveBeenCalled();
  });
});
