/**
 * @fileoverview useStaffPersonaView — indica se o usuário está DENTRO do
 * acesso (persona) de staff de abrigo/comunidade.
 *
 * Item 7 da segmentação V4: ao entrar no acesso de abrigo/comunidade o usuário
 * vai DIRETO ao painel admin (visão privada) — e ali NÃO deve haver "escapes"
 * para a visão pública ("Ver página pública", "Voltar para a ONG" etc.), pois
 * ele já está no painel daquele abrigo/comunidade.
 *
 * Com a V4 desligada (default), sempre retorna false — a UI legacy mantém os
 * links de visão pública exatamente como antes.
 *
 * @see docs/PLAN_PERSONAS_V4.md
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useActivePersona } from '@/core/hooks/useActivePersona';

/**
 * @param {string} personaType tipo da persona de staff (shelter_staff | community_staff)
 * @returns {boolean} true quando esse acesso de staff está ativo (e V4 ligada)
 */
export function useIsStaffPersonaActive(personaType) {
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_ENABLED);
  const { active } = useActivePersona();
  return Boolean(v4Enabled && active?.type === personaType);
}

export default useIsStaffPersonaActive;
