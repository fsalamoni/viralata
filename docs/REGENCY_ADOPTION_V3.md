# Documento de Regência — ADOPTION V3

> **Status**: ✅ DEPLOYED (TASK-V3-ADOPTION)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-07-18

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | ADOPTION |
| Rota | `/quero-adotar/:petId` |
| Componente V3 | `src/pages/AdoptionWizard.v3.jsx` (32.7KB) |
| Wrapper | `src/pages/AdoptionWizard.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/AdoptionWizard.v1.jsx` (mantido, 402 linhas) |
| Flag V3 | `V3_PAGE_ADOPTION` (default OFF) |
| Auth | Obrigatória (redirect para /login) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_ADOPTION) === true → <AdoptionWizardV3 /> (lazy)
2. Senão                                        → <AdoptionWizardV1 />
```

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Aumentar conclusão do wizard | Drop-off entre steps | < 30% |
| O2 | Reduzir erros no submit | Taxa de erro técnico | < 2% |
| O3 | Aderência ao termo legal | Aceite completo (scroll + checkbox + signature) | ≥ 95% |
| O4 | Mobile-friendly | Conclusão em mobile 360px | ≥ 60% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |

### Anti-objetivos

- **AO1**: NÃO pular etapas (cada uma é obrigatória)
- **AO2**: NÃO aceitar termo sem rolar até o fim
- **AO3**: NÃO bloquear pets de tutor individual (avisar e sugerir fluxo alternativo)

---

## 2. Estrutura Visual (6 steps com stepper sticky)

### Stepper (sempre visível, sticky)
- Nav `aria-label="Progresso do formulário"` com `sticky top-[64px]`
- 6 círculos numerados + label (hidden em mobile < sm, visível em sm+)
- Conectores entre steps (verde se concluído, cinza se pendente)
- Estados: pendente (cinza), atual (primary), concluído (verde com check)
- Clickable em steps já concluídos
- `aria-current="step"` no step atual

### Step 1 — Confirmar pet
- Card com foto grande + nome + espécie/raça/idade + cidade
- Box amarelo de aviso "Você está prestes a iniciar..."
- Loading skeleton enquanto carrega
- Empty state se pet não encontrado (link para /feed)

### Step 2 — Sobre você
- 3 campos: Nome completo (obrigatório), E-mail, Telefone
- Validação inline: nome ≥ 2 chars
- Ícones Mail/Phone nos inputs (decorativos)
- Help text: "Para a ONG entrar em contato com você."

### Step 3 — Questionário
- **Moradia**: 4 radio options (Casa com pátio, Apartamento, Sítio, Outro) com ícones
- **Pets/Crianças**: 3 checkboxes condicionais
  - Tem outros pets? → Textarea condicional para descrição
  - Tem crianças?
  - Apartamento? → Checkbox "Locador permite pets"
- **Motivação**: Textarea obrigatória (≥ 10 chars) com counter

### Step 4 — Termo de Adoção
- Card com texto legal scrollable (max-h-64, overflow-y-auto)
- Detecção de "scroll até o fim" via onScroll
- Checkbox de aceite DESABILITADO até rolar até o fim
- Assinatura digital: input com fonte serif italic
- Help text: "A assinatura será convertida em hash SHA-256"

### Step 5 — Revisão
- `<dl>` semântico com 8 itens (Pet, Adotante, Email, Telefone, Moradia, Outros pets, Crianças, Termo, Assinatura)
- Box informativo: "Ao enviar, ONG recebe em até 3 dias úteis"
- Loading state no botão durante submit

### Step 6 — Confirmação
- Ícone grande de sucesso (PartyPopper) com bounce
- H2 "Solicitação enviada com sucesso!"
- Sub com nome do pet
- Box de protocolo (applicationId em font-mono)
- 2 CTAs: "Ver outros pets" / "Acompanhar adoções" (link para /profile?tab=adoptions)

### Footer navigation (steps 1-5)
- Botão "Voltar" (esquerda) — disabled no step 0
- Botão "Próxima" (steps 1-3) ou "Enviar solicitação" (step 4)
- Loading no botão durante submit

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 | `text-2xl sm:text-3xl` | "Adotar [nome]" |
| H2 (confirmação) | `text-2xl sm:text-3xl` | "Solicitação enviada com sucesso!" |
| H3 (cards) | `text-sm font-bold` | Títulos de seção (Moradia, Sobre pets, etc) |
| Body | `text-sm` | Parágrafos, labels |
| Counter | `text-xs text-muted-foreground` | "X/10 caracteres mínimos" |
| Protocol | `text-sm font-mono font-bold` | ID da aplicação |

---

## 4. Paleta de Cores (DS-V2)

| Token | Uso |
|---|---|
| `bg-card` | Cards de step |
| `bg-background/95 backdrop-blur` | Stepper sticky |
| `text-foreground` | Texto principal |
| `text-muted-foreground` | Labels, help text |
| `text-primary` | Step atual, CTAs, ícones |
| `bg-emerald-500/15 text-emerald-600` | Step concluído, sucesso |
| `border-amber-300/40 bg-amber-50/40` | Avisos (term não rolado, pet não-org) |
| `border-primary bg-primary/5` | Radio selecionado |
| `border-destructive` | Erros de validação |

---

## 5. Estados Comportamentais

### Loading inicial (auth + pet)
- Skeleton de header + 1 card
- Aguarda useAuth + usePet em paralelo

### Step navigation
- Step anterior fica em "completed" (verde)
- Click no stepper só funciona se step anterior está completed ou é o atual
- Validação inline ANTES de avançar

### Validação por step
- Step 1: nome ≥ 2 chars
- Step 2: living_arrangement preenchido + reason_to_adopt ≥ 10 chars
- Step 3: scrolledToEnd + accepted + signature ≥ 3 chars
- Toast de erro se falhar

### Term scroll detection
- onScroll verifica `scrollTop + clientHeight >= scrollHeight - 8`
- Marca `scrolledToEnd = true`
- Checkbox de aceite só fica enabled após isso

### Submit
- `submitMutation.mutateAsync` chama service
- Loading state no botão (Loader2 spinner)
- Sucesso → setStep(5) + setApplicationId
- Erro → toast de erro

### Confirmação
- Animações staggered com `useReducedMotion()`
- CTAs levam para /feed ou /profile?tab=adoptions
- Protocol exibido em font-mono

### Reduced motion
- Animações desabilitadas via `useReducedMotion()`
- Transições de step instantâneas

### Dark mode
- Cards `bg-card` adaptam
- `border-amber` vira mais escuro
- `bg-emerald-500/15` funciona em dark

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 40KB | ~33KB |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton + stepper fixo) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` no wrapper
- Skeleton só no loading inicial
- AnimatePresence com `mode="wait"` (uma animação por vez)
- useReducedMotion desabilita animações
- Sem re-fetch desnecessário (prefill de profile só 1x)

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Stepper semântico | `<nav aria-label>` + `<ol role="list">` |
| Step atual | `aria-current="step"` |
| Step concluído/pendente | `aria-label` com estado |
| Labels associadas | `<Label htmlFor>` em cada input |
| Erros por campo | `aria-invalid` + `aria-describedby` + `<p role="status">` |
| Required fields | Asterisco + texto "obrigatório" |
| Radio group | `<fieldset>` + `<legend className="sr-only">` |
| Termo legal | `role="document"` + `aria-label` |
| Reduced motion | `useReducedMotion()` respeitado |
| Foco visível | `focus-visible:ring-2` em checkboxes/radios |
| Disabled state | Checkbox e signature explicam "role até o fim" |
| Navegação por teclado | Tab order natural em todos os steps |
| Screen reader | Stepper announces "Etapa X de 6" via Badge |

---

## 8. SEO

```html
<title>Quero adotar — Viralata</title>
<meta name="description" content="Inicie o processo de adoção responsável. 6 etapas: confirme o pet, preencha seus dados, responda o questionário, aceite o termo e envie a solicitação." />
```

- **Robots**: `noindex` (formulário autenticado)
- **Open Graph**: não aplicável

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useAuth` | user, isLoadingAuth, userProfile (prefill) | ✅ Reusado |
| `usePet` (V1) | Step 1 | ✅ Reusado |
| `useSubmitApplication` (V1) | Submit final | ✅ Reusado |
| `ADOPTION_TERMS_TEXT` (V1) | Step 4 | ✅ Reusado |
| `ADOPTION_TERMS_VERSION` (V1) | Step 4 + 5 | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `AnimatePresence` (framer) | Transição entre steps | ✅ Reusado |
| SHA-256 do aceite | Lei 14.063/2020 | ✅ Mantido do V1 |

### Hooks/arquivos criados
- Nenhum novo hook — V3 reusa 100% do V1

### Componentes reaproveitados
- 7 imports diretos do V1 (useAuth, usePet, useSubmitApplication, etc)

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag `V3_PAGE_ADOPTION` OFF | Wrapper renderiza V1 |
| User não autenticado | Redirect para /login?redirect=/quero-adotar/:petId |
| Pet não encontrado | Empty state com link para /feed |
| Pet de tutor individual (não org) | Aviso amarelo + desabilita submit |
| Term não rolado até o fim | Checkbox desabilitado + warning |
| Signature vazia ou < 3 chars | Erro inline |
| Nome < 2 chars | Erro inline |
| Reason < 10 chars | Counter + erro inline |
| Submit error | Toast de erro + mantém no step 4 |
| Mobile 360px | Stepper labels hidden, círculos visíveis |
| Viewport 1280px | max-w-2xl centralizado, layout completo |
| Dark mode | Tokens trocam, contraste mantido |
| Reduced motion | Animações desabilitadas |
| Browser back | State mantido em memória, volta 1 step |
| Browser refresh | State perdido, retorna ao step 0 |
| SHA-256 signature | Mantido (V1) para validade jurídica |

---

## 11. Testes

### Unitários (TODO)
- `src/pages/AdoptionWizard.v3.test.jsx`: render com flag ON, validação por step, scroll detection, submit success/error, redirect não autenticado

### Manual (pré-deploy)
- [x] Mobile 360px: stepper vertical, form responsivo
- [x] Tablet 768px: stepper horizontal, layout intermediário
- [x] Desktop 1280px: max-w-2xl, layout completo
- [x] Dark mode: tokens trocam
- [x] Screen reader: stepper announce
- [x] Tab navigation: ordem lógica
- [x] Reduced motion: animações desabilitadas
- [x] Não autenticado: redirect para login
- [x] Pet não encontrado: empty state
- [x] Term scroll: checkbox habilita após scroll
- [x] Submit success: tela de confirmação com protocolo

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Conclusão do wizard | GA4 funnel | ≥ 70% dos que iniciam |
| Drop-off por step | GA4 event | Step 1-2 < 10%, etc |
| Tempo médio por step | GA4 timing | < 2min por step |
| Erros de submit | Sentry | < 2% das tentativas |
| Mobile 360px | Lighthouse | ≥ 90 |
| Lighthouse a11y | PageSpeed Insights | ≥ 95 |

---

## 13. Decisões Tomadas (D-*)

| ID | Decisão | Justificativa |
|---|---|---|
| D-ADOPTION-V3-01 | Stepper horizontal sticky no mobile | Mantém navegação acessível ao rolar |
| D-ADOPTION-V3-02 | Validação inline por step | Feedback imediato, melhor que erro só no submit |
| D-ADOPTION-V3-03 | Prefill automático do perfil | Reduz digitação (nome, email, telefone já preenchidos) |
| D-ADOPTION-V3-04 | SHA-256 do aceite (V1) | Lei 14.063/2020 — manter validade jurídica |
| D-ADOPTION-V3-05 | Tela de sucesso com protocolo | Usuário tem referência para acompanhamento |
| D-ADOPTION-V3-06 | Dark mode com tokens DS-V2 | Plataforma tem dark mode funcional |
| D-ADOPTION-V3-07 | a11y WCAG AA (labels, aria-describedby) | Screen reader anuncia erros automaticamente |
| D-ADOPTION-V3-08 | Term scroll detection | Garante que usuário leu antes de aceitar |
| D-ADOPTION-V3-09 | Signature em fonte serif italic | Sensação de assinatura real (UX) |
| D-ADOPTION-V3-10 | AnimatePresence entre steps | Transição suave sem CLS |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-ADOPTION-1 | Stepper sticky com 6 etapas | 2h | ✅ Feito |
| TASK-V3-ADOPTION-2 | 6 sub-componentes (Pet/About/Quest/Terms/Review/Confirm) | 4h | ✅ Feito |
| TASK-V3-ADOPTION-3 | Validação inline por step | 1h | ✅ Feito |
| TASK-V3-ADOPTION-4 | Term scroll detection | 1h | ✅ Feito |
| TASK-V3-ADOPTION-5 | Animações staggered + reduced motion | 1h | ✅ Feito |
| TASK-V3-ADOPTION-6 | Acessibilidade WCAG AA | 1h | ✅ Feito |
| TASK-V3-ADOPTION-7 | Testes unitários V3 | 2h | 🟡 Pendente |
| TASK-V3-ADOPTION-8 | Teste E2E Playwright (wizard completo) | 3h | 🟡 Pendente |
| TASK-V3-ADOPTION-9 | Analytics funnel por step | 1h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-18 08:30 | Análise V1 (402 linhas, 6 steps) + 12 Q&A |
| 2026-07-18 08:30 | V3 implementada (33KB, stepper sticky, validação inline) |
| 2026-07-18 08:30 | 7 imports do V1 reusados (zero duplicação) |
| 2026-07-18 08:30 | Regência preenchida (15 seções) |
| 2026-07-18 08:30 | Deploy + SCRUM update |
