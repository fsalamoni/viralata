/**
 * @fileoverview Hooks React Query + useState para o Dashboard do Abrigo
 * (Fase 14).
 *
 * - `useDashboard(clubId)` — usa `useSubscription` pattern (onSnapshot via
 *   `subscribeDashboard`) e mantém um DashboardData em estado. Carrega
 *   widgets customizados em paralelo para passar ao subscribeDashboard.
 * - `useDashboardWidgets(clubId)` — lista os widgets customizados (CRUD).
 * - `useCreateWidget`, `useUpdateWidget`, `useDeleteWidget` — mutações
 *   com invalidação.
 *
 * Padrão "useSubscription": para dados real-time, preferimos `onSnapshot`
 * ao `useQuery` (que faz polling/refetch). useQuery fica só para os
 * widgets customizados (CRUD sem real-time estrito).
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  subscribeDashboard,
  getDashboardWidgets,
  createWidget,
  updateWidget,
  deleteWidget,
} from '@/modules/shelter/services/dashboardService';
import { computeDashboardSummary } from '@/modules/shelter/domain/operational/dashboard';

const STALE_TIME_MS = 30_000;

/**
 * Hook principal. Retorna o estado do dashboard em tempo real.
 *
 * @param {string} clubId
 * @returns {{
 *   data: import('@/modules/shelter/domain/operational/dashboard').DashboardData,
 *   isLoading: boolean,
 *   hasError: boolean,
 *   errors: object,
 * }}
 */
export function useDashboard(clubId) {
  const [data, setData] = useState(() => computeDashboardSummary(clubId || '', {}));
  const [isLoading, setIsLoading] = useState(Boolean(clubId));

  // Carrega widgets customizados em paralelo (são estáticos na sessão)
  const widgetsQuery = useQuery({
    queryKey: ['dashboard-widgets', clubId],
    queryFn: () => getDashboardWidgets(clubId),
    enabled: Boolean(clubId),
    staleTime: STALE_TIME_MS,
  });

  useEffect(() => {
    if (!clubId) {
      setIsLoading(false);
      return undefined;
    }
    setIsLoading(true);
    const unsub = subscribeDashboard(
      clubId,
      (summary) => {
        setData(summary);
        setIsLoading(false);
      },
      { customWidgets: widgetsQuery.data || [] },
    );
    return () => {
      try { unsub(); } catch { /* noop */ }
    };
    // Re-inscreve se os widgets customizados mudarem (eles afetam o summary)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clubId, widgetsQuery.data]);

  return {
    data,
    isLoading: isLoading || widgetsQuery.isLoading,
    hasError: data?.hasError || false,
    errors: data?.errors || {},
  };
}

/**
 * Lista widgets customizados (sem real-time; refetch manual).
 */
export function useDashboardWidgets(clubId) {
  return useQuery({
    queryKey: ['dashboard-widgets', clubId],
    queryFn: () => getDashboardWidgets(clubId),
    enabled: Boolean(clubId),
    staleTime: STALE_TIME_MS,
  });
}

/**
 * Mutação: cria um widget customizado.
 */
export function useCreateWidget(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => createWidget({ ...input, shelter_club_id: clubId }, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-widgets', clubId] });
    },
  });
}

/**
 * Mutação: atualiza um widget.
 */
export function useUpdateWidget(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ widgetId, updates, actor }) => updateWidget(clubId, widgetId, updates, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-widgets', clubId] });
    },
  });
}

/**
 * Mutação: deleta um widget.
 */
export function useDeleteWidget(clubId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ widgetId, actor }) => deleteWidget(clubId, widgetId, actor),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard-widgets', clubId] });
    },
  });
}
