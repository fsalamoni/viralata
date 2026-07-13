/**
 * @fileoverview Testes do LegalFooter.
 * Verifica o comportamento gated pela flag SHELTER_LEGAL_TERMS_V1:
 *  - Flag OFF: rotas legadas (/termos, /politica-privacidade, /legislacao)
 *  - Flag ON: rotas /legal/<slug> filtradas por PUBLIC_SLUGS
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const useFeatureFlagMock = vi.hoisted(() => vi.fn());
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: (key) => useFeatureFlagMock(key),
}));
vi.mock('@/core/featureFlags', () => ({
  FEATURE_FLAG: { SHELTER_LEGAL_TERMS_V1: 'SHELTER_LEGAL_TERMS_V1' },
}));

import LegalFooter from './LegalFooter.jsx';

function renderInRouter(node) {
  return renderToString(
    React.createElement(MemoryRouter, { initialEntries: ['/'] }, node),
  );
}

describe('LegalFooter — flag OFF (rotas legadas)', () => {
  beforeEach(() => {
    useFeatureFlagMock.mockReturnValue(false);
  });

  it('renderiza as 3 rotas legadas', () => {
    const html = renderInRouter(React.createElement(LegalFooter));
    expect(html).toContain('/termos');
    expect(html).toContain('/politica-privacidade');
    expect(html).toContain('/legislacao');
  });

  it('NÃO renderiza rotas /legal/*', () => {
    const html = renderInRouter(React.createElement(LegalFooter));
    expect(html).not.toContain('/legal/termos-de-uso');
    expect(html).not.toContain('/legal/cookies');
  });
});

describe('LegalFooter — flag ON (rotas /legal/* filtradas)', () => {
  beforeEach(() => {
    useFeatureFlagMock.mockReturnValue(true);
  });

  it('renderiza apenas as rotas públicas em /legal/*', () => {
    const html = renderInRouter(React.createElement(LegalFooter));
    expect(html).toContain('/legal/cookies');
    expect(html).toContain('/legal/termos-de-uso');
    expect(html).toContain('/legal/politica-de-privacidade');
  });

  it('contém link de Contato jurídico (mailto)', () => {
    const html = renderInRouter(React.createElement(LegalFooter));
    expect(html).toContain('mailto:legal@viralata.org');
    expect(html).toContain('Contato jurídico');
  });

  it('NÃO renderiza rotas legadas', () => {
    const html = renderInRouter(React.createElement(LegalFooter));
    expect(html).not.toContain('href="/termos"');
    expect(html).not.toContain('href="/politica-privacidade"');
  });
});

describe('LegalFooter — estrutura semântica', () => {
  beforeEach(() => {
    useFeatureFlagMock.mockReturnValue(true);
  });

  it('usa <footer> com aria-label adequado', () => {
    const html = renderInRouter(React.createElement(LegalFooter));
    expect(html).toContain('<footer');
    expect(html).toContain('aria-label="Rodapé com documentos legais"');
  });

  it('usa <nav> com aria-label adequado para os links', () => {
    const html = renderInRouter(React.createElement(LegalFooter));
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Links para documentos legais"');
  });
});
