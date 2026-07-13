/**
 * @fileoverview Testes do PageHero.
 * Verifica o comportamento gated pela flag PAGE_HERO_ENABLED:
 *  - Flag OFF: degrade seguro para <header> simples (sem card gradiente)
 *  - Flag ON: card arena-panel-strong com gradiente
 * Inclui também casos para `eyebrow`, `description`, `actions` e
 * `children`.
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

const useFeatureFlagMock = vi.hoisted(() => vi.fn());
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: (key) => useFeatureFlagMock(key),
}));
vi.mock('@/core/featureFlags', () => ({
  FEATURE_FLAG: { PAGE_HERO_ENABLED: 'PAGE_HERO_ENABLED' },
}));

import PageHero from './PageHero.jsx';

describe('PageHero — flag OFF (degrade seguro)', () => {
  beforeAll(() => useFeatureFlagMock.mockReturnValue(false));

  it('renderiza <header> simples, sem arena-panel-strong', () => {
    const html = renderToString(
      React.createElement(PageHero, { title: 'Meu abrigo' }),
    );
    expect(html).toContain('<header');
    expect(html).toContain('Meu abrigo');
    expect(html).not.toContain('arena-panel-strong');
  });

  it('omite eyebrow quando não fornecido', () => {
    const html = renderToString(
      React.createElement(PageHero, { title: 'T' }),
    );
    // sem o tracking-wide de eyebrow
    expect(html).not.toMatch(/tracking-\[0\.24em\]/);
  });

  it('renderiza eyebrow quando fornecido', () => {
    const html = renderToString(
      React.createElement(PageHero, { title: 'T', eyebrow: 'ONG' }),
    );
    expect(html).toContain('ONG');
  });

  it('renderiza description quando fornecido', () => {
    const html = renderToString(
      React.createElement(PageHero, { title: 'T', description: 'Plataforma de adoção' }),
    );
    expect(html).toContain('Plataforma de adoção');
  });
});

describe('PageHero — flag ON (card gradiente)', () => {
  beforeAll(() => useFeatureFlagMock.mockReturnValue(true));

  it('renderiza <section> com arena-panel-strong', () => {
    const html = renderToString(
      React.createElement(PageHero, { title: 'Página de adoção' }),
    );
    expect(html).toContain('arena-panel-strong');
    expect(html).toContain('Página de adoção');
  });

  it('renderiza children', () => {
    const html = renderToString(
      React.createElement(
        PageHero,
        { title: 'T' },
        React.createElement('span', null, 'Conteúdo extra'),
      ),
    );
    expect(html).toContain('Conteúdo extra');
  });
});
