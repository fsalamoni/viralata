/**
 * @fileoverview Hooks React Query para histórico do pet (devoluções,
 * adotantes anteriores).
 *
 * @see src/modules/pets/services/petHistoryService.js
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listDevolutions, createDevolution, updateDevolution, deleteDevolution,
  listAdoptersHistory, createAdopterHistory, updateAdopterHistory, deleteAdopterHistory,
  generatePetCode,
} from '../services/petHistoryService';

const STALE_TIME_MS = 30_000;
const GC_TIME = 5 * 60_000;

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
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    // actor sempre vem do user autenticado (não confiar no payload)
    mutationFn: ({ data }) => createDevolution(petId, data, {
      uid: user?.uid,
      displayName: user?.displayName,
      name: user?.displayName,
      isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'devolutions'] });
    },
  });
}

export function useUpdateDevolution(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ devolutionId, updates }) => updateDevolution(petId, devolutionId, updates, {
      uid: user?.uid,
      displayName: user?.displayName,
      name: user?.displayName,
      isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'devolutions'] });
    },
  });
}

export function useDeleteDevolution(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ devolutionId }) => deleteDevolution(petId, devolutionId, {
      uid: user?.uid,
      displayName: user?.displayName,
      name: user?.displayName,
      isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
    }),
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
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => createAdopterHistory(petId, data, {
      uid: user?.uid,
      displayName: user?.displayName,
      name: user?.displayName,
      isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'adopters_history'] });
    },
  });
}

export function useUpdateAdopterHistory(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ historyId, updates }) => updateAdopterHistory(petId, historyId, updates, {
      uid: user?.uid,
      displayName: user?.displayName,
      name: user?.displayName,
      isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'adopters_history'] });
    },
  });
}

export function useDeleteAdopterHistory(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ historyId }) => deleteAdopterHistory(petId, historyId, {
      uid: user?.uid,
      displayName: user?.displayName,
      name: user?.displayName,
      isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
    }),
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
