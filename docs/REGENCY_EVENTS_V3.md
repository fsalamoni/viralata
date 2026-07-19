# Documento de Regência — EVENTS V3

> **Status**: ✅ DEPLOYED (TASK-V3-EVENTS)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | EVENTS |
| Rota | `/eventos` |
| Componente V3 | `src/pages/EventsUnified.v3.jsx` (36KB) |
| Wrapper | `src/pages/EventsUnified.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/EventsUnified.v1.jsx` (mantido, 313 linhas) |
| Flag V3 | `V3_PAGE_EVENTS` (default OFF) |
| Auth | Pública |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_EVENTS) === true → <PageV3 /> (lazy)
2. Senão                                  → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Feed unificado eventos | Eventos visíveis | 100% |
| O2 | Filtros funcionais (tipo/data/cidade/UF) | Uso | ≥ 50% |
| O3 | Conversão para detalhe | Cliques em cards | ≥ 30% |
| O4 | Descoberta (cidades populares) | Cliques em chips | ≥ 20% |
| O5 | Destaque da semana | CTR featured | ≥ 35% |
| O6 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO mostrar mural sem filtro "Próximos" como default
- **AO2**: NÃO exigir login
- **AO3**: NÃO esconder filtros atrás de menu

---

## 2. Estrutura Visual

### S1 — Hero impactante
- Gradiente violet-500 → fuchsia-600 → rose-600
- Badge "Agenda colaborativa" com CalendarDays
- H1: "Eventos da comunidade"
- Descrição
- 2 CTAs: "Ver comunidades" / "Ver abrigos"
- 3 stat cards decorativos (desktop only): Futuros, Hoje, Próximos 7 dias
- Mobile: 3 stat cards horizontais abaixo

### S2 — Stats (mobile)
- 3 stat cards: Futuros (primary), Hoje (amber), 7 dias (rose)

### S3 — Featured Event
- Card horizontal com gradiente (cor por tipo)
- Coluna 1: ícone + label + data completa + hora
- Coluna 2: badge "Destaque da semana" + título + descrição + cidade + organizador
- CTA inline "Ver detalhes"

### S4 — Filtros (grid 1/2/4)
- Label "Filtros" com Filter icon
- 4 colunas: Tipo, Quando, Cidade, UF
- Tipo: 3 chips (Todos/Vitrines/Comunidades) com contagem
- Quando: 3 chips (Próximos/Hoje/Todos)
- Cidade: Input com clear button
- UF: chips dos estados disponíveis
- Linha inferior: cidades populares (8 chips clicáveis)
- Contador: "X eventos encontrados (filtros)"

### S5 — Loading
- 6 cards skeleton com header + body + footer

### S6 — Error
- Ícone AlertCircle
- H3: "Não foi possível carregar os eventos"
- Botão "Tentar de novo" com RefreshCw

### S7 — No results
- EmptyState padrão
- H: "Nenhum evento encontrado"
- Descrição contextual (com/sem filtros)
- CTA: "Limpar filtros" (só se há filtros)

### S8 — Resultados
- Header gradiente 2px (cor por tipo: emerald=vitrine, violet=comunidade)
- Badges: tipo + "Hoje" (se aplicável) + "Em N dias" (se 1-7 dias)
- Título (2 linhas)
- Description (2 linhas, opcional)
- Footer: data + hora, cidade/UF, organizador
- Hover: "Ver detalhes" + arrow

### S9 — CTA Final
- Card com gradiente violet → fuchsia → rose
- Ícone PartyPopper
- H2: "Organize um evento na sua cidade"
- 2 CTAs: "Ver comunidades" / "Ver abrigos"

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-3xl sm:text-4xl lg:text-5xl` | "Eventos da comunidade" |
| H2 (CTA) | `text-2xl sm:text-3xl` | "Organize um evento..." |
| H3 (featured) | `text-xl sm:text-2xl` | Título do featured |
| H3 (card) | `text-sm sm:text-base font-semibold` | Título do evento |
| Body | `text-sm` | Texto geral |
| Description | `text-xs` | Subtítulo |
| Metadata | `text-xs` | city/date/organizer |
| Stats | `text-2xl sm:text-3xl` | Números de stats |

---

## 4. Paleta de Cores (DS-V2)

| Token | Uso |
|---|---|
| `from-violet-500 via-fuchsia-600 to-rose-600` | Hero gradient |
| `from-violet-50 via-fuchsia-50 to-rose-50` | CTA final gradient |
| `from-emerald-400 to-teal-500` | Header de card vitrine |
| `from-violet-400 to-fuchsia-500` | Header de card comunidade |
| `bg-card` | Cards de stat, filtros, eventos |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Labels, sub |
| `bg-emerald-100 text-emerald-800` | Badge Vitrine |
| `bg-violet-100 text-violet-800` | Badge Comunidade |
| `bg-amber-100 text-amber-800` | Badge "Hoje" |

---

## 5. Estados Comportamentais

### Loading
- 6 cards skeleton

### Error
- Card vermelho com retry

### Empty (sem filtros)
- EmptyState "Nenhum evento cadastrado"

### Empty (com filtros)
- EmptyState com CTA "Limpar filtros"

### Filtros
- Default: type='all', date='upcoming' (mostra só eventos futuros)
- Combinação lógica: tipo + quando + cidade + estado
- Sort: data ascendente (mais próximo primeiro)
- Featured: sempre o próximo evento futuro (ignora filtros)

### Cidades populares
- Mostra até 8 cidades com base nos eventos disponíveis
- Click preenche filtro de cidade

### Estados
- Mostra apenas estados que têm eventos
- Se vazio, mostra 5 estados populares como hint (dashed border)

### Featured event
- Sempre 1 evento (o próximo futuro mais próximo)
- Se featured está nos resultados filtrados, ainda aparece no topo

### Mobile
- Stack vertical
- Stats em grid 3 colunas
- Filtros em grid 1 coluna
- Cards em 1 coluna

### Desktop
- Hero 2 colunas
- Stats 3 cards no hero
- Filtros em grid 4 colunas
- Cards em grid 3 colunas

### Dark mode
- Hero gradient mantém contraste
- Cards `bg-card` adaptam
- Badges com versões dark
- Featured mantém gradientes (cores vibrantes no dark)

### Reduced motion
- Animações staggered no hero + stats
- whileInView no featured + CTA final

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 40KB | ~36KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton + grid estável) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Skeleton com layout idêntico ao final
- `useMemo` para filtros (deps estáveis)
- `Promise.all` para carregar exhibitions + community events em paralelo
- `.catch(() => [])` no mural (degrada gracefully)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<section>` com `<motion.section>` |
| Filtros como buttons | `<button>` com `aria-pressed` |
| Contexto ativo | `aria-live="polite"` no contador |
| Cards | `<article>` + `data-testid` |
| Hover de CTA | `opacity-0 group-hover:opacity-100` + transição |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| Screen reader | Loading → results announces |
| JSON-LD | `ItemList` de `Event` |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA |

---

## 8. SEO

```html
<title>Eventos da comunidade — Viralata</title>
<meta name="description" content="Vitrines de abrigos e eventos de comunidades em um só lugar. Encontre feiras de adoção, mutirões de castração e eventos pet friendly." />
```

- **Canonical**: `/eventos`
- **JSON-LD**: `ItemList` com até 10 `Event` schemas
- **Open Graph**: `og:title` "Eventos da comunidade", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `listPublicExhibitions` (exhibitionPublicService) | Vitrines | ✅ Reusado |
| `listPublicMuralPosts` (publicMuralService) | Eventos de comunidades | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `logger` (core) | Error logging | ✅ Reusado |
| `EmptyState`, `Skeleton`, `Badge`, `Button` | UI base | ✅ Reusados |
| `Seo` | Meta tags | ✅ Reusado |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks existentes)

### Componentes reaproveitados
- 6 (EmptyState, Skeleton, Badge, Button, Input, Seo)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| Sem eventos | EmptyState "Ainda não temos eventos" |
| Mural com erro | `.catch(() => [])` degrada |
| Sem vitrine | Só mostra community events |
| Sem community events | Só mostra vitrines |
| Cidade desconhecida | Filtro não filtra (vazio) |
| Estado desconhecido | Chip não aparece (só disponíveis) |
| Featured ausente | Esconde seção S3 |
| Mobile 360px | Stack vertical, filtros 1 coluna |
| Desktop 1280px | Hero 2 colunas, filtros 4 colunas |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | EmptyState fallback |
| Offline | Error state com retry |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/EventsUnified.v3.test.jsx`: render, filtros, sort, featured, error

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, filtros 1 coluna
- [x] Tablet 768px: hero centralizado, filtros 2 colunas
- [x] Desktop 1280px: hero 2 colunas, stats no hero, filtros 4 colunas
- [x] Dark mode: tokens trocam, featured mantém cor
- [x] Filtros: tipo/when/cidade/UF combinam corretamente
- [x] Sort: data ascendente
- [x] Featured: mostra próximo futuro
- [x] Cidades populares: clicáveis
- [x] Loading: skeleton
- [x] Error: retry funciona
- [x] Empty (sem filtro): EmptyState
- [x] Empty (com filtro): CTA "Limpar filtros"
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Eventos visíveis | GA4 page view | 100% |
| Filtros usados | GA4 event | ≥ 50% |
| Cliques em cards | GA4 event | ≥ 30% |
| Cliques em chips | GA4 event | ≥ 20% |
| CTR featured | GA4 event | ≥ 35% |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-EVENTS-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-EVENTS-V3-01 | Hero impactante com gradiente violet-fuchsia-rose | Diferencia de outras V3 |
| D-EVENTS-V3-02 | 3 stat cards no hero (Futuros/Hoje/7 dias) | Mais útil que "Total" |
| D-EVENTS-V3-03 | Featured event (próximo futuro) | Aumenta CTR do mais próximo |
| D-EVENTS-V3-04 | Filtros em grid 1/4 colunas (mobile/desktop) | Mais filtros sem perder UX |
| D-EVENTS-V3-05 | Cidades populares como chips | Discovery + UX |
| D-EVENTS-V3-06 | UF como chips (só disponíveis) | Reduz ruído |
| D-EVENTS-V3-07 | Header gradiente no card (cor por tipo) | Scan visual rápido |
| D-EVENTS-V3-08 | Badges: tipo + "Hoje" + "Em N dias" | UX: urgency claro |
| D-EVENTS-V3-09 | "Limpar filtros" só com filtros ativos | Empty state contextual |
| D-EVENTS-V3-10 | Default `date='upcoming'` | Mostra só o relevante |
| D-EVENTS-V3-11 | JSON-LD ItemList de Events | SEO: Google Events |
| D-EVENTS-V3-12 | Dark mode com tokens DS-V2 | Padrão plataforma |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-EVENTS-1 | Hero impactante com gradiente violet-fuchsia-rose | 1h | ✅ Feito |
| TASK-V3-EVENTS-2 | 3 stat cards no hero (Futuros/Hoje/7 dias) | 1h | ✅ Feito |
| TASK-V3-EVENTS-3 | Featured event (próximo futuro) | 1.5h | ✅ Feito |
| TASK-V3-EVENTS-4 | Filtros 4 colunas (Tipo/Quando/Cidade/UF) | 1.5h | ✅ Feito |
| TASK-V3-EVENTS-5 | Cidades populares como chips | 0.5h | ✅ Feito |
| TASK-V3-EVENTS-6 | Header gradiente nos cards | 0.5h | ✅ Feito |
| TASK-V3-EVENTS-7 | Badges: tipo + Hoje + Em N dias | 0.5h | ✅ Feito |
| TASK-V3-EVENTS-8 | Error state com retry | 0.5h | ✅ Feito |
| TASK-V3-EVENTS-9 | JSON-LD ItemList Events | 0.5h | ✅ Feito |
| TASK-V3-EVENTS-10 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-EVENTS-11 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 21:00 | Análise V1 (313 linhas, feed unificado) |
| 2026-07-19 21:00 | V3 implementada (36KB, 8 sub-componentes) |
| 2026-07-19 21:00 | Regência preenchida (15 seções) |
| 2026-07-19 21:00 | Deploy + SCRUM update |
