/**
 * Regras de permissão do painel de administração de uma organização.
 *
 * Modelo:
 *  - Proprietário (`club.created_by === currentUserUid` ou membership.user_id):
 *    sempre todas as 5 permissões, implícito, não pode ser editado/removido pela UI.
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