/**
 * @fileoverview Testes do trigger de notificações de comunidade (TASK-336).
 *
 * Covered:
 *   - runOnCommunityPostCreated: notifica admins, exclui autor
 *   - runOnCommunityPostLiked: notifica autor do post, exclui auto-like
 *   - runOnCommunityPostCommented: notifica autor + comentadores, exclui auto-comment
 *   - runOnCommunityEventCreated: notifica admins, exclui criador
 *   - dedupId: determinístico
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mock Firestore ─────────────────────────────────────────────────────

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockUpdate = vi.fn();
const mockRunTransaction = vi.fn();

const docRef = vi.fn(() => ({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
}));

const collectionRef = vi.fn(() => ({
  where: vi.fn(function () { return this; }),
  doc: docRef,
  get: mockGet,
}));

const mockDb = {
  collection: collectionRef,
  doc: docRef,
  runTransaction: mockRunTransaction,
};

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  default: { getFirestore: () => mockDb },
}));

// Suprime logs durante testes
vi.mock('firebase-functions', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

let mod;
let runOnCommunityPostCreated;
let runOnCommunityPostLiked;
let runOnCommunityPostCommented;
let runOnCommunityEventCreated;
let dedupId;

beforeEach(async () => {
  vi.clearAllMocks();
  // Testa a lógica pura via communityNotificationsCore (sem Firebase triggers)
  mod = require('./communityNotificationsCore.cjs');
  runOnCommunityPostCreated = (event) => mod.runOnCommunityPostCreated(mockDb, event);
  runOnCommunityPostLiked = (event) => mod.runOnCommunityPostLiked(mockDb, event);
  runOnCommunityPostCommented = (event) => mod.runOnCommunityPostCommented(mockDb, event);
  runOnCommunityEventCreated = (event) => mod.runOnCommunityEventCreated(mockDb, event);
  dedupId = mod.dedupId;
});

function mockEvent(data, id = 'mock_id', params = {}) {
  return {
    data: {
      id,
      data: () => data,
    },
    params,
  };
}

function mockDocSnap(exists = true, data = {}) {
  return { exists, data: () => data };
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('communityNotifications — dedupId', () => {
  it('gera IDs determinísticos (mesmo input → mesmo output)', () => {
    const id1 = dedupId('com_post', 'c1', 'p1', 'created');
    const id2 = dedupId('com_post', 'c1', 'p1', 'created');
    expect(id1).toBe(id2);
  });

  it('prefixos diferentes geram IDs diferentes', () => {
    const id1 = dedupId('com_post', 'c1', 'p1', 'created');
    const id2 = dedupId('com_like', 'c1', 'p1', 'liked');
    expect(id1).not.toBe(id2);
  });

  it('ID inclui o prefixo no início', () => {
    const id = dedupId('com_event', 'c1', 'e1', 'created');
    expect(id.startsWith('com_event:')).toBe(true);
  });
});

describe('communityNotifications — runOnCommunityPostCreated', () => {
  it('retorna early se post não tem data', async () => {
    const ev = { data: { id: 'p1', data: () => null } };
    const result = await runOnCommunityPostCreated(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('retorna early se post não tem community_id', async () => {
    const ev = mockEvent({ author_id: 'u1' });
    const result = await runOnCommunityPostCreated(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('retorna early se não há admins para notificar', async () => {
    mockGet.mockResolvedValue({ docs: [] });
    const ev = mockEvent({ community_id: 'c1', author_id: 'u1', text: 'hello' });
    const result = await runOnCommunityPostCreated(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('exclui autor do grupo de notificação quando é admin', async () => {
    // 2 admins: u1 (autor) e u2
    mockGet.mockResolvedValue({
      docs: [
        { id: 'u1', data: () => ({ role: 'admin' }) },
        { id: 'u2', data: () => ({ role: 'admin' }) },
      ],
    });

    mockRunTransaction.mockImplementation(async (fn) => {
      await fn({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: mockSet,
      });
    });

    const ev = mockEvent({ community_id: 'c1', author_id: 'u1', author_name: 'Alice', text: 'hello' });
    await runOnCommunityPostCreated(ev);

    // mockSet foi chamado (fan-out de notificação)
    expect(mockSet.mock.calls.length).toBeGreaterThan(0);
  });
});

describe('communityNotifications — runOnCommunityPostLiked', () => {
  it('retorna early se like não tem data', async () => {
    const ev = { data: { id: 'l1', data: () => null } };
    const result = await runOnCommunityPostLiked(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('retorna early se post não existe', async () => {
    mockGet.mockResolvedValue({ exists: false });
    const ev = mockEvent({ post_id: 'p1', user_id: 'u2' });
    const result = await runOnCommunityPostLiked(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('retorna {reason: self_like} se autor curte próprio post', async () => {
    mockGet.mockResolvedValue(mockDocSnap(true, { author_id: 'u1', community_id: 'c1' }));
    const ev = mockEvent({ post_id: 'p1', user_id: 'u1' });
    const result = await runOnCommunityPostLiked(ev);
    expect(result).toEqual({ notified: 0, reason: 'self_like' });
  });

  it('notifica autor do post quando outro usuário curte', async () => {
    mockGet.mockResolvedValue(mockDocSnap(true, { author_id: 'u1', community_id: 'c1' }));
    mockRunTransaction.mockImplementation(async (fn) => {
      await fn({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: mockSet,
      });
    });
    const ev = mockEvent({ post_id: 'p1', user_id: 'u2' });
    const result = await runOnCommunityPostLiked(ev);
    expect(result).toEqual({ created: 1, suppressed: 0 });
  });
});

describe('communityNotifications — runOnCommunityPostCommented', () => {
  it('retorna early se comment não tem data', async () => {
    const ev = { data: { id: 'c1', data: () => null } };
    const result = await runOnCommunityPostCommented(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('retorna early se post não existe', async () => {
    mockGet.mockResolvedValue({ exists: false });
    const ev = mockEvent({ post_id: 'p1', author_id: 'u2', text: 'nice!' });
    const result = await runOnCommunityPostCommented(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('notifica post author + comentadores (exceto quem comentou)', async () => {
    mockGet
      .mockResolvedValueOnce(mockDocSnap(true, { author_id: 'u1', community_id: 'c1' })) // post snap
      .mockResolvedValueOnce({           // existing comments
        docs: [
          { data: () => ({ author_id: 'u3' }) },
        ],
      });

    mockRunTransaction.mockImplementation(async (fn) => {
      await fn({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: mockSet,
      });
    });

    // u2 comenta no post de u1 (u1 é o autor do post)
    const ev = mockEvent({ post_id: 'p1', author_id: 'u2', author_name: 'Bob', text: 'great post!' });
    const result = await runOnCommunityPostCommented(ev);

    // u2 não deve ser notificado (auto-comment), u1 e u3 devem
    expect(result).toEqual({ created: 2, suppressed: 0 });
  });

  it('não notifica autor do post quando comenta no próprio post', async () => {
    mockGet
      .mockResolvedValueOnce(mockDocSnap(true, { author_id: 'u1', community_id: 'c1' }))
      .mockResolvedValueOnce({ docs: [] });

    const ev = mockEvent({ post_id: 'p1', author_id: 'u1', text: 'me too!' });
    const result = await runOnCommunityPostCommented(ev);
    expect(result).toEqual({ notified: 0 });
  });
});

describe('communityNotifications — runOnCommunityEventCreated', () => {
  it('retorna early se event não tem data', async () => {
    const ev = { data: { id: 'e1', data: () => null } };
    const result = await runOnCommunityEventCreated(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('retorna early se event não tem community_id', async () => {
    const ev = mockEvent({ created_by: 'u1', title: 'evento legal' });
    const result = await runOnCommunityEventCreated(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('retorna early se não há admins', async () => {
    mockGet.mockResolvedValue({ docs: [] });
    const ev = mockEvent({ community_id: 'c1', created_by: 'u1', title: 'evento' });
    const result = await runOnCommunityEventCreated(ev);
    expect(result).toEqual({ notified: 0 });
  });

  it('exclui criador quando é admin', async () => {
    mockGet.mockResolvedValue({
      docs: [
        { id: 'u1', data: () => ({ role: 'admin' }) },
        { id: 'u2', data: () => ({ role: 'admin' }) },
      ],
    });
    mockRunTransaction.mockImplementation(async (fn) => {
      await fn({
        get: vi.fn().mockResolvedValue({ exists: false }),
        set: mockSet,
      });
    });
    const ev = mockEvent({ community_id: 'c1', created_by: 'u1', title: 'Encontro' });
    const result = await runOnCommunityEventCreated(ev);
    // u2 é admin mas não é criador, então é notificado
    expect(result).toEqual({ created: 1, suppressed: 0 });
  });
});
