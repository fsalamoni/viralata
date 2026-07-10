/**
 * @fileoverview Hooks React Query para o Perfil do Adotante (Fase 4).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 4
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAdopterProfile,
  createAdopterProfile,
  updateAdopterProfile,
  recordConsent,
} from '@/modules/shelter/services/adopterProfileService';

const STALE_TIME_MS = 60_000;

export function useAdopterProfile(uid, options = {}) {
  return useQuery({
    queryKey: ['adopter-profile', uid],
    queryFn: () => getAdopterProfile(uid),
    enabled: Boolean(uid),
    staleTime: STALE_TIME_MS,
    ...options,
  });
}

export function useCreateAdopterProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createAdopterProfile(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['adopter-profile', data.user_uid] });
    },
  });
}

export function useUpdateAdopterProfile(uid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ updates, actor }) => updateAdopterProfile(updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adopter-profile', uid] });
    },
  });
}

export function useRecordConsent(uid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ consentType, granted, actor }) =>
      recordConsent(consentType, granted, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['adopter-profile', uid] });
    },
  });
}
