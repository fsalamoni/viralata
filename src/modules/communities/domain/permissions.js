import { COMMUNITY_PERMISSION_KEYS, COMMUNITY_ROLE } from './constants.js';

/**
 * Estado do usuário atual em uma comunidade, derivado de community + membership + uid.
 *
 * Centraliza a regra que CommunityDetail / MuralTab / EventsTab usam para
 * mostrar botões e forms. Resolve 100% client-side — o Firestore rules
 * continua sendo a fonte de verdade do lado do servidor.
 *
 * @param {object|null} community
 * @param {object|null} membership  doc de community_members do usuário atual (ou null)
 * @param {string|null|undefined} currentUserUid
 * @returns {{ isMember: boolean, canAdmin: boolean }}
 */
export function deriveCommunityMembershipState(community, membership, currentUserUid) {
  const ownerMatch = Boolean(
    community?.owner_id && currentUserUid && community.owner_id === currentUserUid,
  );
  const isMember = Boolean(membership) || ownerMatch;
  const canAdmin = hasAnyCommunityPermission(community, membership, currentUserUid);
  return { isMember, canAdmin };
}

/**
 * Verifica se o usuário é o dono da comunidade. Aceita dois caminhos:
 *  1. Membership doc existe E o user_id bate com community.owner_id
 *  2. community.owner_id bate com currentUserUid (passado direto)
 *
 * O 2º caminho é essencial para comunidades LEGADAS cujo criador não foi
 * adicionado ao doc `community_members` (o doc foi criado em uma versão
 * antiga do createCommunity que não fazia esse auto-insert). Sem fallback
 * pelo owner_id, o criador fica sem acesso à própria comunidade.
 */
export function isCommunityOwner(community, membership, currentUserUid) {
  if (!!community?.owner_id && !!currentUserUid && community.owner_id === currentUserUid) return true;
  return !!community?.owner_id && !!membership?.user_id && community.owner_id === membership.user_id;
}

export function hasCommunityPermission(community, membership, key, currentUserUid) {
  if (isCommunityOwner(community, membership, currentUserUid)) return true;
  if (!membership) return false;

  const perms = membership.permissions;
  if (membership.role === COMMUNITY_ROLE.ADMIN) return true;

  if (!perms) return false;
  return perms[key] === true;
}

export function hasAnyCommunityPermission(community, membership, currentUserUid) {
  if (isCommunityOwner(community, membership, currentUserUid)) return true;
  if (!membership) return false;
  if (membership.role === COMMUNITY_ROLE.ADMIN) return true;
  return COMMUNITY_PERMISSION_KEYS.some((key) => hasCommunityPermission(community, membership, key, currentUserUid));
}

export function effectiveCommunityPermissions(community, membership, currentUserUid) {
  const result = {};
  COMMUNITY_PERMISSION_KEYS.forEach((key) => {
    result[key] = hasCommunityPermission(community, membership, key, currentUserUid);
  });
  return result;
}
