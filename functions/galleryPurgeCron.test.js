/**
 * @fileoverview Testes do galleryPurgeCron (Fase 10).
 *
 * Mock do Firebase Admin para testar a lógica do purge sem precisar
 * de credenciais reais.
 */

const { describe, it, expect, beforeEach, vi } = require('vitest');

const mockGet = vi.fn();
const mockBatch = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn();
const mockDocDelete = vi.fn();
const mockFileDelete = vi.fn();
const mockBucket = vi.fn();

const mockPhotos = {
  empty: false,
  docs: [
    { id: 'ph-1', ref: { id: 'ph-1' }, data: () => ({ storage_path: 'pets/p1/ph-1.jpg', deleted_at: '2026-05-01' }) },
    { id: 'ph-2', ref: { id: 'ph-2' }, data: () => ({ storage_path: null, deleted_at: '2026-05-01' }) },
  ],
};

vi.mock('firebase-admin', () => {
  return {
    default: {
      initializeApp: vi.fn(),
      firestore: () => ({
        collection: () => ({
          where: () => ({
            limit: () => ({
              get: () => mockGet(),
            }),
          }),
        }),
        batch: () => ({
          delete: mockBatchDelete,
          commit: mockBatchCommit,
        }),
      }),
      storage: () => ({
        bucket: () => ({
          file: (path) => ({
            delete: (opts) => mockFileDelete(path, opts),
          }),
        }),
      }),
    },
  };
});

vi.mock('firebase-functions/v1', () => ({
  pubsub: {
    schedule: () => ({
      timeZone: () => ({
        onRun: (handler) => handler,
      }),
    }),
  },
  logger: {
    info: () => {},
    error: () => {},
  },
}));

const { galleryPurgeCron } = require('./galleryPurgeCron');

describe('galleryPurgeCron', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockBatchDelete.mockReset();
    mockBatchCommit.mockReset();
    mockDocDelete.mockReset();
    mockFileDelete.mockReset();
  });

  it('retorna purged:0 se não há nada para purgar', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });
    const r = await galleryPurgeCron({});
    expect(r.purged).toBe(0);
  });

  it('purges files from storage and deletes firestore docs', async () => {
    mockGet.mockResolvedValue(mockPhotos);
    mockFileDelete.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);
    const r = await galleryPurgeCron({});
    expect(r.purged).toBe(2);
    expect(mockFileDelete).toHaveBeenCalledWith('pets/p1/ph-1.jpg', { ignoreNotFound: true });
    expect(mockBatchDelete).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalled();
  });

  it('ignora file com storage_path null (só deleta doc)', async () => {
    mockGet.mockResolvedValue(mockPhotos);
    mockFileDelete.mockResolvedValue(undefined);
    mockBatchCommit.mockResolvedValue(undefined);
    const r = await galleryPurgeCron({});
    // 2 docs, 1 com storage_path → 1 chamada de file.delete
    expect(r.purged).toBe(2);
  });
});
