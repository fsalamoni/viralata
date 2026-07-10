/**
 * @fileoverview Hooks React Query para Google Forms config (Fase 5).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getGoogleFormsConfig,
  createGoogleFormsConfig,
  updateGoogleFormsConfig,
  rotateGoogleFormsSecret,
} from '@/modules/shelter/services/googleFormsService';

const STALE_TIME_MS = 60_000;

export function useGoogleFormsConfig(shelterClubId) {
  return useQuery({
    queryKey: ['google-forms-config', shelterClubId],
    queryFn: () => getGoogleFormsConfig(shelterClubId),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateGoogleFormsConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createGoogleFormsConfig(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['google-forms-config', data.shelter_club_id] });
    },
  });
}

export function useUpdateGoogleFormsConfig(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ updates, actor }) => updateGoogleFormsConfig(shelterClubId, updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-forms-config', shelterClubId] });
    },
  });
}

export function useRotateGoogleFormsSecret(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ actor }) => rotateGoogleFormsSecret(shelterClubId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['google-forms-config', shelterClubId] });
    },
  });
}
