/**
 * @fileoverview Testes para as funções de permissão de organização (ONG).
 *
 * Regressão crítica: organizações LEGADAS cujo criador não foi inserido em
 * `organization_members` (criadas em versão antiga do createClub que não
 * fazia o auto-insert). Sem fallback pelo `created_by`, o criador fica
 * sem acesso ao painel admin.
 */
import { describe, it, expect } from 'vitest';
import {
  isClubOwner,
  hasClubPermission,
  hasAnyClubPermission,
  effectiveClubPermissions,
} from '@/modules/organizations/domain/permissions';
import { CLUB_PERMISSION, CLUB_ROLE } from '@/modules/organizations/domain/constants';

const owner = 'user_owner_321';
const admin = 'user_admin_654';
const member = 'user_member_987';
const visitor = 'user_visitor_000';

const legacyOrg = {
  id: 'org_legacy_1',
  name: 'ONG Legada',
  created_by: owner,
  // organization_members/<org_legacy_1>_<owner> NÃO existe
};

const modernOrg = {
  id: 'org_modern_1',
  name: 'ONG Moderna',
  created_by: owner,
};

const ownerMembership = {
  org_id: 'org_modern_1',
  user_id: owner,
  role: CLUB_ROLE.ADMIN,
};

const adminMembership = {
  org_id: 'org_modern_1',
  user_id: admin,
  role: CLUB_ROLE.ADMIN,
};

const memberWithAnimalPerm = {
  org_id: 'org_modern_1',
  user_id: member,
  role: CLUB_ROLE.MEMBER,
  permissions: { [CLUB_PERMISSION.ANIMALS]: true },
};

describe('isClubOwner — fallback por currentUserUid', () => {
  it('detecta owner via created_by === currentUserUid (sem membership)', () => {
    expect(isClubOwner(legacyOrg, null, owner)).toBe(true);
  });

  it('mantém compat com assinatura antiga (membership only)', () => {
    expect(isClubOwner(modernOrg, ownerMembership)).toBe(true);
    expect(isClubOwner(modernOrg, adminMembership)).toBe(false);
  });

  it('visitante não é owner', () => {
    expect(isClubOwner(legacyOrg, null, visitor)).toBe(false);
  });
});

describe('hasClubPermission — owner tem permissão sem membership', () => {
  it('owner (legacy org, sem membership) tem permissão de animals', () => {
    expect(hasClubPermission(legacyOrg, null, CLUB_PERMISSION.ANIMALS, owner)).toBe(true);
  });

  it('owner (legacy org, sem membership) tem permissão de donations', () => {
    expect(hasClubPermission(legacyOrg, null, CLUB_PERMISSION.DONATIONS, owner)).toBe(true);
  });

  it('owner (legacy org, sem membership) tem permissão de team', () => {
    expect(hasClubPermission(legacyOrg, null, CLUB_PERMISSION.TEAM, owner)).toBe(true);
  });

  it('admin (role=admin sem permissions explícito) tem todas as permissões', () => {
    expect(hasClubPermission(modernOrg, adminMembership, CLUB_PERMISSION.ANIMALS, admin)).toBe(true);
    expect(hasClubPermission(modernOrg, adminMembership, CLUB_PERMISSION.FINANCE, admin)).toBe(true);
  });

  it('membro com permissão granular específica pode', () => {
    expect(hasClubPermission(modernOrg, memberWithAnimalPerm, CLUB_PERMISSION.ANIMALS, member)).toBe(true);
    expect(hasClubPermission(modernOrg, memberWithAnimalPerm, CLUB_PERMISSION.FINANCE, member)).toBe(false);
  });

  it('visitante aleatório NÃO pode', () => {
    expect(hasClubPermission(legacyOrg, null, CLUB_PERMISSION.ANIMALS, visitor)).toBe(false);
  });

  it('suporta campo legado edit_pets na chave animals', () => {
    const legacyPerm = { edit_pets: true };
    const legacyPermMember = { ...memberWithAnimalPerm, permissions: legacyPerm };
    expect(hasClubPermission(modernOrg, legacyPermMember, CLUB_PERMISSION.ANIMALS, member)).toBe(true);
  });
});

describe('hasAnyClubPermission — owner tem acesso sem membership', () => {
  it('owner de ONG legacy (sem membership) tem acesso (canAccess=true)', () => {
    expect(hasAnyClubPermission(legacyOrg, null, owner)).toBe(true);
  });

  it('visitante NÃO tem acesso', () => {
    expect(hasAnyClubPermission(legacyOrg, null, visitor)).toBe(false);
  });

  it('admin tem acesso', () => {
    expect(hasAnyClubPermission(modernOrg, adminMembership, admin)).toBe(true);
  });

  it('membro com permissão granular tem acesso', () => {
    expect(hasAnyClubPermission(modernOrg, memberWithAnimalPerm, member)).toBe(true);
  });
});

describe('effectiveClubPermissions — owner sem membership tem todas ON', () => {
  it('owner (legacy) tem todas as permissões ON', () => {
    const perms = effectiveClubPermissions(legacyOrg, null, owner);
    expect(perms[CLUB_PERMISSION.ANIMALS]).toBe(true);
    expect(perms[CLUB_PERMISSION.FINANCE]).toBe(true);
    expect(perms[CLUB_PERMISSION.DONATIONS]).toBe(true);
    expect(perms[CLUB_PERMISSION.FEED]).toBe(true);
    expect(perms[CLUB_PERMISSION.TEAM]).toBe(true);
  });

  it('visitante tem todas OFF', () => {
    const perms = effectiveClubPermissions(legacyOrg, null, visitor);
    expect(perms[CLUB_PERMISSION.ANIMALS]).toBe(false);
    expect(perms[CLUB_PERMISSION.FINANCE]).toBe(false);
  });

  it('membro com permissão granular tem só o que foi granted', () => {
    const perms = effectiveClubPermissions(modernOrg, memberWithAnimalPerm, member);
    expect(perms[CLUB_PERMISSION.ANIMALS]).toBe(true);
    expect(perms[CLUB_PERMISSION.FINANCE]).toBe(false);
  });
});