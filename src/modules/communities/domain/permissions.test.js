/**
 * @fileoverview Testes para as funções de permissão de comunidade.
 *
 * Regressão crítica: comunidades LEGADAS cujo criador não foi adicionado
 * ao doc `community_members` (criadas em versão antiga do createCommunity
 * que não fazia o auto-insert). Sem fallback pelo community.owner_id, o
 * criador fica sem acesso à própria comunidade.
 */
import { describe, it, expect } from 'vitest';
import {
  isCommunityOwner,
  hasCommunityPermission,
  hasAnyCommunityPermission,
  effectiveCommunityPermissions,
} from '@/modules/communities/domain/permissions';
import { COMMUNITY_PERMISSION, COMMUNITY_ROLE } from '@/modules/communities/domain/constants';

const owner = 'user_owner_123';
const admin = 'user_admin_456';
const member = 'user_member_789';
const visitor = 'user_visitor_000';

const legacyCommunity = {
  id: 'comm_legacy_1',
  name: 'Comunidade Legada',
  owner_id: owner,
  // community_members/{comm_legacy_1}_{owner} NÃO existe
};

const modernCommunity = {
  id: 'comm_modern_1',
  name: 'Comunidade Moderna',
  owner_id: owner,
};

const ownerMembership = {
  community_id: 'comm_modern_1',
  user_id: owner,
  role: COMMUNITY_ROLE.ADMIN,
};

const adminMembership = {
  community_id: 'comm_modern_1',
  user_id: admin,
  role: COMMUNITY_ROLE.ADMIN,
};

const memberWithFeedPermission = {
  community_id: 'comm_modern_1',
  user_id: member,
  role: COMMUNITY_ROLE.MEMBER,
  permissions: { [COMMUNITY_PERMISSION.FEED]: true },
};

describe('isCommunityOwner — fallback por currentUserUid', () => {
  it('detecta owner via community.owner_id === currentUserUid (sem membership)', () => {
    expect(isCommunityOwner(legacyCommunity, null, owner)).toBe(true);
  });

  it('retorna true quando o user_id da membership bate com owner_id', () => {
    expect(isCommunityOwner(modernCommunity, ownerMembership, owner)).toBe(true);
  });

  it('retorna false quando o usuário não é owner', () => {
    expect(isCommunityOwner(legacyCommunity, null, visitor)).toBe(false);
    expect(isCommunityOwner(legacyCommunity, null, member)).toBe(false);
  });

  it('mantém compat com assinatura antiga (membership only)', () => {
    // Não passa currentUserUid — deve funcionar via membership
    expect(isCommunityOwner(modernCommunity, ownerMembership)).toBe(true);
    expect(isCommunityOwner(modernCommunity, adminMembership)).toBe(false);
  });
});

describe('hasCommunityPermission — owner tem permissão sem membership', () => {
  it('owner (legacy community, no membership doc) tem permissão de feed', () => {
    expect(hasCommunityPermission(legacyCommunity, null, COMMUNITY_PERMISSION.FEED, owner)).toBe(true);
  });

  it('owner (legacy community, no membership doc) tem permissão de events', () => {
    expect(hasCommunityPermission(legacyCommunity, null, COMMUNITY_PERMISSION.EVENTS, owner)).toBe(true);
  });

  it('owner (legacy community, no membership doc) tem permissão de team', () => {
    expect(hasCommunityPermission(legacyCommunity, null, COMMUNITY_PERMISSION.TEAM, owner)).toBe(true);
  });

  it('membro com permissão granular de feed pode postar (mesmo sem owner)', () => {
    expect(hasCommunityPermission(modernCommunity, memberWithFeedPermission, COMMUNITY_PERMISSION.FEED, member)).toBe(true);
  });

  it('membro SEM permissão granular NÃO pode postar', () => {
    const noPermMembership = { ...memberWithFeedPermission, permissions: {} };
    expect(hasCommunityPermission(modernCommunity, noPermMembership, COMMUNITY_PERMISSION.FEED, member)).toBe(false);
  });

  it('visitante aleatório NÃO pode', () => {
    expect(hasCommunityPermission(legacyCommunity, null, COMMUNITY_PERMISSION.FEED, visitor)).toBe(false);
  });

  it('admin com role=admin pode TUDO', () => {
    expect(hasCommunityPermission(modernCommunity, adminMembership, COMMUNITY_PERMISSION.FEED, admin)).toBe(true);
    expect(hasCommunityPermission(modernCommunity, adminMembership, COMMUNITY_PERMISSION.EVENTS, admin)).toBe(true);
    expect(hasCommunityPermission(modernCommunity, adminMembership, COMMUNITY_PERMISSION.TEAM, admin)).toBe(true);
  });
});

describe('hasAnyCommunityPermission — owner tem acesso sem membership', () => {
  it('owner de comunidade legacy (sem membership) tem acesso (canAdmin=true)', () => {
    expect(hasAnyCommunityPermission(legacyCommunity, null, owner)).toBe(true);
  });

  it('visitante NÃO tem acesso (canAdmin=false)', () => {
    expect(hasAnyCommunityPermission(legacyCommunity, null, visitor)).toBe(false);
  });

  it('membro comum sem permissões granulares NÃO tem acesso admin', () => {
    const plainMember = { community_id: 'comm_modern_1', user_id: member, role: COMMUNITY_ROLE.MEMBER };
    expect(hasAnyCommunityPermission(modernCommunity, plainMember, member)).toBe(false);
  });

  it('membro com permissão granular TEM acesso admin (canAdmin=true)', () => {
    expect(hasAnyCommunityPermission(modernCommunity, memberWithFeedPermission, member)).toBe(true);
  });

  it('admin sempre tem acesso', () => {
    expect(hasAnyCommunityPermission(modernCommunity, adminMembership, admin)).toBe(true);
  });
});

describe('effectiveCommunityPermissions — owner sem membership tem todas as permissões', () => {
  it('owner (legacy) tem todas as permissões ON', () => {
    const perms = effectiveCommunityPermissions(legacyCommunity, null, owner);
    expect(perms[COMMUNITY_PERMISSION.FEED]).toBe(true);
    expect(perms[COMMUNITY_PERMISSION.EVENTS]).toBe(true);
    expect(perms[COMMUNITY_PERMISSION.TEAM]).toBe(true);
  });

  it('visitante tem todas as permissões OFF', () => {
    const perms = effectiveCommunityPermissions(legacyCommunity, null, visitor);
    expect(perms[COMMUNITY_PERMISSION.FEED]).toBe(false);
    expect(perms[COMMUNITY_PERMISSION.EVENTS]).toBe(false);
    expect(perms[COMMUNITY_PERMISSION.TEAM]).toBe(false);
  });

  it('membro com permissão granular tem só o que foi granted', () => {
    const perms = effectiveCommunityPermissions(modernCommunity, memberWithFeedPermission, member);
    expect(perms[COMMUNITY_PERMISSION.FEED]).toBe(true);
    expect(perms[COMMUNITY_PERMISSION.EVENTS]).toBe(false);
    expect(perms[COMMUNITY_PERMISSION.TEAM]).toBe(false);
  });
});
