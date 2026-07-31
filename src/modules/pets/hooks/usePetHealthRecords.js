/**
 * @fileoverview usePetHealthRecords — hooks React Query para a subcoleção
 * `pets/{petId}/health_records` (vacinas e vermifugação).
 *
 * Mesma subcoleção lida pela visão pública (PublicHealthRecord) e agregada
 * pelas tabelas operacionais do abrigo — tudo vinculado.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  listHealthRecords,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
} from '@/modules/pets/services/petHealthRecordsService';

const KEY = (petId) => ['pet', petId, 'health_records'];

export function usePetHealthRecords(petId) {
  return useQuery({
    queryKey: KEY(petId),
    queryFn: () => listHealthRecords(petId),
    enabled: Boolean(petId),
    staleTime: 1000 * 60 * 2,
  });
}

export function useCreateHealthRecord(petId) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ data }) => createHealthRecord(petId, data, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(petId) }),
  });
}

export function useUpdateHealthRecord(petId) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ recordId, updates }) => updateHealthRecord(petId, recordId, updates, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(petId) }),
  });
}

export function useDeleteHealthRecord(petId) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: ({ recordId }) => deleteHealthRecord(petId, recordId, user),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(petId) }),
  });
}
