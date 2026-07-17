/*
 * Service worker do PWA Viralata.
 *
 * Princípios de segurança (não pode afetar nada do app/Firebase):
 *  - Só intercepta requisições GET de MESMA ORIGEM.
 *  - NUNCA toca em tráfego cross-origin (Firestore, Auth, Storage, Google APIs):
 *    para esses, não chamamos respondWith() e o navegador trata normalmente.
 *  - Navegação usa network-first (sempre conteúdo novo quando online); o cache
 *    só entra como fallback offline. Assets com hash são imutáveis (cache-first).
 *  - skipWaiting + clients.claim garantem que atualizações entram sem ficar presas.
 */
// HOTFIX-004: força invalidação TOTAL do cache. Versão v6 limpa
// viralata-v5 E qualquer cache com nome similar que tenha ficado
// preso (workbox, firebase, sw-*).
const VERSION = 'v6';
const CACHE = `viralata-${VERSION}`;
const SHELL_URL = '/index.html';

// Caches que devem ser limpos ao ativar (legacy, workbox, firebase).
const LEGACY_CACHE_PREFIXES = [
  'viralata-v',       // versões antigas (v1..v5)
  'workbox-precache',
  'workbox-runtime',
  'workbox-cache',
  'firebase-',
  'cdn-',
];

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const toDelete = keys.filter((k) => {
        if (k === CACHE) return false;
        return LEGACY_CACHE_PREFIXES.some((p) => k.startsWith(p));
      });
      await Promise.all(toDelete.map((k) => caches.delete(k)));
      await self.clients.claim();
      // Avisa clientes que o cache foi limpo (UI pode mostrar banner).
      const clients = await self.clients.matchAll({ includeUncontrolled: true });
      clients.forEach((c) => c.postMessage({ type: 'CACHE_CLEARED', version: VERSION }));
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ─── TASK-292: FCM Push Notification handler ───────────────────────────────────
// Intercepta push events do Firebase Cloud Messaging para mostrar
// notificações mesmo quando o app está em background/fechado.
// Quando o usuário clica na notificação, abre a URL do deep link.

self.addEventListener('push', (event) => {
  // Só processa pushes com payload FCM (contêm 'notification' no data)
  if (!event.data || typeof event.data.json !== 'function') {
    // Push sem dados estruturados — ignora silenciosamente
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch {
    return;
  }

  // FCM pode enviar só `data` (sem `notification`) em algumas situações;
  // se não tem notification, não mostra push notification native
  const notification = data.notification;
  if (!notification) return;

  const options = {
    body: notification.body || '',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: notification.tag || data.data?.type || 'viralata-push',
    renotify: true,
    requireInteraction: false,
    data: {
      link: data.fcmOptions?.link || data.data?.link || '/',
      ...data.data,
    },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
    // Android-specific
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(notification.title || 'Viralata', options),
  );
});

self.addEventListener('notificationclick', (event) => {
  if (event.action === 'dismiss') {
    event.notification.close();
    return;
  }

  event.notification.close();

  const link = event.notification.data?.link || '/';
  const urlToOpen = new URL(link, self.location.origin).href;

  event.waitUntil(
    (async () => {
      // Tenta focar uma janela existente do app antes de abrir nova
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // Procura uma janela já aberta com o app
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          await client.focus();
          // Navega para a URL do deep link via postMessage (a página
          // decide se usa history.pushState ou navigate)
          client.postMessage({ type: 'DEEP_LINK', url: urlToOpen });
          return;
        }
      }

      // Nenhuma janela aberta — abre nova
      const newClient = await self.clients.openWindow(urlToOpen);
      if (newClient) await newClient.focus();
    })(),
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    /\.(?:js|css|png|svg|webp|ico|woff2?|ttf|otf|webmanifest)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Só mesma origem. Tudo que é Firebase/Google/externo passa direto.
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): network-first com fallback offline para a app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(SHELL_URL, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(SHELL_URL);
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Assets estáticos (com hash são imutáveis): cache-first com atualização.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh && fresh.status === 200 && fresh.type === 'basic') {
            const cache = await caches.open(CACHE);
            cache.put(request, fresh.clone()).catch(() => {});
          }
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
  }
  // Demais GETs de mesma origem: comportamento padrão do navegador.
});
