# V3 — Espaço de Parceiros (TASK-V3-PARTNER-1)

> **Documento de referência** (inscrito 2026-07-17 17:58 UTC, durante refator V3 Feed)
> **Status**: A FAZER (Fase 14 do plano V3 — Admin)
> **Flag**: `V3_PAGE_ADMIN` cobre a área admin. Sub-flags internas para o gerenciador de banners: `admin_partner_spaces_v1`.

---

## 1. Contexto

Hoje a plataforma tem um "Espaço para parceiros" que é um AdSlot placeholder (`src/components/AdSlot.jsx` com `provider: 'none'`). Aparece:
- No Feed (`/feed`) — entre os cards do "Todos os pets disponíveis"
- Em outras listas longas (ClubDetail, CommunityDetail etc)

**Limitação atual**: é só placeholder visual, sem:
- Painel admin para gerenciar banners
- Cadastro de parceiros
- Upload de imagens de banner
- Controle de tempo de rotação
- Hyperlink para site do parceiro
- Contabilização de visualizações
- Contabilização de cliques
- Relatórios de performance

---

## 2. Visão geral

### 2.1. Modelo de dados (Firestore)

```
partners/{partnerId}/
  name: string                          // "Pet Shop Amigo Fiel"
  logoUrl: string                       // Logo do parceiro
  siteUrl: string                       // https://petshop.com.br
  contactEmail: string
  contactPhone: string
  description: string                   // Até 280 chars
  category: 'pet_shop' | 'vet' | 'brand' | 'shelter' | 'other'
  status: 'active' | 'paused' | 'pending_review' | 'rejected'
  createdAt: timestamp
  updatedAt: timestamp
  activatedAt: timestamp | null
  expiresAt: timestamp | null           // Contrato temporário
  totalClicks: number                   // Contador global
  totalViews: number
  ctr: number                           // Calculado: clicks/views

partnerBanners/{bannerId}/
  partnerId: string                     // FK para partners
  imageUrl: string                      // Banner desktop (ex: 1200x240)
  imageUrlMobile: string                // Banner mobile (opcional, ex: 600x200)
  alt: string                           // Texto alternativo (a11y)
  linkUrl: string                       // Override do siteUrl do partner
  position: 'feed_inline' | 'feed_top' | 'club_detail_inline' | 'community_detail_inline' | 'pet_detail_inline' | 'home_inline' | 'search_inline'
  startDate: timestamp
  endDate: timestamp                     // Período de exibição
  weight: number (0-100)                 // Para rotação
  maxImpressions: number | null         // Limite de visualizações
  maxClicks: number | null              // Limite de cliques
  status: 'draft' | 'active' | 'paused' | 'finished' | 'expired'
  createdAt: timestamp
  updatedAt: timestamp

partnerAnalytics/{bannerId}/events/{eventId}/
  type: 'view' | 'click'
  bannerId: string
  partnerId: string
  userUid: string | null                // Anon = null
  userAgent: string
  ipHash: string                        // Hash SHA-256 do IP (LGPD-safe)
  referrer: string                      // De onde o user veio
  sessionId: string                     // Sessão (cookie)
  timestamp: timestamp
  isBot: boolean                        // Detecção heurística
```

### 2.2. Regras de exibição

**Rotação**: o AdSlot pega todos os banners ativos (`status=active`, dentro do período) e seleciona 1 por:
- Weight (probabilidade)
- Anti-repeat (não mostra o mesmo 2x seguidas para o mesmo user)
- Freshness (alternância natural)

**Tempo de rotação**: configurável por posição (default: a cada 30s na home, fixo no feed)

**A/B Testing** (futuro): variantes de banner com tracking de CTR

---

## 3. Painel admin (UI)

### 3.1. Lista de parceiros

`/admin/parceiros` — V3_PAGE_ADMIN + `admin_partner_spaces_v1`

Funcionalidades:
- Tabela com colunas: nome, categoria, status, banners ativos, cliques (7d), CTR, expira em
- Filtros: status, categoria, busca por nome
- Ações em massa: ativar, pausar, expirar
- Botão "Novo parceiro" → modal
- Export CSV (cliques, views, CTR)

### 3.2. Detalhe do parceiro

`/admin/parceiros/:partnerId`

Tabs:
- **Geral** — nome, logo, descrição, contato, categoria, status
- **Banners** — lista + criar novo (com upload)
- **Estatísticas** — gráfico de cliques/views por dia, top posições, CTR
- **Histórico** — mudanças de status, expiração, renovações

### 3.3. Criar/editar banner

Modal com:
- **Upload de imagem**: drag & drop, preview antes de salvar
  - Desktop: 1200x240px (5:1), JPG/PNG/WebP, max 500KB
  - Mobile: 600x200px (3:1), opcional (fallback para desktop)
- **Texto alternativo** (a11y)
- **Link de destino**: URL completa (com UTM params automáticos)
- **Posição**: dropdown com todas as posições disponíveis
- **Peso** (0-100): slider
- **Período**: data início + data fim (timezone Brasília)
- **Limite de impressões** (opcional)
- **Limite de cliques** (opcional)
- **Status inicial**: rascunho ou ativo

### 3.4. Relatórios

`/admin/parceiros/relatorios`

- Período customizável
- Métricas: impressões, cliques, CTR, custo por clique (se houver)
- Filtros: parceiro, banner, posição, dispositivo
- Comparação com período anterior
- Export CSV / PDF
- Gráficos: linha temporal, pizza (categorias), barra (top 10 parceiros)

---

## 4. Tracking e analytics

### 4.1. Como funciona

1. **View (impressão)**: quando AdSlot renderiza um banner → POST `/api/partner/track` com `type: 'view'`
2. **Click**: clique no banner → POST `/api/partner/track` com `type: 'click'` + redireciona para `linkUrl`
3. **Ambos são escritos** em `partnerAnalytics/{bannerId}/events/{eventId}`

### 4.2. Privacidade (LGPD)

- **IP é hasheado** com SHA-256 antes de salvar (não tem como reverter)
- **userAgent é truncado** (só family, ex: "Chrome 119", não a string completa)
- **Detecção de bot** via heurística (User-Agent, headless, timing)
- **Anonimização após 90 dias** (Cloud Function scheduled)

### 4.3. Cloud Functions

```
trackPartnerView(bannerId, sessionId)
  → Incrementa banner.views
  → Grava evento em partnerAnalytics
  → Cache no Memorystore/Memcached para rate limit

trackPartnerClick(bannerId, sessionId)
  → Valida rate limit (max 10 clicks/min por session)
  → Incrementa banner.clicks
  → Grava evento
  → Retorna redirect URL
```

---

## 5. UX do usuário (no site)

### 5.1. Como o banner aparece

- Em listas longas (Feed, ClubDetail, CommunityDetail), aparece **a cada N cards** (configurável por posição)
- Tem label "Conteúdo patrocinado" discreto no canto (transparência, LGPD art. 37)
- Border-radius consistente com cards (22px)
- Hover: leve scale (1.01) + sombra
- Click: navega para `linkUrl` em nova aba (`target="_blank" rel="noopener noreferrer"`)

### 5.2. Em mobile

- Banner ocupa largura total menos padding (mx-5)
- Proporção 3:1 (600x200)
- Mesmo comportamento de click

---

## 6. Permissões

- **platform_admin**: CRUD em tudo
- **partner_manager** (futuro): CRUD apenas nos parceiros atribuídos
- **partner_viewer** (futuro): read-only

---

## 7. Componentes a criar (V3-PARTNER-1)

| Componente | Onde | Função |
|---|---|---|
| `<PartnerCard>` | `src/components/admin/partners/PartnerCard.jsx` | Card de parceiro na lista |
| `<PartnerForm>` | `src/components/admin/partners/PartnerForm.jsx` | Form de criar/editar |
| `<BannerForm>` | `src/components/admin/partners/BannerForm.jsx` | Form de banner (com upload) |
| `<BannerPreview>` | `src/components/admin/partners/BannerPreview.jsx` | Preview desktop + mobile |
| `<PartnerAnalytics>` | `src/components/admin/partners/PartnerAnalytics.jsx` | Gráficos |
| `<PartnerReport>` | `src/components/admin/partners/PartnerReport.jsx` | Relatório |
| `<AdSlotBanner>` | `src/components/AdSlot.jsx` (refactor) | Banner real (substitui placeholder) |

---

## 8. Hooks e services

| Hook/Service | Função |
|---|---|
| `usePartners()` | Lista de parceiros |
| `usePartner(id)` | Detalhe |
| `useCreatePartner()` | Mutation criar |
| `useUpdatePartner()` | Mutation atualizar |
| `useDeletePartner()` | Mutation deletar (soft) |
| `useBanners(filters)` | Lista de banners com filtros |
| `useCreateBanner()` | Upload + criar |
| `useBannerAnalytics(id)` | Métricas |
| `partnersService` | CRUD Firestore |
| `bannersService` | CRUD + upload Storage |
| `analyticsService` | Track view/click + agregações |
| `trackPartnerEvent` (Cloud Function) | Endpoint seguro de tracking |

---

## 9. Storage

- **Bucket**: `viralata-4cf0b.appspot.com/partner-banners/`
- **Path**: `partners/{partnerId}/banners/{bannerId}/desktop.{ext}` e `.../mobile.{ext}`
- **Tamanho max**: 500KB (compress client-side antes do upload)
- **Compressão automática**: Cloud Function processa WebP se não for
- **CDN**: Firebase Hosting cache-control: public, max-age=86400

---

## 10. Firestore rules (a serem adicionadas)

```
match /partners/{partnerId} {
  allow read: if true;  // público (pra renderizar AdSlot)
  allow create, update, delete: if isPlatformAdmin();
  
  match /banners/{bannerId} {
    allow read: if true;
    allow write: if isPlatformAdmin();
  }
  
  match /analytics/{eventId} {
    allow read: if isPlatformAdmin();
    allow create: if true;  // endpoint Cloud Function valida
  }
}
```

---

## 11. Plano de execução (Fase 14 do V3)

| Task | Descrição | Estimativa |
|---|---|---|
| TASK-V3-PARTNER-1 | Schema Firestore + rules | 2h |
| TASK-V3-PARTNER-2 | Hooks + services (CRUD) | 4h |
| TASK-V3-PARTNER-3 | Cloud Function de tracking | 3h |
| TASK-V3-PARTNER-4 | Storage upload + compress | 2h |
| TASK-V3-PARTNER-5 | UI: lista de parceiros | 4h |
| TASK-V3-PARTNER-6 | UI: detalhe + edit | 4h |
| TASK-V3-PARTNER-7 | UI: criar/editar banner com upload | 4h |
| TASK-V3-PARTNER-8 | UI: analytics + relatórios | 6h |
| TASK-V3-PARTNER-9 | Substituir AdSlot placeholder pelo real | 2h |
| TASK-V3-PARTNER-10 | Testes E2E | 3h |
| **Total** | | **34h** (~ 1 semana fulltime) |

---

## 12. Quando será implementado

**NÃO agora.** Estamos na Fase 2 (Feed) do V3. Espaço de Parceiros é **Fase 14 (Admin)** do plano V3 macro.

Quando chegar a hora, vou:
1. Criar task no SCRUM (TASK-V3-PARTNER-1..10)
2. Implementar schema + rules + services
3. Cloud Function de tracking (com rate limit + anti-bot)
4. UI do admin (lista, detalhe, form, analytics, relatórios)
5. Substituir AdSlot placeholder pelo real
6. Testes + deploy + flag `admin_partner_spaces_v1` ON por padrão

**Enquanto isso**: o AdSlot continua como placeholder ("Sem anúncios" / espaço reservado).

---

## 13. Referências

- `docs/PLAN_V3_REDESIGN.md` §Fase 14 (Admin)
- `src/core/ads/providers.js` — registry atual (4 providers: none, adsense, adsterra, custom)
- `src/components/AdSlot.jsx` — componente atual
- `docs/AD_PROVIDERS.md` — doc existente do AdSlot
- TASK-024 (commit 94a6f58d) — implementação original do AdSlot real

---

**Última atualização**: 2026-07-17 17:58 UTC
**Mantido por**: Mavis
**Status**: INSCRITO (não iniciado)
