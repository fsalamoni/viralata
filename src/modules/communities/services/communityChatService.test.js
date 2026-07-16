import { describe, it, expect } from 'vitest';
import { makeCommunityThreadId, COMMUNITY_CHAT_STATUS } from './communityChatService';
describe('communityChatService (TASK-349)', () => {
  it('makeCommunityThreadId gera id determinístico', () => { expect(makeCommunityThreadId('c1', 'u1')).toBe('c1_u1'); });
  it('mesmo par gera mesmo id', () => { expect(makeCommunityThreadId('c1', 'u1')).toBe(makeCommunityThreadId('c1', 'u1')); });
  it('par diferente gera id diferente', () => { expect(makeCommunityThreadId('c1', 'u1')).not.toBe(makeCommunityThreadId('c2', 'u1')); });
  it('COMMUNITY_CHAT_STATUS tem OPEN e ARCHIVED', () => {
    expect(COMMUNITY_CHAT_STATUS.OPEN).toBe('open');
    expect(COMMUNITY_CHAT_STATUS.ARCHIVED).toBe('archived');
  });
});
