import { describe, it, expect, vi, afterEach } from 'vitest';
import { PWA_ENABLED, registerPwa } from './registerPwa';

describe('PWA gating (zero impacto quando desligado)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('vem desligado por padrão (sem VITE_PWA_ENABLED)', () => {
    expect(PWA_ENABLED).toBe(false);
  });

  it('com a flag off, desregistra qualquer SW e nunca registra', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const register = vi.fn();
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations, register } });
    vi.stubGlobal('window', { addEventListener: vi.fn() });

    registerPwa();
    await Promise.resolve();
    await Promise.resolve();

    expect(register).not.toHaveBeenCalled();
    expect(getRegistrations).toHaveBeenCalled();
    expect(unregister).toHaveBeenCalled();
  });

  it('não quebra quando o navegador não suporta service worker', () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('window', {});
    expect(() => registerPwa()).not.toThrow();
  });

  // D-PWA-STALE-UNREGISTER (sw-v73.1): Mesmo com a flag off, qualquer
  // SW stale (não-sw-v73) deve ser desregistrado.
  it('com a flag off, desregistra SW stale (scriptURL !== sw-v73.js)', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([
      { active: { scriptURL: 'https://viralata.web.app/sw-v72.js' }, unregister },
    ]);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations, register: vi.fn() } });
    vi.stubGlobal('window', { addEventListener: vi.fn() });

    registerPwa();
    await Promise.resolve();
    await Promise.resolve();

    expect(unregister).toHaveBeenCalled();
  });

  it('com a flag off, NÃO desregistra o SW atual (sw-v73.js)', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([
      { active: { scriptURL: 'https://viralata.web.app/sw-v73.js' }, unregister },
    ]);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations, register: vi.fn() } });
    vi.stubGlobal('window', { addEventListener: vi.fn() });

    registerPwa();
    await Promise.resolve();
    await Promise.resolve();

    expect(unregister).not.toHaveBeenCalled();
  });
});
