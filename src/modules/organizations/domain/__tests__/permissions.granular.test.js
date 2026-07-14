/**
 * @fileoverview Tests para hasClubPermission com permissão granular nested (TASK-267).
 */
import { describe, it, expect } from 'vitest';
import { hasClubPermission } from '@/modules/organizations/domain/permissions.js';
import { CLUB_ROLE, CLUB_PERMISSION } from '@/modules/organizations/domain/constants.js';

const baseClub = { created_by: 'owner-1' };

describe('hasClubPermission (TASK-267 - granular)', () => {
  it('owner (currentUserUid matches) tem todas permissoes', () => {
    const membership = { user_id: 'member-1', role: CLUB_ROLE.MEMBER, permissions: {} };
    expect(hasClubPermission(baseClub, membership, CLUB_PERMISSION.VOLUNTEERS_DELETE, 'owner-1')).toBe(true);
    expect(hasClubPermission(baseClub, membership, CLUB_PERMISSION.VOLUNTEERS_BG_CHECK, 'owner-1')).toBe(true);
  });

  it('admin sem permissions tem todas', () => {
    const membership = { user_id: 'admin-1', role: CLUB_ROLE.ADMIN, permissions: null };
    expect(hasClubPermission(baseClub, membership, CLUB_PERMISSION.VOLUNTEERS_BG_CHECK, 'other-user')).toBe(true);
  });

  it('member com volunteers:read = true, mas SEM :bg_check = true, NAO pode aprovar BG', () => {
    const membership = {
      user_id: 'member-1',
      role: CLUB_ROLE.MEMBER,
      permissions: { volunteers: { read: true } },
    };
    expect(hasClubPermission(baseClub, membership, 'volunteers:read', 'other-user')).toBe(true);
    expect(hasClubPermission(baseClub, membership, 'volunteers:bg_check', 'other-user')).toBe(false);
  });

  it('member com volunteers:bulk = true pode fazer bulk', () => {
    const membership = {
      user_id: 'member-1',
      role: CLUB_ROLE.MEMBER,
      permissions: { volunteers: { bulk: true } },
    };
    expect(hasClubPermission(baseClub, membership, 'volunteers:bulk', 'other-user')).toBe(true);
  });

  it('permissao top-level volunteers continua funcionando (compat)', () => {
    const membership = {
      user_id: 'member-1',
      role: CLUB_ROLE.MEMBER,
      permissions: { volunteers: true },
    };
    expect(hasClubPermission(baseClub, membership, CLUB_PERMISSION.VOLUNTEERS, 'other-user')).toBe(true);
  });

  it('permite leitura:read e manage_status, mas NAO :bg_check nem :delete', () => {
    const membership = {
      user_id: 'member-1',
      role: CLUB_ROLE.MEMBER,
      permissions: { volunteers: { read: true, manage_status: true, bg_check: false } },
    };
    expect(hasClubPermission(baseClub, membership, 'volunteers:read', 'other-user')).toBe(true);
    expect(hasClubPermission(baseClub, membership, 'volunteers:manage_status', 'other-user')).toBe(true);
    expect(hasClubPermission(baseClub, membership, 'volunteers:bg_check', 'other-user')).toBe(false);
    expect(hasClubPermission(baseClub, membership, 'volunteers:delete', 'other-user')).toBe(false);
  });
});
