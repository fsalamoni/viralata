/**
 * @fileoverview Testes do serviço de Galeria (Fase 10).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockQuery = vi.fn((...args) => ({ _q: true, _args: args }));
const mockWhere = vi.fn((...args) => ({ _w: true, _args: args }));
const mockOrderBy = vi.fn((...args) => ({ _o: true, _args: args }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: mockOrderBy,
  limit: mockLimit,
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

const {
  listPetPhotos,
  listDeletedPhotos,
  getPetPhoto,
  createPetPhoto,
  updatePetPhoto,
  softDeletePetPhoto,
  restorePetPhoto,
  countPetPhotos,
} = await import('./galleryService');
const {
  petPhotoSchema,
  createPetPhotoSchema,
  updatePetPhotoSchema,
  PHOTO_CATEGORIES,
  PHOTO_CATEGORY_LABELS,
  daysUntilPurge,
  PURGE_DAYS,
} = await import('@/modules/shelter/domain/operational/gallery');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function photoSnap(data, id = 'ph-1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

const validInput = {
  pet_id: 'p1',
  shelter_club_id: 'c1',
  category: 'profile',
  url: 'https://firebasestorage.googleapis.com/v0/b/x/o/p1%2Fph-1.jpg',
  thumb_url: 'https://firebasestorage.googleapis.com/v0/b/x/o/p1%2Fph-1-thumb.jpg',
  storage_path: 'pets/p1/photos/ph-1/original.jpg',
  caption: 'Foto oficial do pet',
};

// ─── Enums / labels ──────────────────────────────────────────────────

describe('PHOTO_CATEGORIES', () => {
  it('tem 8 categorias', () => {
    expect(PHOTO_CATEGORIES.length).toBe(8);
  });
  it('inclui rescue, profile, health, foster, adoption, post_adoption, exhibition, other', () => {
    expect(PHOTO_CATEGORIES).toEqual(
      expect.arrayContaining(['rescue', 'profile', 'health', 'foster', 'adoption', 'post_adoption', 'exhibition', 'other']),
    );
  });
});

describe('PHOTO_CATEGORY_LABELS', () => {
  it('tem label pt-BR para cada categoria', () => {
    for (const c of PHOTO_CATEGORIES) {
      expect(PHOTO_CATEGORY_LABELS[c]).toBeTruthy();
    }
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────

describe('daysUntilPurge', () => {
  it('retorna 30 se deletada agora', () => {
    const now = new Date('2026-07-10T12:00:00.000Z');
    const deleted = '2026-07-10T12:00:00.000Z';
    expect(daysUntilPurge(deleted, now.getTime())).toBe(30);
  });
  it('retorna null se não deletada', () => {
    expect(daysUntilPurge(null)).toBeNull();
    expect(daysUntilPurge(undefined)).toBeNull();
  });
  it('retorna 0 se passou 31+ dias', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    const deleted = '2026-07-10T12:00:00.000Z';
    expect(daysUntilPurge(deleted, now.getTime())).toBe(0);
  });
  it('retorna valor aproximado para 15 dias', () => {
    const now = new Date('2026-07-25T12:00:00.000Z');
    const deleted = '2026-07-10T12:00:00.000Z';
    expect(daysUntilPurge(deleted, now.getTime())).toBeGreaterThan(14);
    expect(daysUntilPurge(deleted, now.getTime())).toBeLessThan(16);
  });
});

describe('PURGE_DAYS', () => {
  it('é 30', () => {
    expect(PURGE_DAYS).toBe(30);
  });
});

// ─── Schema ──────────────────────────────────────────────────────────

describe('createPetPhotoSchema', () => {
  it('aceita input válido', () => {
    expect(createPetPhotoSchema.safeParse(validInput).success).toBe(true);
  });
  it('rejeita category inválida', () => {
    expect(createPetPhotoSchema.safeParse({ ...validInput, category: 'foo' }).success).toBe(false);
  });
  it('rejeita url inválida', () => {
    expect(createPetPhotoSchema.safeParse({ ...validInput, url: 'not-a-url' }).success).toBe(false);
  });
  it('aceita sem thumb_url (opcional)', () => {
    const { thumb_url, ...input } = validInput;
    expect(createPetPhotoSchema.safeParse(input).success).toBe(true);
  });
  it('aceita sem caption (opcional)', () => {
    const { caption, ...input } = validInput;
    expect(createPetPhotoSchema.safeParse(input).success).toBe(true);
  });
  it('rejeita caption > 500 chars', () => {
    expect(createPetPhotoSchema.safeParse({ ...validInput, caption: 'x'.repeat(501) }).success).toBe(false);
  });
  it('rejeita sem pet_id ou shelter_club_id', () => {
    const { pet_id, ...input } = validInput;
    expect(createPetPhotoSchema.safeParse(input).success).toBe(false);
    const { shelter_club_id, ...input2 } = validInput;
    expect(createPetPhotoSchema.safeParse(input2).success).toBe(false);
  });
});

describe('updatePetPhotoSchema', () => {
  it('aceita parcial (só caption)', () => {
    expect(updatePetPhotoSchema.safeParse({ caption: 'novo' }).success).toBe(true);
  });
  it('aceita mudança de category', () => {
    expect(updatePetPhotoSchema.safeParse({ category: 'health' }).success).toBe(true);
  });
  it('rejeita url (não pode trocar url)', () => {
    expect(updatePetPhotoSchema.safeParse({ url: 'new' }).success).toBe(false);
  });
});

// ─── list / get ───────────────────────────────────────────────────────

describe('listPetPhotos', () => {
  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listPetPhotos('p1', 'c1')).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });
  it('lança sem petId ou shelterClubId', async () => {
    await expect(listPetPhotos('', 'c1')).rejects.toThrow();
    await expect(listPetPhotos('p1', '')).rejects.toThrow();
  });
  it('filtra soft-deletadas por padrão', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'ph-1', data: () => ({ url: 'x', deleted_at: null }) },
        { id: 'ph-2', data: () => ({ url: 'y', deleted_at: '2026-07-01' }) },
      ],
    });
    const r = await listPetPhotos('p1', 'c1');
    expect(r.length).toBe(1);
    expect(r[0].id).toBe('ph-1');
  });
  it('inclui deletadas se includeDeleted=true', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'ph-1', data: () => ({ url: 'x', deleted_at: null }) },
        { id: 'ph-2', data: () => ({ url: 'y', deleted_at: '2026-07-01' }) },
      ],
    });
    const r = await listPetPhotos('p1', 'c1', { includeDeleted: true });
    expect(r.length).toBe(2);
  });
});

describe('listDeletedPhotos', () => {
  it('lança sem petId ou shelterClubId', async () => {
    await expect(listDeletedPhotos('', 'c1')).rejects.toThrow();
    await expect(listDeletedPhotos('p1', '')).rejects.toThrow();
  });
  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [{ id: 'ph-del', data: () => ({ deleted_at: '2026-07-01' }) }],
    });
    const r = await listDeletedPhotos('p1', 'c1');
    expect(r[0].id).toBe('ph-del');
  });
});

describe('getPetPhoto', () => {
  it('retorna null se cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(photoSnap({ shelter_club_id: 'c2' }, 'ph-1'));
    expect(await getPetPhoto('ph-1', 'c1')).toBeNull();
  });
  it('retorna doc se tenant bate', async () => {
    mockGetDoc.mockResolvedValue(photoSnap({ shelter_club_id: 'c1', url: 'x' }, 'ph-1'));
    const r = await getPetPhoto('ph-1', 'c1');
    expect(r.id).toBe('ph-1');
    expect(r.url).toBe('x');
  });
});

// ─── createPetPhoto ──────────────────────────────────────────────

describe('createPetPhoto', () => {
  it('cria foto com audit', async () => {
    mockAddDoc.mockResolvedValue({ id: 'ph-new' });
    const r = await createPetPhoto(validInput, { uid: 'u1', displayName: 'João' });
    expect(r.id).toBe('ph-new');
    expect(r.category).toBe('profile');
    expect(r.uploaded_by_uid).toBe('u1');
    expect(r.uploaded_by_name).toBe('João');
    expect(r.deleted_at).toBeNull();
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'pet_photo_uploaded' }),
    );
  });
});

// ─── updatePetPhoto ──────────────────────────────────────────────

describe('updatePetPhoto', () => {
  it('atualiza caption + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await updatePetPhoto('ph-1', 'c1', { caption: 'nova' }, { uid: 'u1' });
    expect(r.changed_fields).toContain('caption');
  });

  it('retorna noop se vazio', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({ shelter_club_id: 'c1' }));
    const r = await updatePetPhoto('ph-1', 'c1', {}, { uid: 'u1' });
    expect(r.noop).toBe(true);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({ shelter_club_id: 'c2' }));
    await expect(
      updatePetPhoto('ph-1', 'c1', { caption: 'X' }, { uid: 'u1' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── softDeletePetPhoto ─────────────────────────────────────────

describe('softDeletePetPhoto', () => {
  it('marca deleted_at + audit', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({ shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await softDeletePetPhoto('ph-1', 'c1', { uid: 'u1' });
    expect(r.ok).toBe(true);
    expect(r.days_until_purge).toBe(30);
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.deleted_at).toBeTruthy();
    expect(payload.deleted_by_uid).toBe('u1');
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'pet_photo_soft_deleted' }),
    );
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({ shelter_club_id: 'c2' }));
    await expect(
      softDeletePetPhoto('ph-1', 'c1', { uid: 'u1' }),
    ).rejects.toThrow(/Cross-tenant/);
  });
});

// ─── restorePetPhoto ───────────────────────────────────────────

describe('restorePetPhoto', () => {
  it('restaura foto deletada recentemente', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({
      shelter_club_id: 'c1',
      deleted_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await restorePetPhoto('ph-1', 'c1', { uid: 'u1' });
    expect(r.ok).toBe(true);
    expect(r.restored).toBe(true);
    expect(r.days_remaining).toBeGreaterThan(20);
    const payload = mockUpdateDoc.mock.calls[0][1];
    expect(payload.deleted_at).toBeNull();
    expect(payload.deleted_by_uid).toBeNull();
  });

  it('bloqueia restauração após 30d', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({
      shelter_club_id: 'c1',
      deleted_at: new Date(Date.now() - 31 * 24 * 3600 * 1000).toISOString(),
    }));
    await expect(
      restorePetPhoto('ph-1', 'c1', { uid: 'u1' }),
    ).rejects.toThrow(/expirou/);
  });

  it('retorna noop se não está deletada', async () => {
    mockGetDoc.mockResolvedValueOnce(photoSnap({
      shelter_club_id: 'c1',
      deleted_at: null,
    }));
    const r = await restorePetPhoto('ph-1', 'c1', { uid: 'u1' });
    expect(r.noop).toBe(true);
  });
});

// ─── countPetPhotos ───────────────────────────────────────────

describe('countPetPhotos', () => {
  it('retorna size do snapshot', async () => {
    mockGetDocs.mockResolvedValue({ size: 7 });
    expect(await countPetPhotos('p1', 'c1')).toBe(7);
  });
});
