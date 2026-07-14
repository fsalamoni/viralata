/**
 * @fileoverview Tests do exhibitionPublicService (TASK-145).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock o módulo firebase/firestore inteiro
const mockGetDocs = vi.fn();
const mockCollection = vi.fn(() => ({ _coll: true }));
const mockQuery = vi.fn((...args) => ({ _q: args }));
const mockWhere = vi.fn((...args) => ({ _w: args }));
const mockOrderBy = vi.fn((...args) => ({ _o: args }));
const mockLimit = vi.fn((n) => ({ _l: n }));

vi.mock('@/core/config/firebase', () => ({ db: { _db: true } }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (n) => mockLimit(n),
  getDocs: (...args) => mockGetDocs(...args),
}));

// Import APÓS mock
const { listPublicExhibitions, groupExhibitionsByShelter } = await import('./exhibitionPublicService.js');

describe('exhibitionPublicService — listPublicExhibitions (TASK-145)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista exhibitions do collectionGroup', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ title: 'Feira Adoção SP', status: 'scheduled' }) },
        { id: 'e2', data: () => ({ title: 'Adoção RJ', status: 'active' }) },
      ],
    });
    const r = await listPublicExhibitions();
    expect(mockGetDocs).toHaveBeenCalled();
    expect(r).toHaveLength(2);
    expect(r[0].title).toBe('Feira Adoção SP');
  });

  it('filtra upcomingOnly client-side (ISO string)', async () => {
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const past = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ datetime_start: future }) },
        { id: 'e2', data: () => ({ datetime_start: past }) },
      ],
    });
    const r = await listPublicExhibitions({ upcomingOnly: true });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('e1');
  });

  it('filtra upcomingOnly aceita Firestore Timestamp', async () => {
    const future = { toDate: () => new Date(Date.now() + 1000) };
    const past = { toDate: () => new Date(Date.now() - 1000) };
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ datetime_start: future }) },
        { id: 'e2', data: () => ({ datetime_start: past }) },
      ],
    });
    const r = await listPublicExhibitions({ upcomingOnly: true });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('e1');
  });

  it('retorna [] em caso de erro (fallback)', async () => {
    mockGetDocs.mockRejectedValue(new Error('permission denied'));
    const r = await listPublicExhibitions();
    expect(r).toEqual([]);
  });
});

describe('exhibitionPublicService — groupExhibitionsByShelter (TASK-145)', () => {
  it('agrupa por shelter_club_id', () => {
    const exs = [
      { id: 'e1', shelter_club_id: 's1' },
      { id: 'e2', shelter_club_id: 's1' },
      { id: 'e3', shelter_club_id: 's2' },
    ];
    const groups = groupExhibitionsByShelter(exs);
    expect(groups).toHaveLength(2);
    const s1 = groups.find((g) => g.shelter_club_id === 's1');
    expect(s1.exhibitions).toHaveLength(2);
  });

  it('usa shelterInfo quando fornecido', () => {
    const info = new Map([['s1', { name: 'Abrigo A', city: 'SP' }]]);
    const groups = groupExhibitionsByShelter(
      [{ id: 'e1', shelter_club_id: 's1' }],
      info,
    );
    expect(groups[0].shelter_name).toBe('Abrigo A');
    expect(groups[0].shelter_city).toBe('SP');
  });

  it('fallback para ex.shelter_name', () => {
    const groups = groupExhibitionsByShelter(
      [{ id: 'e1', shelter_club_id: 's1', shelter_name: 'X' }],
    );
    expect(groups[0].shelter_name).toBe('X');
  });

  it('ordenação por nome', () => {
    const groups = groupExhibitionsByShelter([
      { shelter_club_id: 's2', shelter_name: 'B' },
      { shelter_club_id: 's1', shelter_name: 'A' },
    ]);
    expect(groups[0].shelter_name).toBe('A');
    expect(groups[1].shelter_name).toBe('B');
  });
});
