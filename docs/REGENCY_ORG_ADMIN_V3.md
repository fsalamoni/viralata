# Documento de Regência — ORG_ADMIN V3

> **Status**: ✅ DEPLOYED (TASK-V3-ORG_ADMIN)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | ORG_ADMIN |
| Rota | `/organizacoes/:orgId/admin` |
| Componente V3 | `src/modules/organizations/pages/OrganizationAdminPanel.v3.jsx` (45KB) |
| Wrapper | `src/modules/organizations/pages/OrganizationAdminPanel.jsx` |
| Fallback V1 | `src/modules/organizations/pages/OrganizationAdminPanel.v1.jsx` (35KB) |
| Flag V3 | `V3_PAGE_ORG_ADMIN` (default OFF) |
| Auth | **hasAnyClubPermission** (gate estrito) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_ORG_ADMIN) === true → <PageV3 /> (lazy)
2. Senão                              → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

### Diferencial V3 vs V1

V1 (35KB) é funcionalmente completo mas com:
- Header `arena-admin-header` simples (sem gradient)
- 4 stats escondidos no OverviewTab (não visíveis no load)
- Navegação 2-layer (groups + sub-tabs) mas SEM busca
- 6 grupos (Visão Geral/Operacional/Pessoas/Engajamento/Financeiro/Configurações)

V3 (45KB) redesenhado do zero:
- Hero impactante com gradient sky→indigo→violet
- 4 stat cards visíveis no hero
- Busca por funcionalidade no Overview
- Filtro por grupo de funcionalidade
- Atividade recente + Sobre
- Welcome contextual
- Acess denied, loading, error states melhorados
- JSON-LD WebPage

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Admin encontra funcionalidade rapidamente | Busca + categoria | ≥ 60% |
| O2 | Visualizar stats da ONG sem trocar de aba | Stats no hero | 100% |
| O3 | 19 sub-abas acessíveis | Navegação 2-layer | 100% |
| O4 | Visão geral clara | Overview rich | 100% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O6 | Performance | Lighthouse perf | ≥ 85 |

### Anti-objetivos

- **AO1**: NÃO permitir acesso a quem não tem permissão
- **AO2**: NÃO perder as 19 sub-abas testadas
- **AO3**: NÃO quebrar feature flags shelter (foundation/dashboard/kanban/etc)

---

## 2. Estrutura Visual

### S1 — Breadcrumb + back
- Button "Voltar para a ONG" (sm, ghost)
- Breadcrumb: Início > Organizações > ONG > Administração

### S2 — Hero impactante (gradient sky-indigo-violet)
- 2 badges: "Administração" + "Proprietário" (se owner)
- Avatar com iniciais (16x16 / 20x20 mobile/desktop) backdrop-blur
- H1: nome da ONG
- Subtítulo: localização
- 4 stat cards decorativos: Membros / Pets / Adoções / Eventos

### S3 — Group Tabs (2-layer navigation)
- 6 grupos em pills horizontais: Visão Geral/Operacional/Pessoas/Engajamento/Financeiro/Configurações
- Mobile: shortLabel (Início/Operacional/etc)
- Active: bg-primary + text-primary-foreground

### S4 — Sub-Tabs (dentro do grupo)
- Pills horizontais (overflow-x-auto mobile)
- Active: bg-foreground + text-background
- 19 sub-abas no total

### S5 — Conteúdo (variado)
- **Overview**: 4 stats + busca + filtro + grid de 9 quick actions + atividade recente + sobre
- **Operacional**: Pets/Prontuário/Medicação/Timeline
- **Pessoas**: Equipe/Voluntários/Lares
- **Engajamento**: Mural/Chat/Pendências/Vitrines
- **Financeiro**: Doações/Campanhas/Prestação/Relatórios/Indicadores
- **Configurações**: Geral/Configurações/Dashboard

### S6 — Empty/Error states
- Erro Firestore: ErrorState com retry
- ONG não encontrada: EmptyState
- Sem acesso: toast + redirect

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-2xl sm:text-3xl lg:text-4xl` | Nome da ONG |
| H2 (group/section) | `text-base font-bold` | "Atividade recente" |
| H3 (sub-action) | `text-sm font-bold` | "Pets" |
| Body | `text-sm` | Geral |
| Description | `text-xs` | Subtítulo |
| Stat value | `text-xl sm:text-2xl` | Stats do hero |
| Stats overview | `text-2xl font-extrabold` | Cards do Overview |

---

## 4. Paleta de Cores (DS-V2)

### Hero gradient:
- `from-sky-500 via-indigo-600 to-violet-600` (sky-indigo-violet, vibrante)

### Stats (decorativos):
- sky (Membros) / amber (Pets) / rose (Adoções) / emerald (Eventos)

### Quick action colors:
- primary (3) / amber (1) / sky (2) / rose (1) / emerald (2) / violet (1)

### Sub-tab colors:
- active: bg-foreground + text-background
- inactive: text-muted-foreground

### Badges (hero):
- bg-white/20 (Administração) / bg-amber-500/20 (Proprietário)

---

## 5. Estados Comportamentais

### Loading
- OrgAdminSkeleton com hero + 4 stats + tabs skeleton + 6 cards skeleton

### Error (Firestore)
- ErrorState com código + mensagem
- Botão "Tentar novamente" (refetch)
- Botão "Voltar para Organizações"

### Not Found
- EmptyState com Building2
- "Organização não encontrada"
- CTA "Voltar"

### Access Denied
- useEffect redirect com toast.error
- return null (evita flash)

### Search (Overview)
- Filtra quick actions por title OU desc
- Clear button (X) quando search tem valor
- Combina com activeFilter (group)

### Group tab
- 6 pills horizontais (overflow-x-auto mobile)
- Click altera active state
- Active: bg-primary + shadow

### Sub-tab
- Pills dentro do grupo ativo
- Active: bg-foreground
- Hidden se grupo não tem sub-abas

### Mobile
- Stack vertical
- Hero stats em grid 2 colunas
- Group tabs com shortLabel
- Sub-tabs em overflow-x-auto

### Desktop
- Hero com stats em grid 4 colunas
- Group tabs com full label
- Sub-tabs em flex-wrap

### Dark mode
- Hero gradient mantém contraste
- Cards `bg-card` adaptam
- Stats do overview com tokens dark

### Reduced motion
- Animações staggered no hero + stats
- whileInView em OverviewTab stats

### TabErrorBoundary
- Captura erros de tabs lazy
- Mostra card "Não foi possível carregar esta aba"
- Outras tabs continuam funcionando

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 50KB | ~45KB (componentes lazy) |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` para 18 componentes de tab
- `useMemo` para filteredActions, visibleTabs, shelterTabs, subsByGroup, visibleGroups, jsonLd
- Skeleton com layout idêntico
- Suspense fallback com OrgAdminSkeleton

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<motion.section>` |
| Stats decorativos | Visíveis, com labels |
| Search input | `<Input type="search">` com aria-label |
| Group tabs | `<button>` com `aria-pressed` |
| Sub-tabs | `<button>` com `aria-pressed` |
| Quick action cards | `<motion.button>` com `data-testid` |
| TabErrorBoundary | Captura e mostra estado acessível |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| JSON-LD | `WebPage` schema com isPartOf |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA |

---

## 8. SEO

```html
<title>Admin {clubName} — Viralata</title>
<meta name="description" content="Painel administrativo de {clubName}." />
```

- **Canonical**: `/organizacoes/:orgId/admin`
- **JSON-LD**: `WebPage` schema (com isPartOf WebSite)
- **Open Graph**: `og:title` "Admin {clubName} — Viralata", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useClub` (organizations/hooks) | Carregar ONG | ✅ Reusado |
| `useMyMembership` (organizations/hooks) | Permissões | ✅ Reusado |
| `useMyPets` (pets/hooks) | Contagem pets | ✅ Reusado |
| `useFeatureFlag` (core) | 14 shelter flags | ✅ Reusado |
| `useAuth` (FirebaseAuthContext) | User | ✅ Reusado |
| `useToast` (core) | Notificações | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `ErrorState`, `EmptyState`, `Skeleton`, `Badge`, `Button`, `Input`, `Breadcrumb` | UI base | ✅ Reusados |
| `Seo` | Meta tags | ✅ Reusado |
| `ClubThemedScope` | Theming | ✅ Reusado |
| `TabErrorBoundary` | Defense in depth | ✅ V3 reescrito |
| `parseTimestamp` (utils) | Fundação | ✅ Reusado |
| `isClubOwner`, `hasClubPermission`, `hasAnyClubPermission`, `canViewVolunteersRoster` (permissions) | Roles | ✅ Reusado |
| `CLUB_PERMISSION` (constants) | Permissões | ✅ Reusado |
| `CLUB_DIRECTORY_STATUS` (directory) | Status | ✅ Reusado |
| `recordClientError`, `captureError` (services) | Observabilidade | ✅ Reusado |

### Tabs (lazy imports - V1 components reusados como views)
- 8 components de organizations: ClubAdminTab, ClubTeamTab, ClubPetsDataGrid, ClubFeedTab, ClubDonationsTab, ClubFinanceTab, ClubGeneralAdminTab, ClubChatAdminTab
- 11 components de shelter: ReportsTab, IndicatorsTab, DashboardPage, KanbanPage, ExhibitionsList, VolunteersAdminTab, MedicalRecordsList, MedicationsList, TimelineList, FostersList, ShelterDonationsTab, ShelterFinanceTab

> V3 REUSA os COMPONENTES de tab (views testadas) mas tem JSX próprio para wrapper/header/overview.

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| !isAuthenticated | Loading state |
| !hasAnyClubPermission | toast.error + redirect |
| Flag load | OrgAdminSkeleton |
| Search sem matches | "Nenhuma funcionalidade encontrada" + Limpar filtros |
| Categoria sem actions | Não renderiza grupo |
| Search + filtro | Combina lógica |
| Tab lazy error | TabErrorBoundary captura |
| Shelter flag OFF | Tab shelter não aparece |
| ONG não encontrada | EmptyState |
| Firestore error | ErrorState com retry |
| Mobile 360px | Stack vertical, shortLabel |
| Desktop 1280px | Hero stats 4 colunas |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| URL state inválido | Volta para overview |
| Owner badge | Aparece se isClubOwner |
| JS desabilitado | EmptyState fallback |

---

## 11. Testes

### Unitários (TODO)
- `src/modules/organizations/pages/OrganizationAdminPanel.v3.test.jsx`: render, search, group, sub, gate, tab error

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, shortLabel
- [x] Tablet 768px: hero centralizado
- [x] Desktop 1280px: hero stats 4 colunas
- [x] Dark mode: tokens trocam
- [x] Search: filtra por nome/descrição
- [x] Group tab: filtra quick actions
- [x] Sub-tab: troca conteúdo
- [x] Combinação search + group
- [x] Empty state: "Nenhuma funcionalidade encontrada"
- [x] Loading: skeleton
- [x] Error: ErrorState com retry
- [x] Not Found: EmptyState
- [x] Access Denied: toast + redirect
- [x] Atividade recente: 4 items
- [x] About: descrição da ONG
- [x] TabErrorBoundary: tab error capturado
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Stats visualizados | GA4 page view | 100% |
| Uso de busca | GA4 event | ≥ 60% |
| Quick action clicks | GA4 event | 100% |
| Group tab navigation | GA4 event | 100% |
| Sub-tab navigation | GA4 event | 100% |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-ORG-ADMIN-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-ORG-ADMIN-V3-01 | Hero impactante gradient sky-indigo-violet | Vibração admin |
| D-ORG-ADMIN-V3-02 | 4 stat cards no hero (sempre visíveis) | Stats no load |
| D-ORG-ADMIN-V3-03 | 2-layer tabs (group + sub) | 19 sub-abas navegáveis |
| D-ORG-ADMIN-V3-04 | Busca por funcionalidade no Overview | Localizar rápido |
| D-ORG-ADMIN-V3-05 | Filtro por grupo | Combina com busca |
| D-ORG-ADMIN-V3-06 | Quick action cards com ArrowUpRight | Click cue |
| D-ORG-ADMIN-V3-07 | Atividade recente (4 items) | Visão geral |
| D-ORG-ADMIN-V3-08 | Sobre a organização (descrição) | Contexto |
| D-ORG-ADMIN-V3-09 | Avatar com iniciais backdrop-blur | Identidade visual |
| D-ORG-ADMIN-V3-10 | TabErrorBoundary (defense in depth) | Isolamento de erros |
| D-ORG-ADMIN-V3-11 | Reusa tabs V1 via React.lazy | Funcionalidade testada |
| D-ORG-ADMIN-V3-12 | JSON-LD WebPage schema | SEO |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-ORG_ADMIN-1 | Hero impactante gradient | 1.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-2 | 4 stat cards plataforma | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-3 | 2-layer tabs | 1.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-4 | Busca com clear | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-5 | Filtro por grupo | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-6 | Quick action cards | 1.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-7 | Atividade recente | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-8 | Sobre a organização | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-9 | Avatar com iniciais | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-10 | TabErrorBoundary | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-11 | Reusa tabs V1 via React.lazy | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-12 | JSON-LD WebPage | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-13 | Testes unitários V3 | 3h | 🟡 Pendente |
| TASK-V3-ORG_ADMIN-14 | E2E Playwright | 4h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 23:50 | Análise V1 (35KB, 19 sub-abas, shelter flags) |
| 2026-07-19 23:50 | V3 implementada (45KB, 8 sub-componentes) |
| 2026-07-19 23:50 | Regência preenchida (15 seções) |
| 2026-07-19 23:50 | Deploy + SCRUM update |
