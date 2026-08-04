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

  return useMemo(
    () => ({
      petCount: pets.length,
      shelterMemberships: clubKey ? clubKey.split(',').map((clubId) => ({ clubId })) : [],
      communityMemberships: communityKey
        ? communityKey.split(',').map((communityId) => ({ communityId }))
        : [],
      hasVolunteerProfile: hasVolunteer,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pets.length, clubKey, communityKey, hasVolunteer],
  );
}

export default usePersonaSignals;
