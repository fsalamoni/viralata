/**
 * @fileoverview usePetHistory — hooks para subcoleções de histórico.
 *
 * TASK-V3-PET-DETAIL-FULL-06: usePetDevolutions, usePetAdoptersHistory,
 * useGeneratePetCode com React Query.
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listDevolutions, createDevolution, updateDevolution, deleteDevolution,
  listAdoptersHistory, createAdopterHistory, updateAdopterHistory, deleteAdopterHistory,
  generatePetCode,
} from '../services/petHistoryService';

const STALE_TIME_MS = 5 * 60 * 1000;
const GC_TIME = 30 * 60 * 1000;

// ============================================================================
// DEVOLUTIONS
// ============================================================================

export function usePetDevolutions(petId) {
  return useQuery({
    queryKey: ['pet', petId, 'devolutions'],
    queryFn: () => listDevolutions(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export function useCreateDevolution(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, actor }) => createDevolution(petId, data, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'devolutions'] });
    },
  });
}

export function useUpdateDevolution(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ devolutionId, updates }) => updateDevolution(petId, devolutionId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'devolutions'] });
    },
  });
}

export function useDeleteDevolution(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ devolutionId }) => deleteDevolution(petId, devolutionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'devolutions'] });
    },
  });
}

// ============================================================================
// ADOPTERS HISTORY
// ============================================================================

export function usePetAdoptersHistory(petId) {
  return useQuery({
    queryKey: ['pet', petId, 'adopters_history'],
    queryFn: () => listAdoptersHistory(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export function useCreateAdopterHistory(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, actor }) => createAdopterHistory(petId, data, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'adopters_history'] });
    },
  });
}

export function useUpdateAdopterHistory(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ historyId, updates }) => updateAdopterHistory(petId, historyId, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'adopters_history'] });
    },
  });
}

export function useDeleteAdopterHistory(petId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ historyId }) => deleteAdopterHistory(petId, historyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'adopters_history'] });
    },
  });
}

// ============================================================================
// PET CODE GENERATOR
// ============================================================================

export function useGeneratePetCode() {
  return useMutation({
    mutationFn: () => generatePetCode(),
  });
}
