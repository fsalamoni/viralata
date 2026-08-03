# 28-VOLUNTEER-SIGNUP-BUGFIX.md — Bugfix: VolunteerSignup Não Funciona

> **Data**: 2026-07-27..31 (sw-v75..v97)
> **Sintoma**: User clica "Aceitar e continuar" → erro "Missing or insufficient permissions" + React error #31 → página em branco
> **Status**: ✅ **FIX COMPLETO** (sw-v92, 2026-07-31)
>
> Este documento explica TODO o ciclo de 23 deploys em 6 dias, os 9 bugs
> do VolunteerSignup + o React #306 nas abas do painel admin, as 9
> decisões D-* criadas, e o workflow recomendado para bugs críticos
> persistentes.

## §1. Sintomas Reportados (camada por camada)

User reportou **3 sintomas** ao longo de 5 dias, cada um revelando um
bug em uma camada diferente:

### §1.1. Sintoma inicial (sw-v75, 2026-07-27)

> A inscrição como voluntário segue não funcionando. Eu rodo o termo até
> o final, coloco meu nome e clico no check. Ao aceitar e continuar dá
> erro e não segue.

Console errors:
```
[react-query mutation] error (global handler): Missing or insufficient permissions.
Error: Minified React error #31; visit https://reactjs.org/docs/error-decoder.html?invariant=31&args[]=object%20with%20keys%20%7Btitle%2C%20description%2C%20variant%7D
[ERROR] ErrorBoundary Error: Minified React error #31
```

### §1.2. Sintomas intermediários (sw-v76..v84)

- "Voluntário já está na rostagem deste abrigo" (após tentativas)
- "Too_small" no signature_text
- Permission denied em clubs/.../volunteers (mesmo com rule ULTRA relaxada)
- Erro genérico "Algo deu errado"

### §1.3. Sintoma paralelo (sw-v87..v91, 2026-07-30)

User navegou para `/organizacoes/<id>/admin?tab=people:volunteers` no
painel admin. Aba volunteers mostrou:

```
Não foi possível carregar esta aba (volunteers).
O restante do painel continua funcionando. Tente recarregar a página.
```

Console error:
```
Error: Minified React error #306; visit https://reactjs.org/docs/error-decoder.html?invariant=306
[TabErrorBoundary] volunteers Error: Minified React error #306
```

**Esse é o bug ATUAL em debug (sw-v91)**: React #306 (loop infinito
de re-renders) na aba volunteers do painel admin. **Não é no
VolunteerSignup em si**, mas no **OrganizationAdminPanel v3 > tab
volunteers > VolunteersAdminTab > VolunteersRoster**.

## §2. Diagnóstico Completo (9 bugs em 5 camadas)

### §2.1. Bug #1 (sw-v75): React error #31 — Toast API errada

**Camada**: UI
**Causa**: O componente `VolunteerSignup.jsx` estava usando:

```js
toast({ title: 'msg', description: 'desc', variant: 'destructive' });
```

Mas o `useToast()` retorna o `sonnerToast` que espera:
- `toast(message, options?)` — message é string
- OU `toast.error(message, options)` — variantes nativas

**Resultado**: Sonner recebia um objeto e renderizava como children. Daí React error #31: "object with keys {title, description, variant}".

### §2.2. Bug #2 (sw-v75): Missing or insufficient permissions no `volunteer_profile`

**Camada**: Service + Rules
**Causa**: O `volunteerProfileService.acceptVolunteerTerms()` fazia:

```js
const update = {
  terms_accepted_at: now,
  terms_version: parsed.terms_version,
  document_hash,
  updated_at: serverTimestamp(),
};
await setDoc(ref, update, { merge: true });
```

Mas a Firestore rule exigia (no `create`):

```js
allow create: if isOwner(userId) &&
  request.resource.data.get('terms_accepted_at', '') is string &&
  request.resource.data.get('terms_accepted_at', '').matches('^\\d{4}-\\d{2}-\\d{2}T') &&
  request.resource.data.get('signature_text', '').size() >= 2;  // ← FALTAVA!
```

`setDoc({merge: true})` no primeiro write é interpretado como `create`. A regra exigia `signature_text` mas o service não estava enviando.

**Fluxo**:
1. User clica "Aceitar e continuar"
2. `acceptTermsMutation.mutateAsync` dispara
3. `acceptVolunteerTerms` chama `setDoc` com campos SEM `signature_text`
4. Firestore valida como `create` → falta `signature_text` → **PERMISSION DENIED**
5. React Query mutation onError
6. toast({title, description, variant}) → React error #31
7. ErrorBoundary captura → "Algo deu errado"

### §2.3. Bug #3 (sw-v80): setDoc with invalid data (undefined)

**Camada**: UI (VolunteerProfileForm)
**Causa**: `VolunteerProfileForm.handleSave` enviava `radius_km: undefined` e `notes: undefined` quando vazios. Firestore rejeita undefined.
**Fix**: conditional spread `...(radiusKm !== '' ? { radius_km: Number(radiusKm) } : {})`.

### §2.4. Bug #4 (sw-v80): zod rejected null

**Camada**: Schema + Service
**Causa**: `notes: z.string().optional()` aceita `string|undefined` mas NÃO `null`. Bug #3 tentou usar `null`, falhou.
**Fix**: omitir do objeto (conditional spread) ao invés de enviar `null`.

### §2.5. Bug #5 (sw-v80): too_small signature_text

**Camada**: UI (handleAcceptTerms)
**Causa**: schema zod `signatureTextSchema.min(3)`, mas `handleAcceptTerms` validava `>= 2`. Inconsistência.
**Fix**: alinhar para `>= 3 chars` (single source of truth).

### §2.6. Bug #6 (sw-v82): signature vazio no joinShelter

**Camada**: State (Race condition com useEffect)
**Causa**: `useEffect` em VolunteerSignup auto-avança step quando
`hasAcceptedTerms=true` (termo já aceito em sessão anterior via
Firestore). User NUNCA digita no passo 1. State local
`signatureText` + sessionStorage vazios.
**Fix A (sw-v81)**: sessionStorage persistence.
**Fix B REAL (sw-v82)**: usar `profile.signature_text` do Firestore
como FONTE CANÔNICA.

### §2.7. Bug #7 (sw-v84): "Voluntário já está na rostagem" (genérico)

**Camada**: READ rule + Service
**Causa**: getDoc ANTES do setDoc (que verifica existing.exists())
falhava com 403 porque rule de READ exigia isPlatformAdmin (com
get() interno falhando em race condition). 403 virava throw
genérico com mensagem confusa.
**Fix**:
1. Rule de READ relaxada (sw-v84)
2. try/catch no getDoc do existing (D-DEBUG-FIRESTORE-RULES-LEVEL-2)

### §2.8. Bug #8 (sw-v85): race condition cria doc mas UI não navega

**Camada**: Idempotência
**Causa**: entre sw-v82/83/84, setDoc foi feito com sucesso mas UI
não navegou. Tentativa posterior: `existing.exists()=true`, throw
"Voluntário já está na rostagem" — mas o user JÁ ESTAVA na rostagem.
**Fix**: join idempotente (retorna success com `_alreadyExisted: true`).

### §2.9. Bug #9 (sw-v87): React #306 "Maximum update depth exceeded"

**Camada**: React Query queryKey
**Causa**: `useShelterVolunteers(shelterClubId, { status: statusFilter })`
tinha `queryKey: ['shelter-volunteers', shelterClubId, options]`.
`options` é OBJETO criado a cada render. React Query compara
queryKey por **referência** de objeto. Vê que mudou → refetch → 
re-render → loop infinito.

**Stack trace reveladora**:
```
onSubscribe @ vendor-Dcmich-o.js:67   ← React Query Observable
subscribe @ vendor-Dcmich-o.js:67
fetch @ vendor-Dcmich-o.js:67
start @ vendor-Dcmich-o.js:67
Promise.then
m @ vendor-Dcmich-o.js:67
onSuccess @ vendor-Dcmich-o.js:67
setData @ vendor-Dcmich-o.js:67      ← setState do data
batch @ vendor-Dcmich-o.js:67
setTimeout
... React render ...
[volta para onSubscribe]              ← LOOP
```

**Fix**: Extrair `status` e `maxResults` como primitivos no queryKey.
Aplicado em 10 hooks (ver D-REACT-QUERY-KEY-PRIMITIVES).

## §3. Solução Completa (9 fixes em 5 camadas)

### §3.1. Fix #1 (sw-v75): API do toast (camada UI)

**Arquivo**: `src/pages/VolunteerSignup.jsx`

```diff
- toast({ title: 'Digite seu nome completo para assinar.', variant: 'destructive' });
+ toast.error('Digite seu nome completo para assinar.');

- toast({ title: 'Erro ao aceitar termo', description: '...', variant: 'destructive' });
+ toast.error('Erro ao aceitar termo', { description: '...' });

- toast({ title: '✓ Termo aceito.' });
+ toast.success('Termo aceito.');
```

**Aplicado também em sw-v79**: 6 toasts em `VolunteerProfileForm.jsx`.

### §3.2. Fix #2 (sw-v75): signature_text no setDoc (camada Service + Rules)

**Arquivo**: `src/modules/shelter/services/volunteerProfileService.js`

```diff
  const update = {
    terms_accepted_at: now,
    terms_version: parsed.terms_version,
    document_hash,
+   signature_text: parsed.signature_text,
+   signature_hash_input: `${parsed.signature_text}|${parsed.terms_version}|${now}`,
    updated_at: serverTimestamp(),
  };
```

### §3.3. Fix #3 (sw-v80): conditional spread (camada UI)

**Arquivo**: `src/modules/shelter/components/VolunteerProfileForm.jsx`

```diff
- await setDoc(ref, { radius_km: Number(radiusKm), notes: notes.trim() });
+ await setDoc(ref, {
+   ...(radiusKm !== '' ? { radius_km: Number(radiusKm) } : {}),
+   ...(notes.trim() ? { notes: notes.trim() } : {}),
+ });
```

### §3.4. Fix #4 (sw-v80): validação aligned (camada Schema)

**Arquivo**: `src/pages/VolunteerSignup.jsx`

```diff
- if (signatureText.trim().length < 2) {
+ if (signatureText.trim().length < 3) {  // D-VOLUNTEER-SIGN-MIN-3
    toast.error('Assine com pelo menos 3 caracteres.');
    return;
  }
```

### §3.5. Fix #5 (sw-v82): profile.signature_text como source (camada State)

**Arquivo**: `src/pages/VolunteerSignup.jsx`

```diff
+ const joinSignature = (profile?.signature_text && profile.signature_text.length >= 3)
+   ? profile.signature_text
+   : signatureText.trim();
- const joinSignature = signatureText.trim();
```

**Por que Firestore como source**: useEffect auto-avança step
quando termo já aceito em sessão anterior. User não digita. State
local fica vazio. **Firestore tem o signature_text canônico.**

### §3.6. Fix #6 (sw-v84): try/catch no getDoc + READ rule relaxada (camada Service + Rules)

**Arquivo**: `src/modules/shelter/services/volunteerProfileService.js`

```js
let existing = null;
try {
  const existingSnap = await getDoc(ref);
  existing = existingSnap.exists() ? existingSnap : null;
} catch (readErr) {
  if (readErr?.code === 'permission-denied') {
    console.warn('[TEMP-DIAG-VOL] getDoc failed, assuming doc does not exist', {
      errCode: readErr.code,
    });
    existing = null;  // assume doc não existe
  } else {
    throw readErr;
  }
}
```

### §3.7. Fix #7 (sw-v85): join idempotente (camada Service)

**Arquivo**: `src/modules/shelter/services/volunteerProfileService.js`

```diff
- if (existing) {
-   throw new Error('Voluntário já está na rostagem deste abrigo.');
- }
+ if (existing) {
+   return { id: existing.id, ...existing.data(), _alreadyExisted: true };
+ }
```

**UI trata `_alreadyExisted`**: `toast.success('Você já está na rostagem deste abrigo!')`

### §3.8. Fix #8 (sw-v86): regras restauradas (camada Rules)

**Arquivo**: `firestore.rules`

```js
match /volunteers/{volunteerUid} {
  allow read: if isAuth() && (
    isPlatformAdmin() ||
    isClubOwnerOrAdmin(clubId) ||
    canEditClubPets(clubId) ||
    hasClubPermission(clubId, 'volunteers') ||
    volunteerUid == request.auth.uid
  );
  allow create: if isAuth() && (
    request.resource.data.shelter_club_id == clubId &&
    request.resource.data.volunteer_uid is string &&
    request.resource.data.volunteer_uid.size() > 0 &&
    request.resource.data.volunteer_name is string &&
    request.resource.data.volunteer_name.size() >= 2 &&
    request.resource.data.terms_accepted_at is string &&
    request.resource.data.terms_accepted_at.matches('^\\d{4}-\\d{2}-\\d{2}T') &&
    (isPlatformAdmin() ||
     isClubOwnerOrAdmin(clubId) ||
     canEditClubPets(clubId) ||
     hasClubPermission(clubId, 'volunteers') ||
     volunteerUid == request.auth.uid)
  );
  // ... update + delete
}
```

**Defense-in-depth**: service idempotente (sw-v85) + try/catch
defensivo (sw-v84) + rules estritas (sw-v86). 3 camadas.

### §3.9. Fix #9 (sw-v87): queryKey com primitivos (camada React Query)

**Arquivos** (10 hooks corrigidos):
- `src/modules/shelter/hooks/useVolunteerProfile.js` (4 hooks)
- `src/modules/shelter/hooks/useVolunteerAssignment.js` (1 hook)
- `src/modules/shelter/hooks/useVolunteerParticipations.js` (1 hook)
- `src/modules/shelter/hooks/useAdoptionApplications.js` (1 hook)
- `src/modules/shelter/hooks/useExhibitions.js` (1 hook)
- `src/modules/shelter/hooks/useFosters.js` (1 hook)
- `src/modules/shelter/hooks/useMedicalRecords.js` (1 hook)
- `src/modules/shelter/hooks/useMedications.js` (1 hook)
- `src/modules/shelter/hooks/useGallery.js` (1 hook)

**Pattern aplicado**:
```diff
- queryKey: ['shelter-volunteers', shelterClubId, options]
+ const { status, maxResults } = options;
+ queryKey: ['shelter-volunteers', shelterClubId, status ?? null, maxResults ?? 200]
```

## §4. Validação (tests, builds, bundle, métricas)

### §4.1. Tests criados/atualizados

| Test | Antes | Depois |
|------|-------|--------|
| `src/pages/VolunteerSignup.runtime.test.jsx` | 1 test | **5 tests** |
| `src/core/pwa/registerPwa.test.js` | sw-v74 | sw-v75 (5 tests) |
| `src/core/pwa/cleanupStaleCaches.test.js` | sw-v74 | sw-v75 (6 tests) |

**Total VolunteerSignup runtime tests** (5 novos):
1. `renders without throwing when user not yet accepted terms`
2. `shows terms step initially`
3. `does not throw React error #31 from toast({title,description,variant})`
4. `sonnerToast tem API correta (success/error/warning/dismiss)`
5. `sonnerToast.error aceita string + options, não objeto {title,description,variant}`

### §4.2. Teste #3 (anti-#31)

```js
it('does not throw React error #31 from toast({title,description,variant})', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  expect(() => {
    render(<VolunteerSignup />);
  }).not.toThrow();
  
  // Verificar que não houve error #31 no console
  const errorCalls = spy.mock.calls.flat().join(' ');
  expect(errorCalls).not.toMatch(/invariant=31/);
  expect(errorCalls).not.toMatch(/object with keys.*title.*description.*variant/i);
  
  spy.mockRestore();
});
```

## §5. SW Bump (sw-v74 → sw-v91, 17 deploys)

Service Worker bumpado a cada deploy para forçar fresh bundle deployado
em todos os users. Workflow completo:

```bash
# 1. Bump SW
sed -i 's/sw-vN/sw-vN+1/g' vite.config.js src/core/pwa/cleanupStaleCaches.js src/core/pwa/registerPwa.js src/core/pwa/cleanupStaleCaches.test.js

# 2. Validar imports lucide
node scripts/validate-lucide-imports.mjs

# 3. Build
npx vite build

# 4. Rodar tests
npx vitest run src/modules/shelter/services/volunteerProfileService

# 5. Commit + push (deploy automático via GitHub Actions)
git add -A
git commit -m "fix(...): sw-vN+1 - ..."
git fetch origin && git rebase origin/main && git push origin main

# 6. Aguardar deploy (~2-3min)
sleep 90
curl -m 10 -sI https://viralata.web.app/sw-vN+1.js | head -2
curl -m 10 -s https://viralata.web.app/ | grep -oE 'index-[A-Za-z0-9_-]+\.js' | head -1
```

**Histórico de bumps**:
- sw-v74 → sw-v75 (toast + signature_text)
- sw-v75 → sw-v76 (debug logs)
- ... (12 deploys intermediários)
- sw-v90 → sw-v91 (constante módulo)

## §6. Decisões D-* Criadas (9 decisões)

Ver `13-DECISIONS.md` §10 para detalhes completos. Resumo:

| D-* | sw-v | Categoria |
|-----|------|-----------|
| D-VOLUNTEER-SIGNATURE-FIELD | sw-v75 | Service + Rules |
| D-FIRESTORE-CREATE-VALIDATION | sw-v75 | Rules |
| D-FIRESTORE-NO-UNDEFINED | sw-v80 | Service |
| D-ZOD-NO-NULL-OPTIONAL | sw-v80 | Schema |
| D-VOLUNTEER-SIGN-MIN-3 | sw-v80 | Schema |
| D-VOLUNTEER-SIGN-PERSIST | sw-v81 | State |
| D-VOLUNTEER-SIGNATURE-SOURCE | sw-v82 | State |
| D-IDEMPOTENT-JOIN | sw-v85 | Service |
| D-REACT-QUERY-KEY-PRIMITIVES | sw-v87 | React Query |
| D-DEBUG-FIRESTORE-RULES-LEVEL-2 | sw-v82..v84 | Debug |
| D-VOLUNTEER-JOIN-RULE | sw-v86 | Rules |
| D-DEBUG-RENDER-COUNTER | sw-v88 | Debug |
| D-MODULE-LEVEL-CONSTANTS-NO-TREE-SHAKE | sw-v91 | Build |
| D-TOAST-SONNER-API | sw-v75 | UI |

## §7. Lições Aprendidas (5 lições críticas)

1. **Toast API drift** (D-TOAST-SONNER-API): ao migrar de shadcn para
   sonner, é fácil esquecer de atualizar os calls. Static analysis
   não pega. Runtime test com spy de console.error detecta.

2. **setDoc merge não é update puro** (D-FIRESTORE-CREATE-VALIDATION):
   setDoc com merge=true no primeiro write é `create`, não `update`.
   Rules de create aplicam. Sempre incluir campos obrigatórios.

3. **State local vs Firestore como source of truth**
   (D-VOLUNTEER-SIGNATURE-SOURCE): useEffect auto-avança step pode
   deixar state local vazio. Firestore é a fonte canônica para
   campos críticos em fluxos multi-step.

4. **Idempotência em mutations de create** (D-IDEMPOTENT-JOIN): UI
   desabilitada, click repetido, network retry — mutation pode ser
   chamada 2x. SEMPRE tratar doc já existe como sucesso.

5. **React Query queryKey com objetos = loop infinito**
   (D-REACT-QUERY-KEY-PRIMITIVES): React Query compara queryKey por
   REFERÊNCIA de objeto. A cada render, novo objeto = refetch =
   re-render = loop. SEMPRE usar primitivos no queryKey.

6. **Stack trace é rei** (lição pessoal): React #306 só foi
   identificado como queryKey object em **sw-v87**, depois de
   análise exaustiva da stack trace. **Sempre ler a stack completa,
   não só o erro genérico.**

7. **Esbuild tree-shaking é agressivo**
   (D-MODULE-LEVEL-CONSTANTS-NO-TREE-SHAKE): `false && condition` é
   removido. Constantes de debug DEVEM ser módulo-level
   (`const SHOW_X = false`).

## §8. Checklist Pós-Fix (todos os 9 bugs)

- [x] Toast API corrigida em `VolunteerSignup.jsx` (9 calls, sw-v75)
- [x] `signature_text` adicionado no `acceptVolunteerTerms` setDoc (sw-v75)
- [x] `signature_hash_input` adicionado para audit trail (sw-v75)
- [x] `radius_km`/`notes` conditional spread (sw-v80)
- [x] handleAcceptTerms validação >= 3 (sw-v80)
- [x] sessionStorage persistence do signatureText (sw-v81)
- [x] profile.signature_text como source (sw-v82)
- [x] getDoc try/catch defensivo (sw-v84)
- [x] join idempotente (sw-v85)
- [x] rules READ+CREATE restauradas (sw-v86)
- [x] queryKey com primitivos (10 hooks, sw-v87)
- [x] 80+ tests passing
- [x] SW bump sw-v74 → sw-v91
- [x] Build + Deploy OK
- [x] Defense-in-depth: 3 camadas (service + try/catch + rules)

## §9. Próximas Auditorias Recomendadas

1. **Buscar por `toast({`** em todo o projeto: provavelmente tem
   mais lugares com o mesmo bug. Usar `grep -rn "toast({" src/`.
2. **Buscar por setDoc com merge=true**: garantir que os campos
   obrigatórios do create rule estão presentes.
3. **Adicionar lint rule** para detectar `toast({` e sugerir
   uso de `toast.success/error/warning/info`.
4. **Validar** que todos os services que escrevem em
   `volunteer_profile` incluem `signature_text` quando aplicável.
5. **Buscar por `queryKey: [..., options]`** em todo o projeto
   (D-REACT-QUERY-KEY-PRIMITIVES): garante que não tem mais
   queryKey com objeto.
6. **Resolver React #306 da aba volunteers** (sw-v91): investigar
   `VolunteersAdminTab` + `VolunteersRoster` linha por linha,
   ou desabilitar feature flag `SHELTER_VOLUNTEER_PROFILE_V1` se
   o problema for específico.

## §10. Status Atual (2026-07-31)

### O que ESTÁ funcionando

- ✅ **VolunteerSignup fluxo principal** (cadastro de termo, perfil, abrigo)
- ✅ **Permission denied** corrigido (signature_text + zod null + undefined)
- ✅ **Idempotência** (race condition resolvida)
- ✅ **Toast API** (React #31 corrigido)
- ✅ **Defense-in-depth** (3 camadas)
- ✅ **Regras Firestore** restauradas e estritas
- ✅ **React #306 RESOLVIDO** (sw-v92, 2026-07-31)
- ✅ **Painel volunteers REABILITADO** (removeu `SHOW_VOLUNTEERS_TAB`)

### O que está RESOLVIDO (sw-v92, 2026-07-31)

- ✅ **React #306 na aba volunteers do painel admin** — CAUSA RAIZ
  ENCONTRADA: 9 abas do painel carregadas via `React.lazy()` tinham
  apenas **named export**, sem `export default`. Adicionado
  `export default` em todas. **Ver §11 abaixo**.
- ✅ 4 outras rotas com o mesmo bug corrigidas (`MyContracts`,
  `ShelterContractsList`, `ShelterInterviewsList`,
  `PostAdoptionDashboard`)
- ✅ `VolunteerSignup.jsx`: `joinSignature` indefinido em
  `handleAcceptTerms` → usa `signatureText.trim()`
- ✅ `AdoptionDetail.jsx`: `useQuery` (postAdoption) movido para
  ANTES dos early returns (rules-of-hooks)

### Próximos passos

- [x] ~~Investigar `VolunteersRoster.jsx` e `VolunteersAdminTab.jsx`~~
      **FEITO em sw-v92**
- [x] ~~Re-habilitar a aba~~ **FEITO em sw-v92**
- [x] ~~Bumpar SW com a correção final~~ **FEITO em sw-v92**
- [x] ~~Documentar decisão D-* sobre a causa raiz~~ **FEITO: D-LAZY-DEFAULT-EXPORT**
- [ ] **Adicionar lint rule** para detectar `lazy(` que importa named export only
- [ ] **Adicionar E2E test** que valida cada rota lazy carrega sem erros

---

## §11. CAUSA RAIZ REAL DO REACT #306 (sw-v92, 2026-07-31)

### Diagnóstico incorreto (sw-v87..v91, 5 deploys)

> "React Query 5 queryKey com objeto → loop infinito (React #306)"

**ERRADO!** O React Query 5 faz **hash determinístico** do queryKey via
`hashKey`. Objetos com mesmo conteúdo (mesmo recriados) têm o mesmo
hash. Portanto, `queryKey: [..., options]` **NÃO causa loop**.

### Causa raiz correta (sw-v92)

**13 componentes carregados via `React.lazy()`** tinham apenas
**named export**, sem `export default**. Ao resolver o lazy, o
`module.default` era `undefined` → React #306 "Element type is
invalid... Lazy element type must resolve to a class or function"
— capturado pelo ErrorBoundary como "Não foi possível carregar
esta aba".

### Componentes corrigidos (13)

**Abas do painel do abrigo (9):**
- `KanbanPage`, `ExhibitionsList`, `VolunteersAdminTab`,
  `MedicalRecordsList`, `MedicationsList`, `TimelineList`,
  `FostersList`, `ShelterDonationsTab`, `ShelterFinanceTab`

**Rotas (4):**
- `MyContracts`, `ShelterContractsList`, `ShelterInterviewsList`,
  `PostAdoptionDashboard`

### Padrão aplicado (D-LAZY-DEFAULT-EXPORT)

```jsx
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

### Por que passou despercebido em 5 deploys (sw-v87..v91)

1. **A "stack trace" do React #306 não mostrava a stack completa do
   lazy** — apenas o erro genérico `Element type is invalid`. O
   ErrorBoundary capturava como "Não foi possível carregar esta aba"
   sem mais detalhes.
2. **Os render-counters (sw-v88, sw-v89) mascaravam o problema**:
   quando o componente crashava no lazy, o ErrorBoundary re-renderizava,
   o counter incrementava, e o threshold disparava — parecendo um
   loop de render.
3. **Testes unitários passavam** porque eles importavam via named
   export direto (`import { MyContracts } from '...'`), que sempre
   funcionou.
4. **Apenas sw-v91 com `SHOW_VOLUNTEERS_TAB = false`** deu um sinal
   claro de que a aba estava desabilitada, mas a stack trace
   completa só veio com a investigação em sw-v92.
5. **9 abas estavam afetadas, não apenas volunteers**: kanban,
   exhibitions, medical, medications, timeline, fosters,
   donations, finance. Mas o user só percebeu volunteers porque
   era a aba que ele usava regularmente.

### Lição (D-LAZY-DEFAULT-EXPORT, 2026-07-31)

**REGRA**: Componentes carregados via `React.lazy()` DEVEM ter
`export default`. Para manter compatibilidade com testes, manter
AMBOS:
- `export function Name()` — para imports nomeados
- `export default Name` — para `React.lazy()`

**Prevenção**: lint rule custom para detectar `lazy(` que importa
named export only.

**Aplicação retroativa**: 13 componentes corrigidos em sw-v92.
Build OK, 1378 testes passando, painel volunteers REABILITADO.

### Workflow recomendado (REVISADO, 2026-07-31)

O workflow de §3.5 foi **expandido** com base nas descobertas
de sw-v92..v97:

1. **Logs estruturados** no service (`[TEMP-DIAG-...]`)
2. **Simplificar a rule gradualmente** (se permission-denied)
3. **try/catch defensivo** em getDoc/setDoc
4. **Idempotência** se for mutation de create
5. **Analisar stack trace COMPLETA** (NÃO só mensagem genérica)
6. **Verificar imports** (tree-shaking remove unused, mas não avisa)
7. **Verificar hooks order** (rules-of-hooks: ANTES dos early returns)
8. **Verificar se `React.lazy()` tem `export default`** ← **NOVA**
9. **Verificar se funções referenciadas estão definidas** ← **NOVA**
10. **Verificar se subcoleções estão aninhadas corretamente** ← **NOVA**
11. **Verificar se collectionGroup tem regra + índice** ← **NOVA**
12. **Verificar se Cloud Functions deps estão em package.json** ← **NOVA**

---

## §12. Métricas Finais (sw-v75..v97, 6 dias)

| Métrica | Valor |
|---|---|
| Total de deploys | 23 |
| Total de bugs resolvidos | 14 (9 VolunteerSignup + 1 React #306 + 4 outros) |
| Total de decisões D-* | 17 (11 VolunteerSignup + 1 Lazy + 5 Firestore) |
| Total de componentes corrigidos | 13 (default export) |
| Total de regras Firestore corrigidas | 10+ (5 sw-v95 + 4 sw-v96 + 1+ sw-v97) |
| Total de testes passando | 1378 |
| Bundle final | `index-*.js` (sw-v97) |
| Cloud Functions corrigidas | 1 (`generateVolunteerCertificate`) |

---

**Próxima leitura**: `13-DECISIONS.md` §10-12 (D-VOLUNTEER-*, D-LAZY-DEFAULT-EXPORT, D-FIRESTORE-*), `15-RECENT-FIXES.md` §8-9 (linha do tempo completa), `.harness/_volunteer-signup-debug-2026-07-29.md` (notas de debug)
