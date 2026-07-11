/**
 * @fileoverview Hooks para Relatórios do Abrigo (Fase 16).
 *
 * - `useReports(clubId, options)` — busca todos os relatórios de uma vez
 *   (useQuery com staleTime longo, já que dados são históricos).
 * - `useReport(clubId, reportType, options)` — busca um relatório específico
 *   (mesmo queryFn, filtro por type no client).
 *
 * Padrão: useQuery com staleTime=5min (dados históricos não mudam em tempo real;
 * relatório é uma foto do momento do fetch). Refetch manual ou via refetch().
 */

import { useQuery } from '@tanstack/react-query';
import { getReportsSummary } from '@/modules/shelter/services/reportsService';

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Hook principal — busca todos os relatórios do abrigo.
 *
 * @param {string} clubId
 * @param {object} [options]
 * @param {'month'|'quarter'|'year'|'all'} [options.periodType]
 * @param {string} [options.referenceDate]
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useReports(clubId, options = {}) {
  return useQuery({
    queryKey: ['shelter-reports', clubId, options.periodType, options.referenceDate],
    queryFn: () => getReportsSummary(clubId, options),
    enabled: Boolean(clubId),
    staleTime: STALE_TIME_MS,
    retry: 2,
  });
}
