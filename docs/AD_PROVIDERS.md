# AD Providers — TASK-024

Guia para configurar o `AdSlot` com redes de anúncios reais.

## Visão Geral

O componente `AdSlot` é controlado por:
1. **Feature flag** `ad_slots` (master switch, default OFF).
2. **Provider** em `platform_settings/global.adProvider`.
3. **Config específica** em `platform_settings/global.adConfig`.

Se o provider configurado não tem config válida, o `AdSlot` mostra um placeholder visual (UX consistente: usuário sabe que ali vai anúncio, mas sem monetização).

## Providers Suportados

| ID          | Descrição                     | Config necessária                                | Aprovação |
|-------------|-------------------------------|--------------------------------------------------|-----------|
| `none`      | Sem anúncios (placeholder)    | nenhuma                                          | N/A       |
| `adsense`   | Google AdSense                | `adsenseClientId`, `adsenseSlotId`               | Sim       |
| `adsterra`  | Adsterra                      | `adsterraKey`                                    | Não       |
| `custom`    | HTML customizado              | `customHtml` (string)                            | Depende   |

## Configuração Padrão (default = `none`)

```js
// src/core/ads/providers.js
export const DEFAULT_PROVIDER = 'none';
```

Sem configuração no Firestore, todos os `AdSlot` mostram placeholder.

## Setup: Google AdSense

1. **Crie conta** em https://www.google.com/adsense
2. **Adicione o site** e aguarde aprovação (1-2 semanas)
3. **Crie unidade de anúncio** tipo "Display ads", anote `data-ad-slot` (ex: `9876543210`)
4. **Anote seu** `data-ad-client` (ex: `ca-pub-1234567890123456`)
5. **Configure o Firestore**:
   ```
   platform_settings/global
     adProvider: "adsense"
     adConfig: {
       adsenseClientId: "ca-pub-1234567890123456",
       adsenseSlotId: "9876543210",
       adsenseFormat: "auto",          // opcional, default 'auto'
       adsenseResponsive: true          // opcional, default true
     }
   ```
6. **Adicione o script do AdSense no `index.html`** (antes do `</head>`):
   ```html
   <script
     async
     src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"
     crossorigin="anonymous"
   ></script>
   ```
7. **Ative a flag** `ad_slots = true` no painel de feature flags
8. **Aguarde** a propagação (Cloudflare + cache do browser, ~1-5min)

## Setup: Adsterra

1. **Crie conta** em https://www.adsterra.com
2. **Crie uma "Direct Link"** ou use o "Banner 728×90"
3. **Anote a key** do script (ex: `abc123def456`)
4. **Configure o Firestore**:
   ```
   platform_settings/global
     adProvider: "adsterra"
     adConfig: {
       adsterraKey: "abc123def456",
       adsterraWidth: 728,        // opcional
       adsterraHeight: 90          // opcional
     }
   ```
5. **Ative a flag** `ad_slots = true`

O Adsterra injeta o script dinamicamente (não precisa editar `index.html`).

## Setup: HTML Customizado

1. **Prepare o HTML** do anúncio (ex: banner de um parceiro local)
2. **Configure o Firestore**:
   ```
   platform_settings/global
     adProvider: "custom"
     adConfig: {
       customHtml: "<div>...</div>"
     }
   ```
3. **Ative a flag** `ad_slots = true`

> ⚠️ **CUIDADO**: o HTML é injetado como `innerHTML`. Não use para scripts
> de redes não auditadas. Restrinja a role `platform_admin` para editar
> `adConfig` (ver `firestore.rules`).

## Segurança

`platform_settings/global` é:
- **read**: público (qualquer visitante)
- **write**: apenas `platform_admin`

A função de injeção de script (`render()`) é isolada no módulo `providers.js`. Não exponha `provider.render()` diretamente para user input.

## Performance

- **Cumulus Ads / Media.net / Taboola**: NÃO suportados. Adicione sob demanda.
- **Lazy loading**: AdSense tem `loading="lazy"` automático; para Adsterra, considere wrapper com IntersectionObserver (TODO).
- **SSR**: o `AdSlot` usa `useEffect`, então não quebra SSR. Render inicial = vazio, depois hidrata.

## Migração / Rollback

Para voltar a `none` (sem anúncios), basta:

```
platform_settings/global
  adProvider: "none"
```

E desativar a flag `ad_slots`. Sem deploy necessário.

## Customização de slot

```jsx
<AdSlot
  slotId="home-hero"           // ID único deste slot
  label="Patrocinado"          // texto do placeholder
  sub="Conheça nossos parceiros"
  minHeight={120}              // previne layout shift
/>
```

Cada `slotId` deve ser único por página para não conflitar com a mesma
unidade de anúncio do AdSense (que pode ter frequência limitada).
