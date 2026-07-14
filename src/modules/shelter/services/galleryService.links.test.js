/**
 * @fileoverview Tests do TASK-144: vinculação galeria com vitrines e adoções.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('@/core/config/firebase', () => ({ db: {} }));
vi.mock('@/core/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock('@/core/services/auditService', () => ({ createAuditLog: vi.fn().mockResolvedValue({}) }));
vi.mock('firebase/firestore', () => ({
  collection: () => ({ _coll: true }),
  doc: () => ({ _doc: true }),
  getDoc: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: () => ({ _q: true }),
  where: () => ({ _w: true }),
  orderBy: () => ({ _o: true }),
  limit: () => ({ _l: true }),
  serverTimestamp: () => 'SERVER_TS',
}));

import { createPetPhoto, updatePetPhoto } from './galleryService.js';

const baseInput = {
  pet_id: 'p1',
  shelter_club_id: 's1',
  category: 'rescue',
  url: 'https://example.com/photo.jpg',
  storage_path: 'shelter/s1/p1/photo.jpg',
};

describe('TASK-144 — galeria vinculação', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'photo-1' });
  });

  it('aceita exhibition_id no input', async () => {
    await createPetPhoto(
      { ...baseInput, exhibition_id: 'exh-1' },
      { uid: 'u1', displayName: 'Maria' },
    );
    const call = mockAddDoc.mock.calls[0];
    const payload = call[1];
    expect(payload.exhibition_id).toBe('exh-1');
  });

  it('aceita adoption_id no input', async () => {
    await createPetPhoto(
      { ...baseInput, adoption_id: 'adp-1' },
      { uid: 'u1', displayName: 'Maria' },
    );
    const call = mockAddDoc.mock.calls[0];
    const payload = call[1];
    expect(payload.adoption_id).toBe('adp-1');
  });

  it('exhibition_id auto-define category=exhibition', async () => {
    await createPetPhoto(
      { ...baseInput, exhibition_id: 'exh-1' },
      { uid: 'u1' },
    );
    const call = mockAddDoc.mock.calls[0];
    expect(call[1].category).toBe('exhibition');
  });

  it('adoption_id auto-define category=adoption', async () => {
    await createPetPhoto(
      { ...baseInput, adoption_id: 'adp-1' },
      { uid: 'u1' },
    );
    const call = mockAddDoc.mock.calls[0];
    expect(call[1].category).toBe('adoption');
  });

  it('categoria explícita é respeitada (não sobrescreve)', async () => {
    await createPetPhoto(
      { ...baseInput, exhibition_id: 'exh-1', category: 'profile' },
      { uid: 'u1' },
    );
    const call = mockAddDoc.mock.calls[0];
    expect(call[1].category).toBe('profile');
  });

  it('sem exhibition_id/adoption_id fica null', async () => {
    await createPetPhoto(baseInput, { uid: 'u1' });
    const call = mockAddDoc.mock.calls[0];
    expect(call[1].exhibition_id).toBeNull();
    expect(call[1].adoption_id).toBeNull();
  });
});
