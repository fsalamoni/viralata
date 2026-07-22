/**
 * @fileoverview Testes para petLogService — appendPetLog, listPetLog.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((db, ...segments) => ({ _segments: segments }));
const mockQuery = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();

vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => mockAddDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  collection: (...args) => mockCollection(...args),
  query: (...args) => mockQuery(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (...args) => mockLimit(...args),
  serverTimestamp: () => ({ _isServerTimestamp: true }),
}));

vi.mock('@/core/config/firebase', () => ({
  db: { _isMockDb: true },
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const { appendPetLog, listPetLog, PET_LOG_ACTIONS } = await import('./petLogService.js');

describe('petLogService — TASK-V3-PET-OPS-LOG', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PET_LOG_ACTIONS', () => {
    it('exporta enum de actions', () => {
      expect(PET_LOG_ACTIONS.PET_CREATED).toBe('pet_created');
      expect(PET_LOG_ACTIONS.PET_UPDATED).toBe('pet_updated');
      expect(PET_LOG_ACTIONS.PET_DELETED).toBe('pet_deleted');
      expect(PET_LOG_ACTIONS.NOTE_CREATED).toBe('note_created');
      expect(PET_LOG_ACTIONS.NOTE_DELETED).toBe('note_deleted');
    });
  });

  describe('appendPetLog', () => {
    it('retorna { ok: false } se petId ausente', async () => {
      const r = await appendPetLog(null, { action: 'x', actor: { uid: 'u1' } });
      expect(r.ok).toBe(false);
    });

    it('retorna { ok: false } se action ausente', async () => {
      const r = await appendPetLog('pet1', { actor: { uid: 'u1' } });
      expect(r.ok).toBe(false);
    });

    it('grava entrada com actor_uid/actor_name/created_at/collection/docId', async () => {
      mockAddDoc.mockResolvedValue({ id: 'log1' });
      const actor = { uid: 'u1', displayName: 'Fulano', email: 'f@x.com' };
      const r = await appendPetLog('pet1', {
        action: PET_LOG_ACTIONS.PET_CREATED,
        actor,
        target: { collection: 'pets', docId: 'pet1' },
        details: { title: 'Buddy' },
      });
      expect(r.ok).toBe(true);
      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      const [refArg, entryArg] = mockAddDoc.mock.calls[0];
      // O ref aponta para pets/pet1/pet_audit_log
      expect(refArg._segments).toEqual(['pets', 'pet1', 'pet_audit_log']);
      expect(entryArg.action).toBe('pet_created');
      expect(entryArg.actor_uid).toBe('u1');
      expect(entryArg.actor_name).toBe('Fulano');
      expect(entryArg.actor_email).toBe('f@x.com');
      expect(entryArg.target_collection).toBe('pets');
      expect(entryArg.target_doc_id).toBe('pet1');
      expect(entryArg.details).toEqual({ title: 'Buddy' });
      expect(entryArg.created_at).toBeDefined();
    });

    it('usa fallback "Sistema" se actor sem nome/email', async () => {
      mockAddDoc.mockResolvedValue({ id: 'log1' });
      await appendPetLog('pet1', {
        action: PET_LOG_ACTIONS.PET_DELETED,
        actor: { uid: 'u1' },
      });
      const entryArg = mockAddDoc.mock.calls[0][1];
      expect(entryArg.actor_name).toBe('Sistema');
    });

    it('retorna { ok: false } se addDoc falhar (mas NÃO throw)', async () => {
      mockAddDoc.mockRejectedValue(new Error('network down'));
      const r = await appendPetLog('pet1', {
        action: PET_LOG_ACTIONS.PET_UPDATED,
        actor: { uid: 'u1' },
      });
      expect(r.ok).toBe(false);
      expect(r.error).toContain('network down');
    });
  });

  describe('listPetLog', () => {
    it('retorna array vazio se petId ausente', async () => {
      const r = await listPetLog(null);
      expect(r).toEqual([]);
    });

    it('retorna array vazio se getDocs falhar', async () => {
      mockGetDocs.mockRejectedValue(new Error('firestore off'));
      const r = await listPetLog('pet1');
      expect(r).toEqual([]);
    });

    it('mapeia docs com id', async () => {
      mockGetDocs.mockResolvedValue({
        docs: [
          { id: 'log1', data: () => ({ action: 'pet_created', actor_name: 'Fulano' }) },
          { id: 'log2', data: () => ({ action: 'pet_updated', actor_name: 'Ciclano' }) },
        ],
      });
      const r = await listPetLog('pet1');
      expect(r).toHaveLength(2);
      expect(r[0].id).toBe('log1');
      expect(r[0].action).toBe('pet_created');
    });
  });
});
