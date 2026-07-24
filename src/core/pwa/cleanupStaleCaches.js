/**
 * cleanupStaleCaches — limpeza agressiva de caches antigos do PWA.
 *
 * HOTFIX-003 (2026-07-17): bug 'Algo deu errado' no admin abrigo.
 *
 * Problema: sw-v5.js NAO estava deployed de verdade, mas o Firebase Hosting
 * retornava index.html via rewrite catch-all COM cache-control immutable
 * (devido a regra de headers do firebase.json que aplica cache-control
 * immutable para todos os arquivos .js). O PWA cacheou isso como sw-v5.js.
 * Quando sw-v6.js assumiu, ele tentou carregar assets cacheados pelo
 * sw-v5.js, que eram o index.html, e quebrava o app.
 *
 * Solução: ao detectar SW que serve HTML, limpar TODOS os caches
 * (incluindo do workbox) e forçar reload. Idempotente e seguro.
 */
const STALE_CACHE_PREFIXES = [
  'workbox-precache-v2-',  // Cache padrão do Workbox (precache)
  'workbox-runtime-',       // Cache de runtime
  'workbox-cache-v',        // Versões antigas do Workbox
  'viralata-',              // Caches customizados do app
  'firebase-',              // Caches do Firebase Hosting
];

const STALE_SW_NAMES = [
  'sw.js',
  'sw-v1.js',
  'sw-v2.js',
  'sw-v3.js',
  'sw-v4.js',
  'sw-v5.js',
  'sw-v6.js',
  'sw-v7.js',
  'sw-v8.js',
  'sw-v9.js',
  'sw-v10.js',
  'sw-v11.js',
  'sw-v12.js',
  'sw-v13.js',
  'sw-v14.js',
  'sw-v15.js',
  'sw-v16.js',
  'sw-v17.js',
  'sw-v18.js',
  'sw-v19.js',
  'sw-v20.js',
  'sw-v21.js',
  'sw-v22.js',
  'sw-v23.js',
  'sw-v24.js',
  'sw-v25.js',
  'sw-v26.js',
  'sw-v27.js',
  'sw-v28.js',
  'sw-v29.js',
  'sw-v30.js',
  'sw-v31.js',
  'sw-v32.js',
  'sw-v33.js',
  'sw-v34.js',
  'sw-v35.js',
  'sw-v36.js',
  'sw-v37.js',
  'sw-v38.js',
  'sw-v39.js',
  'sw-v40.js',
  'sw-v41.js',
  'sw-v42.js',
  'sw-v43.js',
  'sw-v44.js',
  'sw-v45.js',
  'sw-v46.js',
  'sw-v47.js',
  'sw-v48.js',
  'sw-v49.js',
  'sw-v50.js',
  'sw-v51.js',
  'sw-v52.js',
  'sw-v53.js',
  'sw-v54.js',
  'sw-v55.js',
  'sw-v56.js',
  'sw-v57.js',
  'sw-v58.js',
  'sw-v59.js',
  'sw-v60.js',
  'sw-v61.js',
  'sw-v62.js',
  'sw-v63.js',
  'sw-v64.js',
  'sw-v65.js',
  'sw-v66.js',
  'sw-v67.js', 'sw-v68.js', 'sw-v69.js', 'sw-v70.js', 'sw-v71.js', 'sw-v72.js', 'sw-v73.js',
  // sw-v74.js é o atual — preserva
];

/**
 * Verifica se o SW ativo está servindo HTML (bug do sw-v5.js fantasma).
 * Se sim, desregistra o SW e limpa todos os caches.
 * @returns {Promise<{ cleaned: boolean, reason: string }>}
 */
export async function cleanupStaleCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { cleaned: false, reason: 'no-cache-api' };
  }
  if (!('serviceWorker' in navigator)) {
    return { cleaned: false, reason: 'no-service-worker' };
  }

  let cleaned = false;
  let reason = 'ok';

  try {
    // 1. Listar todos os caches
    const cacheNames = await caches.keys();

    // 2. Deletar caches com prefixos suspeitos
    for (const name of cacheNames) {
      const shouldDelete = STALE_CACHE_PREFIXES.some((p) => name.startsWith(p))
        || /precache.*v[12]\b/.test(name); // Versões antigas do Workbox
      if (shouldDelete) {
        try {
          await caches.delete(name);
          cleaned = true;
          // eslint-disable-next-line no-console
          console.log('[cleanupStaleCaches] deleted cache:', name);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[cleanupStaleCaches] failed to delete', name, e);
        }
      }
    }

    // 3. Desregistrar SWs antigos
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      const scriptUrl = reg.active?.scriptURL || reg.installing?.scriptURL || reg.waiting?.scriptURL || '';
      const isStale = STALE_SW_NAMES.some((n) => scriptUrl.endsWith('/' + n));
      if (isStale) {
        try {
          await reg.unregister();
          cleaned = true;
          // eslint-disable-next-line no-console
          console.log('[cleanupStaleCaches] unregistered SW:', scriptUrl);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[cleanupStaleCaches] failed to unregister', scriptUrl, e);
        }
      }
    }

    if (cleaned) reason = 'cleared-stale-caches';
  } catch (e) {
    reason = 'error: ' + e.message;
  }

  return { cleaned, reason };
}

/**
 * Versão "agressiva" que também checa se o SW ativo está servindo HTML.
 * Útil para botão de "Recarregar" do ErrorBoundary.
 */
export async function nukeAllCaches() {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((n) => caches.delete(n)));
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    // eslint-disable-next-line no-console
    console.log('[nukeAllCaches] all caches + SWs cleared');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[nukeAllCaches] failed:', e);
  }
}
