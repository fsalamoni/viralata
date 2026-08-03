/**
 * @fileoverview PersonaGate — route guard que valida a persona ativa.
 *
 * Envolve uma rota e:
 *  - Se flag V4_PERSONA_ENABLED está OFF: passa transparente
 *  - Se persona ativa tem permissão para a rota: passa
 *  - Se persona ativa NÃO tem permissão: redireciona para /acesso
 *    OU mostra fallback (render prop)
 *
 * IMPORTANTE: gate é PURAMENTE UX. A segurança real está em
 * Firestore rules (defense-in-depth). PersonaGate NUNCA é
 * a única barreira.
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE, parsePersonaKey, buildPersonaKey } from '@/core/domain/personas';
import { logger } from '@/core/lib/logger';

/**
 * Compara o requisito da rota com a persona ativa do user.
 *
 * @param {object} activePersona - { type, scopeId, hasOnboarding }
 * @param {string|Array<string>|Function} require - tipo exigido ou lista de tipos OU função (active) => bool
 * @param {string} [requireScope] - scopeId específico exigido (ex: clubId)
 * @returns {boolean}
 */
export function checkPersonaRequirement(activePersona, require, requireScope) {
  if (!activePersona) return false;
  if (typeof require === 'function') {
    try {
      return Boolean(require(activePersona));
    } catch (err) {
      logger.error('[PersonaGate] check function failed:', err);
      return false;
    }
  }
  const required = Array.isArray(require) ? require : [require];
  if (!required.includes(activePersona.type)) return false;
  if (requireScope && activePersona.scopeId !== requireScope) return false;
  return true;
}

/**
 * PersonaGate component.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - conteúdo protegido
 * @param {string|Array<string>|Function} props.require - tipo exigido
 * @param {string} [props.requireScope] - scopeId específico
 * @param {React.ReactNode} [props.fallback] - o que mostrar se não autorizado (default: <Navigate to="/acesso" />)
 * @param {boolean} [props.requireOnboarding] - se true, exige persona.hasOnboarding=true
 */
export function PersonaGate({
  children,
  require,
  requireScope,
  fallback,
  requireOnboarding = false,
}) {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_ENABLED);
  const { user, isLoadingAuth } = useAuth();
  const { active, isLoading: isLoadingPersona } = useActivePersona();
  const location = useLocation();

  // Se V4 desabilitada, passa direto
  if (!enabled) return children;

  // Loading state
  if (isLoadingAuth || isLoadingPersona) {
    return null; // ou um spinner — caller decide
  }

  // Não autenticado → não bloqueia aqui (ProtectedRoute cuida)
  if (!user) return children;

  // Verifica requisito
  const passes = checkPersonaRequirement(active, require, requireScope);
  const passesOnboarding = !requireOnboarding || active.hasOnboarding;

  if (passes && passesOnboarding) {
    return children;
  }

  // Não autorizado — usa fallback ou redireciona para /acesso
  if (fallback) return fallback;

  return (
    <Navigate
      to="/acesso"
      state={{ from: location.pathname, reason: 'persona_mismatch' }}
      replace
    />
  );
}

export default PersonaGate;
