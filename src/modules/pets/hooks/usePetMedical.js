/**
 * @fileoverview usePetMedical — hooks para subcoleções médicas.
 *
 * TASK-V3-PET-DETAIL-FULL-06: usePetVetVisits, usePetTreatments, usePetCareLog
 * com React Query 5min stale time, refetch on focus, retry 1.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listVetVisits, createVetVisit, updateVetVisit, deleteVetVisit,
  listTreatments, createTreatment, updateTreatment, deleteTreatment,
  listCareLog, createCareLog, updateCareLog, deleteCareLog,
} from '../services/petMedicalService';
import { logger } from '@/core/lib/logger';

const STALE_TIME_MS = 5 * 60 * 1000; // 5min
const GC_TIME = 30 * 60 * 1000;

// ============================================================================
// VET VISITS
// ============================================================================

export function usePetVetVisits(petId) {
  return useQuery({
    queryKey: ['pet', petId, 'vet_visits'],
    queryFn: () => listVetVisits(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export function useCreateVetVisit(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, actor }) => createVetVisit(petId, data, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'vet_visits'] });
      qc.invalidateQueries({ queryKey: ['pet', petId] }); // header
    },
  });
}

export function useUpdateVetVisit(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, updates }) => updateVetVisit(petId, visitId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'vet_visits'] });
    },
  });
}

export function useDeleteVetVisit(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId }) => deleteVetVisit(petId, visitId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'vet_visits'] });
    },
  });
}

// ============================================================================
// TREATMENTS
// ============================================================================

export function usePetTreatments(petId) {
  return useQuery({
    queryKey: ['pet', petId, 'treatments'],
    queryFn: () => listTreatments(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export function useCreateTreatment(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, actor }) => createTreatment(petId, data, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'treatments'] });
    },
  });
}

export function useUpdateTreatment(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treatmentId, updates }) => updateTreatment(petId, treatmentId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'treatments'] });
    },
  });
}

export function useDeleteTreatment(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treatmentId }) => deleteTreatment(petId, treatmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'treatments'] });
    },
  });
}

// ============================================================================
// CARE LOG
// ============================================================================

export function usePetCareLog(petId) {
  return useQuery({
    queryKey: ['pet', petId, 'care_log'],
    queryFn: () => listCareLog(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export function useCreateCareLog(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, actor }) => createCareLog(petId, data, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'care_log'] });
    },
  });
}

export function useUpdateCareLog(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ careId, updates }) => updateCareLog(petId, careId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'care_log'] });
    },
  });
}

export function useDeleteCareLog(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ careId }) => deleteCareLog(petId, careId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'care_log'] });
    },
  });
}
