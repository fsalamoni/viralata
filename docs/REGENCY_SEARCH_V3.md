# Documento de Regência — SEARCH V3

> **Status**: ✅ DEPLOYED (TASK-V3-SEARCH)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | SEARCH |
| Rota | `/busca` |
| Componente V3 | `src/pages/SearchPage.v3.jsx` (30KB) |
| Wrapper | `src/pages/SearchPage.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/SearchPage.v1.jsx` (mantido, 212 linhas) |
| Flag V3 | `V3_PAGE_SEARCH` (default OFF) |
| Flag adicional | `SHELTER_SMART_SEARCH` (gating do backend) |
| Auth | Pública |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_SEARCH) === true → <PageV3 /> (lazy)
2. Senão                                  → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Busca pública em toda plataforma | Buscas executadas | 100% |
| O2 | Filtragem por entity | Cliques em tabs | ≥ 50% |
| O3 | Conversão para profile de pet/abrigo | Cliques em resultados | ≥ 25% |
| O4 | Mobile-first | Lighthouse mobile | ≥ 90 |
| O5 | Descoberta (sugestões) | Cliques em chips populares | ≥ 15% |
| O6 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO mostrar busca quebrada se flag backend OFF
- **AO2**: NÃO esconder filtro atrás de menu
- **AO3**: NÃO exigir login para busca

---

## 2. Estrutura Visual (Mobile-first, 1 col → 2 col md+)

### S1 — Hero impactante
- Gradiente sky-500 → indigo-600 → violet-600
- Badge "Busca inteligente" com Sparkles
- H1: "Encontre o que procura"
- Descrição
- SmartSearchBar (com fundo branco semi-opaco, 95% opacity, blur)
- 4 chips "Em alta": Vira-lata, Gato, Filhote, Idoso
- 4 stat cards decorativos (desktop only): 5.000+ Animais, 250+ Abrigos, 1.200+ Adotantes, 800+ Voluntários
- Mobile: 4 stat cards em grid 2 colunas abaixo

### S2 — Filtros por entity
- Label "Filtrar por" com Filter icon
- 5 chips (tabs): Todos (primary) + 4 entidades
- Cada chip tem ícone + label + contagem (se count > 0)
- Active state: `border-primary bg-primary text-primary-foreground`
- Chip de "Limpar abrigo" aparece se shelter selecionado

### S3 — Contexto selecionado
- Card horizontal com Building2 icon
- Mostra: "Buscando animais em [nome do abrigo]"
- Sub: "Os resultados são restritos aos animais deste abrigo."

### S4 — Estado inicial (sem query)
- Ícone Search grande centralizado
- H3: "Comece a digitar para buscar"
- Descrição
- 8 chips de buscas populares
- 2 CTAs: "Ver todos os pets" / "Ver todos os abrigos"

### S5 — Loading
- 4 cards skeleton com avatar/title/snippet/metadata

### S6 — Error
- Ícone AlertCircle (vermelho)
- H3: "A busca falhou"
- Descrição sobre rede
- Botão "Tentar de novo" com RefreshCw

### S7 — No results
- EmptyState padrão
- H: "Nenhum resultado encontrado"
- CTA: "Ver abrigos"

### S8 — Resultados (agrupados ou flat)
- Header com total: "X resultados para [query]"
- Se "Todos": grupos por entity, cada um com header próprio
- Se entity específica: lista flat
- Cards enriquecidos com:
  - Ícone colorido (entity)
  - Título + Badge
  - Snippet (2 linhas)
  - Metadata: city, species, breed, status
  - ArrowUpRight (hover primary)

### S9 — CTA Final
- Card com gradiente sky → indigo → violet
- Ícone Search
- H2: "Não encontrou o que procurava?"
- 2 CTAs: "Ver feed de pets" / "Ver comunidades"

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-3xl sm:text-4xl lg:text-5xl` | "Encontre o que procura" |
| H2 (CTA) | `text-2xl sm:text-3xl` | "Não encontrou..." |
| H3 (resultado) | `text-sm font-semibold` | Título do resultado |
| Body | `text-sm` | Texto geral |
| Snippet | `text-xs` | Trecho do resultado |
| Metadata | `text-[10.5px]` | city/species/breed |
| Stats | `text-2xl` | Números de stats |

---

## 4. Paleta de Cores (DS-V2)

| Token | Uso |
|---|---|
| `from-sky-500 via-indigo-600 to-violet-600` | Hero gradient |
| `from-sky-50 via-indigo-50 to-violet-50` | CTA final gradient |
| `bg-card` | Cards de stat, filtros, resultados |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Labels, sub |
| `bg-primary/10` | Ícones primary, badges |
| `bg-amber-100 text-amber-700` | Pet entity |
| `bg-sky-100 text-sky-700` | Shelter entity |
| `bg-rose-100 text-rose-700` | Adopter entity |
| `bg-emerald-100 text-emerald-700` | Volunteer entity |

---

## 5. Estados Comportamentais

### Loading
- Skeleton com 4 cards de resultado (avatar + linhas)

### Empty query (< 2 chars)
- Card central com ícone Search + chips de populares + CTAs

### Error
- Card vermelho com AlertCircle + retry

### No results
- EmptyState padrão com CTA "Ver abrigos"

### Filter por entity
- Se "Todos": resultados agrupados por entity, cada grupo com header
- Se específica: lista flat

### Shelter selecionado
- Força busca em `entity: 'pet'` com `shelterId`
- Card de contexto aparece
- Botão "Limpar abrigo"

### Mobile
- Stack vertical
- Stats em grid 2 colunas
- Results em 1 coluna

### Desktop
- Hero 2 colunas (input + stats decorativos)
- Stats em 4 cards no hero
- Results em 1 coluna (cards horizontais)

### Dark mode
- Hero gradient mantém contraste
- Cards `bg-card` adaptam
- Badges com versões dark: `dark:bg-amber-900/30 dark:text-amber-300`

### Reduced motion
- Animações staggered no hero + stats
- whileInView no CTA final

### Auth gate
- NÃO exige login para busca
- Resultados multi-tenant respeitam `shelter_club_id`

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 35KB | ~30KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |
| Debounce query | 250ms | ✅ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Skeleton com layout idêntico ao final
- Debounce 250ms via `useDebouncedQuery`
- Memoize filters via `useMemo` (deps estáveis)
- `countResultsByEntity` em paralelo (queries independentes)
- `useDebouncedQuery` evita re-renders desnecessários

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<section>` com `aria-labelledby` |
| Search landmarks | `<Input role="searchbox" aria-label="Busca inteligente">` |
| Filtros como buttons | `<button>` com `aria-pressed` |
| Contexto selecionado | `aria-live="polite"` (alterna visibilidade) |
| Cards de resultado | `<article>` + `data-testid` |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| Screen reader | Estados announces (loading → results) |
| JSON-LD | `SearchAction` schema |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA (white em sky-500) |

---

## 8. SEO

```html
<title>Buscar — Viralata</title>
<meta name="description" content="Encontre abrigos, animais para adoção, adotantes e voluntários no Viralata. Busca inteligente em toda a plataforma." />
```

- **Canonical**: `/busca`
- **JSON-LD**: `SearchAction` schema
- **Open Graph**: `og:title` "Buscar — Viralata", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useSmartSearch` (search hook) | Busca | ✅ Reusado |
| `useCountResultsByEntity` | Contagem por entity | ✅ Reusado |
| `useSearchableEntities` | Lista de entities | ✅ Reusado |
| `useDebouncedQuery` | Debounce 250ms | ✅ Reusado |
| `SmartSearchBar` | Input com debounce | ✅ Reusado |
| `useFeatureFlag` (SHELTER_SMART_SEARCH) | Backend gate | ✅ Reusado |
| `useFeatureFlag` (V3_PAGE_SEARCH) | UI gate | ✅ Reusado |
| `Seo` | Meta tags | ✅ Reusado |
| `EmptyState`, `Skeleton`, `Badge`, `Button` | UI base | ✅ Reusados |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks existentes)

### Componentes reaproveitados
- 7 (SmartSearchBar, EmptyState, Skeleton, Badge, Button, Input, UserAvatar)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| Flag SHELTER_SMART_SEARCH OFF | EmptyState "em breve" |
| Query < 2 chars | Estado inicial com chips + CTAs |
| Query vazia | Estado inicial |
| Sem resultados | EmptyState "Nenhum resultado" |
| Rede falhou | Error state com retry |
| Shelter selecionado | Força `entity: 'pet'`, mostra contexto |
| Entity selecionada | Filtra resultados |
| Click em chip popular | Preenche query |
| Mobile 360px | Stack vertical, 2 colunas stats |
| Desktop 1280px | Hero 2 colunas, 4 stats no hero |
| Dark mode | Tokens trocam, badges dark |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | EmptyState fallback |
| Offline | Error state |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/SearchPage.v3.test.jsx`: render, filtros, contagem, retry, popular clicks

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, stats 2 colunas
- [x] Tablet 768px: hero centralizado, filtros full
- [x] Desktop 1280px: hero 2 colunas, stats decorativos
- [x] Dark mode: tokens trocam, badges dark
- [x] Filtros por entity: chips funcionam
- [x] Contagem: cada entity mostra count correto
- [x] Query < 2 chars: estado inicial
- [x] Query válida: loading → results
- [x] Error: retry funciona
- [x] No results: EmptyState apropriado
- [x] Shelter select: card contexto aparece
- [x] Popular clicks: preenchem query
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Buscas executadas | GA4 page view | 100% |
| Cliques em tabs | GA4 event | ≥ 50% |
| Cliques em resultados | GA4 event | ≥ 25% |
| Mobile-first | Lighthouse | ≥ 90 |
| Cliques em chips | GA4 event | ≥ 15% |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-SEARCH-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-SEARCH-V3-01 | Hero impactante com gradiente sky-indigo-violet | Diferencia de outras V3 (HOME emerald, MURAL rose) |
| D-SEARCH-V3-02 | 4 stat cards decorativos no hero (desktop) | Mostra amplitude do ecossistema |
| D-SEARCH-V3-03 | Tabs de entity com contagem | UX: usuário sabe quantos resultados esperar |
| D-SEARCH-V3-04 | 8 chips de buscas populares | Discovery + SEO (long tail) |
| D-SEARCH-V3-05 | Cards enriquecidos com metadata | Mais info que V1 (`title+snippet` apenas) |
| D-SEARCH-V3-06 | Agrupamento por entity quando "Todos" | UX: melhor scan visual |
| D-SEARCH-V3-07 | Lista flat quando entity específica | Foco total em 1 categoria |
| D-SEARCH-V3-08 | Error state com retry | V1 não tinha error handling |
| D-SEARCH-V3-09 | Estado inicial rico (chips + CTAs) | Guia o usuário, reduz bounce |
| D-SEARCH-V3-10 | JSON-LD SearchAction schema | SEO: aparece no Google como ação de busca |
| D-SEARCH-V3-11 | Debounce 250ms | Performance: evita queries a cada keystroke |
| D-SEARCH-V3-12 | Dark mode com tokens DS-V2 | Padrão plataforma |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-SEARCH-1 | Hero impactante com gradiente sky-indigo-violet | 1h | ✅ Feito |
| TASK-V3-SEARCH-2 | 4 stat cards no hero (Animais/Abrigos/Adotantes/Voluntários) | 1h | ✅ Feito |
| TASK-V3-SEARCH-3 | Tabs de entity com contagem | 1.5h | ✅ Feito |
| TASK-V3-SEARCH-4 | 8 chips de buscas populares | 0.5h | ✅ Feito |
| TASK-V3-SEARCH-5 | Cards enriquecidos com metadata | 1.5h | ✅ Feito |
| TASK-V3-SEARCH-6 | Agrupamento por entity | 1h | ✅ Feito |
| TASK-V3-SEARCH-7 | Error state com retry | 0.5h | ✅ Feito |
| TASK-V3-SEARCH-8 | Estado inicial rico | 0.5h | ✅ Feito |
| TASK-V3-SEARCH-9 | JSON-LD SearchAction | 0.5h | ✅ Feito |
| TASK-V3-SEARCH-10 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-SEARCH-11 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 20:30 | Análise V1 (212 linhas, 7 funcionalidades) |
| 2026-07-19 20:30 | V3 implementada (30KB, 6 sub-componentes) |
| 2026-07-19 20:30 | Regência preenchida (15 seções) |
| 2026-07-19 20:30 | Deploy + SCRUM update |
