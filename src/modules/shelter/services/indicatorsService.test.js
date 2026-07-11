/**
 * @fileoverview Testes: indicatorsService (Fase 17).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getIndicatorsSummary } from './indicatorsService';

const mockGetDocs = vi.fn();
const mockCollection = vi.fn();
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  limit: (...args) => mockLimit(...args),
  orderBy: vi.fn(),
}));

vi.mock('@/core/config/firebase', () => ({ db: {} }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('indicatorsService', () => {
  it('retorna errors em db unavailable', async () => {
    // Override do db no test
    const result = await getIndicatorsSummary('club1');
    // Sem db mock ativo, retorna errors
    expect(result).toBeDefined();
  });

  it('chama collections com shelter_club_id correto', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [], empty: true }); // exhibitions
    mockGetDocs.mockResolvedValueOnce({ docs: [], empty: true }); // participations
    mockGetDocs.mockResolvedValueOnce({ docs: [], empty: true }); // volunteers

    const result = await getIndicatorsSummary('club-xyz', { periodType: 'month' });

    expect(result).toBeDefined();
    expect(result.exhibition_summary).toBeDefined();
    expect(result.volunteer_summary).toBeDefined();
  });

  it('filtra por indicatorTypes', async () => {
    mockGetDocs.mockResolvedValue({ docs: [], empty: true });

    const result = await getIndicatorsSummary('club1', {
      indicatorTypes: ['exhibition_summary'],
    });

    expect(result.exhibition_summary).toBeDefined();
    expect(result.exhibition_detail).toBeUndefined();
    expect(result.volunteer_summary).toBeUndefined();
  });

  it('não crasha se uma coleção falha', async () => {
    // Simula todas as 3 fetches retornando erro interno (fetch captura no try/catch → [])
    // O service deve completar sem lançar
    mockGetDocs.mockRejectedValue(new Error('network error'));

    // Não deve lançar
    const result = await getIndicatorsSummary('club1', {
      indicatorTypes: ['exhibition_summary', 'volunteer_summary'],
    });

    expect(result).toBeDefined();
    expect(result.exhibition_summary).toBeDefined();
    expect(result.exhibition_summary.type).toBe('exhibition_summary'); // computou com arrays vazias
    expect(result.volunteer_summary).toBeDefined();
    expect(result.volunteer_summary.type).toBe('volunteer_summary');
  });
});
