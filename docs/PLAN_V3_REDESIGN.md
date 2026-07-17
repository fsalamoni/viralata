# Plano V3 — Redesign Completo do Layout (página por página)

> **Status**: DRAFT (vou refinar com suas respostas)
> **Data**: 2026-07-17 13:50 UTC
> **Solicitante**: Flávio Salomone
> **Executor**: Mavis
> **Flag por página**: `V3_PAGES_<KEY>`, default OFF, com migração no Firestore

---

## 1. Contexto

Os loops de 2026-07-16/17 (madrugada e noite) fizeram:
- ✅ HOTFIX-001 (migração de feature flags v3)
- ✅ HOTFIX-002/003/004/005 (PWA cache + sw-v6/v7/v8)
- ✅ HOTFIX-006 (react-query downgrade)
- ✅ TASK-020 (dark mode completo)
- ✅ TASK-021/022/024 (CMS, LLM parser, AdSlot real)
- ✅ FULL_AUDIT 107 tasks (auditoria estrutural, **não redesign**)
- ✅ TASK-813 (ChevronRight faltando)

**O que NÃO foi feito** (causa raiz da frustração atual):
- ❌ Harmonização de cores verde-água (emerald) com terracota (primary)
- ❌ Refactor de páginas com layout 2-coluna (CommunityDetail)
- ❌ Refactor de Profile com tabs estranhas
- ❌ Refactor de FosterCtaCard vs VolunteerCtaCard (cores diferentes)
- ❌ Refactor de SwipeDeck do Feed (cores hard-coded fora do DS)
- ❌ Padronização de EmptyState, Skeleton, Loading em todas as páginas
- ❌ Migração de animações inline → motion wrappers DS_V2

A auditoria DS_V2 marcou D.3-D.6 como "audit only" (DONE sem mudança). Mas a auditoria errou: as páginas **não** estavam alinhadas.

---

## 1.1 Sistema de configurações do usuário (TASK-401)

Já existe `useUiPreferences` com persistência em `users/{uid}.ui_preferences` + localStorage fallback. Suporta:

| Pref | Valores | Default | Onde é usado |
|---|---|---|---|
| `footerMode` | `fixed`/`autohide`/`hidden` | `fixed` | `LegalFooter.jsx` |
| `bottomTabBarMode` | `fixed`/`autohide`/`hidden` | `fixed` | `Layout.jsx` (mobile) |
| `compactMode` | boolean | `false` | TBD (nenhum uso atual) |
| `reduceMotion` | boolean | `false` | TBD (nenhum uso atual) |

**V3 adiciona (TASK-V3-UI-1)**: `topBarMode` (barra superior desktop), seguindo o mesmo padrão dos outros. Default `fixed` (sempre visível). Aplica em `Layout.jsx` `<header>`.

**V3 também adiciona (TASK-V3-UI-2)**: `feedCardsPerPage` (paginação configurável do "Todos os pets"). Valores: `[4, 8, 12, 20, 40, 100]`. Default `12`. Múltiplos de 4 (4 colunas desktop). Persistido no mesmo `ui_preferences`.

**V3 também adiciona (TASK-V3-UI-3)**: `feedGridColumns` (auto/3/4/5). Default `auto` (responsivo). Persistido no mesmo `ui_preferences`.

UI: novo card "Barra superior (desktop)" no `AppearanceSettings.jsx` + "Cards por página" + "Colunas do grid" no card Aparência.

## 1.2 Diretriz ETERNA: Documento de Regência

Toda página V3 deve ter um documento de regência em `docs/REGENCY_<PAGE>.md` com:
- Identidade (rota, nome, quem pode acessar)
- Estrutura visual (sections + ordem)
- Funcionalidades (lista exausta, com referência ao código)
- Componentes (lista de cada componente usado + caminho do arquivo)
- Hooks e services (mesma coisa)
- Textos (todos os textos visíveis, com referência à origem)
- Estados (loading, empty, error, success)
- Acessibilidade (aria, keyboard, prefers-reduced-motion)
- Testes (E2E + unit)
- Histórico de mudanças

Template em `docs/PAGE_REGENCY_TEMPLATE.md`.

---

### Públicas (anon-friendly)
| # | Rota | Componente | Status atual | V3 flag |
|---|------|-----------|--------------|---------|
| 1 | `/` | Home | Header laranja + cards | V3_PAGE_HOME |
| 2 | `/feed` | PetFeed | SwipeDeck + Grid (cores hard-coded) | V3_PAGE_FEED |
| 3 | `/login` | Login | Card central | V3_PAGE_LOGIN |
| 4 | `/onboarding` | OnboardingQuestionnaire | - | V3_PAGE_ONBOARDING |
| 5 | `/politica-privacidade` | PrivacyPolicy | TASK-021 (CMS) | V3_PAGE_LEGAL |
| 6 | `/termos` | Terms | TASK-021 | V3_PAGE_LEGAL |
| 7 | `/legislacao` | Legislation | TASK-021 | V3_PAGE_LEGAL |
| 8 | `/legal/:slug/*` | LegalPageViewer | - | V3_PAGE_LEGAL |
| 9 | `/busca` | SearchPage | - | V3_PAGE_SEARCH |
| 10 | `/vitrines` | PublicExhibitions | - | V3_PAGE_EXHIBITIONS |
| 11 | `/vitrines/:id` | PublicExhibitionDetail | - | V3_PAGE_EXHIBITIONS |
| 12 | `/eventos` | EventsUnified | - | V3_PAGE_EVENTS |
| 13 | `/lares-temporarios` | PublicFosterPrograms | - | V3_PAGE_FOSTER |
| 14 | `/lares-temporarios/:uid/historico` | PublicFosterHistory | - | V3_PAGE_FOSTER |
| 15 | `/mural` | PublicMuralFeed | - | V3_PAGE_MURAL |
| 16 | `/comunidade` | CommunitiesDirectory | - | V3_PAGE_COMMUNITIES |
| 17 | `/comunidades/:slug` | CommunityDetail | 2 colunas, layout misto | V3_PAGE_COMMUNITY_DETAIL |
| 18 | `/comunidades/:slug/forum` | CommunityForumPublic | - | V3_PAGE_COMMUNITY_FORUM |
| 19 | `/organizacoes` | OrganizationsDirectory | - | V3_PAGE_ORGS |
| 20 | `/organizacoes/hub` | OrganizationsHub | - | V3_PAGE_ORGS |
| 21 | `/organizacoes/:orgId` | ClubDetail (OrganizationDetail) | FosterCtaCard verde + VolunteerCtaCard laranja | V3_PAGE_CLUB_DETAIL |
| 22 | `/abrigos/:shelterId` | ShelterPublic | - | V3_PAGE_SHELTER_PUBLIC |
| 23 | `/comunidade/:communityId/eventos/:eventId` | CommunityEventDetail | - | V3_PAGE_EVENT_DETAIL |

### Autenticadas (precisam login)
| # | Rota | Componente | Status atual | V3 flag |
|---|------|-----------|--------------|---------|
| 24 | `/pet/:petId` | PublicPet | - | V3_PAGE_PET_DETAIL |
| 25 | `/pets/:petId` | PetDetail | DS_V2_PAGES-PETS | V3_PAGE_PET_DETAIL |
| 26 | `/pets/new` | CreatePet | - | V3_PAGE_PET_FORM |
| 27 | `/pets/:petId/edit` | CreatePet (edit) | - | V3_PAGE_PET_FORM |
| 28 | `/meus-pets` | MyPets | - | V3_PAGE_MY_PETS |
| 29 | `/meus-interesses` | MyInterests | - | V3_PAGE_MY_INTERESTS |
| 30 | `/radar` | Radar | - | V3_PAGE_RADAR |
| 31 | `/perfil` | AdopterDashboard | Tabs estranhas, layout quebrado | V3_PAGE_PROFILE |
| 32 | `/perfil/voluntario` | VolunteerProfile | - | V3_PAGE_VOLUNTEER_PROFILE |
| 33 | `/perfil/contratos` | ContractsPage | - | V3_PAGE_CONTRACTS |
| 34 | `/quero-adotar/:petId` | AdoptionWizard | - | V3_PAGE_ADOPTION_WIZARD |
| 35 | `/adocoes/:clubId/:applicationId` | AdoptionDetail | - | V3_PAGE_ADOPTION_DETAIL |
| 36 | `/adoptions` | PostAdoptionDashboard | - | V3_PAGE_POST_ADOPTION |
| 37 | `/chat` | ChatPage | - | V3_PAGE_CHAT |
| 38 | `/chat/:conversationId` | ChatPage (conv) | - | V3_PAGE_CHAT |
| 39 | `/comunidade/criar` | CreateCommunity | - | V3_PAGE_COMMUNITY_CREATE |
| 40 | `/comunidade/:communityId` | CommunityDetail (auth) | mesma página que pública | V3_PAGE_COMMUNITY_DETAIL |
| 41 | `/comunidade/:communityId/admin` | CommunityAdminPanel | - | V3_PAGE_COMMUNITY_ADMIN |
| 42 | `/organizacoes/criar` | CreateOrganization | - | V3_PAGE_ORG_CREATE |
| 43 | `/organizacoes/:orgId/admin` | OrganizationAdminPanel | - | V3_PAGE_ORG_ADMIN |
| 44 | `/abrigos/:shelterId/contracts` | ShelterContracts | - | V3_PAGE_SHELTER_CONTRACTS |
| 45 | `/abrigos/:shelterId/interviews` | ShelterInterviewsList | - | V3_PAGE_SHELTER_INTERVIEWS |
| 46 | `/abrigos/:clubId/admin/dashboard` | ShelterAdminDashboard | - | V3_PAGE_SHELTER_ADMIN |
| 47 | `/abrigo/:clubId/onboarding` | ShelterOnboardingWizard | - | V3_PAGE_SHELTER_ONBOARDING |
| 48 | `/lares-temporarios/dashboard` | FosterDashboard | - | V3_PAGE_FOSTER_DASHBOARD |
| 49 | `/denuncias/nova` | CreateReport | - | V3_PAGE_REPORT_CREATE |
| 50 | `/voluntarios` | VolunteerProgram | - | V3_PAGE_VOLUNTEER_LANDING |
| 51 | `/voluntarios/seja` | VolunteerSignup | - | V3_PAGE_VOLUNTEER_SIGNUP |
| 52 | `/voluntarios/termo` | VolunteerTermPreview | - | V3_PAGE_VOLUNTEER_TERM |

### Admin (precisam ser platform_admin)
| # | Rota | Componente | Status atual | V3 flag |
|---|------|-----------|--------------|---------|
| 53 | `/admin` | AdminDashboard | - | V3_PAGE_ADMIN_DASHBOARD |
| 54 | `/admin/pets` | AdminPets | - | V3_PAGE_ADMIN_PETS |
| 55 | `/admin/usuarios` | AdminUsers | - | V3_PAGE_ADMIN_USERS |
| 56 | `/admin/organizacoes` | AdminOrganizations | - | V3_PAGE_ADMIN_ORGS |
| 57 | `/admin/comunidades` | AdminCommunities | - | V3_PAGE_ADMIN_COMMUNITIES |
| 58 | `/admin/metricas` | AdminMetrics | - | V3_PAGE_ADMIN_METRICS |
| 59 | `/admin/auditoria` | AdminAuditLog | - | V3_PAGE_ADMIN_AUDIT |
| 60 | `/admin/notificacoes` | AdminNotifications | - | V3_PAGE_ADMIN_NOTIFICATIONS |
| 61 | `/admin/configuracoes` | AdminPlatformSettings | - | V3_PAGE_ADMIN_SETTINGS |
| 62 | `/admin/flags` | AdminFlags | - | V3_PAGE_ADMIN_FLAGS |
| 63 | `/admin/saude` | PlatformHealth | - | V3_PAGE_ADMIN_HEALTH |
| 64 | `/admin/security-alerts` | SecurityAlerts | - | V3_PAGE_ADMIN_SECURITY |
| 65 | `/admin/alertas` | AlertConfigs | - | V3_PAGE_ADMIN_ALERTS |
| 66 | `/admin/admins` | AdminUserManagement | - | V3_PAGE_ADMIN_ADMINS |
| 67 | `/admin/mock-data` | AdminMockData | - | V3_PAGE_ADMIN_MOCK |
| 68 | `/admin/denuncias` | AdminReports | - | V3_PAGE_ADMIN_REPORTS |

**Total**: 68 rotas/páginas.

---

## 3. Padrão V3 (canônico)

Toda página V3 deve seguir:

### Estrutura
```
<PageHero eyebrow="..." title="..." description="..." />
<Breadcrumb /> (se aplicável)
<FilterChips /> (se aplicável)
<MainContent>
  <Skeleton /> durante loading
  <EmptyState /> quando vazio
  <ErrorState /> quando erro
</MainContent>
<AdSlot /> (opcional, em listas longas)
```

### Componentes DS
- `PageHero` (eyebrow + título + description)
- `Button` (7 variantes oficiais)
- `Card` (4 variantes: default, feature, testimonial, pet)
- `Input`, `Textarea`
- `Dialog` (max-width 480, raio 24, shadow "Painel flutuante")
- `Table` (arena-table-wrap)
- `Avatar` (5 sizes, gradiente fallback)
- `Icon` (Material Symbols, 5 sizes)
- `Badge` (6 variants)
- `Switch`, `Toast`, `Tabs`
- `EmptyState` (componente compartilhado)
- `Skeleton` (componente compartilhado)
- `ErrorState` (componente compartilhado)
- `Motion wrappers` (FadeIn, Stagger, HoverLift)

### Cores permitidas
- `primary` (terracota)
- `primary-foreground`
- `secondary` (areia)
- `accent` (oliva)
- `highlight` (mostarda)
- `success`
- `destructive`
- `background`, `background-alt`
- `foreground`, `muted-foreground`
- `border`

### PROIBIÇÕES
- ❌ `emerald-*`, `green-*`, `teal-*` (verde-água que polui o DS)
- ❌ Cores hard-coded (`hsl(...)`, `#hex`, `rgb(...)`)
- ❌ `font-['Sora']` hard-coded (deve ser CSS var)
- ❌ Animações inline (transition, animate-pulse) — usar motion wrappers
- ❌ Flex-wrap com 5+ items em TabsList (usar arena-admin-tabs)
- ❌ Cards sem arena-section-card
- ❌ Páginas sem PageHero (exceto full-bleed)
- ❌ Loading com `bg-secondary animate-pulse` (usar Skeleton)
- ❌ Empty state com texto inline (usar EmptyState)
- ❌ Padding/max-width ad-hoc (usar arena-page mx-auto max-w-6xl px-5)

---

## 4. Feed V3 — Especificação

### Layout proposto
```
┌────────────────────────────────────────────────────────┐
│ PageHero: "Encontre seu novo melhor amigo"            │
├────────────────────────────────────────────────────────┤
│ FilterChipsRow: [Espécies] [Portes] [Idades] [Sexo]  │
│ [+ toggle "Mostrar meus pets"]                        │
│ [Cidade input + chips de raio: 10/25/50/100/Sem limite]│
├────────────────────────────────────────────────────────┤
│ ╔═══ SwipeDeck (cartas tinder) ════════════════════╗ │
│ ║  [Foto do pet, full card, 360x460]               ║ │
│ ║  Nome, idade, cidade                             ║ │
│ ║  Tags temperament                                 ║ │
│ ║                                                  ║ │
│ ║  [X]  [♥]   ← ações                              ║ │
│ ╚═══════════════════════════════════════════════════╝ │
│                                                        │
│ H2: "Todos os pets disponíveis" [Ordenar: recentes/   │
│                                   próximos/prioridade]│
│                                                        │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                          │
│ │card│ │card│ │card│ │card│                          │
│ └────┘ └────┘ └────┘ └────┘                          │
│ ... (AdSlot a cada 8 cards)                          │
│ [Carregar mais] (ou infinite scroll)                  │
└────────────────────────────────────────────────────────┘
```

### Diferenças vs V1
| Aspecto | V1 | V3 |
|---|---|---|
| SwipeDeck cores | hard-coded `hsl(150,55%,55%)` (verde) | `success` ou `highlight` |
| Botão curtir | `bg-primary` gradient | mesmo |
| Botão X | `hsl(9,62%,46%)` | `destructive` |
| Sora font | `font-['Sora']` hard-coded | CSS var |
| Filtros sincronizados URL | ❌ | ✅ |
| Filtro idade/sexo | ❌ | ✅ |
| Ordenação | implícito por priority | dropdown visível |
| Loading | `bg-secondary animate-pulse` | `<Skeleton variant="pet-card" />` |
| Empty state | texto inline | `<EmptyState icon="pets" />` |
| Animações swipe | inline | hook useSwipeGesture + motion |
| Acessibilidade | parcial | aria-label em todos os botões, alternativa por teclado |
| Dark mode | parcial | propagação completa via tokens |
| Reduzir motion | ❌ | respeita `useReducedMotionSafe` |
| Haptic feedback | ❌ | navigator.vibrate (mobile) |
| Microinteração filtros | ❌ | scale + shadow ao ativar |

### Novos filtros (V3)
- **Espécie**: dog/cat/rabbit/bird (já tinha)
- **Porte**: mini/small/medium/large/giant (já tinha)
- **Idade**: filhote/adulto/idoso (NOVO)
- **Sexo**: macho/fêmea (NOVO)
- **Castrado**: toggle (NOVO)
- **Vacinado**: toggle (NOVO)
- **Cidade** (já tinha)
- **Raio**: 5/10/25/50/100/sem limite (já tinha, com ajuste)

### Ordenação (V3)
- Mais recentes
- Mais próximos (se tem cidade)
- Prioridade do abrigo

### V3 vs Enhanced (atual)
- `PetFeedEnhanced` será **deprecado** (V3 absorve suas melhorias)
- `PetFeed.v1` será **removido** após V3 validado
- `PetFeed.jsx` (wrapper) será reescrito para V3

---

## 5. Plano de execução (ordem proposta)

| Fase | Páginas | Justificativa |
|---|---|---|
| **1 — Foundation** | Skeleton, EmptyState, ErrorState, FilterChipsRow compartilhados | Outras páginas dependem |
| **2 — Feed** | PetFeed (V3_PAGE_FEED) | Menos retrabalho, user pediu primeiro |
| **3 — PetDetail + PetCard V3** | PetDetail, MyPets, PublicPet | Fluxo natural pós-Feed |
| **4 — Onboarding/Login** | Login, OnboardingQuestionnaire | Alta frequência |
| **5 — Perfil** | AdopterDashboard, VolunteerProfile | user reclamou muito |
| **6 — Comunidade** | CommunityDetail, CommunitiesDirectory, Mural, Forum, Admin | user reclamou muito |
| **7 — Organização/Abrigo** | ClubDetail, ShelterPublic, OrganizationAdminPanel | user reclamou muito |
| **8 — Eventos/Vitrines** | EventsUnified, PublicExhibitions | V3_PAGE_EVENTS |
| **9 — Lar Temporário** | Foster*, PublicFosterPrograms | V3_PAGE_FOSTER |
| **10 — Adoção** | AdoptionDetail, AdoptionWizard, PostAdoption | V3_PAGE_ADOPTION |
| **11 — Chat** | ChatPage | V3_PAGE_CHAT |
| **12 — Volutariado** | VolunteerProgram, VolunteerSignup, Term | V3_PAGE_VOLUNTEER |
| **13 — Busca/Report/Legal** | SearchPage, CreateReport, Legal* | V3_PAGE_SEARCH, V3_PAGE_LEGAL |
| **14 — Admin (16 páginas)** | todas | V3_PAGE_ADMIN_* |
| **15 — Polimento** | Validação visual final | n/a |

Cada fase = 1 ou mais worktrees isolados + 1 branch + 1 PR + 1 merge + 1 deploy.

---

## 6. Dúvidas para começar a Feed V3

Antes de codar, preciso que você responda:

### Q1 — Cards do "Todos os pets" (REVISADA 2026-07-17 13:51)
- (a) Tamanho máximo de cada card: **limitado ao tamanho do card de destaque do SwipeDeck** (proporção igual ou menor). Sem info extra.
- (b) Grid de "Todos os pets disponíveis" é **fechado por padrão**. Mostra apenas um card-collapsible: "Você deseja ver todos os pets disponíveis? Clique aqui" + chevron. Ao clicar, expande com FadeIn.
- (c) **Paginação configurável pelo usuário**: card de preferência "Cards por página" em Aparência. Valores: `[4, 8, 12, 20, 40, 100]` (múltiplos de 4 = nº de colunas). Default `12`.
- (d) **Colunas configuráveis**: card "Colunas do grid" com `[auto, 3, 4, 5]`. Default `auto` (responsivo: 1 mobile, 2 tablet, 3-4 desktop).
- (e) **Paginação visível**: 1ª, próxima, anterior, última. Mude de página = pets diferentes.
- (f) **Filtros do topo aplicam aqui também** (espécie, porte, idade, sexo, cidade, raio).
- (g) **Perfil do adotante aplica aqui também** (porte preferido, idade preferida, espécie preferida).
- (h) AdSlot a cada 8 cards visíveis.

### Q1.1 — Dimensões (REVISADA 2026-07-17 13:51)
- Página: `width: 100%` do viewport, `min-height: 100vh` (calc - header - bottom bar).
- SwipeDeck: `max-width: 360px` no desktop, **full-width** no mobile, `aspect-ratio: 3/4`.
- PetCard (grid): mesmo `aspect-ratio: 3/4` da SwipeCard para harmonia.
- Header: `sticky top-0`, sempre visível em PC (default `topBarMode=fixed`).
- Bottom tab bar (mobile): `sticky bottom-0`, segue `bottomTabBarMode`.

### Q2 — "Tinder" preservado
A mecânica de arrastar (swipe) deve:
- (a) Continuar igual (drag horizontal com pointer events)
- (b) Adicionar botões grandes (X e ♥) que já existem, mas dar mais destaque
- (c) Adicionar undo (voltar a carta que passou)
- (d) Adicionar "super like" (3ª opção)

### Q3 — Filtros
Você quer:
- (a) Manter os 4 filtros atuais (espécie, porte, cidade, raio) + adicionar idade/sexo
- (b) Só 2 filtros no topo, resto em "Mais filtros" (expansível)
- (c) Sidebar de filtros à esquerda (desktop) / bottom sheet (mobile)

### Q4 — Cards na grid "Todos os pets"
Você quer:
- (a) Manter PetCard atual (DS_V2, 4 colunas)
- (b) Versão compacta (mais cards por linha, 5-6 colunas)
- (c) Versão expandida (cards maiores, 2-3 colunas, mais info)

### Q5 — Cores do "passar" (X) e "curtir" (♥)
Atualmente:
- Curtir = verde custom `hsl(150,55%,55%)`
- Passar = vermelho custom `hsl(9,62%,46%)`

Você quer:
- (a) **Curtir = success** (verde do DS), **Passar = destructive** (vermelho) — mantém semântica
- (b) **Curtir = primary** (terracota), **Passar = muted** (cinza) — paleta mais uniforme
- (c) Outro

### Q6 — Animações de swipe
- (a) Manter cubic-bezier custom que tem hoje
- (b) Trocar por framer-motion (mais robusto, respeita reduced-motion)
- (c) Remover animação e usar só snap entre cartas

### Q7 — Empty state "Nenhum pet encontrado"
Quando os filtros não retornam pets, você quer:
- (a) Mensagem + botão "Limpar filtros"
- (b) Sugestão de pets próximos (com outro filtro) + botão
- (c) Ilustração de placeholder (viralata feliz) + texto

### Q8 — Cidades cadastradas
Você confirmou que o raio é por aproximação do nome da cidade. Quer que eu:
- (a) Sugira cidades conforme digita (autocomplete de cidades conhecidas)
- (b) Adicione um mapa visual com pin do usuário
- (c) Mantenha só o input de texto

### Q9 — Mobile
A SwipeCard é 360px no desktop. No mobile:
- (a) Full-width (100% do viewport)
- (b) Mesma proporção (3:4)
- (c) Stack vertical (uma abaixo da outra, sem swipe)

### Q10 — Modo escuro
Hoje o SwipeCard tem `border border-white` e cores hard-coded que não respeitam dark mode. Quer:
- (a) Implementar dark mode completo na Feed V3
- (b) Manter só claro (V3.0), dark fica pra V3.1
- (c) Dark com override (cards sempre claros pra foto aparecer)

---

## 7. Métricas de sucesso

- [ ] 0 uso de `emerald-*`, `green-*`, `teal-*` em produção
- [ ] 0 cores hard-coded (hsl/hex/rgb) em componentes
- [ ] 0 `font-['...']` hard-coded
- [ ] 100% páginas com `arena-page` wrapper
- [ ] 100% loading states com `<Skeleton />`
- [ ] 100% empty states com `<EmptyState />`
- [ ] 100% abas com `arena-admin-tabs` (5+ items)
- [ ] 100% componentes com dark mode propagado
- [ ] A11y: 100% botões com aria-label
- [ ] Testes E2E (Playwright) das 35 rotas em 3 viewports

---

## 8. Próximos passos

1. Você responde Q1-Q10 (e qualquer outra dúvida)
2. Eu te mostro wireframes da Feed V3
3. Você aprova ou ajusta
4. Eu implemento a Feed V3 em worktree isolado
5. Build + deploy
6. Você valida visualmente
7. Repetimos para próxima página

---

**Status**: Aguardando respostas (Q1-Q10) para começar codificação da Feed V3.
