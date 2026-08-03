# Documento de Regência — VOLUNTEER V3 + SIGNUP

> **Status**: ✅ DEPLOYED (TASK-V3-VOLUNTEER + ciclo de correções sw-v75..v97)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-08-03 (ciclo de correções sw-v92..v97)
> **Cobre**: Landing `/voluntarios` + Signup `/voluntarios/seja`

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | VOLUNTEER |
| Rota landing | `/voluntarios` |
| Rota signup | `/voluntarios/seja` |
| Componente V3 landing | `src/pages/VolunteerProgram.v3.jsx` (18KB) |
| Componente signup | `src/pages/VolunteerSignup.jsx` (FLUXO multi-step) |
| Wrapper | `src/pages/VolunteerProgram.jsx` (escolhe V3 ou V1 via flag, lazy load) |
| Fallback V1 | `src/pages/VolunteerProgram.v1.jsx` (mantido, 255 linhas) |
| Flag V3 | `V3_PAGE_VOLUNTEER` (default OFF) |
| Auth landing | Pública (sem login) |
| Auth signup | Pública (auto-cadastro via `volunteer_profile/main`) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_VOLUNTEER) === true → <VolunteerProgramV3 /> (lazy)
2. Senão                                       → <VolunteerProgramV1 />
```

### Fluxo Signup (5 steps)

```
1. /voluntarios/seja (root) → escolha: Tenho interesse / Sou abrigo
2. Aceitar termo (termo v1) → grava volunteer_profile (signature_text obrigatório)
3. Preencher perfil (VolunteerProfileForm) → radius_km, experience, notes
4. Escolher abrigo (joinShelterAsVolunteer, IDEMPOTENTE) → clubs/{clubId}/volunteers/{uid}
5. Confirmação (sucesso OU _alreadyExisted: true)
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
| O6 | Conversão signup | Signups completos / visitantes landing | ≥ 2% |
| O7 | Idempotência de join | Race conditions toleradas | 100% |

### Anti-objetivos

- **AO1**: NÃO mostrar CTA principal abaixo da fold
- **AO2**: NÃO esconder os benefícios em accordion (precisam ser visíveis)
- **AO3**: NÃO usar cores sem contraste WCAG AA
- **AO4**: NÃO usar `toast({title, description, variant})` (shadcn) — SEMPRE sonner
- **AO5**: NÃO enviar `undefined` em setDoc do Firestore
- **AO6**: NÃO fazer `React.lazy(Componente)` sem `export default`

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
| 2026-07-27 23:00 | **sw-v75** — Fix VolunteerSignup: signature_text obrigatório no setDoc do `volunteer_profile/main` + conversão 15 chamadas de `toast()` shadcn→sonner |
| 2026-07-27 23:00 | **sw-v76** — Debug logging estruturado no `volunteerProfileService` (`[TEMP-DIAG-VOL]`) |
| 2026-07-27 23:00 | **sw-v77** — try/catch explícito em `acceptVolunteerTerms` |
| 2026-07-28 00:00 | **sw-v78** — Full context log (uid, shelterId, role) |
| 2026-07-28 01:00 | **TEMP-DIAG firestore.rules** — relaxada `volunteer_profile create` |
| 2026-07-28 02:00 | **sw-v79** — `VolunteerProfileForm` corrigido (6 toasts + null) |
| 2026-07-28 03:00 | **sw-v80** — zod `null` fix + remove logs + restore rules (Firestore rejeita `undefined`!) |
| 2026-07-28 04:00 | **sw-v81** — `signatureText` persistido em `sessionStorage` |
| 2026-07-28 05:00 | **sw-v82** — `profile.signature_text` (Firestore) como FONTE CANÔNICA no `handleSubmitJoin` |
| 2026-07-28 06:00 | **TEMP-DIAG-VOL firestore.rules** — removido `isAppCheckVerified()` de clubs/.../volunteers create |
| 2026-07-28 07:00 | **sw-v83** — rule ULTRA relaxada + logs |
| 2026-07-28 08:00 | **sw-v84** — READ rule relaxada + getDoc try/catch + mensagem amigável |
| 2026-07-28 09:00 | **sw-v85** — JOIN IDEMPOTENTE (`_alreadyExisted: true`) |
| 2026-07-29 23:00 | **sw-v86** — Restaurar rules completas (defense-in-depth) |
| 2026-07-30 00:00 | **sw-v87** — D-REACT-QUERY-KEY-PRIMITIVES (10 hooks) — **DIAGNÓSTICO PARCIAL: React Query 5 faz hash, NÃO causa loop!** |
| 2026-07-30 01:00 | **sw-v88** — render counter threshold 50 |
| 2026-07-30 02:00 | **sw-v89** — render counter threshold 3 |
| 2026-07-30 03:00 | **sw-v90** — aba volunteers desabilitada com `false &&` (FALHOU - esbuild tree-shook) |
| 2026-07-30 04:00 | **sw-v91** — `SHOW_VOLUNTEERS_TAB = false` (constante módulo-level) - FUNCIONA |
| 2026-07-31 00:20 | **sw-v92 (commit 0ced567e)** — **CAUSA RAIZ REAL DO REACT #306 ENCONTRADA**: 13 componentes carregados via `React.lazy()` só tinham named export, sem `export default`. Adicionado default export em 13 arquivos. Painel volunteers REABILITADO. |
| 2026-07-31 04:10 | **sw-v93 (commit 030691b7)** — Varredura de reparos: 6+ crashes de runtime (theme-toggle, OnboardingQuestionnaire, bannersService), 3 violações de rules-of-hooks (PetDetailV3, LegalFooter, CrossRosterSection), 2 erros de sintaxe (ClubForumsTab, generateEventIcsCore.test), tailwind config duplicado, eslint config melhorado |
| 2026-07-31 04:36 | **sw-v94 (commit 5e64a7ee)** — Cloud Functions: `pdfkit` adicionado em `functions/package.json` (estava faltando — Cloud Function `generateVolunteerCertificate` quebrava em runtime). Infra de testes com `globals: true` + setupFiles + `globalThis.jest = vi` |
| 2026-07-31 05:36 | **sw-v95 (commit 3cb12127)** — **Regras Firestore quebradas** (5 correções críticas): `shelterCanAccess`/`shelterCanManage` NUNCA foram definidas; subcoleções de PET órfãs (health_records, vet_visits, treatments, care_log, devolutions, adopters_history); `auth.uid` (variável inexistente) em contratos; `community_members`/`community_posts` sem `communityId`; CollectionGroup queries sem regra `{path=**}` |
| 2026-07-31 05:43 | **sw-v96 (commit 2472640b)** — 4 coleções do abrigo órfãs: `shelter_donations`, `shelter_donation_receipts`, `shelter_ledger`, `shelter_ledger_categories` (estavam no top-level em vez de aninhadas sob `clubs/{clubId}/`) |
| 2026-07-31 06:07 | **sw-v97 (commit 4dd8ed43)** — Índices COLLECTION_GROUP para 4 collectionGroup queries compostas: `volunteers`, `fosters`, `post_adoption`, `banners` (68 índices total) |

---

## 16. CAUSA RAIZ DO REACT #306 (DEFINITIVA, 2026-07-31)

### Diagnóstico INCORRETO (sw-v87..v91)

> "React Query 5 queryKey com objeto → loop infinito (React #306)"

**ERRADO!** O React Query 5 faz hash determinístico do queryKey, então
objetos com mesmo conteúdo NÃO causam loop. Os render-counters com
threshold 3 disparavam em **renders legítimos**, mascarando o crash
real.

### Diagnóstico CORRETO (sw-v92, 2026-07-31)

**Causa raiz**: **13 componentes carregados via `React.lazy()` só
tinham named export, sem `export default`**. Ao resolver, `module.default`
era `undefined` → React #306 "Element type is invalid... Lazy element
type must resolve to a class or function" — capturado pelo
ErrorBoundary como "Não foi possível carregar esta aba".

### Componentes corrigidos (13)

**Abas do painel do abrigo (9):**
- `KanbanPage`
- `ExhibitionsList`
- `VolunteersAdminTab`
- `MedicalRecordsList`
- `MedicationsList`
- `TimelineList`
- `FostersList`
- `ShelterDonationsTab`
- `ShelterFinanceTab`

**Rotas (4):**
- `MyContracts`
- `ShelterContractsList`
- `ShelterInterviewsList`
- `PostAdoptionDashboard`

### Padrão aplicado

```jsx
// Antes (NAMED export only — quebra com React.lazy)
export function MyContracts() {
  return <div>...</div>;
}

// Depois (BOTH named AND default — funciona com React.lazy E tests)
export function MyContracts() {
  return <div>...</div>;
}

// Default export para React.lazy() (mantém named export acima para imports diretos/testes).
export default MyContracts;
```

### Por que passou despercebido em 5 deploys (sw-v87..v91)

1. **A "stack trace" do React #306 não mostrava a stack completa do lazy** — apenas
   o erro genérico `Element type is invalid`. O ErrorBoundary capturava
   como "Não foi possível carregar esta aba" sem mais detalhes.
2. **Os render-counters (sw-v88, sw-v89) mascaravam o problema**: quando o
   componente crashava no lazy, o ErrorBoundary re-renderizava, o counter
   incrementava, e o threshold disparava — parecendo um loop de render.
3. **Testes unitários passavam** porque eles importavam via named export
   direto (`import { MyContracts } from '...'`), que sempre funcionou.
4. **Apenas sw-v91 com `SHOW_VOLUNTEERS_TAB = false`** deu um sinal claro
   de que a aba estava desabilitada, mas a stack trace completa só veio
   com a investigação em sw-v92.

### Lição (D-LAZY-DEFAULT-EXPORT)

**REGRA**: Componentes carregados via `React.lazy()` DEVEM ter `export default`.
Para manter compatibilidade com testes, manter AMBOS:
- `export function Name()` — para imports nomeados
- `export default Name` — para `React.lazy()`

**Prevenção**: lint rule custom para detectar `lazy(` que importa
named export only.

---

## 17. Regras Firestore — Correções Definitivas (sw-v95, sw-v96)

### BUGFIX 1: Funções NUNCA definidas (sw-v95)

**Erro de compilação** (warning no log do deploy):
```
Invalid function name: shelterCanAccess
Invalid function name: shelterCanManage
```

**Causa**: Regras de kanban (boards/columns/cards) usavam
`shelterCanAccess` e `shelterCanManage`, mas essas funções **nunca
foram definidas** no bloco `match /clubs/{clubId}`. O compilador
tratava como nome inválido → **kanban SEMPRE negava acesso**.

**Fix**: funções definidas espelhando o padrão de acesso do abrigo
(medications/fosters).

### BUGFIX 2: Subcoleções de PET órfãs (sw-v95)

**Causa**: `health_records`, `vet_visits`, `treatments`, `care_log`,
`devolutions`, `adopters_history` estavam no **top-level** (o bloco
`match /pets/{petId}` fechava antes). Logo, `petId` estava fora de
escopo e o path da regra não casava com o real `pets/{petId}/...`
→ prontuário/vacinas/cuidados/histórico **negavam tudo**.

**Fix**: envolvidas em `match /pets/{petId}` corretamente.

### BUGFIX 3: `auth.uid` em contratos (sw-v95)

**Causa**: `auth.uid` (variável inexistente) em vez de
`request.auth.uid` no create/cancelamento → adotante **não conseguia
criar/cancelar seu contrato**.

**Fix**: trocado `auth.uid` → `request.auth.uid` em todas as ocorrências.

### BUGFIX 4: Communities sem `communityId` (sw-v95)

**Causa**: `community_members` e `community_posts` (coleções top-level)
referenciavam `communityId` não vinculado → forum posting e gestão de
membros negavam.

**Fix**: trocado por `resource.data.community_id` (create usa
`request.resource.data.community_id`).

### BUGFIX 5: CollectionGroup queries sem regra (sw-v95)

**Causa**: **Regras aninhadas por path NÃO cobrem `collectionGroup`**.
8 collectionGroup queries estavam sem regra `{path=**}`:
- `contracts` (Meus Contratos)
- `volunteers` (Minhas Voluntariadas)
- `volunteer_participations`
- `post_adoption` (Devolvidos)
- `fosters` (Histórico público)
- `kanban_cards`
- `banners`
- `volunteer_profile`

**Fix**: adicionadas regras recursivas espelhando a autorização
vetada (padrão medications), preservando isolamento multi-tenant.

### BUGFIX 6: shelter_donations/ledger órfãs (sw-v96)

**Causa**: 4 coleções do abrigo tinham o match no TOP-LEVEL em vez de
aninhado sob `clubs/{clubId}/`:
- `shelter_donations`
- `shelter_donation_receipts`
- `shelter_ledger`
- `shelter_ledger_categories`

Logo, `clubId` estava fora de escopo → path da regra não casava com
o real `clubs/{clubId}/...` → **create/update/delete SEMPRE negados**.

**Fix**: path corrigido de `/<coleção>/{id}` para
`/clubs/{clubId}/<coleção>/{id}`, vinculando `clubId`.

### BUGFIX 7: Índices COLLECTION_GROUP (sw-v97)

**Causa**: Agora que as collectionGroup queries estão autorizadas,
as compostas precisam de índice com `queryScope: COLLECTION_GROUP`
(as single-field são auto-criadas). Sem eles, a query falha com
`FAILED_PRECONDITION` (distinto de `permission-denied`).

**Fix**: adicionados 4 índices:
- `volunteers` (volunteer_uid ASC, volunteer_name ASC)
- `fosters` (foster_uid ASC, status ASC, ended_at DESC)
- `post_adoption` (shelter_club_id ASC, status ASC, returned_at DESC)
- `banners` (status ASC, position ASC)

Total: 68 índices em `firestore.indexes.json`.

### Lição (D-FIRESTORE-RULES-DEFINITION + D-FIRESTORE-MATCH-SCOPE)

**REGRA 1**: Toda função referenciada em uma rule DEV estar definida
no escopo do match. Caso contrário, **compilador trata como `false`**
e a regra sempre nega.

**REGRA 2**: Subcoleções DEVEM ser aninhadas sob o path correto.
Variáveis de escopo (`{petId}`, `{clubId}`, `{communityId}`) só estão
disponíveis dentro do `match` que as declara.

**REGRA 3**: `request.auth.uid` (NÃO `auth.uid`).

**REGRA 4**: CollectionGroup queries precisam de regra própria
`{path=**}` (regras aninhadas por path NÃO cobrem).

**REGRA 5**: CollectionGroup queries COMPOSTAS precisam de índice
`COLLECTION_GROUP` explícito.

**Prevenção**: CI deve rodar `firebase firestore:rules:get --emulator`
e falhar se houver warning "Invalid function/variable name".

---

## 18. Decisões Tomadas (D-*) — Atualizado 2026-08-03

### VolunteerSignup (sw-v75..v86, 2026-07-27..28)

| ID | Decisão | Origem |
|---|---|---|
| D-VOLUNTEER-SIGNATURE-FIELD | `signature_text` obrigatório no primeiro write | sw-v75 |
| D-FIRESTORE-CREATE-VALIDATION | `setDoc({merge: true})` no primeiro write = `create` | sw-v75 |
| D-TOAST-SONNER-API | SEMPRE `toast.success/error(msg, {description})` (sonner) | sw-v75 |
| D-FIRESTORE-NO-UNDEFINED | Firestore rejeita `undefined` em setDoc | sw-v80 |
| D-ZOD-NO-NULL-OPTIONAL | zod `.optional()` aceita undefined mas não `null` | sw-v80 |
| D-VOLUNTEER-SIGN-MIN-3 | `handleAcceptTerms` valida `>= 3 chars` | sw-v80 |
| D-VOLUNTEER-SIGN-PERSIST | `signatureText` em `sessionStorage` | sw-v81 |
| D-VOLUNTEER-SIGNATURE-SOURCE | `profile.signature_text` (Firestore) como fonte canônica | sw-v82 |
| D-IDEMPOTENT-JOIN | Mutations de create DEVEM ser idempotentes | sw-v85 |
| D-DEBUG-FIRESTORE-RULES-LEVEL-2 | Workflow em 4 níveis para permission-denied | sw-v82..v84 |
| D-VOLUNTEER-JOIN-RULE | Rules estritas (defense in depth) | sw-v86 |

### Debug React (sw-v87..v92, 2026-07-30..31)

| ID | Decisão | Origem |
|---|---|---|
| ~~D-REACT-QUERY-KEY-PRIMITIVES~~ | **OBSOLETA**: React Query 5 faz hash, NÃO causa loop. **Não usar** | sw-v87 (DESCARTADO) |
| D-DEBUG-RENDER-COUNTER | TEMP-DIAG-ROSTER + TEMP-DIAG-PANEL counters | sw-v88 |
| D-MODULE-LEVEL-CONSTANTS-NO-TREE-SHAKE | `const SHOW_X = false` (não `false &&`) | sw-v91 |
| **D-LAZY-DEFAULT-EXPORT** | **Componentes via `React.lazy()` DEVEM ter `export default`** | **sw-v92 (CORRETO)** |

### Firestore Rules (sw-v95..v97, 2026-07-31)

| ID | Decisão | Origem |
|---|---|---|
| **D-FIRESTORE-RULES-DEFINITION** | Funções referenciadas DEVEM estar definidas no escopo | sw-v95 |
| **D-FIRESTORE-MATCH-SCOPE** | Subcoleções DEVEM ser aninhadas sob path correto | sw-v95 |
| **D-FIRESTORE-REQUEST-AUTH-UID** | SEMPRE `request.auth.uid` (NUNCA `auth.uid`) | sw-v95 |
| **D-COLLECTION-GROUP-RULES** | CollectionGroup queries precisam de regra `{path=**}` | sw-v95 |
| **D-COLLECTION-GROUP-INDEX** | CollectionGroup queries compostas precisam de índice COLLECTION_GROUP | sw-v97 |

### Other (sw-v93, sw-v94, 2026-07-31)

| ID | Decisão | Origem |
|---|---|---|
| **D-HOOKS-ORDER-PRESERVE** | Hooks DEVEM vir ANTES de early return (rules-of-hooks) | sw-v93 |
| **D-IMPORT-CHECK** | SEMPRE verificar imports (tree-shaking remove unused) | sw-v93 |
| **D-LINT-CFG-TEST-GLOBALS** | eslint config deve expor globals de test-runner | sw-v93 |
| **D-TAILWIND-CONFIG-DEDUP** | tailwind config NÃO deve ter chave duplicada | sw-v93 |
| **D-FUNCTIONS-DEPS-CHECK** | Cloud Functions DEVEM ter TODAS as deps em `functions/package.json` | sw-v94 |
