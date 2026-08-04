/**
 * Testes para useActivePersona (V4).
 *
 * @see src/core/hooks/useActivePersona.js
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useActivePersona } from './useActivePersona.js';

// Mock FirebaseAuthContext
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-uid' },
    userProfile: { profile_completed: true },
  }),
}));

// Mock personaService
vi.mock('@/core/services/personaService', async () => {
  const actual = await vi.importActual('@/core/services/personaService');
  return {
    ...actual,
    getActivePersona: vi.fn(async (uid) => ({
      key: 'adopter',
      type: 'adopter',
      scopeId: null,
    })),
    setActivePersona: vi.fn(async () => {}),
    enablePersona: vi.fn(async () => {}),
  };
});

describe('useActivePersona (V4)', () => {
  it('retorna persona default adopter inicialmente', async () => {
    const { result } = renderHook(() => useActivePersona());
    // Espera o useEffect rodar
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(result.current.active.type).toBe('adopter');
  });

  it('expõe isLoading', async () => {
    const { result } = renderHook(() => useActivePersona());
    expect(result.current.isLoading).toBeDefined();
  });

  it('expõe available (deve incluir adopter para user com profile_completed)', async () => {
    const { result } = renderHook(() => useActivePersona());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const types = result.current.available.map((p) => p.type);
    expect(types).toContain('adopter');
  });

  it('isActive retorna true se persona ativa é a do tipo', async () => {
    const { result } = renderHook(() => useActivePersona());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(result.current.isActive('adopter')).toBe(true);
    expect(result.current.isActive('donor')).toBe(false);
  });

  it('hasPersona retorna true se user tem a persona (mesmo que não ativa)', async () => {
    const { result } = renderHook(() => useActivePersona());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    expect(result.current.hasPersona('adopter')).toBe(true);
    expect(result.current.hasPersona('platform_admin')).toBe(false);
  });

  it('visibleForSwitcher NÃO inclui platform_admin para user comum', async () => {
    const { result } = renderHook(() => useActivePersona());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
    const types = result.current.visibleForSwitcher.map((p) => p.type);
    expect(types).not.toContain('platform_admin');
  });
});
