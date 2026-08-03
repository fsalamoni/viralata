# Documento de Regência — ORG_ADMIN V3

> **Status**: ✅ DEPLOYED (TASK-V3-ORG_ADMIN) + ciclo de correções sw-v92 (React #306) + PR #206/#207/#208 (permissions)
> **Diretriz ETERNA**: `docs/PAGE_REGENCY_TEMPLATE.md`
> **Atualizado em**: 2026-08-03

---

## 0. Identidade

| Campo | Valor |
|---|---|
| KEY | ORG_ADMIN |
| Rota | `/organizacoes/:orgId/admin` |
| Componente V3 | `src/modules/organizations/pages/OrganizationAdminPanel.v3.jsx` (45KB) |
| Wrapper | `src/modules/organizations/pages/OrganizationAdminPanel.jsx` |
| Fallback V1 | `src/modules/organizations/pages/OrganizationAdminPanel.v1.jsx` (35KB) |
| Flag V3 | `V3_PAGE_ORG_ADMIN` (default OFF) |
| Auth | **hasAnyClubPermission** (gate estrito) |
| Plataforma | Mobile-first, responsivo (testado em 360/768/1280) |

### Prioridade de seleção (no wrapper)

```
1. useFeatureFlag(V3_PAGE_ORG_ADMIN) === true → <PageV3 /> (lazy)
2. Senão                              → <PageV1 />
```

> **D-VITE-LAZY-01**: Vite faz constant folding em if/else com flag estática.
> Wrapper DEVE usar `React.lazy()` com dynamic import.

### Diferencial V3 vs V1

V1 (35KB) é funcionalmente completo mas com:
- Header `arena-admin-header` simples (sem gradient)
- 4 stats escondidos no OverviewTab (não visíveis no load)
- Navegação 2-layer (groups + sub-tabs) mas SEM busca
- 6 grupos (Visão Geral/Operacional/Pessoas/Engajamento/Financeiro/Configurações)

V3 (45KB) redesenhado do zero:
- Hero impactante com gradient sky→indigo→violet
- 4 stat cards visíveis no hero
- Busca por funcionalidade no Overview
- Filtro por grupo de funcionalidade
- Atividade recente + Sobre
- Welcome contextual
- Acess denied, loading, error states melhorados
- JSON-LD WebPage

---

## 1. Objetivos de Negócio

| # | Objetivo | Métrica | Meta |
|---|---|---|---|
| O1 | Admin encontra funcionalidade rapidamente | Busca + categoria | ≥ 60% |
| O2 | Visualizar stats da ONG sem trocar de aba | Stats no hero | 100% |
| O3 | 19 sub-abas acessíveis | Navegação 2-layer | 100% |
| O4 | Visão geral clara | Overview rich | 100% |
| O5 | Acessibilidade | Lighthouse a11y | ≥ 95 |
| O6 | Performance | Lighthouse perf | ≥ 85 |

### Anti-objetivos

- **AO1**: NÃO permitir acesso a quem não tem permissão
- **AO2**: NÃO perder as 19 sub-abas testadas
- **AO3**: NÃO quebrar feature flags shelter (foundation/dashboard/kanban/etc)

---

## 2. Estrutura Visual

### S1 — Breadcrumb + back
- Button "Voltar para a ONG" (sm, ghost)
- Breadcrumb: Início > Organizações > ONG > Administração

### S2 — Hero impactante (gradient sky-indigo-violet)
- 2 badges: "Administração" + "Proprietário" (se owner)
- Avatar com iniciais (16x16 / 20x20 mobile/desktop) backdrop-blur
- H1: nome da ONG
- Subtítulo: localização
- 4 stat cards decorativos: Membros / Pets / Adoções / Eventos

### S3 — Group Tabs (2-layer navigation)
- 6 grupos em pills horizontais: Visão Geral/Operacional/Pessoas/Engajamento/Financeiro/Configurações
- Mobile: shortLabel (Início/Operacional/etc)
- Active: bg-primary + text-primary-foreground

### S4 — Sub-Tabs (dentro do grupo)
- Pills horizontais (overflow-x-auto mobile)
- Active: bg-foreground + text-background
- 19 sub-abas no total

### S5 — Conteúdo (variado)
- **Overview**: 4 stats + busca + filtro + grid de 9 quick actions + atividade recente + sobre
- **Operacional**: Pets/Prontuário/Medicação/Timeline
- **Pessoas**: Equipe/Voluntários/Lares
- **Engajamento**: Mural/Chat/Pendências/Vitrines
- **Financeiro**: Doações/Campanhas/Prestação/Relatórios/Indicadores
- **Configurações**: Geral/Configurações/Dashboard

### S6 — Empty/Error states
- Erro Firestore: ErrorState com retry
- ONG não encontrada: EmptyState
- Sem acesso: toast + redirect

---

## 3. Hierarquia Tipográfica

| Nível | Tamanho | Uso |
|---|---|---|
| H1 (hero) | `text-2xl sm:text-3xl lg:text-4xl` | Nome da ONG |
| H2 (group/section) | `text-base font-bold` | "Atividade recente" |
| H3 (sub-action) | `text-sm font-bold` | "Pets" |
| Body | `text-sm` | Geral |
| Description | `text-xs` | Subtítulo |
| Stat value | `text-xl sm:text-2xl` | Stats do hero |
| Stats overview | `text-2xl font-extrabold` | Cards do Overview |

---

## 4. Paleta de Cores (DS-V2)

### Hero gradient:
- `from-sky-500 via-indigo-600 to-violet-600` (sky-indigo-violet, vibrante)

### Stats (decorativos):
- sky (Membros) / amber (Pets) / rose (Adoções) / emerald (Eventos)

### Quick action colors:
- primary (3) / amber (1) / sky (2) / rose (1) / emerald (2) / violet (1)

### Sub-tab colors:
- active: bg-foreground + text-background
- inactive: text-muted-foreground

### Badges (hero):
- bg-white/20 (Administração) / bg-amber-500/20 (Proprietário)

---

## 5. Estados Comportamentais

### Loading
- OrgAdminSkeleton com hero + 4 stats + tabs skeleton + 6 cards skeleton

### Error (Firestore)
- ErrorState com código + mensagem
- Botão "Tentar novamente" (refetch)
- Botão "Voltar para Organizações"

### Not Found
- EmptyState com Building2
- "Organização não encontrada"
- CTA "Voltar"

### Access Denied
- useEffect redirect com toast.error
- return null (evita flash)

### Search (Overview)
- Filtra quick actions por title OU desc
- Clear button (X) quando search tem valor
- Combina com activeFilter (group)

### Group tab
- 6 pills horizontais (overflow-x-auto mobile)
- Click altera active state
- Active: bg-primary + shadow

### Sub-tab
- Pills dentro do grupo ativo
- Active: bg-foreground
- Hidden se grupo não tem sub-abas

### Mobile
- Stack vertical
- Hero stats em grid 2 colunas
- Group tabs com shortLabel
- Sub-tabs em overflow-x-auto

### Desktop
- Hero com stats em grid 4 colunas
- Group tabs com full label
- Sub-tabs em flex-wrap

### Dark mode
- Hero gradient mantém contraste
- Cards `bg-card` adaptam
- Stats do overview com tokens dark

### Reduced motion
- Animações staggered no hero + stats
- whileInView em OverviewTab stats

### TabErrorBoundary
- Captura erros de tabs lazy
- Mostra card "Não foi possível carregar esta aba"
- Outras tabs continuam funcionando

---

## 6. Performance

| Métrica | Meta | V3 |
|---|---|---|
| Bundle V3 chunk | < 50KB | ~45KB (componentes lazy) |
| LCP (mobile 4G) | < 2.5s | _a medir_ |
| CLS | 0 | 0 (skeleton idêntico) |
| Lighthouse a11y | ≥ 95 | _a medir_ |
| Lighthouse perf | ≥ 85 | _a medir_ |

### Otimizações aplicadas
- `React.lazy()` para 18 componentes de tab
- `useMemo` para filteredActions, visibleTabs, shelterTabs, subsByGroup, visibleGroups, jsonLd
- Skeleton com layout idêntico
- Suspense fallback com OrgAdminSkeleton

---

## 7. Acessibilidade (a11y)

| Critério | Implementação |
|---|---|
| Hero landmarks | `<motion.section>` |
| Stats decorativos | Visíveis, com labels |
| Search input | `<Input type="search">` com aria-label |
| Group tabs | `<button>` com `aria-pressed` |
| Sub-tabs | `<button>` com `aria-pressed` |
| Quick action cards | `<motion.button>` com `data-testid` |
| TabErrorBoundary | Captura e mostra estado acessível |
| Navegação por teclado | Tab order natural |
| Focus visível | `focus-visible:ring-2` |
| JSON-LD | `WebPage` schema com isPartOf |
| Reduced motion | `useReducedMotion()` respeitado |
| Contraste | WCAG AA |

---

## 8. SEO

```html
<title>Admin {clubName} — Viralata</title>
<meta name="description" content="Painel administrativo de {clubName}." />
```

- **Canonical**: `/organizacoes/:orgId/admin`
- **JSON-LD**: `WebPage` schema (com isPartOf WebSite)
- **Open Graph**: `og:title` "Admin {clubName} — Viralata", `og:type` "website"

---

## 9. Integrações

| Integração | Onde | Status |
|---|---|---|
| `useClub` (organizations/hooks) | Carregar ONG | ✅ Reusado |
| `useMyMembership` (organizations/hooks) | Permissões | ✅ Reusado |
| `useMyPets` (pets/hooks) | Contagem pets | ✅ Reusado |
| `useFeatureFlag` (core) | 14 shelter flags | ✅ Reusado |
| `useAuth` (FirebaseAuthContext) | User | ✅ Reusado |
| `useToast` (core) | Notificações | ✅ Reusado |
| `useReducedMotion` (framer) | Animações | ✅ Reusado |
| `cn` (utils) | Classes condicionais | ✅ Reusado |
| `ErrorState`, `EmptyState`, `Skeleton`, `Badge`, `Button`, `Input`, `Breadcrumb` | UI base | ✅ Reusados |
| `Seo` | Meta tags | ✅ Reusado |
| `ClubThemedScope` | Theming | ✅ Reusado |
| `TabErrorBoundary` | Defense in depth | ✅ V3 reescrito |
| `parseTimestamp` (utils) | Fundação | ✅ Reusado |
| `isClubOwner`, `hasClubPermission`, `hasAnyClubPermission`, `canViewVolunteersRoster` (permissions) | Roles | ✅ Reusado |
| `CLUB_PERMISSION` (constants) | Permissões | ✅ Reusado |
| `CLUB_DIRECTORY_STATUS` (directory) | Status | ✅ Reusado |
| `recordClientError`, `captureError` (services) | Observabilidade | ✅ Reusado |

### Tabs (lazy imports - V1 components reusados como views)
- 8 components de organizations: ClubAdminTab, ClubTeamTab, ClubPetsDataGrid, ClubFeedTab, ClubDonationsTab, ClubFinanceTab, ClubGeneralAdminTab, ClubChatAdminTab
- 11 components de shelter: ReportsTab, IndicatorsTab, DashboardPage, KanbanPage, ExhibitionsList, VolunteersAdminTab, MedicalRecordsList, MedicationsList, TimelineList, FostersList, ShelterDonationsTab, ShelterFinanceTab

> V3 REUSA os COMPONENTES de tab (views testadas) mas tem JSX próprio para wrapper/header/overview.

---

## 10. Edge Cases Tratados

| Caso | Comportamento |
|---|---|
| Flag V3 OFF | Wrapper renderiza V1 |
| !isAuthenticated | Loading state |
| !hasAnyClubPermission | toast.error + redirect |
| Flag load | OrgAdminSkeleton |
| Search sem matches | "Nenhuma funcionalidade encontrada" + Limpar filtros |
| Categoria sem actions | Não renderiza grupo |
| Search + filtro | Combina lógica |
| Tab lazy error | TabErrorBoundary captura |
| Shelter flag OFF | Tab shelter não aparece |
| ONG não encontrada | EmptyState |
| Firestore error | ErrorState com retry |
| Mobile 360px | Stack vertical, shortLabel |
| Desktop 1280px | Hero stats 4 colunas |
| Dark mode | Tokens trocam |
| Reduced motion | Animações desabilitadas |
| URL state inválido | Volta para overview |
| Owner badge | Aparece se isClubOwner |
| JS desabilitado | EmptyState fallback |

---

## 11. Testes

### Unitários (TODO)
- `src/modules/organizations/pages/OrganizationAdminPanel.v3.test.jsx`: render, search, group, sub, gate, tab error

### Manual (pré-deploy)
- [x] Mobile 360px: stack vertical, shortLabel
- [x] Tablet 768px: hero centralizado
- [x] Desktop 1280px: hero stats 4 colunas
- [x] Dark mode: tokens trocam
- [x] Search: filtra por nome/descrição
- [x] Group tab: filtra quick actions
- [x] Sub-tab: troca conteúdo
- [x] Combinação search + group
- [x] Empty state: "Nenhuma funcionalidade encontrada"
- [x] Loading: skeleton
- [x] Error: ErrorState com retry
- [x] Not Found: EmptyState
- [x] Access Denied: toast + redirect
- [x] Atividade recente: 4 items
- [x] About: descrição da ONG
- [x] TabErrorBoundary: tab error capturado
- [x] Reduced motion: animações desabilitadas

---

## 12. Métricas Pós-Deploy

| Métrica | Como medir | Meta |
|---|---|---|
| Stats visualizados | GA4 page view | 100% |
| Uso de busca | GA4 event | ≥ 60% |
| Quick action clicks | GA4 event | 100% |
| Group tab navigation | GA4 event | 100% |
| Sub-tab navigation | GA4 event | 100% |
| Lighthouse a11y | PageSpeed | ≥ 95 |

---

## 13. Decisões Tomadas (D-ORG-ADMIN-V3-01..12)

| ID | Decisão | Justificativa |
|---|---|---|
| D-ORG-ADMIN-V3-01 | Hero impactante gradient sky-indigo-violet | Vibração admin |
| D-ORG-ADMIN-V3-02 | 4 stat cards no hero (sempre visíveis) | Stats no load |
| D-ORG-ADMIN-V3-03 | 2-layer tabs (group + sub) | 19 sub-abas navegáveis |
| D-ORG-ADMIN-V3-04 | Busca por funcionalidade no Overview | Localizar rápido |
| D-ORG-ADMIN-V3-05 | Filtro por grupo | Combina com busca |
| D-ORG-ADMIN-V3-06 | Quick action cards com ArrowUpRight | Click cue |
| D-ORG-ADMIN-V3-07 | Atividade recente (4 items) | Visão geral |
| D-ORG-ADMIN-V3-08 | Sobre a organização (descrição) | Contexto |
| D-ORG-ADMIN-V3-09 | Avatar com iniciais backdrop-blur | Identidade visual |
| D-ORG-ADMIN-V3-10 | TabErrorBoundary (defense in depth) | Isolamento de erros |
| D-ORG-ADMIN-V3-11 | Reusa tabs V1 via React.lazy | Funcionalidade testada |
| D-ORG-ADMIN-V3-12 | JSON-LD WebPage schema | SEO |

---

## 14. Pendências (Tarefas Filhas)

| ID | Tarefa | Estimativa | Status |
|---|---|---|---|
| TASK-V3-ORG_ADMIN-1 | Hero impactante gradient | 1.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-2 | 4 stat cards plataforma | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-3 | 2-layer tabs | 1.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-4 | Busca com clear | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-5 | Filtro por grupo | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-6 | Quick action cards | 1.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-7 | Atividade recente | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-8 | Sobre a organização | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-9 | Avatar com iniciais | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-10 | TabErrorBoundary | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-11 | Reusa tabs V1 via React.lazy | 1h | ✅ Feito |
| TASK-V3-ORG_ADMIN-12 | JSON-LD WebPage | 0.5h | ✅ Feito |
| TASK-V3-ORG_ADMIN-13 | Testes unitários V3 | 3h | 🟡 Pendente |
| TASK-V3-ORG_ADMIN-14 | E2E Playwright | 4h | 🟡 Pendente |

---

## 15. Histórico

| Data | Evento |
|---|---|
| 2026-07-19 23:50 | Análise V1 (35KB, 19 sub-abas, shelter flags) |
| 2026-07-19 23:50 | V3 implementada (45KB, 8 sub-componentes) |
| 2026-07-19 23:50 | Regência preenchida (15 seções) |
| 2026-07-19 23:50 | Deploy + SCRUM update |
| 2026-07-30 00:00 | **sw-v87..v91** — Investigação React #306 na aba volunteers (diagnóstico incorreto: queryKey object loop) |
| 2026-07-30 04:00 | **sw-v91** — `SHOW_VOLUNTEERS_TAB = false` (aba volunteers temporariamente desabilitada) |
| 2026-07-31 00:20 | **sw-v92 (commit 0ced567e)** — **CAUSA RAIZ ENCONTRADA**: 9 abas carregadas via `React.lazy()` sem `export default` (`KanbanPage`, `ExhibitionsList`, `VolunteersAdminTab`, `MedicalRecordsList`, `MedicationsList`, `TimelineList`, `FostersList`, `ShelterDonationsTab`, `ShelterFinanceTab`). Adicionado `export default` em todas. Painel volunteers REABILITADO. `SHOW_VOLUNTEERS_TAB` removido. |
| 2026-07-31 04:10 | **sw-v93 (commit 030691b7)** — `AdoptionDetail`: useQuery após early return (rules-of-hooks) → corrigido |

---

## 16. CRITICAL FIX — React #306 nas abas (sw-v92, 2026-07-31)

### Sintoma

Ao acessar `/organizacoes/:orgId/admin?tab=...` com qualquer uma
das 9 abas de shelter (kanban, exhibitions, volunteers, etc), o
ErrorBoundary capturava "Não foi possível carregar esta aba".

### Causa raiz (sw-v92)

9 componentes carregados via `React.lazy()` no painel admin tinham
apenas **named export** (sem `export default`). Ao resolver, o
`module.default` era `undefined` → React #306 "Element type is
invalid... Lazy element type must resolve to a class or function"
— capturado pelo ErrorBoundary como "Não foi possível carregar esta aba".

### Componentes corrigidos (9)

| Componente | Caminho |
|---|---|
| `KanbanPage` | `src/modules/shelter/components/KanbanPage.jsx` |
| `ExhibitionsList` | `src/modules/shelter/components/ExhibitionsList.jsx` |
| `VolunteersAdminTab` | `src/modules/shelter/components/VolunteersAdminTab.jsx` |
| `MedicalRecordsList` | `src/modules/shelter/components/MedicalRecordsList.jsx` |
| `MedicationsList` | `src/modules/shelter/components/MedicationsList.jsx` |
| `TimelineList` | `src/modules/shelter/components/TimelineList.jsx` |
| `FostersList` | `src/modules/shelter/components/FostersList.jsx` |
| `ShelterDonationsTab` | `src/modules/shelter/components/ShelterDonationsTab.jsx` |
| `ShelterFinanceTab` | `src/modules/shelter/components/ShelterFinanceTab.jsx` |

### Padrão aplicado (D-LAZY-DEFAULT-EXPORT)

```jsx
// Antes (NAMED export only — quebra com React.lazy)
export function KanbanPage() {
  return <div>...</div>;
}

// Depois (BOTH named AND default)
export function KanbanPage() {
  return <div>...</div>;
}

// Default export para React.lazy() (mantém named export acima para imports diretos/testes).
export default KanbanPage;
```

### Por que passou despercebido (5 deploys sw-v87..v91)

1. O "render counter" com threshold 3 (sw-v89) mascarava o problema.
2. Testes unitários passavam (named import direto).
3. Stack trace do React #306 não mostrava lazy stack.
4. sw-v91 só deu pista clara ao desabilitar a aba.
5. A stack completa só veio com a investigação do Claude em sw-v92.

### Lição

**REGRA**: Componentes carregados via `React.lazy()` DEVEM ter `export default`.
Para manter compatibilidade com testes, manter AMBOS.

**Prevenção**: lint rule custom para detectar `lazy(` que importa
named export only.

### Correção secundária (sw-v93)

`AdoptionDetail.jsx`: `useQuery` (postAdoption) chamado após early return,
violando rules-of-hooks → movido para antes dos returns.

---

## §17. CRITICAL FIX — Permissions para Usuários Não-Admin (PR #207, 2026-08-03)

Vários fluxos davam "Missing or insufficient permissions" para
qualquer usuário que não fosse o `platform_admin`. Causas e
correções em `firestore.rules`:

### 1. Criar organização/abrigo (`createClub`)

**Causa**: `createClub` grava o doc do clube E o membership admin
do criador no MESMO `writeBatch`. A regra de create de
`club_members` exigia `isClubOwnerUid` (get do clube), mas em um
batch o clube **ainda não foi commitado** → negado.

**Fix**: Adiciona `isClubOwnerUidAfter` (getAfter/existsAfter) e
permite o criador autocriar sua associação admin quando o clube
está sendo criado no mesmo batch.

### 2. Entrar no abrigo por convite/código (`joinClubByCode`)

**Causa**: `joinClubByCode` grava o membership E incrementa
`member_count` no mesmo batch. A regra de update do clube exigia
`isClubMember`, mas o membership é criado no mesmo batch → negado.

**Fix**: Adiciona `isClubMemberAfter` (existsAfter) ao ramo de
`member_count`.

### 3. Cadastrar pets (`getNextPetSeq`)

**Causa**: `getNextPetSeq` usa `runTransaction` em
`pet_seq_counter/global`, mas a regra restringia a `platform_admin`.
A transação de todos os outros usuários falhava (caindo no fallback
por timestamp, que quebra a **unicidade do pet_seq**).

**Fix**: Libera leitura/escrita do contador para qualquer usuário
autenticado (doc só guarda value).

### 4. Inscrever-se como voluntário (`JoinVolunteerModal`)

**Causa**: Hook chamado com shape errado (`useAcceptVolunteerTerms`
sem uid; payloads sem `acceptance/actor/input`; sem
`signature_text`; lia `terms_accepted_version` inexistente).

**Fix**: Reescreve `handleSubmit` para o contrato correto, coleta
a assinatura eletrônica no passo do termo, e relaxa a regra de
create de `volunteer_profile` (valida os campos de assinatura só
quando presentes; o aceite continua imutável em
`terms_acceptances` e reforçado na rostagem).

### Mecanismo `getAfter` / `existsAfter`

```js
// isClubOwnerUid (antes do commit) — usado em updates normais
function isClubOwnerUid(clubId, uid) {
  return exists(/databases/$(database)/documents/clubs/$(clubId))
    && get(/databases/$(database)/documents/clubs/$(clubId)).data.created_by == uid;
}

// isClubOwnerUidAfter (depois do commit) — usado em batches onde o clube é criado junto
function isClubOwnerUidAfter(clubId, uid) {
  return existsAfter(/databases/$(database)/documents/clubs/$(clubId))
    && getAfter(/databases/$(database)/documents/clubs/$(clubId)).data.created_by == uid;
}
```

### D-* decisões

| ID | Decisão |
|---|---|
| **D-FIRESTORE-BATCH-AFTER** | Em `writeBatch` que cria doc E referencia ele (ex.: createClub), usar `getAfter`/`existsAfter` na rule para enxergar estado pós-commit |
| **D-FIRESTORE-COUNTER-OPEN-AUTH** | `pet_seq_counter/global` é liberado para qualquer auth (doc só guarda value, sem dados sensíveis) |
| **D-VOLUNTEER-SIGN-AT-TERM-STEP** | `signature_text` é coletado no passo do termo (NÃO no submit final) |

---

## §18. CRITICAL FIX — Curtir/Comentar no Mural e Fórum (PR #208, 2026-08-03)

Várias ações sociais comuns davam permission-denied para quem não
era autor/admin, porque a transação/updateDoc que incrementa o
contador no doc-pai era barrada pela regra de update.

### 1. Mural da ONG (`club_posts`)

**Causa**: Curtir/comentar incrementa `likes_count` /
`comments_count` no post via transação. A regra de update só
permitia autor (com 0 curtidas), admin ou permissão `feed` →
membro comum não conseguia curtir nem comentar.

**Fix**: Adiciona ramo que libera atualizar **SOMENTE os
contadores** (sem alterar outros campos).

### 2. Mural da comunidade (`community_posts`)

Mesmo caso: curtir/comentar incrementa `likes_count` /
`comments_count`, mas a regra só permitia autor ou admin da
comunidade.

**Fix**: Adiciona o mesmo ramo de contadores.

### 3. Fórum da ONG (`club_forum_threads`)

**Causa**: Ao comentar num tópico, o serviço atualiza
`comment_count` / `last_activity_ms` / `participant_ids` do
tópico. A regra só permitia autor/admin → para não-autores a
atualização era negada (silenciosa, mas o tópico não subia nem
contava direito).

**Fix**: Libera membros do clube a atualizar **SOMENTE esses
campos de atividade**.

### Padrão usado (D-FIRESTORE-IS-ONLY-COUNTERS-UPDATE)

Padrão idêntico ao já existente em `club_forum_threads(likes)` /
`community_forum_threads` / `community_forum_messages` (hasOnly de
contadores). O **doc de like/comentário continua gated** à parte;
**contadores são cosméticos** (a verdade é a subcoleção). Sem
ampliação de acesso relevante.

```js
// Helper compartilhado
function isOnlyCountersUpdate(allowedFields) {
  return request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(allowedFields);
}

// Regra de update de club_posts
allow update: if isAuth() && (
  // 1. Autor com 0 curtidas
  (resource.data.author_uid == request.auth.uid && resource.data.likes_count == 0) ||
  // 2. Admin
  isClubAdmin(clubId) ||
  // 3. Permissão 'feed'
  hasClubPermission(clubId, 'feed') ||
  // 4. NOVO: qualquer membro pode atualizar SOMENTE contadores
  (isClubMember(clubId) && isOnlyCountersUpdate(['likes_count', 'comments_count', 'updated_at']))
);
```

### D-* decisões

| ID | Decisão |
|---|---|
| **D-FIRESTORE-COUNTER-OPEN-TO-MEMBERS** | Qualquer membro do clube pode atualizar SOMENTE contadores denormalizados. O doc de like/comentário continua gated. |
| **D-FIRESTORE-IS-ONLY-COUNTERS-UPDATE** | Helper `isOnlyCountersUpdate(fields)` valida que `affectedKeys().hasOnly(fields)` antes de permitir o update |

---

## §19. Histórico Consolidado (Atualizado 2026-08-03)

| Data | Evento |
|---|---|
| 2026-07-19 23:50 | V3 implementada (45KB, 8 sub-componentes) |
| 2026-07-19 23:50 | Regência preenchida (15 seções) |
| 2026-07-19 23:50 | Deploy + SCRUM update |
| 2026-07-30 04:00 | sw-v91: `SHOW_VOLUNTEERS_TAB = false` (aba volunteers desabilitada) |
| 2026-07-31 00:20 | sw-v92: 9 abas do painel corrigidas (React.lazy + export default) — Painel volunteers REABILITADO |
| 2026-07-31 04:10 | sw-v93: AdoptionDetail useQuery após early return corrigido |
| 2026-08-01 18:00 | **PR #206**: Fix medicação + pet ID display + status por data efetiva |
| 2026-08-03 14:34 | **PR #207**: Fix permissions (criar abrigos, entrar, pets, voluntários) — `getAfter`/`existsAfter` em batches |
| 2026-08-03 14:53 | **PR #208**: Fix permissions (curtir/comentar em mural e fórum) — `isOnlyCountersUpdate` |
