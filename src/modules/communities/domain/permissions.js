import { COMMUNITY_PERMISSION_KEYS, COMMUNITY_ROLE } from './constants.js';

export function isCommunityOwner(community, membership) {
  return !!community?.owner_id && !!membership?.user_id && community.owner_id === membership.user_id;
}

export function hasCommunityPermission(community, membership, key) {
  if (!membership) return false;
  if (isCommunityOwner(community, membership)) return true;

  const perms = membership.permissions;
  if (membership.role === COMMUNITY_ROLE.ADMIN) return true;

  if (!perms) return false;
  return perms[key] === true;
}

export function hasAnyCommunityPermission(community, membership) {
  if (!membership) return false;
  if (isCommunityOwner(community, membership) || membership.role === COMMUNITY_ROLE.ADMIN) return true;
  return COMMUNITY_PERMISSION_KEYS.some((key) => hasCommunityPermission(community, membership, key));
}

export function effectiveCommunityPermissions(community, membership) {
  const result = {};
  COMMUNITY_PERMISSION_KEYS.forEach((key) => {
    result[key] = hasCommunityPermission(community, membership, key);
  });
  return result;
}
