# REGENCY: Admin Partners V1 — Espaço de Parceiros

> Documento de regência técnica para a feature `ADMIN_PARTNER_SPACES_V1` + `PUBLIC_PARTNER_BANNERS_V1`. Define comportamento, contrato, decisões e operação de toda a cadeia admin + public + tracking.

---

## 1. Visão geral

O **Espaço de Parceiros** permite à equipe de plataforma gerenciar parceiros publicitários (Pet Shops, Veterinárias, Marcas, Abrigos Parceiros, Outros) que exibem banners em pontos estratégicos do app:

- **Feed** (topo e inline)
- **Home** (inline)
- **Busca** (inline)
- **Detalhes de Pet** (inline)
- **Detalhes de ONG** (inline)
- **Detalhes de Comunidade** (inline)

A feature é composta por:
- 1 painel admin completo (`/admin/parceiros` + `/admin/parceiros/:id` + `/admin/parceiros/relatorios` + `/admin/parceiros/novo`)
- 1 componente público de rotação (`AdSlotBanner`) que substitui o `AdSlot` placeholder
- 1 sistema de tracking client-side (view + click) LGPD-compliant
- 1 conjunto de regras Firestore com leitura pública e escrita restrita a `platform_admin`

---

## 2. Feature flags

| Flag | Default | Tipo | Descrição |
|------|---------|------|-----------|
| `ADMIN_PARTNER_SPACES_V1` | **ON** | admin | Liga o painel admin em `/admin/parceiros` |
| `PUBLIC_PARTNER_BANNERS_V1` | **ON** | public | Liga o componente `AdSlotBanner` (rotação + tracking) |

Ambas vêm **ON por default** desde o primeiro deploy (TASK-V3-PARTNER-1).

Migração no Firestore:
- Coleção: `platform_settings/global`
- Campo: `feature_flags.ADMIN_PARTNER_SPACES_V1` e `feature_flags.PUBLIC_PARTNER_BANNERS_V1`
- Version: `_migrations.flags = 4` (já existente)

---

## 3. Modelo de dados

### 3.1. Partner (`partners/{partnerId}`)

```js
{
  id: string,
  name: string,                  // 2-100 chars
  logoUrl: string,               // URL Storage (opcional)
  siteUrl: string,               // https:// obrigatório
  contactEmail: string,          // opcional
  contactPhone: string,          // opcional
  description: string,           // max 500 chars (opcional)
  category: 'pet_shop' | 'vet' | 'brand' | 'shelter' | 'other',
  status: 'active' | 'paused' | 'pending_review' | 'rejected',
  expiresAt: Timestamp,          // opcional
  totalViews: number,            // denormalizado
  totalClicks: number,           // denormalizado
  activatedAt: Timestamp,        // auto na 1ª ativação
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string,             // uid admin
}
```

### 3.2. Banner (`partners/{partnerId}/banners/{bannerId}`)

```js
{
  id: string,
  partnerId: string,
  alt: string,                   // obrigatório (a11y)
  linkUrl: string,               // https:// obrigatório
  imageUrl: string,              // URL Storage (desktop 1200x240)
  imageUrlMobile: string,        // URL Storage (mobile 600x200) opcional
  position: 'feed_top' | 'feed_inline' | 'home_inline' | 'search_inline'
          | 'pet_detail_inline' | 'club_detail_inline' | 'community_detail_inline',
  weight: 0..100,                // default 50
  startDate: Timestamp,          // opcional
  endDate: Timestamp,            // opcional
  maxImpressions: number,        // 0 = ilimitado
  maxClicks: number,             // 0 = ilimitado
  currentImpressions: number,    // denormalizado
  currentClicks: number,         // denormalizado
  status: 'draft' | 'active' | 'paused' | 'finished' | 'expired',
  createdAt: Timestamp,
  updatedAt: Timestamp,
  createdBy: string,
}
```

### 3.3. Analytics Event (`partners/{partnerId}/banners/{bannerId}/events/{eventId}`)

```js
{
  id: string,
  type: 'view' | 'click',
  userUid: string,               // null se anônimo
  userAgent: string,             // truncado (family only)
  referrer: string,              // document.referrer
  sessionId: string,             // sessionStorage random
  ipHash: string,                // '' (LGPD: nunca coletado client-side)
  timestamp: Timestamp,
  isBot: boolean,                // heurística UA
  position: string,              // ex: 'feed_top'
  page: string,                  // pathname atual
}
```

---

## 4. Schemas Zod

Arquivo: `src/modules/partners/schemas/partnerSchema.js`

| Schema | Uso |
|--------|-----|
| `partnerSchema` | Validação de partner input |
| `partnerDocSchema` | Validação completa do doc Firestore |
| `bannerSchema` | Validação de banner input |
| `bannerDocSchema` | Validação completa do doc banner |
| `analyticsEventSchema` | Validação de evento analytics |

Helpers:
- `parsePartnerOrThrow(input)` — throw em erro de validação
- `parseBannerOrThrow(input)` — throw em erro
- `parseAnalyticsEventOrThrow(input)` — throw em erro

---

## 5. Domain constants

Arquivo: `src/modules/partners/domain/constants.js`

### 5.1. PARTNER_STATUS

- `active` — Em exibição
- `paused` — Pausado (não aparece)
- `pending_review` — Aguardando aprovação
- `rejected` — Rejeitado (não aparece)

### 5.2. PARTNER_CATEGORIES

- `pet_shop` — Pet Shop
- `vet` — Veterinária
- `brand` — Marca
- `shelter` — Abrigo Parceiro
- `other` — Outro

### 5.3. BANNER_POSITIONS

7 posições suportadas (todas com ratio 5:1):
- `feed_top` (Topo do Feed)
- `feed_inline` (Inline no Feed)
- `home_inline` (Home)
- `search_inline` (Busca)
- `pet_detail_inline` (Detalhes do Pet)
- `club_detail_inline` (Detalhes da ONG)
- `community_detail_inline` (Detalhes da Comunidade)

### 5.4. BANNER_LIMITS

```js
{
  MIN_WEIGHT: 0,
  MAX_WEIGHT: 100,
  DEFAULT_WEIGHT: 50,
  DESKTOP_WIDTH: 1200,
  DESKTOP_HEIGHT: 240,
  MOBILE_WIDTH: 600,
  MOBILE_HEIGHT: 200,
  MAX_SIZE_BYTES: 500 * 1024,     // 500KB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ROTATION_DEBOUNCE_MS: 30 * 1000,  // 30s
  VIEW_DEBOUNCE_MS: 30 * 60 * 1000, // 30min
}
```

---

## 6. Rotation logic

Arquivo: `src/modules/partners/domain/rotation.js`

### 6.1. Hash determinístico

Usa **djb2 hash** de `sessionId + position + hour-bucket` para produzir índice estável por sessão (~1h) e que varia entre usuários.

```js
function hashString(str) { /* djb2 */ }
```

### 6.2. Pick weighted random com anti-repeat

```js
pickBanner(banners, sessionId, lastBannerId)
```

- Filtra banners inválidos (status, datas, max impressions atingido)
- Computa score por banner: `weight * random`
- Sorteia vencedor por score máximo
- **Anti-repeat**: se há alternativas, NUNCA retorna o mesmo `lastBannerId`

### 6.3. Filter valid banners

```js
filterValidBanners(banners, position, now)
```

Aplica em sequência:
1. `status === 'active'`
2. `position === requested`
3. `startDate` nulo OU `startDate <= now`
4. `endDate` nulo OU `endDate > now`
5. `maxImpressions === 0` OU `currentImpressions < maxImpressions`
6. `maxClicks === 0` OU `currentClicks < maxClicks`

### 6.4. Should rotate

```js
shouldRotate(lastRotationAt, now, debounceMs = 30000)
```

Retorna `true` se passou mais de 30s desde `lastRotationAt`.

---

## 7. Storage service

Arquivo: `src/modules/partners/services/bannerStorageService.js`

### 7.1. Path conventions

```
partner-banners/{partnerId}/{bannerId}/{slot}-{safeName}.{ext}
```

- `slot` ∈ `{desktop, mobile, logo}`
- `safeName` = `file.name` sem caracteres especiais
- `ext` = `jpg|png|webp` (mapeado do MIME)

### 7.2. Validação

- **Tamanho**: ≤ 500KB (banner), ≤ 2MB (logo)
- **Tipo**: `image/jpeg | image/png | image/webp`
- **Erro**: retorna `{ ok: false, error: 'mensagem' }` (não throw)

### 7.3. Compressão canvas

- Se arquivo > 400KB, comprime via `<canvas>` em background
- Desktop: 1200x240, quality 0.85
- Mobile: 600x200, quality 0.85
- Output: `image/webp` (sempre)

---

## 8. Páginas admin

### 8.1. AdminPartners (`/admin/parceiros`)

- **Hero dark** gradient `slate-700 → indigo-800 → violet-900`
- 4 stat cards (Total / Ativos / Views 30d / Clicks 30d)
- Busca por nome/descrição/site
- Filtros: status (chips) + categoria (select)
- Lista de cards com: logo, nome, status, categoria, CTR
- Ações: Ver / Editar / Excluir (com confirm)
- CTA: "Novo parceiro" (verde) + "Relatórios" (outline)
- Empty state rico

### 8.2. AdminPartnerDetail (`/admin/parceiros/:partnerId`)

- Breadcrumb + back button
- Header com logo + nome + badges + site link
- 4 stat mini (Banners / Views / Clicks / CTR)
- **4 tabs (URL state via useState)**:
  1. **Geral** — info completa do partner
  2. **Banners** — lista + criar/editar/pausar/excluir
  3. **Estatísticas** — stats por banner + bar chart 14 dias
  4. **Histórico** — created/updated/activated

### 8.3. AdminPartnerNew (`/admin/parceiros/novo`)

Wrapper que abre `PartnerForm` em modo modal e redireciona ao detalhe após criar.

### 8.4. AdminPartnerReports (`/admin/parceiros/relatorios`)

- Hero gradient `indigo-600 → purple-700 → pink-800`
- 4 stat cards (Views / Clicks / CTR / Ativos)
- **Top 5 — Mais visualizados** (bar chart horizontal)
- **Top 5 — Maior CTR** (lista)
- Note explicativo sobre contadores denormalizados

### 8.5. Componentes compartilhados

- `PartnerForm` (modal): nome, site, categoria, contato, status, expires, logo, descrição
- `BannerForm` (modal): alt, link, posição, peso, status, datas, max impressions/clicks, upload desktop + mobile

---

## 9. Componente público

Arquivo: `src/components/AdSlotBanner.jsx`

### 9.1. Render

```jsx
<AdSlotBanner position="feed_top" page="/feed" className="rounded-2xl" fallback={null} />
```

- Imagem responsiva (mobile: `imageUrlMobile` se existir, senão desktop com object-cover)
- Tag "Parceiro" (semitransparente)
- Botão fechar (X) que aparece no hover
- Click: `window.open(linkUrl, '_blank', 'noopener,noreferrer')` + tracking
- LGPD: sem cookies, apenas `sessionStorage` para sid e debounce

### 9.2. Fluxo de render

1. `useActiveBannersForPosition(position)` → lista de banners válidos
2. `pickBanner(banners, sessionId, lastBannerId)` → seleciona
3. `useEffect`: se `!lastBannerIdRef.current` OU `shouldRotate()` → pick
4. `setInterval(15s)`: re-checa rotation
5. `useEffect([currentBanner?.id])`: tracking view (debounce 30min por sessionId)
6. Click: tracking + open link

### 9.3. Substituição do AdSlot

O componente **não substitui automaticamente** o `AdSlot.jsx` legado. Quando o admin integrar, basta:

```jsx
// Antes:
<AdSlot slotId="feed_top" provider="adsense" />

// Depois:
import { AdSlotBanner } from '@/components/AdSlotBanner';
<AdSlotBanner position="feed_top" page="/feed" />
```

---

## 10. Tracking LGPD-compliant

### 10.1. O que é coletado

- ✅ `type` (view/click)
- ✅ `userUid` (se logado, senão null)
- ✅ `userAgent` (truncado para family + major version, ex: "Chrome 124")
- ✅ `referrer` (document.referrer)
- ✅ `sessionId` (sessionStorage random — limpa ao fechar aba)
- ✅ `timestamp`
- ✅ `isBot` (heurística UA)
- ✅ `position` (slot do banner)
- ✅ `page` (pathname atual)

### 10.2. O que NÃO é coletado

- ❌ IP (client-side nunca coleta, `ipHash=''`)
- ❌ Cookies (apenas `sessionStorage` local)
- ❌ Cross-site tracking
- ❌ Fingerprint de dispositivo

### 10.3. Debounces

- **View**: 1 evento por sessão por banner a cada 30min (sessionStorage key `partner-view-{sid}-{bannerId}`)
- **Rotation**: 1 nova escolha a cada 30s (sessionStorage key `partner-last-rotation-{position}`)

---

## 11. Firestore rules

Arquivo: `firestore.rules` (apêndice)

```javascript
match /partners/{partnerId} {
  allow read: if true;
  allow list: if true;
  allow create, update, delete: if isPlatformAdmin();

  match /banners/{bannerId} {
    allow read: if true;
    allow list: if true;
    allow create, update, delete: if isPlatformAdmin();

    match /events/{eventId} {
      allow read: if isPlatformAdmin();
      allow create: if request.resource.data.keys().hasAll(['type', 'timestamp', 'position'])
        && request.resource.data.type in ['view', 'click']
        && request.resource.data.timestamp != null;
      allow update, delete: if isPlatformAdmin();
    }
  }
}
```

**Justificativa da leitura pública**: Necessário para renderizar `AdSlotBanner` em todas as páginas (Home, Feed, Search, PetDetail, ClubDetail, CommunityDetail) sem auth, e o Firestore cobra reads igualmente. Banners são públicos por natureza (escolha de monetização).

**Tracking aberto**: events podem ser criados por qualquer client (anônimo inclusive), desde que o shape mínimo seja satisfeito. Isso evita complexidade de "primeiro save auth" antes de cada view, e respeita LGPD ao não exigir login.

---

## 12. Hooks React Query

Arquivo: `src/modules/partners/hooks/usePartners.js`

| Hook | Tipo | Query/Mutation |
|------|------|----------------|
| `usePartners(filters)` | query | `['partners', 'list', filters]` |
| `usePartner(partnerId)` | query | `['partners', 'detail', partnerId]` |
| `useCreatePartner()` | mutation | invalidate `['partners']` |
| `useUpdatePartner()` | mutation | invalidate `['partners']` + detail |
| `useDeletePartner()` | mutation | invalidate `['partners']` |
| `useBannersByPartner(partnerId)` | query | `['banners', 'partner', partnerId]` |
| `useBanner(partnerId, bannerId)` | query | `['banners', 'detail', ...]` |
| `useActiveBannersForPosition(position)` | query | `['banners', 'active', 'position', position]` |
| `useCreateBanner()` | mutation | invalidate `['banners']` + partner detail |
| `useUpdateBanner()` | mutation | invalidate `['banners']` + partner |
| `useSetBannerStatus()` | mutation | invalidate `['banners']` + partner |
| `useDeleteBanner()` | mutation | invalidate `['banners']` + partner |
| `useTrackView()` | mutation | `trackView` |
| `useTrackClick()` | mutation | `trackClick` |
| `useBannerStats(partnerId, bannerId)` | query | `['banner-stats', ...]` |
| `useBannerEvents(partnerId, bannerId, maxEvents)` | query | `['banner-events', ...]` |

Stale times:
- `usePartners`: 2min
- `useActiveBannersForPosition`: 2min
- Demais: 1min
- `useBannerStats`: 30s

---

## 13. Decisões arquiteturais (D-PARTNER-V3-*)

- **D-PARTNER-V3-STORAGE-PATH**: Banner image path SEMPRE `partner-banners/{partnerId}/{bannerId}/{slot}-{safeName}.{ext}` (organização por partner → banner → variant)
- **D-PARTNER-V3-ROTATION**: Banner rotation SEMPRE usar hash determinístico (djb2) do sessionId + timestamp bucket (~1h) — estabilidade por sessão, rotação entre users
- **D-PARTNER-V3-ROTATION-ANTIREPEAT**: Anti-repeat: nunca mostrar o mesmo banner 2x seguidas se há alternativas
- **D-PARTNER-V3-VIEW-DEBOUNCE**: Tracking de view SEMPRE com debounce 30min por sessão por banner
- **D-PARTNER-V3-TRACK-CLIENT**: Tracking client-side SEMPRE fire-and-forget (não bloqueia render)
- **D-PARTNER-V3-FLAGS-ON**: Flags SEMPRE ON por default (admin pediu ativas)
- **D-PARTNER-V3-COUNTERS-DENORM**: Partners `totalClicks/totalViews` e Banners `currentImpressions/currentClicks` SEMPRE denormalizados (evitam aggregations caras)
- **D-PARTNER-V3-CASCADE**: Delete partner SEMPRE cascade para banners (e analytics se aplicável)
- **D-PARTNER-V3-ACTIVATION**: `activatedAt` SEMPRE setado automaticamente quando status muda para `'active'` pela primeira vez
- **D-PARTNER-V3-IP-LGPD**: IP nunca coletado client-side (`ipHash=''`), UserAgent truncado (family only), sem cookies (apenas sessionStorage)
- **D-PARTNER-V3-LIMITS**: Weight 0-100, default 50, desktop 1200x240, mobile 600x200, max 500KB, jpg/png/webp, rotation debounce 30s
- **D-PARTNER-V3-BACKLINK**: V3 do AdminDashboard V3 linka "Espaço de Parceiros" na seção Conteúdo (visual: amber-100 tone)
- **D-PARTNER-V3-PUBLIC-NOAUTH**: Banners públicos não exigem auth para tracking (LGPD: anônimos OK; auth força userUid)

---

## 14. Operação

### 14.1. Deploy

- **Build**: `npm run build` (gera bundles em `dist/assets/AdminPartners-*.js`, etc)
- **PWA**: vite-plugin-pwa gera `sw-v61.js` + `workbox-*.js`
- **Padrão de merge**: Scrum-bot merge → verifica hash do bundle → 3 trigger rebuilds
- **Bundle sizes** (deploy 2026-07-20):
  - AdminPartners: 11.7KB (gzip 3.6KB)
  - AdminPartnerDetail: 27.5KB (gzip 7.4KB)
  - AdminPartnerNew: 2.6KB
  - AdminPartnerReports: 9.7KB (gzip 3.0KB)
  - PartnerForm: 8.5KB
  - usePartners: 10.8KB (gzip 4.4KB)

### 14.2. Checklist de release

- [x] Feature flags adicionadas (ON por default)
- [x] Domain constants + schemas Zod
- [x] Storage service + compression
- [x] 3 services (partners + banners + analytics)
- [x] 11 React Query hooks
- [x] Firestore rules (read público, write admin, events tracking)
- [x] 4 páginas admin (lista, detalhe, novo, relatórios)
- [x] 2 modais (PartnerForm + BannerForm)
- [x] AdSlotBanner (público) com rotação + tracking
- [x] Integração no AdminDashboard V3
- [x] Build verde + 1st push + 3 trigger rebuilds
- [x] Bundle deployed em produção (200 OK)
- [x] SCRUM atualizado (TASK-V3-PARTNER-1 + 15 filhas)
- [x] REGENCY doc (15 seções)

### 14.3. Pendências (não-bloqueantes)

- [ ] Testes vitest para `rotation.js`, `bannersService.js`
- [ ] Testes Playwright básico (criar partner + criar banner + ver rotação)
- [ ] Smoke test (`scripts/smoke-partners.mjs`)
- [ ] Integração do `AdSlotBanner` em todas as posições (HOJE só existe o componente; UI consumers como `PetFeed.v1.jsx` ainda usam `AdSlot.jsx` placeholder)
- [ ] SEO: página `/admin/parceiros` excluída de sitemap (verificar `public/sitemap.xml`)
- [ ] Audit: garantir que `ipHash` permaneça vazio no client (LGPD)
- [ ] Relatório CSV export (futuro)

---

## 15. Histórico de versões

| Versão | Data | Hash SW | Mudanças |
|--------|------|---------|----------|
| V1 | 2026-07-20 01:18 UTC | sw-v61 | Release inicial. Admin + public + tracking LGPD |

---

**Documento gerado em 2026-07-20.** Próxima revisão: após feedback de uso real do admin.
