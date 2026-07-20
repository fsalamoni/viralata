# Documento de Regência — SHELTER_ADMIN V3

> **Status**: ✅ DEPLOYED (TASK-V3-SHELTER_ADMIN)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-20

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | SHELTER_ADMIN |
| Rota | `/abrigos/:clubId/admin/dashboard` |
| Componente V3 | `src/modules/shelter/components/ShelterAdminDashboard.v3.jsx` (27KB) |
| Wrapper | `src/modules/shelter/components/ShelterAdminDashboard.jsx` |
| Fallback V1 | `src/modules/shelter/components/ShelterAdminDashboard.v1.jsx` (13KB) |
| Flag V3 | `V3_PAGE_SHELTER_ADMIN` (default OFF) |
| Flag extra | `SHELTER_ADMIN_DASHBOARD_V1` (gate para mostrar o dashboard) |
| Auth | **user logado** (gate simples) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_SHELTER_ADMIN) === true → <PageV3 /> (lazy)
2. Senão                              → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

### Diferencial V3 vs V1

V1 (13KB) é funcional mas:
- Hero `PageHero` simples (sem gradient)
- Sem stat cards pessoais (só count em badges)
- 3 colunas com cards básicos
- Sem sinal visual para tasks atrasadas
- Sem empty states ricos
- Sem error state com retry
- Sem JSON-LD

V3 (27KB) redesenhado do zero:
- Hero impactante com gradient emerald-teal-cyan
- 4 stat cards pessoais (Tasks/Applications/Pets/Devoluções)
- Sinal de tasks atrasadas (badge amber no hero)
- Cards funcionais melhorados (avatar, status, navegação)
- Empty states ricos por seção
- Error state com retry (loadCount state)
- JSON-LD WebPage
- CTA "Painel do abrigo" final

### Foco pessoal vs agregado

`ShelterAdminDashboardV3` é PESSOAL (uid do admin):
- Tasks onde sou assignee
- Pets que cadastrei
- Applications no abrigo (contexto do user)

Diferente de `DashboardPage` (métricas agregadas do abrigo).

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Visualizar carga pessoal | Stat cards | 100% |
| O2 | Identificar tasks atrasadas | Badge amber no hero | 100% |
| O3 | Navegar para tasks/applications/pets | Botões em cada card | ≥ 80% |
| O4 | Conhecer devoluções pós-adoção | Card de devoluções | 100% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O6 | Performance | Lighthouse perf | ≥ 85 |

### Anti-objetivos

- **AO1**: NÃO confundir com DashboardPage (agregado)
- **AO2**: NÃO mostrar dados de outros admins
- **AO3**: NÃO esconder tasks atrasadas

---

## 2. Estrutura Visual

### S1 — Hero (gradient emerald-teal-cyan)
- 3 badges: "Meu painel" / "Carga pessoal" (com dot) / "X atrasadas" (se overdue > 0)
- H1: "Olá, [primeiro nome] 👋"
- Subtítulo: "Sua carga pessoal de trabalho — não do abrigo inteiro."
- 4 stat cards decorativos: Tasks / Applications / Pets / Devoluções

### S2 — Workload Cards (grid 1/2/3)
- **Minhas tasks** (primary): kanban onde sou assignee + badge overdue + arrow
- **Applications** (sky): recentes no abrigo + status badges
- **Pets cadastrados** (amber): pets onde sou criador + foto ou fallback

### S3 — Devoluções pós-adoção
- Card horizontal com PostAdoptionReturnedList (lazy)

### S4 — CTA Final
- "Precisa de uma visão agregada do abrigo inteiro?" + botão para painel

### S5 — Empty states
- Tasks: "Quando alguém atribuir uma task do Kanban a você, ela aparece aqui."
- Applications: "Quando alguém se candidatar a um pet do abrigo, a application aparece aqui."
- Pets: "Quando você cadastrar um pet, ele aparece aqui para fácil acesso." + CTA

### S6 — Error state
- ErrorState com retry (loadCount)
- Botão "Tentar novamente"

### S7 — Flag disabled
- "Funcionalidade em rollout gradual"

### S8 — Not logged in
- "Faça login para acessar" + CTA Entrar

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-2xl sm:text-3xl lg:text-4xl` | "Olá, [nome] 👋" |
| H2 (section) | `text-base font-bold` | "Devoluções pós-adoção" |
| H2 (section card) | `text-sm font-bold` | "Minhas tasks" |
| H3 (row) | `text-sm font-semibold` | Nome da task/app/pet |
| Body | `text-sm` | Geral |
| Description | `text-[11px]` | Subtítulo |
| Stat value | `text-xl sm:text-2xl` | Stats do hero |
| Empty | `text-xs` | Empty state description |

---

## 4. Paleta de Cores (DS-V2)

### Hero gradient:
- `from-emerald-500 via-teal-600 to-cyan-600` (verde-azul, fresh, pessoal)

### Stats (decorativos):
- primary (Tasks) / sky (Applications) / amber (Pets) / rose (Devoluções)

### Badges (hero):
- bg-white/20 (Meu painel)
- bg-emerald-500/20 (Carga pessoal, com dot)
- bg-rose-500/20 (X atrasadas, com AlertCircle)

### Status colors (apps):
- approved: emerald
- rejected: red
- in_review: amber
- pending: slate

### Empty states:
- Hourglass (tasks) / UserCheck (apps) / PawPrint (pets)

### Background dots:
- Sem badges decorativos específicos

---

## 5. Estados Comportamentais

### Loading
- ShelterAdminSkeleton com hero + 4 stats + 3 sections skeleton

### Error (Firestore)
- ErrorState com mensagem
- Botão "Tentar novamente" (loadCount state)

### Not Logged In
- EmptyState com Home
- "Faça login para acessar" + CTA Entrar

### Flag Disabled
- EmptyState com Home
- "Funcionalidade em rollout gradual"

### Empty
- Cada seção tem EmptyState próprio
- "Nenhuma task atribuída" / "Nenhuma application" / "Nenhum pet cadastrado"

### Tasks atrasadas
- Card de task: AlertCircle rose + texto "atrasado"
- Badge amber no hero com count

### Mobile
- Stack vertical
- Stats em grid 2 colunas
- Sections em 1 coluna

### Desktop
- Hero com stats em grid 4 colunas
- Sections em grid 3 colunas
- CTA final horizontal

### Dark mode
- Hero gradient mantém contraste
- Cards `bg-card` adaptam
- Status badges com versões dark

### Reduced motion
- Animações staggered no hero + stats
- whileInView em devoluções + CTA

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 30KB | ~27KB (PostAdoptionReturnedList lazy) |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` para PostAdoptionReturnedList
- `useMemo` para overdueCount, recentAppsCount, jsonLd
- Skeleton com layout idêntico
- 3 queries paralelas no useEffect (kanban, apps, pets)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<motion.section>` |
| Stats decorativos | Visíveis, com labels |
| Task row | `<motion.li>` com AlertCircle para overdue |
| Application row | Status badge semântico |
| Pet row | `<img alt>` ou fallback icon |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| JSON-LD | `WebPage` schema com isPartOf |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA |

---

## 8. SEO

```html
<title>Meu painel do abrigo — Viralata</title>
<meta name="description" content="Sua carga pessoal de trabalho como admin do abrigo." />
```

- **Canonical**: `/abrigos/:clubId/admin/dashboard`
- **JSON-LD**: `WebPage` schema (com isPartOf WebSite)
- **Open Graph**: `og:title` "Meu painel do abrigo — Viralata"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useAuth` (FirebaseAuthContext) | User | ✅ Reusado |
| `useFeatureFlag` (core) | SHELTER_ADMIN_DASHBOARD_V1 | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `useParams` (react-router) | clubId | ✅ Reusado |
| `ErrorState`, `EmptyState`, `Skeleton`, `Badge`, `Button` | UI base | ✅ Reusados |
| `Seo` | Meta tags | ✅ Reusado |
| `db` (Firestore) | 3 queries | ✅ Reusado |
| `collectionGroup`, `where`, `orderBy`, `getDocs`, `limit` | Firestore | ✅ Reusado |
| `logger` (lib) | Erros | ✅ Reusado |
| `PostAdoptionReturnedList` (lazy) | Devoluções | ✅ Reusado via lazy |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks/services existentes)

### Componentes reaproveitados
- 6 (ErrorState, EmptyState, Skeleton, Badge, Button, Seo, PostAdoptionReturnedList)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| Flag SHELTER_ADMIN_DASHBOARD_V1 OFF | EmptyState "rollout gradual" |
| !user | EmptyState "Faça login" + CTA Entrar |
| Flag load | ShelterAdminSkeleton (600ms) |
| Firestore error | ErrorState com retry (loadCount) |
| Tasks vazias | EmptyState "Nenhuma task atribuída" |
| Applications vazias | EmptyState "Nenhuma application" |
| Pets vazios | EmptyState + CTA "Cadastrar pet" |
| Tasks atrasadas | AlertCircle + badge "atrasado" + badge amber hero |
| Sem clubId | Pega de useParams |
| Sem photo_url | Fallback com icon |
| Mobile 360px | Stack vertical, stats 2 colunas |
| Desktop 1280px | Hero stats 4 colunas, sections 3 colunas |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | EmptyState fallback |

---

## 11. Testes

### Unitários (TODO)
- `src/modules/shelter/components/ShelterAdminDashboard.v3.test.jsx`: render, gate, error, retry

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, stats 2 colunas
- [x] Tablet 768px: hero centralizado
- [x] Desktop 1280px: hero stats 4 colunas, sections 3 colunas
- [x] Dark mode: tokens trocam
- [x] Tasks atrasadas: AlertCircle + badge amber
- [x] Empty: "Nenhuma task atribuída"
- [x] Applications: status badges (approved/rejected/in_review/pending)
- [x] Pets: foto ou fallback
- [x] Loading: skeleton
- [x] Error: ErrorState com retry
- [x] Not Logged In: "Faça login"
- [x] Flag Disabled: "rollout gradual"
- [x] CTA Final: link para painel
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Stats visualizados | GA4 page view | 100% |
| Tasks atrasadas detectadas | Visual | 100% |
| Cards clicados | GA4 event | ≥ 80% |
| Empty states | GA4 event | 100% |
| Error retries | GA4 event | ≥ 50% |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-SHELTER-ADMIN-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-SHELTER-ADMIN-V3-01 | Hero gradient emerald-teal-cyan | Fresh, pessoal |
| D-SHELTER-ADMIN-V3-02 | 4 stat cards pessoais | Visão geral rápida |
| D-SHELTER-ADMIN-V3-03 | Badge overdue no hero | Destaque crítico |
| D-SHELTER-ADMIN-V3-04 | Sections em grid 1/2/3 | 3 cards simétricos |
| D-SHELTER-ADMIN-V3-05 | TaskRow com AlertCircle para overdue | Sinal visual |
| D-SHELTER-ADMIN-V3-06 | ApplicationRow com status badge | Estado semântico |
| D-SHELTER-ADMIN-V3-07 | PetRow com foto ou fallback | Identidade visual |
| D-SHELTER-ADMIN-V3-08 | Empty states por seção | Contexto individual |
| D-SHELTER-ADMIN-V3-09 | PostAdoptionReturnedList lazy | Não polui bundle |
| D-SHELTER-ADMIN-V3-10 | ErrorState com retry (loadCount) | Recovery fácil |
| D-SHELTER-ADMIN-V3-11 | JSON-LD WebPage schema | SEO |
| D-SHELTER-ADMIN-V3-12 | CTA Final para painel do abrigo | Cross-link |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-SHELTER_ADMIN-1 | Hero impactante gradient | 1h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-2 | 4 stat cards pessoais | 1h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-3 | Badge overdue no hero | 0.5h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-4 | Sections em grid | 1.5h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-5 | TaskRow com overdue | 1h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-6 | ApplicationRow com status | 1h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-7 | PetRow com foto/fallback | 0.5h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-8 | Empty states por seção | 1h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-9 | PostAdoptionReturnedList lazy | 0.5h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-10 | ErrorState com retry | 0.5h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-11 | JSON-LD WebPage | 0.5h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-12 | CTA Final para painel | 0.5h | ✅ Feito |
| TASK-V3-SHELTER_ADMIN-13 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-SHELTER_ADMIN-14 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-20 00:30 | Análise V1 (13KB, 3 cards pessoais + PostAdoptionReturnedList) |
| 2026-07-20 00:30 | V3 implementada (27KB, 6 sub-componentes) |
| 2026-07-20 00:30 | Regência preenchida (15 seções) |
| 2026-07-20 00:30 | Deploy + SCRUM update |
