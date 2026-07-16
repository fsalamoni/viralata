/**
 * @fileoverview Hooks React Query para Atribuições Finas de Voluntários (TASK-274).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § TASK-274
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listAssignments,
  listMyAssignments,
  listAssignmentsByVolunteer,
  getAssignment,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  toggleAssignment,
} from '@/modules/shelter/services/volunteerAssignmentService';

const STALE_TIME_MS = 30_000;

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/**
 * Lista todas as atribuições ativas de um abrigo.
 * Cacheadas por shelterClubId.
 */
export function useVolunteerAssignments(shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['volunteer-assignments', shelterClubId, options],
    queryFn: () => listAssignments(shelterClubId, options),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Lista atribuições agrupadas por voluntário (para a matriz admin).
 */
export function useAssignmentsByVolunteer(shelterClubId) {
  return useQuery({
    queryKey: ['volunteer-assignments-by-volunteer', shelterClubId],
    queryFn: () => listAssignmentsByVolunteer(shelterClubId),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Lista atribuições do próprio voluntário logado.
 */
export function useMyAssignments(shelterClubId, volunteerUid) {
  return useQuery({
    queryKey: ['my-assignments', shelterClubId, volunteerUid],
    queryFn: () => listMyAssignments(shelterClubId, volunteerUid),
    enabled: Boolean(shelterClubId) && Boolean(volunteerUid),
    staleTime: STALE_TIME_MS,
  });
}

export function useAssignment(shelterClubId, assignmentId) {
  return useQuery({
    queryKey: ['volunteer-assignment', shelterClubId, assignmentId],
    queryFn: () => getAssignment(shelterClubId, assignmentId),
    enabled: Boolean(shelterClubId) && Boolean(assignmentId),
    staleTime: STALE_TIME_MS,
  });
}

// ─── MUTATIONS ───────────────────────────────────────────────────────────────

const QK_ASSIGNMENTS = ['volunteer-assignments'];
const QK_BY_VOLUNTEER = ['volunteer-assignments-by-volunteer'];

function invalidateAssignments(qc, shelterClubId) {
  qc.invalidateQueries({ queryKey: QK_ASSIGNMENTS });
  qc.invalidateQueries({ queryKey: QK_BY_VOLUNTEER });
  // Also invalidate by-volunteer for the specific shelter
  qc.invalidateQueries({ queryKey: ['volunteer-assignments-by-volunteer', shelterClubId] });
}

/** Cria uma atribuição. */
export function useCreateAssignment(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createAssignment(shelterClubId, input, actor),
    onSuccess: () => invalidateAssignments(qc, shelterClubId),
  });
}

/** Atualiza uma atribuição. */
export function useUpdateAssignment(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, input, actor }) =>
      updateAssignment(shelterClubId, assignmentId, input, actor),
    onSuccess: () => invalidateAssignments(qc, shelterClubId),
  });
}

/** Remove uma atribuição. */
export function useDeleteAssignment(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, actor }) => deleteAssignment(shelterClubId, assignmentId, actor),
    onSuccess: () => invalidateAssignments(qc, shelterClubId),
  });
}

/**
 * Toggle (ativa/desativa) uma atribuição.
 * Se a capability já está atribuída ao voluntário, remove.
 * Se não, cria.
 */
export function useToggleAssignment(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ volunteerUid, capability, scope, actor }) =>
      toggleAssignment(shelterClubId, volunteerUid, capability, scope, actor),
    onSuccess: () => invalidateAssignments(qc, shelterClubId),
  });
}
