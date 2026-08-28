/**
 * @fileoverview Hooks React Query para as Operações de Vitrine (Fase 5 ·
 * SHELTER_EXHIBITION_OPS_V1). Envolvem `exhibitionOpsService` e invalidam a
 * query da vitrine (`['exhibition', clubId, exhibitionId]`) a cada mutação,
 * de modo que o painel reflita o novo `ops` sem recarregar a página.
 *
 * Exposto como um hook agregador (`useExhibitionOps`) já vinculado a uma
 * vitrine — o painel opera sempre sobre um evento por vez.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  updatePlanning,
  addChecklistItem,
  toggleChecklistItem,
  removeChecklistItem,
  addLogisticsItem,
  updateLogisticsItem,
  removeLogisticsItem,
  addHealthTask,
  updateHealthTask,
  removeHealthTask,
  addAdoptionEntry,
  updateAdoptionEntry,
  removeAdoptionEntry,
} from '@/modules/shelter/services/exhibitionOpsService';

export function useExhibitionOps(shelterClubId, exhibitionId) {
  const qc = useQueryClient();
  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ['exhibition', shelterClubId, exhibitionId] });
  };

  // Planejamento
  const mUpdatePlanning = useMutation({
    mutationFn: ({ input, actor }) => updatePlanning(shelterClubId, exhibitionId, input, actor),
    onSuccess,
  });
  const mAddChecklistItem = useMutation({
    mutationFn: ({ label, actor }) => addChecklistItem(shelterClubId, exhibitionId, label, actor),
    onSuccess,
  });
  const mToggleChecklistItem = useMutation({
    mutationFn: ({ itemId, done, actor }) => toggleChecklistItem(shelterClubId, exhibitionId, itemId, done, actor),
    onSuccess,
  });
  const mRemoveChecklistItem = useMutation({
    mutationFn: ({ itemId, actor }) => removeChecklistItem(shelterClubId, exhibitionId, itemId, actor),
    onSuccess,
  });

  // Logística
  const mAddLogisticsItem = useMutation({
    mutationFn: ({ input, actor }) => addLogisticsItem(shelterClubId, exhibitionId, input, actor),
    onSuccess,
  });
  const mUpdateLogisticsItem = useMutation({
    mutationFn: ({ itemId, patch, actor }) => updateLogisticsItem(shelterClubId, exhibitionId, itemId, patch, actor),
    onSuccess,
  });
  const mRemoveLogisticsItem = useMutation({
    mutationFn: ({ itemId, actor }) => removeLogisticsItem(shelterClubId, exhibitionId, itemId, actor),
    onSuccess,
  });

  // Mutirão de saúde
  const mAddHealthTask = useMutation({
    mutationFn: ({ input, actor }) => addHealthTask(shelterClubId, exhibitionId, input, actor),
    onSuccess,
  });
  const mUpdateHealthTask = useMutation({
    mutationFn: ({ itemId, patch, actor }) => updateHealthTask(shelterClubId, exhibitionId, itemId, patch, actor),
    onSuccess,
  });
  const mRemoveHealthTask = useMutation({
    mutationFn: ({ itemId, actor }) => removeHealthTask(shelterClubId, exhibitionId, itemId, actor),
    onSuccess,
  });

  // Fila de tratativas
  const mAddAdoptionEntry = useMutation({
    mutationFn: ({ input, actor }) => addAdoptionEntry(shelterClubId, exhibitionId, input, actor),
    onSuccess,
  });
  const mUpdateAdoptionEntry = useMutation({
    mutationFn: ({ itemId, patch, actor }) => updateAdoptionEntry(shelterClubId, exhibitionId, itemId, patch, actor),
    onSuccess,
  });
  const mRemoveAdoptionEntry = useMutation({
    mutationFn: ({ itemId, actor }) => removeAdoptionEntry(shelterClubId, exhibitionId, itemId, actor),
    onSuccess,
  });

  return {
    updatePlanning: mUpdatePlanning,
    addChecklistItem: mAddChecklistItem,
    toggleChecklistItem: mToggleChecklistItem,
    removeChecklistItem: mRemoveChecklistItem,
    addLogisticsItem: mAddLogisticsItem,
    updateLogisticsItem: mUpdateLogisticsItem,
    removeLogisticsItem: mRemoveLogisticsItem,
    addHealthTask: mAddHealthTask,
    updateHealthTask: mUpdateHealthTask,
    removeHealthTask: mRemoveHealthTask,
    addAdoptionEntry: mAddAdoptionEntry,
    updateAdoptionEntry: mUpdateAdoptionEntry,
    removeAdoptionEntry: mRemoveAdoptionEntry,
  };
}
