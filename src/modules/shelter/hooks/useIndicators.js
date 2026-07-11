/**
 * @fileoverview Hooks para Indicadores de Vitrines + Voluntários (Fase 17).
 */

import { useQuery } from '@tanstack/react-query';
import { getIndicatorsSummary } from '@/modules/shelter/services/indicatorsService';

const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutos

/**
 * Hook principal — busca todos os indicadores.
 *
 * @param {string} clubId
 * @param {object} [options]
 * @returns {import('@tanstack/react-query').UseQueryResult}
 */
export function useIndicators(clubId, options = {}) {
  return useQuery({
    queryKey: ['shelter-indicators', clubId, options.periodType, options.referenceDate],
    queryFn: () => getIndicatorsSummary(clubId, options),
    enabled: Boolean(clubId),
    staleTime: STALE_TIME_MS,
    retry: 2,
  });
}
