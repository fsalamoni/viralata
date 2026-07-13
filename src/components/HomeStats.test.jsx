/**
 * @fileoverview Testes do HomeStats.
 *
 * O componente usa TanStack Query para buscar contadores (pets,
 * adopted, clubs) via getCountFromServer. Para validar a lógica
 * sem precisar de Firestore real, validamos:
 *  - Quando flag OFF, não renderiza nada
 *  - Quando flag ON mas query em erro/loading, não renderiza
 *  - Quando flag ON e data válida, renderiza os 3 contadores
 *  - Formatação pt-BR dos números (toLocaleString)
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

const useFeatureFlagMock = vi.hoisted(() => vi.fn());
const useQueryMock = vi.hoisted(() => vi.fn());

vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: (key) => useFeatureFlagMock(key),
}));
vi.mock('@/core/featureFlags', () => ({
  FEATURE_FLAG: { HOME_STATS_V1: 'home_stats_v1' },
}));
vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts) => useQueryMock(opts),
}));
vi.mock('@/core/config/firebase', () => ({
  db: { __mock: true },
}));

import HomeStats from './HomeStats.jsx';

describe('HomeStats — flag OFF', () => {
  it('não renderiza nada quando flag está desligada', () => {
    useFeatureFlagMock.mockReturnValue(false);
    useQueryMock.mockReturnValue({ data: undefined, isError: false, isLoading: false });
    const html = renderToString(React.createElement(HomeStats));
    expect(html).toBe('');
  });
});

describe('HomeStats — flag ON, estados de loading/erro', () => {
  beforeAll(() => useFeatureFlagMock.mockReturnValue(true));

  it('não renderiza durante loading', () => {
    useQueryMock.mockReturnValue({ data: undefined, isError: false, isLoading: true });
    const html = renderToString(React.createElement(HomeStats));
    expect(html).toBe('');
  });

  it('não renderiza em erro (fail-safe para não quebrar a Home)', () => {
    useQueryMock.mockReturnValue({ data: undefined, isError: true, isLoading: false });
    const html = renderToString(React.createElement(HomeStats));
    expect(html).toBe('');
  });
});

describe('HomeStats — flag ON, data válida', () => {
  beforeAll(() => useFeatureFlagMock.mockReturnValue(true));

  it('renderiza os 3 contadores com labels', () => {
    useQueryMock.mockReturnValue({
      data: { pets: 1234, adopted: 567, clubs: 89 },
      isError: false,
      isLoading: false,
    });
    const html = renderToString(React.createElement(HomeStats));
    expect(html).toContain('Pets cadastrados');
    expect(html).toContain('Adoções concretizadas');
    expect(html).toContain('Organizações ativas');
  });

  it('formata números grandes em pt-BR (separador de milhar)', () => {
    useQueryMock.mockReturnValue({
      data: { pets: 1234, adopted: 567, clubs: 89 },
      isError: false,
      isLoading: false,
    });
    const html = renderToString(React.createElement(HomeStats));
    // toLocaleString('pt-BR') → "1.234"
    expect(html).toContain('1.234');
  });

  it('renderiza 0 quando o contador é zero', () => {
    useQueryMock.mockReturnValue({
      data: { pets: 0, adopted: 0, clubs: 0 },
      isError: false,
      isLoading: false,
    });
    const html = renderToString(React.createElement(HomeStats));
    expect(html).toContain('Pets cadastrados');
    expect(html).toContain('0');
  });

  it('usa a queryKey correta no useQuery', () => {
    useFeatureFlagMock.mockReturnValue(true);
    useQueryMock.mockReturnValue({ data: null, isError: false, isLoading: true });
    renderToString(React.createElement(HomeStats));
    expect(useQueryMock).toHaveBeenCalled();
    const call = useQueryMock.mock.calls[0][0];
    expect(call.queryKey).toEqual(['home', 'stats']);
    expect(call.staleTime).toBe(5 * 60_000);
  });
});
