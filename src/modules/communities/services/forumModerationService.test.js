/**
 * @fileoverview Tests do forumModerationService (TASK-160).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'ST'),
}));

vi.mock('@/core/config/firebase', () => ({
  db: { mock: 'db' },
}));

vi.mock('@/core/services/auditService', () => ({
  createAuditLog: vi.fn().mockResolvedValue(true),
}));

vi.mock('./codeOfConductService', () => ({
  hasUserAcceptedCoc: vi.fn(),
  recordCocAcceptance: vi.fn(),
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  checkForumCocStatus, createForumThread, createForumReply,
  COC_STATUS,
} from './forumModerationService';
import { hasUserAcceptedCoc } from './codeOfConductService';
import { addDoc } from 'firebase/firestore';

describe('forumModerationService — checkForumCocStatus', () => {
  it('sem userId → NOT_AUTHENTICATED', async () => {
    const result = await checkForumCocStatus(null, 'c1');
    expect(result.status).toBe(COC_STATUS.NOT_AUTHENTICATED);
  });

  it('CoC aceito → OK', async () => {
    hasUserAcceptedCoc.mockResolvedValue(true);
    const result = await checkForumCocStatus('u1', 'c1');
    expect(result.status).toBe(COC_STATUS.OK);
  });

  it('CoC não aceito → HAS_NOT_ACCEPTED', async () => {
    hasUserAcceptedCoc.mockResolvedValue(false);
    const result = await checkForumCocStatus('u1', 'c1');
    expect(result.status).toBe(COC_STATUS.HAS_NOT_ACCEPTED);
  });
});

describe('forumModerationService — createForumThread', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('cria thread quando CoC aceito', async () => {
    hasUserAcceptedCoc.mockResolvedValue(true);
    addDoc.mockResolvedValue({ id: 'thread-1' });
    const result = await createForumThread(
      { communityId: 'c1', title: 'T1', body: 'B1', authorId: 'u1' },
      { uid: 'u1' },
    );
    expect(result.id).toBe('thread-1');
    expect(addDoc).toHaveBeenCalled();
  });

  it('lança forum/coc_required quando CoC não aceito', async () => {
    hasUserAcceptedCoc.mockResolvedValue(false);
    await expect(
      createForumThread(
        { communityId: 'c1', title: 'T1', body: 'B1' },
        { uid: 'u1' },
      ),
    ).rejects.toThrow(/Code of Conduct/);
  });

  it('lança sem actor.uid', async () => {
    await expect(
      createForumThread({ communityId: 'c1', title: 'T1', body: 'B1' }, null),
    ).rejects.toThrow();
  });
});

describe('forumModerationService — createForumReply', () => {
  it('cria reply quando CoC aceito', async () => {
    hasUserAcceptedCoc.mockResolvedValue(true);
    addDoc.mockResolvedValue({ id: 'reply-1' });
    const result = await createForumReply(
      { threadId: 't1', communityId: 'c1', body: 'B1' },
      { uid: 'u1' },
    );
    expect(result.id).toBe('reply-1');
  });

  it('lança forum/coc_required quando CoC não aceito', async () => {
    hasUserAcceptedCoc.mockResolvedValue(false);
    await expect(
      createForumReply(
        { threadId: 't1', communityId: 'c1', body: 'B1' },
        { uid: 'u1' },
      ),
    ).rejects.toThrow(/Code of Conduct/);
  });
});

describe('forumModerationService — moderatorDeleteContent', () => {
  it('rejeita actor sem platformAdmin role', async () => {
    const { moderatorDeleteContent } = await import('./forumModerationService');
    await expect(
      moderatorDeleteContent(
        { contentId: 'x', contentType: 'thread', reason: 'spam' },
        { uid: 'u1', roles: ['user'] },
      ),
    ).rejects.toThrow(/platform admin/);
  });
});
