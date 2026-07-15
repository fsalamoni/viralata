/**
 * @fileoverview Hooks React Query para Volunteer Participations (Fase 13).
 *
 * Coleção: clubs/{clubId}/volunteer_participations/{participationId}.
 * Cobre: list, get, create, update, check-in/out, delete.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 13
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listParticipations,
  getParticipation,
  createParticipation,
  updateParticipation,
  checkInOut,
  deleteParticipation,
} from '@/modules/shelter/services/volunteerParticipationService';
import { captureVolunteerError } from '@/core/services/errorTracker';

const STALE_TIME_MS = 30_000;

export function useParticipations(shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['volunteer-participations', shelterClubId, options],
    queryFn: () => listParticipations(shelterClubId, options),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useParticipation(shelterClubId, participationId) {
  return useQuery({
    queryKey: ['volunteer-participation', shelterClubId, participationId],
    queryFn: () => getParticipation(shelterClubId, participationId),
    enabled: Boolean(shelterClubId && participationId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateParticipation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createParticipation(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['volunteer-participations', data.shelter_club_id] });
    },
    onError: (err) => captureVolunteerError(err, { mutation: 'createParticipation' }),
  });
}

export function useUpdateParticipation(shelterClubId, participationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) =>
      updateParticipation(shelterClubId, participationId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteer-participations', shelterClubId] });
      qc.invalidateQueries({ queryKey: ['volunteer-participation', shelterClubId, participationId] });
    },
    onError: (err) => captureVolunteerError(err, { mutation: 'updateParticipation', shelterClubId }),
  });
}

export function useCheckInOut(shelterClubId, participationId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) =>
      checkInOut(shelterClubId, participationId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteer-participations', shelterClubId] });
      qc.invalidateQueries({ queryKey: ['volunteer-participation', shelterClubId, participationId] });
    },
    onError: (err) => captureVolunteerError(err, { mutation: 'checkInOut', shelterClubId }),
  });
}

export function useDeleteParticipation(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participationId, actor }) =>
      deleteParticipation(shelterClubId, participationId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteer-participations', shelterClubId] });
    },
    onError: (err) => captureVolunteerError(err, { mutation: 'deleteParticipation', shelterClubId }),
  });
}
