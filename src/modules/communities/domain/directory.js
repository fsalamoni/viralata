import { COMMUNITY_VISIBILITY, normalizeCommunityVisibility } from './constants.js';

export const CLUB_DIRECTORY_STATUS = Object.freeze({
  ACTIVE: 'active',
  REVIEW: 'review',
  SUSPENDED: 'suspended',
});

export const CLUB_DIRECTORY_STATUS_LABELS = Object.freeze({
  [CLUB_DIRECTORY_STATUS.ACTIVE]: 'Ativa no diretório',
  [CLUB_DIRECTORY_STATUS.REVIEW]: 'Em revisão',
  [CLUB_DIRECTORY_STATUS.SUSPENDED]: 'Suspensa',
});

export function normalizeClubDirectoryStatus(value) {
  if (value === CLUB_DIRECTORY_STATUS.REVIEW) return CLUB_DIRECTORY_STATUS.REVIEW;
  if (value === CLUB_DIRECTORY_STATUS.SUSPENDED) return CLUB_DIRECTORY_STATUS.SUSPENDED;
  return CLUB_DIRECTORY_STATUS.ACTIVE;
}

export function isClubPubliclyVisible(club) {
  return normalizeClubDirectoryStatus(club?.directory_status) === CLUB_DIRECTORY_STATUS.ACTIVE;
}

export function isCommunityPubliclyVisible(community) {
  return normalizeCommunityVisibility(community?.visibility) === COMMUNITY_VISIBILITY.PUBLIC;
}

export function sortCommunities(communities = []) {
  return [...communities].sort((a, b) => {
    const featuredDiff = Number(Boolean(b?.featured)) - Number(Boolean(a?.featured));
    if (featuredDiff !== 0) return featuredDiff;

    const priorityDiff = Number(b?.priority || 0) - Number(a?.priority || 0);
    if (priorityDiff !== 0) return priorityDiff;

    return String(a?.name || '').localeCompare(String(b?.name || ''), 'pt-BR');
  });
}

export function getVisibleCommunityMap(communities = []) {
  return sortCommunities(communities)
    .filter(isCommunityPubliclyVisible)
    .reduce((acc, community) => {
      acc[community.id] = community;
      return acc;
    }, {});
}
