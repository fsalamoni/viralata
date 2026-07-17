/**
 * useColorMode — testes unitários (TASK-020)
 *
 * Cobre os 3 caminhos: light, dark, system.
 * Usa matchMedia mock + localStorage real (com cleanup).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useColorMode } from './useColorMode';

const STORAGE_KEY = 'viralata-color-mode';

function mockMatchMedia(prefersDark) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: prefersDark,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('useColorMode', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.classList.remove('dark');
  });

  it('inicia em "system" quando não há nada no localStorage e o sistema é claro', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe('system');
    expect(result.current.isDark).toBe(false);
  });

  it('isDark=true quando sistema é dark e mode=system', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe('system');
    expect(result.current.isDark).toBe(true);
  });

  it('lê mode "dark" do localStorage', () => {
    mockMatchMedia(false);
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('lê mode "light" do localStorage', () => {
    mockMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, 'light');
    const { result } = renderHook(() => useColorMode());
    expect(result.current.mode).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('setMode("dark") aplica classe dark e persiste no localStorage', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useColorMode());
    act(() => result.current.setMode('dark'));
    expect(result.current.mode).toBe('dark');
    expect(result.current.isDark).toBe(true);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('setMode("light") remove classe dark e persiste', () => {
    mockMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, 'dark');
    const { result } = renderHook(() => useColorMode());
    act(() => result.current.setMode('light'));
    expect(result.current.mode).toBe('light');
    expect(result.current.isDark).toBe(false);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });

  it('setMode("system") remove entrada do localStorage e segue OS', () => {
    mockMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, 'light');
    const { result } = renderHook(() => useColorMode());
    act(() => result.current.setMode('system'));
    expect(result.current.mode).toBe('system');
    expect(result.current.isDark).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(null);
  });

  it('rejeita mode inválido via setMode', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useColorMode());
    act(() => result.current.setMode('invalid'));
    expect(result.current.mode).toBe('system');
  });
});
