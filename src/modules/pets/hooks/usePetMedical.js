/**
 * @fileoverview usePetMedical — hooks para subcoleções médicas.
 *
 * TASK-V3-PET-DETAIL-FULL-06: usePetVetVisits, usePetTreatments, usePetCareLog
 * com React Query 5min stale time, refetch on focus, retry 1.
 *
 * DEFENSE-IN-DEPTH (2026-07-20): os mutations SEMPRE pegam o `user` do
 * useAuth (NUNCA do payload) e passam pro service, que chama
 * `ensureCanMutatePet` antes de qualquer escrita. Defense em 3 camadas:
 *  1) UI: usePetPermissions hook mostra/esconde botões
 *  2) Service: ensureCanMutatePet (este arquivo) — falha rápido
 *  3) Firestore rules: bloqueio final no servidor (canManagePet)
 *
 * @see docs/V3_PET_DETAIL_FULL_PLAN.md
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listVetVisits, createVetVisit, updateVetVisit, deleteVetVisit,
  listTreatments, createTreatment, updateTreatment, deleteTreatment,
  listCareLog, createCareLog, updateCareLog, deleteCareLog,
  listMedications, createMedication, updateMedication, deleteMedication,
} from '../services/petMedicalService';
import { logger } from '@/core/lib/logger';

const STALE_TIME_MS = 5 * 60 * 1000; // 5min
const GC_TIME = 30 * 60 * 1000;

function buildActor(user) {
  return {
    uid: user?.uid,
    displayName: user?.displayName,
    name: user?.displayName,
    isPlatformAdmin: user?.email === 'fsalamoni@gmail.com',
  };
}

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
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => createVetVisit(petId, data, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'vet_visits'] });
      qc.invalidateQueries({ queryKey: ['pet', petId] });
    },
  });
}

export function useUpdateVetVisit(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId, updates }) => updateVetVisit(petId, visitId, updates, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'vet_visits'] });
    },
  });
}

export function useDeleteVetVisit(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ visitId }) => deleteVetVisit(petId, visitId, buildActor(user)),
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
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => createTreatment(petId, data, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'treatments'] });
    },
  });
}

export function useUpdateTreatment(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treatmentId, updates }) => updateTreatment(petId, treatmentId, updates, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'treatments'] });
    },
  });
}

export function useDeleteTreatment(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ treatmentId }) => deleteTreatment(petId, treatmentId, buildActor(user)),
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
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => createCareLog(petId, data, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'care_log'] });
    },
  });
}

export function useUpdateCareLog(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ careId, updates }) => updateCareLog(petId, careId, updates, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'care_log'] });
    },
  });
}

export function useDeleteCareLog(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ careId }) => deleteCareLog(petId, careId, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'care_log'] });
    },
  });
}

// ============================================================================
// MEDICATIONS
// ============================================================================

export function usePetMedications(petId) {
  return useQuery({
    queryKey: ['pet', petId, 'medications'],
    queryFn: () => listMedications(petId),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}

export function useCreateMedication(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data }) => createMedication(petId, data, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'medications'] });
    },
  });
}

export function useUpdateMedication(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medicationId, updates }) => updateMedication(petId, medicationId, updates, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'medications'] });
    },
  });
}

export function useDeleteMedication(petId) {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ medicationId }) => deleteMedication(petId, medicationId, buildActor(user)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pet', petId, 'medications'] });
    },
  });
}
