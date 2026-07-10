/**
 * @fileoverview Hooks React Query para Vitrines / Eventos (Fase 11).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listExhibitions,
  getExhibition,
  createExhibition,
  updateExhibition,
  startExhibition,
  completeExhibition,
  cancelExhibition,
  addInternalPet,
  removeInternalPet,
  addExternalPet,
  removeExternalPet,
  listShifts,
  createShift,
  updateShift,
  deleteShift,
  listPostEventLogs,
  logPostEvent,
} from '@/modules/shelter/services/exhibitionService';

const STALE_TIME_MS = 30_000;

// ─── Exhibitions ───────────────────────────────────────────────────────

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

export function useCreateExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createExhibition(shelterClubId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useUpdateExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, patch, actor }) =>
      updateExhibition(shelterClubId, exhibitionId, patch, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
    },
  });
}

export function useStartExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, actor }) =>
      startExhibition(shelterClubId, exhibitionId, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
    },
  });
}

export function useCompleteExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, actor }) =>
      completeExhibition(shelterClubId, exhibitionId, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
    },
  });
}

export function useCancelExhibition(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, reason, actor }) =>
      cancelExhibition(shelterClubId, exhibitionId, { reason }, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
    },
  });
}

// ─── Pets (internos e externos) ────────────────────────────────────────

export function useAddInternalPet(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, input, actor }) =>
      addInternalPet(shelterClubId, exhibitionId, input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useRemoveInternalPet(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, input, actor }) =>
      removeInternalPet(shelterClubId, exhibitionId, input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
      qc.invalidateQueries({ queryKey: ['exhibitions', shelterClubId] });
    },
  });
}

export function useAddExternalPet(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, input, actor }) =>
      addExternalPet(shelterClubId, exhibitionId, input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
    },
  });
}

export function useRemoveExternalPet(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, input, actor }) =>
      removeExternalPet(shelterClubId, exhibitionId, input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, data.id] });
    },
  });
}

// ─── Shifts ────────────────────────────────────────────────────────────

export function useShifts(shelterClubId, exhibitionId) {
  return useQuery({
    queryKey: ['exhibition-shifts', shelterClubId, exhibitionId],
    queryFn: () => listShifts(shelterClubId, exhibitionId),
    enabled: Boolean(shelterClubId && exhibitionId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateShift(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, input, actor }) =>
      createShift(shelterClubId, exhibitionId, input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, data.exhibition_id] });
    },
  });
}

export function useUpdateShift(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, shiftId, patch, actor }) =>
      updateShift(shelterClubId, exhibitionId, shiftId, patch, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, data.exhibition_id] });
    },
  });
}

export function useDeleteShift(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, shiftId, actor }) =>
      deleteShift(shelterClubId, exhibitionId, shiftId, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, data.exhibition_id] });
    },
  });
}

// ─── Post-event log ────────────────────────────────────────────────────

export function usePostEventLogs(shelterClubId, exhibitionId) {
  return useQuery({
    queryKey: ['exhibition-post-event-logs', shelterClubId, exhibitionId],
    queryFn: () => listPostEventLogs(shelterClubId, exhibitionId),
    enabled: Boolean(shelterClubId && exhibitionId),
    staleTime: STALE_TIME_MS,
  });
}

export function useLogPostEvent(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ exhibitionId, input, actor }) =>
      logPostEvent(shelterClubId, exhibitionId, input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exhibition-post-event-logs', shelterClubId, data.exhibition_id] });
    },
  });
}
