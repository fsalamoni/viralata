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
  visibleAdminTabs,
  canReplyInClubChat,
} from '@/modules/organizations/domain/permissions';
import { CLUB_PERMISSION, CLUB_ROLE, CLUB_PERMISSION_KEYS } from '@/modules/organizations/domain/constants';

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

const memberWithFeedOnly = {
  org_id: 'org_modern_1',
  user_id: 'user_feed_only',
  role: CLUB_ROLE.MEMBER,
  permissions: { [CLUB_PERMISSION.FEED]: true },
};

const memberWithAnimalOnly = {
  org_id: 'org_modern_1',
  user_id: 'user_animal_only',
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

  it('back-compat: chamada de 2 args (sem currentUserUid) continua funcionando como antes', () => {
    const ownerMembershipNoUid = { user_id: owner };
    expect(isClubOwner(modernOrg, ownerMembershipNoUid)).toBe(true);
    expect(hasClubPermission(modernOrg, ownerMembershipNoUid, CLUB_PERMISSION.ANIMALS)).toBe(true);
    expect(hasAnyClubPermission(modernOrg, ownerMembershipNoUid)).toBe(true);
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

describe('visibleAdminTabs — admin panel: granular + chat', () => {
  it('owner vê todas as abas (incluindo Configurações e Chat)', () => {
    const tabs = visibleAdminTabs({
      club: modernOrg,
      membership: ownerMembership,
      currentUserUid: owner,
      isAdmin: true,
    });
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain('general');
    expect(keys).toContain('animals');
    expect(keys).toContain('feed');
    expect(keys).toContain('donations');
    expect(keys).toContain('finance');
    expect(keys).toContain('team');
    expect(keys).toContain('chat');
    expect(keys).toContain('settings');
  });

  it('admin (sem permissions explícito, role=admin) vê todas as abas', () => {
    const tabs = visibleAdminTabs({
      club: modernOrg,
      membership: adminMembership,
      currentUserUid: admin,
      isAdmin: true,
    });
    const keys = tabs.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['animals', 'feed', 'donations', 'finance', 'team', 'chat', 'settings']));
  });

  it('membro só com feed vê só Mural + Chat (não vê Configurações)', () => {
    const tabs = visibleAdminTabs({
      club: modernOrg,
      membership: memberWithFeedOnly,
      currentUserUid: memberWithFeedOnly.user_id,
      isAdmin: false,
    });
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain('overview');
    expect(keys).toContain('feed');
    expect(keys).toContain('chat');
    // Não tem permissão donations/finance/team/animals
    expect(keys).not.toContain('donations');
    expect(keys).not.toContain('finance');
    expect(keys).not.toContain('team');
    expect(keys).not.toContain('animals');
    // Sem `admin_only` → não vê Configurações
    expect(keys).not.toContain('settings');
    // Geral exige team, e esse membro não tem
    expect(keys).not.toContain('general');
  });

  it('membro só com animals vê só Pets (sem Mural, sem Chat)', () => {
    const tabs = visibleAdminTabs({
      club: modernOrg,
      membership: memberWithAnimalOnly,
      currentUserUid: memberWithAnimalOnly.user_id,
      isAdmin: false,
    });
    const keys = tabs.map((t) => t.key);
    expect(keys).toContain('overview');
    expect(keys).toContain('animals');
    // Sem team/feed → Mural e Chat escondidos
    expect(keys).not.toContain('feed');
    expect(keys).not.toContain('chat');
    // Geral exige team
    expect(keys).not.toContain('general');
    // Sem admin_only
    expect(keys).not.toContain('settings');
  });

  it('visitante sem nenhuma permissão vê lista vazia', () => {
    const tabs = visibleAdminTabs({
      club: modernOrg,
      membership: null,
      currentUserUid: visitor,
      isAdmin: false,
    });
    expect(tabs).toEqual([]);
  });
});

describe('canReplyInClubChat', () => {
  it('owner sempre pode responder', () => {
    expect(canReplyInClubChat(modernOrg, ownerMembership, owner)).toBe(true);
  });

  it('admin com permissão feed pode responder', () => {
    expect(canReplyInClubChat(modernOrg, memberWithFeedOnly, memberWithFeedOnly.user_id)).toBe(true);
  });

  it('admin com permissão team pode responder', () => {
    const adminWithTeam = {
      org_id: 'org_modern_1',
      user_id: 'user_team_only',
      role: CLUB_ROLE.MEMBER,
      permissions: { [CLUB_PERMISSION.TEAM]: true },
    };
    expect(canReplyInClubChat(modernOrg, adminWithTeam, adminWithTeam.user_id)).toBe(true);
  });

  it('membro sem feed/team NÃO pode responder', () => {
    expect(canReplyInClubChat(modernOrg, memberWithAnimalOnly, memberWithAnimalOnly.user_id)).toBe(false);
  });

  it('visitante NÃO pode responder', () => {
    expect(canReplyInClubChat(modernOrg, null, visitor)).toBe(false);
  });
});

describe('Separação público × painel admin (regressão)', () => {
  // Garante que as funções de permissão usadas para renderizar a página
  // PÚBLICA (ClubDetail) NÃO dão acesso a operações de gestão — apenas
  // indicam quem pode ler. As ações de inserir/editar/excluir da ONG
  // ficam exclusivas no painel admin.
  it('membro comum com permissao FEED tem permissao FEED, mas o painel admin e o UNICO que renderiza os botoes de criar/editar post', () => {
    // As funções de domínio só verificam se a permissão EXISTE. Quem
    // decide se o botão aparece na página pública é o ClubDetail.jsx,
    // que deliberadamente passa canManageFeed=false. Aqui validamos
    // que a permissão granular está coerente.
    expect(hasClubPermission(modernOrg, memberWithFeedOnly, CLUB_PERMISSION.FEED, memberWithFeedOnly.user_id)).toBe(true);
    expect(hasClubPermission(modernOrg, memberWithFeedOnly, CLUB_PERMISSION.DONATIONS, memberWithFeedOnly.user_id)).toBe(false);
    expect(hasClubPermission(modernOrg, memberWithFeedOnly, CLUB_PERMISSION.FINANCE, memberWithFeedOnly.user_id)).toBe(false);
    expect(hasClubPermission(modernOrg, memberWithFeedOnly, CLUB_PERMISSION.TEAM, memberWithFeedOnly.user_id)).toBe(false);
  });

  it('visitante sem membership não tem NENHUMA permissão granular', () => {
    CLUB_PERMISSION_KEYS.forEach((key) => {
      expect(hasClubPermission(modernOrg, null, key, visitor)).toBe(false);
    });
  });
});