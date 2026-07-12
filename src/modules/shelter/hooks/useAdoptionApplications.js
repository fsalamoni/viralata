/**
 * @fileoverview Hooks React Query para o Workflow de Adoção (Fase 3).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 3
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listApplications,
  listMyApplications,
  getApplication,
  submitAdoptionApplication,
  decideApplication,
  cancelApplication,
} from '@/modules/shelter/services/adoptionService';

const STALE_TIME_MS = 30_000;

/**
 * Todas as applications do usuário logado, cross-abrigo (TASK-129 —
 * bloco "Minhas adoções" no perfil).
 */
export function useMyApplications(applicantUid) {
  return useQuery({
    queryKey: ['applications', 'mine', applicantUid],
    queryFn: () => listMyApplications(applicantUid),
    enabled: Boolean(applicantUid),
    staleTime: STALE_TIME_MS,
  });
}

export function useApplications(shelterClubId, options = {}) {
  return useQuery({
    queryKey: ['applications', shelterClubId, options],
    queryFn: () => listApplications(shelterClubId, options),
    enabled: Boolean(shelterClubId),
    staleTime: STALE_TIME_MS,
  });
}

export function useApplication(shelterClubId, applicationId) {
  return useQuery({
    queryKey: ['application', shelterClubId, applicationId],
    queryFn: () => getApplication(shelterClubId, applicationId),
    enabled: Boolean(shelterClubId && applicationId),
    staleTime: STALE_TIME_MS,
  });
}

export function useSubmitApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => submitAdoptionApplication(input, actor),
    onSuccess: (data, vars) => {
      if (vars.input?.shelter_club_id) {
        qc.invalidateQueries({ queryKey: ['applications', vars.input.shelter_club_id] });
      }
    },
  });
}

export function useDecideApplication(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, decision, actor }) =>
      decideApplication(shelterClubId, applicationId, decision, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications', shelterClubId] });
      // Pet pode ter mudado status
      qc.invalidateQueries({ queryKey: ['pet'] });
    },
  });
}

export function useCancelApplication(shelterClubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, reason, actor }) =>
      cancelApplication(shelterClubId, applicationId, reason, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications', shelterClubId] });
    },
  });
}
