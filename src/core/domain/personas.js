/**
 * @fileoverview personas — definição canônica das 6 personas da V4.
 *
 * Ver `docs/PLAN_PERSONAS_V4.md` v1.1 e `docs/AI_GUIDE/13-DECISIONS.md` §16
 * (D-PERSONA-*).
 *
 * Regras invioláveis:
 *  - 6 personas: adopter, donor, shelter_staff, community_staff, volunteer, platform_admin
 *  - User pode ter múltiplas personas, mas apenas uma ativa por vez
 *  - Persona é UX, NÃO muda Firestore rules (defense-in-depth mantém)
 *  - platform_admin aparece no switcher SÓ para role 'platform_admin'
 *  - Troca é instantânea, sem confirmação
 *
 * @see docs/PLAN_PERSONAS_V4.md
 */

/**
 * Tipos de persona (chave canônica).
 *  - 'adopter'         : pessoa interessada em adotar
 *  - 'donor'           : doador individual (pet pessoal para adoção)
 *  - 'shelter_staff'   : membro/equipe de abrigo (escopo: clubId)
 *  - 'community_staff' : membro/equipe de comunidade (escopo: communityId)
 *  - 'volunteer'       : cadastrado no programa de voluntariado (escopo: clubId)
 *  - 'platform_admin'  : admin master da plataforma
 */
export const PERSONA_TYPE = Object.freeze({
  ADOPTER: 'adopter',
  DONOR: 'donor',
  SHELTER_STAFF: 'shelter_staff',
  COMMUNITY_STAFF: 'community_staff',
  VOLUNTEER: 'volunteer',
  PLATFORM_ADMIN: 'platform_admin',
});

/** Todas as personas (array imutável). */
export const ALL_PERSONAS = Object.freeze([
  PERSONA_TYPE.ADOPTER,
  PERSONA_TYPE.DONOR,
  PERSONA_TYPE.SHELTER_STAFF,
  PERSONA_TYPE.COMMUNITY_STAFF,
  PERSONA_TYPE.VOLUNTEER,
  PERSONA_TYPE.PLATFORM_ADMIN,
]);

/** Personas que NÃO requerem escopo (são "pessoais"). */
export const SCOPELESS_PERSONAS = Object.freeze([
  PERSONA_TYPE.ADOPTER,
  PERSONA_TYPE.DONOR,
  PERSONA_TYPE.PLATFORM_ADMIN,
]);

/** Personas com escopo (precisam de ID adicional). */
export const SCOPED_PERSONAS = Object.freeze([
  PERSONA_TYPE.SHELTER_STAFF,
  PERSONA_TYPE.COMMUNITY_STAFF,
  PERSONA_TYPE.VOLUNTEER,
]);

/** Nomes UX canônicos (D-PERSONA-NAMES-UX). */
export const PERSONA_LABEL = Object.freeze({
  [PERSONA_TYPE.ADOPTER]: 'Adotar / Ajudar',
  [PERSONA_TYPE.DONOR]: 'Doar um pet',
  [PERSONA_TYPE.SHELTER_STAFF]: 'Meu abrigo',
  [PERSONA_TYPE.COMMUNITY_STAFF]: 'Minha comunidade',
  [PERSONA_TYPE.VOLUNTEER]: 'Ser voluntário',
  [PERSONA_TYPE.PLATFORM_ADMIN]: 'Admin master',
});

/** Taglines (1 linha curta) para a tela de seleção. */
export const PERSONA_TAGLINE = Object.freeze({
  [PERSONA_TYPE.ADOPTER]: 'Encontre seu novo melhor amigo ou apoie a causa animal',
  [PERSONA_TYPE.DONOR]: 'Encontre um lar amoroso para o pet que você cuida',
  [PERSONA_TYPE.SHELTER_STAFF]: 'Gerencie seu abrigo, equipe, pets, finanças e mais',
  [PERSONA_TYPE.COMMUNITY_STAFF]: 'Gerencie sua comunidade, mural, fórum e eventos',
  [PERSONA_TYPE.VOLUNTEER]: 'Ajude abrigos com seu tempo e suas habilidades',
  [PERSONA_TYPE.PLATFORM_ADMIN]: 'Controle absoluto de tudo que existe na plataforma',
});

/** Personas visíveis na tela de seleção (admin master NÃO é visível publicamente). */
export const PUBLIC_PERSONAS = Object.freeze([
  PERSONA_TYPE.ADOPTER,
  PERSONA_TYPE.DONOR,
  PERSONA_TYPE.SHELTER_STAFF,
  PERSONA_TYPE.COMMUNITY_STAFF,
  PERSONA_TYPE.VOLUNTEER,
]);

/** Personas permitidas para role 'platform_admin' (todas). */
export const PLATFORM_ADMIN_PERSONAS = Object.freeze([
  ...PUBLIC_PERSONAS,
  PERSONA_TYPE.PLATFORM_ADMIN,
]);

/** Persona default (escolhida automaticamente se nenhuma estiver definida). */
export const DEFAULT_PERSONA = PERSONA_TYPE.ADOPTER;

/**
 * Identificador completo de uma persona ativa.
 *  - Personas sem escopo: `${persona}` (ex: 'adopter')
 *  - Personas com escopo: `${persona}:${scopeId}` (ex: 'shelter_staff:club_abc')
 *
 * @typedef {string} PersonaKey
 */

/**
 * Divide uma PersonaKey em tipo + escopo.
 * @param {PersonaKey} key
 * @returns {{ type: string, scopeId: string|null }}
 */
export function parsePersonaKey(key) {
  if (!key || typeof key !== 'string') {
    return { type: DEFAULT_PERSONA, scopeId: null };
  }
  const idx = key.indexOf(':');
  if (idx < 0) {
    return { type: key, scopeId: null };
  }
  return {
    type: key.slice(0, idx),
    scopeId: key.slice(idx + 1) || null,
  };
}

/**
 * Monta uma PersonaKey a partir de tipo + escopo.
 * @param {string} type
 * @param {string|null|undefined} scopeId
 * @returns {PersonaKey}
 */
export function buildPersonaKey(type, scopeId) {
  if (!type) return DEFAULT_PERSONA;
  if (!scopeId) return type;
  return `${type}:${scopeId}`;
}

/**
 * Extrai apenas o tipo (sem escopo) de uma PersonaKey.
 * @param {PersonaKey} key
 * @returns {string}
 */
export function getPersonaType(key) {
  return parsePersonaKey(key).type;
}

/**
 * Rota "home" de cada persona — para onde a plataforma navega ao ativar
 * aquele acesso (D-PERSONA-HOME). Faz a troca de persona MUDAR a
 * experiência, não só a barra inferior.
 *
 * @param {{ type: string, scopeId?: string|null }|string} persona
 *   objeto de persona OU uma PersonaKey ('shelter_staff:clubId').
 * @returns {string} caminho de rota
 */
export function personaHome(persona) {
  const p = typeof persona === 'string' ? parsePersonaKey(persona) : (persona || {});
  const { type, scopeId } = p;
  switch (type) {
    case PERSONA_TYPE.DONOR:
      return '/meus-pets';
    case PERSONA_TYPE.SHELTER_STAFF:
      return scopeId ? `/organizacoes/${scopeId}/admin` : '/organizacoes';
    case PERSONA_TYPE.COMMUNITY_STAFF:
      return scopeId ? `/comunidade/${scopeId}/admin` : '/comunidade';
    case PERSONA_TYPE.VOLUNTEER:
      return '/perfil/voluntario';
    case PERSONA_TYPE.PLATFORM_ADMIN:
      return '/admin';
    case PERSONA_TYPE.ADOPTER:
    default:
      return '/feed';
  }
}

/**
 * Rota de ENTRADA de uma persona ao ativá-la (Fatia D do §18): se a persona
 * ainda não completou o onboarding dela, vai para a tela de cadastro
 * correspondente; caso contrário, vai para a home (`personaHome`).
 *
 * Personas com escopo (abrigo/comunidade) detectadas por vínculo já vêm com
 * `hasOnboarding = true` (o user é dono/membro), então caem direto no painel.
 *
 * @param {{ type: string, scopeId?: string|null, hasOnboarding?: boolean }|string} persona
 * @returns {string} caminho de rota
 */
export function personaEntryRoute(persona) {
  const p = typeof persona === 'string' ? parsePersonaKey(persona) : (persona || {});
  if (!p.hasOnboarding) {
    switch (p.type) {
      case PERSONA_TYPE.ADOPTER:
        return '/onboarding/adotante';
      case PERSONA_TYPE.DONOR:
        return '/onboarding/doador';
      case PERSONA_TYPE.SHELTER_STAFF:
        return '/entrar/abrigo';
      case PERSONA_TYPE.COMMUNITY_STAFF:
        return '/entrar/comunidade';
      case PERSONA_TYPE.VOLUNTEER:
        return '/voluntarios/seja';
      default:
        break;
    }
  }
  return personaHome(p);
}

/**
 * Verifica se uma persona tem escopo (precisa de ID adicional).
 * @param {string} type
 * @returns {boolean}
 */
export function isScopedPersona(type) {
  return SCOPED_PERSONAS.includes(type);
}

/**
 * Verifica se uma persona está completa para uso (D-PERSONA-ONBOARDING-ONCE).
 *  - Personas sem escopo: sempre completas se o user tem o tipo habilitado
 *  - Personas com escopo: precisam ter scopeId definido E onboarding completo
 *
 * Heurística: uma persona é considerada "completa" se foi adicionada
 * à lista de personas_enabled do user. O status mais refinado
 * (incompleto) é uma decisão de UI baseada em outros sinais
 * (D-PERSONA-SWITCHER-INCOMPLETE-BADGE).
 *
 * @param {string} type
 * @param {boolean} hasOnboarding
 * @returns {boolean}
 */
export function isPersonaOnboardingComplete(type, hasOnboarding) {
  return Boolean(hasOnboarding);
}
