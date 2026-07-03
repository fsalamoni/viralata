/**
 * Regras de permissão do painel de administração de uma organização.
 *
 * Modelo:
 *  - Proprietário (`club.created_by === membership.user_id`): sempre todas
 *    as 5 permissões, implícito, não pode ser editado/removido pela UI.
 *  - Administrador (`membership.role === 'admin'`) sem `permissions`
 *    explícito: tratado como tendo todas (compatibilidade com admins
 *    promovidos antes desta granularidade existir).
 *  - Administrador com `permissions` explícito, ou membro comum com
 *    `permissions`: só as chaves marcadas `true`. `animals` também aceita o
 *    campo legado `permissions.edit_pets` (era a única permissão granular
 *    antes deste modelo).
 */

import { CLUB_PERMISSION_KEYS, CLUB_ROLE } from './constants.js';

export function isClubOwner(club, membership) {
  return !!club?.created_by && !!membership?.user_id && club.created_by === membership.user_id;
}

export function hasClubPermission(club, membership, key) {
  if (!membership) return false;
  if (isClubOwner(club, membership)) return true;

  const perms = membership.permissions;
  if (membership.role === CLUB_ROLE.ADMIN && !perms) return true;

  if (!perms) return false;
  if (key === 'animals' && perms.edit_pets === true) return true;
  return perms[key] === true;
}

/** true se o usuário deve ver o painel de administração (alguma aba disponível). */
export function hasAnyClubPermission(club, membership) {
  if (!membership) return false;
  if (isClubOwner(club, membership) || membership.role === CLUB_ROLE.ADMIN) return true;
  return CLUB_PERMISSION_KEYS.some((key) => hasClubPermission(club, membership, key));
}

/** Mapa { animals, finance, donations, feed, team } com o valor efetivo de cada uma. */
export function effectiveClubPermissions(club, membership) {
  const result = {};
  CLUB_PERMISSION_KEYS.forEach((key) => {
    result[key] = hasClubPermission(club, membership, key);
  });
  return result;
}
