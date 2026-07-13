/**
 * @fileoverview Testes do Layout.
 * Verifica o modo "standalone" (Home/Login/Onboarding): renderiza
 * apenas o children, sem header/footer/nav. Para os outros casos
 * (com header autenticado), o componente depende de muitos hooks
 * do projeto (useAuth, usePlatformSettings, NotificationsMenu) e
 * o foco desses testes é apenas o bypass.
 *
 * Em produção, as páginas standalone (Home, Login, Onboarding) usam
 * <Layout currentPageName="Home" />, que cai no early-return.
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({
    user: null,
    userProfile: null,
    isAuthenticated: false,
    isPlatformAdmin: false,
    signOut: vi.fn(),
  }),
}));
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  usePlatformSettings: () => ({ settings: { ui_labels: { header_create_pet_cta: 'Cadastrar Pet', mobile_create_pet_cta: 'Cadastrar' } } }),
  useFeatureFlag: () => false,
}));
vi.mock('@/modules/notifications/components/NotificationsMenu', () => ({
  default: () => React.createElement('div', { 'data-testid': 'notifications-menu' }),
}));

import Layout from './Layout.jsx';

function renderInRouter(node) {
  return renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/'] }, node),
  );
}

describe('Layout — modo standalone (sem header/nav)', () => {
  it('Home: renderiza só children', () => {
    const html = renderInRouter(
      React.createElement(
        Layout,
        { currentPageName: 'Home' },
        React.createElement('div', { 'data-testid': 'child' }, 'landing'),
      ),
    );
    expect(html).toContain('data-testid="child"');
    expect(html).toContain('landing');
    // Não deve ter nav principal
    expect(html).not.toContain('arena-heading');
  });

  it('Login: renderiza só children', () => {
    const html = renderInRouter(
      React.createElement(
        Layout,
        { currentPageName: 'Login' },
        React.createElement('div', null, 'login-form'),
      ),
    );
    expect(html).toContain('login-form');
    expect(html).not.toContain('arena-heading');
  });

  it('OnboardingQuestionnaire: renderiza só children', () => {
    const html = renderInRouter(
      React.createElement(
        Layout,
        { currentPageName: 'OnboardingQuestionnaire' },
        React.createElement('div', null, 'questionnaire'),
      ),
    );
    expect(html).toContain('questionnaire');
    expect(html).not.toContain('arena-heading');
  });
});

describe('Layout — STANDALONE_PAGES exportadas (constante)', () => {
  // Validação indireta: se a constante STANDALONE_PAGES for alterada
  // (removendo 'Home' por exemplo), esse teste falha.
  it('"Home" continua sendo standalone', () => {
    const html = renderInRouter(
      React.createElement(
        Layout,
        { currentPageName: 'Home' },
        React.createElement('span', { 'data-testid': 'only-child' }, 'X'),
      ),
    );
    // Como o early-return só retorna children, o wrapper <Layout> é invisível
    expect(html).toBe('<span data-testid="only-child">X</span>');
  });
});
