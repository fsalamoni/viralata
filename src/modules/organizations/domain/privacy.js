/**
 * Helpers de privacidade para os campos de um membro da equipe de uma ONG.
 *
 * Modelo:
 *  - Cada campo visível de um membro (nome, foto, telefone, e-mail, whatsapp,
 *    função, descrição, histórico) tem um nível de privacidade escolhido pelo
 *    próprio membro: `public` | `followers` | `members` | `private`.
 *  - O nível `public` é visto por qualquer pessoa (mesmo sem login).
 *  - `followers` é visto por quem segue a ONG (todo membro da ONG é, por
 *    definição, um seguidor; logo, qualquer membro da ONG enxerga esse nível).
 *  - `members` é visto só pela equipe da ONG.
 *  - `private` é visto apenas pelo próprio dono do campo.
 *
 * A regra de privacidade é aplicada em DOIS lugares:
 *  1. Aqui no cliente, antes de renderizar o card do membro — para não
 *     mostrar dados que o viewer não pode ver.
 *  2. No Firestore (regras de segurança), para impedir que alguém leia o
 *     documento inteiro com `where` e burle o filtro do cliente.
 *
 * Este módulo exporta helpers puros, testáveis, sem dependência de
 * Firebase. O caller passa:
 *  - o `member` (com `privacy_map` opcional)
 *  - o `viewer` (com `uid`, `isMember`, `isOwner` e o `userId` do member)
 */

import {
  PRIVACY_LEVEL,
  MEMBER_FIELD,
  MEMBER_FIELD_DEFAULT_PRIVACY,
  meetsPrivacy,
} from './constants.js';

/** Visibilidade efetiva do viewer para os campos do `member`. */
export function viewerPrivacyLevel({ member, viewer, club }) {
  if (!member) return PRIVACY_LEVEL.PRIVATE;
  if (viewer?.uid && viewer.uid === member.user_id) return PRIVACY_LEVEL.PRIVATE;
  if (viewer?.isMemberOfClub) return PRIVACY_LEVEL.MEMBERS;
  if (viewer?.isFollower) return PRIVACY_LEVEL.FOLLOWERS;
  return PRIVACY_LEVEL.PUBLIC;
}

/** Recupera o nível de privacidade efetivo de UM campo do member. */
export function fieldPrivacy(member, field) {
  if (!member) return PRIVACY_LEVEL.PRIVATE;
  const map = member.privacy_map && typeof member.privacy_map === 'object'
    ? member.privacy_map
    : {};
  return map[field] || MEMBER_FIELD_DEFAULT_PRIVACY[field] || PRIVACY_LEVEL.PUBLIC;
}

/** Pode o `viewer` ver o `field` deste `member`? */
export function canViewField({ member, field, viewer, club }) {
  const required = fieldPrivacy(member, field);
  if (required === PRIVACY_LEVEL.PRIVATE) {
    return Boolean(viewer?.uid && member.user_id === viewer.uid);
  }
  if (required === PRIVACY_LEVEL.MEMBERS) {
    return Boolean(viewer?.isMemberOfClub || (viewer?.uid && member.user_id === viewer.uid));
  }
  if (required === PRIVACY_LEVEL.FOLLOWERS) {
    return Boolean(viewer?.isMemberOfClub || viewer?.isFollower || (viewer?.uid && member.user_id === viewer.uid));
  }
  // PUBLIC
  return true;
}

/**
 * Filtra um objeto `member` removendo os campos que o `viewer` não pode ver.
 * Retorna um novo objeto (não muta o original).
 */
export function filterMemberForViewer(member, { viewer, club } = {}) {
  if (!member) return null;
  const out = { ...member };
  const fields = Object.values(MEMBER_FIELD);
  fields.forEach((field) => {
    if (!canViewField({ member, field, viewer, club })) {
      if (field === MEMBER_FIELD.PHOTO) out.photo_url = '';
      else if (field === MEMBER_FIELD.FULL_NAME) out.user_name = '';
      else if (field === MEMBER_FIELD.PHONE) out.phone = '';
      else if (field === MEMBER_FIELD.EMAIL) out.user_email = '';
      else if (field === MEMBER_FIELD.WHATSAPP) out.whatsapp = '';
      else if (field === MEMBER_FIELD.TITLE) out.title = '';
      else if (field === MEMBER_FIELD.BIO) out.bio = '';
      else if (field === MEMBER_FIELD.HISTORY) out.history = '';
      out[`${field}_hidden`] = true;
    }
  });
  return out;
}

/** Lista de campos visíveis (para badges / "informações ocultas"). */
export function visibleFields({ member, viewer, club }) {
  return Object.values(MEMBER_FIELD).filter((field) =>
    canViewField({ member, field, viewer, club }),
  );
}

/** Lista de campos ocultos. */
export function hiddenFields({ member, viewer, club }) {
  return Object.values(MEMBER_FIELD).filter((field) =>
    !canViewField({ member, field, viewer, club }),
  );
}

/**
 * Normaliza o `privacy_map` de um membro para garantir que sempre tem todos
 * os campos (com default do constants se faltar).
 */
export function normalizePrivacyMap(privacy) {
  const out = {};
  Object.values(MEMBER_FIELD).forEach((field) => {
    const value = privacy?.[field];
    out[field] = Object.values(PRIVACY_LEVEL).includes(value)
      ? value
      : MEMBER_FIELD_DEFAULT_PRIVACY[field] || PRIVACY_LEVEL.PUBLIC;
  });
  return out;
}
