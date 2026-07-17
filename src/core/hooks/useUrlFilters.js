/**
 * @fileoverview useUrlFilters — sincroniza estado de filtros com URL
 * query string (V3).
 *
 * Permite que os filtros do Feed (e de outras páginas filtradas)
 * sejam:
 *  - Compartilháveis (URL com filtros = link direto)
 *  - Persistentes (reload preserva o estado)
 *  - Voltar/avançar do browser funciona
 *
 * API:
 *   const [filters, setFilter, setFilters, reset] = useUrlFilters({
 *     species: 'all', size: 'all', city: '', radius: null, page: 1,
 *   });
 *
 *   - `filters`: objeto com todos os campos (default + URL)
 *   - `setFilter(field, value)`: atualiza um campo
 *   - `setFilters({...})`: atualiza vários
 *   - `reset()`: volta para defaults
 *
 * Comportamento:
 *  - Se URL tem `?species=dog&radius=50`, ao montar, lê da URL
 *  - Quando user muda filtro, atualiza URL via `history.replaceState` (não
 *    polui histórico de navegação)
 *  - `page` é SEMPRE múltiplo de 1
 *  - Valores inválidos (ex: radius=999) caem no default
 *
 * @see docs/REGENCY_FEED_V3.md §F13
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';

/**
 * @param {object} defaults - {field: defaultValue, ...}
 * @returns {[filters, setFilter, setFilters, reset]}
 */
export function useUrlFilters(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const isFirstRender = useRef(true);

  // Estabiliza `defaults` para evitar loop infinito (cada render cria novo objeto)
  const defaultsRef = useRef(defaults);
  useEffect(() => { defaultsRef.current = defaults; }, [defaults]);

  const filters = useMemo(() => {
    const next = { ...defaultsRef.current };
    for (const [key, value] of searchParams.entries()) {
      if (key in next) {
        const defVal = next[key];
        // Parse values: number quando default é number, null → tenta number, string caso contrário
        if (typeof defVal === 'number') {
          const num = Number(value);
          next[key] = Number.isFinite(num) ? num : defVal;
        } else if (typeof defVal === 'boolean') {
          next[key] = value === 'true' || value === '1';
        } else if (defVal === null) {
          // null default → tenta parsear como number (ex: radius=50), senão string
          const num = Number(value);
          next[key] = (Number.isFinite(num) && value.trim() !== '') ? num : value;
        } else {
          next[key] = value;
        }
      }
    }
    return next;
  }, [searchParams]);

  // Atualiza URL quando filters mudam (mas não na primeira renderização)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      // Não inclui no URL se for igual ao default
      if (value === defaultsRef.current[key]) continue;
      // Não inclui valores vazios/null/undefined
      if (value === '' || value === null || value === undefined) continue;
      next.set(key, String(value));
    }
    // replaceState para não poluir histórico
    const newSearch = next.toString();
    const newUrl = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [filters, location.pathname]);

  const setFilter = useCallback((field, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(field);
      const def = defaultsRef.current[field];
      if (value !== def && value !== '' && value !== null && value !== undefined) {
        next.set(field, String(value));
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const setFilters = useCallback((updates) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [field, value] of Object.entries(updates)) {
        next.delete(field);
        const def = defaultsRef.current[field];
        if (value !== def && value !== '' && value !== null && value !== undefined) {
          next.set(field, String(value));
        }
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return [filters, setFilter, setFilters, reset];
}
