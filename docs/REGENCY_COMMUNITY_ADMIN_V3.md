# Documento de Regência — COMMUNITY_ADMIN V3

> **Status**: ✅ DEPLOYED (TASK-V3-COMMUNITY_ADMIN)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-20

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | COMMUNITY_ADMIN |
| Rota | `/comunidade/:communityId/admin` |
| Componente V3 | `src/modules/communities/pages/CommunityAdminPanel.v3.jsx` (31KB) |
| Wrapper | `src/modules/communities/pages/CommunityAdminPanel.jsx` |
| Fallback V1 | `src/modules/communities/pages/CommunityAdminPanel.v1.jsx` (14KB) |
| Flag V3 | `V3_PAGE_COMMUNITY_ADMIN` (default OFF) |
| Auth | **hasAnyCommunityPermission** (gate estrito) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_COMMUNITY_ADMIN) === true → <PageV3 /> (lazy)
2. Senão                              → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

### Diferencial V3 vs V1

V1 (14KB, 322 linhas) tem 4 abas mas:
- Header `arena-panel-strong` simples (sem stat cards)
- 2 stats escondidos no Overview (Membros/Fundação)
- Sem busca/filtro
- Sem ações rápidas
- Sem atividade recente
- Sem error state com retry
- Sem JSON-LD
- Sem dark mode tokens

V3 (31KB) redesenhado do zero:
- Hero impactante com gradient rose-500 → pink-600 → fuchsia-600
- 4 stat cards visíveis no hero
- Busca por funcionalidade no Overview
- Filtro por 4 grupos (Mural/Equipe/Ajustes/Pública)
- 4 QuickActionCards com ArrowUpRight
- Atividade recente (4 items) + Sobre
- Danger zone visível no Overview
- TabErrorBoundary (defense in depth)
- Acess denied, loading skeleton, error state com retry
- JSON-LD WebPage

### Comunidade vs ONG

Comunidade é mais simples que ONG (sem shelter flags, sem 19 sub-abas).
Foco em: Mural, Equipe, Configurações. Apenas 4 sub-abas.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Admin encontra funcionalidade rapidamente | Busca + categoria | ≥ 60% |
| O2 | Visualizar stats sem trocar de aba | Stats no hero | 100% |
| O3 | 4 sub-abas acessíveis | Group tabs | 100% |
| O4 | Visão geral clara | Overview rich | 100% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O6 | Performance | Lighthouse perf | ≥ 85 |

### Anti-objetivos

- **AO1**: NÃO permitir acesso a quem não tem permissão
- **AO2**: NÃO confundir com painel de ONG
- **AO3**: NÃO esconder zona de risco (perigo de exclusão)

---

## 2. Estrutura Visual

### S1 — Breadcrumb + back
- Button "Voltar à comunidade" (sm, ghost)
- Breadcrumb: Início > Comunidades > Comunidade > Administração

### S2 — Hero impactante (gradient rose-pink-fuchsia)
- 2 badges: "Administração" + "Proprietário" (se owner)
- Avatar com iniciais 16x16/20x20 (backdrop-blur)
- H1: nome da comunidade
- Subtítulo: localização
- 4 stat cards: Membros / Posts / Eventos / Fundação

### S3 — Group Tabs (4 grupos)
- 4 pills horizontais: Visão Geral / Mural / Equipe / Configurações
- Active: bg-primary + text-primary-foreground

### S4 — Conteúdo (variado)
- **Overview**: 4 stats + busca + filtro + grid de 4 quick actions + atividade recente + sobre + danger zone
- **Mural**: MuralTab (lazy)
- **Equipe**: CommunityTeamTab (lazy)
- **Configurações**: CommunityAdminTab (lazy) + danger zone

### S5 — Empty/Error states
- Erro Firestore: ErrorState com retry
- Comunidade não encontrada: EmptyState
- Sem acesso: toast + redirect

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-2xl sm:text-3xl lg:text-4xl` | Nome da comunidade |
| H2 (group) | `text-base font-bold` | "Atividade recente" |
| H3 (quick action) | `text-sm font-bold` | "Mural" |
| Body | `text-sm` | Geral |
| Description | `text-xs` | Subtítulo |
| Stat value | `text-xl sm:text-2xl` | Stats do hero |
| Stats overview | `text-2xl font-extrabold` | Cards do Overview |

---

## 4. Paleta de Cores (DS-V2)

### Hero gradient:
- `from-rose-500 via-pink-600 to-fuchsia-600` (rosa-pink-fúcsia, comunidade)

### Stats (decorativos):
- rose (Membros) / sky (Posts) / emerald (Eventos) / amber (Fundação)

### Quick action colors:
- primary (Mural) / sky (Equipe) / rose (Configurações) / emerald (Pública)

### Sub-tab colors:
- active: bg-primary + text-primary-foreground
- inactive: text-muted-foreground

### Badges (hero):
- bg-white/20 (Administração) / bg-amber-500/20 (Proprietário)

### Danger zone:
- border-destructive/30 + bg-destructive/5

---

## 5. Estados Comportamentais

### Loading
- CommunityAdminSkeleton com hero + 4 stats + tabs skeleton + 6 cards skeleton

### Error (Firestore)
- ErrorState com código + mensagem
- Botão "Tentar novamente" (refetch)
- Botão "Voltar para Comunidades"

### Not Found
- EmptyState com Building2
- "Comunidade não encontrada"
- CTA "Voltar"

### Access Denied
- useEffect redirect com toast.error
- return null (evita flash)

### Search (Overview)
- Filtra quick actions por title OU desc
- Clear button (X) quando search tem valor
- Combina com activeFilter (4 grupos)

### Group tab
- 4 pills horizontais (overflow-x-auto mobile)
- Click altera active state
- Active: bg-primary + shadow

### Mobile
- Stack vertical
- Hero stats em grid 2 colunas
- Group tabs com shortLabel

### Desktop
- Hero com stats em grid 4 colunas
- Group tabs com full label
- Quick actions em grid 3 colunas

### Dark mode
- Hero gradient mantém contraste
- Cards `bg-card` adaptam
- Stats do overview com tokens dark

### Reduced motion
- Animações staggered no hero + stats
- whileInView em OverviewTab

### TabErrorBoundary
- Captura erros de tabs lazy
- Mostra card "Não foi possível carregar esta aba"
- Outras tabs continuam funcionando

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 35KB | ~31KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` para 3 tab components
- `useMemo` para filteredActions, jsonLd
- Skeleton com layout idêntico
- Suspense fallback com CommunityAdminSkeleton

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<motion.section>` |
| Stats decorativos | Visíveis, com labels |
| Search input | `<Input type="search">` com aria-label |
| Group tabs | `<button>` com `aria-pressed` |
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
<title>Admin {communityName} — Viralata</title>
<meta name="description" content="Painel administrativo de {communityName}." />
```

- **Canonical**: `/comunidade/:communityId/admin`
- **JSON-LD**: `WebPage` schema (com isPartOf WebSite)
- **Open Graph**: `og:title` "Admin {communityName} — Viralata", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useCommunity` (communities/hooks) | Carregar comunidade | ✅ Reusado |
| `useMyCommunityMembership` (communities/hooks) | Permissões | ✅ Reusado |
| `useDeleteCommunity` (communities/hooks) | Exclusão | ✅ Reusado |
| `useAuth` (FirebaseAuthContext) | User | ✅ Reusado |
| `useFeatureFlag` (core) | V3_PAGE_COMMUNITY_ADMIN | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `sonner toast` (toast) | Notificações | ✅ Reusado |
| `ErrorState`, `EmptyState`, `Skeleton`, `Badge`, `Button`, `Input`, `Breadcrumb` | UI base | ✅ Reusados |
| `ConfirmDialog` (ui) | Confirmação exclusão | ✅ Reusado |
| `Seo` | Meta tags | ✅ Reusado |
| `parseTimestamp` (utils) | Fundação | ✅ Reusado |
| `isCommunityOwner`, `hasCommunityPermission`, `hasAnyCommunityPermission` (permissions) | Roles | ✅ Reusado |
| `COMMUNITY_ROLE`, `COMMUNITY_PERMISSION` (constants) | Permissões | ✅ Reusado |
| `recordClientError`, `captureError` (services) | Observabilidade | ✅ Reusado |

### Tabs (lazy imports - V1 components reusados como views)
- 3 components: CommunityAdminTab, CommunityTeamTab, MuralTab

> V3 REUSA os COMPONENTES de tab (views testadas) mas tem JSX próprio para wrapper/header/overview.

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| !isAuthenticated | Loading state |
| !hasAnyCommunityPermission | toast.error + redirect |
| Flag load | CommunityAdminSkeleton |
| Search sem matches | "Nenhuma funcionalidade encontrada" + Limpar filtros |
| Filtro sem actions | Não renderiza chip |
| Search + filtro | Combina lógica |
| Tab lazy error | TabErrorBoundary captura |
| Comunidade não encontrada | EmptyState |
| Firestore error | ErrorState com retry |
| Mobile 360px | Stack vertical, shortLabel |
| Desktop 1280px | Hero stats 4 colunas |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| URL state inválido | Volta para overview |
| Owner badge | Aparece se isCommunityOwner |
| Danger zone | Botão destructive + ConfirmDialog |
| Exclusão confirmada | toast.success + navigate |
| JS desabilitado | EmptyState fallback |

---

## 11. Testes

### Unitários (TODO)
- `src/modules/communities/pages/CommunityAdminPanel.v3.test.jsx`: render, search, group, gate, tab error, delete

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, shortLabel
- [x] Tablet 768px: hero centralizado
- [x] Desktop 1280px: hero stats 4 colunas
- [x] Dark mode: tokens trocam
- [x] Search: filtra por nome/descrição
- [x] Group tab: filtra quick actions
- [x] Combinação search + group
- [x] Empty state: "Nenhuma funcionalidade encontrada"
- [x] Loading: skeleton
- [x] Error: ErrorState com retry
- [x] Not Found: EmptyState
- [x] Access Denied: toast + redirect
- [x] Atividade recente: 4 items
- [x] About: descrição da comunidade
- [x] TabErrorBoundary: tab error capturado
- [x] Danger zone: ConfirmDialog
- [x] Exclusão: toast + navigate
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Stats visualizados | GA4 page view | 100% |
| Uso de busca | GA4 event | ≥ 60% |
| Quick action clicks | GA4 event | 100% |
| Group tab navigation | GA4 event | 100% |
| Mural tab | GA4 event | 100% |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-COMMUNITY-ADMIN-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-COMMUNITY-ADMIN-V3-01 | Hero impactante gradient rose-pink-fuchsia | Cor comunidade (mais quente que ONG) |
| D-COMMUNITY-ADMIN-V3-02 | 4 stat cards no hero (sempre visíveis) | Stats no load |
| D-COMMUNITY-ADMIN-V3-03 | 4 group tabs (Visão Geral/Mural/Equipe/Ajustes) | Simpler que ONG (sem shelter) |
| D-COMMUNITY-ADMIN-V3-04 | Busca por funcionalidade no Overview | Localizar rápido |
| D-COMMUNITY-ADMIN-V3-05 | Filtro por 4 grupos | Combina com busca |
| D-COMMUNITY-ADMIN-V3-06 | Quick action cards com ArrowUpRight | Click cue |
| D-COMMUNITY-ADMIN-V3-07 | Atividade recente (4 items) | Visão geral |
| D-COMMUNITY-ADMIN-V3-08 | Sobre a comunidade (descrição) | Contexto |
| D-COMMUNITY-ADMIN-V3-09 | Avatar com iniciais backdrop-blur | Identidade visual |
| D-COMMUNITY-ADMIN-V3-10 | TabErrorBoundary (defense in depth) | Isolamento de erros |
| D-COMMUNITY-ADMIN-V3-11 | Reusa tabs V1 via React.lazy | Funcionalidade testada |
| D-COMMUNITY-ADMIN-V3-12 | Danger zone no Overview + ConfirmDialog | Segurança exclusão |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-COMMUNITY_ADMIN-1 | Hero impactante gradient | 1.5h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-2 | 4 stat cards no hero | 1h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-3 | 4 group tabs | 1h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-4 | Busca com clear | 1h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-5 | Filtro por grupo | 1h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-6 | Quick action cards | 1.5h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-7 | Atividade recente | 1h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-8 | Sobre a comunidade | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-9 | Avatar com iniciais | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-10 | TabErrorBoundary | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-11 | Reusa tabs V1 via React.lazy | 1h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-12 | JSON-LD WebPage + Danger zone | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY_ADMIN-13 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-COMMUNITY_ADMIN-14 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-20 00:50 | Análise V1 (14KB, 322 linhas, 4 abas) |
| 2026-07-20 00:50 | V3 implementada (31KB, 6 sub-componentes) |
| 2026-07-20 00:50 | Regência preenchida (15 seções) |
| 2026-07-20 00:50 | Deploy + SCRUM update |

---

## 🎯 ÚLTIMA V3 DO ESCOPO DE REDESIGN

**CommunityAdminPanel V3** é a 17ª V3 manual (16 anteriores + esta = 17).

Combinada com as 3 V3s compactas legais (Terms, Privacy, Legislation) e o
`LegalPageViewer.v3.jsx` (6.5KB), o escopo de redesign V3 está **COMPLETO**:

**21 V3s totais** (17 manuais + 4 legais/compactas):
- 17 V3s manuais com REGENCY doc + SCRUM
- 3 V3s legais compactas (usam LegalLayoutV3)
- 1 V3 LegalPageViewer (6.5KB)

**0 placeholders reais** restantes.
