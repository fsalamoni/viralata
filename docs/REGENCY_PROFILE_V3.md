# Documento de Regência — PROFILE V3

> **Status**: ✅ DEPLOYED (TASK-V3-PROFILE)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Modelo**: `docs/REGENCY_HOME_V3.md` (15 seções)
> **Atualizado em**: 2026-07-18

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | PROFILE |
| Rota | `/perfil` (ou `/profile`) |
| Componente V3 | `src/pages/Profile.v3.jsx` (19KB) |
| Wrapper | `src/pages/Profile.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/Profile.v1.jsx` (mantido, 45KB) |
| Flag V3 | `V3_PAGE_PROFILE` (default OFF) |
| Auth | Obrigatória |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_PROFILE) === true → <ProfileV3 /> (lazy, chunk separado)
2. Senão                                    → <ProfileV1 />
```

**D-VITE-LAZY-01**: React.lazy() obrigatório para o Vite não eliminar a branch.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Facilitar navegação em 4 áreas (overview, volunteer, adoptions, events) | Cliques em tabs | ≥ 80% usam tabs |
| O2 | Mostrar progresso do usuário | Visualização dos stat cards | ≥ 90% |
| O3 | Incentivar voluntário | Cliques na aba Voluntário | ≥ 20% dos usuários |
| O4 | Conformidade LGPD | Cliques em "Exportar dados" | ≥ 5% (trimestral) |
| O5 | Manter compatibilidade com V1 | Lighthouse perf | ≥ 85 |

### Anti-objetivos

- **AO1**: NÃO duplicar lógica de V1 (reusar componentes via props)
- **AO2**: NÃO esconder ações críticas (export/delete account sempre acessíveis)
- **AO3**: NÃO carregar tudo upfront (cada tab lazy se necessário)

---

## 2. Estrutura Visual (hero + tabs)

### S1 — Hero (sempre visível)
- Card gradiente `bg-primary` com avatar grande (xl/2xl) + nome + email
- Badge "Voluntário" condicional (se isVolunteer)
- 2 CTAs: "Editar perfil" + "Ver pets"
- Mobile: stack vertical; Desktop: avatar à esquerda + info à direita
- Padrão: `PageHero` mas customizado (precisa de avatar grande + ações)

### S2 — Stats Row (sempre visível)
- 4 stat cards horizontais: Adoções, Lares, Tarefas, Eventos
- Cada card: ícone colorido + valor (nº grande) + label
- Mobile: 2 colunas; Desktop: 4 colunas
- Skeleton durante carregamento

### S3 — Tabs (sticky no topo, abaixo do topbar)
- Tabs Radix com `TabsList` sticky `top-[64px]`
- 5 abas: Visão geral / Voluntário / Adoções / Eventos / Privacidade
- Cada aba com ícone + label
- Mobile: scroll horizontal (overflow-x-auto)
- Active state: border-bottom primary (não fundo cheio, mais clean)
- Background: `bg-background/95` + backdrop-blur (transparência no scroll)

### S4 — Tab: Visão geral
- Card "Resumo" com 3 bullets (adoções, lares, tarefas)
- Card "Notificações" com link para /preferencias

### S5 — Tab: Voluntário
- `VolunteerSection` (reusado do V1)
- Empty state se não tem userUid

### S6 — Tab: Adoções
- 4 sub-seções: MyAdoptionsSection, MyFostersSection, MyTasksSection, CrossRosterSection
- Cada uma é componente do V1 (reusado)

### S7 — Tab: Eventos
- `UpcomingEventsSection` (reusado do V1)
- Filtra por `userUid`

### S8 — Tab: Privacidade
- `AppearanceSettings` (reusado)
- Card "Exportar dados LGPD" (botão que chama `exportMyData` + `downloadDataExport`)
- Card destrutivo "Excluir conta" (link para `/excluir-conta`)

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-2xl sm:text-3xl` | Nome do usuário |
| H2 (tabs) | `text-base font-bold` | Títulos de cards ("Resumo", "Notificações") |
| H3 (não usado) | — | — |
| Body | `text-sm` | Parágrafos, labels |
| Stat value | `text-2xl font-extrabold` | Números de adoções/lares/etc |
| Stat label | `text-xs text-muted-foreground` | Descrição do stat |
| Tab label | (Radix Tabs) | "Visão geral", "Voluntário", etc |

---

## 4. Paleta de Cores (DS-V2)

| Token | Uso |
|---|---|
| `bg-primary` (gradient) | Hero card |
| `bg-card` | Cards de stat, cards de seção |
| `bg-background/95` | Tabs sticky (com backdrop-blur) |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Labels, sub |
| `text-primary` | Ícones, CTAs |
| `text-rose-500/amber-500/emerald-500/sky-500` | Stats icons (4 cores) |
| `border-destructive/30 bg-destructive/[0.04]` | Card "Excluir conta" |
| `bg-white/20 text-white` | CTAs no hero (sobre gradient) |

---

## 5. Estados Comportamentais

### Loading inicial (`isLoadingAuth`)
- Skeleton de hero + stats + tabs + conteúdo
- Layout idêntico ao estado final (evita CLS)

### Não autenticado
- Empty state centralizado com ícone User
- CTA "Entrar" (link para /login)

### Stats loading
- Skeleton de 4 stat cards
- Mantém layout dos 4 cards

### Tab content loading
- Cada componente reusado tem seu próprio loading state
- Não duplicamos lógica

### Reduced motion
- `useReducedMotion()` de framer-motion
- Animações desabilitadas

### Dark mode
- Hero gradient funciona em dark (primary é dark-friendly)
- Cards `bg-card` têm variante dark automática
- Tabs com `bg-background/95` mantém transparência no dark

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 30KB | ~19KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton + tabs fixos) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper (D-VITE-LAZY-01)
- `useProfileStats` com cache 5min via React Query
- Componentes V1 reusados (zero duplicação)
- Tabs Radix com state local (não refetch)
- Skeleton apenas no auth inicial

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Tabs acessíveis | Radix Tabs (ARIA-compliant) |
| Avatar com alt | `<UserAvatar>` herdado |
| CTAs com labels | "Editar perfil", "Ver pets" descritivos |
| Foco visível | `focus-visible:ring-2` em botões |
| Navegação por teclado | Tab order: avatar → CTAs hero → 4 stat cards → 5 tabs → conteúdo |
| Screen reader | Tabs Radix anuncia "tab 1 of 5" etc |
| Ícones decorativos | `aria-hidden="true"` em todos |
| Language | `lang="pt-BR"` no `<html>` |
| Reduced motion | `useReducedMotion()` respeitado |
| Skeleton | `aria-busy="true"` (via Radix) |

---

## 8. SEO

```html
<title>Meu perfil — Viralata</title>
<meta name="description" content="Gerencie seu perfil, adoções, atividades de voluntário e configurações de privacidade." />
```

- **Robots**: `noindex` (página autenticada)
- **Open Graph**: não aplicável

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useAuth` | user, isLoadingAuth, isProfileComplete | ✅ Reusado |
| `useProfileStats` (novo) | 4 contadores via Firestore | ✅ NOVO no V3 |
| `MyAdoptionsSection` (V1) | Tab Adoções | ✅ Reusado |
| `MyFostersSection` (V1) | Tab Adoções | ✅ Reusado |
| `MyTasksSection` (V1) | Tab Adoções | ✅ Reusado |
| `CrossRosterSection` (V1) | Tab Adoções | ✅ Reusado |
| `VolunteerSection` (V1) | Tab Voluntário | ✅ Reusado |
| `UpcomingEventsSection` (V1) | Tab Eventos | ✅ Reusado |
| `AppearanceSettings` (V1) | Tab Privacidade | ✅ Reusado |
| `exportMyData` + `downloadDataExport` | Tab Privacidade | ✅ Reusado |
| `UserAvatar` (V1) | Hero | ✅ Reusado |
| `Tabs` (Radix) | Navegação principal | ✅ Reusado |
| `useVolunteerProfile` hooks | Tab Voluntário | ✅ Reusado indiretamente |

### Hooks/arquivos criados
- `useProfileStats` (inline em Profile.v3.jsx) — Firestore count queries com cache 5min

### Componentes reaproveitados do V1
- 9 componentes sem modificação (zero duplicação)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag `V3_PAGE_PROFILE` OFF | Wrapper renderiza `<ProfileV1 />` |
| User não autenticado | Empty state "Você não está logado" + CTA login |
| Auth loading | Skeleton completo |
| Stats loading | Skeleton de 4 cards |
| Firestore offline | `useProfileStats` retorna zeros, UI mostra 0 |
| Sem tasks/fosters | `isVolunteer` = false, badge não aparece |
| Tab Voluntário sem userUid | Empty state "Faça login para acessar" |
| Tabs overflow mobile | `overflow-x-auto` permite scroll horizontal |
| Dark mode | Tokens trocam, gradient primary funciona |
| Reduced motion | Animações desabilitadas |
| Viewport 360px | Stack vertical, tabs scroll horizontal, stats 2 colunas |
| Viewport 768px | Stats 4 colunas, tabs visíveis |
| Viewport 1280px | max-w-5xl centralizado, layout completo |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/Profile.v3.test.jsx`: render com flag ON, tabs navigation, stats loading, empty state não autenticado

### Manual (pré-deploy)
- [x] Mobile 360px: hero stack vertical, tabs scroll
- [x] Tablet 768px: stats 4 colunas, layout intermediário
- [x] Desktop 1280px: max-w-5xl, layout completo
- [x] Dark mode: gradient primary visível, cards OK
- [x] Screen reader: tabs announces, headings hierarchy
- [x] Tab navigation: ordem lógica, foco visível
- [x] Reduced motion: animações desabilitadas
- [x] Não autenticado: empty state renderiza

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Cliques em tabs | GA4 event | ≥ 80% dos usuários usam tabs |
| Tab mais acessada | GA4 event | Visão geral > 40% |
| Cliques em "Editar perfil" | GA4 event | ≥ 10% |
| Cliques em "Exportar dados" | GA4 event | ≥ 5% (trimestral) |
| Lighthouse a11y | PageSpeed Insights | ≥ 95 |
| Lighthouse perf | PageSpeed Insights | ≥ 85 |
| Error rate (Sentry) | Sentry | < 0.1% |

---

## 13. Decisões Tomadas (D-*)

| ID | Decisão | Justificativa |
|---|---|---|
| D-PROFILE-V3-01 | Tabs sticky no topo (mobile) com offset topbar | Mantém navegação acessível ao rolar |
| D-PROFILE-V3-02 | 5 abas (Visão / Voluntário / Adoções / Eventos / Privacidade) | Cobre todas as áreas do V1 sem poluir |
| D-PROFILE-V3-03 | Hero com avatar grande + 4 stat cards | Contexto imediato do usuário |
| D-PROFILE-V3-04 | Reusa componentes V1 via props | Zero duplicação de lógica |
| D-PROFILE-V3-05 | Empty state claro em cada aba | "Faça login" / "Você ainda não..." |
| D-PROFILE-V3-06 | Tabs Radix | A11y built-in (ARIA + keyboard) |
| D-PROFILE-V3-07 | Dark mode com tokens DS-V2 | Plataforma já tem dark mode |
| D-PROFILE-V3-08 | useProfileStats com cache 5min | Evita refetch ao trocar tabs |
| D-PROFILE-V3-09 | 4 stat cards em cores diferentes (rose/amber/emerald/sky) | Visual hierarchy + personalidade |
| D-PROFILE-V3-10 | Hero gradient com overlay de luz | Profundidade visual sem perder legibilidade |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-PROFILE-1 | Hook `useProfileStats` com 4 count queries | 2h | ✅ Feito |
| TASK-V3-PROFILE-2 | Tabs Radix com 5 abas sticky | 3h | ✅ Feito |
| TASK-V3-PROFILE-3 | Hero customizado (avatar + stats) | 2h | ✅ Feito |
| TASK-V3-PROFILE-4 | Integração com 9 componentes V1 | 3h | ✅ Feito |
| TASK-V3-PROFILE-5 | Acessibilidade WCAG AA (Tabs Radix) | 1h | ✅ Feito |
| TASK-V3-PROFILE-6 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-PROFILE-7 | Teste E2E Playwright (tabs + export) | 2h | 🟡 Pendente |
| TASK-V3-PROFILE-8 | Lighthouse ≥ 90 em prod | 1h | 🟡 Pendente (medir) |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-18 05:30 | Análise V1 (1035 linhas, 11 sections) + 12 Q&A |
| 2026-07-18 05:30 | V3 implementada (19KB, 5 tabs, 9 componentes reusados) |
| 2026-07-18 05:30 | `useProfileStats` hook criado (4 contadores) |
| 2026-07-18 05:30 | Regência preenchida (15 seções) |
| 2026-07-18 05:30 | Deploy + SCRUM update |
