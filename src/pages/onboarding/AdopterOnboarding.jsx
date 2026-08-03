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

import React from 'react';
import { Navigate } from 'react-router-dom';
import OnboardingQuestionnaire from '@/modules/onboarding/pages/OnboardingQuestionnaire';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE } from '@/core/domain/personas';
import { enablePersona } from '@/core/services/personaService';

/**
 * AdopterOnboarding V4 — mantém compatibilidade com o questionário existente.
 *
 * Adiciona:
 *  - Habilita persona 'adopter' no Firestore
 *  - Define persona ativa como 'adopter' (se ainda não tiver)
 *  - Gating por feature flag V4_PERSONA_ADOPTER (fallback legacy)
 */
export function AdopterOnboarding() {
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_ADOPTER);
  const { user, userProfile } = useAuth();
  const { active, setActive } = useActivePersona();

  // Se persona ativa já tem outra (não adopter), redireciona para /acesso
  if (userProfile && active && active.type !== PERSONA_TYPE.ADOPTER) {
    return <Navigate to="/acesso" replace state={{ from: '/onboarding' }} />;
  }

  // Em paralelo, garante que a persona adopter está habilitada
  React.useEffect(() => {
    if (!user?.uid) return;
    if (active && active.type === PERSONA_TYPE.ADOPTER) return;
    enablePersona(user.uid, PERSONA_TYPE.ADOPTER)
      .then(() => setActive(PERSONA_TYPE.ADOPTER))
      .catch(() => {});
  }, [user?.uid, active, setActive]);

  // Se V4 desabilitado, deixa o componente legacy cuidar
  // (será o comportamento padrão)
  if (!v4Enabled) {
    return <OnboardingQuestionnaire />;
  }

  return <OnboardingQuestionnaire />;
}

export default AdopterOnboarding;
