/**
 * @fileoverview Testes do platformHealthService — painel de saúde
 * da plataforma (Fase 21).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetCount = vi.fn();
const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockAddDoc = vi.fn();
const whereCalls = [];
const orderByCalls = [];
const limitCalls = [];

function makeQueryChain(getImpl) {
  const chain = {
    where: vi.fn((...args) => {
      whereCalls.push(args);
      return chain;
    }),
    orderBy: vi.fn((...args) => {
      orderByCalls.push(args);
      return chain;
    }),
    limit: vi.fn((...args) => {
      limitCalls.push(args);
      chain.get = getImpl;
      return chain;
    }),
    get: getImpl,
  };
  return chain;
}

const mockCollection = vi.fn((db, name) => {
  if (name === 'function_invocations') {
    // For functions metrics, collection chaining matters for where + limit
    const chain = {
      where: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      get: mockGetDocs,
    };
    return chain;
  }
  return {
    where: vi.fn(() => makeQueryChain(mockGetDocs)),
    limit: vi.fn(() => makeQueryChain(mockGetDocs)),
    orderBy: vi.fn(() => makeQueryChain(mockGetDocs)),
    add: mockAddDoc,
    doc: vi.fn(() => ({ set: mockSetDoc })),
    get: mockGetDocs,
  };
});
const mockDoc = vi.fn(() => ({ set: mockSetDoc, get: mockGetDoc }));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getCountFromServer: (...args) => mockGetCount(...args),
  getDocs: (...args) => mockGetDocs(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  query: (...args) => ({ __query: true, args }),
  where: (...args) => ({ __where: true, args }),
  orderBy: (...args) => ({ __orderBy: true, args }),
  limit: (...args) => ({ __limit: true, args }),
  count: () => ({ __count: true }),
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));

vi.mock('@/core/config/firebase', () => ({
  db: { __db: true },
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

// Import depois dos mocks
const {
  windowStartMs,
  getAuthMetrics,
  getFunctionsMetrics,
  getCollectionStats,
  getMissingIndexes,
  getSlowQueries,
  getAuditLogEntries,
  getBillingSummary,
  getHealthSnapshot,
  upsertBillingSummary,
  WINDOWS,
} = await import('./platformHealthService.js');

beforeEach(() => {
  vi.clearAllMocks();
  whereCalls.length = 0;
  orderByCalls.length = 0;
  limitCalls.length = 0;
  // Reset collection mock back to the version that does NOT track
  // for the test (collection count tracking needs different mock).
  mockCollection.mockImplementation((db, name) => {
    if (name === 'function_invocations') {
      const chain = {
        where: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        get: mockGetDocs,
      };
      return chain;
    }
    return {
      where: vi.fn(() => makeQueryChain(mockGetDocs)),
      limit: vi.fn(() => makeQueryChain(mockGetDocs)),
      orderBy: vi.fn(() => makeQueryChain(mockGetDocs)),
      add: mockAddDoc,
      doc: vi.fn(() => ({ set: mockSetDoc })),
      get: mockGetDocs,
    };
  });
});

describe('windowStartMs', () => {
  it('subtrai a janela do instante atual', () => {
    const now = new Date('2026-07-11T00:00:00Z');
    expect(windowStartMs(3600 * 1000, now)).toBe(now.getTime() - 3600 * 1000);
  });

  it('expõe janelas padrão de 24h/7d/30d', () => {
    expect(WINDOWS.LAST_24H).toBe(86_400_000);
    expect(WINDOWS.LAST_7D).toBe(7 * 86_400_000);
    expect(WINDOWS.LAST_30D).toBe(30 * 86_400_000);
  });
});

describe('getAuthMetrics', () => {
  it('combina contadores de active users e signups', async () => {
    // countRecentDocs('users','last_seen_at',windowMs) = (total, inWindow)
    // countRecentDocs('users','created_at',windowMs)     = (total, inWindow)
    // Order not guaranteed (Promise.all) — track by caller.
    const counts = [100, 30, 50, 12];
    mockGetCount.mockImplementation(() => Promise.resolve({ data: () => ({ count: counts.shift() ?? 0 }) }));

    const result = await getAuthMetrics();
    expect(result.active_users_24h).toBe(30);
    expect(result.signups_24h).toBe(12);
    expect(result.total_users).toBe(100);
  });

  it('retorna zeros em caso de erro', async () => {
    mockGetCount.mockRejectedValue(new Error('boom'));
    const result = await getAuthMetrics();
    expect(result).toEqual({ active_users_24h: 0, signups_24h: 0, total_users: 0 });
  });
});

describe('getFunctionsMetrics', () => {
  it('lê contadores de function_invocations', async () => {
    const counts = [500, 7];
    mockGetCount.mockImplementation(() => Promise.resolve({ data: () => ({ count: counts.shift() ?? 0 }) }));
    const result = await getFunctionsMetrics();
    expect(result.invocations_24h).toBe(500);
    expect(result.errors_24h).toBe(7);
  });

  it('retorna zeros quando a collection não existe', async () => {
    mockGetCount.mockRejectedValue(new Error('not-found'));
    const result = await getFunctionsMetrics();
    expect(result).toEqual({ invocations_24h: 0, errors_24h: 0 });
  });
});

describe('getCollectionStats', () => {
  it('agrega counts por collection conhecida e ordena por count', async () => {
    // O mock da getCountFromServer é chamado para CADA collection
    // conhecida. A ordem é a ordem da lista KNOWN dentro do service.
    const countsByCollection = {
      users: 1000,
      pets: 250,
      clubs: 80,
      communities: 5,
      adoption_interests: 0,
      adoption_ratings: 0,
      abuse_reports: 0,
      audit_logs: 300,
      notifications: 60,
      club_campaigns: 0,
      club_ledger: 0,
      club_events: 0,
      club_posts: 0,
      pet_photos: 0,
      platform_health_snapshots: 0,
      platform_alert_config: 0,
      platform_billing: 0,
      community_posts: 0,
      community_forum_threads: 0,
      shelter_profiles: 0,
    };
    mockGetCount.mockImplementation((q) => {
      // q is a Reference; we need to figure out the collection name.
      // Our service passes a Reference created by `collection(db, name)`,
      // so we don't have a direct handle on the name in the count call.
      // Use call order to map.
      const order = ['users','pets','clubs','communities','adoption_interests',
        'adoption_ratings','abuse_reports','audit_logs','notifications',
        'club_campaigns','club_ledger','club_events','club_posts',
        'pet_photos','platform_health_snapshots','platform_alert_config',
        'platform_billing','community_posts','community_forum_threads',
        'shelter_profiles'];
      const idx = mockGetCount.mock.calls.length - 1;
      const name = order[idx] || 'unknown';
      return Promise.resolve({ data: () => ({ count: countsByCollection[name] ?? 0 }) });
    });
    const result = await getCollectionStats({ limit: 5 });
    expect(result[0].name).toBe('users');
    expect(result[0].count).toBe(1000);
    expect(result.length).toBe(5);
  });
});

describe('getMissingIndexes', () => {
  it('agrega fingerprints de queries lentas', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a', data: () => ({ fingerprint: 'users.where(role,==,admin)', created_at_ms: 1 }) },
        { id: 'b', data: () => ({ fingerprint: 'pets.where(species,==,cat)', created_at_ms: 2 }) },
        { id: 'c', data: () => ({ fingerprint: 'users.where(role,==,admin)', created_at_ms: 3 }) },
        { id: 'd', data: () => ({ fingerprint: 'clubs.where(active,==,true)', created_at_ms: 4 }) },
      ],
    });
    const result = await getMissingIndexes({ limit: 5 });
    expect(result.fingerprints[0]).toEqual({
      fingerprint: 'users.where(role,==,admin)',
      count: 2,
      sample_query: 'users.where(role,==,admin)',
    });
    expect(result.missing_count).toBe(3);
  });

  it('retorna estrutura vazia quando não há logs', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await getMissingIndexes();
    expect(result).toEqual({ missing_count: 0, fingerprints: [] });
  });
});

describe('getSlowQueries', () => {
  it('formata resultado com latência e timestamp', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a', data: () => ({ fingerprint: 'q1', latency_ms: 1200, collection: 'pets', created_at: { seconds: 1_700_000_000 } }) },
      ],
    });
    const result = await getSlowQueries();
    expect(result).toHaveLength(1);
    expect(result[0].latency_ms).toBe(1200);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('retorna [] em caso de erro', async () => {
    mockGetDocs.mockRejectedValue(new Error('permission'));
    const result = await getSlowQueries();
    expect(result).toEqual([]);
  });
});

describe('getAuditLogEntries', () => {
  it('filtra por categoria (prefixo da action)', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'l1', data: () => ({ action: 'pet_created', created_at_ms: 100 }) },
        { id: 'l2', data: () => ({ action: 'club_updated', created_at_ms: 200 }) },
        { id: 'l3', data: () => ({ action: 'pet_deleted', created_at_ms: 300 }) },
        { id: 'l4', data: () => ({ action: 'community_post_created', created_at_ms: 400 }) },
      ],
    });
    const result = await getAuditLogEntries({ category: 'pet' });
    expect(result.map((e) => e.action)).toEqual(['pet_created', 'pet_deleted']);
  });

  it('filtra por período', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a', data: () => ({ action: 'pet_created', created_at_ms: 100 }) },
        { id: 'b', data: () => ({ action: 'pet_created', created_at_ms: 5000 }) },
        { id: 'c', data: () => ({ action: 'pet_created', created_at_ms: 9000 }) },
      ],
    });
    const start = new Date(2000);
    const end = new Date(8000);
    const result = await getAuditLogEntries({ category: 'pet', startDate: start, endDate: end });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  it('filtra por categoria community', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a', data: () => ({ action: 'community_post_created', created_at_ms: 1 }) },
        { id: 'b', data: () => ({ action: 'pet_created', created_at_ms: 2 }) },
        { id: 'c', data: () => ({ action: 'community_forum_thread_deleted', created_at_ms: 3 }) },
      ],
    });
    const result = await getAuditLogEntries({ category: 'community' });
    expect(result.map((e) => e.action)).toEqual([
      'community_post_created',
      'community_forum_thread_deleted',
    ]);
  });
});

describe('getBillingSummary / upsertBillingSummary', () => {
  it('retorna zeros quando não há doc no período', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const result = await getBillingSummary({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });
    expect(result.estimated_cost_usd).toBe(0);
    expect(result.manual).toBe(false);
  });

  it('lê o doc correspondente ao periodId', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: '2026-07-01_2026-07-31', data: () => ({
          reads: 1000,
          writes: 200,
          deletes: 50,
          storage_gb: 1.2,
          bandwidth_gb: 0.5,
          estimated_cost_usd: 12.5,
        }) },
      ],
    });
    const result = await getBillingSummary({
      start: new Date('2026-07-01'),
      end: new Date('2026-07-31'),
    });
    expect(result.reads).toBe(1000);
    expect(result.estimated_cost_usd).toBe(12.5);
    expect(result.manual).toBe(true);
  });

  it('upsertBillingSummary monta o doc correto', async () => {
    mockSetDoc.mockResolvedValue(undefined);
    const actor = { uid: 'u-1' };
    await upsertBillingSummary(
      { start: new Date('2026-07-01'), end: new Date('2026-07-31') },
      { reads: 100, writes: 50, deletes: 5, storage_gb: 1, bandwidth_gb: 0.2, estimated_cost_usd: 5.5 },
      actor,
    );
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockSetDoc.mock.calls[0];
    expect(payload.reads).toBe(100);
    expect(payload.manual).toBe(true);
    expect(payload.updated_by).toBe('u-1');
  });
});

describe('getHealthSnapshot', () => {
  it('combina firestore + auth + functions + hosting', async () => {
    // Os subtests acima validam os componentes. Aqui validamos apenas
    // que getHealthSnapshot compõe todas as 4 fatias com a estrutura
    // esperada. Os valores específicos já foram testados.
    mockGetCount.mockResolvedValue({ data: () => ({ count: 1 }) });
    mockGetDocs.mockResolvedValue({ docs: [] });

    const result = await getHealthSnapshot();
    expect(result).toHaveProperty('firestore');
    expect(result).toHaveProperty('auth');
    expect(result).toHaveProperty('functions');
    expect(result).toHaveProperty('hosting');
    expect(result).toHaveProperty('generated_at');
    expect(result.firestore).toHaveProperty('latency_p50');
    expect(result.firestore).toHaveProperty('latency_p99');
    expect(result.firestore).toHaveProperty('error_rate');
    expect(result.auth).toHaveProperty('active_users_24h');
    expect(result.auth).toHaveProperty('signups_24h');
    expect(result.auth).toHaveProperty('total_users');
    expect(result.functions).toHaveProperty('invocations_24h');
    expect(result.functions).toHaveProperty('errors_24h');
    expect(result.hosting).toHaveProperty('last_deploy_at');
    expect(result.hosting).toHaveProperty('uptime_30d');
    expect(typeof result.generated_at).toBe('string');
  });
});
