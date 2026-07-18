# Documento de Regência — VOLUNTEER V3

> **Status**: ✅ DEPLOYED (TASK-V3-VOLUNTEER)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-18

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | VOLUNTEER |
| Rota | `/voluntarios` |
| Componente V3 | `src/pages/VolunteerProgram.v3.jsx` (18KB) |
| Wrapper | `src/pages/VolunteerProgram.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/VolunteerProgram.v1.jsx` (mantido, 255 linhas) |
| Flag V3 | `V3_PAGE_VOLUNTEER` (default OFF) |
| Auth | Pública (sem login) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_VOLUNTEER) === true → <VolunteerProgramV3 /> (lazy)
2. Senão                                       → <VolunteerProgramV1 />
```

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Converter visitante em voluntário | Cliques em "Quero ser voluntário" | ≥ 5% |
| O2 | Informar sobre o programa | Tempo na página | ≥ 60s |
| O3 | Responder dúvidas comuns | Cliques em FAQ items | ≥ 30% |
| O4 | Mostrar impacto social | Visualização das stats | ≥ 80% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO mostrar CTA principal abaixo da fold
- **AO2**: NÃO esconder os benefícios em accordion (precisam ser visíveis)
- **AO3**: NÃO usar cores sem contraste WCAG AA

---

## 2. Estrutura Visual (hero + steps + benefícios + FAQ + CTA)

### S1 — Hero impactante
- Gradiente rose-500 → rose-600 → amber-700
- Badge "Programa de Voluntariado" com Sparkles
- H1: "Transforme cuidado em horas que valem"
- Descrição
- 3 CTAs principais
- 3 stat pills (Seguro, Termo, Certificado)
- Stats decorativos em desktop (usuários, abrigos, horas)
- Mobile: stack; Desktop: grid 1.5fr/1fr

### S2 — Como funciona (4 steps)
- Grid responsivo 1/2/4 colunas
- Cada step: ícone + número circular + título + descrição
- Glow gradient em cada card
- Step 1: Leia o termo (rose)
- Step 2: Preencha seu perfil (amber)
- Step 3: Escolha um abrigo (emerald)
- Step 4: Confirme presenças (sky)

### S3 — Benefícios (6 cards)
- Grid 1/2 colunas
- Cada: ícone + título + descrição
- Benefícios: Impacto direto / Segurança jurídica / Tudo organizado / Horário flexível / Certificado de horas / Capacitação

### S4 — FAQ (6 perguntas)
- details/summary acessível
- Ícone "+" rotaciona ao abrir
- Hover muda borda para primary
- Perguntas: experiência prévia / multi-abrigo / custo / horas / certificado / LGPD

### S5 — CTA Final
- Card com gradient rose→amber
- H2: "Pronto(a) para começar?"
- Texto explicativo
- 4 checks (Sem custo, Sem vínculo, Com seguro, Com certificado)
- 2 CTAs (Quero ser voluntário / Ler o termo antes)

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-3xl sm:text-4xl lg:text-5xl` | "Transforme cuidado em horas que valem" |
| H2 (seções) | `text-2xl sm:text-3xl` | "Como funciona", "Por que ser voluntário", "FAQ" |
| H3 (cards) | `text-base font-semibold` | "Leia o termo", "Impacto direto" |
| Body | `text-sm` | Descrições |
| Stats | `text-2xl font-extrabold` | Números decorativos |

---

## 4. Paleta de Cores (DS-V2)

| Token | Uso |
|---|---|
| `from-rose-500 via-rose-600 to-amber-700` | Hero gradient |
| `from-rose-50 via-amber-50 to-rose-50` | CTA final gradient |
| `bg-card` | Cards de step, benefício |
| `border-border` | Borda padrão |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Labels, sub |
| `bg-primary/10 text-primary` | Ícones de step, badge, FAQ |
| `bg-white/20 text-white` | Hero badges, stats |
| `from-rose-100/amber-100/emerald-100/sky-100` | Glow de cada step |
| `bg-emerald-600` | Checks (final CTA) |

---

## 5. Estados Comportamentais

### Hero
- Carregamento: instantâneo (não tem data fetching)
- Stats decorativos visíveis só em desktop (lg:flex)

### Steps
- Hover: shadow-md no card
- Animações staggered na primeira render
- Glow gradient sempre visível (decorativo)

### FAQ
- details/summary nativo
- "+" rotaciona 45° quando aberto
- Hover muda borda para primary/30

### CTA Final
- whileInView animation (só anima quando aparece na viewport)
- Mobile-first layout

### Reduced motion
- `useReducedMotion()` de framer-motion
- Animações desabilitadas

### Dark mode
- Hero gradient mantém contraste
- CTA final usa tokens dark:from-rose-950/20
- Cards adaptam com bg-card

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 25KB | ~18KB |
| LCP (mobile 4G) | < 2.0s | _a medir_ |
| CLS | 0 | 0 (sem data fetching) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 90 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Sem data fetching (landing estática)
- Animações staggered só no hero
- FAQ usa details/summary nativo (sem JS de toggle)
- whileInView no CTA final (não trava LCP)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| H1 único na página | `<h1>` apenas no hero |
| Hierarquia de headings | H1 → H2 → H3 sem pular níveis |
| Section landmarks | `<section aria-labelledby="...">` em cada bloco |
| FAQ acessível | `<details>`/`<summary>` nativos |
| Focus visível | `focus-visible:ring-2 focus-visible:ring-primary` |
| Contraste | WCAG AA (hero branco/rose-700 validado) |
| Botões com ícones | `aria-hidden="true"` no ícone, texto visível |
| Links âncora | `aria-label` quando só ícone |
| Reduced motion | `useReducedMotion()` respeitado |
| Navegação por teclado | Tab order natural |
| Screen reader | Headings anunciam hierarquia, sections anunciam labels |

---

## 8. SEO

```html
<title>Seja voluntário — Viralata</title>
<meta name="description" content="Programa de voluntariado da Viralata: cadastre-se, escolha um abrigo e comece a ajudar. Sem vínculo empregatício, com seguro, capacitação e certificado de horas." />
```

- **Canonical**: `/voluntarios`
- **Open Graph**: não configurado
- **Schema.org**: `Event` ou `Service` (pendente)

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `Seo` | Title + description | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `AnimatePresence` (framer) | Não usado | — |
| React Router `Link` | CTAs internos | ✅ Reusado |

### Hooks/arquivos criados
- Nenhum (V3 reusa V1 + DS-V2 + framer-motion)

### Componentes reaproveitados
- `Seo` (componente padrão)
- `Button`, `Badge` (componentes Radix UI)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag `V3_PAGE_VOLUNTEER` OFF | Wrapper renderiza V1 |
| Mobile 360px | Hero stack, steps 1 coluna, FAQ full width |
| Tablet 768px | Steps 2 colunas, benefícios 2 colunas |
| Desktop 1280px | Steps 4 colunas, stats hero visíveis, max-w-6xl |
| Dark mode | Tokens trocam, hero mantém contraste |
| Reduced motion | Animações desabilitadas |
| FAQ multi-aberto | `<details>` permite múltiplos abertos (default) |
| JS desabilitado | FAQ ainda funciona (details nativo) |
| CTA com anchor | Link to /voluntarios/seja (funil de signup) |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/VolunteerProgram.v3.test.jsx`: render com flag ON, hero, steps, benefícios, FAQ, CTA

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, steps 1 coluna
- [x] Tablet 768px: steps 2 colunas, benefícios 2 colunas
- [x] Desktop 1280px: steps 4 colunas, stats hero visíveis
- [x] Dark mode: tokens trocam
- [x] Screen reader: headings announces, sections announces
- [x] FAQ: details abre/fecha, + rotaciona
- [x] Reduced motion: animações desabilitadas
- [x] CTAs: navegam para /voluntarios/seja e /voluntarios/termo
- [x] Focus: ordem lógica, ring visível

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Cliques "Quero ser voluntário" | GA4 event | ≥ 5% |
| Tempo na página | GA4 engagement | ≥ 60s |
| FAQ opens | GA4 event | ≥ 30% |
| Visualização das stats | GA4 scroll depth | ≥ 80% |
| Lighthouse a11y | PageSpeed Insights | ≥ 95 |
| Lighthouse perf | PageSpeed Insights | ≥ 90 |

---

## 13. Decisões Tomadas (D-*)

| ID | Decisão | Justificativa |
|---|---|---|
| D-VOLUNTEER-V3-01 | Hero impactante com gradiente coral/amber | Diferencia de outras V3 (FOSTER emerald, PROFILE rose) |
| D-VOLUNTEER-V3-02 | Stats decorativos no hero (desktop) | Impacto social imediato |
| D-VOLUNTEER-V3-03 | 4 steps com glow gradient em cada cor | Contraste visual entre etapas |
| D-VOLUNTEER-V3-04 | 6 benefícios visíveis (não em accordion) | Informações importantes devem ser visíveis |
| D-VOLUNTEER-V3-05 | FAQ com details/summary nativo | A11y + funciona sem JS |
| D-VOLUNTEER-V3-06 | CTA final com gradient + 4 checks | Reforça segurança/benefícios |
| D-VOLUNTEER-V3-07 | whileInView no CTA final | Performance (não trava LCP) |
| D-VOLUNTEER-V3-08 | Dark mode com tokens DS-V2 | Plataforma tem dark mode |
| D-VOLUNTEER-V3-09 | a11y WCAG AA | Padrão plataforma |
| D-VOLUNTEER-V3-10 | 3 stat pills (Seguro/Termo/Certificado) | Reforça confiança |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-VOLUNTEER-1 | Hero impactante com gradiente coral/amber | 1h | ✅ Feito |
| TASK-V3-VOLUNTEER-2 | 3 stat cards decorativos no hero | 1h | ✅ Feito |
| TASK-V3-VOLUNTEER-3 | 4 steps "Como funciona" com ícones | 1.5h | ✅ Feito |
| TASK-V3-VOLUNTEER-4 | 6 benefícios visíveis (grid 2 colunas) | 1.5h | ✅ Feito |
| TASK-V3-VOLUNTEER-5 | FAQ com details/summary acessível | 1h | ✅ Feito |
| TASK-V3-VOLUNTEER-6 | CTA final com gradient + 4 checks | 1h | ✅ Feito |
| TASK-V3-VOLUNTEER-7 | Acessibilidade WCAG AA | 1h | ✅ Feito |
| TASK-V3-VOLUNTEER-8 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-VOLUNTEER-9 | Schema.org Service markup | 1h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-18 11:30 | Análise V1 (255 linhas, 4 steps + FAQ) |
| 2026-07-18 11:30 | V3 implementada (18KB, 6 seções) |
| 2020-07-18 11:30 | Regência preenchida (15 seções) |
| 2026-07-18 11:30 | Deploy + SCRUM update |
