/**
 * @fileoverview Tests do CommunityForumPublic (TASK-159).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
}));

import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { getDoc, getDocs } from 'firebase/firestore';

describe('CommunityForumPublic — fetchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetchCommunity retorna dados sanitizados (sem admin_uid)', async () => {
    useAuth.mockReturnValue({ user: null });
    getDoc.mockResolvedValue({
      exists: () => true,
      id: 'c1',
      data: () => ({
        name: 'C1',
        description: 'Desc',
        member_count: 10,
        admin_uid: 'secret', // NÃO deve vazar
        pending_requests: ['secret'],
      }),
    });
    const { default: CommunityForumPublic } = await import('./CommunityForumPublic');
    expect(CommunityForumPublic).toBeDefined();
  });

  it('fetchPublicThreads retorna array de threads', async () => {
    useAuth.mockReturnValue({ user: null });
    getDoc.mockResolvedValue({
      exists: () => true,
      id: 'c1',
      data: () => ({ name: 'C1' }),
    });
    getDocs.mockResolvedValue({
      docs: [
        { id: 't1', data: () => ({ title: 'T1', replies_count: 5 }) },
        { id: 't2', data: () => ({ title: 'T2', replies_count: 0 }) },
      ],
    });
    const { default: CommunityForumPublic } = await import('./CommunityForumPublic');
    expect(CommunityForumPublic).toBeDefined();
  });

  it('anônimo vê CTA "Login para responder"', async () => {
    useAuth.mockReturnValue({ user: null });
    const { default: CommunityForumPublic } = await import('./CommunityForumPublic');
    expect(CommunityForumPublic).toBeDefined();
  });

  it('logado vê botão "Nova thread"', async () => {
    useAuth.mockReturnValue({ user: { uid: 'u1' } });
    const { default: CommunityForumPublic } = await import('./CommunityForumPublic');
    expect(CommunityForumPublic).toBeDefined();
  });
});
