# 23-PWA-TROUBLESHOOTING.md — PWA Troubleshooting Detalhado

> **Atualizado em 2026-07-24**
>
> Guia avançado para debugar problemas de PWA, Service Worker, e
> cache. Complementa `06-PWA-CACHE.md` e `14-TROUBLESHOOTING.md`.

## §1. Anatomia do PWA

```
┌─────────────────────────────────────────────────┐
│                BROWSER                          │
├─────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌───────────────────────┐    │
│  │  Service     │  │  Cache Storage         │    │
│  │  Worker      │  │  (workbox)             │    │
│  │  sw-vN.js    │  │  - App shell          │    │
│  │              │  │  - Assets              │    │
│  └─────────────┘  └───────────────────────┘    │
│  ┌──────────────────────────────────────┐       │
│  │  IndexedDB (Firebase offline cache) │       │
│  └──────────────────────────────────────┘       │
│  ┌──────────────────────────────────────┐       │
│  │  localStorage / sessionStorage       │       │
│  │  - pwa-stale-last-activity           │       │
│  │  - hotfix-005-reload                 │       │
│  └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

## §2. Comandos de Inspeção

### §2.1. Ver SWs ativos

```js
// No console do browser
navigator.serviceWorker.getRegistrations().then(console.log);

// Saída esperada:
// ServiceWorkerRegistration { active: {...}, installing: null, waiting: null, scope: '/' }
```

### §2.2. Ver cache

```js
// No console
caches.keys().then(console.log);

// Saída esperada:
// ['workbox-precache-v2-...', 'workbox-runtime-...']
```

### §2.3. Forçar update

```js
navigator.serviceWorker.getRegistration().then(reg => reg.update());
```

### §2.4. Ver controller

```js
navigator.serviceWorker.controller;
// Saída: ServiceWorker { scriptURL: 'https://viralata.web.app/sw-v74.js' }
```

### §2.5. Ver última atividade (stale detection)

```js
sessionStorage.getItem('pwa-stale-last-activity');
// 1753382400000 (timestamp ms)
```

## §3. Cenários de Falha

### §3.1. Cenário A: "Vejo bundle antigo"

**Sintoma**: feature está deployada mas user não vê.

**Diagnóstico**:
```bash
# 1. Bundle deployed está correto?
curl -m 10 -s https://viralata.web.app/ | grep -oE '"/assets/index[^"]+"' | head -1
# Esperado: /assets/index-DXTVSWph.js (ou mais novo)

# 2. SW deployed está correto?
curl -m 10 -s https://viralata.web.app/sw-v74.js | head -3

# 3. Feature está no bundle?
curl -m 10 -s https://viralata.web.app/assets/index-DXTVSWph.js | grep "feature-name"
# Esperado: 1+ ocorrências

# 4. SW no browser é o mesmo?
# DevTools → Application → Service Workers
```

**Causas comuns**:
1. SW vN-1 ainda ativo (não foi desregistrado)
2. Cache do browser tem bundle antigo
3. Feature só está em chunk lazy-loaded que não foi baixado

**Fixes**:
```bash
# 1. Hard reload
Ctrl+Shift+R (ou Cmd+Shift+R)

# 2. Limpar tudo
# DevTools → Application → Storage → Clear site data

# 3. Aguardar 24h (browser auto-update)
```

### §3.2. Cenário B: "Reload interrompe user"

**Sintoma**: user clica em botão, página recarrega, perde contexto.

**Causa**: `window.location.reload()` durante interação.

**Diagnóstico**:
```js
// 1. Verificar se track activity está rodando
sessionStorage.getItem('pwa-stale-last-activity');
// Se null → track não está sendo feito

// 2. Verificar se defer está funcionando
// Console: window.addEventListener('beforeunload', () => console.log('reload!'))
// Clicar em botão → ver se reload dispara
```

**Fix**: já implementado em sw-v73.3 (D-PWA-STALE-UNREGISTER-DEFER).

Ver `06-PWA-CACHE.md` §3 para implementação.

### §3.3. Cenário C: "Ícone missing em produção"

**Sintoma**: `X is not defined` em prod mas não em dev.

**Causa**: tree shaking + globals no Vite. Build não pegou.

**Diagnóstico**:
```bash
node scripts/validate-lucide-imports.mjs
```

**Fix**: adicionar ícone ao import.

**Exemplo real**: `MessageSquare` (sw-v72.5).

### §3.4. Cenário D: "Página em branco"

**Sintoma**: user reporta página em branco.

**Causas**:
1. Erro de import (build OK, runtime fail)
2. ErrorBoundary triggered
3. Route guard bloqueando
4. Service Worker servindo HTML ao invés de asset

**Diagnóstico**:
```js
// 1. Console do browser
window.addEventListener('error', (e) => console.error(e));
window.addEventListener('unhandledrejection', (e) => console.error(e));

// 2. Network tab
// Ver qual asset retornou 404

// 3. SW (se ativo)
// Ver se sw está servindo HTML
```

### §3.5. Cenário E: "Cache explode (muiito grande)"

**Sintoma**: `caches.keys()` retorna muitos caches.

**Causa**: SWs antigos não foram desregistrados (precache acumula).

**Diagnóstico**:
```js
caches.keys().then(keys => {
  console.log(`Total caches: ${keys.length}`);
  keys.forEach(k => console.log(`  ${k}`));
});
// Se > 10 → problema
```

**Fix**: já implementado em sw-v73.1/73.2 (D-PWA-STALE-UNREGISTER).

### §3.6. Cenário F: "Update banner não aparece"

**Sintoma**: user clica em "Verificar updates" mas banner não aparece.

**Causa**: `controllerchange` event não está sendo capturado.

**Diagnóstico**:
```js
// Verificar se SwUpdateBanner está montado
// DevTools → Elements → procurar por SwUpdateBanner
```

**Fix**: ver `useServiceWorkerUpdate.js`.

### §3.7. Cenário G: "Offline não funciona"

**Sintoma**: user sem internet, app não carrega.

**Causa**: SW não está servindo cache, ou cache está vazio.

**Diagnóstico**:
```js
// 1. Verificar SW está ativo
navigator.serviceWorker.controller

// 2. Verificar cache tem app shell
caches.open('workbox-precache-v2-...').then(cache => 
  cache.keys().then(keys => console.log(keys.length))
);
// Esperado: 200+ (precache)
```

**Fix**: SW registra? `navigator.serviceWorker.getRegistration().then(reg => console.log(reg))`

## §4. Catastrophic Reset (Nuclear Option)

Se nada funcionar, forçar reset completo:

### §4.1. Manual (user)

```js
// Console do browser
(async () => {
  // 1. Limpar caches
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
  console.log(`Deleted ${keys.length} caches`);
  
  // 2. Desregistrar SWs
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(r => r.unregister()));
  console.log(`Unregistered ${regs.length} SWs`);
  
  // 3. Limpar localStorage
  localStorage.clear();
  sessionStorage.clear();
  console.log('Cleared storage');
  
  // 4. Recarregar
  location.reload();
})();
```

### §4.2. Programático (código)

```js
// src/core/pwa/catastrophicReset.js
export async function catastrophicReset() {
  // 1. Limpar caches
  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map(k => caches.delete(k)));
  
  // 2. Desregistrar SWs
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(r => r.unregister()));
  
  // 3. Limpar storage
  localStorage.clear();
  sessionStorage.clear();
  
  // 4. Recarregar
  location.reload();
}
```

### §4.3. Quando usar

- User está com bug persistente
- Bundle está corrompido
- SW está com bug que impede update
- Após deploy de fix crítico (se muitos users afetados)

## §5. DevTools Avançado

### §5.1. Limpar tudo

```js
// DevTools → Application → Storage → Clear site data
// (botão grande)
```

### §5.2. Ver manifest

```js
// DevTools → Application → Manifest
// Verificar name, icons, theme_color, start_url
```

### §5.3. Lighthouse PWA audit

```js
// DevTools → Lighthouse → Progressive Web App
// Verificar:
- Installable
- PWA Optimized
- Service worker registered
- Manifest valid
```

### §5.4. Network throttling

```
DevTools → Network → Throttling:
- Slow 3G
- Custom: 1 Mbps down / 500 Kbps up
- Latency: 2000 ms
```

Testar:
- First load (cold)
- Reload (warm)
- Offline (offline)

## §6. Logs e Monitoring

### §6.1. Console logs

```js
// Adicionar logger customizado
import { logger } from '@/core/observability/logger';
logger.info('pwa_event', { event: 'sw_registered', version: 'v74' });
```

### §6.2. Cloud Logging (Functions)

```js
// functions/index.js
exports.pwaEvent = functions.https.onCall((data, context) => {
  console.log('pwa_event', data);
  // ...
});
```

### §6.3. Sentry (recomendado para prod)

```js
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: 'https://...',
  tracesSampleRate: 0.1,
});

Sentry.captureMessage('pwa_sw_registered', { level: 'info', extra: { version: 'v74' } });
```

## §7. Quando Pedir Ajuda

1. Capturar:
   - URL exata
   - Browser + versão
   - OS + versão
   - Console logs
   - Network tab (status 200/404/etc)
   - Application tab (SW status, cache size)
   - Lighthouse audit

2. Reportar com template:
   ```md
   ## Bug PWA
   - URL: https://viralata.web.app/feed
   - Browser: Chrome 120.0 / Firefox 121.0 / Safari 17
   - OS: macOS 14 / Windows 11 / iOS 17
   - SW ativo: sw-v74
   - Bundle: index-DXTVSWph.js
   - Console: [logs]
   - Network: [status codes]
   ```

## §8. Prevenção

- ✅ Sempre bump SW ao mudar UI
- ✅ Sempre validar imports lucide
- ✅ Sempre runtime test para componentes críticos
- ✅ Sempre defer reload se user interagindo
- ✅ Sempre cleanup stale SWs
- ✅ Sempre testar offline (DevTools → Network → Offline)

---

**Próxima leitura**: `06-PWA-CACHE.md` (overview), `14-TROUBLESHOOTING.md` (geral)
