# Documento de Regência — CLUB_DETAIL V3

> **Status**: ✅ DEPLOYED (TASK-V3-CLUB-DETAIL)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | CLUB_DETAIL |
| Rota | `/organizacoes/:orgId` |
| Componente V3 | `src/modules/organizations/pages/ClubDetail.v3.jsx` (46KB) |
| Wrapper | `src/modules/organizations/pages/ClubDetail.jsx` |
| Fallback V1 | `src/modules/organizations/pages/ClubDetail.v1.jsx` (mantido, 273 linhas) |
| Flag V3 | `V3_PAGE_CLUB_DETAIL` (default OFF) |
| Auth | Pública (visualização) / logado (pedir para ingressar) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_CLUB_DETAIL) === true → <PageV3 /> (lazy)
2. Senão                                       → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Exibir ONG completa | Visualizações | 100% |
| O2 | Conversão para "Pedir para ingressar" | Cliques CTA | ≥ 25% |
| O3 | Conversão para "Quero adotar" | Cliques em pets | ≥ 30% |
| O4 | Mobile-first | Lighthouse mobile | ≥ 90 |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O6 | SEO com contactPoint | Schema Organization | 100% |

### Anti-objetivos

- **AO1**: NÃO esconder "Pedir para ingressar" atrás de menu
- **AO2**: NÃO exigir login para ver a ONG
- **AO3**: NÃO quebrar tabs 2-layer

---

## 2. Estrutura Visual

### S1 — Hero impactante
- Gradient **dinâmico** baseado no `club.id` (6 paletas)
- Botão "Voltar" + Botão "Painel" (se admin)
- Badge "ONG" com Building2
- H1: nome da ONG
- Descrição (se houver)
- Metadados: cidade/UF, fundada em, badge "Membro"
- 2 CTAs primários: "Pedir para ingressar" (não-membro) / "Painel" (membro) + "Ver animais"
- 4 stat cards decorativos (desktop only): Animais, Membros, Eventos, Doações
- Mobile: 4 stat cards em grid 2 colunas

### S2 — Stats (mobile)
- 4 stat cards: Animais (emerald), Membros (primary), Eventos (violet), Doações (amber)

### S3 — Tabs 2-layer
- Grupo 1: Conteúdo (sempre visível)
  - Sub-pills: Visão Geral, Animais, Mural, Doações, Voluntários, Equipe
- Grupo 2: Gestão (só admin)
  - Sub-pills: Painel
- URL state: `?tab=group:sub`
- Tabs ativas: `bg-primary text-primary-foreground`
- Backward compat: aceita `?tab=general` (legacy single-key)

### S4 — Tab content
- **Visão Geral**:
  1. Descrição completa
  2. Estatísticas detalhadas (4 cards: Animais/Membros/Eventos/Doações)
  3. Contato (email/telefone/website/instagram/facebook)
  4. Tags (se houver)
- **Animais**: top 3 pets em destaque (grid 2/3) + CTA "Ver todos"
- **Mural**: EmptyState com CTA "Acessar mural"
- **Doações**: top 1 doação ativa (com barra de progresso) + CTA "Ver todos"
- **Voluntários**: EmptyState com CTA "Quero ser voluntário"
- **Equipe**: top 3 membros (com badge Crown para o líder)
- **Painel** (admin only): EmptyState com CTA "Acessar painel"

### S5 — CTA Final (não-membro)
- Gradient (mesma cor do hero)
- Ícone Heart
- H2: "Ajude [nome]"
- 2 CTAs: "Pedir para ingressar" / "Ver outras ONGs"

### Loading
- 1 hero skeleton + 4 stats skeleton + 1 tab bar skeleton + 1 content skeleton

### Error / Not Found
- AlertCircle + título "ONG não encontrada"
- 2 botões: "Tentar de novo" / "Ver todas as ONGs"

### Indisponível
- Building2 + título "Organização indisponível"
- "Esta organização foi removida temporariamente do diretório público."

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-3xl sm:text-4xl lg:text-5xl` | Nome da ONG |
| H2 (CTA) | `text-2xl sm:text-3xl` | "Ajude [nome]" |
| H2 (tab) | `text-lg sm:text-xl` | "Animais para adoção" |
| H3 (artigo) | `text-lg font-bold` | "Sobre a ONG" |
| H4 (card) | `text-sm font-semibold` | Nome do pet/membro |
| Body | `text-base` | Descrição da ONG |
| Description | `text-sm` | Texto de posts |
| Metadata | `text-xs` | city/date/metadata |
| Contact | `text-sm font-medium` | Email/phone |

---

## 4. Paleta de Cores (DS-V2)

### Gradient dinâmico (6 opções baseadas em hash do clubId):
- `from-emerald-500 via-teal-600 to-cyan-600`
- `from-amber-500 via-orange-600 to-red-600`
- `from-rose-500 via-pink-600 to-fuchsia-600`
- `from-sky-500 via-indigo-600 to-violet-600`
- `from-violet-500 via-fuchsia-600 to-rose-600`
- `from-cyan-500 via-sky-600 to-blue-600`

### Tokens fixos:
- `bg-card` — Cards de stat, pets, equipe, contato
- `text-foreground` — Texto principal
- `text-muted-foreground` — Labels, sub
- `bg-primary/10` — Active state, badges
- `bg-emerald-100` — Badge "Membro"
- `bg-amber-500` — Tab "Gestão" active
- `from-amber-400 to-orange-500` — Doação gradient

---

## 5. Estados Comportamentais

### Loading
- Skeleton com layout idêntico ao final

### Not found / Error
- Card vermelho com retry

### Indisponível
- Card cinza com "removida temporariamente"

### Visitante (não logado)
- Vê tudo
- Botão "Pedir para ingressar" leva a login (com toast)

### Membro
- Badge "Membro" no hero
- CTA "Painel"
- Pode acessar painel admin

### Admin
- Botão "Painel" no hero
- Tab "Gestão" visível
- Stats avançadas

### Tabs
- 2-layer: `?tab=group:sub`
- Backward compat: aceita `?tab=general` (legacy)
- `replace: true` para não poluir histórico

### Gradient dinâmico
- `pickGradient(clubId)` retorna 1 de 6 paletas
- Hash determinístico

### Pet card
- 2/3 colunas
- Imagem quadrada (aspect-square) ou fallback gradient
- Nome + breed + badges (species/status)

### Donation card
- 1 coluna
- Title + description
- Barra de progresso (raised/goal)

### Contato
- Grid 1/2 colunas
- Email (mailto), Phone (tel), Website (https), Instagram/Facebook (link)

### Mobile
- Stack vertical
- Stats em grid 2 colunas
- Tabs em scroll horizontal

### Desktop
- Hero 2 colunas
- Stats 4 cards no hero
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
| Bundle V3 chunk | < 50KB | ~46KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Skeleton com layout idêntico ao final
- `Promise.all` para carregar club + members em paralelo
- `.catch(() => [])` em listagens (degrada gracefully)
- `useMemo` para permissions, stats, topPets, nextEvent, team, jsonLd
- Gradient determinístico

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
| Screen reader | Estados announces |
| JSON-LD | `NGO` schema com contactPoint + sameAs |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA |

---

## 8. SEO

```html
<title>[Nome] — ONG Viralata</title>
<meta name="description" content="[Descrição da ONG]" />
```

- **Canonical**: `/organizacoes/:orgId`
- **JSON-LD**: `NGO` schema (com foundingDate, address, contactPoint, sameAs)
- **Open Graph**: `og:title` "[Nome] — ONG Viralata", `og:image` (logo/cover)

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `getClub` (clubService) | Dados da ONG | ✅ Reusado |
| `listClubMembers` (clubService) | Membros | ✅ Reusado |
| `isClubPubliclyVisible` (directory) | Visibilidade | ✅ Reusado |
| `useMyMembership` (useClubs) | Membership | ✅ Reusado |
| `useMyJoinRequests` | Requests existentes | ✅ Reusado |
| `isClubOwner`, `hasClubPermission` (permissions) | Permissões | ✅ Reusado |
| `useAuth` (FirebaseAuthContext) | Auth state | ✅ Reusado |
| `useToast` | Feedback de ações | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `parseTimestamp` (util) | Datas | ✅ Reusado |
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
| ONG não existe | EmptyState com retry + "Ver todas" |
| ONG indisponível publicamente | EmptyState "removida temporariamente" |
| User não logado + click "Pedir para ingressar" | Toast "Faça login" |
| User membro + sem permissão admin | Tab "Gestão" escondida |
| Sem pets | EmptyState "Nenhum animal disponível" |
| Sem doações | EmptyState "Nenhum chamado ativo" |
| Sem equipe | EmptyState "Equipe não divulgada" |
| Sem tags | Seção Tags não renderiza |
| Sem contato | Seção Contato não renderiza |
| Pet sem foto | Fallback gradient com PawPrint |
| Cover URL quebrada | Gradient fallback |
| Mobile 360px | Stack vertical, stats 2 colunas |
| Desktop 1280px | Hero 2 colunas, stats 4 cards no hero |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | EmptyState fallback |
| Offline | Error state com retry |
| Legacy URL `?tab=general` | Backward compat |

---

## 11. Testes

### Unitários (TODO)
- `src/modules/organizations/pages/ClubDetail.v3.test.jsx`: render, tabs, request, error

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, stats 2 colunas
- [x] Tablet 768px: hero centralizado, tabs full
- [x] Desktop 1280px: hero 2 colunas, stats no hero
- [x] Dark mode: tokens trocam, gradient mantém
- [x] Gradient dinâmico: 6 paletas
- [x] Tabs 2-layer: 6 sub-pills
- [x] Tabs: URL state funciona
- [x] Tabs: legacy `?tab=general` ainda funciona
- [x] Request: requer login
- [x] Request: toast de sucesso/erro
- [x] Admin: vê tab "Gestão"
- [x] Não-membro: vê CTA "Ajude [nome]"
- [x] Error: retry funciona
- [x] Not found: "ONG não encontrada"
- [x] Indisponível: "removida temporariamente"
- [x] Pet card: imagem ou fallback
- [x] Donation: barra de progresso
- [x] Contato: email/tel/website/social
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Visualizações | GA4 page view | 100% |
| Conversão Ingressar | GA4 event | ≥ 25% |
| Cliques em pets | GA4 event | ≥ 30% |
| Lighthouse mobile | PageSpeed | ≥ 90 |
| Lighthouse a11y | PageSpeed | ≥ 95 |
| Schema NGO | Schema.org validator | 100% |

---

## 13. Decisões Tomadas (D-CLUB-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-CLUB-V3-01 | Hero impactante com gradient DINÂMICO | Cada ONG tem cor única |
| D-CLUB-V3-02 | 4 stat cards (Animais/Membros/Eventos/Doações) | Visão geral do ecossistema |
| D-CLUB-V3-03 | 2-layer tabs com URL state | Deep linking + browser back |
| D-CLUB-V3-04 | Pets em destaque (top 3) | Mostra animais sem trocar tab |
| D-CLUB-V3-05 | Próximo evento em destaque | Discovery de eventos |
| D-CLUB-V3-06 | Doação ativa com barra de progresso | Transparência de arrecadação |
| D-CLUB-V3-07 | Contato (email/tel/website/social) | Informações práticas |
| D-CLUB-V3-08 | Equipe em destaque (top 3) | Reconhecimento dos líderes |
| D-CLUB-V3-09 | CTA "Pedir para ingressar" só para não-membros | UX: não polui para membros |
| D-CLUB-V3-10 | Error state com retry | V1 só tinha 1 EmptyState |
| D-CLUB-V3-11 | JSON-LD NGO com contactPoint + sameAs | SEO: rich results Google |
| D-CLUB-V3-12 | Dark mode com tokens DS-V2 | Padrão plataforma |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-CLUB-DETAIL-1 | Hero impactante com gradient dinâmico | 1.5h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-2 | 4 stat cards (Animais/Membros/Eventos/Doações) | 1h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-3 | 2-layer tabs com URL state | 1.5h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-4 | Pets em destaque (top 3) | 1.5h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-5 | Próximo evento em destaque | 1h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-6 | Doação ativa com barra de progresso | 1h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-7 | Contato (email/tel/website/social) | 1h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-8 | Equipe em destaque (top 3) | 1h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-9 | CTA "Ajude" para não-membros | 0.5h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-10 | Error state com retry | 0.5h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-11 | Loading skeleton completo | 0.5h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-12 | JSON-LD NGO schema | 0.5h | ✅ Feito |
| TASK-V3-CLUB-DETAIL-13 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-CLUB-DETAIL-14 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 22:00 | Análise V1 (273 linhas, 7 tabs + cover) |
| 2026-07-19 22:00 | V3 implementada (46KB, 8 sub-componentes) |
| 2026-07-19 22:00 | Regência preenchida (15 seções) |
| 2026-07-19 22:00 | Deploy + SCRUM update |
