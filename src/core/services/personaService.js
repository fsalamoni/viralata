/**
 * @fileoverview personaService — gerencia personas do user (V4).
 *
 * Camada de dados centralizada para as 6 personas da V4.
 * Toda leitura/escrita de persona (active_persona, personas_enabled,
 * subcoleções de perfil) deve passar por aqui.
 *
 * Ver `docs/PLAN_PERSONAS_V4.md` v1.1 e `docs/AI_GUIDE/13-DECISIONS.md` §16.
 *
 * D-PERSONA-* decisões aplicadas:
 *  - D-PERSONA-MULTI: user pode ter múltiplas, 1 ativa
 *  - D-PERSONA-MIGRATION-AUTO: pets existentes → donor automaticamente
 *  - D-PERSONA-ONE-AT-A-TIME: default = adopter
 *  - D-PERSONA-ONBOARDING-ONCE: onboarding executado 1x por persona
 *  - D-PERSONA-NO-EXPIRATION: personas não expiram
 *
 * IMPORTANTE (defense-in-depth): persona é UX, NÃO muda Firestore
 * rules. A segurança continua baseada em `users/{uid}.role`,
 * `club_members`, `community_members`, etc. Persona só afeta o que
 * o user VÊ e COMO navega.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import {
  ALL_PERSONAS,
  DEFAULT_PERSONA,
  PERSONA_TYPE,
  PLATFORM_ADMIN_PERSONAS,
  PUBLIC_PERSONAS,
  buildPersonaKey,
  isScopedPersona,
  parsePersonaKey,
} from '@/core/domain/personas';

// ════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════

/**
 * Verifica se um user é platform_admin.
 * IMPORTANTE: a segurança real é feita em Firestore rules via
 * `users/{uid}.role === 'platform_admin'`. Aqui só espelhamos para
 * o client (UX).
 *
 * @param {object|null} userProfile
 * @returns {boolean}
 */
export function isPlatformAdminFromProfile(userProfile) {
  return userProfile?.role === 'platform_admin';
}

/**
 * Detecta quais personas o user TEM (independente de ter feito
 * onboarding). Esta é a lista "potencial" — o user pode ter
 * `donor` mesmo sem ter cadastrado pets, desde que tenha um pet
 * pessoal cadastrado.
 *
 * Personas SEMPRE incluídas (default):
 *  - adopter (sempre — qualquer user pode adotar)
 *  - donor (se tem 1+ pets com owner_type=user OU se já tem donor_profile)
 *  - platform_admin (se role=platform_admin)
 *
 * Personas com escopo (incluídas se o user tem vínculo):
 *  - shelter_staff: 1+ memberships em club_members
 *  - community_staff: 1+ memberships em community_members
 *  - volunteer: volunteer_profile existe
 *
 * @param {object|null} userProfile
 * @param {{
 *   petCount?: number,
 *   shelterMemberships?: Array<{ clubId: string }>,
 *   communityMemberships?: Array<{ communityId: string }>,
 *   hasVolunteerProfile?: boolean,
 * }} [signals]
 * @returns {Array<{ key: string, type: string, scopeId: string|null, hasOnboarding: boolean, isPlatformAdmin: boolean }>}
 */
export function detectAvailablePersonas(userProfile, signals = {}) {
  if (!userProfile) return [];

  const {
    petCount = 0,
    shelterMemberships = [],
    communityMemberships = [],
    hasVolunteerProfile = false,
  } = signals;

  const personas = [];
  const isAdmin = isPlatformAdminFromProfile(userProfile);

  // 1. Adopter (sempre)
  personas.push({
    key: PERSONA_TYPE.ADOPTER,
    type: PERSONA_TYPE.ADOPTER,
    scopeId: null,
    hasOnboarding: Boolean(userProfile.profile_completed),
    isPlatformAdmin: isAdmin,
  });

  // 2. Donor (se tem pets pessoais OU donor_profile)
  const hasDonorProfile = Boolean(userProfile.donor_profile);
  if (petCount > 0 || hasDonorProfile) {
    personas.push({
      key: PERSONA_TYPE.DONOR,
      type: PERSONA_TYPE.DONOR,
      scopeId: null,
      hasOnboarding: hasDonorProfile,
      isPlatformAdmin: isAdmin,
    });
  }

  // 3. Shelter staff (1+ memberships)
  for (const m of shelterMemberships) {
    personas.push({
      key: buildPersonaKey(PERSONA_TYPE.SHELTER_STAFF, m.clubId),
      type: PERSONA_TYPE.SHELTER_STAFF,
      scopeId: m.clubId,
      hasOnboarding: true, // membership = onboarding (já está vinculado)
      isPlatformAdmin: isAdmin,
    });
  }

  // 4. Community staff (1+ memberships)
  for (const m of communityMemberships) {
    personas.push({
      key: buildPersonaKey(PERSONA_TYPE.COMMUNITY_STAFF, m.communityId),
      type: PERSONA_TYPE.COMMUNITY_STAFF,
      scopeId: m.communityId,
      hasOnboarding: true,
      isPlatformAdmin: isAdmin,
    });
  }

  // 5. Volunteer (1+ volunteer_profile + 1+ roster em abrigo)
  if (hasVolunteerProfile) {
    // O roster pode estar em vários abrigos, mas detectamos 1 só aqui
    // (outras variações virão via hook useUserVolunteerRosters)
    personas.push({
      key: PERSONA_TYPE.VOLUNTEER,
      type: PERSONA_TYPE.VOLUNTEER,
      scopeId: null, // preenchido dinamicamente pelo caller
      hasOnboarding: hasVolunteerProfile,
      isPlatformAdmin: isAdmin,
    });
  }

  // 6. Platform admin (só se role)
  if (isAdmin) {
    personas.push({
      key: PERSONA_TYPE.PLATFORM_ADMIN,
      type: PERSONA_TYPE.PLATFORM_ADMIN,
      scopeId: null,
      hasOnboarding: true,
      isPlatformAdmin: true,
    });
  }

  return personas;
}

// ════════════════════════════════════════════════════════════════════
// ACTIVE PERSONA (persistência)
// ════════════════════════════════════════════════════════════════════

/**
 * Lê a persona ativa do user do Firestore.
 * @param {string} uid
 * @returns {Promise<{ key: string, type: string, scopeId: string|null }>}
 */
export async function getActivePersona(uid) {
  if (!uid) return { key: DEFAULT_PERSONA, type: DEFAULT_PERSONA, scopeId: null };
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return { key: DEFAULT_PERSONA, type: DEFAULT_PERSONA, scopeId: null };
    }
    const data = userDoc.data();
    const key = data.active_persona || DEFAULT_PERSONA;
    return { key, ...parsePersonaKey(key) };
  } catch (err) {
    logger.error('[personaService.getActivePersona] failed:', err);
    return { key: DEFAULT_PERSONA, type: DEFAULT_PERSONA, scopeId: null };
  }
}

/**
 * Define a persona ativa do user no Firestore.
 * Cria o campo se não existir. NÃO substitui outras personas.
 *
 * @param {string} uid
 * @param {string} personaKey (ex: 'adopter' ou 'shelter_staff:club_abc')
 * @returns {Promise<void>}
 */
export async function setActivePersona(uid, personaKey) {
  if (!uid) throw new Error('uid é obrigatório');
  if (!personaKey) throw new Error('personaKey é obrigatório');
  const { type, scopeId } = parsePersonaKey(personaKey);
  if (!ALL_PERSONAS.includes(type)) {
    throw new Error(`Tipo de persona inválido: ${type}`);
  }
  if (isScopedPersona(type) && !scopeId) {
    throw new Error(`Persona ${type} requer scopeId`);
  }

  try {
    await updateDoc(doc(db, 'users', uid), {
      active_persona: personaKey,
      updated_at: serverTimestamp(),
    });
    logger.info('[personaService.setActivePersona] set', { uid, personaKey });
  } catch (err) {
    if (err?.code === 'not-found') {
      // Doc não existe, criamos com merge
      await setDoc(
        doc(db, 'users', uid),
        { active_persona: personaKey, updated_at: serverTimestamp() },
        { merge: true },
      );
    } else {
      throw err;
    }
  }
}

// ════════════════════════════════════════════════════════════════════
// PERSONAS ENABLED (lista de personas que o user desbloqueou)
// ════════════════════════════════════════════════════════════════════

/**
 * Adiciona uma persona à lista de personas_enabled do user.
 * Idempotente: se já existe, não faz nada.
 *
 * @param {string} uid
 * @param {string} personaKey
 * @returns {Promise<void>}
 */
export async function enablePersona(uid, personaKey) {
  if (!uid) throw new Error('uid é obrigatório');
  if (!personaKey) throw new Error('personaKey é obrigatório');

  // Validação defensiva: personaKey deve ser tipo válido (D-PERSONA-MULTI)
  const { type, scopeId } = parsePersonaKey(personaKey);
  if (!ALL_PERSONAS.includes(type)) {
    throw new Error(`Tipo de persona inválido: ${type}`);
  }
  if (isScopedPersona(type) && !scopeId) {
    throw new Error(`Persona ${type} requer scopeId`);
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      // Sem doc, sem personas enabled
      return;
    }
    const data = userDoc.data();
    const current = Array.isArray(data.personas_enabled) ? data.personas_enabled : [];
    if (current.includes(personaKey)) return;
    await updateDoc(doc(db, 'users', uid), {
      personas_enabled: [...current, personaKey],
      updated_at: serverTimestamp(),
    });
    logger.info('[personaService.enablePersona] added', { uid, personaKey });
  } catch (err) {
    logger.error('[personaService.enablePersona] failed:', err);
    throw err;
  }
}

/**
 * Adiciona múltiplas personas de uma vez (writeBatch).
 * Útil para a migração inicial.
 *
 * @param {string} uid
 * @param {string[]} personaKeys
 * @returns {Promise<void>}
 */
export async function enablePersonas(uid, personaKeys) {
  if (!uid) throw new Error('uid é obrigatório');
  if (!Array.isArray(personaKeys) || personaKeys.length === 0) return;

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return;
    const data = userDoc.data();
    const current = new Set(Array.isArray(data.personas_enabled) ? data.personas_enabled : []);
    const toAdd = personaKeys.filter((k) => !current.has(k));
    if (toAdd.length === 0) return;
    await updateDoc(doc(db, 'users', uid), {
      personas_enabled: [...current, ...toAdd],
      updated_at: serverTimestamp(),
    });
    logger.info('[personaService.enablePersonas] added', { uid, added: toAdd });
  } catch (err) {
    logger.error('[personaService.enablePersonas] failed:', err);
    throw err;
  }
}

// ════════════════════════════════════════════════════════════════════
// MIGRAÇÃO AUTOMÁTICA (D-PERSONA-MIGRATION-AUTO, Q29)
// ════════════════════════════════════════════════════════════════════

/**
 * Detecta pets pessoais do user (owner_type='user' + owner_id=uid)
 * @param {string} uid
 * @returns {Promise<number>} count
 */
export async function countUserOwnedPets(uid) {
  if (!uid) return 0;
  try {
    const q = query(
      collection(db, 'pets'),
      where('owner_id', '==', uid),
      where('owner_type', '==', 'user'),
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    logger.error('[personaService.countUserOwnedPets] failed:', err);
    return 0;
  }
}

/**
 * Migração automática (D-PERSONA-MIGRATION-AUTO, Q29):
 *  - Se user tem 1+ pets pessoais → ativa persona 'donor'
 *  - Se user é role 'platform_admin' → adiciona 'platform_admin' às personas
 *  - Se user já tem volunteer_profile → adiciona 'volunteer'
 *
 * Idempotente: pode ser chamada várias vezes sem efeito colateral.
 *
 * @param {string} uid
 * @param {object} userProfile
 * @returns {Promise<{ migrated: boolean, addedPersonas: string[] }>}
 */
export async function migrateLegacyUserToV4(uid, userProfile) {
  if (!uid || !userProfile) {
    return { migrated: false, addedPersonas: [] };
  }

  const personasToAdd = [];

  // 1. Adopter (sempre habilitado, mas só se profile_completed)
  // (já é default, não precisa adicionar explicitamente)

  // 2. Donor: se tem pets pessoais
  const petCount = await countUserOwnedPets(uid);
  if (petCount > 0) {
    personasToAdd.push(PERSONA_TYPE.DONOR);
  }

  // 3. Platform admin: se role
  if (isPlatformAdminFromProfile(userProfile)) {
    personasToAdd.push(PERSONA_TYPE.PLATFORM_ADMIN);
  }

  // 4. Volunteer: se tem volunteer_profile
  // (a verificação mais robusta seria checar subcoleção, mas
  // se o userProfile já tiver o flag, basta)
  // Aqui não fazemos query adicional — o hook useActivePersona
  // vai detectar via signals.hasVolunteerProfile

  if (personasToAdd.length === 0) {
    return { migrated: false, addedPersonas: [] };
  }

  await enablePersonas(uid, personasToAdd);

  // Se ainda não tem active_persona, define como donor ou adopter
  const currentKey = userProfile.active_persona;
  if (!currentKey) {
    const newKey = petCount > 0 ? PERSONA_TYPE.DONOR : DEFAULT_PERSONA;
    await setActivePersona(uid, newKey);
  }

  logger.info('[personaService.migrateLegacyUserToV4] done', { uid, personasToAdd });
  return { migrated: true, addedPersonas: personasToAdd };
}

// ════════════════════════════════════════════════════════════════════
// PUBLIC PERMISSION (admin master vê tudo)
// ════════════════════════════════════════════════════════════════════

/**
 * Verifica se o user pode usar a persona 'platform_admin' (D-PERSONA-ADMIN-OVERRIDE).
 * Apenas o role 'platform_admin' (atribuído pelo owner) pode.
 *
 * @param {object|null} userProfile
 * @returns {boolean}
 */
export function canUsePlatformAdminPersona(userProfile) {
  return isPlatformAdminFromProfile(userProfile);
}

/**
 * Lista personas VISÍVEIS no switcher para um user.
 *  - Sem platform_admin: PUBLIC_PERSONAS (5)
 *  - Com platform_admin: PLATFORM_ADMIN_PERSONAS (6)
 *
 * @param {object|null} userProfile
 * @returns {string[]}
 */
export function getVisiblePersonasForSwitcher(userProfile) {
  if (canUsePlatformAdminPersona(userProfile)) {
    return [...PLATFORM_ADMIN_PERSONAS];
  }
  return [...PUBLIC_PERSONAS];
}
