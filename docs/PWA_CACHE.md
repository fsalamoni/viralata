# PWA Cache — Como Funciona

> ⚠️ **Lição aprendida em 2026-07-16**: PWA Service Worker é **imutável** após instalação.
> Browser cache clear NÃO remove SW. User mobile pode ficar preso em versão antiga.
> Ver `docs/CORE_DIRECTIVES.md` §9.2 (D-CACHE-01, D-CACHE-02).

---

## Visão Geral

O PWA da Viralata usa `vite-plugin-pwa` com **Workbox** (`generateSW`).

```
vite build → sw-v6.js gerado + registerSW.js
```

O Service Worker intercepta todas as requisições e serve assets do cache quando disponíveis.

---

## Arquivos-Chave

| Arquivo | Função |
|---------|--------|
| `vite.config.js` | Configuração do plugin (sw filename, estratégia de cache) |
| `public/sw-v6.js` | Service Worker gerado (asset manifest + cache) |
| `public/registerSW.js` | Script de registro do SW no browser |

---

## Estrutura de Cache

### Assets Estáticos
Após build, todos os assets (`.js`, `.css`, `.woff2`, imagens) recebem:
```
cache-control: public, max-age=31536000, immutable
```
Isso significa: **cache para sempre**. O browser NUNCA refaz GET desses assets.

### HTML
```
cache-control: max-age=3600
```
Pode ser revalidado. Mas o SW intercepta antes.

---

## Como o SW se Atualiza

O `vite-plugin-pwa` com `generateSW` gera um **asset manifest** listing todos os arquivos buildados com seus hashes. Quando qualquer arquivo muda (hash diferente), o SW detecta nova versão.

```
build novo:  sw-v6.js + bundle-abc123.js + index.html
build antigo: sw-v5.js + bundle-xyz789.js + index.html (em cache diferente)
```

### Ciclo de Vida com `skipWaiting: true` + `clientsClaim: true`

1. SW novo detecta que assets mudaram.
2. `skipWaiting: true` → SW novo ativa **imediatamente**, sem esperar.
3. `clientsClaim: true` → SW novo assume controle de todos os tabs abertos.
4. Usuário vê a versão nova na próxima interação.

---

## Quando Bump o SW Filename

**Regra: sempre que UI/layout/routing/feature flags mudam, bump o filename.**

### Critérios para Bump (`filename: 'sw-vN.js'`)

| Mudança | Bump? |
|---------|--------|
| `OrganizationAdminPanel.jsx` | ✅ Sempre |
| `CommunityAdminPanel.jsx` | ✅ Sempre |
| `ClubDetail.jsx` (layout/nav) | ✅ Sempre |
| `featureFlags.js` (DEFAULT) | ✅ Sempre |
| Rotas/links/navegação | ✅ Sempre |
| Novos componentes críticos | ✅ Sempre |
| `.env` (variáveis de build) | ✅ Sempre |
| CSS-only (sem impacto funcional) | ❌ Não precisa |
| Bugs em componentes não-críticos | ❌ Pode esperar |

### Como Fazer Bump

```js
// vite.config.js linha 25
filename: 'sw-v6.js',  // → mudar para sw-v7.js
```

```js
// public/registerSW.js — manter consistente
navigator.serviceWorker.register('/sw-v6.js')  // → mudar para /sw-v7.js
```

**Se o `filename` no vite.config.js e o path no `registerSW.js` divergirem**, o SW antigo continua servindo e o app nunca atualiza.

---

## O Problema Mobile (PWA Instalado)

### Sintoma
User com PWA instalado no celular. Deploy novo feito. User não vê mudanças mesmo após "limpar cache".

### Por que Acontece

```
PWA instalado = SW registrado e ativo permanentemente
├── SW serve do Cache Storage API (onde assets estão cached permanentemente)
└── Browser HTTP cache (Ctrl+Shift+R) é irrelevante
```

O SW é um **agente separado** que intercepta requests ANTES do browser. Limpar cache do browser limpa o cache HTTP, mas o SW continua no controle e serve do seu próprio Cache Storage.

### Soluções para o User

| Solução | Dificuldade | Resultado |
|---------|------------|-----------|
| Desinstalar PWA + reinstall | Médio | 100% reset |
| Settings → Apps → Chrome → Clear site data | Fácil | Reseta SW cache |
| Modo anônimo (PWA não instala em anônimo) | Fácil | Sempre funciona |
| Aguardar ~24h (SW expira por max-age) | Nenhuma | Não confiável |

### Como Desinstalar PWA (Android)
1. Long-press no ícone do app.
2. Selecione "Desinstalar" ou "Remover".
3. Acesse o site novamente → PWA reinstalado com versão nova.

---

## Testando Mudanças de UI

Para verificar se suas mudanças aparecem:

1. **Desktop**: Ctrl+Shift+R (hard refresh) ou abrir em janela anônima.
2. **Mobile Desktop DevTools**: conectar celular → DevTools → Application → Service Workers → "Skip Waiting".
3. **Mobile PWA**: desinstalar e reinstallar, ou Clear site data.

---

## Estratégia de Cache do Workbox

```js
// vite.config.js — workbox
runtimeCaching: [
  {
    urlPattern: /^https:\/\/fonts\.googleapis\.com/,
    handler: 'StaleWhileRevalidate',
    options: { cacheName: 'google-fonts-stylesheets' }
  },
  {
    urlPattern: /^https:\/\/fonts\.gstatic\.com/,
    handler: 'CacheFirst',
    options: {
      cacheName: 'google-fonts-webfonts',
      expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
    }
  },
  {
    urlPattern: /\/_expo\/static\/segment/,
    handler: 'CacheFirst',
    options: { cacheName: 'expo-segment-cache' }
  }
]
```

---

## Checklist Antes de Deploy de UI

- [ ] Bumpou `filename` em `vite.config.js` (ex: `sw-v6.js` → `sw-v7.js`)
- [ ] Atualizou `public/registerSW.js` com o novo path
- [ ] Rodou `npm run build` e ficou verde
- [ ] Testou em Desktop com hard refresh
- [ ] Comunicou equipe mobile para limpar/reinstall PWA se mudanças críticas
