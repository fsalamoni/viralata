/**
 * @fileoverview Hook React Query para o perfil de abrigo de um animal.
 *
 * Padrão: cache local + invalidação após mutação. Não usa Firestore
 * listener (one-shot fetch é suficiente — a aba Cadastro é raramente
 * aberta em duas abas simultâneas).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 1
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getShelterAnimalProfile, updateShelterAnimalProfile } from '@/modules/shelter/services/shelterAnimalService';

const STALE_TIME_MS = 30_000; // 30s — perfil de abrigo muda raramente

export function useShelterAnimalProfile(petId, options = {}) {
  return useQuery({
    queryKey: ['shelter-animal-profile', petId],
    queryFn: () => getShelterAnimalProfile(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    ...options,
  });
}

export function useUpdateShelterAnimalProfile(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates) =>
      updateShelterAnimalProfile(petId, updates, { uid: 'placeholder' }), // actor injetado pelo caller via useAuth
    onSuccess: (res) => {
      // Revalida o perfil + o pet (porque o doc do pet mudou)
      qc.invalidateQueries({ queryKey: ['shelter-animal-profile', petId] });
      qc.invalidateQueries({ queryKey: ['pet', petId] });
      return res;
    },
  });
}
