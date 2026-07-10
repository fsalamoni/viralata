/**
 * @fileoverview Hooks React Query para RSVP / Escalas de Vitrines (Fase 12).
 *
 * Cobre: invites (convocações) + shifts (escalas) por exhibition.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (RSVP / Escalas)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  // Invites
  listInvites,
  getInvite,
  createInvite,
  respondToInvite,
  cancelInvite,
  getUserInvites,
  // Shifts
  listShifts,
  getShift,
  createShift,
  updateShift,
  deleteShift,
  assignVolunteerToShift,
  unassignVolunteerFromShift,
} from '@/modules/shelter/services/exhibitionRsvpService';

const STALE_TIME_MS = 60_000;

const KEYS = {
  invites: (shelterClubId, exhibitionId, options) =>
    ['exhibition-invites', shelterClubId, exhibitionId, options],
  invite: (shelterClubId, exhibitionId, inviteId) =>
    ['exhibition-invite', shelterClubId, exhibitionId, inviteId],
  userInvites: (volunteerUid, options) => ['user-exhibition-invites', volunteerUid, options],
  shifts: (shelterClubId, exhibitionId) =>
    ['exhibition-shifts', shelterClubId, exhibitionId],
  shift: (shelterClubId, exhibitionId, shiftId) =>
    ['exhibition-shift', shelterClubId, exhibitionId, shiftId],
};

// ─── INVITES ──────────────────────────────────────────────────────────

/** Lista convites de uma exhibition. Filtros: status, volunteerUid. */
export function useInvites(shelterClubId, exhibitionId, options = {}) {
  return useQuery({
    queryKey: KEYS.invites(shelterClubId, exhibitionId, options),
    queryFn: () => listInvites(shelterClubId, exhibitionId, options),
    enabled: Boolean(shelterClubId && exhibitionId),
    staleTime: STALE_TIME_MS,
  });
}

export function useInvite(shelterClubId, exhibitionId, inviteId) {
  return useQuery({
    queryKey: KEYS.invite(shelterClubId, exhibitionId, inviteId),
    queryFn: () => getInvite(shelterClubId, exhibitionId, inviteId),
    enabled: Boolean(shelterClubId && exhibitionId && inviteId),
    staleTime: STALE_TIME_MS,
  });
}

/** Convites DO voluntário logado (cross-tenant via collectionGroup). */
export function useUserInvites(volunteerUid, options = {}) {
  return useQuery({
    queryKey: KEYS.userInvites(volunteerUid, options),
    queryFn: () => getUserInvites(volunteerUid, options),
    enabled: Boolean(volunteerUid),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateInvite(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) =>
      createInvite(shelterClubId, exhibitionId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-invites', shelterClubId, exhibitionId] });
    },
  });
}

export function useRespondToInvite(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, response, actor }) =>
      respondToInvite(shelterClubId, exhibitionId, inviteId, response, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-invites', shelterClubId, exhibitionId] });
      qc.invalidateQueries({ queryKey: ['user-exhibition-invites'] });
    },
  });
}

export function useCancelInvite(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ inviteId, actor }) =>
      cancelInvite(shelterClubId, exhibitionId, inviteId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-invites', shelterClubId, exhibitionId] });
    },
  });
}

// ─── SHIFTS ──────────────────────────────────────────────────────────

export function useShifts(shelterClubId, exhibitionId) {
  return useQuery({
    queryKey: KEYS.shifts(shelterClubId, exhibitionId),
    queryFn: () => listShifts(shelterClubId, exhibitionId),
    enabled: Boolean(shelterClubId && exhibitionId),
    staleTime: STALE_TIME_MS,
  });
}

export function useShift(shelterClubId, exhibitionId, shiftId) {
  return useQuery({
    queryKey: KEYS.shift(shelterClubId, exhibitionId, shiftId),
    queryFn: () => getShift(shelterClubId, exhibitionId, shiftId),
    enabled: Boolean(shelterClubId && exhibitionId && shiftId),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateShift(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) =>
      createShift(shelterClubId, exhibitionId, input, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, exhibitionId] });
    },
  });
}

export function useUpdateShift(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, patch, actor }) =>
      updateShift(shelterClubId, exhibitionId, shiftId, patch, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, exhibitionId] });
    },
  });
}

export function useDeleteShift(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, actor }) =>
      deleteShift(shelterClubId, exhibitionId, shiftId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, exhibitionId] });
    },
  });
}

export function useAssignVolunteer(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, volunteerUid, actor }) =>
      assignVolunteerToShift(shelterClubId, exhibitionId, shiftId, volunteerUid, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, exhibitionId] });
    },
  });
}

export function useUnassignVolunteer(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ shiftId, volunteerUid, actor }) =>
      unassignVolunteerFromShift(shelterClubId, exhibitionId, shiftId, volunteerUid, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exhibition-shifts', shelterClubId, exhibitionId] });
    },
  });
}
