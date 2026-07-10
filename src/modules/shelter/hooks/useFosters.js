/**
 * @fileoverview Hooks React Query para Lares Temporários (Fase 7).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listFosterPlacements,
  getFosterPlacement,
  proposeFosterPlacement,
  acceptFosterPlacement,
  extendFosterPlacement,
  endFosterPlacement,
  cancelFosterPlacement,
} from '@/modules/shelter/services/fosterService';

const STALE_TIME_MS = 30_000;

export function useFosters(shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['fosters', shelterClubId, options],
    queryFn: () => listFosterPlacements(shelterClubId, options),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useFoster(shelterClubId, fosterId) {
  return useQuery({
    queryKey: ['foster', shelterClubId, fosterId],
    queryFn: () => getFosterPlacement(shelterClubId, fosterId),
    enabled: Boolean(shelterClubId && fosterId),
    staleTime: STALE_TIME_MS,
  });
}

export function useProposeFoster() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => proposeFosterPlacement(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['fosters', data.shelter_club_id] });
    },
  });
}

export function useAcceptFoster(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fosterId, acceptance, actor }) =>
      acceptFosterPlacement(shelterClubId, fosterId, acceptance, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fosters', shelterClubId] });
    },
  });
}

export function useExtendFoster(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fosterId, extension, actor }) =>
      extendFosterPlacement(shelterClubId, fosterId, extension, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fosters', shelterClubId] });
    },
  });
}

export function useEndFoster(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fosterId, endData, actor }) =>
      endFosterPlacement(shelterClubId, fosterId, endData, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fosters', shelterClubId] });
    },
  });
}

export function useCancelFoster(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ fosterId, reason, actor }) =>
      cancelFosterPlacement(shelterClubId, fosterId, reason, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fosters', shelterClubId] });
    },
  });
}
