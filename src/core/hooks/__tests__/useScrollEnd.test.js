/**
 * @fileoverview Testes do useScrollEnd hook.
 *
 * Cobre os 2 casos críticos:
 * 1. Conteúdo MENOR que container → retorna true imediatamente
 * 2. Conteúdo MAIOR → só retorna true após scroll
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollEnd } from '../useScrollEnd';

describe('useScrollEnd', () => {
  let container;

  beforeEach(() => {
    // Mock ResizeObserver (jsdom não tem)
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
  });

  it('retorna true imediatamente quando conteúdo cabe no container', () => {
    container.style.height = '500px';
    container.style.overflowY = 'auto';
    const inner = document.createElement('div');
    inner.style.height = '100px'; // menor que container
    container.appendChild(inner);
    // jsdom não calcula layout, então precisamos mockar scrollHeight/clientHeight
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 100 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 500 });

    const ref = { current: container };
    const { result } = renderHook(() => useScrollEnd(ref));
    expect(result.current).toBe(true);
  });

  it('retorna false inicialmente quando conteúdo MAIOR que container', () => {
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 200 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 0, writable: true });

    const ref = { current: container };
    const { result } = renderHook(() => useScrollEnd(ref));
    expect(result.current).toBe(false);
  });

  it('retorna true após scroll até o fim', () => {
    Object.defineProperty(container, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(container, 'clientHeight', { configurable: true, value: 200 });
    Object.defineProperty(container, 'scrollTop', { configurable: true, value: 0, writable: true });

    const ref = { current: container };
    const { result } = renderHook(() => useScrollEnd(ref));
    expect(result.current).toBe(false);

    // Simula scroll até o fim
    act(() => {
      Object.defineProperty(container, 'scrollTop', { configurable: true, value: 800 });
      container.dispatchEvent(new Event('scroll'));
    });
    expect(result.current).toBe(true);
  });
});
