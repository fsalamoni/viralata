/**
 * @fileoverview Hooks React Query para Vitrines / Eventos (Fase 11).
 *
 * Encapsulam o serviço de exhibitions com cache automático,
 * invalidação em mutações e chaves determinísticas.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listExhibitions,
  getExhibition,
  createExhibition,
  updateExhibition,
  activateExhibition,
  completeExhibition,
  cancelExhibition,
  addExhibitionAnimal,
  removeExhibitionAnimal,
  addExhibitionOutcome,
} from '@/modules/shelter/services/exhibitionService';

const STALE_TIME_MS = 60_000;

// ─── Queries ───────────────────────────────────────────────────────

export function useExhibitions(shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['exhibitions', shelterClubId, options],
    queryFn: () => listExhibitions(shelterClubId, options),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useExhibition(shelterClubId, exhibitionId) {
  return useQuery({
    queryKey: ['exhibition', shelterClubId, exhibitionId],
    queryFn: () => getExhibition(shelterClubId, exhibitionId),
    enabled: Boolean(shelterClubId && exhibitionId),
    staleTime: STALE_TIME_MS,
  });
}

// ─── Mutations ────────────────────────────────────────────────────

export function useCreateExhibition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createExhibition(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibitions', data.organizer_shelter_id] });
    },
  });
}

export function useUpdateExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, patch, actor }) =>
      updateExhibition(shelterClubId, exhibitionId, patch, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useCancelExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, reason, actor }) =>
      cancelExhibition(shelterClubId, exhibitionId, reason, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useActivateExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, actor }) =>
      activateExhibition(shelterClubId, exhibitionId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useCompleteExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, postEventLog, actor }) =>
      completeExhibition(shelterClubId, exhibitionId, postEventLog, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useAddExhibitionAnimal(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, petId, actor }) =>
      addExhibitionAnimal(shelterClubId, exhibitionId, petId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useRemoveExhibitionAnimal(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, petId, actor }) =>
      removeExhibitionAnimal(shelterClubId, exhibitionId, petId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useAddExhibitionOutcome(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, outcome, actor }) =>
      addExhibitionOutcome(shelterClubId, exhibitionId, outcome, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}
