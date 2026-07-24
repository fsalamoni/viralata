# 06-PWA-CACHE.md — Service Worker, Cache, Hotfixes

> **Atualizado em 2026-07-24** (revisão pós-varredura)

## §1. Estado Atual

- **SW atual**: `sw-v73.js` (12825 bytes, deployed 2026-07-23)
- **Bundle principal**: `index-DKT4N-aG.js` (250541 bytes)
- **Strategy**: GenerateSW (vite-plugin-pwa) + workbox
- **Precache**: 211 entries (~6.5MB)
- **skipWaiting**: true
- **clientsClaim**: true
- **Versão legacy (legacy)**: `sw.js` (não usado mais, mas mantido para debug)

## §2. Arquivos Críticos do PWA

```
src/core/pwa/
├── registerPwa.js          # ★ Entry: registra SW, cleanup, defer
├── useServiceWorkerUpdate.js  # Hook de update flow
├── cleanupStaleCaches.js   # ★ Limpa caches de SWs antigos
├── unregisterStaleSWs.js   # ★ Desregistra SWs stale (vN-1)
└── registerPwa.test.js     # 6 testes

scripts/
└── validate-lucide-imports.mjs  # Valida ícones lucide
```

```
vite.config.js   # vite-plugin-pwa config
public/
├── sw.js        # Legacy, NÃO usar
├── sw-vN.js     # ★ Gerado pelo vite-plugin-pwa (auto)
└── manifest.json
```

## §3. Pipeline de Versão

### §3.1. Quando bumpar SW

> **REGRA ABSOLUTA**: SEMPRE que mexer em UI, bumpar SW.

| Mudou UI? | Ação |
|-----------|------|
| Sim | Bump vN → vN+1 |
| Não (só backend) | Não precisa |

### §3.2. Como bumpar

```js
// 1. vite.config.js
filename: 'sw-vN.js'  →  filename: 'sw-vN+1.js'

// 2. src/core/pwa/registerPwa.js
const swUrl = `sw-vN+1.js`  →  `sw-vN+1.js`

// 3. src/core/pwa/cleanupStaleCaches.js
const STALE_SW_NAMES = [
  'sw.js',
  'sw-v1.js',
  // ...,
  'sw-vN.js',  // ★ adicionar vN aqui
];

// 4. src/core/pwa/unregisterStaleSWs.js
const STALE_VERSIONS = [
  'vN',  // ★ adicionar vN aqui
];
```

### §3.3. Validação

```bash
# 1. Build
npx vite build

# 2. Verificar que sw-vN+1.js existe em dist/
ls -la dist/sw-v*.js

# 3. Verificar que sw-vN+1 está no index.html
grep "sw-vN+1" dist/index.html

# 4. Commit + push
git add .
git commit -m "feat: bump SW vN+1"
git push origin main
```

## §4. Hotfix History (Importante!)

### §4.1. HOTFIX-001 → HOTFIX-005 (legacy, v0-v5)

Issues com SWs sem versão. Nuking agressivo (HOTFIX-005).

### §4.2. sw-v72.5 (2026-07-22) — MessageSquare

```diff
// src/modules/pets/pages/PetDetailV3.jsx
- import { MessageCircle, ... } from 'lucide-react';
+ import { MessageCircle, MessageSquare, ... } from 'lucide-react';
```

**Problema**: `MessageSquare is not defined` em produção.
**Causa**: tree-shaking + globals no Vite. Build não pegou.
**Fix**: adicionar ao import + validar com script.
**D-**: SEMPRE validar imports de ícones.

### §4.3. sw-v73.1 (2026-07-22) — Auto-unregister stale

**Problema**: Bundle deployed estava CORRETO mas user via bundle stale.
**Causa**: SW v72 cacheado, check contra URL inexistente → HTML fallback.
**Fix**: `unregisterStaleAndMaybeReload()` no `window 'load'`.
**D-**: SWs vN-1 devem ser desregistrados no boot.

### §4.4. sw-v73.2 (2026-07-22) — Unregister ALWAYS

**Problema**: sw-v73.1 não rodava quando `PWA_ENABLED=false`.
**Causa**: `if (!PWA_ENABLED) return` early-return.
**Fix**: Refatorado para rodar SEMPRE.
**D-**: Unregister deve ser SEMPRE, independente de flag.

### §4.5. sw-v73.3 (2026-07-22) — Defer Reload + canEdit

**Problema 1**: `canEdit` ReferenceError em `/pets/<id>`.
**Causa**: `canEdit` não existe em escopo (renomeado para `canEditHistory`).
**Fix**: substituir `canEdit` → `canEditHistory` em PetDetailV3.jsx:770.

**Problema 2**: Reload de 50ms interrompia user no meio de interação.
**Causa**: Auto-reload disparava sempre.
**Fix**: Track user activity via `pwa-stale-last-activity` (sessionStorage).
Se interagiu < 5s, defer 5s.
**D-**: NUNCA `window.location.reload()` se user pode estar interagindo.

## §5. Decision Log (PWA)

| ID | Decisão | Motivo |
|----|---------|--------|
| **D-PWA-STALE-UNREGISTER** | SWs vN-1 devem ser desregistrados no boot da vN | Bundle pode estar stale |
| **D-PWA-STALE-UNREGISTER-DEFER** | NUNCA reload se user interagindo (< 5s) | UX-destrutivo |
| **D-PWA-UNREGISTER-ALWAYS** | Unregister roda SEMPRE (não só com PWA_ENABLED=true) | Bug do sw-v73.1 |
| **D-PWA-BUMP-ALWAYS-UI** | SEMPRE bumpar SW ao mudar UI | Bundle pode estar stale |
| **D-PWA-SKIPWAITING-TRUE** | workbox skipWaiting=true | Auto-update |
| **D-PWA-CLIENTSCLAIM-TRUE** | workbox clientsClaim=true | Força novo SW |
| **D-PWA-PRECACHE-211** | 211 entries pre-cached (6.5MB) | Offline-first |
| **D-PWA-NUCLEAR-RESET** | HOTFIX-005: nukeAllCaches + reload | SWs legacy |
| **D-PWA-DEFER-TRACK-ACTIVITY** | Track via sessionStorage | Detecção user activity |
| **D-PWA-ACTIVITY-EVENTS** | keydown, mousedown, touchstart, pointerdown, scroll, input, change | Indicadores interação |

## §6. Como Debugar PWA

### §6.1. Verificar SW ativo

```js
// DevTools → Application → Service Workers
// Ou no console:
navigator.serviceWorker.getRegistrations().then(console.log);

// Verificar controller
navigator.serviceWorker.controller;  // SW que controla esta página
```

### §6.2. Forçar update

```js
navigator.serviceWorker.getRegistration().then(reg => reg.update());
```

### §6.3. Limpar tudo (debug)

```js
// Limpar caches
caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));

// Desregistrar todos os SWs
navigator.serviceWorker.getRegistrations().then(regs => 
  Promise.all(regs.map(r => r.unregister()))
);

// Recarregar
location.reload();
```

### §6.4. Inspecionar bundle deployed

```bash
# Verificar SW atual
curl -m 10 -s https://viralata.web.app/sw-v73.js | head -3

# Verificar bundle
curl -m 10 -s https://viralata.web.app/ | grep -oE '"/assets/index[^"]+"' | head -3

# Verificar feature específica no bundle
curl -m 10 -s https://viralata.web.app/assets/index-DKT4N-aG.js | grep -c "pwa-stale-last-activity"
```

## §7. Cenários de Falha

### §7.1. "Vejo bundle antigo"

1. **Causa provável**: SW vN-1 cacheado, bundle deployed é vN
2. **Verificar**: DevTools → Application → Service Workers (qual SW está ativo)
3. **Fix**: Hard reload (Ctrl+Shift+R) ou limpar caches

### §7.2. "Bundle está OK mas UI está bugada"

1. **Causa provável**: user via bundle vN-1, vN tem o fix
2. **Fix**: Aguardar SW update + auto-reload (até 24h, depende do browser)
3. **Fix manual**: Hard reload

### §7.3. "Reload automático está interrompendo"

1. **Causa provável**: Defer não está funcionando
2. **Verificar**: sessionStorage `pwa-stale-last-activity` está sendo setado
3. **Fix**: Verificar se events estão sendo capturados (keydown, mousedown, etc)

### §7.4. "Bundle deployed mas tem erro de import"

1. **Causa provável**: Tree shaking não pegou import dinâmico
2. **Verificar**: `node scripts/validate-lucide-imports.mjs`
3. **Fix**: Adicionar ao import explícito

## §8. Cache Strategies

| Tipo de recurso | Strategy | TTL |
|----------------|----------|-----|
| HTML | NetworkFirst | 0 |
| JS | CacheFirst (precache) | até SW update |
| CSS | CacheFirst (precache) | até SW update |
| Images | CacheFirst (precache) | 30 dias |
| Fonts | CacheFirst (precache) | 365 dias |
| API calls | NetworkOnly | 0 |

Definido em `vite.config.js` → `workbox.runtimeCaching`.

## §9. Testes PWA

### §9.1. Testes unitários (Vitest)

```js
// src/core/pwa/registerPwa.test.js
import { vi, describe, it, expect } from 'vitest';
import { unregisterStaleAndMaybeReload } from './registerPwa';

describe('unregisterStaleAndMaybeReload', () => {
  it('defers reload if user is interacting', async () => {
    sessionStorage.setItem('pwa-stale-last-activity', String(Date.now()));
    // ...
  });
});
```

### §9.2. Testes E2E (Playwright)

```js
test('PWA updates correctly', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  // ...
});
```

## §10. Métricas

- **Adoption rate**: ~85% users usam PWA (cache hit)
- **Update latency**: 24h (browser default)
- **Bundle size**: 6.5MB precache
- **Cold start**: ~1.5s (3G)
- **Warm start**: ~200ms (cache)

---

**Próxima leitura**: `07-FIRESTORE-RULES.md` (regras de segurança).
