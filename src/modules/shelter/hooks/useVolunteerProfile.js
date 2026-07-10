/**
 * @fileoverview Hooks React Query para Gestão de Voluntários — Perfil + Roster (Fase 13).
 *
 * Cobre o perfil global do voluntário (users/{uid}/volunteer_profile/main)
 * e a rostagem per-shelter (clubs/{clubId}/volunteers/{volunteerUid}).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 13
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVolunteerProfile,
  upsertVolunteerProfile,
  acceptVolunteerTerms,
  joinShelterAsVolunteer,
  listShelterVolunteers,
  getShelterVolunteer,
  updateShelterVolunteer,
  leaveShelter,
  deleteShelterVolunteer,
} from '@/modules/shelter/services/volunteerProfileService';

const STALE_TIME_MS = 30_000;

// ════════════════════════════════════════════════════════════════════
// PERFIL GLOBAL
// ════════════════════════════════════════════════════════════════════

export function useVolunteerProfile(uid, options = {}) {
  return useQuery({
    queryKey: ['volunteer-profile', uid],
    queryFn: () => getVolunteerProfile(uid),
    enabled: Boolean(uid),
    staleTime: STALE_TIME_MS,
    ...options,
  });
}

export function useUpsertVolunteerProfile(uid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => upsertVolunteerProfile(uid, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteer-profile', uid] });
    },
  });
}

export function useAcceptVolunteerTerms(uid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ acceptance, actor }) => acceptVolunteerTerms(uid, acceptance, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteer-profile', uid] });
    },
  });
}

// ════════════════════════════════════════════════════════════════════
// ROSTER PER-SHELTER
// ════════════════════════════════════════════════════════════════════

export function useShelterVolunteers(shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['shelter-volunteers', shelterClubId, options],
    queryFn: () => listShelterVolunteers(shelterClubId, options),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useShelterVolunteer(shelterClubId, volunteerUid) {
  return useQuery({
    queryKey: ['shelter-volunteer', shelterClubId, volunteerUid],
    queryFn: () => getShelterVolunteer(shelterClubId, volunteerUid),
    enabled: Boolean(shelterClubId && volunteerUid),
    staleTime: STALE_TIME_MS,
  });
}

export function useJoinShelterAsVolunteer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => joinShelterAsVolunteer(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['shelter-volunteers', data.shelter_club_id] });
      qc.invalidateQueries({ queryKey: ['shelter-volunteer', data.shelter_club_id, data.volunteer_uid] });
    },
  });
}

export function useUpdateShelterVolunteer(shelterClubId, volunteerUid) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) =>
      updateShelterVolunteer(shelterClubId, volunteerUid, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shelter-volunteers', shelterClubId] });
      qc.invalidateQueries({ queryKey: ['shelter-volunteer', shelterClubId, volunteerUid] });
    },
  });
}

export function useLeaveShelter(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ volunteerUid, actor }) => leaveShelter(shelterClubId, volunteerUid, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shelter-volunteers', shelterClubId] });
    },
  });
}

export function useDeleteShelterVolunteer(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ volunteerUid, actor }) => deleteShelterVolunteer(shelterClubId, volunteerUid, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shelter-volunteers', shelterClubId] });
    },
  });
}
