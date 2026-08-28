/**
 * @fileoverview Testes do serviço do Mural V2 (Fase 4 · SHELTER_MURAL_V2).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
let docCounter = 0;
const mockDoc = vi.fn((db, ...path) => {
  // doc(collectionRef) — no explicit path segment → generate an id
  if (path.length === 0) {
    docCounter += 1;
    return { _path: `gen-${docCounter}`, id: `gen-${docCounter}` };
  }
  return { _path: path.join('/'), id: path[path.length - 1] };
});
const mockServerTimestamp = vi.fn(() => ({ _ts: true }));
const mockArrayUnion = vi.fn((...v) => ({ _arrayUnion: v }));
const mockArrayRemove = vi.fn((...v) => ({ _arrayRemove: v }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
  arrayUnion: (...args) => mockArrayUnion(...args),
  arrayRemove: (...args) => mockArrayRemove(...args),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

const {
  createMuralPost,
  updateMuralPost,
  setPostPinned,
  setPostStatus,
  archivePost,
  publishPost,
  hideComment,
  unhideComment,
} = await import('./shelterMuralService');
const { POST_STATUS } = await import('@/modules/shelter/domain/engagement/mural');

const USER = { uid: 'u1', displayName: 'Ana', email: 'ana@x.com' };
const NOW = new Date('2026-08-28T12:00:00Z').getTime();
const DAY = 86400000;

beforeEach(() => {
  mockSetDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockGetDoc.mockReset();
  mockCreateAuditLog.mockReset();
  docCounter = 0;
});

describe('shelterMuralService', () => {
  describe('createMuralPost', () => {
    it('writes additive fields and audits (published by default)', async () => {
      const id = await createMuralPost('club1', { title: 'Oi', content: 'texto' }, USER, {}, NOW);
      expect(id).toBeTruthy();
      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const payload = mockSetDoc.mock.calls[0][1];
      expect(payload).toMatchObject({
        club_id: 'club1',
        author_id: 'u1',
        status: POST_STATUS.PUBLISHED,
        tags: [],
        mentions: [],
        pinned: false,
        scheduled_for: null,
        likes_count: 0,
        comments_count: 0,
        created_at_ms: NOW,
      });
      expect(payload).not.toHaveProperty('pinned_at');
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'club_mural_post_created' }),
      );
    });

    it('persists scheduled_for + pinned_at when scheduled and pinned', async () => {
      const future = NOW + DAY;
      await createMuralPost(
        'club1',
        { title: 'Agendado', status: 'published', scheduled_for: future, pinned: true, tags: ['#Adoção'] },
        USER, {}, NOW,
      );
      const payload = mockSetDoc.mock.calls[0][1];
      expect(payload.status).toBe(POST_STATUS.SCHEDULED);
      expect(payload.scheduled_for).toBe(future);
      expect(payload.pinned).toBe(true);
      expect(payload.pinned_at).toBe(NOW);
      expect(payload.tags).toEqual(['adoção']);
    });

    it('rejects empty content', async () => {
      await expect(createMuralPost('club1', {}, USER, {}, NOW)).rejects.toThrow(/Escreva/);
      expect(mockSetDoc).not.toHaveBeenCalled();
    });

    it('requires an authenticated user', async () => {
      await expect(createMuralPost('club1', { title: 'x' }, {}, {}, NOW)).rejects.toThrow(/autenticado/);
    });
  });

  describe('updateMuralPost', () => {
    it('updates additive fields and marks edited', async () => {
      await updateMuralPost('post1', { title: 'Novo', content: 'c', tags: ['vacina'] }, USER, NOW);
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch).toMatchObject({ title: 'Novo', edited: true, tags: ['vacina'], status: POST_STATUS.PUBLISHED });
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'club_mural_post_updated' }),
      );
    });
  });

  describe('setPostPinned', () => {
    it('pins with pinned_at', async () => {
      await setPostPinned('post1', true, USER, NOW);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch.pinned).toBe(true);
      expect(patch.pinned_at).toBe(NOW);
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'club_mural_post_pinned' }),
      );
    });
    it('unpins and clears pinned_at', async () => {
      await setPostPinned('post1', false, USER, NOW);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch.pinned).toBe(false);
      expect(patch.pinned_at).toBeNull();
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'club_mural_post_unpinned' }),
      );
    });
  });

  describe('setPostStatus / archive / publish', () => {
    it('archives', async () => {
      await archivePost('post1', USER);
      expect(mockUpdateDoc.mock.calls[0][1]).toMatchObject({ status: POST_STATUS.ARCHIVED });
    });
    it('publish clears scheduled_for', async () => {
      await publishPost('post1', USER);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch).toMatchObject({ status: POST_STATUS.PUBLISHED, scheduled_for: null });
    });
    it('rejects invalid status', async () => {
      await expect(setPostStatus('post1', 'weird', USER)).rejects.toThrow(/inválido/);
    });
  });

  describe('comment moderation', () => {
    it('hideComment uses arrayUnion and audits', async () => {
      await hideComment('post1', 'c9', USER);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch['moderation.hidden_comment_ids']).toEqual({ _arrayUnion: ['c9'] });
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'club_mural_comment_hidden' }),
      );
    });
    it('unhideComment uses arrayRemove and audits', async () => {
      await unhideComment('post1', 'c9', USER);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch['moderation.hidden_comment_ids']).toEqual({ _arrayRemove: ['c9'] });
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'club_mural_comment_unhidden' }),
      );
    });
    it('rejects empty comment id', async () => {
      await expect(hideComment('post1', '', USER)).rejects.toThrow(/inválido/);
    });
  });
});
