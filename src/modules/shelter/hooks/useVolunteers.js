/**
 * @fileoverview Hooks React Query para Gestão de Voluntários (Fase 13).
 *
 * Cobre:
 *  - Profile (GLOBAL): useVolunteerProfile, useMyVolunteerProfile,
 *    useCreate/Update/DeleteVolunteerProfile.
 *  - Participation (multi-tenant): useParticipations, useParticipation,
 *    useCreate/UpdateParticipation, useCheckIn/OutVolunteer.
 *  - Cross-tenant: useUserParticipations (voluntário vê as próprias).
 *
 * Convenção staleTime 30s (mesma dos hooks das Fases 7-11).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getVolunteerProfile,
  getMyVolunteerProfile,
  listVolunteerProfilesByIds,
  createVolunteerProfile,
  updateVolunteerProfile,
  deleteVolunteerProfile,
  listParticipations,
  getParticipation,
  createParticipation,
  updateParticipation,
  deleteParticipation,
  checkInVolunteer,
  checkOutVolunteer,
  getUserParticipations,
} from '@/modules/shelter/services/volunteerService';

const STALE_TIME_MS = 30_000;
const DEFAULT_PROFILE_DOC = 'main';

// ═══════════════════════════════════════════════════════════════════════
// VOLUNTEER PROFILE
// ═══════════════════════════════════════════════════════════════════════

export function useVolunteerProfile(userId, profileId = DEFAULT_PROFILE_DOC) {
  return useQuery({
    queryKey: ['volunteerProfile', userId, profileId],
    queryFn: () => getVolunteerProfile(userId, profileId),
    enabled: Boolean(userId),
    staleTime: STALE_TIME_MS,
  });
}

export function useMyVolunteerProfile(userId) {
  return useVolunteerProfile(userId, DEFAULT_PROFILE_DOC);
}

export function useVolunteerProfilesByIds(userIds) {
  return useQuery({
    queryKey: ['volunteerProfilesByIds', userIds],
    queryFn: () => listVolunteerProfilesByIds(userIds),
    enabled: Array.isArray(userIds) && userIds.length > 0,
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateVolunteerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input, actor }) =>
      createVolunteerProfile(userId, input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['volunteerProfile', data.user_id] });
    },
  });
}

export function useUpdateVolunteerProfile(userId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId = DEFAULT_PROFILE_DOC, patch, actor }) =>
      updateVolunteerProfile(userId, profileId, patch, actor),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ['volunteerProfile', userId, vars.profileId || DEFAULT_PROFILE_DOC],
      });
    },
  });
}

export function useDeleteVolunteerProfile(userId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId = DEFAULT_PROFILE_DOC, actor }) =>
      deleteVolunteerProfile(userId, profileId, actor),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ['volunteerProfile', userId, vars.profileId || DEFAULT_PROFILE_DOC],
      });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════
// VOLUNTEER PARTICIPATION (multi-tenant)
// ═══════════════════════════════════════════════════════════════════════

export function useParticipations(shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['participations', shelterClubId, options],
    queryFn: () => listParticipations(shelterClubId, options),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useParticipation(shelterClubId, participationId) {
  return useQuery({
    queryKey: ['participation', shelterClubId, participationId],
    queryFn: () => getParticipation(shelterClubId, participationId),
    enabled: Boolean(shelterClubId && participationId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateParticipation(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createParticipation(shelterClubId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participations', shelterClubId] });
    },
  });
}

export function useUpdateParticipation(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participationId, patch, actor }) =>
      updateParticipation(shelterClubId, participationId, patch, actor),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['participations', shelterClubId] });
      qc.invalidateQueries({
        queryKey: ['participation', shelterClubId, vars.participationId],
      });
    },
  });
}

export function useDeleteParticipation(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participationId, actor }) =>
      deleteParticipation(shelterClubId, participationId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participations', shelterClubId] });
    },
  });
}

export function useCheckInVolunteer(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participationId, actor, allowOverride }) =>
      checkInVolunteer(shelterClubId, participationId, actor, { allowOverride }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['participations', shelterClubId] });
      qc.invalidateQueries({
        queryKey: ['participation', shelterClubId, vars.participationId],
      });
    },
  });
}

export function useCheckOutVolunteer(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ participationId, actor, allowOverride }) =>
      checkOutVolunteer(shelterClubId, participationId, actor, { allowOverride }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['participations', shelterClubId] });
      qc.invalidateQueries({
        queryKey: ['participation', shelterClubId, vars.participationId],
      });
    },
  });
}

// ─── Cross-tenant: participações do próprio voluntário ────────────────

export function useUserParticipations(volunteerUid, shelterClubIds = []) {
  return useQuery({
    queryKey: ['userParticipations', volunteerUid, shelterClubIds],
    queryFn: () => getUserParticipations(volunteerUid, shelterClubIds),
    enabled: Boolean(volunteerUid) && Array.isArray(shelterClubIds) && shelterClubIds.length > 0,
    staleTime: STALE_TIME_MS,
  });
}
