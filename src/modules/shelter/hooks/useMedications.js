/**
 * @fileoverview Hooks React Query para Medicação (Fase 9).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMedications,
  getMedication,
  createMedication,
  updateMedication,
  pauseMedication,
  resumeMedication,
  cancelMedication,
  completeMedication,
  recordDose,
  listDoses,
} from '@/modules/shelter/services/medicationService';

const STALE_TIME_MS = 60_000;

export function useMedications(petId, shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['medications', petId, shelterClubId, options],
    queryFn: () => listMedications(petId, shelterClubId, options),
    enabled: Boolean(petId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useMedication(petId, medId, shelterClubId) {
  return useQuery({
    queryKey: ['medication', petId, medId],
    queryFn: () => getMedication(petId, medId, shelterClubId),
    enabled: Boolean(petId && medId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateMedication(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createMedication(petId, shelterClubId, input, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', petId, shelterClubId] }),
  });
}

export function useUpdateMedication(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medId, updates, actor }) =>
      updateMedication(petId, medId, shelterClubId, updates, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', petId, shelterClubId] }),
  });
}

export function usePauseMedication(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medId, reason, actor }) => pauseMedication(petId, medId, shelterClubId, reason, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', petId, shelterClubId] }),
  });
}

export function useResumeMedication(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medId, actor }) => resumeMedication(petId, medId, shelterClubId, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', petId, shelterClubId] }),
  });
}

export function useCancelMedication(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medId, reason, actor }) => cancelMedication(petId, medId, shelterClubId, reason, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', petId, shelterClubId] }),
  });
}

export function useCompleteMedication(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medId, actor }) => completeMedication(petId, medId, shelterClubId, actor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['medications', petId, shelterClubId] }),
  });
}

export function useRecordDose(petId, medId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dose, actor }) => recordDose(petId, medId, shelterClubId, dose, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medications', petId, shelterClubId] });
      qc.invalidateQueries({ queryKey: ['medication', petId, medId] });
      qc.invalidateQueries({ queryKey: ['doses', petId, medId] });
    },
  });
}

export function useDoses(petId, medId, shelterClubId) {
  return useQuery({
    queryKey: ['doses', petId, medId],
    queryFn: () => listDoses(petId, medId, shelterClubId),
    enabled: Boolean(petId && medId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}
