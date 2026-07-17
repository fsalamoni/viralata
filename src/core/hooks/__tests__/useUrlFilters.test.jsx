/**
 * @fileoverview Testes do useUrlFilters (V3).
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useUrlFilters } from '@/core/hooks/useUrlFilters';

function makeWrapper(initialEntries) {
  return function Wrapper({ children }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe('useUrlFilters', () => {
  it('lê filtros da URL na primeira renderização', () => {
    const { result } = renderHook(
      () => useUrlFilters({ species: 'all', size: 'all', radius: null }),
      { wrapper: makeWrapper(['/?species=dog&radius=50']) },
    );
    expect(result.current[0].species).toBe('dog');
    expect(result.current[0].radius).toBe(50);
    expect(result.current[0].size).toBe('all');
  });

  it('retorna defaults quando URL não tem os campos', () => {
    const { result } = renderHook(
      () => useUrlFilters({ species: 'all', size: 'all', radius: null }),
      { wrapper: makeWrapper(['/']) },
    );
    expect(result.current[0].species).toBe('all');
    expect(result.current[0].radius).toBe(null);
  });

  it('parsing correto: number e string', () => {
    const { result } = renderHook(
      () => useUrlFilters({ radius: null, page: 1 }),
      { wrapper: makeWrapper(['/?radius=50&page=3']) },
    );
    expect(typeof result.current[0].radius).toBe('number');
    expect(typeof result.current[0].page).toBe('number');
    expect(result.current[0].radius).toBe(50);
    expect(result.current[0].page).toBe(3);
  });
});
