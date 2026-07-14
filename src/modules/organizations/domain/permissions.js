/**
 * Regras de permissão do painel de administração de uma organização.
 *
 * Modelo:
 *  - Proprietário (`club.created_by === currentUserUid` ou membership.user_id):
 *    sempre todas as permissões, implícito, não pode ser editado/removido pela UI.
 *  - Administrador (`membership.role === 'admin'`) sem `permissions`
 *    explícito: tratado como tendo todas (compatibilidade com admins
 *    promovidos antes desta granularidade existir).
 *  - Administrador com `permissions` explícito, ou membro comum com
 *    `permissions`: só as chaves marcadas `true`. `animals` também aceita o
 *    campo legado `permissions.edit_pets` (era a única permissão granular
 *    antes deste modelo).
 *
 * Aceita `currentUserUid` como parâmetro de fallback em organizações
 * LEGADAS cujo criador não foi inserido em `organization_members`.
 * (Espelha o comportamento do módulo de comunidades.)
 *
 * Permissões disponíveis (CLUB_PERMISSION):
 *  - ANIMALS                 → gerenciar pets (planilha)
 *  - FINANCE                 → prestação de contas (lançamentos, categorias)
 *  - DONATIONS               → chamados de doação (criar, editar, excluir, ver comprovantes)
 *  - FEED                    → publicar/editar/excluir posts do mural
 *  - TEAM                    → gerenciar equipe (admitir, atribuir permissões, remover)
 *  - VOLUNTEERS (raiz)       → acesso ao painel de voluntários (default ON para owner/admin)
 *  - VOLUNTEERS:read         → apenas ver a aba de voluntários
 *  - VOLUNTEERS:manage_status→ pausar / retomar / bloquear voluntário
 *  - VOLUNTEERS:bg_check     → aprovar / rejeitar background check
 *  - VOLUNTEERS:bulk         → CSV import / export
 *  - VOLUNTEERS:delete       → remover voluntário definitivamente (além de platform_admin)
 *
 * Cada permissão é consultável independentemente em qualquer camada da UI.
 */

import { CLUB_PERMISSION_KEYS, CLUB_ROLE } from './constants.js';

/**
 * Verifica se um dado usuário (via membership OU via currentUserUid) é o
 * dono da ONG.
 *
 * Assinatura: (club, membership, currentUserUid?)
 *  - Se `currentUserUid` for passado, vale tanto se houver doc de membership
 *    (member.user_id === club.created_by) quanto se o caller passar o uid
 *    direto (útil quando a membership ainda não carregou / não existe).
 *  - Compatível com chamadas antigas de 2 args (member only).
 */
export function isClubOwner(club, membership, currentUserUid) {
  if (!!club?.created_by && !!currentUserUid && club.created_by === currentUserUid) return true;
  return !!club?.created_by && !!membership?.user_id && club.created_by === membership.user_id;
}

export function hasClubPermission(club, membership, key, currentUserUid) {
  if (isClubOwner(club, membership, currentUserUid)) return true;
  if (!membership) return false;

  const perms = membership.permissions;
  if (membership.role === CLUB_ROLE.ADMIN && !perms) return true;

  if (!perms) return false;
  if (key === 'animals' && perms.edit_pets === true) return true;
  // TASK-267: suporte a permissão granular nested (ex: 'volunteers:bg_check')
  if (typeof key === 'string' && key.includes(':')) {
    const [outer, inner] = key.split(':', 2);
    if (outer && inner) {
      const sub = perms[outer];
      if (sub && typeof sub === 'object' && sub[inner] === true) return true;
      // Nested existe mas o sub-acesso é false/missing
      // NÃO herda da chave legacy 'volunteers' (mais restritivo)
      return false;
    }
  }
  return perms[key] === true;
}

/** true se o usuário deve ver o painel de administração (alguma aba disponível). */
export function hasAnyClubPermission(club, membership, currentUserUid) {
  if (isClubOwner(club, membership, currentUserUid)) return true;
  if (!membership) return false;
  if (membership.role === CLUB_ROLE.ADMIN) return true;
  return CLUB_PERMISSION_KEYS.some((key) => hasClubPermission(club, membership, key, currentUserUid));
}

/** Mapa { animals, finance, donations, feed, team } com o valor efetivo de cada uma. */
export function effectiveClubPermissions(club, membership, currentUserUid) {
  const result = {};
  CLUB_PERMISSION_KEYS.forEach((key) => {
    result[key] = hasClubPermission(club, membership, key, currentUserUid);
  });
  return result;
}


/**
 * Quais abas do painel admin o usuário pode ver. Usado por
 * `OrganizationAdminPanel` para filtrar a lista de TabsTrigger.
 */
export function visibleAdminTabs({ club, membership, currentUserUid, isAdmin }) {
  const owner = isClubOwner(club, membership, currentUserUid);
  if (!hasAnyClubPermission(club, membership, currentUserUid)) return [];
  // Configurações da ONG: apenas admins (proprietário conta). Outras abas
  // seguem as permissões granulares (mas o owner sempre pode tudo).
  // "Visão Geral" (overview) é sempre visível para quem entrou no painel.
  // "Geral" (edição de dados da ONG) exige permissão `team`.
  // "Chat" (responder ao público) usa `canReplyInClubChat` (feed OU team).
  return [
    { key: 'overview', label: 'Visão Geral', always: true },
    { key: 'general', label: 'Geral', permission: 'team' },
    { key: 'animals', label: 'Pets para Adoção', permission: 'animals' },
    { key: 'feed', label: 'Mural da ONG', permission: 'feed' },
    { key: 'donations', label: 'Chamados de Doação', permission: 'donations' },
    { key: 'finance', label: 'Prestação de Contas', permission: 'finance' },
    { key: 'reports', label: 'Relatórios', permission: 'animals' },
    { key: 'indicators', label: 'Indicadores', permission: 'animals' },
    { key: 'chat', label: 'Conversas', permission: 'chat' },
    { key: 'team', label: 'Equipe', permission: 'team' },
    { key: 'settings', label: 'Configurações', permission: 'admin_only' },
  ].filter((tab) => {
    if (tab.always) return true;
    if (tab.permission === 'admin_only') return isAdmin || owner;
    if (tab.permission === 'chat') {
      return canReplyInClubChat(club, membership, currentUserUid);
    }
    return hasClubPermission(club, membership, tab.permission, currentUserUid);
  });
}


/** O usuário pode criar/editar/excluir QUALQUER post do mural? */
export function canManageClubFeed(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'feed', currentUserUid);
}

/** O usuário pode excluir um post específico (autor OU permissão de feed)? */
export function canDeleteClubPost(post, club, membership, currentUserUid) {
  if (!post) return false;
  if (post.author_id && post.author_id === currentUserUid) return true;
  return canManageClubFeed(club, membership, currentUserUid);
}

/** O usuário pode CURTIR este post? (precisa estar logado e o post permite) */
export function canLikeClubPost(post, user) {
  if (!user?.uid) return false;
  if (!post) return false;
  if (post.allow_likes === true) return true;
  if (post.allow_interaction === 'likes' || post.allow_interaction === 'both') return true;
  return false;
}

/** O usuário pode COMENTAR neste post? */
export function canCommentOnClubPost(post, user) {
  if (!user?.uid) return false;
  if (!post) return false;
  if (post.allow_comments === true) return true;
  if (post.allow_interaction === 'comments' || post.allow_interaction === 'both') return true;
  return false;
}


/** Quem pode criar/editar/excluir os chamados de doação. */
export function canManageClubDonations(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'donations', currentUserUid);
}

/** Quem pode ver e atualizar o status dos comprovantes enviados pelo público. */
export function canManageClubReceipts(club, membership, currentUserUid) {
  return canManageClubDonations(club, membership, currentUserUid);
}


export function canManageClubFinance(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'finance', currentUserUid);
}


export function canManageClubTeam(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'team', currentUserUid);
}

/**
 * TASK-231: helpers granulares para voluntários. A aba de voluntários
 * usa `canViewVolunteersRoster` como gate padrão (lê apenas). As ações
 * de mutação (pausar, aprovar BG, bulk, delete) consultam suas sub-
 * permissions correspondentes. Owner sempre passa (herdado via
 * hasClubPermission/isClubOwner).
 */
export function canViewVolunteersRoster(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'volunteers', currentUserUid)
    || hasClubPermission(club, membership, 'volunteers:read', currentUserUid);
}

export function canManageVolunteers(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'volunteers', currentUserUid);
}

export function canManageVolunteerStatus(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'volunteers:manage_status', currentUserUid)
    || canManageClubTeam(club, membership, currentUserUid);
}

export function canManageVolunteerBG(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'volunteers:bg_check', currentUserUid)
    || isClubOwner(club, membership, currentUserUid)
    || isClubAdminFromPerms(membership);
}

export function canBulkManageVolunteers(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'volunteers:bulk', currentUserUid)
    || isClubOwner(club, membership, currentUserUid)
    || isClubAdminFromPerms(membership);
}

export function canDeleteVolunteer(club, membership, currentUserUid) {
  return hasClubPermission(club, membership, 'volunteers:delete', currentUserUid);
}

function isClubAdminFromPerms(membership) {
  return membership?.role === 'admin' && !membership?.permissions;
}

/** O owner pode promover/rebaixar/excluir, e qualquer admin com permissão team
 *  também. Mas: ninguém pode alterar o owner. */
export function canEditMember(club, member, membership, currentUserUid) {
  if (isClubOwner(club, member)) return false; // owner é imutável
  if (isClubOwner(club, membership, currentUserUid)) return true;
  return canManageClubTeam(club, membership, currentUserUid);
}


/** Quem pode responder no chat dedicado com a ONG.
 *  Por padrão: o owner e qualquer admin com permissão FEED ou TEAM.
 *  Ajuste no painel se a ONG quiser restringir. */
export function canReplyInClubChat(club, membership, currentUserUid) {
  if (isClubOwner(club, membership, currentUserUid)) return true;
  return hasClubPermission(club, membership, 'feed', currentUserUid)
    || hasClubPermission(club, membership, 'team', currentUserUid);
}
