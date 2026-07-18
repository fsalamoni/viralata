# Documento de Regência — FOSTER V3

> **Status**: ✅ DEPLOYED (TASK-V3-FOSTER)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-18

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | FOSTER |
| Rota | `/lares-temporarios/dashboard` |
| Componente V3 | `src/pages/FosterDashboard.v3.jsx` (24KB) |
| Wrapper | `src/pages/FosterDashboard.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/FosterDashboard.v1.jsx` (mantido, 477 linhas) |
| Flag V3 | `V3_PAGE_FOSTER` (default OFF) |
| Auth | Obrigatória |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_FOSTER) === true → <FosterDashboardV3 /> (lazy)
2. Senão                                       → <FosterDashboardV1 />
```

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Acompanhar placements ativos | Visualização do dashboard | ≥ 80% dos LTs |
| O2 | Alertar placements próximos do fim | Cliques em "Devolver" | ≥ 50% dos que vencem |
| O3 | Coletar rating do abrigo | Ratings por encerramento | ≥ 90% |
| O4 | Converter visitante em LT | Cliques em "Quero ser LT" | ≥ 5% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO mostrar dashboard vazio sem CTA para "Quero ser LT"
- **AO2**: NÃO esconder placements próximos do fim
- **AO3**: NÃO permitir encerrar sem rating + motivo

---

## 2. Estrutura Visual (hero + stats + lista)

### S1 — Hero
- Card gradiente emerald→teal com nome do LT
- Badge "Lar Temporário" + ícone Home
- CTA "Ver programa" no canto
- Mobile: stack; Desktop: row

### S2 — 3 stat cards horizontais
- **Pets sob sua guarda** (nº ativos) — ícone PawPrint, cor emerald
- **Próx. do fim (7d)** (placements que vencem em ≤7 dias) — ícone Clock, cor amber
- **Histórico** (placements encerrados) — ícone CheckCircle2, cor primary

### S3 — Filtros (tabs horizontais)
- 4 abas: Ativos / Próx. do fim / Histórico / Todos
- Cada aba com ícone + label + count
- role="tab" + aria-selected

### S4 — Lista de placements
- Cada placement: card com badge de status + nome do pet + abrigo + datas
- Ações contextuais:
  - **Ativos**: Ver pet / Devolver / Encerrar
  - **Histórico**: Ver pet
- Badge "Encerra em X dias" amber se ≤7 dias
- Empty state se filtro vazio

### S5 — Empty LT State (se nunca foi LT)
- Card destacado emerald com ícone Home
- H2: "Você ainda não é Lar Temporário"
- Texto explicativo
- 2 CTAs: "Quero ser Lar Temporário" / "Ver pets para LT"

### S6 — Dialog de Encerramento
- Título: "Encerrar lar temporário"
- Descrição: "Como foi sua experiência cuidando de [pet]?"
- 3 campos: motivo (≥5 chars) / rating (1-5 stars) / feedback (opcional)
- Botão "Confirmar encerramento" só habilitado se motivo ≥5 chars E rating > 0

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-2xl sm:text-3xl` | "Olá, [nome]" |
| H2 (empty) | `text-xl font-extrabold` | "Você ainda não é Lar Temporário" |
| H3 (não usado) | — | — |
| Stat value | `text-3xl font-extrabold` | Números de stats |
| Body | `text-sm` | Descrições |
| Tab label | `text-sm font-medium` | "Ativos", "Próx. do fim" |

---

## 4. Paleta de Cores (DS-V2)

| Token | Uso |
|---|---|
| `bg-emerald-500 via emerald-600 to teal-700` | Hero gradient |
| `bg-card` | Cards de stat, placements |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Labels, sub |
| `bg-emerald-100 text-emerald-700` | Stat icon "sob sua guarda" |
| `bg-amber-100 text-amber-700` | Stat icon "próx. do fim" |
| `bg-primary/10 text-primary` | Stat icon "histórico" |
| `bg-amber-100 text-amber-800 border-amber-300` | Badge "pendente" + "encerra em X dias" |
| `bg-emerald-100 text-emerald-800 border-emerald-300` | Badge "ativo" |
| `bg-purple-100 text-purple-800 border-purple-300` | Badge "adotado via LT" |
| `fill-amber-400 text-amber-400` | Stars selecionadas |
| `text-gray-300` | Stars não selecionadas |
| `border-emerald-300/50 bg-emerald-50/30` | Empty LT state |

---

## 5. Estados Comportamentais

### Loading inicial
- Skeleton de hero + 3 stat cards + filtros + 2 placements
- Layout idêntico ao final (evita CLS)

### Empty LT (nunca foi LT)
- Card destacado com CTA duplo
- Aparece quando `stats.list.length === 0`

### Empty filtro
- Card simples "Nenhum placement neste filtro"
- Aparece quando filtro selecionado não tem matches

### Filtros
- 4 tabs horizontais (Ativos / Próx. do fim / Histórico / Todos)
- role="tab" + aria-selected
- Count em cada aba

### Encerrar placement
- Dialog com validação inline
- Motivo ≥ 5 chars + rating obrigatório (1-5)
- Loading no botão durante submit
- Sucesso: toast + refetch
- Erro: toast de erro

### Devolver placement
- Confirm dialog nativo do browser
- Loading no botão durante submit
- Sucesso: toast

### Reduced motion
- `useReducedMotion()` de framer-motion
- Animações desabilitadas em placements/stats

### Dark mode
- Hero gradient funciona em dark
- Cards `bg-card` adaptam
- `bg-amber-100/800` mantém legibilidade

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 30KB | ~24KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton + lista estável) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- `useFostersList` com cache 30s (staleTime)
- Animações staggered só na primeira render
- Skeleton só no loading inicial
- Stars interativos sem re-render de formulário

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|---|
| Tabs semânticas | `role="tablist"` + `role="tab"` + aria-selected |
| Filtros com count | Visível para screen reader |
| Badge de status | Label textual + dot color (não só cor) |
| Ações por placement | Botões com `aria-label` claro |
| Dialog acessível | Radix Dialog (built-in a11y) |
| Rating acessível | `role="radiogroup"` + `aria-checked` em cada star |
| Stars com label | `aria-label="Avaliar com N estrelas"` |
| Erros inline | `aria-invalid` em Textarea de motivo |
| Reduced motion | `useReducedMotion()` respeitado |
| Foco visível | `focus-visible:ring-2` em todos interativos |
| Navegação por teclado | Tab order natural |
| Screen reader | "Você tem X pets ativos, Y próximos do fim" |

---

## 8. SEO

```html
<title>Lar Temporário — Viralata</title>
<meta name="description" content="Dashboard pessoal do Lar Temporário: acompanhe pets sob sua guarda, devolva ou encerre placements, avalie abrigos." />
```

- **Robots**: `noindex` (dashboard autenticado)
- **Open Graph**: não aplicável

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useAuth` | user, isLoadingAuth | ✅ Reusado |
| `useFostersList` (novo) | Lista placements do user | ✅ NOVO no V3 |
| `useEndFoster` (V1) | Encerrar placement | ✅ Reusado |
| `useReturnFoster` (V1) | Devolver pet | ✅ Reusado |
| `FOSTER_STATUS` (V1) | Status types | ✅ Reusado |
| `fosterDurationDays` (V1) | Cálculo de duração | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `AnimatePresence` (framer) | Não usado (lista é estática) | — |

### Hooks/arquivos criados
- `src/core/hooks/useFostersList.js` (~1KB) — Firestore collection query com cache 30s

### Hooks reaproveitados
- 3 hooks do V1 (useFosters, useEndFoster, useReturnFoster)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag `V3_PAGE_FOSTER` OFF | Wrapper renderiza V1 |
| User não autenticado | Redirect para /login |
| Auth loading | Skeleton |
| Placements loading | Skeleton de hero + stats + lista |
| User nunca foi LT | Empty LT state com CTA duplo |
| Filtro sem matches | Empty state "Nenhum placement neste filtro" |
| Motivo < 5 chars | Erro inline "Mínimo 5 caracteres" |
| Rating não selecionado | Botão "Confirmar" desabilitado |
| Submit error | Toast de erro + mantém dialog aberto |
| Placement próximo do fim (≤7d) | Badge amber "Encerra em X dias" |
| Pet devolvido | Confirm dialog nativo + loading |
| Star keyboard | `role="radio"` + Enter/Space |
| Viewport 360px | Stack vertical, stat cards 1 coluna |
| Viewport 1280px | max-w-4xl, layout horizontal |
| Dark mode | Tokens trocam, contraste mantido |
| Reduced motion | Animações desabilitadas |
| Firestore offline | useFostersList retorna array vazio, UI mostra empty state |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/FosterDashboard.v3.test.jsx`: render com flag ON, stats, filtros, dialog de encerramento, empty LT state

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, hero e stats 1 coluna
- [x] Tablet 768px: stats 3 colunas, filtros visíveis
- [x] Desktop 1280px: max-w-4xl, layout horizontal
- [x] Dark mode: tokens trocam
- [x] Screen reader: tabs announces, status badges
- [x] Tab navigation: ordem lógica
- [x] Reduced motion: animações desabilitadas
- [x] Não autenticado: redirect para login
- [x] Never foi LT: empty state renderiza
- [x] Filtros funcionam: alterna entre Ativos/Histórico/Todos
- [x] Dialog de encerramento: validação inline + submit

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Visualização do dashboard | GA4 page view | ≥ 80% dos LTs |
| Cliques em "Devolver" | GA4 event | ≥ 50% dos que vencem |
| Ratings por encerramento | Firestore | ≥ 90% |
| Cliques em "Quero ser LT" | GA4 event | ≥ 5% |
| Lighthouse a11y | PageSpeed Insights | ≥ 95 |
| Lighthouse perf | PageSpeed Insights | ≥ 85 |

---

## 13. Decisões Tomadas (D-*)

| ID | Decisão | Justificativa |
|---|---|---|
| D-FOSTER-V3-01 | Hero gradient com nome + 3 stat cards | Contexto imediato do LT |
| D-FOSTER-V3-02 | Tabs/filtros por status | Navegação rápida em placements |
| D-FOSTER-V3-03 | Lista com ações contextuais | Devolver/Encerrar só em ativos |
| D-FOSTER-V3-04 | Dialog encerramento com rating | Feedback obrigatório para abrigo |
| D-FOSTER-V3-05 | Empty state se nunca foi LT | Conversão para o programa |
| D-FOSTER-V3-06 | Dark mode com tokens DS-V2 | Plataforma tem dark mode |
| D-FOSTER-V3-07 | a11y WCAG AA (tabs, dialog, rating) | Rating acessível via radiogroup |
| D-FOSTER-V3-08 | useFostersList hook | Query direta no Firestore por userUid |
| D-FOSTER-V3-09 | Stars interativos com aria-label | Rating por teclado |
| D-FOSTER-V3-10 | Animações staggered em placements | Visual hierarchy sem CLS |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-FOSTER-1 | Hook `useFostersList` (query por userUid) | 1h | ✅ Feito |
| TASK-V3-FOSTER-2 | Hero gradient emerald + 3 stat cards | 2h | ✅ Feito |
| TASK-V3-FOSTER-3 | Filtros por status (4 tabs) | 2h | ✅ Feito |
| TASK-V3-FOSTER-4 | Lista de placements com ações contextuais | 2h | ✅ Feito |
| TASK-V3-FOSTER-5 | Dialog de encerramento com rating (1-5) | 2h | ✅ Feito |
| TASK-V3-FOSTER-6 | Empty LT state com CTA duplo | 1h | ✅ Feito |
| TASK-V3-FOSTER-7 | Acessibilidade WCAG AA (radiogroup, tabs) | 1h | ✅ Feito |
| TASK-V3-FOSTER-8 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-FOSTER-9 | E2E Playwright (encerrar + devolver) | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-18 09:00 | Análise V1 (477 linhas, 8 status types) + 12 Q&A |
| 2026-07-18 09:00 | V3 implementada (24KB, 6 sub-componentes) |
| 2026-07-18 09:00 | `useFostersList` hook criado (1KB) |
| 2026-07-18 09:00 | 3 hooks do V1 reusados (zero duplicação) |
| 2026-07-18 09:00 | Regência preenchida (15 seções) |
| 2026-07-18 09:00 | Deploy + SCRUM update |
