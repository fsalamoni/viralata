# Documento de Regência — COMMUNITY_DETAIL V3

> **Status**: ✅ DEPLOYED (TASK-V3-COMMUNITY-DETAIL)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | COMMUNITY_DETAIL |
| Rota | `/comunidades/:communityId` |
| Componente V3 | `src/modules/communities/pages/CommunityDetail.v3.jsx` (40KB) |
| Wrapper | `src/modules/communities/pages/CommunityDetail.jsx` (escolhe V3 ou V1 via flag) |
| Fallback V1 | `src/modules/communities/pages/CommunityDetail.v1.jsx` (mantido, 287 linhas) |
| Flag V3 | `V3_PAGE_COMMUNITY_DETAIL` (default OFF) |
| Auth | Pública (visualização) / logado (participar) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_COMMUNITY_DETAIL) === true → <PageV3 /> (lazy)
2. Senão                                            → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Exibir comunidade completa | Visualizações | 100% |
| O2 | Conversão para "Participar" | Cliques CTA | ≥ 25% |
| O3 | Descoberta de posts/eventos | Cliques nos previews | ≥ 30% |
| O4 | Mobile-first | Lighthouse mobile | ≥ 90 |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O6 | SEO | Schema Organization | 100% |

### Anti-objetivos

- **AO1**: NÃO esconder "Participar" atrás de menu
- **AO2**: NÃO exigir login para ver a comunidade
- **AO3**: NÃO quebrar tabs (deve usar 2-layer com URL state)

---

## 2. Estrutura Visual

### S1 — Hero impactante
- Gradient **dinâmico** baseado no `community.id` (6 paletas possíveis)
- Botão "Voltar" + Botão "Painel" (se admin)
- Badge "Comunidade" com Users
- H1: nome da comunidade
- Descrição (se houver)
- Metadados: cidade/UF, fundada em, badge "Membro" (se aplicável)
- 2 CTAs primários: "Participar" (não-membro) / "Acessar mural" (membro) + "Fórum"
- 3 stat cards decorativos (desktop only): Membros, Posts, Próximos eventos
- Mobile: 3 stat cards horizontais abaixo

### S2 — Stats (mobile)
- 3 stat cards: Membros (primary), Posts (sky), Eventos (emerald)

### S3 — Tabs 2-layer
- Grupo 1: Conteúdo (sempre visível)
  - Sub-pills: Mural, Fórum, Eventos, Sobre
- Grupo 2: Gestão (só admin)
  - Sub-pills: Equipe
- Sticky? NÃO (mantém no fluxo para evitar problemas de header)
- Tabs ativas: `bg-primary text-primary-foreground`
- URL state: `?tab=group:sub`

### S4 — Tab content
- **Mural**: top 3 posts (pinned primeiro, depois recentes) + botão "Ver mural completo"
- **Fórum**: EmptyState com CTA "Acessar fórum"
- **Eventos**: próximo evento (se houver) + botão "Ver todos"
- **Sobre**: 4 sub-artigos:
  1. Descrição completa
  2. Estatísticas detalhadas (3 cards)
  3. Equipe (top 3 membros)
  4. Tags (se houver)
- **Equipe** (admin only): EmptyState com CTA "Acessar painel"

### S5 — CTA Final (não-membro)
- Gradient (mesma cor do hero)
- Ícone Users
- H2: "Junte-se a [nome]"
- 2 CTAs: "Participar agora" / "Ver outras comunidades"

### Loading
- 1 hero skeleton + 3 stats skeleton + 1 tab bar skeleton + 1 content skeleton

### Error
- AlertCircle + título "Comunidade não encontrada"
- 2 botões: "Tentar de novo" / "Ver todas as comunidades"

### Not Found
- Mesma UI do error

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-3xl sm:text-4xl lg:text-5xl` | Nome da comunidade |
| H2 (CTA) | `text-2xl sm:text-3xl` | "Junte-se a..." |
| H2 (tab) | `text-lg sm:text-xl` | "Mural da comunidade" |
| H3 (artigo) | `text-lg font-bold` | "Sobre a comunidade" |
| H4 (card) | `text-sm font-semibold` | Nome do membro |
| Body | `text-base` | Descrição da comunidade |
| Description | `text-sm` | Texto de posts |
| Metadata | `text-xs` | city/date/metadata |

---

## 4. Paleta de Cores (DS-V2)

### Gradient dinâmico (6 opções baseadas em hash do communityId):
- `from-rose-500 via-pink-600 to-amber-600`
- `from-amber-500 via-orange-600 to-red-600`
- `from-emerald-500 via-teal-600 to-cyan-600`
- `from-sky-500 via-indigo-600 to-violet-600`
- `from-violet-500 via-fuchsia-600 to-rose-600`
- `from-cyan-500 via-sky-600 to-blue-600`

### Tokens fixos:
- `bg-card` — Cards de stat, posts, eventos, equipe
- `text-foreground` — Texto principal
- `text-muted-foreground` — Labels, sub
- `bg-primary/10` — Active state, badges
- `bg-emerald-100` — Badge "Membro"
- `bg-amber-500` — Tab "Gestão" active

---

## 5. Estados Comportamentais

### Loading
- Skeleton com layout idêntico ao final

### Not found / Error
- Card vermelho com retry

### Visitante (não logado)
- Vê tudo
- Botão "Participar" leva a login (com toast)

### Membro
- Badge "Membro" no hero
- CTA "Acessar mural"
- Pode postar no mural

### Admin
- Botão "Painel" no hero
- Tab "Gestão" visível
- Stats avançadas

### Tabs
- 2-layer: `?tab=group:sub`
- Backward compat: aceita `?tab=mural` (legacy single-key)
- `replace: true` para não poluir histórico

### Gradient dinâmico
- `pickGradient(communityId)` retorna 1 de 6 paletas
- Hash determinístico (mesma comunidade = mesma cor)

### Mural preview
- Top 3 posts (pinned primeiro, depois recentes)
- Cards com avatar + autor + tempo + texto (2 linhas) + tags
- Click → vai para `?tab=content:mural`

### Próximo evento
- 1 card com header gradiente violet
- Data completa + location
- Countdown: "🎉 É hoje!" / "Amanhã" / "Em N dias"

### Mobile
- Stack vertical
- Stats em grid 3 colunas
- Tabs em scroll horizontal

### Desktop
- Hero 2 colunas (info + stats decorativos)
- Stats 3 cards no hero
- Tabs full width

### Dark mode
- Gradients mantêm contraste
- Badges com versões dark
- Cards `bg-card` adaptam

### Reduced motion
- Animações staggered no hero + stats
- whileInView no CTA final

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 45KB | ~40KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Skeleton com layout idêntico ao final
- `Promise.all` para carregar comunidade + posts + events em paralelo
- `.catch(() => [])` em posts/events (degrada gracefully)
- `useMemo` para permissions, stats, topPosts, nextEvent, team, jsonLd
- Gradient determinístico (sem re-calc)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<section>` + `<motion.section>` |
| Tabs como buttons | `<button>` com `aria-pressed` |
| 2-layer tabs | URL state preserva navegação |
| Cards | `<article>` + `data-testid` |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| Screen reader | Estados announces (loading → community → tab) |
| JSON-LD | `Organization` schema |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA (white em gradient) |

---

## 8. SEO

```html
<title>[Nome] — Comunidade Viralata</title>
<meta name="description" content="[Descrição da comunidade]" />
```

- **Canonical**: `/comunidades/:communityId`
- **JSON-LD**: `Organization` schema (com foundingDate, location, memberOf)
- **Open Graph**: `og:title` "[Nome] — Comunidade Viralata", `og:image` (cover_url)

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `getCommunity` (communityService) | Dados da comunidade | ✅ Reusado |
| `listCommunityEvents` | Eventos da comunidade | ✅ Reusado |
| `getCommunityPosts` | Posts do mural | ✅ Reusado |
| `joinCommunity` | Ação de participar | ✅ Reusado |
| `deriveCommunityMembershipState` | Permissões | ✅ Reusado |
| `useMyCommunityMembership` | Membership do user | ✅ Reusado |
| `useAuth` (FirebaseAuthContext) | Auth state | ✅ Reusado |
| `useToast` | Feedback de ações | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `parseTimestamp` (util) | Datas relativas | ✅ Reusado |
| `UserAvatar`, `EmptyState`, `Skeleton` | UI base | ✅ Reusados |
| `Seo` | Meta tags | ✅ Reusado |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks existentes)

### Componentes reaproveitados
- 5 (UserAvatar, EmptyState, Skeleton, Badge, Button, Seo)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| Comunidade não existe | EmptyState com retry + "Ver todas" |
| User não logado + click "Participar" | Toast "Faça login" |
| User membro + sem permissão admin | Tab "Gestão" escondida |
| Sem posts | EmptyState "Mural vazio" |
| Sem eventos | EmptyState "Nenhum evento próximo" |
| Sem equipe | Seção Equipe não renderiza |
| Sem tags | Seção Tags não renderiza |
| Cover URL quebrada | Gradient fallback (mesma cor do hero) |
| Mobile 360px | Stack vertical, stats 3 colunas |
| Desktop 1280px | Hero 2 colunas, stats 3 cards no hero |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | EmptyState fallback |
| Offline | Error state com retry |
| Legacy URL `?tab=mural` | Backward compat (mapeia para `content:mural`) |

---

## 11. Testes

### Unitários (TODO)
- `src/modules/communities/pages/CommunityDetail.v3.test.jsx`: render, tabs, join, error

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, stats 3 colunas
- [x] Tablet 768px: hero centralizado, tabs full
- [x] Desktop 1280px: hero 2 colunas, stats no hero
- [x] Dark mode: tokens trocam, gradient mantém
- [x] Gradient dinâmico: 6 paletas (verificar hash)
- [x] Tabs 2-layer: mural/forum/eventos/sobre/equipe
- [x] Tabs: URL state `?tab=content:mural` funciona
- [x] Tabs: legacy `?tab=mural` ainda funciona
- [x] Join: requer login
- [x] Join: toast de sucesso/erro
- [x] Admin: vê tab "Gestão"
- [x] Não-membro: vê CTA "Junte-se a..."
- [x] Error: retry funciona
- [x] Not found: "Comunidade não encontrada"
- [x] Mural preview: top 3, pinned primeiro
- [x] Próximo evento: countdown
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Visualizações | GA4 page view | 100% |
| Conversão Participar | GA4 event | ≥ 25% |
| Cliques em previews | GA4 event | ≥ 30% |
| Lighthouse mobile | PageSpeed | ≥ 90 |
| Lighthouse a11y | PageSpeed | ≥ 95 |
| Schema Organization | Schema.org validator | 100% |

---

## 13. Decisões Tomadas (D-COMMUNITY-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-COMMUNITY-V3-01 | Hero impactante com gradient DINÂMICO | Cada comunidade tem cor única |
| D-COMMUNITY-V3-02 | 3 stat cards (Membros/Posts/Eventos) | Visão geral do ecossistema |
| D-COMMUNITY-V3-03 | 2-layer tabs com URL state | Deep linking + browser back |
| D-COMMUNITY-V3-04 | Mural preview (top 3) | Mostra valor sem trocar de tab |
| D-COMMUNITY-V3-05 | Próximo evento em destaque | Discovery de eventos |
| D-COMMUNITY-V3-06 | Stats detalhadas no "Sobre" | Insights da comunidade |
| D-COMMUNITY-V3-07 | Equipe no "Sobre" (top 3) | Reconhecimento dos líderes |
| D-COMMUNITY-V3-08 | CTA "Junte-se" só para não-membros | UX: não polui para membros |
| D-COMMUNITY-V3-09 | Error state com retry | V1 só tinha `toast.error` |
| D-COMMUNITY-V3-10 | Loading skeleton idêntico | V1 só tinha 1 skeleton genérico |
| D-COMMUNITY-V3-11 | JSON-LD Organization schema | SEO: rich results Google |
| D-COMMUNITY-V3-12 | Dark mode com tokens DS-V2 | Padrão plataforma |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-COMMUNITY-DETAIL-1 | Hero impactante com gradient dinâmico | 1.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-2 | 3 stat cards (Membros/Posts/Eventos) | 1h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-3 | 2-layer tabs com URL state | 1.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-4 | Mural preview (top 3 posts) | 1.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-5 | Próximo evento em destaque | 1h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-6 | Sobre (descrição + stats + equipe + tags) | 1.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-7 | CTA "Junte-se" para não-membros | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-8 | Error state com retry | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-9 | Loading skeleton completo | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-10 | JSON-LD Organization schema | 0.5h | ✅ Feito |
| TASK-V3-COMMUNITY-DETAIL-11 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-COMMUNITY-DETAIL-12 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 21:30 | Análise V1 (287 linhas, 5 tabs + cover) |
| 2026-07-19 21:30 | V3 implementada (40KB, 5 sub-componentes) |
| 2026-07-19 21:30 | Regência preenchida (15 seções) |
| 2026-07-19 21:30 | Deploy + SCRUM update |
