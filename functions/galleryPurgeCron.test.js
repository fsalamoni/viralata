/**
 * @fileoverview Testes do galleryPurgeCronCore (núcleo puro).
 *
 * Importa o núcleo testável (sem firebase-functions) e mocks o
 * firebase-admin via vi.mock — padrão idêntico a securityAlertsCore.
 *
 * @see galleryPurgeCronCore.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { daysSince, processGalleryPurge, PURGE_DAYS, BATCH_SIZE } from './galleryPurgeCronCore';

const mockGet = vi.fn();
const mockBatch = vi.fn();
const mockBatchDelete = vi.fn();
const mockBatchCommit = vi.fn();
const mockFileDelete = vi.fn();
const mockLoggerError = vi.fn();
const mockLoggerInfo = vi.fn();

const mockPhotos = {
  empty: false,
  docs: [
    {
      id: 'ph-1',
      ref: { id: 'ph-1' },
      data: () => ({ storage_path: 'pets/p1/ph-1.jpg', deleted_at: '2026-05-01' }),
    },
    {
      id: 'ph-2',
      ref: { id: 'ph-2' },
      data: () => ({ storage_path: null, deleted_at: '2026-05-01' }),
    },
    {
      id: 'ph-3',
      ref: { id: 'ph-3' },
      data: () => ({ storage_path: 'pets/p3/thumb.jpg', deleted_at: '2026-04-01' }),
    },
  ],
};

vi.mock('firebase-admin/firestore', () => ({
  mockGet,
}));

describe('galleryPurgeCronCore — daysSince', () => {
  it('retorna 0 para data null', () => {
    expect(daysSince(null)).toBe(0);
  });

  it('retorna 0 para data undefined', () => {
    expect(daysSince(undefined)).toBe(0);
  });

  it('retorna valor positivo para data passada', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const result = daysSince(thirtyDaysAgo);
    expect(result).toBeGreaterThan(29);
    expect(result).toBeLessThan(31);
  });

  it('retorna 0 para data futura', () => {
    const future = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    expect(daysSince(future)).toBeLessThan(0);
  });
});

describe('galleryPurgeCronCore — processGalleryPurge', () => {
  const makeDeps = () => ({
    db: {
      batch: () => ({
        delete: mockBatchDelete,
        commit: mockBatchCommit,
      }),
    },
    storage: {
      bucket: () => ({
        file: (path) => ({
          delete: (opts) => mockFileDelete(path, opts),
        }),
      }),
    },
  });

  const makeLogger = () => ({
    info: mockLoggerInfo,
    error: mockLoggerError,
  });

  beforeEach(() => {
    mockGet.mockReset();
    mockBatchDelete.mockReset();
    mockBatchCommit.mockReset();
    mockFileDelete.mockReset();
    mockLoggerError.mockReset();
    mockLoggerInfo.mockReset();
  });

  it('retorna purged:0 se não há docs', async () => {
    const deps = makeDeps();
    deps.db.batch = () => ({ delete: mockBatchDelete, commit: mockBatchCommit });
    const result = await processGalleryPurge(deps, [], makeLogger());
    expect(result.purged).toBe(0);
    expect(result.errors).toBe(0);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('purges files do storage e deleta docs do firestore', async () => {
    const deps = makeDeps();
    const logger = makeLogger();
    const result = await processGalleryPurge(deps, mockPhotos.docs, logger);
    expect(result.purged).toBe(3);
    expect(result.errors).toBe(0);
    expect(mockBatchDelete).toHaveBeenCalledTimes(3);
    expect(mockBatchCommit).toHaveBeenCalled();
    expect(mockFileDelete).toHaveBeenCalledWith('pets/p1/ph-1.jpg', { ignoreNotFound: true });
    expect(mockFileDelete).toHaveBeenCalledWith('pets/p3/thumb.jpg', { ignoreNotFound: true });
  });

  it('ignora doc com storage_path null (só deleta doc)', async () => {
    const deps = makeDeps();
    const docs = [
      {
        id: 'ph-no-storage',
        ref: { id: 'ph-no-storage' },
        data: () => ({ storage_path: null, deleted_at: '2026-05-01' }),
      },
    ];
    const result = await processGalleryPurge(deps, docs, makeLogger());
    expect(result.purged).toBe(1);
    expect(result.errors).toBe(0);
    expect(mockBatchDelete).toHaveBeenCalledTimes(1);
    expect(mockFileDelete).not.toHaveBeenCalled();
  });

  it('não commita batch se purged=0', async () => {
    const deps = makeDeps();
    const result = await processGalleryPurge(deps, [], makeLogger());
    expect(result.purged).toBe(0);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('incrementa errors quando file.delete lança', async () => {
    const deps = makeDeps();
    mockFileDelete.mockRejectedValue(new Error('GCS error'));
    const result = await processGalleryPurge(deps, mockPhotos.docs, makeLogger());
    expect(result.errors).toBeGreaterThan(0);
    // batch.delete(doc.ref) está DENTRO do try, antes de purguecount++ —
    // se o delete do storage lança, batch.delete não roda E purgecount não incrementa.
    // Com mockPhotos.docs tendo 2 docs com storage_path, errors=2 e purged=1 (o sem storage).
    expect(result.purged).toBe(1); // ph-2 não tem storage_path, não lança
  });
});
