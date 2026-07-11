/**
 * @fileoverview Testes: reportsService (Fase 16).
 *
 * Segue o padrão do dashboardService.test.js — mock inline sem vi.mock
 * hoisting para as funções do firebase.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks inline (mesmo padrão do dashboardService.test.js) ─────────────
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((db, path) => ({ _path: path }));
const mockQuery = vi.fn((...args) => ({ _q: true, _args: args }));
const mockWhere = vi.fn((...args) => ({ _w: true, _args: args }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockOrderBy = vi.fn((...args) => ({ _o: true, _args: args }));

vi.stubGlobal('firebase', {
  firestore: { collection: mockCollection, collectionGroup: mockCollection },
});
vi.stubGlobal('logger', { warn: vi.fn(), error: vi.fn(), info: vi.fn() });

// Patch module-level `db` antes de importar
vi.mock('@/core/config/firebase', () => ({
  db: {},
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection({}, ...args),
  collectionGroup: (...args) => mockCollection({}, ...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  limit: (...args) => mockLimit(...args),
  orderBy: (...args) => mockOrderBy(...args),
  getDocs: mockGetDocs,
}));

// ─── Helpers de mock ─────────────────────────────────────────────────
function makeSnap(items) {
  return {
    docs: items.map((data) => ({
      id: data.id || 'no-id',
      data: () => data,
    })),
  };
}

function makePet(overrides = {}) {
  return {
    id: 'pet-1',
    shelter_owner_club_id: 'club-abc',
    species: 'dog',
    status: 'available',
    rescue_date: new Date('2025-03-10'),
    neutered_at: null,
    created_at: new Date('2025-03-10'),
    ...overrides,
  };
}

function makeApp(overrides = {}) {
  return {
    id: 'app-1',
    shelter_club_id: 'club-abc',
    status: 'adoption_completed',
    created_at: new Date('2025-01-15'),
    decided_at: new Date('2025-03-01'),
    ...overrides,
  };
}

function makePost(overrides = {}) {
  return {
    id: 'post-1',
    shelter_club_id: 'club-abc',
    status: 'active',
    returned_at: null,
    return_reason: null,
    ...overrides,
  };
}

function makeFoster(overrides = {}) {
  return {
    id: 'foster-1',
    shelter_club_id: 'club-abc',
    status: 'active',
    environment: 'house_yard',
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDocs.mockResolvedValue({ docs: [] });
});

// ─── Testes ───────────────────────────────────────────────────────────

describe('reportsService', () => {
  describe('getReportsSummary', () => {
    it('busca pets, adoptions, postAdoptions e fosters em paralelo', async () => {
      const pets = [makePet()];
      const apps = [makeApp()];
      const posts = [makePost()];
      const fosters = [makeFoster()];

      mockGetDocs
        .mockResolvedValueOnce(makeSnap(pets))
        .mockResolvedValueOnce(makeSnap(apps))
        .mockResolvedValueOnce(makeSnap(posts))
        .mockResolvedValueOnce(makeSnap(fosters));

      const { getReportsSummary } = await import('./reportsService');
      const result = await getReportsSummary('club-abc', { periodType: 'month' });

      expect(mockGetDocs).toHaveBeenCalledTimes(4);
      expect(result).toHaveProperty('rescues');
      expect(result).toHaveProperty('adoptions');
      expect(result).toHaveProperty('fosters');
    });

    it('computa rescues para o período month', async () => {
      const pets = [
        makePet({ id: 'p1', rescue_date: new Date('2025-06-15') }),
        makePet({ id: 'p2', rescue_date: new Date('2025-07-01') }),
      ];

      mockGetDocs.mockResolvedValue(makeSnap(pets));

      const { getReportsSummary } = await import('./reportsService');
      const result = await getReportsSummary('club-abc', {
        periodType: 'month',
        referenceDate: '2025-06-20T12:00:00.000Z',
        reportTypes: ['rescues'],
      });

      expect(result.rescues.type).toBe('rescues');
      expect(Array.isArray(result.rescues.byMonth)).toBe(true);
      expect(result.rescues.bySpecies).toHaveProperty('dog');
      expect(result.rescues.bySpecies).toHaveProperty('cat');
    });

    it('computa adoptions corretamente', async () => {
      const apps = [
        makeApp({ id: 'a1', status: 'adoption_completed', decided_at: new Date('2025-06-10') }),
        makeApp({ id: 'a2', status: 'rejected', decided_at: new Date('2025-06-15') }),
      ];

      mockGetDocs
        .mockResolvedValueOnce(makeSnap([]))
        .mockResolvedValueOnce(makeSnap(apps))
        .mockResolvedValueOnce(makeSnap([]))
        .mockResolvedValueOnce(makeSnap([]));

      const { getReportsSummary } = await import('./reportsService');
      const result = await getReportsSummary('club-abc', {
        periodType: 'month',
        referenceDate: '2025-06-20T12:00:00.000Z',
        reportTypes: ['adoptions'],
      });

      expect(result.adoptions.type).toBe('adoptions');
      expect(result.adoptions.byStatus).toHaveProperty('adoption_completed');
      expect(result.adoptions.byStatus.adoption_completed).toBe(1);
    });

    it('computa fosters corretamente', async () => {
      const fosters = [
        makeFoster({ id: 'f1', status: 'active' }),
        makeFoster({ id: 'f2', status: 'active' }),
        makeFoster({ id: 'f3', status: 'ended' }),
      ];

      mockGetDocs
        .mockResolvedValueOnce(makeSnap([]))
        .mockResolvedValueOnce(makeSnap([]))
        .mockResolvedValueOnce(makeSnap([]))
        .mockResolvedValueOnce(makeSnap(fosters));

      const { getReportsSummary } = await import('./reportsService');
      const result = await getReportsSummary('club-abc', {
        periodType: 'month',
        reportTypes: ['fosters'],
      });

      expect(result.fosters.total).toBe(3);
      expect(result.fosters.active).toBe(2);
      expect(result.fosters.ended).toBe(1);
    });

    it('computa spay_neuter corretamente', async () => {
      const pets = [
        makePet({ id: 'p1', neutered_at: new Date('2025-01-01') }),
        makePet({ id: 'p2', neutered_at: null }),
        makePet({ id: 'p3', neutered_at: null }),
        makePet({ id: 'p4', neutered_at: new Date('2025-02-01') }),
      ];

      mockGetDocs.mockResolvedValueOnce(makeSnap(pets));

      const { getReportsSummary } = await import('./reportsService');
      const result = await getReportsSummary('club-abc', {
        periodType: 'month',
        reportTypes: ['spay_neuter'],
      });

      expect(result.spay_neuter.totalPets).toBe(4);
      expect(result.spay_neuter.neutered).toBe(2);
      expect(result.spay_neuter.notNeutered).toBe(2);
      expect(result.spay_neuter.neuteredRate).toBe(0.5);
    });

    it('não quebra se uma collection falha (graceful degradation)', async () => {
      mockGetDocs
        .mockResolvedValueOnce(makeSnap([]))
        .mockRejectedValueOnce(new Error('permission denied'))
        .mockResolvedValueOnce(makeSnap([]))
        .mockResolvedValueOnce(makeSnap([]));

      const { getReportsSummary } = await import('./reportsService');
      const result = await getReportsSummary('club-abc', {
        periodType: 'month',
        reportTypes: ['rescues', 'adoptions'],
      });

      // Deve retornar estrutura mesmo com erro parcial
      expect(result).toHaveProperty('rescues');
      expect(result).toHaveProperty('adoptions');
    });

    it('lança erro se db null (db_unavailable)', async () => {
      vi.resetModules();
      vi.doMock('@/core/config/firebase', () => ({ db: null }));
      const { getReportsSummary: gns } = await import('./reportsService');
      const result = await gns('club-abc', {});
      expect(result.errors).toHaveProperty('_init');
      expect(result.errors._init).toBe('db_unavailable');
    });
  });
});
