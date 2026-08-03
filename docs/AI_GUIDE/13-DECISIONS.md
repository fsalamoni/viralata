# 13-DECISIONS.md — Decisões Arquiteturais Importantes (D-*)

> **Atualizado em 2026-08-03** (sw-v75..v97 + PR #204..#208)
>
> Decisões D-* são **invioláveis** a menos que explicitamente revertidas
> por uma nova decisão. Antes de mudar algo, verifique se há D-*
> relacionada.

## §1. Como Adicionar uma Decisão

```md
### D-NOME-CURTO (YYYY-MM-DD)

**Contexto**: o problema que motivou a decisão
**Decisão**: o que foi decidido
**Consequências**: trade-offs e implicações
**Alternativas consideradas**: outras opções e por que foram rejeitadas
```

Após criar, **nunca** reverter sem criar uma `D-NOME-DEPRECATED` que
explique o motivo.

## §2. Decisões de Pets

### D-PET-SEQ-IMMUTABLE (sw-v72.4, 2026-07-22)

**Contexto**: precisamos de um ID permanente para pets que seja
estável independente do Firestore `documentId` (que pode ser renomeado
em migrações).

**Decisão**: `pet_seq` é um número atômico (1, 2, 3, ...) gerado por
Cloud Function usando `pet_seq_counter/{counterId}`. NUNCA pode ser
alterado após criação.

**Consequências**:
- Pet ID é estável através de migrações
- Cloud Function tem custo mínimo (1 read + 1 write por create)
- Counter precisa de backup (mas é simples)
- URL canônica de pet pode ser `/pet/<pet_seq>` (futuro)

**Implementação**:
```js
// firestore.rules
allow update: if canManagePet(petId) &&
  request.resource.data.pet_seq == resource.data.pet_seq;
```

### D-PET-LOG-IMMUTABLE (sw-v72.4, 2026-07-22)

**Contexto**: precisamos de auditoria completa de mudanças em pets.

**Decisão**: `pet_audit_log/{logId}` é append-only. Update bloqueado
para todos. Delete só por platform_admin.

**Implementação**:
```js
allow update: if false;  // IMUTÁVEL
```

### D-PET-LOG-PER-CHANGE (sw-v72.4, 2026-07-22)

**Contexto**: garantir log consistente em todas as operações.

**Decisão**: cada CRUD de pet DEVE chamar `appendPetLog()` com
actor, action, target, details.

**Consequências**:
- Log sempre atualizado
- Custo: 1 write extra por operação (aceitável)
- Implementação fácil via `appendPetLog` helper

### D-PET-OPS-TABLE-PRIMARY-NAVIGATION (sw-v72.4, 2026-07-22)

**Contexto**: admins precisam navegar rapidamente entre pets.

**Decisão**: na tabela de ops (PetsOpsTable), cada linha é ponto de
entrada para o detalhe do pet.

### D-HASH-ROUTER-PET-TABS (sw-v72.4, 2026-07-22)

**Contexto**: permitir share de link direto para uma tab específica.

**Decisão**: tabs de PetDetailView são navegáveis por hash URL
(`#log`, `#notes`, `#timeline`).

### D-PET-NOTES-AUTHOR-DELETE (sw-v72.4, 2026-07-22)

**Contexto**: notas são conteúdo user-generated.

**Decisão**: `pet_notes` — read/create/update canManage, delete só
autor (via `resource.data.author.uid`) ou platform_admin.

### D-PET-DETAIL-RUNTIME-TEST (sw-v73.3, 2026-07-22)

**Contexto**: bug `canEdit` ReferenceError passou em static analysis
mas só foi pego com runtime test.

**Decisão**: para CADA página/componente crítico, criar
`*.runtime.test.jsx` que renderiza com dados mockados.

**Consequências**:
- Mais tests, mas cobertura real
- Pega variáveis undefined em escopo
- Custo: ~5min por componente crítico

### D-ENSURE-CAN-MUTATE-PET (TASK-029, 2026-07-22)

**Contexto**: defense-in-depth para escritas em pets.

**Decisão**: toda escrita em pet DEVE chamar `ensureCanMutatePet(petId, actor)`
ANTES do `batch.update()`.

## §3. Decisões de UI

### D-USER-EMOJIS (2026-07-22)

**Contexto**: usuário pediu.

**Decisão**: NENHUM emoji em código OU UI. Usar `lucide-react` para
ícones.

### D-PET-PUBLIC-V2-HERO (sw-v72, 2026-07-22)

**Decisão**: Hero `from-rose-500 via-orange-500 to-amber-500` é o
padrão para páginas de pet público.

### D-PET-PUBLIC-V2-SEM-ADMIN (sw-v72, 2026-07-22)

**Decisão**: páginas PÚBLICAS (PetDetailView) NÃO devem ter botões de
admin/gestão. ZERO. Apenas "Quero adotar", "Compartilhar", "Reportar".

### D-PET-PUBLIC-V2-RUNTIME-SAFETY (sw-v72.2, 2026-07-22)

**Decisão**: testes DEVEM cobrir pet com TODOS os campos (mesmo
campos nullable) para garantir que não quebra com dados reais.

### D-LABEL-FALLBACK (sw-v72.2, 2026-07-22)

**Decisão**: `LABEL[campo] || campo` é padrão obrigatório. Não pode
quebrar se label não existir.

### D-CLUB-DETAIL-PANEL-UNICO (sw-v72.3, 2026-07-22)

**Decisão**: APENAS 1 botão Painel, no topo da página. NÃO múltiplos
botões espalhados.

### D-LINK-PLURAL-ORGS (sw-v72.3, 2026-07-22)

**Decisão**: SEMPRE `/organizacoes/` (plural) para diretório de ONGs.
`/clubes/` é legacy e redireciona.

## §4. Decisões de PWA

### D-PWA-STALE-UNREGISTER (sw-v73.1, 2026-07-22)

**Contexto**: bundle deployed pode estar stale no user (SW vN-1).

**Decisão**: SWs vN-1 devem ser desregistrados no boot da vN.

### D-PWA-UNREGISTER-ALWAYS (sw-v73.2, 2026-07-22)

**Contexto**: sw-v73.1 não rodava quando PWA_ENABLED=false.

**Decisão**: `unregisterStaleAndMaybeReload` roda SEMPRE, independente
de PWA_ENABLED.

### D-PWA-STALE-UNREGISTER-DEFER (sw-v73.3, 2026-07-22)

**Contexto**: reload de 50ms interrompia user no meio de interação.

**Decisão**: NUNCA `window.location.reload()` se user pode estar
interagindo. Track activity via `pwa-stale-last-activity` (sessionStorage).
Se interagiu < 5s, defer 5s.

### D-PET-OPS-LUCIDE-IMPORT (sw-v72.5, 2026-07-22)

**Contexto**: `MessageSquare is not defined` em produção.

**Decisão**: SEMPRE validar que TODOS os ícones do lucide usados em
JSX estão no import. Build NÃO pega isso (tree shaking + globals).

**Implementação**: `scripts/validate-lucide-imports.mjs`.

### D-PWA-BUMP-ALWAYS-UI (TASK-PWA, 2026-07-22)

**Decisão**: SEMPRE bumpar SW (vN → vN+1) ao mudar UI.

### D-PWA-SKIPWAITING-TRUE (2026-07-22)

**Decisão**: `workbox.skipWaiting = true` para auto-update.

### D-PWA-CLIENTSCLAIM-TRUE (2026-07-22)

**Decisão**: `workbox.clientsClaim = true` para forçar novo SW.

### D-PWA-NUCLEAR-RESET (HOTFIX-005)

**Decisão**: para SWs legacy (v0-v5, `sw.js`), nukeAllCaches + reload.
Flag `hotfix-005-reload` no sessionStorage evita loop infinito.

### D-FUTURE-PWA-DEPLOY-CHECKLIST (NEW, sw-v72.5)

**Decisão**: ao deployar PWA com SW novo:
1. SEMPRE bump SW (vN → vN+1)
2. SEMPRE adicionar lógica de auto-unregister (se vN-1 é stale)
3. SEMPRE fazer reload DEFERIDO (não imediato)
4. SEMPRE ter banner "Nova versão disponível" como fallback
5. NUNCA fazer reload durante interação do user

### D-FUTURE-AUTO-RELOAD-INTERACTION (NEW, sw-v73.3)

**Decisão**: NUNCA `window.location.reload()` se user pode estar
interagindo. Sempre deferir ou oferecer botão "Reload".

### D-FUTURE-ICON-ADD-WORKFLOW (NEW, sw-v72.5)

**Decisão**: workflow ao adicionar ícone:
1. Adicionar ícone no JSX
2. Adicionar no import (lucide-react)
3. Rodar `node scripts/validate-lucide-imports.mjs`
4. Commit
5. Validar bundle deployed (`curl` + `grep`)

## §5. Decisões de Feature Flags

### D-FEATURE-FLAGS-OBRIGATORIAS (TASK-022, 2026-07)

**Decisão**: TODA feature nova DEVE estar atrás de feature flag,
ativada no admin.

### D-FEATURE-FLAG-MIGRATION (TASK-022, 2026-07)

**Decisão**: ao mudar flag OFF→ON, SEMPRE adicionar migração em
`migrateLegacyFlags` + bump `FLAGS_MIGRATION_VERSION`.

## §6. Decisões de Testes

### D-TEST-NAMED-VS-DEFAULT-EXPORT (sw-v73.3, 2026-07-22)

**Decisão**: testes com dynamic import devem usar `.default` se o
componente só tem `export default`.

### D-TEST-MIXED-ESM-CJS (sw-v73.3, 2026-07-22)

**Decisão**: NUNCA misturar `import` e `require` no mesmo `.test.jsx`.
Usar ESM puro.

### D-TEST-COLLECTION-EXPECTATION (sw-v73.3, 2026-07-22)

**Decisão**: ao adicionar coleção denormalizada (TASK-312), atualizar
testes que esperam collection original.

### D-TEST-COMPONENT-API-CHANGED (sw-v73.3, 2026-07-22)

**Decisão**: ao renomear prop no componente, atualizar testes
imediatamente.

## §7. Decisões de SCRUM

### D-SCRUM-REGRA-A (TASK-022, 2026-07)

**Decisão**: REGRA A — Após MERGE de PR, rodar `node .harness/sync.cjs --fix`
para auto-sync do SCRUM_TASKS.json.

### D-SCRUM-REGRA-B (TASK-022, 2026-07)

**Decisão**: REGRA B — A cada ~10 tasks, rodar `node .harness/sync.cjs --check`
para verificar inconsistências.

## §8. Decisões de Deploy

### D-DEPLOY-MAIN-AUTO (TASK-022, 2026-07)

**Decisão**: push em main dispara deploy automático via GitHub Actions.
NÃO acumular branches.

### D-DEPLOY-MERGE-SQUASH (TASK-022, 2026-07)

**Decisão**: merges via SQUASH no GitHub. Histórico limpo, 1 commit
por feature.

## §9. Decisões Deprecated (para histórico)

> Decisões antigas que foram revertidas. Mantidas para contexto.

### D-V2-SKIP-DEPRECATED (2026-05)

V2 foi pulado. Apenas V1 e V3. Decidido para economizar tempo.

## §10. Decisões de VolunteerSignup (sw-v75..v91, 2026-07-27..31)

> 17 deploys em cadeia para corrigir o fluxo de inscrição de voluntários.
> RCA completo em `28-VOLUNTEER-SIGNUP-BUGFIX.md`.

### D-VOLUNTEER-SIGNATURE-FIELD (sw-v75, 2026-07-27)

**Contexto**: `setDoc({merge: true})` no primeiro write é interpretado
como `create` no Firestore. A rule `volunteer_profile` exigia
`signature_text.size() >= 2` no `create`, mas `acceptVolunteerTerms`
não estava enviando `signature_text`.

**Decisão**: `acceptVolunteerTerms` DEVE incluir `signature_text` (e
`signature_hash_input` para audit trail) no setDoc do primeiro write.
Firestore trata primeiro write como `create` se doc não existe.

**Aplicação**: Qualquer service que faz `setDoc({merge: true})` em
`volunteer_profile/main` deve incluir os campos obrigatórios do
create rule (signature_text >= 2 chars + ISO date).

### D-FIRESTORE-CREATE-VALIDATION (sw-v75, 2026-07-27)

**Contexto**: `setDoc({merge: true})` em doc que pode não existir é
tratado como `create` no Firestore. Rules de `create` aplicam, não só
`update`.

**Decisão**: SEMPRE incluir TODOS os campos requeridos pela rule de
`create` (não só os de `update`) em setDoc merge. O Firestore trata
primeiro write como `create` se doc não existe.

**Aplicação**: vale para qualquer doc que pode ser criado com merge=true.
Ver `D-FIRESTORE-NO-UNDEFINED` para regra complementar.

### D-FIRESTORE-NO-UNDEFINED (sw-v80, 2026-07-28)

**Contexto**: Firestore rejeita `undefined` em setDoc com erro
"setDoc called with invalid data. Unsupported field value: undefined".

**Decisão**: NUNCA enviar `undefined` em setDoc. Usar:
- `null` (se aceito pelo schema)
- OU omitir via conditional spread: `...(value !== undefined ? { field: value } : {})`

**Aplicação**: zod `.optional()` aceita `string|undefined` mas NÃO
`null`. Omitir do objeto se vazio (ver `D-ZOD-NO-NULL-OPTIONAL`).

### D-ZOD-NO-NULL-OPTIONAL (sw-v80, 2026-07-28)

**Contexto**: zod `z.string().optional()` aceita `string|undefined` mas
NÃO `null`. Enviar `null` em campo optional falha validation.

**Decisão**: NUNCA enviar `null` em campo `z.optional()`. Usar conditional
spread para OMITIR o campo do objeto se vazio:

```js
// ❌ Errado
await setDoc(ref, { notes: null });

// ✅ Correto
await setDoc(ref, {
  ...(notes.trim() ? { notes: notes.trim() } : {}),
});
```

### D-VOLUNTEER-SIGN-MIN-3 (sw-v80, 2026-07-28)

**Contexto**: schema zod `signatureTextSchema` tem `.min(3)`, mas o
`handleAcceptTerms` validava `>= 2`. Inconsistência que causou
"too_small" no join.

**Decisão**: `handleAcceptTerms` deve validar `>= 3 chars` (consistente
com `signatureTextSchema`). Single source of truth = schema.

### D-VOLUNTEER-SIGN-PERSIST (sw-v81, 2026-07-28)

**Contexto**: `useEffect` em VolunteerSignup auto-avança step quando
`hasAcceptedTerms=true` (termo já aceito em sessão anterior via
Firestore). User NUNCA digita no passo 1, então state local
`signatureText` + sessionStorage vazios. join falhava com
"too_small" no `signature_text`.

**Decisão**: `signatureText` deve ser persistido em `sessionStorage`:
- chave: `viralata:volunteer-signature-text`
- Inicialização lazy do state (getter function)
- Setter persiste em sessionStorage
- Cleanup no sucesso (após submit)

**Aplicação**: campos críticos de fluxo multi-step DEVEM ser persistidos
em sessionStorage para sobreviver a reloads e auto-advance.

### D-VOLUNTEER-SIGNATURE-SOURCE (sw-v82, 2026-07-28)

**Contexto**: state local `signatureText` ficava vazio por causa do
auto-advance (ver D-VOLUNTEER-SIGN-PERSIST). Solução de sessionStorage
não funcionou porque o user não digitava.

**Decisão**: usar `profile.signature_text` do `volunteer_profile/main`
(Firestore) como FONTE CANÔNICA no `handleSubmitJoin`. Fallback para
`signatureText` state se profile não tem.

```js
const joinSignature = (profile?.signature_text && profile.signature_text.length >= 3)
  ? profile.signature_text
  : signatureText.trim();
```

**Aplicação**: campos críticos em fluxos multi-step com auto-advance
DEVEM ter Firestore como source of truth, não state local.

### D-IDEMPOTENT-JOIN (sw-v85, 2026-07-28)

**Contexto**: race condition entre sw-v82/83/84. setDoc foi feito com
sucesso mas UI não navegou (por causa de outro erro). Em tentativa
posterior, `existing.exists()` retornava `true` e throw genérico
"Voluntário já está na rostagem deste abrigo" aparecia para o user.

**Decisão**: `joinShelterAsVolunteer` é IDEMPOTENTE. Chamar 2x = mesmo
resultado (success + return do doc existente). Se `existing.exists() =
true`, retornar `{ id, ...doc, _alreadyExisted: true }` em vez de throw.

```js
if (existing) {
  return { id: existing.id, ...existing.data(), _alreadyExisted: true };
}
```

**Aplicação**: TODA mutation de create de subcoleções que pode ser
re-tentada pelo user (UI desabilitada, click repetido, network retry)
DEVE ser idempotente. UI trata `_alreadyExisted` com toast específico
"Você já está na rostagem deste abrigo!".

### D-REACT-QUERY-KEY-PRIMITIVES (sw-v87, 2026-07-30) — ⚠️ DIAGNÓSTICO INCORRETO

**Contexto (CORRIGIDO)**: `useShelterVolunteers(shelterClubId, { status: statusFilter })`
tinha `queryKey: ['shelter-volunteers', shelterClubId, options]`. Em
sw-v87, acreditou-se que `options` (OBJETO criado a cada render)
causava loop infinito (React error #306) porque React Query compararia
queryKey por **referência** de objeto.

**STATUS**: **DIAGNÓSTICO INCORRETO**. Descartado em sw-v92 (commit 0ced567e).

**Verdade**: React Query 5 faz **hash determinístico** do queryKey
via `hashKey`. Objetos com mesmo conteúdo (mesmo recriados) têm o mesmo
hash. Portanto, `queryKey: [..., options]` NÃO causa loop.

**Causa raiz real do React #306 (sw-v92)**: 13 componentes carregados
via `React.lazy()` tinham apenas **named export** (sem `export default`).
O `module.default` era `undefined` → React #306 "Element type is invalid...
Lazy element type must resolve to a class or function". Ver
**D-LAZY-DEFAULT-EXPORT** abaixo.

**Por que passou despercebido em 5 deploys (sw-v87..v91)**:
1. O "render counter" com threshold 3 (sw-v89) mascarava o problema.
2. Testes unitários passavam (named import direto).
3. Stack trace do React #306 não mostrava lazy stack.
4. sw-v91 só deu pista clara ao desabilitar a aba.
5. A stack completa só veio com a investigação do Claude em sw-v92.

**Aplicação preventiva mantida**: apesar de o diagnóstico estar errado,
o **padrão de primitivos no queryKey** continua sendo uma boa prática
(legibilidade + evita warnings de React Query DevTools). Manter o
padrão, mas **não atribuir o React #306 a isso**.

### D-LAZY-DEFAULT-EXPORT (sw-v92, 2026-07-31) — CAUSA RAIZ REAL DO REACT #306

**Contexto**: 13 componentes carregados via `React.lazy()` no painel
admin (`OrganizationAdminPanel.v3.jsx`) tinham apenas **named export**
(sem `export default`). Ao resolver, o `module.default` era `undefined`
→ React #306 "Element type is invalid... Lazy element type must resolve
to a class or function" — capturado pelo ErrorBoundary como "Não foi
possível carregar esta aba".

**Componentes corrigidos (13)**:

**Abas do painel do abrigo (9):**
- `KanbanPage`, `ExhibitionsList`, `VolunteersAdminTab`,
  `MedicalRecordsList`, `MedicationsList`, `TimelineList`,
  `FostersList`, `ShelterDonationsTab`, `ShelterFinanceTab`

**Rotas (4):**
- `MyContracts`, `ShelterContractsList`, `ShelterInterviewsList`,
  `PostAdoptionDashboard`

**Decisão**: Componentes carregados via `React.lazy()` DEVEM ter
`export default`. Para manter compatibilidade com testes, manter
AMBOS:
- `export function Name()` — para imports nomeados
- `export default Name` — para `React.lazy()`

```js
// ❌ Errado (NAMED export only — quebra com React.lazy)
export function MyContracts() {
  return <div>...</div>;
}

// ✅ Correto (BOTH named AND default)
export function MyContracts() {
  return <div>...</div>;
}

// Default export para React.lazy() (mantém named export acima para imports diretos/testes).
export default MyContracts;
```

**Aplicação**: TODOS os componentes usados em `lazy(() => import('...'))`.

**Prevenção**:
1. Lint rule custom para detectar `lazy(` que importa named export only.
2. Test E2E que valida que cada rota lazy carrega sem erros.

**Aplicação em sw-v93 (correlato)**: `AdoptionDetail.jsx` teve `useQuery`
(postAdoption) movido para ANTES dos early returns (rules-of-hooks).

### D-DEBUG-FIRESTORE-RULES-LEVEL-2 (sw-v82..v84, 2026-07-29)

**Contexto**: quando permission-denied persiste mesmo com rule de
CREATE relaxada, a falha pode ser no **READ** (getDoc) e não no
WRITE (setDoc). A stack mostra `getDoc` falhando com 403 ANTES do
setDoc, throw genérico "Voluntário já está na rostagem" aparece.

**Decisão**: 
1. **Service**: try/catch defensivo no getDoc do existing check. Se
   403, assumir que doc não existe e tentar setDoc. O setDoc vai
   falhar com ALREADY_EXISTS se já existir.
2. **Traduzir erros**: se setDoc falhar com `permission-denied`,
   throw mensagem amigável "Sem permissão para entrar na rostagem deste
   abrigo. Faça login novamente e tente de novo."

```js
let existing = null;
try {
  const snap = await getDoc(ref);
  existing = snap.exists() ? snap : null;
} catch (readErr) {
  if (readErr?.code === 'permission-denied') {
    existing = null;  // assume doc não existe
  } else {
    throw readErr;
  }
}
```

**Aplicação**: services que fazem read-then-write em docs multi-tenant
DEVEM tratar permission-denied no read como "doc não existe" (defense
in depth + idempotência).

### D-VOLUNTEER-JOIN-RULE (sw-v86, 2026-07-28)

**Contexto**: depois de sw-v85 (idempotência), o service não
retornava erro, mas a rule de `create` em `clubs/.../volunteers/uid`
continuava estrita (com verificações de role que falhavam por race
condition). Por isso o doc não era criado (idempotência nunca atingia).

**Decisão**: como o service é idempotente, a rule de CREATE pode ser
RESTAURADA com todas as verificações de role (platform_admin OR
abrigo owner/admin OR canEditClubPets OR hasClubPermission OR
próprio user). Race condition em get() interno é tratada pelo
try/catch do getDoc (D-DEBUG-FIRESTORE-RULES-LEVEL-2).

**Aplicação**: rules podem ser estritas quando o service tem
defense-in-depth (idempotência + try/catch).

## §11. Decisões de Debug React (sw-v88..v91, 2026-07-30)

### D-DEBUG-RENDER-COUNTER (sw-v88, 2026-07-30)

**Contexto**: React error #306 "Maximum update depth exceeded" em
componente sem useEffect problemático aparente. Análise estática
insuficiente.

**Decisão**: adicionar render counter em componentes suspeitos. Se
contagem > threshold (3, depois 10), throw `[TEMP-DIAG-...]` com
mensagem útil em vez do #306 genérico.

```js
const renderCountRef = useRef(0);
renderCountRef.current += 1;
if (renderCountRef.current > 3) {
  throw new Error(`[TEMP-DIAG-ROSTER] LOOP INFINITO NO ROSTER: ${renderCountRef.current} renders`);
}
```

**Limitação**: React #306 dispara ANTES do threshold se renders são
síncronos. Para loops MUITO rápidos, usar threshold menor (3) ou
outra técnica.

### D-MODULE-LEVEL-CONSTANTS-NO-TREE-SHAKE (sw-v91, 2026-07-30)

**Contexto**: para desabilitar uma aba, usei `false && condition`.
Esbuild removeu via tree-shaking (a expressão é sempre false).
Resultado: a aba continuou renderizando.

**Decisão**: usar **constante no escopo do módulo** (não dentro do
componente) que esbuild **NÃO remove** (porque pode ser reatribuída
em runtime):

```js
// ❌ Errado (tree-shaking remove)
{false && activeGroupKey === 'people' && ...}

// ✅ Correto (preservado no bundle minified como 'const tr=!1')
const SHOW_VOLUNTEERS_TAB = false;
{SHOW_VOLUNTEERS_TAB && activeGroupKey === 'people' && ...}
```

**Aplicação**: feature flags locais (toggles de debug) DEVEM ser
constantes de módulo, não expressões inline.

---

**Próxima leitura**: `14-TROUBLESHOOTING.md` (problemas comuns).

### D-VOLUNTEER-SIGNATURE (2026-07-27)

**Contexto**: `setDoc({merge: true})` no primeiro write é interpretado como
`create` no Firestore. A rule `volunteer_profile` exigia `signature_text`
no create, mas o service não estava enviando.

**Decisão**: SEMPRE incluir `signature_text` (e opcionalmente
`signature_hash_input` para audit trail) no update do
`acceptVolunteerTerms`. Ver `28-VOLUNTEER-SIGNUP-BUGFIX.md` para RCA
completo.

**Aplicação**: Qualquer service que faz `setDoc({merge: true})` em
`volunteer_profile/main` deve incluir os campos obrigatórios do
create rule.

### D-TOAST-SONNER-API (2026-07-27)

**Contexto**: O `useToast()` retorna `sonnerToast`. A API shadcn/ui
(`toast({title, description, variant})`) é incompatível com sonner,
que espera `toast(message)` ou `toast(message, options)`. Uso da API
errada causa React error #31 em runtime.

**Decisão**: SEMPRE usar sonner API:
- `toast.success(msg)` / `toast.error(msg)` / `toast.warning(msg)` / `toast.info(msg)`
- OU `toast(msg, { description: '...' })` para opções

**NUNCA** usar `toast({title, description, variant})` (shadcn API).

**Prevenção**: Adicionar lint rule ou grep em CI para detectar
`toast({` em código novo.

---

## §12. Decisões de Firestore Rules (sw-v95..v97, 2026-07-31)

### D-FIRESTORE-RULES-DEFINITION (sw-v95, 2026-07-31)

**Contexto**: Regras de kanban (boards/columns/cards) usavam
`shelterCanAccess` e `shelterCanManage`, mas essas funções **NUNCA
foram definidas** no bloco `match /clubs/{clubId}`. O compilador
emitia warning "Invalid function name" e tratava como `false` →
**kanban SEMPRE negava acesso**.

**Decisão**: TODA função referenciada em uma rule DEVE estar
**definida** no escopo do `match` que a usa. Caso contrário, o
compilador trata como `false` e a regra sempre nega.

**Prevenção**: CI deve rodar `firebase firestore:rules:get --emulator`
e falhar se houver warning "Invalid function/variable name".

**Aplicação em sw-v95**: `shelterCanAccess` e `shelterCanManage`
foram definidas espelhando o padrão de acesso do abrigo
(medications/fosters).

### D-FIRESTORE-MATCH-SCOPE (sw-v95, sw-v96, 2026-07-31)

**Contexto**: 4 + 6 = 10 subcoleções estavam com `match` no TOP-LEVEL
em vez de aninhadas sob o path correto:
- `health_records`, `vet_visits`, `treatments`, `care_log`,
  `devolutions`, `adopters_history` (Pets)
- `shelter_donations`, `shelter_donation_receipts`, `shelter_ledger`,
  `shelter_ledger_categories` (Shelter)

Logo, `{petId}` / `{clubId}` estavam fora de escopo e o path da
regra não casava com o real. **Create/update/delete SEMPRE negados**.

**Decisão**: Subcoleções DEVEM ser aninhadas sob o path correto.
Variáveis de escopo (`{petId}`, `{clubId}`, `{communityId}`) só
estão disponíveis dentro do `match` que as declara.

```js
// ❌ Errado (match no top-level → petId fora de escopo)
match /health_records/{recordId} {
  allow read: if isAuth() && isOwnerOfPet(petId);
}

// ✅ Correto (match aninhado)
match /pets/{petId} {
  match /health_records/{recordId} {
    allow read: if isAuth() && isOwnerOfPet(petId);
  }
}
```

**Prevenção**: Mesma da D-FIRESTORE-RULES-DEFINITION.

### D-FIRESTORE-REQUEST-AUTH-UID (sw-v95, 2026-07-31)

**Contexto**: Regras de contratos usavam `auth.uid` (variável
inexistente) em vez de `request.auth.uid` no create/cancelamento.
O compilador trata como `false` → adotante **não conseguia
criar/cancelar seu contrato**.

**Decisão**: SEMPRE usar `request.auth.uid` (NUNCA `auth.uid`).

**Prevenção**: grep em CI para `allow.*auth\.uid` (sem `request.`).

**Aplicação em sw-v95**: corrigido em todas as ocorrências de
contratos.

### D-COLLECTION-GROUP-RULES (sw-v95, 2026-07-31)

**Contexto**: 8 collectionGroup queries estavam sem regra
`{path=**}`:
- `contracts` (Meus Contratos)
- `volunteers` (Minhas Voluntariadas)
- `volunteer_participations`
- `post_adoption` (Devolvidos)
- `fosters` (Histórico público)
- `kanban_cards`
- `banners`
- `volunteer_profile`

**Regras aninhadas por path NÃO cobrem `collectionGroup`**.

**Decisão**: CollectionGroup queries precisam de regra própria
`{path=**}` (regras recursivas), espelhando a autorização vetada
(padrão medications), preservando isolamento multi-tenant.

```js
// Exemplo para /volunteers (collectionGroup)
match /{path=**}/volunteers/{volunteerId} {
  allow read: if isAuth() && (
    isPlatformAdmin() ||
    isOwnerOfResource(resource.data.volunteer_uid) ||
    isClubMember(resource.data.shelter_club_id)
  );
}
```

**Prevenção**: CI deve verificar que cada `collectionGroup()` no
código tem regra `{path=**}` correspondente em `firestore.rules`.

### D-COLLECTION-GROUP-INDEX (sw-v97, 2026-07-31)

**Contexto**: Agora que as collectionGroup queries estão autorizadas
(sw-v95), as compostas precisam de índice com
`queryScope: COLLECTION_GROUP` (as single-field são auto-criadas).
Sem eles, a query falha com `FAILED_PRECONDITION` (distinto de
`permission-denied`).

**Decisão**: CollectionGroup queries compostas precisam de índice
COLLECTION_GROUP explícito em `firestore.indexes.json`.

**Aplicação em sw-v97**: adicionados 4 índices:
- `volunteers` (volunteer_uid ASC, volunteer_name ASC)
- `fosters` (foster_uid ASC, status ASC, ended_at DESC)
- `post_adoption` (shelter_club_id ASC, status ASC, returned_at DESC)
- `banners` (status ASC, position ASC)

Total: 68 índices.

**Prevenção**: grep em CI para `collectionGroup(` que não tenha
índice correspondente.

---

## §13. Decisões de Debug Sistemático (sw-v92..v93, 2026-07-31)

### D-HOOKS-ORDER-PRESERVE (sw-v93, 2026-07-31)

**Contexto**: `useArenaPageClasses` em `PetDetailV3` era chamado
**DEPOIS** dos early returns (`if (isLoading) return ...`).
`useEffect` em `LegalFooter` também. `useMemo` em `CrossRosterSection`
também. Viola a **Rule of Hooks** (hooks devem ser chamados sempre
na mesma ordem, sem condicionais).

**Decisão**: SEMPRE chamar hooks no TOPO do componente, ANTES de
qualquer early return. Caso contrário, o React perde o tracking e
emite warning "Rendered fewer hooks than expected".

**Aplicação em sw-v93**:
- `PetDetailV3`: `useArenaPageClasses` movido para antes dos returns
- `LegalFooter`: `useEffect` movido para depois de `mode hidden`
- `CrossRosterSection`: 2 `useMemo` movidos para depois do return

**Prevenção**: ESLint plugin `eslint-plugin-react-hooks` (já
configurado). Mas atenção: ele NÃO detecta quando o hook é chamado
DEPOIS de early return em mesmo escopo (não é regra condicional,
é regra de ORDEM). Code review manual necessário.

### D-IMPORT-CHECK (sw-v93, 2026-07-31)

**Contexto**: Vários ícones/componentes referenciados mas não
importados:
- `Layout`: ícones `Sun`/`Moon` do theme-toggle não importados
  → crash ao renderizar
- `OnboardingQuestionnaire`: `isEditMode` referenciado mas nunca
  definido
- `bannersService`: `collectionGroup` não importado do
  firebase/firestore
- `ShelterDonationsTab`: `useCreateShelterReceipt` não importado

**Decisão**: SEMPRE verificar imports ao adicionar referência
simbólica. Tree-shaking remove unused imports, mas o **Vite não
emite warning** se a referência for usada (mesmo se for em código
condicional/removido por dead code elimination).

**Prevenção**:
1. ESLint `no-undef` (já configurado).
2. `tsc --noEmit` em CI (ainda não configurado para o projeto).
3. Code review em PRs.

### D-FUNCTIONS-DEPS-CHECK (sw-v94, 2026-07-31)

**Contexto**: `generateVolunteerCertificateCore.cjs` faz
`require('pdfkit')`, mas `pdfkit` não estava em `functions/package.json`
(só `pdf-lib`). A Cloud Function quebraria em runtime com
"Cannot find module 'pdfkit'".

**Decisão**: SEMPRE verificar que TODAS as dependências usadas em
Cloud Functions estão em `functions/package.json` (não nas deps
do app principal).

**Prevenção**: `npm ls` em CI para Cloud Functions.

---

## §14. Decisões de Pet Operations (PR #204+#205, 2026-07-31)

### D-PET-OPS-UNIFIED-MODEL (PR #204, 2026-07-31)

**Contexto**: 7 subcoleções operacionais do pet (medications,
vet_visits, treatments, health_records, care_log, devolutions,
adopters_history) têm schemas ligeiramente diferentes. O
SHELTER_PET_OPS_TABLES_V1 agrega todas em uma única view.

**Decisão**: Todas as 7 subcoleções seguem o **mesmo modelo**:
- Campo de data nativo (ex.: `visit_date`, `start_date`, `care_date`)
- `scheduled_for` (opcional, ISO date) — agendamento para o futuro
- `completed_at` (opcional, ISO) — marca agendamento como realizado

**Status derivado** (calculado em runtime, sem persistir):
- `done` — realizado
- `scheduled` — agendado para o futuro
- `overdue` — agendado no passado, não realizado

**Data efetiva** = `scheduled_for ?? <campo nativo>`

**Aplicação**: definido em `src/modules/shelter/domain/operational/petOpsScheduling.js`.

### D-PET-OPS-DECLARATIVE-CONFIGS (PR #204, 2026-07-31)

**Contexto**: Cada sub-aba operacional (medicações, consultas, etc)
precisa de config de colunas, formulário, listagem, CRUD. Código
duplicado seria inviável.

**Decisão**: Sub-abas definidas declarativamente em `PET_OPS_CONFIGS`
(zero código duplicado). Cada config descreve:
- `key`, `tabKey`, `title`, `icon`
- `dateField`, `dateLabel`, `emptyHint`
- `listFn`, `createFn`, `updateFn`, `deleteFn` (importados dos services)
- `fields` (config do formulário)
- `columns` (config da tabela)

**Aplicação**: 7 entradas em `petOpsConfigs.jsx`. Container
`PetOpsTab` e form genérico `PetOpsForm` consomem esses configs.

**Vantagem**: adicionar nova sub-aba = adicionar entrada no config.

### D-PET-OPS-STATUS-DERIVED (PR #204, 2026-07-31)

**Contexto**: Status (done/scheduled/overdue) precisa estar visível
na UI, mas persistir tem risco de dessincronização (campo
desatualizado, migração, etc).

**Decisão**: Status é **calculado em runtime** via `recordStatus()`,
**NÃO persistido**. Single source of truth = campos do documento.

**Aplicação**: `recordStatus(record, dateField)` em
`petOpsScheduling.js`. Usado por `RecordStatusBadge`, tabelas
operacionais, listas da página do pet.

### D-PET-OPS-SCHEDULING-REUSE (PR #205, 2026-07-31)

**Contexto**: Modelo de agendamento das tabelas operacionais do
abrigo (SHELTER_PET_OPS_TABLES_V1) precisa estar também dentro da
página do pet (PetDetailV3). Duplicar seria ruim.

**Decisão**: Mesmo modelo de agendamento **reutilizado** entre
tabelas do abrigo e página do pet. **Zero duplicação**:
- `SchedulingFields` (toggle genérico)
- `RecordStatusBadge` (badge genérico)
- Helpers puros `initScheduled` / `applyScheduling` em
  `petOpsScheduling.js` (testados)

**Aplicação**: 4 formulários da página do pet usam
`SchedulingFields` (PetVetVisitForm, PetTreatmentForm,
PetCareLogForm, PetDevolutionForm). 4 listas usam
`RecordStatusBadge`.

### D-PET-OPS-MANAGE-ONLY-CRUD (PR #205, 2026-07-31)

**Contexto**: Página do pet (PetDetailV3) tem 2 visões: admin do
abrigo e visitante público. CRUD de saúde não deve aparecer para
visitantes.

**Decisão**: CRUD de saúde (vacinas, vermifugação, etc) **só
aparece para quem `canManage=true`**. Visitantes veem
`PublicHealthRecord` (read-only).

**Aplicação**: `PetHealthRecordForm` + `PetHealthRecords` renderizados
apenas se `canManage(pet, user)`. Visitantes veem
`PublicHealthRecord` em `/pets/:id`.

### D-PET-OPS-PUBLIC-ONLY-DONE (PR #205, 2026-07-31)

**Contexto**: Visitantes públicos não devem ver agendamentos
futuros (ainda NÃO aplicados). Só o que já foi realizado.

**Decisão**: Visão pública do pet só mostra registros `done`.
Agendamentos futuros ocultos.

**Aplicação**: `PublicHealthRecord.jsx` filtra por `status === 'done'`.

### D-PET-ID-DISPLAY (PR #206, 2026-08-01)

**Contexto**: Pets sem nome eram indistinguíveis em tabelas
operacionais e no seletor de pet do modal de registro.

**Decisão**: Toda tabela/seletor de pet mostra nome (ou "Sem
nome") + ID imutável `#000001` / `pet_code` no **mesmo padrão do
painel admin**.

**Aplicação em PR #206**:
- Coluna PET das planilhas do abrigo
- Seletor de pet do modal "Novo registro"
- PetMedicationForm (saúde do pet)

### D-PET-OPS-RECORD-STATUS-BY-DATE (PR #206, 2026-08-01)

**Contexto**: `recordStatus()` considerava apenas `scheduled_for`.
Um registro **sem** `scheduled_for` mas com campo de data nativo
no futuro vinha como "Realizada" (errado).

**Decisão**: `recordStatus()` considera **data efetiva**
(`scheduled_for ?? dateField`) para classificar done/scheduled/overdue.

**Aplicação em PR #206**:
- `recordStatus()` em `petOpsScheduling.js`
- `proximityLabel`, `isUpcoming`, `summarizeAlerts` e
  `RecordStatusBadge` recebem `dateField` para o cálculo por
  data efetiva.

### D-PET-MEDICATION-VIA-MEDICAL-SERVICE (PR #206, 2026-08-01)

**Contexto**: `PetMedicationForm` usava service legado que não
injetava `actor.uid`, gerando erro "actor.uid é obrigatório".

**Decisão**: `PetMedicationForm` DEVE usar `petMedicalService`
(`usePetMedical`), que injeta o ator autenticado e grava em
`pets/{petId}/medications` — a mesma coleção lida pelas
planilhas do abrigo.

---

## §15. Decisões de Firestore Permissions (PR #207+#208, 2026-08-03)

### D-FIRESTORE-BATCH-AFTER (PR #207, 2026-08-03)

**Contexto**: `createClub` grava o doc do clube E o membership
admin do criador no MESMO `writeBatch`. A regra de create de
`club_members` exigia `isClubOwnerUid` (get do clube), mas em um
batch o clube **ainda não foi commitado** → negado para qualquer
usuário não-admin.

**Decisão**: Em `writeBatch` que cria doc E referencia ele, usar
`getAfter` / `existsAfter` na rule para enxergar estado pós-commit.

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

**Aplicação em PR #207**:
- `createClub` (criação de organização/abrigo)
- `joinClubByCode` (entrar por convite/código)

**Sem impacto de segurança**: o criador só vira admin do clube
que ele mesmo cria; o auto-ingresso já era gated.

### D-FIRESTORE-COUNTER-OPEN-AUTH (PR #207, 2026-08-03)

**Contexto**: `getNextPetSeq` usa `runTransaction` em
`pet_seq_counter/global`, mas a regra restringia a `platform_admin`.
A transação de todos os outros usuários falhava (caindo no
fallback por timestamp, que quebra a **unicidade do pet_seq**).

**Decisão**: `pet_seq_counter/global` é **liberado para qualquer
auth** (doc só guarda value, sem dados sensíveis).

**Aplicação**: `pet_seq_counter/global` agora permite `read` e
`write` para qualquer usuário autenticado. Sem PII ou dados
sensíveis no doc.

### D-VOLUNTEER-SIGN-AT-TERM-STEP (PR #207, 2026-08-03)

**Contexto**: `JoinVolunteerModal` coletava `signature_text` no
submit final, mas o aceite do termo já acontecia antes. O fluxo
queria assinatura eletrônica no passo do termo.

**Decisão**: `signature_text` é coletado **no passo do termo**
(NÃO no submit final). Garante fonte canônica no momento do
aceite.

**Aplicação**: `JoinVolunteerModal.handleSubmit` reescrito. Regra
de create de `volunteer_profile` valida os campos de assinatura
**só quando presentes**; o aceite continua imutável em
`terms_acceptances` e reforçado na rostagem.

### D-FIRESTORE-COUNTER-OPEN-TO-MEMBERS (PR #208, 2026-08-03)

**Contexto**: Membros comuns do clube/comunidade não conseguiam
curtir nem comentar em posts porque a transação que incrementa
`likes_count` / `comments_count` no post era barrada pela regra
de update do post.

**Decisão**: Qualquer membro do clube/comunidade pode atualizar
**SOMENTE contadores denormalizados** (`likes_count`,
`comments_count`, `comment_count`, `last_activity_ms`,
`participant_ids`). O **doc de like/comentário continua gated** à
parte; **contadores são cosméticos** (a verdade é a subcoleção).

**Aplicação em PR #208**:
- `club_posts` (mural da ONG)
- `community_posts` (mural da comunidade)
- `club_forum_threads` (fórum da ONG)

### D-FIRESTORE-IS-ONLY-COUNTERS-UPDATE (PR #208, 2026-08-03)

**Contexto**: O ramo "qualquer membro pode atualizar contadores"
precisa de uma forma de validar que **só** os campos de contador
foram alterados (não outros campos sensíveis).

**Decisão**: Helper `isOnlyCountersUpdate(allowedFields)` valida
que `affectedKeys().hasOnly(allowedFields)` antes de permitir o
update.

```js
function isOnlyCountersUpdate(allowedFields) {
  return request.resource.data.diff(resource.data).affectedKeys()
    .hasOnly(allowedFields);
}

// Uso
allow update: if isAuth() && (
  isAuthorOrAdmin() ||
  (isClubMember(clubId) && isOnlyCountersUpdate(['likes_count', 'comments_count', 'updated_at']))
);
```

**Aplicação**: 3 collectionGroup/posts seguem o mesmo padrão.
Helper compartilhado em `firestore.rules`.

---

## §16. Decisões de Personas V4 (PLAN_PERSONAS_V4.md, 2026-08-03)

> **STATUS**: 30/30 decisões validadas pelo owner. Aguardando
> início da implementação. Ver `docs/PLAN_PERSONAS_V4.md` para
> o documento completo. Quando a V4 iniciar, estas decisões
> devem ser marcadas como `ATIVA` e aplicadas.

### D-PERSONA-MULTI (Q1, Q3, Q5, Q6)

User pode ter **múltiplas personas** mas apenas **uma ativa por
vez**. Personas são ortogonais (Adotante + Doador + Voluntário +
etc. são combinações válidas). Troca via switch, sem confirmação,
instantânea.

### D-PERSONA-DONOR-EXPLICIT-CONFIRM (Q2)

Se o user já é **membro/equipe/voluntário de abrigo X** e tenta
cadastrar pet para doação, mostrar modal:
> "Você é membro/equipe/voluntário no abrigo X. Deseja cadastrar
> este pet no referido abrigo ou deseja adicionar o acesso
> 'Doador' à sua conta?"

- "Cadastrar no abrigo X" → `owner_type: 'organization'`
- "Adicionar acesso Doador" → `owner_type: 'user'` + ativa persona `donor`

### D-PERSONA-FEED-EXCLUSIVE-ADOPTER (Q4)

**Feed de pets só aparece no acesso "Adotante"**. Outras
personas **NÃO** têm feed (nem read-only). Para adotar, o user
troca para a persona "Adotante" via switcher.

### D-PERSONA-ADMIN-OVERRIDE (Q7, Q9)

- Admin master é **persona separada + override**.
- Aparece no switcher **SÓ** para `role: 'platform_admin'`.
- Em **outras personas** (não "admin master"): **NÃO** tem
  poderes de admin — apenas as permissões normais daquela
  persona. Permite testar UX como usuário comum.
- Em **"admin master"**: **override total** — vê tudo, sem
  precisar ser membro. Atalho `/admin` para visão agregada.
- O user com `role: 'platform_admin'` **possui todas as
  personas disponíveis** (lista sempre completa no switcher).

### D-PERSONA-ADMIN-OWNER-ONLY (Q8)

Apenas o owner (`fsalamoni@gmail.com`) pode atribuir o role
`platform_admin`. Outros admins **NÃO** podem promover. Mais
seguro contra escalonamento de privilégios.

### D-PERSONA-NAMES-UX (Q10)

Nomes UX canônicos:
- Adotante → "Adotar / Ajudar"
- Doador → "Doar um pet"
- Membro de Abrigo → "Meu abrigo"
- Membro de Comunidade → "Minha comunidade"
- Voluntário → "Ser voluntário"
- Admin Master → (oculto)

### D-PERSONA-ONE-AT-A-TIME (Q11)

**Uma persona por vez no primeiro acesso**. Pode adicionar
outras via switcher → "Adicionar outro acesso" (também
acessível via landing page). **Sempre que reentrar, entra no
último acesso ativo** (persistido em `active_persona` no
Firestore).

### D-PERSONA-ONBOARDING-ONCE (Q12)

Onboarding de cada persona é executado **UMA vez**. Campos
preenchidos persistem. Trocar de persona **NÃO** pede
onboarding de novo.

### D-PERSONA-SWITCH-NO-CONFIRM (Q14)

Troca de persona é **instantânea, sem confirmação**. Estilo
Google Account switcher. Sem fricção.

### D-PERSONA-SWITCHER-VISIBILITY (Q15)

Switcher visível **só quando há 2+ personas**. Se só tem 1,
**NÃO** polui o TopBar. Mas **DEVE** haver link "Adicionar
outro acesso" no TopBar/Perfil para criar novas personas.

### D-PERSONA-FIRST-ACCESS-FORCED (Q16)

No primeiro acesso (sem persona definida), user é **direcionado
para `/acesso`** após login. Landing pública continua acessível
via botão "Voltar" ou URL direta.

### D-PERSONA-MULTI-CLUB (Q17)

Membro de múltiplos abrigos: **switcher no TopBar (dropdown)**
com badge numérica indicando o abrigo ativo. Persistido em
`active_shelter_id`.

### D-PERSONA-MULTI-ROSTER-ISOLATED (Q18)

Voluntário em múltiplos abrigos: **dados isolados por abrigo**
(escalas, tarefas, audit trail). Switcher de abrigo no TopBar.

### D-PERSONA-MEMBERSHIP-INDEPENDENT (Q19)

Sair do voluntariado **NÃO** remove membership de abrigo. São
papéis independentes.

### D-PERSONA-PET-TRANSFER (Q20)

Pet pessoal pode ser transferido para abrigo via "Transferir
para abrigo" no detalhe do pet. Atualiza `owner_type` para
`organization`. Audit log obrigatório. **Não tem como
desfazer** (decisão irreversível, com confirmação forte).

### D-PERSONA-ORPHAN-PETS (Q21)

Pets órfãos (user desativado):
- Mantidos com `owner_type: 'user'`, `owner_id: <uid-desativado>`.
- **OCULTOS no feed** (não aparecem para adotantes).
- **Cadastro é único** (deduplicado por fingerprint nome+
  espécie+porte+idade). Re-cadastro do mesmo pet puxa info
  anterior.
- Listados como "Pets sem responsável" no admin master.
- Adotantes contactados **apenas** pelo admin master.

### D-PERSONA-ADMIN-CANNOT-DEMOTE (Q22)

Platform admin **NÃO** pode se rebaixar. Apenas o owner pode
rebaixar. Proteção contra auto-rebaixamento.

### D-PERSONA-ADOPTER-ONBOARDING (Q23)

`AdopterOnboarding` é o `OnboardingQuestionnaire` renomeado.
Libera feed após `profile_completed = true`.

### D-PERSONA-DONOR-ONBOARDING (Q24)

`DonorOnboarding` (novo) com campos:
- `donor_motivation` (texto)
- `has_donated_before` (boolean)
- `pets_count` (número)
- `experience_with_species` (array: dogs, cats, rabbits, birds,
  other)
- `experience_years` (número)
- `donor_accepts_home_check` (boolean)
- `donor_accepts_post_adoption_followup` (boolean)
- `donor_preferred_contact_method` (whatsapp/email/chat)
- `donor_bio` (texto curto)

Compartilhado com `users/{uid}` global: cidade, estado, telefone,
LGPD consent.

### D-PERSONA-SHELTER-ENTRY (Q25)

Onboarding de Membro de Abrigo sem abrigo: 2 caminhos.
- **Código**: `joinClubByCode` → painel
- **Criar novo**: `CreateOrganization` → `ShelterOnboardingWizard`
  (5 steps) → painel

### D-PERSONA-VOLUNTEER-POOL (Q26)

Voluntário sem vínculo com abrigo entra em um **POOL DE
VOLUNTÁRIOS DA PLATAFORMA** (não fica apenas "inativo").
- Filtros: região, tempo disponível, tarefas preferidas, raio
  de atuação, espécies preferidas.
- Abrigos podem **buscar/browse** o pool para convidar.
- Voluntário recebe notificação quando convidado.
- Páginas:
  - `/voluntarios/pool` (pública para voluntários)
  - `/organizacoes/:id/admin?tab=volunteers-pool` (admin do abrigo
    com permissão)

### D-PERSONA-SWITCHER-INCOMPLETE-BADGE (Q27)

Switcher mostra **todas** as personas disponíveis, mas as
incompletas têm badge "Incompleto". Ao clicar, redireciona para
continuar o onboarding.

### D-PERSONA-NO-EXPIRATION (Q28)

Personas **NÃO** expiram automaticamente. Membro/voluntário
fica disponível indefinidamente. Admin do abrigo pode
pausar/bloquear manualmente.

### D-PERSONA-MIGRATION-AUTO (Q29)

Pets cadastrados antes da V4: migração automática no primeiro
login pós-V4. User com `owner_type: 'user'` recebe persona
`donor` automaticamente.

### D-PERSONA-FLAG-GRADUAL (Q30)

Flag `V4_PERSONA_ENABLED` (default OFF). Plano de ativação:
1. Staging (testes E2E)
2. Migração de dados em produção (script)
3. Owner liga no próprio user
4. Validação manual
5. Liberação gradual (10% → 50% → 100%)

---

**Próxima leitura**: `docs/PLAN_PERSONAS_V4.md` (documento-guia
completo da V4).
