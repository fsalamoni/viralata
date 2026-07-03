import { describe, it, expect } from 'vitest';
import { isClubOwner, hasClubPermission, hasAnyClubPermission, effectiveClubPermissions } from './permissions.js';
import { CLUB_ROLE } from './constants.js';

const club = { id: 'club1', created_by: 'owner-uid' };

describe('organizations/permissions domain', () => {
  describe('isClubOwner', () => {
    it('is true when membership.user_id matches club.created_by', () => {
      expect(isClubOwner(club, { user_id: 'owner-uid' })).toBe(true);
    });
    it('is false for any other member', () => {
      expect(isClubOwner(club, { user_id: 'someone-else' })).toBe(false);
    });
    it('is false without a membership', () => {
      expect(isClubOwner(club, null)).toBe(false);
    });
  });

  describe('hasClubPermission', () => {
    it('owner always has every permission, regardless of the permissions map', () => {
      const owner = { user_id: 'owner-uid', role: CLUB_ROLE.ADMIN, permissions: { animals: false } };
      expect(hasClubPermission(club, owner, 'animals')).toBe(true);
      expect(hasClubPermission(club, owner, 'finance')).toBe(true);
    });
    it('a legacy admin without an explicit permissions map has full access', () => {
      const legacyAdmin = { user_id: 'admin-2', role: CLUB_ROLE.ADMIN };
      expect(hasClubPermission(club, legacyAdmin, 'donations')).toBe(true);
    });
    it('an admin with an explicit permissions map is limited to the granted keys', () => {
      const scopedAdmin = { user_id: 'admin-3', role: CLUB_ROLE.ADMIN, permissions: { finance: true, team: false } };
      expect(hasClubPermission(club, scopedAdmin, 'finance')).toBe(true);
      expect(hasClubPermission(club, scopedAdmin, 'team')).toBe(false);
      expect(hasClubPermission(club, scopedAdmin, 'animals')).toBe(false);
    });
    it('a regular member has no permission by default', () => {
      const member = { user_id: 'member-1', role: CLUB_ROLE.MEMBER };
      expect(hasClubPermission(club, member, 'animals')).toBe(false);
    });
    it('a regular member can be granted a single permission', () => {
      const member = { user_id: 'member-1', role: CLUB_ROLE.MEMBER, permissions: { animals: true } };
      expect(hasClubPermission(club, member, 'animals')).toBe(true);
      expect(hasClubPermission(club, member, 'finance')).toBe(false);
    });
    it('honors the legacy edit_pets field as an alias for animals', () => {
      const member = { user_id: 'member-2', role: CLUB_ROLE.MEMBER, permissions: { edit_pets: true } };
      expect(hasClubPermission(club, member, 'animals')).toBe(true);
    });
  });

  describe('hasAnyClubPermission', () => {
    it('is true for the owner and for any admin', () => {
      expect(hasAnyClubPermission(club, { user_id: 'owner-uid', role: CLUB_ROLE.ADMIN })).toBe(true);
      expect(hasAnyClubPermission(club, { user_id: 'admin-2', role: CLUB_ROLE.ADMIN })).toBe(true);
    });
    it('is true for a member with at least one granted permission', () => {
      expect(hasAnyClubPermission(club, { user_id: 'm', role: CLUB_ROLE.MEMBER, permissions: { feed: true } })).toBe(true);
    });
    it('is false for a member with no permissions', () => {
      expect(hasAnyClubPermission(club, { user_id: 'm', role: CLUB_ROLE.MEMBER })).toBe(false);
    });
  });

  describe('effectiveClubPermissions', () => {
    it('returns all 5 keys for the owner', () => {
      const perms = effectiveClubPermissions(club, { user_id: 'owner-uid' });
      expect(perms).toEqual({ animals: true, finance: true, donations: true, feed: true, team: true });
    });
  });
});
