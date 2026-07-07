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

export const COMMUNITY_ROLE = Object.freeze({
  ADMIN: 'admin',
  MEMBER: 'member',
});

export const COMMUNITY_ROLE_LABELS = Object.freeze({
  [COMMUNITY_ROLE.ADMIN]: 'Administrador',
  [COMMUNITY_ROLE.MEMBER]: 'Membro',
});

export const COMMUNITY_PERMISSION = Object.freeze({
  FEED: 'feed',
  EVENTS: 'events',
  TEAM: 'team',
});

export const COMMUNITY_PERMISSION_KEYS = Object.freeze(Object.values(COMMUNITY_PERMISSION));

export const COMMUNITY_PERMISSION_LABELS = Object.freeze({
  [COMMUNITY_PERMISSION.FEED]: 'Publicar no mural',
  [COMMUNITY_PERMISSION.EVENTS]: 'Gerenciar eventos',
  [COMMUNITY_PERMISSION.TEAM]: 'Gerenciar equipe',
});
