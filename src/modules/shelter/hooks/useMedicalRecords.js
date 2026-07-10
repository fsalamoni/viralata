/**
 * @fileoverview Hooks React Query para Prontuário Médico (Fase 8).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMedicalRecords,
  getMedicalRecord,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
} from '@/modules/shelter/services/medicalRecordsService';

const STALE_TIME_MS = 60_000;

export function useMedicalRecords(petId, shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['medical-records', petId, shelterClubId, options],
    queryFn: () => listMedicalRecords(petId, shelterClubId, options),
    enabled: Boolean(petId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useMedicalRecord(petId, recordId, shelterClubId) {
  return useQuery({
    queryKey: ['medical-record', petId, recordId],
    queryFn: () => getMedicalRecord(petId, recordId, shelterClubId),
    enabled: Boolean(petId && recordId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateMedicalRecord(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createMedicalRecord(petId, shelterClubId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', petId, shelterClubId] });
    },
  });
}

export function useUpdateMedicalRecord(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, updates, actor }) =>
      updateMedicalRecord(petId, recordId, shelterClubId, updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', petId, shelterClubId] });
    },
  });
}

export function useDeleteMedicalRecord(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recordId, actor }) => deleteMedicalRecord(petId, recordId, shelterClubId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-records', petId, shelterClubId] });
    },
  });
}
