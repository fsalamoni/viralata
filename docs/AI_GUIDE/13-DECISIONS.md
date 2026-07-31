# 13-DECISIONS.md — Decisões Arquiteturais Importantes (D-*)

> **Atualizado em 2026-07-31** (sw-v75..v91)
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

### D-REACT-QUERY-KEY-PRIMITIVES (sw-v87, 2026-07-30)

**Contexto**: `useShelterVolunteers(shelterClubId, { status: statusFilter })`
tinha `queryKey: ['shelter-volunteers', shelterClubId, options]`. `options`
é OBJETO criado a cada render (mesmo com conteúdo igual). React Query
compara queryKey por **referência** de objeto. Vê que mudou → refetch →
re-render → loop infinito (React error #306).

**Stack trace reveladora**:
```
onSubscribe @ React Query  ← chamada a cada render
subscribe @ React Query     ← React Query se inscreve no Observable
setData @ React Query       ← Firestore emite → setState do data
batch @ React Query         ← batch de updates
setTimeout                  ← React render
...loop infinito
```

**Decisão**: SEMPRE extrair campos individuais de `options` e usar
PRIMITIVOS no `queryKey` (?? null para nullables):

```js
// ❌ Errado (objeto = loop infinito)
queryKey: ['shelter-volunteers', shelterClubId, options]

// ✅ Correto (primitivos)
const { status, maxResults } = options;
queryKey: ['shelter-volunteers', shelterClubId, status ?? null, maxResults ?? 200]
```

**Aplicação**: TODOS os hooks useQuery com `options` object como segundo
argumento. Aplicado em sw-v87 em 10 hooks:
- useShelterVolunteers, useUserVolunteerRosters
- useVolunteerAssignments, useParticipations
- useApplications, useExhibitions, useFosters
- useMedicalRecords, useMedications, usePetPhotos

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
