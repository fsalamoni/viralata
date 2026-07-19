# Documento de Regência — MURAL V3

> **Status**: ✅ DEPLOYED (TASK-V3-MURAL)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | MURAL |
| Rota | `/mural` |
| Componente V3 | `src/pages/PublicMuralFeed.v3.jsx` (25KB) |
| Wrapper | `src/pages/PublicMuralFeed.jsx` (escolhe V3 ou V1 via flag) |
| Fallback V1 | `src/pages/PublicMuralFeed.v1.jsx` (mantido, 232 linhas) |
| Flag V3 | `V3_PAGE_MURAL` (default OFF) |
| Auth | Pública (leitura) / logado (likes, comments) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Feed público agregado | Posts visíveis | 100% |
| O2 | Descoberta de comunidades | Cliques em badges | ≥ 30% |
| O3 | Conversão para login | Cliques "Entrar para postar" | ≥ 5% |
| O4 | Filtros funcionais | Uso de filtros/busca | ≥ 40% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO mostrar mural vazio sem CTA
- **AO2**: NÃO esconder os filtros atrás de tabs
- **AO3**: NÃO permitir like/comment sem login (redireciona)

---

## 2. Estrutura Visual

### S1 — Hero impactante
- Gradiente rose-500 → pink-600 → amber-600
- Badge "Mural público" com Sparkles
- H1: "Acompanhe o que está acontecendo"
- Descrição
- 2 CTAs: "Explorar comunidades" / "Entrar para postar" (apenas se !isAuthenticated)
- 3 stat cards decorativos (desktop only): total posts, comunidades, curtidas
- Mobile: 3 stat cards horizontais abaixo

### S2 — Stats (mobile)
- 3 stat cards: Posts (primary), Comunidades (rose), Curtidas (amber)

### S3 — Filtros + Trending (2 colunas)
- Coluna esquerda (2/3): busca + chips de comunidades
- Coluna direita (1/3): Em alta (top 5 hashtags) + CTA "Quer participar?"

### S4 — Lista de posts
- Grid 1/2 colunas (mobile/desktop)
- Card: avatar + autor + comunidade badge + texto + tags + anexos + ações
- Tags extraídas automaticamente (#palavra)
- Anexos: grid 1/2/3 colunas baseado na quantidade
- Ações: curtidas, comentários, localização
- Botão "Ver" leva à comunidade

### S5 — CTA final
- Card com gradiente rose→amber
- Ícone Smile
- H2: "Sua comunidade também pode participar"
- 2 CTAs: "Explorar comunidades" / "Criar comunidade"

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-3xl sm:text-4xl lg:text-5xl` | "Acompanhe o que está acontecendo" |
| H2 (CTA) | `text-2xl sm:text-3xl` | "Sua comunidade também pode participar" |
| H3 (card) | `text-sm font-semibold` | Nome do autor |
| Body | `text-[14px]` | Texto do post |
| Tags | `text-[10.5px]` | Hashtags |
| Stats | `text-2xl sm:text-3xl` | Números de stats |

---

## 4. Paleta de Cores (DS-V2)

| Token | Uso |
|---|---|
| `from-rose-500 via-pink-600 to-amber-600` | Hero gradient |
| `from-rose-50 via-amber-50 to-rose-50` | CTA final gradient |
| `bg-card` | Cards de stat, filtros, posts |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Labels, sub |
| `bg-primary/10 text-primary` | Ícones, tags |
| `bg-rose-100 text-rose-800` | Badge de stat |
| `bg-amber-100 text-amber-800` | Badge de curtidas |
| `bg-emerald-100 text-emerald-800` | Stats de Plataforma |

---

## 5. Estados Comportamentais

### Loading
- Skeleton de hero + 3 stat cards + filtros + 2-3 posts

### Empty mural
- EmptyState com ícone MessageSquare
- CTA "Ver comunidades"

### Filtro sem matches
- EmptyState com "Nenhum post encontrado" + "Tente outro filtro"
- CTA "Ver comunidades"

### Filtro
- Chips: Todas + 6 comunidades mais ativas
- Click no chip filtra por comunidade
- Click no chip ativo desativa filtro
- Busca filtra por texto/autor/comunidade
- Hashtag do trending preenche a busca

### Auth gate
- Botão "Entrar para postar" só aparece se !isAuthenticated
- Like/comment sem login → redirect para /login?redirect=/mural

### Reduced motion
- Animações staggered no hero + stats + grid
- whileInView no CTA final

### Dark mode
- Hero gradient mantém contraste
- Cards `bg-card` adaptam
- CTA final usa tokens dark:from-rose-950/20

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 30KB | ~25KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton + grid estável) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Skeleton com layout idêntico ao final
- Imagens com `loading="lazy"`
- Animações staggered só na primeira render
- Imagens com `aspect-square` (CLS=0)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Tabs semânticas | `<section>`, `<article>`, `<aside>` |
| Hierarquia de headings | H1 → H2 → H3 sem pular níveis |
| Hero landmarks | `<section>` com `aria-labelledby` |
| Filtros como buttons | `<button type="button">` (não divs) |
| Tags clicáveis | `<button>` com `aria-label` |
| Contraste | WCAG AA (rose-700 sobre branco) |
| Focus visível | `focus-visible:ring-2` em todos interativos |
| Aria-labels em ações | `aria-label="Limpar busca"` etc. |
| Reduced motion | `useReducedMotion()` respeitado |
| Navegação por teclado | Tab order natural |
| Screen reader | Stats announces, posts announces |

---

## 8. SEO

```html
<title>Mural da Comunidade — Viralata</title>
<meta name="description" content="Acompanhe o que está acontecendo nas comunidades, abrigos e voluntários. Veja em tempo real eventos, mutirões, histórias e novidades." />
```

- **Canonical**: `/mural`
- **Open Graph**: `og:title` "Mural da Comunidade", `og:image` (do último post com anexo)
- **Schema.org**: `ItemList` (lista de posts)

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `listPublicMuralPosts` (community service) | Lista de posts | ✅ Reusado |
| `useAuth` (FirebaseAuthContext) | `isAuthenticated` | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `UserAvatar` | Avatar do autor | ✅ Reusado |
| `parseTimestamp` (util) | Datas relativas | ✅ Reusado |
| `EmptyState`, `Skeleton`, `Badge` | UI base | ✅ Reusados |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks existentes)

### Componentes reaproveitados
- 6 (UserAvatar, EmptyState, Skeleton, Badge, Button, Input)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag `V3_PAGE_MURAL` OFF | Wrapper renderiza V1 |
| User não autenticado | Hero mostra "Entrar para postar" |
| Mural vazio | EmptyState com CTA |
| Filtro sem matches | EmptyState "Tente outro filtro" |
| Hashtag na busca | Trending preenche automaticamente |
| Post com 1+ anexos | Grid 1/2/3 colunas conforme qtd |
| Post com 6+ anexos | Overlay "+N" no último |
| Tags no texto | Extraídas via regex #\w+ |
| Comunidade desconhecida | Mostra "Comunidade" |
| Mobile 360px | Stack vertical |
| Desktop 1280px | Hero 2 colunas, grid 2 colunas |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | Posts não carregam, mensagem de erro |
| Firestore offline | Error state com "Erro ao carregar" |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/PublicMuralFeed.v3.test.jsx`: render, filtros, busca, trending

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, hero 1 coluna, stats horizontais
- [x] Tablet 768px: hero centralizado, filtros full
- [x] Desktop 1280px: hero 2 colunas, stats decorativos, grid 2 colunas
- [x] Dark mode: tokens trocam
- [x] Screen reader: stats announces, posts announces
- [x] Filtros: chips funcionam, busca filtra
- [x] Trending: clica e preenche busca
- [x] Empty mural: renderiza EmptyState
- [x] Filtro sem matches: EmptyState apropriado
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Posts visíveis | GA4 page view | 100% |
| Cliques em comunidades | GA4 event | ≥ 30% |
| Conversão para login | GA4 event | ≥ 5% |
| Uso de filtros | GA4 event | ≥ 40% |
| Lighthouse a11y | PageSpeed Insights | ≥ 95 |
| Lighthouse perf | PageSpeed Insights | ≥ 85 |

---

## 13. Decisões Tomadas (D-*)

| ID | Decisão | Justificativa |
|---|---|---|
| D-MURAL-V3-01 | Hero impactante com gradiente rose→amber | Diferencia de outras V3 (FOSTER emerald, PROFILE rose) |
| D-MURAL-V3-02 | 3 stat cards decorativos no hero (desktop) | Impacto social imediato |
| D-MURAL-V3-03 | Filtros + Trending em grid 2/3 + 1/3 | Layout ergonômico |
| D-MURAL-V3-04 | Posts em grid 1/2 (mobile/desktop) | Mais posts visíveis em desktop |
| D-MURAL-V3-05 | Tags extraídas via regex #\w+ | Automático sem entrada manual |
| D-MURAL-V3-06 | Anexos em grid adaptativo (1/2/3) | Bom para qualquer quantidade |
| D-MURAL-V3-07 | Trending hashtags no clique preenche busca | UX: discovery fácil |
| D-MURAL-V3-08 | CTA final com gradient + 2 botões | Reforça call-to-action |
| D-MURAL-V3-09 | Dark mode com tokens DS-V2 | Padrão plataforma |
| D-MURAL-V3-10 | a11y WCAG AA | Padrão plataforma |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-MURAL-1 | Hero impactante com gradiente rose→amber | 1h | ✅ Feito |
| TASK-V3-MURAL-2 | 3 stat cards no hero (desktop) | 1h | ✅ Feito |
| TASK-V3-MURAL-3 | Filtros busca + comunidades (chips) | 2h | ✅ Feito |
| TASK-V3-MURAL-4 | Trending hashtags (top 5) | 1h | ✅ Feito |
| TASK-V3-MURAL-5 | Posts em grid 1/2 | 1h | ✅ Feito |
| TASK-V3-MURAL-6 | Tags automáticas via regex | 0.5h | ✅ Feito |
| TASK-V3-MURAL-7 | Anexos em grid adaptativo | 1h | ✅ Feito |
| TASK-V3-MURAL-8 | CTA final | 0.5h | ✅ Feito |
| TASK-V3-MURAL-9 | A11y WCAG AA | 1h | ✅ Feito |
| TASK-V3-MURAL-10 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-MURAL-11 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 19:50 | Análise V1 (232 linhas, feed público simples) |
| 2026-07-19 19:50 | V3 implementada (25KB, 6 seções) |
| 2026-07-19 19:50 | Regência preenchida (15 seções) |
| 2026-07-19 19:50 | Deploy + SCRUM update |
