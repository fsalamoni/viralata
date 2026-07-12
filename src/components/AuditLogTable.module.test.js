import { describe, it, expect } from 'vitest';
import { classifyAuditModule } from './AuditLogTable';

describe('classifyAuditModule (TASK-169)', () => {
  it('classifica actions de abrigo', () => {
    expect(classifyAuditModule('volunteer_check_in')).toBe('shelter');
    expect(classifyAuditModule('adoption_terms_accepted')).toBe('shelter');
    expect(classifyAuditModule('pet_created')).toBe('shelter');
  });
  it('classifica actions de comunidade/ONG', () => {
    expect(classifyAuditModule('community_post_created')).toBe('community');
    expect(classifyAuditModule('club_member_joined')).toBe('community');
  });
  it('classifica actions de admin master', () => {
    expect(classifyAuditModule('platform_feature_flag_changed')).toBe('admin');
    expect(classifyAuditModule('user_banned')).toBe('admin');
  });
  it('fallback core', () => {
    expect(classifyAuditModule('terms_accepted')).toBe('core');
    expect(classifyAuditModule('')).toBe('core');
  });
});
