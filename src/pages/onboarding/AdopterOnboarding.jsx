/**
 * @fileoverview AdopterOnboarding — wrapper V4 que delega para OnboardingQuestionnaire.
 *
 * D-PERSONA-ADOPTER-ONBOARDING (Q23): mantém o questionário atual
 * (moradia, rotina, filhos), apenas renomeia para "AdopterOnboarding".
 * Libera feed após `profile_completed = true`.
 *
 * O comportamento de negócio permanece o mesmo — apenas o nome e o
 * roteamento mudam para refletir a persona V4.
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import OnboardingQuestionnaire from '@/modules/onboarding/pages/OnboardingQuestionnaire';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { PERSONA_TYPE } from '@/core/domain/personas';
import { enablePersona } from '@/core/services/personaService';

/**
 * AdopterOnboarding V4 — mantém compatibilidade com o questionário existente.
 *
 * Adiciona:
 *  - Habilita persona 'adopter' no Firestore
 *  - Define persona ativa como 'adopter' (se ainda não tiver)
 *
 * IMPORTANTE (D-HOOKS-ORDER-PRESERVE): TODOS os hooks ANTES de early return.
 */
export function AdopterOnboarding() {
  const { user, userProfile } = useAuth();
  const { active, setActive } = useActivePersona();

  // Efeito: habilita persona adopter se necessário
  // SEMPRE ANTES de early return (D-HOOKS-ORDER-PRESERVE)
  useEffect(() => {
    if (!user?.uid) return;
    if (active && active.type === PERSONA_TYPE.ADOPTER) return;
    enablePersona(user.uid, PERSONA_TYPE.ADOPTER)
      .then(() => setActive(PERSONA_TYPE.ADOPTER))
      .catch(() => {});
  }, [user?.uid, active, setActive]);

  // Early return APÓS todos os hooks
  if (userProfile && active && active.type !== PERSONA_TYPE.ADOPTER) {
    return <Navigate to="/acesso" replace state={{ from: '/onboarding' }} />;
  }

  return <OnboardingQuestionnaire />;
}

export default AdopterOnboarding;
