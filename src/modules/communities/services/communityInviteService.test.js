import { describe, it, expect } from 'vitest';
import { COMMUNITY_INVITE_STATUS, COMMUNITY_INVITE_ROLES } from './communityInviteService';
describe('communityInviteService (TASK-348)', () => {
  it('STATUS tem 3 estados', () => {
    expect(COMMUNITY_INVITE_STATUS.PENDING).toBe('pending');
    expect(COMMUNITY_INVITE_STATUS.ACCEPTED).toBe('accepted');
    expect(COMMUNITY_INVITE_STATUS.DECLINED).toBe('declined');
  });
  it('ROLES tem MEMBER e MODERATOR', () => {
    expect(COMMUNITY_INVITE_ROLES.MEMBER).toBe('member');
    expect(COMMUNITY_INVITE_ROLES.MODERATOR).toBe('moderator');
  });
});
