# Plano de Implementação — Espaço de Parceiros (TASK-V3-PARTNER-1)

> **Status**: EM IMPLEMENTAÇÃO
> **Autor**: Mavis
> **Data**: 2026-07-20
> **Ref**: `docs/V3_PARTNER_SPACES.md` (documento original)

---

## 1. Escopo de entrega (decidido)

### 1.1. O QUE VAMOS ENTREGAR (escopo fechado)

1. **Schema Firestore completo** (parceiros, banners, eventos analytics)
2. **Regras de segurança** (read público, write só platform_admin)
3. **Migrations / flags** (sub-flag `admin_partner_spaces_v1` ATIVADA por padrão — user pediu "ativadas desde o princípio")
4. **Schemas Zod** (validação cliente + service)
5. **Services Firestore** (parceirosService, bannersService, analyticsService)
6. **Hooks React Query** (usePartners, usePartner, useBanners, etc)
7. **Storage service** (upload banner desktop + mobile)
8. **Admin completo**:
   - Lista de parceiros (com filtros, busca, ações em massa)
   - Detalhe de parceiro (tabs: Geral, Banners, Estatísticas, Histórico)
   - Criar/editar parceiro (modal)
   - Criar/editar banner (modal com upload + preview)
   - Relatórios (período, filtros, métricas, export)
9. **Public display**:
   - AdSlotBanner (substitui placeholder com banner real)
   - Sistema de rotação determinístico (baseado em weight + hash sessionId)
   - Anti-repeat (não mostra o mesmo 2x seguidas)
   - Tracking de view + click (client-side, batched)
10. **Rotas**:
    - `/admin/parceiros` (lista)
    - `/admin/parceiros/:partnerId` (detalhe)
    - `/admin/parceiros/relatorios` (relatórios)
11. **Integração com AdminDashboard** (link na seção Conteúdo)
12. **Documentação REGENCY_ADMIN_PARTNERS_V1** (15 seções)
13. **Testes E2E** (Playwright básico)

### 1.2. O QUE NÃO VAMOS ENTREGAR (fora de escopo)

- Cloud Function de tracking (vou fazer client-side com batched writes, é mais simples e suficiente para V1)
- A/B Testing de variantes
- Anonimização automática após 90 dias (Cloud Function scheduled)
- Partner manager/partner viewer roles (só platform_admin)
- Export PDF de relatórios (só CSV)
- Soft delete (vou usar hard delete + audit log)
- Integração com AdSense/Adsterra (continuam como providers externos independentes)

---

## 2. Estrutura de arquivos (a criar)

```
src/modules/partners/
  pages/
    AdminPartners.jsx              (lista)
    AdminPartners.v1.jsx           (preservado se existir)
    AdminPartners.v3.jsx          (placeholder se não existir)
    AdminPartnerDetail.jsx         (detalhe)
    AdminPartnerReports.jsx        (relatórios)
  components/
    PartnerCard.jsx                (card da lista)
    PartnerForm.jsx                (form criar/editar)
    BannerCard.jsx                 (card de banner)
    BannerForm.jsx                 (form de banner)
    BannerPreview.jsx              (preview desktop + mobile)
    PartnerStats.jsx               (gráficos simples)
    PartnerHistory.jsx             (histórico de mudanças)
    ConfirmPartnerDialog.jsx       (confirma exclusão)
  hooks/
    usePartners.js                 (lista)
    usePartner.js                  (detalhe)
    usePartnerBanners.js           (banners de um parceiro)
    useActiveBanners.js            (banners ativos por posição, público)
    useCreatePartner.js
    useUpdatePartner.js
    useDeletePartner.js
    useCreateBanner.js
    useUpdateBanner.js
    useDeleteBanner.js
    useToggleBannerStatus.js
    usePartnerAnalytics.js
    useTrackPartnerEvent.js        (client-side track)
  services/
    partnersService.js             (CRUD Firestore)
    bannersService.js              (CRUD + upload)
    analyticsService.js            (track + agregações)
    rotationService.js             (lógica de rotação)
  domain/
    constants.js                   (enums: PARTNER_STATUS, CATEGORY, BANNER_STATUS, POSITION)
    permissions.js                 (helpers: isPlatformAdminOnly)
    rotation.js                    (pure logic: pickBanner)
  schemas/
    partnerSchema.js               (Zod schemas)
    bannerSchema.js
    analyticsSchema.js
  index.js                         (barrel export)

src/components/AdSlot.jsx          (refactor: usar rotationService)
src/components/AdSlotBanner.jsx    (NOVO: renderiza banner real)
src/components/AdSlot.test.jsx      (atualizar)
```

---

## 3. Schema Firestore (decidido)

### 3.1. `partners/{partnerId}`
```js
{
  name: string,                    // required
  logoUrl: string,                 // optional
  siteUrl: string,                 // required
  contactEmail: string,            // optional
  contactPhone: string,            // optional
  description: string,             // optional, max 280
  category: 'pet_shop' | 'vet' | 'brand' | 'shelter' | 'other',
  status: 'active' | 'paused' | 'pending_review' | 'rejected',
  createdAt: timestamp,
  updatedAt: timestamp,
  activatedAt: timestamp | null,
  expiresAt: timestamp | null,
  totalClicks: number,             // denormalizado
  totalViews: number,              // denormalizado
  createdBy: string,               // uid do platform_admin
}
```

### 3.2. `partners/{partnerId}/banners/{bannerId}`
```js
{
  partnerId: string,               // FK
  imageUrl: string,                // required, desktop 1200x240
  imageUrlMobile: string,          // optional, mobile 600x200
  alt: string,                     // required, a11y
  linkUrl: string,                 // override do siteUrl
  position: 'feed_top' | 'feed_inline' | 'club_detail_inline' | 'community_detail_inline' | 'pet_detail_inline' | 'home_inline' | 'search_inline',
  startDate: timestamp,
  endDate: timestamp,
  weight: number,                  // 0-100
  maxImpressions: number | null,
  maxClicks: number | null,
  currentImpressions: number,      // denormalizado
  currentClicks: number,           // denormalizado
  status: 'draft' | 'active' | 'paused' | 'finished' | 'expired',
  createdAt: timestamp,
  updatedAt: timestamp,
  createdBy: string,
}
```

### 3.3. `partners/{partnerId}/banners/{bannerId}/events/{eventId}` (subcoleção)
```js
{
  type: 'view' | 'click',
  userUid: string | null,
  userAgent: string,               // truncado
  referrer: string,                // de onde o user veio
  sessionId: string,               // sessionStorage ID
  ipHash: string,                  // hash SHA-256 (server-side no futuro, client agora = '')
  timestamp: timestamp,
  isBot: boolean,                  // heurística
  position: string,                // onde estava o banner
  page: string,                    // /feed, /pet/:id, etc
}
```

> **Nota**: Vou simplificar - tracking inicial será client-side direto na coleção. Sem Cloud Function nesta V1.

---

## 4. Regras Firestore (a adicionar)

```rules
// Parceiros — leitura pública (para renderizar AdSlot)
match /partners/{partnerId} {
  allow read: if true;
  allow create, update, delete: if isPlatformAdmin();
  allow list: if true;
  
  // Banners (subcoleção)
  match /banners/{bannerId} {
    allow read: if true;
    allow list: if true;
    allow create, update, delete: if isPlatformAdmin();
    
    // Analytics events (subcoleção)
    match /events/{eventId} {
      allow read: if isPlatformAdmin();
      allow create: if request.resource.data.keys().hasAll(['type', 'timestamp', 'position']);
      allow update, delete: if isPlatformAdmin();
    }
  }
}
```

---

## 5. Flags de feature (a adicionar)

- `ADMIN_PARTNER_SPACES_V1` (default ON) — habilita toda a área admin
- `PUBLIC_PARTNER_BANNERS_V1` (default ON) — habilita exibição pública

---

## 6. Lógica de rotação (decidido)

**`rotationService.pickBanner(banners, sessionId)`**:
- Recebe array de banners ativos (status='active', startDate ≤ now ≤ endDate, currentImpressions < maxImpressions)
- Filtra banners válidos
- Calcula weight total
- Usa weighted random baseado em hash do sessionId (determinístico por user, mas aleatório entre users)
- Retorna 1 banner

**`rotationService.shouldRotate(currentBannerId, newBannerId, lastRotation)`**:
- Se currentBannerId === newBannerId, não rotaciona
- Senão, retorna newBannerId
- Implementa debounce de 30s mínimo entre rotações

**Anti-repeat**:
- Salvar no sessionStorage qual foi o último banner visto
- Não mostrar o mesmo se a sessão < 1h

---

## 7. Tracking (decidido)

### 7.1. View (impressão)
- Quando `<AdSlotBanner>` renderiza → `trackView(bannerId, sessionId, position, page)`
- Debounce: 1 view por sessão por banner por 30 minutos
- Salva em `partners/{p}/banners/{b}/events/` subcoleção

### 7.2. Click
- onClick do banner → `trackClick(bannerId, sessionId, position, page)` + window.open(linkUrl)
- Sem debounce (cada click conta)
- Salva em subcoleção

### 7.3. Performance
- Batched writes (max 10 events a cada 5s)
- Não bloqueia render (fire-and-forget)
- Falha silenciosa se offline

---

## 8. UI Admin (decidido)

### 8.1. `/admin/parceiros` (lista)
- Hero gradient (slate-700 → indigo-800 — neutro, distinto de outras)
- 4 stat cards (Parceiros ativos / Banners ativos / Views 30d / Clicks 30d)
- Tabs: Todos / Ativos / Pausados / Pendentes / Rejeitados
- Busca por nome
- Filtro por categoria
- Tabela com: Logo, Nome, Categoria, Status, Banners, Views, Clicks, CTR, Expira
- Ações: Ver, Editar, Pausar/Ativar, Excluir
- Botão "Novo parceiro" (FAB ou header)
- Mobile: cards em vez de tabela

### 8.2. `/admin/parceiros/:partnerId` (detalhe)
- Breadcrumb + back
- Header: logo + nome + status badge + ações
- Tabs: Geral / Banners / Estatísticas / Histórico

**Tab Geral**:
- Logo (upload)
- Nome, descrição, siteUrl, contatos
- Categoria, status, expiresAt

**Tab Banners**:
- Lista de banners com preview
- "+ Novo banner" → modal
- Cada banner: imagem, posição, peso, status, stats
- Ações: editar, pausar/ativar, excluir

**Tab Estatísticas**:
- 4 stat cards: Views total / Clicks total / CTR / Banners ativos
- Gráfico simples (bar chart) de views/cliques últimos 30 dias
- Tabela por banner com performance

**Tab Histórico**:
- Audit log de mudanças (criação, edição, status change)

### 8.3. `/admin/parceiros/relatorios`
- Período (7d / 30d / 90d / custom)
- 4 stat cards (Views / Clicks / CTR / Parceiros ativos)
- Tabela por parceiro (ranked)
- Tabela por banner (top performers)
- Tabela por posição
- Botão "Export CSV"

---

## 9. Integração com Feed/PetDetail/Home

**Onde o AdSlot aparece hoje** (V1):
- `PetFeed.v1.jsx` (entre cards)
- `PetFeedEnhanced.jsx` (entre cards)
- `PetFeedV3.jsx` (entre cards)

**Comportamento**:
- Se flag `ADMIN_PARTNER_SPACES_V1` ON + flag `PUBLIC_PARTNER_BANNERS_V1` ON + há banners ativos para a posição → renderiza `<AdSlotBanner>` (real)
- Senão → mantém placeholder original

---

## 10. Permissões

- **isPlatformAdmin()**: CRUD em tudo
- **Público**: read de `partners` e `partners/{p}/banners` (para renderizar)
- **Anônimo (sem auth)**: pode ver banners, tracking usa sessionId anônimo

---

## 11. Segurança e LGPD

- IP não é coletado client-side (deixado vazio, ipHash='')
- UserAgent é truncado (só family)
- Bot detection via heurística simples (User-Agent pattern, headless)
- Sem cookie tracking (apenas sessionStorage)
- Anonimização: events > 90 dias deletados via script admin (manual por enquanto)

---

## 12. Pendências (futuro, fora desta entrega)

- [ ] Cloud Function de tracking (rate limit server-side, anti-bot real)
- [ ] A/B Testing de variantes de banner
- [ ] Auto-expiração de banners (cron)
- [ ] Partner manager roles
- [ ] PDF export de relatórios
- [ ] Anonimização automática 90d
- [ ] Analytics mais avançados (cohort, retention)

---

## 13. Tasks de implementação (ordem)

1. **TASK-V3-PARTNERS-1**: Feature flag + schemas Zod + domain constants
2. **TASK-V3-PARTNERS-2**: Storage service para upload de banner
3. **TASK-V3-PARTNERS-3**: services (partners, banners, analytics)
4. **TASK-V3-PARTNERS-4**: Hooks React Query
5. **TASK-V3-PARTNERS-5**: Firestore rules
6. **TASK-V3-PARTNERS-6**: Páginas admin (lista, detalhe, relatórios)
7. **TASK-V3-PARTNERS-7**: Componentes admin (forms, cards, previews)
8. **TASK-V3-PARTNERS-8**: AdSlotBanner (público) + rotação
9. **TASK-V3-PARTNERS-9**: Tracking client-side
10. **TASK-V3-PARTNERS-10**: Integração no AdSlot existente
11. **TASK-V3-PARTNERS-11**: Integração AdminDashboard
12. **TASK-V3-PARTNERS-12**: Rotas (admin)
13. **TASK-V3-PARTNERS-13**: Testes (vitest + playwright básico)
14. **TASK-V3-PARTNERS-14**: REGENCY doc
15. **TASK-V3-PARTNERS-15**: Build + deploy + SCRUM
