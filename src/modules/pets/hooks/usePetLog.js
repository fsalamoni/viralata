/**
 * @fileoverview Hooks React Query para o log imutável do pet.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): leitura de /pets/{petId}/pet_audit_log.
 */
import { useQuery } from '@tanstack/react-query';
import { listPetLog } from '../services/petLogService';

const STALE_TIME_MS = 30_000;
const GC_TIME = 5 * 60_000;

export function usePetLog(petId, maxResults = 100) {
  return useQuery({
    queryKey: ['pet', petId, 'pet_audit_log'],
    queryFn: () => listPetLog(petId, maxResults),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}
