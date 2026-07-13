/**
 * @fileoverview Testes do AdSlot.
 * Verifica que o componente respeita a flag `ad_slots` — renderiza
 * o card placeholder de "Conteúdo patrocinado" quando ligado, e
 * não renderiza nada quando desligado (degrade seguro).
 */

import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';

const useFeatureFlagMock = vi.hoisted(() => vi.fn());
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: (key) => useFeatureFlagMock(key),
}));
vi.mock('@/core/featureFlags', () => ({
  FEATURE_FLAG: { AD_SLOTS: 'ad_slots' },
}));

import AdSlot from './AdSlot.jsx';

describe('AdSlot', () => {
  it('renderiza null quando a flag ad_slots está OFF', () => {
    useFeatureFlagMock.mockReturnValue(false);
    const html = renderToString(React.createElement(AdSlot));
    expect(html).toBe('');
  });

  it('renderiza o card de "Conteúdo patrocinado" quando flag está ON', () => {
    useFeatureFlagMock.mockReturnValue(true);
    const html = renderToString(React.createElement(AdSlot));
    expect(html).toContain('Conteúdo patrocinado');
    expect(html).toContain('parceiros do Viralata');
  });

  it('aceita className customizado sem quebrar', () => {
    useFeatureFlagMock.mockReturnValue(true);
    const html = renderToString(React.createElement(AdSlot, { className: 'mt-4 bg-red-100' }));
    expect(html).toContain('mt-4');
    expect(html).toContain('bg-red-100');
  });

  it('chama useFeatureFlag com a chave AD_SLOTS', () => {
    useFeatureFlagMock.mockReturnValue(false);
    renderToString(React.createElement(AdSlot));
    expect(useFeatureFlagMock).toHaveBeenCalledWith('ad_slots');
  });
});
