/**
 * @fileoverview usePersonaSignals — reúne os "sinais" que a detecção de
 * personas (`detectAvailablePersonas`) precisa para saber quais acessos o
 * usuário realmente possui:
 *
 *   - petCount          → habilita a persona `donor`
 *   - shelterMemberships → habilita `shelter_staff` (1 por abrigo)
 *   - communityMemberships → habilita `community_staff` (1 por comunidade)
 *   - hasVolunteerProfile → habilita `volunteer`
 *
 * ANTES da V4 real, `useActivePersona` era chamado SEM esses sinais, então
 * só `adopter` era detectado — por isso os acessos de abrigo/comunidade não
 * apareciam no switcher. Este hook centraliza a coleta (via os hooks já
 * existentes de cada módulo), evitando que cada consumidor tenha que montar
 * os sinais na mão.
 *
 * As queries só rodam com a flag mestre `V4_PERSONA_ENABLED` ligada — com a
 * V4 desligada (default), zero custo.
 *
 * @see docs/PLAN_PERSONAS_V4.md §18 (arquitetura de conclusão)
 */
import { useMemo } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useMyClubs } from '@/modules/organizations/hooks/useClubs';
import { useMyCommunities } from '@/modules/communities/hooks/useCommunities';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { useVolunteerProfile } from '@/modules/shelter/hooks/useVolunteerProfile';

export function usePersonaSignals() {
  const { user } = useAuth();
  const v4Enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_ENABLED);
  const uid = user?.uid;
  const on = Boolean(v4Enabled && uid);

  const { data: clubs = [] } = useMyClubs({ enabled: on });
  const { data: communities = [] } = useMyCommunities({ enabled: on });
  const { data: pets = [] } = useMyPets(on ? uid : undefined);
  const { data: volunteerProfile } = useVolunteerProfile(uid, { enabled: on });

  // Chaves primitivas para memoização estável (D-REACT-QUERY-KEY-PRIMITIVES):
  // sem isso, os arrays mudam de referência a cada render e disparam loops.
  const clubKey = clubs.map((c) => c.id).sort().join(',');
  const communityKey = communities.map((c) => c.id).sort().join(',');
  const hasVolunteer = Boolean(volunteerProfile?.terms_accepted_at);

  // Só conta pets PESSOAIS (owner_type='user') para a persona Doador —
  // evita falso-positivo de doador por pets de organização.
  const personalPetCount = pets.filter((p) => (p?.owner_type || 'user') === 'user').length;

  return useMemo(
    () => ({
      petCount: personalPetCount,
      // Inclui o NOME da entidade para o switcher distinguir cada acesso
      // (ex.: "Meu abrigo — Cão do Bem") — resolve o item de "vários acessos
      // iguais" no switch.
      shelterMemberships: clubs.map((c) => ({ clubId: c.id, name: c.name || c.title || '' })),
      communityMemberships: communities.map((c) => ({ communityId: c.id, name: c.name || '' })),
      hasVolunteerProfile: hasVolunteer,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [personalPetCount, clubKey, communityKey, hasVolunteer],
  );
}

export default usePersonaSignals;
