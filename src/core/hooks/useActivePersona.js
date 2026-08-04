/**
 * @fileoverview useActivePersona — hook que gerencia a persona ativa do user.
 *
 * Combina:
 *  - Persona ativa persistida em `users/{uid}.active_persona` (Firestore)
 *  - Personas disponíveis detectadas via `detectAvailablePersonas()`
 *  - Persistência local em localStorage (offline-first)
 *  - Sincronização automática (useEffect)
 *
 * Ver `docs/PLAN_PERSONAS_V4.md` v1.1 e `docs/AI_GUIDE/13-DECISIONS.md` §16.
 *
 * D-PERSONA-* decisões aplicadas:
 *  - D-PERSONA-MULTI: user pode ter múltiplas, 1 ativa
 *  - D-PERSONA-SWITCH-NO-CONFIRM: troca é instantânea
 *  - D-PERSONA-ONE-AT-A-TIME: 1 ativa por vez
 *  - D-PERSONA-MIGRATION-AUTO: detecta pets e adiciona donor
 *  - D-PERSONA-ADMIN-OVERRIDE: só role 'platform_admin' vê admin
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { logger } from '@/core/lib/logger';
import {
  DEFAULT_PERSONA,
  PERSONA_TYPE,
  PUBLIC_PERSONAS,
  parsePersonaKey,
} from '@/core/domain/personas';
import {
  detectAvailablePersonas,
  getActivePersona,
  isPlatformAdminFromProfile,
  setActivePersona as setActivePersonaFirestore,
  enablePersona as enablePersonaFirestore,
} from '@/core/services/personaService';

const LS_KEY = 'viralata:active_persona';

function readLocalActivePersona(uid) {
  if (!uid || typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(`${LS_KEY}:${uid}`);
    return stored || null;
  } catch (err) {
    logger.warn('[useActivePersona] localStorage read failed:', err);
    return null;
  }
}

function writeLocalActivePersona(uid, key) {
  if (!uid || typeof window === 'undefined') return;
  try {
    if (key) {
      window.localStorage.setItem(`${LS_KEY}:${uid}`, key);
    } else {
      window.localStorage.removeItem(`${LS_KEY}:${uid}`);
    }
  } catch (err) {
    logger.warn('[useActivePersona] localStorage write failed:', err);
  }
}

/**
 * Hook principal: gerencia persona ativa e lista de personas disponíveis.
 *
 * @param {object} [options]
 * @param {object} [options.signals] - sinais para detectAvailablePersonas
 *   (petCount, shelterMemberships, communityMemberships, hasVolunteerProfile)
 * @returns {{
 *   active: { key: string, type: string, scopeId: string|null, hasOnboarding: boolean },
 *   available: Array<{ key, type, scopeId, hasOnboarding, isPlatformAdmin }>,
 *   visibleForSwitcher: Array<{ key, type, scopeId, hasOnboarding, isPlatformAdmin }>,
 *   setActive: (personaKey: string) => Promise<void>,
 *   enablePersona: (personaKey: string) => Promise<void>,
 *   isLoading: boolean,
 *   canSwitch: boolean,
 *   isActive: (personaType: string) => boolean,
 *   hasPersona: (personaType: string) => boolean,
 * }}
 */
export function useActivePersona(options = {}) {
  const { signals = {} } = options;
  const { user, userProfile } = useAuth();

  const [active, setActiveState] = useState(() => ({
    key: DEFAULT_PERSONA,
    type: DEFAULT_PERSONA,
    scopeId: null,
    hasOnboarding: false,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  // Detecta personas disponíveis
  const available = useMemo(
    () => detectAvailablePersonas(userProfile, signals),
    [userProfile, signals],
  );

  // Personas visíveis no switcher (5 ou 6, dependendo de role)
  const visibleForSwitcher = useMemo(() => {
    const isAdmin = isPlatformAdminFromProfile(userProfile);
    const visibleTypes = isAdmin
      ? [...PUBLIC_PERSONAS, PERSONA_TYPE.PLATFORM_ADMIN]
      : [...PUBLIC_PERSONAS];
    return available.filter((p) => visibleTypes.includes(p.type));
  }, [available, userProfile]);

  const canSwitch = visibleForSwitcher.length > 1;

  // Sincroniza persona ativa na inicialização e quando user muda
  // IMPORTANTE: dependências explícitas dos CAMPOS (não objetos) para
  // evitar loops quando refs mudam de identidade sem mudar valor.
  useEffect(() => {
    if (!user?.uid) {
      setActiveState({
        key: DEFAULT_PERSONA,
        type: DEFAULT_PERSONA,
        scopeId: null,
        hasOnboarding: false,
      });
      setIsLoading(false);
      return;
    }
    if (!userProfile) {
      // Perfil ainda carregando. Mantém isLoading=true para que consumers
      // (PersonaSwitcher, PersonaSelection) saibam que ainda não terminou.
      // O effect vai re-rodar quando userProfile mudar (dep na lista).
      return;
    }

    let cancelled = false;
    // Usa a versão "atual" de available via ref para evitar re-rodar
    // o effect quando available muda (cálculo derivado).
    const currentAvailable = detectAvailablePersonas(userProfile, signals);

    (async () => {
      try {
        // 1. Tenta ler do Firestore
        const fromFs = await getActivePersona(user.uid);
        if (cancelled) return;

        // 2. Verifica se a persona ativa é válida (existe em available)
        const isValid = currentAvailable.some((p) => p.key === fromFs.key);

        let chosenKey = fromFs.key;
        if (!isValid) {
          // Fallback: localStorage
          const fromLs = readLocalActivePersona(user.uid);
          const isLsValid = fromLs && currentAvailable.some((p) => p.key === fromLs);
          if (isLsValid) {
            chosenKey = fromLs;
            // Sincroniza Firestore com o localStorage
            await setActivePersonaFirestore(user.uid, fromLs).catch(() => {});
          } else {
            // Fallback final: primeira persona disponível
            chosenKey = currentAvailable[0]?.key || DEFAULT_PERSONA;
            await setActivePersonaFirestore(user.uid, chosenKey).catch(() => {});
          }
        }

        const parsed = parsePersonaKey(chosenKey);
        const personaData = currentAvailable.find((p) => p.key === chosenKey);
        setActiveState({
          key: chosenKey,
          type: parsed.type,
          scopeId: parsed.scopeId,
          hasOnboarding: personaData?.hasOnboarding || false,
        });
        writeLocalActivePersona(user.uid, chosenKey);
      } catch (err) {
        logger.error('[useActivePersona] sync failed:', err);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          isInitialLoad.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, userProfile?.role, userProfile?.profile_completed, userProfile?.donor_profile, signals?.petCount, signals?.hasVolunteerProfile]);

  /**
   * Define a persona ativa (D-PERSONA-SWITCH-NO-CONFIRM: instantânea).
   * @param {string} personaKey
   * @returns {Promise<void>}
   */
  const setActive = useCallback(
    async (personaKey) => {
      if (!user?.uid) throw new Error('Não autenticado');
      // 1. Atualiza estado local imediatamente (D-PERSONA-SWITCH-NO-CONFIRM)
      const parsed = parsePersonaKey(personaKey);
      const personaData = available.find((p) => p.key === personaKey);
      setActiveState({
        key: personaKey,
        type: parsed.type,
        scopeId: parsed.scopeId,
        hasOnboarding: personaData?.hasOnboarding || false,
      });
      writeLocalActivePersona(user.uid, personaKey);
      // 2. Persiste no Firestore em background
      try {
        await setActivePersonaFirestore(user.uid, personaKey);
      } catch (err) {
        logger.error('[useActivePersona.setActive] persist failed:', err);
        // Não revertemos o estado local — UX não trava
      }
    },
    [user?.uid, available],
  );

  /**
   * Habilita uma persona para o user (adiciona à lista de personas_enabled).
   * @param {string} personaKey
   * @returns {Promise<void>}
   */
  const enablePersona = useCallback(
    async (personaKey) => {
      if (!user?.uid) throw new Error('Não autenticado');
      await enablePersonaFirestore(user.uid, personaKey);
    },
    [user?.uid],
  );

  /**
   * Verifica se a persona do tipo dado é a ativa.
   * @param {string} personaType (ex: 'adopter', 'donor')
   * @returns {boolean}
   */
  const isActive = useCallback(
    (personaType) => active.type === personaType,
    [active],
  );

  /**
   * Verifica se o user tem a persona do tipo dado (independente de ser ativa).
   * @param {string} personaType
   * @returns {boolean}
   */
  const hasPersona = useCallback(
    (personaType) => available.some((p) => p.type === personaType),
    [available],
  );

  return {
    active,
    available,
    visibleForSwitcher,
    setActive,
    enablePersona,
    isLoading,
    canSwitch,
    isActive,
    hasPersona,
  };
}
