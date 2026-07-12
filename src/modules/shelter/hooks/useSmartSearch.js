/**
 * @fileoverview Hooks React Query para Smart Search (Fase 18).
 *
 * - `useSmartSearch(filters, options, context)` — busca multi-entity
 *   via `globalSearch`.
 * - `useSearchEntity(entity, filters, options)` — busca em uma
 *   entity via `searchEntity`.
 * - `useSearchableEntities()` — lista de entities (constante, sem
 *   request).
 * - `useCountResultsByEntity(filters, options)` — contagem por entity
 *   (para mostrar "X Animais, Y Adotantes..." na UI).
 *
 * Feature-gated por `SHELTER_SMART_SEARCH`. Desligada → todos os
 * hooks retornam estado vazio.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 18
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  searchEntity,
  globalSearch,
  countResultsByEntity,
  getSearchableEntities,
} from '@/modules/shelter/services/searchService';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';

const STALE_TIME_MS = 30_000;
const DEBOUNCE_MS_FOR_QUERY = 250;

// Fix TASK-082: o import original (`isFeatureEnabled`) não existe em
// core/featureFlags — o bug ficou latente porque o hook não tinha
// consumidores. Como todos os call sites são hooks React, usamos o
// hook oficial do FeatureFlagsContext.
function _featureEnabled() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_SMART_SEARCH);
}

// ─── Query Keys ─────────────────────────────────────────────────────────

export const searchKeys = Object.freeze({
  all: (filters) => ['shelter', 'search', filters],
  entity: (entity, filters) => ['shelter', 'search', 'entity', entity, filters],
  count: (filters) => ['shelter', 'search', 'count', filters],
});

// ─── Hooks ──────────────────────────────────────────────────────────────

/**
 * Hook principal. Busca multi-entity com base nos filtros.
 *
 * @param {object} filters filtros (searchFiltersSchema-shaped)
 * @param {object} [options] opções (searchOptionsSchema-shaped)
 * @param {object} [context] contexto opcional: { actor, audit: true }
 * @returns {{
 *   data: import('@/modules/shelter/domain/search').searchResponseSchema | null,
 *   isLoading: boolean,
 *   isFetching: boolean,
 *   hasError: boolean,
 *   error: Error | null,
 *   refetch: () => void,
 * }}
 */
export function useSmartSearch(filters = {}, options = {}, context = {}) {
  const enabled = _featureEnabled();
  const filtersKey = JSON.stringify(filters);
  const optionsKey = JSON.stringify(options);
  const contextUid = context?.actor?.uid;
  const contextAudit = context?.audit;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filtersKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableOptions = useMemo(() => options, [optionsKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableContext = useMemo(() => context, [contextUid, contextAudit]);

  const q = useQuery({
    queryKey: searchKeys.all(stableFilters),
    queryFn: () => globalSearch(stableFilters, stableOptions, stableContext),
    enabled: enabled && (Boolean(stableFilters.query) || Boolean(stableFilters.entity)
      || Boolean(stableFilters.shelterId)
      || Boolean(stableFilters.status)
      || Boolean(stableFilters.species)
      || Boolean(stableFilters.dateRange)),
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });

  return {
    data: q.data || null,
    isLoading: q.isLoading,
    isFetching: q.isFetching,
    hasError: Boolean(q.error),
    error: q.error || null,
    refetch: q.refetch,
  };
}

/**
 * Hook para buscar em uma única entity.
 *
 * @param {string} entity entity ID (de SEARCH_ENTITY_IDS)
 * @param {object} filters
 * @param {object} [options]
 * @returns {object} React Query result
 */
export function useSearchEntity(entity, filters = {}, options = {}) {
  const enabled = _featureEnabled();
  const filtersKey = JSON.stringify(filters);
  const optionsKey = JSON.stringify(options);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => ({ ...filters, entity }), [
    entity,
    filtersKey,
    optionsKey,
  ]);

  return useQuery({
    queryKey: searchKeys.entity(entity, stableFilters),
    queryFn: () => searchEntity(entity, stableFilters, options),
    enabled: enabled && Boolean(entity),
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

/**
 * Lista de entities pesquisáveis (não é uma query — é constante).
 * @returns {Array<{id: string, label: string, isPublic: boolean}>}
 */
export function useSearchableEntities() {
  return getSearchableEntities();
}

/**
 * Conta resultados por entity (sem ranking).
 * Útil para mostrar "X Animais, Y Adotantes..." antes de clicar.
 *
 * @param {object} filters
 * @param {object} [options]
 * @returns {object} React Query result
 */
export function useCountResultsByEntity(filters = {}, options = {}) {
  const enabled = _featureEnabled();
  const filtersKey = JSON.stringify(filters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableFilters = useMemo(() => filters, [filtersKey]);
  return useQuery({
    queryKey: searchKeys.count(stableFilters),
    queryFn: () => countResultsByEntity(stableFilters, options),
    enabled: enabled && (Boolean(stableFilters.query) || Boolean(stableFilters.shelterId)),
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook de conveniência: debounce para query livre. Útil para a
 * search bar com input controlado. NÃO é um React Query hook —
 * retorna value + setter + indicador de debounce.
 *
 * @param {string} initial
 * @param {number} [delayMs]
 * @returns {{ value: string, setValue: Function, isDebouncing: boolean, debouncedValue: string }}
 */
export function useDebouncedQuery(initial = '', delayMs = DEBOUNCE_MS_FOR_QUERY) {
  // Implementação em React puro para evitar libs externas.
  // Mantido aqui (não em outro arquivo) porque é específico desta
  // feature.
  const [value, setValue] = useState(initial);
  const [debounced, setDebounced] = useState(initial);
  const [isDebouncing, setIsDebouncing] = useState(false);
  useEffect(() => {
    if (value === debounced) {
      setIsDebouncing(false);
      return undefined;
    }
    setIsDebouncing(true);
    const t = setTimeout(() => {
      setDebounced(value);
      setIsDebouncing(false);
    }, delayMs);
    return () => clearTimeout(t);
  }, [value, debounced, delayMs]);
  return { value, setValue, isDebouncing, debouncedValue: debounced };
}

export { DEBOUNCE_MS_FOR_QUERY };
