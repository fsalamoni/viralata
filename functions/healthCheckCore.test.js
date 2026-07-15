/**
 * @fileoverview Testes do healthCheckCore (TASK-239).
 *
 * Testa a lógica pura de getHealth, checkFirestore, checkAuth, checkStorage
 * com clients mockados. Sem dependência de firebase-functions.
 */

import { describe, it, expect, vi } from 'vitest';
import { getHealth, checkFirestore, checkAuth, checkStorage } from './healthCheckCore.js';

describe('healthCheckCore', () => {
  describe('checkFirestore', () => {
    it('returns ok=true when ping doc write+read+delete succeeds', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            set: vi.fn().mockResolvedValue({}),
            get: vi.fn().mockResolvedValue({ exists: true }),
            delete: vi.fn().mockResolvedValue({}),
          })),
        })),
      };
      const result = await checkFirestore(mockDb);
      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('returns ok=false when firestore throws', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            set: vi.fn().mockRejectedValue(new Error('Firestore unavailable')),
          })),
        })),
      };
      const result = await checkFirestore(mockDb);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Firestore unavailable');
    });
  });

  describe('checkAuth', () => {
    it('returns ok=true when auth.listUsers succeeds', async () => {
      const mockAuth = { listUsers: vi.fn().mockResolvedValue([{ users: [] }]) };
      const result = await checkAuth(mockAuth);
      expect(result.ok).toBe(true);
    });

    it('returns ok=false when auth throws', async () => {
      const mockAuth = { listUsers: vi.fn().mockRejectedValue(new Error('Auth error')) };
      const result = await checkAuth(mockAuth);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Auth error');
    });
  });

  describe('checkStorage', () => {
    it('returns ok=true when storage.getBuckets succeeds', async () => {
      const mockStorage = { getBuckets: vi.fn().mockResolvedValue([[]]) };
      const result = await checkStorage(mockStorage);
      expect(result.ok).toBe(true);
    });

    it('returns ok=false when storage throws', async () => {
      const mockStorage = { getBuckets: vi.fn().mockRejectedValue(new Error('Storage error')) };
      const result = await checkStorage(mockStorage);
      expect(result.ok).toBe(false);
      expect(result.error).toBe('Storage error');
    });
  });

  describe('getHealth', () => {
    it('returns status=ok when all deps are up', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            set: vi.fn().mockResolvedValue({}),
            get: vi.fn().mockResolvedValue({ exists: true }),
            delete: vi.fn().mockResolvedValue({}),
          })),
        })),
      };
      const mockAuth = { listUsers: vi.fn().mockResolvedValue([{ users: [] }]) };
      const mockStorage = { getBuckets: vi.fn().mockResolvedValue([[]]) };

      const result = await getHealth({ db: mockDb, auth: mockAuth, storage: mockStorage });
      expect(result.status).toBe('ok');
      expect(result.version).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.deps.firestore.ok).toBe(true);
      expect(result.deps.auth.ok).toBe(true);
      expect(result.deps.storage.ok).toBe(true);
    });

    it('returns status=degraded when firestore is down', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            set: vi.fn().mockRejectedValue(new Error('DB down')),
          })),
        })),
      };
      const mockAuth = { listUsers: vi.fn().mockResolvedValue([{ users: [] }]) };
      const mockStorage = { getBuckets: vi.fn().mockResolvedValue([[]]) };

      const result = await getHealth({ db: mockDb, auth: mockAuth, storage: mockStorage });
      expect(result.status).toBe('degraded');
      expect(result.deps.firestore.ok).toBe(false);
      expect(result.deps.auth.ok).toBe(true);
    });

    it('returns status=degraded when all deps are down', async () => {
      const mockDb = {
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            set: vi.fn().mockRejectedValue(new Error('all down')),
          })),
        })),
      };
      const mockAuth = { listUsers: vi.fn().mockRejectedValue(new Error('auth down')) };
      const mockStorage = { getBuckets: vi.fn().mockRejectedValue(new Error('storage down')) };

      const result = await getHealth({ db: mockDb, auth: mockAuth, storage: mockStorage });
      expect(result.status).toBe('degraded');
    });
  });
});
