/**
 * @fileoverview Hook React Query para a timeline do pet.
 *
 * TASK-V3-PET-OPS-LOG (2026-07-22): combina todos os eventos do pet.
 */
import { useQuery } from '@tanstack/react-query';
import { getPetTimeline } from '../services/petTimelineService';

const STALE_TIME_MS = 60_000; // 1min
const GC_TIME = 5 * 60_000;

export function usePetTimeline(petId, pet = null) {
  return useQuery({
    queryKey: ['pet', petId, 'timeline_combined'],
    queryFn: () => getPetTimeline(petId, pet),
    enabled: Boolean(petId),
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME,
    retry: 1,
  });
}
