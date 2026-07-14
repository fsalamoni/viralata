/**
 * @fileoverview Testes para fosterHistoryPublicService (TASK-326).
 * @see TASK-326
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn();
const mockDoc = vi.fn((db, ...path) => ({ _path: path }));
const mockQuery = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: mockOrderBy,
  limit: mockLimit,
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const { getFosterPublicHistory } = await import(
  '@/modules/shelter/services/fosterHistoryPublicService'
);

describe('fosterHistoryPublicService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb._isDb = true;
  });

  it('smoke: module exports getFosterPublicHistory', () => {
    expect(typeof getFosterPublicHistory).toBe('function');
  });

  it('returns denied=true when db is not available', async () => {
    mockDb._isDb = false;
    const result = await getFosterPublicHistory('uid-123');
    expect(result.denied).toBe(true);
  });

  it('returns denied=true when fosterUid is empty', async () => {
    const result = await getFosterPublicHistory('');
    expect(result.denied).toBe(true);
  });

  it('returns denied=true when user has no consent_to_show_history', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => true, data: () => ({ full_name: 'João' }) });
    mockDb._isDb = true;
    const result = await getFosterPublicHistory('uid-123');
    expect(result.denied).toBe(true);
  });

  it('returns denied=false + fullName when user has consent and empty placements', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ consent_to_show_history: true, full_name: 'Maria Silva' }),
    });
    mockDb._isDb = true;
    mockGetDocs.mockResolvedValue({ docs: [] });
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
    mockLimit.mockReturnValue({});

    const result = await getFosterPublicHistory('uid-consented');
    expect(result.denied).toBe(false);
    expect(result.fullName).toBe('Maria Silva');
    expect(result.placements).toEqual([]);
  });

  it('returns placements with public fields when consent given', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ consent_to_show_history: true, full_name: 'Carlos' }),
    });
    mockDb._isDb = true;
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          id: 'p1',
          data: () => ({
            shelter_club_id: 'club-1',
            pet_id: 'pet-1',
            pet_name: 'Rex',
            pet_photo_url: 'https://x.com/r.jpg',
            pet_species: 'dog',
            status: 'ended_adopted',
            ended_at: '2024-06-01T00:00:00Z',
            foster_rating: 5,
          }),
        },
      ],
    });
    mockCollection.mockReturnValue({});
    mockQuery.mockReturnValue({});
    mockWhere.mockReturnValue({});
    mockOrderBy.mockReturnValue({});
    mockLimit.mockReturnValue({});

    const result = await getFosterPublicHistory('uid-consented');
    expect(result.denied).toBe(false);
    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].pet_name).toBe('Rex');
    expect(result.placements[0].status).toBe('ended_adopted');
    expect(result.placements[0].foster_rating).toBe(5);
  });
});
