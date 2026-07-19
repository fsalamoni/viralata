# Documento de Regência — LOGIN V3

> **Status**: ✅ DEPLOYED (TASK-V3-LOGIN)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-19

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | LOGIN |
| Rota | `/login` |
| Componente V3 | `src/pages/Login.v3.jsx` (16KB) |
| Wrapper | `src/pages/Login.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/Login.v1.jsx` (mantido, 175 linhas) |
| Flag V3 | `V3_PAGE_LOGIN` (default OFF) |
| Auth | Pública (redireciona após login) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_LOGIN) === true → <PageV3 /> (lazy)
2. Senão                              → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Conversão para login | Cliques "Continuar com Google" | ≥ 80% |
| O2 | Trust + credibilidade | Visualização trust badges | 100% |
| O3 | Social proof | Visualização quote | 100% |
| O4 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O5 | Mobile-first | Lighthouse mobile | ≥ 90 |
| O6 | SEO da página | Schema WebPage | 100% |

### Anti-objetivos

- **AO1**: NÃO mostrar erros em toast (esconder mensagem importante)
- **AO2**: NÃO exigir login para social proof
- **AO3**: NÃO esconder LGPD / Termos

---

## 2. Estrutura Visual (Split Layout)

### S-LEFT (desktop only) — Painel de Marketing
- **Brand mark** (topo): ícone PawPrint em gradient + nome "Viralata" + tagline
- **Badge** "Plataforma gratuita de adoção" com PawPrint
- **H1** impactante: "Conecte-se com pets que precisam de um lar e famílias que têm amor para dar."
- **3 Feature highlights** (cards): Match / Chat / Comunidade
- **Social proof** (blockquote): quote da Fernanda + adotou Bolt
- Backdrop blur + border white/10 + bg-white/5

### S-RIGHT — Card de Login (sempre visível)
- **Mobile brand** (lg:hidden): ícone + nome
- **Ícone central** (14x14) em gradient amber→orange
- **H2**: "Bem-vindo ao Viralata"
- **Subtítulo**: descrição
- **3 Trust badges** (mobile only, lg:hidden): LGPD / Gratuito / Sem venda
- **Botão Google**: ícone + texto "Continuar com Google" (ou "Conectando..." busy)
- **Error state** (inline): AlertCircle + mensagem
- **Auth unavailable** (inline): AlertCircle amber + mensagem
- **Success hint** (mobile only): "Acesso seguro via Google"
- **Termos + privacidade**: links para /politica-privacidade e /termos

### Background
- Gradient: slate-900 → indigo-950 → violet-950
- Decorative radial gradients (top-right amber, bottom-left violet)

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero desktop) | `text-3xl sm:text-4xl` | "Conecte-se com pets..." |
| H2 (card) | `text-2xl font-extrabold` | "Bem-vindo ao Viralata" |
| H3 (feature) | `text-sm font-bold` | "Match inteligente" |
| Body | `text-sm` | Texto geral |
| Description | `text-xs` | Subtítulo |
| Trust badge | `text-[10.5px] font-semibold` | "LGPD compliant" |
| Quote | `text-sm italic` | Citação |
| Terms | `text-[10.5px]` | "Ao continuar..." |

---

## 4. Paleta de Cores (DS-V2)

### Background:
- `from-slate-900 via-indigo-950 to-violet-950` (gradiente multicolor escuro)

### Brand mark (gradient):
- `from-amber-500 to-orange-600`

### Feature icons (gradient):
- `from-amber-400 to-orange-500`

### Mobile brand (gradient):
- `from-amber-500 to-orange-600` (mesma do brand)

### Card:
- `bg-card` (light/dark automático)
- `border-border`

### Erro:
- `text-destructive` + `bg-destructive/5` + `border-destructive/30`

### Auth unavailable:
- `text-amber-900` + `bg-amber-50` + `border-amber-200`
- Dark: `text-amber-200` + `bg-amber-950/30` + `border-amber-900/50`

### Trust badges (no marketing panel):
- `border-white/20` + `bg-white/10` + `text-white/90`

### Quote (footer do social proof):
- `text-amber-200/90` (adopter name)

---

## 5. Estados Comportamentais

### Loading (isLoadingAuth)
- LoginSkeleton com 1 ícone + 2 linhas + 1 botão

### Authenticated
- Redireciona para `from` (location.state) ou `/feed` (se profile completo)
- Redireciona para `/onboarding` (se profile incompleto)
- Substitui history com `replace: true`

### Auth Available
- Botão Google habilitado
- Click → `setBusy(true)` → `signInWithGoogle()` → `setBusy(false)` no finally

### Auth Unavailable
- Botão Google desabilitado
- Alerta amber com `authUnavailableReason`
- Mensagem: "Configure o Firebase para habilitar autenticação."

### Error (authError)
- Alerta destructive inline (NÃO toast)
- Mensagem: `authError.message`
- `prevErrorRef` evita repetir

### Mobile
- Stack vertical (left panel escondido)
- Mobile brand + ícone central + trust badges visíveis
- Sucesso "Acesso seguro via Google" visível

### Desktop (lg+)
- Split layout (1.1fr / 0.9fr)
- Left panel com marketing visível
- Trust badges no left panel (não no card)

### Dark mode
- Background gradient mantém
- Card `bg-card` adapta
- Badges dark com `dark:`

### Reduced motion
- Animações staggered no left panel
- Initial y: 8 no card
- whileInView não aplicável (page única)

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 20KB | ~16KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- `useMemo`/`useCallback` em pontos críticos
- Google SVG inline (sem request externo)
- Decorative gradients com CSS puro

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<section>` + `<motion.section>` |
| Login card | `<section>` + `data-testid` |
| Brand link | `<Link>` com `<PawPrint>` aria-hidden |
| Feature icons | `aria-hidden="true"` |
| Botão Google | `<Button>` com `data-testid` e disabled state |
| Error state | `role="alert"` |
| Auth unavailable | `role="alert"` |
| Google SVG | `aria-hidden="true"` |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| JSON-LD | `WebPage` schema |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA (white em slate-900) |

---

## 8. SEO

```html
<title>Entrar — Viralata</title>
<meta name="description" content="Acesse sua conta Viralata para encontrar pets para adoção ou cadastrar pets." />
```

- **Canonical**: `/login`
- **JSON-LD**: `WebPage` schema (com isPartOf WebSite)
- **Open Graph**: `og:title` "Entrar — Viralata", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `signInWithGoogle` (useAuth) | Login principal | ✅ Reusado |
| `isAuthenticated` (useAuth) | Redirect state | ✅ Reusado |
| `isLoadingAuth` (useAuth) | Skeleton | ✅ Reusado |
| `authError` (useAuth) | Error state inline | ✅ Reusado |
| `isAuthAvailable` (useAuth) | Auth unavailable | ✅ Reusado |
| `isProfileComplete` (useAuth) | Redirect para onboarding | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `useNavigate` (react-router) | Redirect | ✅ Reusado |
| `useLocation` (react-router) | `from` path | ✅ Reusado |
| `Seo` | Meta tags | ✅ Reusado |

### Hooks/arquivos criados
- Nenhum (reusa 100% dos hooks existentes)

### Componentes reaproveitados
- 3 (Button, Badge, Skeleton, Seo)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| `isLoadingAuth === true` | LoginSkeleton |
| `isAuthenticated === true` | Redirect para `from` ou `/onboarding` |
| `isAuthAvailable === false` | Botão desabilitado + alerta amber |
| `authError` mudou | Alerta destructive inline (não toast) |
| Mobile 360px | Stack vertical, mobile brand + trust badges |
| Desktop 1280px | Split layout, marketing panel visível |
| Dark mode | Background gradient mantém, card adapta |
| Reduced motion | Animações desabilitadas |
| JS desabilitado | EmptyState fallback |
| Offline | Error state |
| `location.state?.from` undefined | Redirect para `/feed` |
| Profile incompleto | Redirect para `/onboarding` |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/Login.v3.test.jsx`: render, signIn flow, error states, auth unavailable

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, mobile brand visível
- [x] Tablet 768px: stack vertical, trust badges visíveis
- [x] Desktop 1280px: split layout, marketing panel visível
- [x] Dark mode: tokens trocam
- [x] Auth available: botão habilitado
- [x] Auth unavailable: botão desabilitado + alerta
- [x] Error state: alerta inline
- [x] Loading: skeleton
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Conversão login | GA4 event | ≥ 80% |
| Trust badges visualizados | GA4 event | 100% |
| Quote visualizada | GA4 event | 100% |
| Lighthouse a11y | PageSpeed | ≥ 95 |
| Lighthouse mobile | PageSpeed | ≥ 90 |
| Schema WebPage | Schema.org validator | 100% |

---

## 13. Decisões Tomadas (D-LOGIN-V3-01..10)

| ID | Decisão | Justificativa |
|---|---|---|
| D-LOGIN-V3-01 | Split layout (marketing + card) | Marketing lateral + CTA central |
| D-LOGIN-V3-02 | Background gradient multicolor (slate/indigo/violet) | Impacto visual + dark mode nativo |
| D-LOGIN-V3-03 | 3 feature highlights com ícones em gradient | Visual rico, scan rápido |
| D-LOGIN-V3-04 | Social proof com quote + adopter | Trust imediato |
| D-LOGIN-V3-05 | 3 trust badges (LGPD/gratuito/seguro) | Reduz ansiedade |
| D-LOGIN-V3-06 | Botão Google com SVG oficial inline | Sem request externo |
| D-LOGIN-V3-07 | Error state INLINE (não toast) | Mensagem importante visível |
| D-LOGIN-V3-08 | Auth unavailable com alerta amber | UX clara quando auth off |
| D-LOGIN-V3-09 | Mobile brand + trust badges só mobile (lg:hidden) | UX contextual por device |
| D-LOGIN-V3-10 | JSON-LD WebPage schema | SEO + isPartOf WebSite |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-LOGIN-1 | Split layout com marketing panel | 1.5h | ✅ Feito |
| TASK-V3-LOGIN-2 | Background gradient multicolor | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-3 | Brand mark + tagline | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-4 | 3 feature highlights com ícones | 1h | ✅ Feito |
| TASK-V3-LOGIN-5 | Social proof (quote + adopter) | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-6 | 3 trust badges (LGPD/gratuito/seguro) | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-7 | Card de login centralizado | 1h | ✅ Feito |
| TASK-V3-LOGIN-8 | Botão Google com SVG inline | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-9 | Error state INLINE (não toast) | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-10 | Auth unavailable state | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-11 | Loading skeleton | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-12 | JSON-LD WebPage schema | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-13 | Mobile brand + trust badges (lg:hidden) | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-14 | Termos + privacidade (links) | 0.5h | ✅ Feito |
| TASK-V3-LOGIN-15 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-LOGIN-16 | E2E Playwright | 3h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 23:00 | Análise V1 (175 linhas, Google login) |
| 2026-07-19 23:00 | V3 implementada (16KB, 3 sub-componentes) |
| 2026-07-19 23:00 | Regência preenchida (15 seções) |
| 2026-07-19 23:00 | Deploy + SCRUM update |
