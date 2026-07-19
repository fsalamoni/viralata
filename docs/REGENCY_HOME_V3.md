# Documento de Regência — HOME V3

> **Status**: ✅ DEPLOYED (TASK-V3-HOME)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | HOME |
| Rota | `/` |
| Componente V3 | `src/pages/Home.v3.jsx` (28KB) |
| Wrapper | `src/pages/Home.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/Home.v1.jsx` (mantido, 251 linhas) |
| Flag V3 | `V3_PAGE_HOME` (default OFF) |
| Auth | Pública |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_HOME) === true → <PageV3 /> (lazy)
2. Senão                              → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Apresentar plataforma | Visualizações | 100% |
| O2 | Conversão para "Ver pets" | Cliques CTA primário | ≥ 40% |
| O3 | Conversão para login/cadastro | Cliques CTA secundário | ≥ 15% |
| O4 | Descoberta de vitrines | Cliques em cards | ≥ 20% |
| O5 | Mobile-first | Lighthouse mobile | ≥ 90 |
| O6 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO esconder CTAs atrás de menu
- **AO2**: NÃO exigir login para ver o feed
- **AO3**: NÃO quebrar a leitura linear (histórias vir antes de features)

---

## 2. Estrutura Visual

### S1 — Hero impactante
- Gradient multicolor: rose-500 → orange-500 → amber-500
- Badge "Plataforma gratuita" com Sparkles
- H1: "Adoção responsável começa aqui."
- Descrição
- 2 CTAs primários: "Ver pets" (com ArrowRight) / "Entrar"
- 4 chips de espécies: Todos / Cachorros / Gatos / Outros (com count)
- 4 stat cards decorativos (desktop only): Adoções, Resgatados, ONGs, Cidades
- Mobile: 4 stat cards horizontais abaixo (grid 2 colunas)

### S2 — Stats (mobile)
- 4 stat cards coloridos: rose/amber/sky/emerald

### S3 — Próximas vitrines
- Header: H2 + subtítulo + botão "Ver todos"
- Loading: 3 cards skeleton
- Error: mensagem "Não foi possível carregar"
- Empty: "Nenhuma vitrine agendada"
- Cards: gradient amber→orange→rose + título + data + local + pets count
- Click → vai para `/vitrines/:id`

### S4 — Como funciona
- H2 centralizado + subtítulo
- 3 steps em grid 1/3 colunas (mobile/desktop)
- Cada step: ícone em gradient + número em badge + título + descrição
- Steps: rose (perfil) / amber (busca) / emerald (adoção)

### S5 — Histórias de adoção
- Badge "Histórias reais" com Heart
- H2 "Vidas que mudaram de rumo"
- 3 cards em grid 1/3 colunas
- Cada card: avatar com iniciais (gradient) + nome + pet adotado + quote em itálico

### S6 — Funcionalidades
- H2 "Tudo em um só lugar" + subtítulo
- 4 cards em grid 1/2/4 colunas (mobile/tablet/desktop)
- Cada card: ícone em bg colorido + título + descrição
- Hover: sobe 4px (`whileHover y: -4`)
- Features: Match (rose) / Comunidade (sky) / Denúncias (amber) / Seguro (emerald)

### S7 — CTA Final
- Card com gradient rose-500 → pink-600 → amber-500
- H2: "Pronto para encontrar seu novo melhor amigo?"
- Descrição
- 2 CTAs: "Ver pets para adoção" / "Ver abrigos"

### S8 — Footer
- Border-top
- Copyright
- 3 links: Termos / Privacidade / Legislação

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-4xl sm:text-5xl lg:text-6xl` | "Adoção responsável começa aqui." |
| H2 (CTA) | `text-2xl sm:text-3xl` | "Pronto para encontrar..." |
| H2 (section) | `text-2xl sm:text-3xl` | "Como funciona" |
| H3 (card) | `text-base sm:text-lg font-bold` | Título de step/feature |
| Body | `text-sm sm:text-base` | Texto geral |
| Description | `text-xs sm:text-sm` | Subtítulo |
| Stats (mobile) | `text-xl sm:text-2xl` | Números |
| Stats (desktop) | `text-3xl` | Números grandes |

---

## 4. Paleta de Cores (DS-V2)

### Hero gradient:
- `from-rose-500 via-orange-500 to-amber-500` (multicolor)

### CTA Final gradient:
- `from-rose-500 via-pink-600 to-amber-500`

### Impact stats:
- `rose-600` — Adoções
- `amber-600` — Resgatados
- `sky-600` — ONGs
- `emerald-600` — Cidades

### Features (badges):
- `rose-100` (Match) / `sky-100` (Comunidade) / `amber-100` (Denúncias) / `emerald-100` (Seguro)

### Steps:
- `from-rose-500 to-pink-600` (1) / `from-amber-500 to-orange-600` (2) / `from-emerald-500 to-teal-600` (3)

### Dark mode:
- Gradients mantêm contraste
- Badges com versões `dark:`
- Cards `bg-card` adaptam

---

## 5. Estados Comportamentais

### Loading (exhibitions)
- 3 cards skeleton

### Error (exhibitions)
- Mensagem amigável

### Empty (exhibitions)
- Ícone Calendar + "Nenhuma vitrine agendada"

### Species filter
- Default: 'all'
- Click altera active state
- 4 chips: Todos / Cachorros / Gatos / Outros
- Cada chip tem contagem

### Mobile
- Stack vertical
- Stats em grid 2 colunas
- Steps em 1 coluna
- Stories em 1 coluna
- Features em 1 coluna

### Desktop
- Hero 2 colunas
- Stats 1+3 cards no hero
- Steps em 3 colunas
- Stories em 3 colunas
- Features em 4 colunas

### Dark mode
- Hero gradient mantém contraste
- Badges com versões dark
- Cards `bg-card` adaptam

### Reduced motion
- Animações staggered no hero + stats
- whileInView nas sections
- whileHover desabilitado (y: -4 só com reduce=false)

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 30KB | ~28KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- `Promise.all` em V1 (a V3 usa só listPublicExhibitions)
- Skeleton com layout idêntico
- `useMemo`/`useCallback` onde aplicável
- Imagens com `loading="lazy"` (quando aplicável)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<section>` + `<motion.section>` |
| Stats como cards | Visíveis, sem sobrecarga semântica |
| Species chips | `<button>` com `aria-pressed` |
| Steps numerados | Número em badge + texto alternativo |
| Histórias | Avatar com nome (alt text) |
| Features | Card semântica |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| JSON-LD | `Organization` schema |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA |

---

## 8. SEO

```html
<title>Viralata — Adoção responsável de pets</title>
<meta name="description" content="Encontre pets para adoção, converse com ONGs e cadastre pets com segurança. Plataforma gratuita." />
```

- **Canonical**: `/`
- **JSON-LD**: `Organization` schema (com sameAs, contactPoint)
- **Open Graph**: `og:title` "Viralata — Adoção responsável", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `listPublicExhibitions` (exhibitionPublicService) | Próximas vitrines | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `UserAvatar`, `Skeleton`, `Badge`, `Button` | UI base | ✅ Reusados |
| `Seo` | Meta tags | ✅ Reusado |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks existentes)

### Componentes reaproveitados
- 5 (UserAvatar, Skeleton, Badge, Button, Seo)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| Vitrines carregando | 3 cards skeleton |
| Vitrines erro | Mensagem amigável |
| Sem vitrines futuras | "Nenhuma vitrine agendada" |
| Species chip clicado | Active state |
| Mobile 360px | Stack vertical, stats 2 colunas |
| Tablet 768px | Features 2 colunas, stories 3 colunas |
| Desktop 1280px | Hero 2 colunas, stats 1+3, features 4 colunas |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | EmptyState fallback |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/Home.v3.test.jsx`: render, species filter, exhibitions

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, stats 2 colunas
- [x] Tablet 768px: features 2 colunas
- [x] Desktop 1280px: hero 2 colunas, stats no hero
- [x] Dark mode: tokens trocam
- [x] Species chips: 4 chips, active state
- [x] Loading vitrines: 3 cards skeleton
- [x] Error vitrines: mensagem amigável
- [x] Empty vitrines: EmptyState
- [x] Hover features: y: -4
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Visualizações | GA4 page view | 100% |
| Cliques "Ver pets" | GA4 event | ≥ 40% |
| Cliques "Entrar" | GA4 event | ≥ 15% |
| Cliques em vitrines | GA4 event | ≥ 20% |
| Lighthouse mobile | PageSpeed | ≥ 90 |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-HOME-V3-01..07)

| ID | Decisão | Justificativa |
|---|---|---|
| D-HOME-V3-01 | Hero impactante com gradient multicolor | Primeiro impacto visual forte |
| D-HOME-V3-02 | 4 stat cards de impacto | Prova social imediata |
| D-HOME-V3-03 | 4 chips de espécies (Todos/Cachorros/Gatos/Outros) | Discovery rápido |
| D-HOME-V3-04 | Próximas vitrines em destaque (top 3) | Discovery orgânico |
| D-HOME-V3-05 | Steps numerados com gradient | Mais visual que V1 |
| D-HOME-V3-06 | Features com hover (y: -4) | Microinteração |
| D-HOME-V3-07 | JSON-LD Organization schema | SEO rich results |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-HOME-1 | Hero impactante com gradient multicolor | 1h | ✅ Feito |
| TASK-V3-HOME-2 | 4 stat cards de impacto | 0.5h | ✅ Feito |
| TASK-V3-HOME-3 | 4 chips de espécies | 0.5h | ✅ Feito |
| TASK-V3-HOME-4 | Próximas vitrines (top 3) | 1h | ✅ Feito |
| TASK-V3-HOME-5 | Steps numerados com gradient | 1h | ✅ Feito |
| TASK-V3-HOME-6 | Features com hover | 0.5h | ✅ Feito |
| TASK-V3-HOME-7 | Histórias de adoção | 0.5h | ✅ Feito |
| TASK-V3-HOME-8 | CTA final | 0.5h | ✅ Feito |
| TASK-V3-HOME-9 | JSON-LD Organization | 0.5h | ✅ Feito |
| TASK-V3-HOME-10 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-HOME-11 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 17:00 | Análise V1 (251 linhas, 6 seções) |
| 2026-07-19 17:00 | V3 placeholder (1.5KB) criado |
| 2026-07-19 22:30 | V3 real implementada (28KB, 8 sub-componentes) |
| 2026-07-19 22:30 | Regência preenchida (15 seções) |
| 2026-07-19 22:30 | Deploy + SCRUM update |
