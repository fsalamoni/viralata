/**
 * @fileoverview Hooks React Query para a Timeline do Animal (Fase 2).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 2
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listTimelineEvents,
  addTimelineEvent,
  updateTimelineEvent,
  deleteTimelineEvent,
} from '@/modules/shelter/services/timelineService';

const STALE_TIME_MS = 60_000; // 1min — timeline é razoavelmente estável

export function useTimeline(petId, shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['timeline', petId, shelterClubId],
    queryFn: () => listTimelineEvents(petId, shelterClubId, options),
    enabled: Boolean(petId && shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useAddTimelineEvent(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input) =>
      addTimelineEvent(petId, input, { uid: 'placeholder' }, { shelterClubId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline', petId, shelterClubId] });
    },
  });
}

export function useUpdateTimelineEvent(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, updates }) =>
      updateTimelineEvent(
        petId, eventId, updates, { uid: 'placeholder' }, { shelterClubId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline', petId, shelterClubId] });
    },
  });
}

export function useDeleteTimelineEvent(petId, shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (eventId) =>
      deleteTimelineEvent(
        petId, eventId, { uid: 'placeholder' }, { shelterClubId },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['timeline', petId, shelterClubId] });
    },
  });
}
