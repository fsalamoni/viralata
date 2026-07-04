export const COMMUNITY_COLLECTION = 'communities';

export const COMMUNITY_VISIBILITY = Object.freeze({
  PUBLIC: 'public',
  HIDDEN: 'hidden',
});

export const COMMUNITY_VISIBILITY_LABELS = Object.freeze({
  [COMMUNITY_VISIBILITY.PUBLIC]: 'Pública',
  [COMMUNITY_VISIBILITY.HIDDEN]: 'Oculta',
});

export function normalizeCommunityVisibility(value) {
  return value === COMMUNITY_VISIBILITY.HIDDEN
    ? COMMUNITY_VISIBILITY.HIDDEN
    : COMMUNITY_VISIBILITY.PUBLIC;
}
