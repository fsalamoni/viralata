import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mock do hook para controlar o estado hasUpdate de fora
let mockHasUpdate = false;
let mockUpdateFn = vi.fn();

vi.mock('@/core/pwa/useServiceWorkerUpdate', () => ({
  useServiceWorkerUpdate: () => ({
    hasUpdate: mockHasUpdate,
    update: mockUpdateFn,
  }),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  mockHasUpdate = false;
  mockUpdateFn = vi.fn();
});

async function renderBanner() {
  vi.resetModules();
  const { default: SwUpdateBanner } = await import('./SwUpdateBanner.jsx');
  return renderToStaticMarkup(React.createElement(SwUpdateBanner));
}

describe('SwUpdateBanner', () => {
  it('não renderiza nada quando não há update', async () => {
    mockHasUpdate = false;
    const html = await renderBanner();
    expect(html).toBe('');
  });

  it('renderiza banner com botão "Recarregar agora" quando há update', async () => {
    mockHasUpdate = true;
    const html = await renderBanner();
    expect(html).toContain('Nova versão disponível');
    expect(html).toContain('Recarregar agora');
    expect(html).toContain('sw-update-banner');
  });
});