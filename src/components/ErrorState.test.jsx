/**
 * @fileoverview Testes do ErrorState.
 * Verifica a mensagem default, mensagem customizada, e o botão "Tentar
 * novamente" (chamando onRetry quando clicado, e escondendo quando
 * onRetry não é fornecido).
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

import ErrorState from './ErrorState.jsx';

describe('ErrorState', () => {
  it('renderiza a mensagem default quando nenhuma prop é passada', () => {
    const html = renderToString(React.createElement(ErrorState));
    expect(html).toContain('Não foi possível carregar os dados agora');
  });

  it('renderiza mensagem customizada', () => {
    const html = renderToString(React.createElement(ErrorState, { message: 'Pets não disponíveis' }));
    expect(html).toContain('Pets não disponíveis');
  });

  it('NÃO renderiza botão de retry quando onRetry é omitido', () => {
    const html = renderToString(React.createElement(ErrorState));
    expect(html).not.toContain('Tentar novamente');
  });

  it('renderiza botão "Tentar novamente" quando onRetry é fornecido', () => {
    const onRetry = vi.fn();
    const html = renderToString(React.createElement(ErrorState, { onRetry }));
    expect(html).toContain('Tentar novamente');
  });
});
