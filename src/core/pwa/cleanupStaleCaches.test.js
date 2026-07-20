/**
 * cleanupStaleCaches — testes (HOTFIX-003)
 *
 * Cobre: cleanup identifica caches suspeitos, unregister de SWs antigos,
 * é seguro quando APIs não existem.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

function makeCacheStorage(initialCaches = []) {
  const store = new Map();
  for (const c of initialCaches) store.set(c, { name: c });
  return {
    keys: vi.fn(async () => [...store.keys()]),
    delete: vi.fn(async (n) => store.delete(n)),
    _store: store,
  };
}

function makeReg(scriptUrl) {
  return {
    unregister: vi.fn(async () => true),
    active: scriptUrl ? { scriptURL: scriptUrl } : null,
  };
}

describe('cleanupStaleCaches', () => {
  let origCaches;
  let origSW;

  beforeEach(async () => {
    vi.resetModules();
    origCaches = globalThis.caches;
    origSW = globalThis.navigator?.serviceWorker;
  });

  afterEach(() => {
    if (origCaches === undefined) {
      delete globalThis.caches;
    } else {
      globalThis.caches = origCaches;
    }
    if (origSW) {
      Object.defineProperty(globalThis.navigator, 'serviceWorker', {
        value: origSW,
        writable: true,
        configurable: true,
      });
    }
  });

  it('retorna no-cache-api se caches API não existe', async () => {
    delete globalThis.caches;
    Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true, configurable: true });
    const { cleanupStaleCaches } = await import('./cleanupStaleCaches');
    const r = await cleanupStaleCaches();
    expect(r.cleaned).toBe(false);
    expect(r.reason).toBe('no-cache-api');
  });

  it('retorna no-service-worker se não há SW API', async () => {
    const caches = makeCacheStorage([]);
    globalThis.caches = caches;
    Object.defineProperty(globalThis, 'navigator', { value: {}, writable: true, configurable: true });
    const { cleanupStaleCaches } = await import('./cleanupStaleCaches');
    const r = await cleanupStaleCaches();
    expect(r.cleaned).toBe(false);
    expect(r.reason).toBe('no-service-worker');
  });

  it('deleta caches com prefixos suspeitos e preserva os outros', async () => {
    const caches = makeCacheStorage([
      'workbox-precache-v2-https://viralata.web.app',
      'workbox-runtime-v1',
      'viralata-cust-1',
      'firebase-cache-1',
      'google-fonts',
    ]);
    globalThis.caches = caches;
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { getRegistrations: vi.fn(async () => []) },
      writable: true,
      configurable: true,
    });
    const { cleanupStaleCaches } = await import('./cleanupStaleCaches');
    const r = await cleanupStaleCaches();
    expect(r.cleaned).toBe(true);
    expect(caches.delete).toHaveBeenCalledWith('workbox-precache-v2-https://viralata.web.app');
    expect(caches.delete).toHaveBeenCalledWith('workbox-runtime-v1');
    expect(caches.delete).toHaveBeenCalledWith('viralata-cust-1');
    expect(caches.delete).toHaveBeenCalledWith('firebase-cache-1');
    expect(caches.delete).not.toHaveBeenCalledWith('google-fonts');
  });

  it('unregister SWs antigos (sw.js até sw-v63.js), preserva sw-v64.js', async () => {
    // Atualizado para v64 (2026-07-20) — preserva apenas sw-v64 (atual).
    const caches = makeCacheStorage([]);
    globalThis.caches = caches;
    const regs = [
      makeReg('https://viralata.web.app/sw-v5.js'),
      makeReg('https://viralata.web.app/sw.js'),
      makeReg('https://viralata.web.app/sw-v63.js'),
      makeReg('https://viralata.web.app/sw-v64.js'),
    ];
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { getRegistrations: async () => regs },
      writable: true,
      configurable: true,
    });
    const { cleanupStaleCaches } = await import('./cleanupStaleCaches');
    const r = await cleanupStaleCaches();
    expect(r.cleaned).toBe(true);
    expect(regs[0].unregister).toHaveBeenCalled();
    expect(regs[1].unregister).toHaveBeenCalled();
    expect(regs[2].unregister).toHaveBeenCalled(); // v63 também é stale
    expect(regs[3].unregister).not.toHaveBeenCalled(); // v64 preservado
  });

  it('lida com scriptURL undefined (active null)', async () => {
    const caches = makeCacheStorage([]);
    globalThis.caches = caches;
    const regs = [
      { unregister: vi.fn(), active: null },
      { unregister: vi.fn(), installing: { scriptURL: 'https://example.com/sw-v3.js' } },
    ];
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { getRegistrations: async () => regs },
      writable: true,
      configurable: true,
    });
    const { cleanupStaleCaches } = await import('./cleanupStaleCaches');
    await cleanupStaleCaches();
    expect(regs[1].unregister).toHaveBeenCalled();
  });

  it('nukeAllCaches limpa TUDO', async () => {
    const caches = makeCacheStorage(['a', 'b', 'c']);
    globalThis.caches = caches;
    const regs = [{ unregister: vi.fn() }];
    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      value: { getRegistrations: async () => regs },
      writable: true,
      configurable: true,
    });
    const { nukeAllCaches } = await import('./cleanupStaleCaches');
    await nukeAllCaches();
    expect(caches.delete).toHaveBeenCalledTimes(3);
    expect(regs[0].unregister).toHaveBeenCalled();
  });
});
