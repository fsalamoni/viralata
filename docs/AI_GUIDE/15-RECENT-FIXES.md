# 15-RECENT-FIXES.md — Últimos 30 Dias

> **Atualizado em 2026-08-03** (sw-v75..v97)
>
> Documento vivo. **SEMPRE** verificar antes de fixar um bug — pode já
> ter sido corrigido.

---

## §1. Hotfixes PWA em Cadeia (2026-07-22)

### §1.1. sw-v72.5 — MessageSquare undefined

**Data**: 2026-07-22
**Severidade**: ALTA (quebrava PetDetailV3 em produção)
**Sintoma**: `MessageSquare is not defined` ao abrir detalhe de pet.
**Causa raiz**: `MessageSquare` adicionado ao JSX mas não ao import
de `lucide-react`. Build (Vite + tree-shaking) não pegou.
**Fix**: adicionar ao import + script de validação.
**D-**: `D-PET-OPS-LUCIDE-IMPORT`.
**Arquivos**:
- `src/modules/pets/pages/PetDetailV3.jsx`
- `scripts/validate-lucide-imports.mjs` (NEW)

**Commits**:
- sw-v72.5 fix

### §1.2. sw-v73.1 — Auto-unregister stale SWs

**Data**: 2026-07-22
**Severidade**: MÉDIA (UX ruim, não quebrava)
**Sintoma**: bundle deployed correto mas user via bundle stale.
**Causa raiz**: SW v72 cacheado, check contra URL inexistente → HTML
fallback → update falhava silenciosamente.
**Fix**: `unregisterStaleAndMaybeReload()` no `window 'load'`.
**D-**: `D-PWA-STALE-UNREGISTER`.

### §1.3. sw-v73.2 — Unregister ALWAYS

**Data**: 2026-07-22
**Severidade**: MÉDIA
**Sintoma**: sw-v73.1 não funcionava.
**Causa raiz**: `if (!PWA_ENABLED) return` early-return impedia a
lógica de unregister.
**Fix**: refatorar para rodar SEMPRE.
**D-**: `D-PWA-UNREGISTER-ALWAYS`.

### §1.4. sw-v73.3 — canEdit ReferenceError

**Data**: 2026-07-22
**Severidade**: ALTA (quebrava `/pets/<id>`)
**Sintoma**: `ReferenceError: canEdit is not defined`.
**Causa raiz**: `canEdit` renomeado para `canEditHistory` em escopo do
componente, mas usado na linha 770 com nome antigo.
**Fix**: `canEdit` → `canEditHistory` em `PetDetailV3.jsx:770`.
**D-**: `D-PET-DETAIL-RUNTIME-TEST` (runtime test teria pego).
**Arquivos**:
- `src/modules/pets/pages/PetDetailV3.jsx`
- `src/modules/pets/pages/PetDetailV3.runtime.test.jsx` (NEW)

### §1.5. sw-v73.3 — Defer Reload

**Data**: 2026-07-22
**Severidade**: ALTA (UX destrutivo)
**Sintoma**: "trava" na página /voluntarios/seja ao clicar em "Aceitar
e continuar" após digitar.
**Causa raiz**: reload de 50ms disparava no meio de interação.
**Fix**: track user activity via `pwa-stale-last-activity` (sessionStorage).
Se interagiu < 5s, defer 5s.
**D-**: `D-PWA-STALE-UNREGISTER-DEFER`.

---

## §2. Auditoria Completa 2026-07-23

### §2.1. Test fixes (4 testes quebrados)

| # | Test | Problema | Fix |
|---|------|----------|-----|
| 1 | `ShelterAdminDashboard.test.jsx` | Importava named export mas só tem `export default` | `.default` no dynamic import |
| 2 | `searchService.test.js` (foster) | Esperava `fosters` mas TASK-312 introduziu `search_fosters` | Atualizar para `search_fosters` |
| 3 | `volunteerAssignmentService.test.js` | Misturava `import` ESM e `require` CJS | Converter para ESM puro |
| 4 | `ErrorState.test.jsx` | Esperava prop `message` mas usa `title`/`description` | Atualizar para `title`/`description` |

**Commits**:
- `3bfad320` — fix(tests): corrige 3 testes
- `604bc6d2` — fix(tests): ErrorState prop mismatch + docs

### §2.2. Documentação (3 docs atualizados + 1 novo)

| Doc | Mudança |
|-----|---------|
| `docs/AI_CONTEXT.md` | Adicionado sw-v72.5..sw-v73.3 hotfixes |
| `docs/ROADMAP.md` | Seção "Hotfixes PWA em cadeia" + sw-v73 |
| `docs/AUDITS/AUDIT_FULL_2026-07-23.md` (NEW) | Relatório completo |

---

## §3. Pet Ops V3 — TASK-V3-PET-OPS-LOG (2026-07-22)

### §3.1. sw-v72.4 — Pet Ops V3

**Data**: 2026-07-22
**Severidade**: N/A (feature)
**Descrição**: TASK-V3-PET-OPS-LOG — implementar sistema completo de
gestão de pets para admins.

**Componentes novos**:
- `src/modules/pets/services/petLogService.js` (NEW)
- `src/modules/pets/services/petNotesService.js` (NEW)
- `src/modules/pets/services/petTimelineService.js` (NEW)
- `src/modules/pets/components/PetLog.jsx` (NEW)
- `src/modules/pets/components/PetNotes.jsx` (NEW)
- `src/modules/pets/components/PetTimelineView.jsx` (NEW)
- `src/modules/organizations/components/PetsOpsTable.jsx` (NEW)

**Modificações**:
- `src/modules/pets/pages/PetDetailV3.jsx` — 3 novas tabs + hash router
- `src/modules/pets/services/petService.js` — `getNextPetSeq()` + log em CRUD
- `firestore.rules` — regras para pet_log, pet_notes, pet_seq_counter

**Tests novos**:
- `petLogService.test.js`
- `petNotesService.test.js`
- `petTimelineService.test.js`
- `PetNotes.runtime.test.jsx`
- `PetLog.runtime.test.jsx`
- `PetTimelineView.runtime.test.jsx`
- `PetsOpsTable.runtime.test.jsx`

**PR**: #198
**Documentação**: `docs/REGENCY_PET_OPS_V3.md`

---

## §4. Outros Fixes Recentes (resumo)

### §4.1. sw-v72 — PetDetailView V3 Redesign

**Data**: 2026-07-22
**PR**: #194
**Descrição**: redesign completo do PetDetailView (público).
**D-**: `D-PET-PUBLIC-V2-HERO`, `D-PET-PUBLIC-V2-SEM-ADMIN`.

### §4.2. sw-v72.1 — PetDetailView Polish

**Data**: 2026-07-22
**PR**: #195
**Descrição**: ajustes finos no PetDetailView.

### §4.3. sw-v72.2 — GENDER_LABEL Restore

**Data**: 2026-07-22
**PR**: #196
**Descrição**: `GENDER_LABEL[pet.gender] || pet.gender` para fallback.
**D-**: `D-LABEL-FALLBACK`.

### §4.4. sw-v72.3 — ClubDetail Painel Fix

**Data**: 2026-07-22
**PR**: #197
**Descrição**: 1 botão Painel no topo, link `/organizacoes/` (plural).
**D-**: `D-CLUB-DETAIL-PANEL-UNICO`, `D-LINK-PLURAL-ORGS`.

---

## §5. Histórico Compacto (TASK anteriores)

### §5.1. TASK-022 (V3 Redesign Loop v2)

- 16/16 páginas redesignadas
- Documentação V3 (21 V3s)
- Feature flags implementadas

### §5.2. TASK-V3-PARTNER-1

- 11 sprints (paralelo PickleRush)
- Espaço publicitário
- LGPD compliant

### §5.3. TASK-V3-PET-DETAIL-VIEW

- PetDetailView V3
- 4 sub-tasks (TASK-001 a TASK-004)

### §5.4. BUGS-15..31

- 17 bugs corrigidos
- sw-v63/v64/v65/v66

---

## §6. Métricas (2026-07-24)

| Métrica | Valor |
|---------|-------|
| Total tests passing | ~1700+ |
| Total test files | 189 |
| Total source files | 839 |
| Total docs | 80+ (com AI_GUIDE: ~95) |
| Total tasks SCRUM done | 711/742 (95.8%) |
| Bundle deployed | sw-v73 (12825 bytes) |
| Bundle principal | index-DKT4N-aG.js (250541 bytes) |
| Routes | 79 |
| Match blocks (Firestore rules) | 104 |
| Hotfixes PWA cadeia | 5 (sw-v72.5..sw-v73.3) |

---

## §7. Workflow de Adicionar a este Doc

Quando um bug for corrigido:

1. Identificar seção apropriada (PWA, Test, UI, etc)
2. Adicionar entrada com:
   - Data
   - Severidade
   - Sintoma
   - Causa raiz
   - Fix
   - D-* relacionada (se aplicável)
   - Commits
3. Se a D-* não existir, criar em `13-DECISIONS.md`
4. Commitar + push + deploy

---

**Próxima leitura**: `16-AGENT-ONBOARDING.md` (onboarding).

### §Y. VolunteerSignup Erro (2026-07-27)

**Data**: 2026-07-27
**Severidade**: ALTA (quebrava fluxo de inscrição de voluntários)
**Sintoma**: User clica "Aceitar e continuar" → erro
"Missing or insufficient permissions" + React error #31.

**Causa raiz (2 bugs)**:
1. **Toast API errada**: `toast({title, description, variant})` (shadcn) ao
   invés de `toast.error(msg, { description })` (sonner). Causou
   React error #31.
2. **signature_text missing**: `setDoc({merge: true})` no primeiro write
   é `create`. Rule `volunteer_profile` exigia `signature_text` no
   create mas service não enviava. Causou Permission denied.

**D-***:
- D-TOAST-SONNER-API: sempre usar sonner API
- D-VOLUNTEER-SIGNATURE: sempre incluir signature_text no update

**Fix**:
- `src/pages/VolunteerSignup.jsx`: 9 calls de toast() convertidos
- `src/modules/shelter/services/volunteerProfileService.js`:
  signature_text + signature_hash_input adicionados
- SW bump v74 → v75

**Tests**:
- `src/pages/VolunteerSignup.runtime.test.jsx`: 5 tests (era 1)
- Console error spy detecta React #31

**Documentação**:
- `docs/AI_GUIDE/28-VOLUNTEER-SIGNUP-BUGFIX.md` (NEW, 8KB)

sw-v75

---

## §8. VolunteerSignup Debug Cycle (sw-v75..v91, 2026-07-27..31)

**Severidade**: ALTA (quebrava fluxo crítico de inscrição de voluntários)
**Duração total**: 5 dias, 17 deploys
**RCA completo**: `28-VOLUNTEER-SIGNUP-BUGFIX.md`

### §8.1. Linha do tempo

| Deploy | Data | Issue | Fix | D-* |
|--------|------|-------|-----|-----|
| **sw-v75** | 2026-07-27 | React #31 + Permission denied no `volunteer_profile` | toast API (sonner) + signature_text no setDoc | D-TOAST-SONNER-API, D-VOLUNTEER-SIGNATURE-FIELD, D-FIRESTORE-CREATE-VALIDATION |
| sw-v76 | 2026-07-27 | Permission denied persistia | debug logging | (debug) |
| sw-v77 | 2026-07-27 | Idem | try/catch detalhado | (debug) |
| sw-v78 | 2026-07-27 | Idem | FULL CONTEXT log | (debug) |
| TEMP-DIAG | 2026-07-27 | Rule create estrita | TEMP-DIAG relaxado (isAppCheckVerified) | (diag) |
| sw-v79 | 2026-07-28 | Permission denied no perfil | 6 toasts + radius_km/notes null | (subset de D-TOAST-SONNER-API) |
| **sw-v80** | 2026-07-28 | zod null + undefined | conditional spread + remove logs + restore rules | D-FIRESTORE-NO-UNDEFINED, D-ZOD-NO-NULL-OPTIONAL, D-VOLUNTEER-SIGN-MIN-3 |
| sw-v81 | 2026-07-28 | signature vazio no join | sessionStorage persistence | D-VOLUNTEER-SIGN-PERSIST |
| **sw-v82** | 2026-07-28 | signature vazio ainda | profile.signature_text fonte canônica | D-VOLUNTEER-SIGNATURE-SOURCE |
| sw-v82.5 | 2026-07-29 | Permission denied em `clubs/.../volunteers` create | TEMP-DIAG-VOL (remove isAppCheckVerified) | (diag) |
| **sw-v83** | 2026-07-29 | Idem | rule ULTRA relaxada + logs TEMP-DIAG-VOL | (debug profundo) |
| **sw-v84** | 2026-07-29 | "Voluntário já está na rostagem" (genérico) | READ rule relaxada + getDoc try/catch | D-DEBUG-FIRESTORE-RULES-LEVEL-2 |
| **sw-v85** | 2026-07-29 | Idem (race condition) | join idempotente (doc já existe = success) | D-IDEMPOTENT-JOIN |
| **sw-v86** | 2026-07-29 | Idem | RESTAURAR rules completas (defense in depth) | D-VOLUNTEER-JOIN-RULE |
| sw-v87 | 2026-07-30 | React #306 aba volunteers painel | queryKey com primitivos | D-REACT-QUERY-KEY-PRIMITIVES |
| sw-v88 | 2026-07-30 | React #306 persiste | render counter threshold 50 | D-DEBUG-RENDER-COUNTER |
| sw-v89 | 2026-07-30 | React #306 persiste | render counter threshold 3 | (D-DEBUG-RENDER-COUNTER) |
| sw-v90 | 2026-07-30 | React #306 persiste | aba volunteers desabilitada (`false &&`) | (debug) |
| **sw-v91** | 2026-07-30 | `false &&` removido por tree-shaking | `SHOW_VOLUNTEERS_TAB` constante de módulo | D-MODULE-LEVEL-CONSTANTS-NO-TREE-SHAKE |

### §8.2. Lições aprendidas

#### 1. **Múltiplas camadas de bugs podem mascarar a causa raiz**
O sw-v75 começou com 2 bugs visíveis (toast + permission). sw-v80..v86
revelaram mais 4 bugs (undefined, zod null, signature vazio, race
condition). **Sempre auditar TODAS as camadas** (UI + Hook + Service +
Rules + Zod) em bugs críticos.

#### 2. **Defense-in-depth não é opcional**
sw-v85 (idempotência) + sw-v86 (rules estritas) + sw-v84 (try/catch
no getDoc) juntos formam **defesa em 3 camadas**:
- Service: idempotente (chamar 2x = mesmo resultado)
- Rules: estritas (defense final)
- getDoc: try/catch defensivo (não bloqueia fluxo em race condition)

#### 3. **Stack trace é rei**
React #306 só foi identificado como queryKey object em **sw-v87**,
depois de análise exaustiva da stack trace (`onSubscribe → subscribe
→ setData → batch → setTimeout → render`). **Sempre ler a stack
completa, não só o erro genérico.**

#### 4. **Esbuild tree-shaking é agressivo**
sw-v90 (`false &&` removido) → sw-v91 (constante de módulo). Esbuild
remove código dead-code incluindo `false &&`. **Constantes de debug
DEVEM ser módulo-level.**

#### 5. **Render counters podem não capturar loops síncronos**
sw-v88 (threshold 50) não disparou antes do React #306. sw-v89
(threshold 3) também não. Loops síncronos disparam #306 antes do
threshold. **Para loops muito rápidos, usar DESABILITAÇÃO de componente
(feature flag local) como teste de isolamento.**

### §8.3. Workflow recomendado para bugs críticos persistentes

Quando um bug persiste por 3+ deploys sem solução:

1. **Adicionar logs estruturados** no service (`[TEMP-DIAG-...]` com
   payload completo + stack do erro)
2. **Simplificar a rule gradualmente** (nível 1: remove isAppCheckVerified;
   nível 2: remove isPlatformAdmin; nível 3: ULTRA relaxada)
3. **Adicionar try/catch defensivo** em todos os getDoc/setDoc
4. **Adicionar idempotência** se for mutation de create
5. **Analisar stack trace completa** (não só mensagem genérico)
6. **DESABILITAR o componente** (constante de módulo `SHOW_X = false`)
   para isolar se é específico do componente
7. **Se mesmo assim persiste**: bug é em **outro lugar** (provider, query
   global, etc). Investigar fora do componente.

### §8.4. Commits principais

- `c1468a6b` — sw-v75 (toast + signature_text)
- `ea415856` — sw-v80 (zod null + restore rules)
- `6bfb1688` — sw-v81 (sessionStorage)
- `312cc6ea` — sw-v82 (profile.signature_text)
- `e9a412bb` — sw-v82.5 (TEMP-DIAG-VOL firestore.rules)
- `2213e9dc` — sw-v85 (idempotente)
- `cb41a53a` — sw-v86 (rules restauradas)
- `f28aed4d` — sw-v87 (queryKey primitivos)
- `09ddef7d` — sw-v91 (constante módulo)

### §8.5. Métricas

- **17 deploys** em 5 dias
- **9 decisões D-*** criadas
- **10 hooks** corrigidos (D-REACT-QUERY-KEY-PRIMITIVES — **DIAGNÓSTICO INCORRETO, ver §9**)
- **3 regras Firestore** ajustadas (read/create/volunteers)
- **80+ tests** passando (volunteerProfileService + hooks)
- **Bundle final**: `index-Bv_OCvQE.js` + `OrganizationAdminPanel-*.js`

### §8.6. ⚠️ CORREÇÃO POSTERIOR (sw-v92, 2026-07-31)

O diagnóstico de sw-v87 (D-REACT-QUERY-KEY-PRIMITIVES) estava
**INCORRETO**. A causa raiz REAL do React #306 foi descoberta em
sw-v92 (commit 0ced567e): **13 componentes carregados via `React.lazy()`
tinham apenas named export, sem `export default`**. Ver **§9** abaixo.

---

## §9. Correções Definitivas (sw-v92..v97, 2026-07-31)

### §9.1. Contexto

Após o ciclo de fixes sw-v75..v91 (VolunteerSignup), 5 problemas
persistiam:

1. **React #306 na aba volunteers do painel admin** (ciclos
   sw-v87..v91 não resolveram)
2. **"Não foi possível carregar esta aba"** em outras abas do painel
3. **Permission-denied** em prontuário/vacinas/cuidados/histórico de pets
4. **Permission-denied** em contratos, forum, donations
5. **Cloud Function `generateVolunteerCertificate` quebrando** em runtime

O Claude (sw-v92..v97) fez uma varredura completa e corrigiu 5
problemas sistêmicos de uma vez.

### §9.2. sw-v92 — React #306 + 9 abas do painel

**Commit**: `0ced567e` (2026-07-31 00:20)

**Causa raiz REAL**: 13 componentes carregados via `React.lazy()` no
painel admin tinham apenas **named export**, sem `export default`.
Ao resolver, o `module.default` era `undefined` → React #306 "Element
type is invalid... Lazy element type must resolve to a class or
function" — capturado pelo ErrorBoundary como "Não foi possível
carregar esta aba".

**O diagnóstico anterior (sw-v87, D-REACT-QUERY-KEY-PRIMITIVES) estava
ERRADO**: React Query 5 faz hash determinístico do queryKey via
`hashKey`. Objetos com mesmo conteúdo (mesmo recriados) têm o mesmo
hash. Portanto, `queryKey: [..., options]` NÃO causa loop.

**Componentes corrigidos (13)**: ver **D-LAZY-DEFAULT-EXPORT** em
`13-DECISIONS.md` §11.

**Resultado**:
- ✅ Painel volunteers REABILITADO (removeu `SHOW_VOLUNTEERS_TAB = false`)
- ✅ 9 abas do abrigo funcionando (kanban, exhibitions, volunteers,
  medical, medications, timeline, fosters, donations, finance)
- ✅ 4 rotas funcionando (MyContracts, ShelterContractsList,
  ShelterInterviewsList, PostAdoptionDashboard)
- ✅ Render counters removidos (TEMP-DIAG-ROSTER/TEMP-DIAG-PANEL)
- ✅ Logs TEMP-DIAG-VOL do `joinShelterAsVolunteer` removidos

**Outros crashes corrigidos**:
- `VolunteerSignup.jsx`: `joinSignature` indefinido em `handleAcceptTerms`
  → usa `signatureText.trim()`
- `ShelterDonationsTab.jsx`: `useCreateShelterReceipt` não importado
  → adicionado
- `AdoptionDetail.jsx`: `useQuery` (postAdoption) chamado após early
  return → movido para antes
- `SmartSearchFilters.jsx`: className como string literal `"{cn(...)}}"`
  → corrigido para `{cn(...)}`

**Build OK; 1378 testes passando.**

### §9.3. sw-v93 — Varredura de Reparos (runtime + hooks + sintaxe)

**Commit**: `030691b7` (2026-07-31 04:10)

**Crashes de runtime corrigidos**:
- `Layout`: ícones `Sun`/`Moon` do theme-toggle não importados
- `OnboardingQuestionnaire`: `isEditMode` referenciado mas nunca
  definido (em `/onboarding?edit=1` vindo do perfil) → derivado do
  query param
- `bannersService`: `collectionGroup` não importado

**Violações de rules-of-hooks**:
- `PetDetailV3`: `useArenaPageClasses` chamado depois dos early returns
  → movido para antes
- `LegalFooter`: `useEffect` depois de `return null` (mode hidden) →
  early-return movido para depois do hook
- `CrossRosterSection`: dois `useMemo` depois de `return null` →
  early-return movido para depois dos hooks

**Erros de sintaxe**:
- `ClubForumsTab`: `<Card>` (nem importado) fechado com `</section>` →
  troca a abertura para `<section>`
- `generateEventIcsCore.test`: parêntese extra em `toContain(...))`

**Config / correção de testes desatualizados**:
- `tailwind.config`: chave `fontSize` duplicada removida
- `eslint.config`: globals de test-runner (Vitest/Jest) +
  `allowEmptyCatch` → elimina ~190 falsos-positivos
- `registerPwa.test`: referências atualizadas de sw-v82 → sw-v91
- `canManage.audit.test`: import com path absoluto → relativo

**Cosméticos**: aspas em texto JSX → `&quot;` em 4 arquivos.

### §9.4. sw-v94 — Cloud Functions (pdfkit + infra de testes)

**Commit**: `5e64a7ee` (2026-07-31 04:36)

**Bug de produção corrigido**:
- `generateVolunteerCertificateCore.cjs` faz `require('pdfkit')`, mas
  `pdfkit` não estava em `functions/package.json` (só `pdf-lib`).
  Cloud Function quebrava em runtime com "Cannot find module 'pdfkit'".
  Adicionado `pdfkit` às dependências.

**Infra de testes (functions/)**:
- `vitest.config`: `globals: true` + setupFiles
- `vitest.setup.js` (novo): expõe `globalThis.jest = vi` para os testes
  escritos no estilo Jest
- `healthCheckCore.test`: `checkFirestore` retorna `error: null` em
  sucesso; assert corrigido

**Resultado**: arquivos de teste com falha 7 → 4; testes com falha 22 → 12.

### §9.5. sw-v95 — Regras Firestore Quebradas (5 correções)

**Commit**: `3cb12127` (2026-07-31 05:36)

**Causa raiz**: Regras que referenciam nomes indefinidos SEMPRE
negam. O log de compilação do deploy emitia warnings "Invalid
function/variable name", que eram IGNORADOS.

**Correções**:

1. **`shelterCanAccess` / `shelterCanManage` NUNCA foram definidas**,
   mas eram usadas nas regras de kanban (boards/columns/cards) →
   kanban sempre negava. Definidas espelhando o padrão de acesso
   do abrigo (medications/fosters).

2. **Subcoleções de PET órfãs**: `health_records`, `vet_visits`,
   `treatments`, `care_log`, `devolutions`, `adopters_history`
   estavam no top-level (o bloco `match /pets/{petId}` fechava antes)
   → `petId` fora de escopo. Envolvidas em `match /pets/{petId}`.

3. **Contratos**: `auth.uid` (variável inexistente) em vez de
   `request.auth.uid` no create/cancelamento → adotante não
   conseguia criar/cancelar.

4. **Comunidades**: `community_members` e `community_posts` (coleções
   top-level) referenciavam `communityId` não vinculado → forum
   posting negava. Trocado por `resource.data.community_id`.

5. **CollectionGroup queries sem regra `{path=**}`**: 8 collectionGroups
   (contracts, volunteers, volunteer_participations, post_adoption,
   fosters, kanban_cards, banners, volunteer_profile). Regras
   aninhadas por path NÃO cobrem `collectionGroup` — adicionadas
   regras recursivas.

**Validação**: firestore.rules compila sem erro no emulador;
braces balanceados.

### §9.6. sw-v96 — shelter_donations/ledger órfãs

**Commit**: `2472640b` (2026-07-31 05:43)

**Continuação da auditoria de regras** (log de compilação ainda
emitia "Invalid variable name: clubId" nas linhas 2149-2242).

4 coleções do abrigo tinham o match no TOP-LEVEL em vez de aninhado
sob `clubs/{clubId}/`:
- `shelter_donations` (Campanhas de doação)
- `shelter_donation_receipts` (Comprovantes)
- `shelter_ledger` (Prestação de contas / finance)
- `shelter_ledger_categories` (Categorias do ledger)

Logo, `clubId` estava fora de escopo → create/update/delete
**SEMPRE negados**.

**Fix**: path corrigido de `/<coleção>/{id}` para
`/clubs/{clubId}/<coleção>/{id}`. Confirmado que o app grava nesses
caminhos aninhados (`shelterDonationService: collection(db, 'clubs',
clubId, 'shelter_donations')`).

**Validação**: compila sem erro no emulador; braces balanceados (319/319).
Após este fix, o log de compilação do deploy não emite mais nenhum
warning "Invalid function/variable name".

### §9.7. sw-v97 — Índices COLLECTION_GROUP

**Commit**: `4dd8ed43` (2026-07-31 06:07)

Agora que as collectionGroup queries estão autorizadas (sw-v95), as
compostas precisam de índice com `queryScope: COLLECTION_GROUP` (as
single-field são auto-criadas). Sem eles, a query falha com
`FAILED_PRECONDITION` (distinto de `permission-denied`).

**Índices adicionados (4)**:
- `volunteers` (volunteer_uid ASC, volunteer_name ASC)
  → /perfil "Minhas voluntariadas" (listUserVolunteerRosters)
- `fosters` (foster_uid ASC, status ASC, ended_at DESC)
  → histórico público de lar temporário (fosterHistoryPublicService)
- `post_adoption` (shelter_club_id ASC, status ASC, returned_at DESC)
  → lista de devolvidos no painel (PostAdoptionReturnedList)
- `banners` (status ASC, position ASC)
  → vitrine de banners de parceiros (bannersService)

As demais collectionGroup queries habilitadas (contracts, volunteer_
participations, kanban_cards) usam filtro single-field → índice
auto-criado, sem entrada explícita necessária.

**JSON validado (68 índices).**

### §9.8. Workflow Recomendado (revisado)

O workflow de §8.3 (para bugs persistentes) foi REVISADO e expandido:

1. **Adicionar logs estruturados** no service
2. **Simplificar a rule gradualmente** (se for permission-denied)
3. **try/catch defensivo** em getDoc/setDoc
4. **Idempotência** se for mutation de create
5. **Analisar stack trace completa** (NÃO só mensagem genérica)
6. **Verificar imports** (tree-shaking remove unused, mas não avisa)
7. **Verificar hooks order** (rules-of-hooks: ANTES dos early returns)
8. **Verificar se `React.lazy()` tem `export default`** (CAUSA RAIZ
   do React #306 em 13 componentes)
9. **Verificar se funções referenciadas estão definidas** (CAUSA
   RAIZ de permission-denied em kanban e pets)
10. **Verificar se subcoleções estão aninhadas corretamente**
    (CAUSA RAIZ de permission-denied em pets/shelter)
11. **Verificar se collectionGroup tem regra `{path=**}`** +
    **índice COLLECTION_GROUP**

### §9.9. Métricas sw-v92..v97

- **6 deploys** em 1 dia (2026-07-31)
- **8 decisões D-*** novas
- **13 componentes** corrigidos (default export)
- **6 crashes de runtime** corrigidos
- **3 violações de rules-of-hooks** corrigidas
- **2 erros de sintaxe** corrigidos
- **7+ regras Firestore** corrigidas (5 em sw-v95 + 4 em sw-v96 + 1
  em sw-v97 = 10 paths)
- **4 índices COLLECTION_GROUP** adicionados
- **68 índices totais** em firestore.indexes.json
- **Cloud Function `generateVolunteerCertificate`** corrigida
- **~190 falsos positivos** de lint eliminados
- **1378 testes passando**
