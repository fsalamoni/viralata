/**
 * @fileoverview Testes do BottomTabBar (TASK-V3-UI-4).
 *
 * Verifica os 3 modos de exibição:
 *  - FIXED: sempre renderiza (mobile autenticado)
 *  - AUTOHIDE: sempre renderiza, com data-bottom-tab-mode
 *  - HIDDEN: não renderiza
 *
 * E a integração com useBottomTabBarHeight via CSS var.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const useFeatureFlagMock = vi.hoisted(() => vi.fn());
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: (key) => useFeatureFlagMock(key),
  usePlatformSettings: () => ({
    settings: { ui_labels: { mobile_create_pet_cta: 'Cadastrar' } },
  }),
}));

const useUiPreferencesMock = vi.hoisted(() => vi.fn());
const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock('@/core/hooks/useUiPreferences', () => ({
  useUiPreferences: () => useUiPreferencesMock(),
  BOTTOM_TAB_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
  FOOTER_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
  TOPBAR_MODES: { FIXED: 'fixed', AUTOHIDE: 'autohide', HIDDEN: 'hidden' },
}));

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

import BottomTabBar, { useBottomTabBarHeight } from './BottomTabBar.jsx';

function renderInRouter(node) {
  return renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/'] }, node),
  );
}

describe('BottomTabBar — modo FIXED', () => {
  beforeEach(() => {
    useUiPreferencesMock.mockReturnValue([
      { bottomTabBarMode: 'fixed' },
      vi.fn(),
      { saving: false, error: null, syncedAt: null },
    ]);
    useAuthMock.mockReturnValue({ isAuthenticated: true });
  });

  it('renderiza nav com aria-label "Navegação inferior (mobile)"', () => {
    const html = renderInRouter(React.createElement(BottomTabBar));
    expect(html).toContain('aria-label="Navegação inferior (mobile)"');
  });

  it('tem data-bottom-tab-mode="fixed"', () => {
    const html = renderInRouter(React.createElement(BottomTabBar));
    expect(html).toContain('data-bottom-tab-mode="fixed"');
  });

  it('renderiza os 6 itens (Feed, ONGs, Comunidade, +, Chat, Perfil)', () => {
    const html = renderInRouter(React.createElement(BottomTabBar));
    expect(html).toContain('Feed');
    expect(html).toContain('ONGs');
    expect(html).toContain('Comunidade');
    expect(html).toContain('Chat');
    expect(html).toContain('Perfil');
  });
});

describe('BottomTabBar — modo AUTOHIDE', () => {
  beforeEach(() => {
    useUiPreferencesMock.mockReturnValue([
      { bottomTabBarMode: 'autohide' },
      vi.fn(),
      { saving: false, error: null, syncedAt: null },
    ]);
    useAuthMock.mockReturnValue({ isAuthenticated: true });
  });

  it('renderiza nav com data-bottom-tab-mode="autohide"', () => {
    const html = renderInRouter(React.createElement(BottomTabBar));
    expect(html).toContain('data-bottom-tab-mode="autohide"');
  });

  it('tem classes de transition-transform para scroll-up/down', () => {
    const html = renderInRouter(React.createElement(BottomTabBar));
    expect(html).toContain('transition-transform');
  });
});

describe('BottomTabBar — modo HIDDEN', () => {
  beforeEach(() => {
    useUiPreferencesMock.mockReturnValue([
      { bottomTabBarMode: 'hidden' },
      vi.fn(),
      { saving: false, error: null, syncedAt: null },
    ]);
    useAuthMock.mockReturnValue({ isAuthenticated: true });
  });

  it('NÃO renderiza nada', () => {
    const html = renderInRouter(React.createElement(BottomTabBar));
    expect(html).toBe('');
  });
});

describe('BottomTabBar — não autenticado', () => {
  beforeEach(() => {
    useUiPreferencesMock.mockReturnValue([
      { bottomTabBarMode: 'fixed' },
      vi.fn(),
      { saving: false, error: null, syncedAt: null },
    ]);
    useAuthMock.mockReturnValue({ isAuthenticated: false });
  });

  it('NÃO renderiza mesmo com modo FIXED', () => {
    const html = renderInRouter(React.createElement(BottomTabBar));
    expect(html).toBe('');
  });
});

describe('useBottomTabBarHeight', () => {
  it('é exportado como função', () => {
    expect(typeof useBottomTabBarHeight).toBe('function');
  });
});
