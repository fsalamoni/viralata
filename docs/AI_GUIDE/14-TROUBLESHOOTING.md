# 14-TROUBLESHOOTING.md — Problemas Comuns e Fixes

> **Atualizado em 2026-07-31** (sw-v75..v91)

## §1. PWA

### §1.1. "Bundle deployed mas user vê bundle antigo"

**Sintoma**: feature está funcionando em produção, mas alguns users
relatam que não funciona.

**Causas**:
1. SW vN-1 cacheado, user não recarregou
2. Bundle deployed é vN, mas SW está servindo vN-1
3. Cache do browser (Service Worker + Cache Storage)

**Diagnóstico**:
```bash
# Verificar SW deployed
curl -m 10 -s https://viralata.web.app/sw-v73.js | head -3

# Verificar bundle deployed
curl -m 10 -s https://viralata.web.app/ | grep -oE '"/assets/index[^"]+"' | head -3

# Verificar feature no bundle
curl -m 10 -s https://viralata.web.app/assets/index-DKT4N-aG.js | grep -c "pwa-stale-last-activity"
```

**Fix**:
1. Pedir user para hard reload (Ctrl+Shift+R)
2. Ou aguardar 24h (browser auto-update)
3. Ou enviar push de atualização

**Prevenção**: ver `D-FUTURE-PWA-DEPLOY-CHECKLIST` em `13-DECISIONS.md`.

### §1.2. "Reload automático interrompe user"

**Sintoma**: user clica em botão, página recarrega, perde contexto.

**Causa**: `window.location.reload()` durante interação.

**Fix**: usar `unregisterStaleAndMaybeReload` com track activity.
Ver `06-PWA-CACHE.md` §3.

**Prevenção**: `D-PWA-STALE-UNREGISTER-DEFER` em `13-DECISIONS.md`.

### §1.3. "<X> is not defined" em produção"

**Sintoma**: erro de variável não definida em produção mas não em dev.

**Causa**: tree shaking + globals no Vite. Build não pegou import.

**Diagnóstico**:
```bash
node scripts/validate-lucide-imports.mjs
```

**Fix**: adicionar ao import explícito.

**Exemplo real**: `MessageSquare is not defined` (sw-v72.5).

**Prevenção**: `D-PET-OPS-LUCIDE-IMPORT` em `13-DECISIONS.md`.

## §2. Build

### §2.1. "Build fails com import error"

**Sintoma**: `npx vite build` falha com erro de import.

**Causas comuns**:
1. Path errado (typo)
2. Componente não existe
3. Export default vs named export

**Diagnóstico**:
```bash
# Verificar arquivo existe
ls src/components/MyComponent.jsx

# Verificar exports
grep "export" src/components/MyComponent.jsx
```

**Fix**:
```jsx
// Se componente tem `export default`:
import MyComponent from './MyComponent';

// Se componente tem `export const MyComponent`:
import { MyComponent } from './MyComponent';
```

### §2.2. "Bundle muito grande"

**Sintoma**: vendor chunk > 2MB.

**Causas comuns**:
1. Framer Motion em todos os lugares
2. Moment.js (substituir por date-fns)
3. Lodash completo (usar lodash-es)

**Diagnóstico**:
```bash
# Bundle analyzer
npx vite-bundle-visualizer
```

**Fix**: ver `01-ARCHITECTURE.md` §10.

## §3. Tests

### §3.1. "Tests failing com 'X is not a function'"

**Causa comum**: mock mal feito.

**Diagnóstico**:
```js
// Verificar se mock está exportando corretamente
vi.mock('./myService', () => ({
  myFunction: vi.fn(),  // ← existe?
}));
```

### §3.2. "Tests passando local mas falhando em CI"

**Causas comuns**:
1. Timezone diferente
2. Date.now() em mock
3. File path (Windows vs Linux)

**Fix**:
```js
// Usar vitest fake timers
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-07-22'));
```

### §3.3. "Runtime test falha com 'ReferenceError: X is not defined'"

**Causa**: variável usada mas não declarada em escopo.

**Fix**:
1. Adicionar variável em escopo
2. Ou mockar (se for hook)
3. Runtime test é OBRIGATÓRIO para componentes críticos
   (`D-PET-DETAIL-RUNTIME-TEST`)

**Exemplo real**: `canEdit` → `canEditHistory` (sw-v73.3).

### §3.4. "Test espera 'fosters' mas coleção é 'search_fosters'"

**Causa**: TASK-312 introduziu coleção denormalizada, teste não foi
atualizado.

**Fix**:
```js
// ❌ Errado
expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'fosters');

// ✅ Correto
expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'search_fosters');
```

**Prevenção**: `D-TEST-COLLECTION-EXPECTATION`.

## §4. Firestore

### §4.1. "Permission denied"

**Sintoma**: `Missing or insufficient permissions`.

**Causas comuns**:
1. Rules não deployadas
2. Helper com erro
3. Document path errado

**Diagnóstico**:
```bash
# Verificar rules deployed
firebase firestore:rules:get

# Testar local
firebase emulators:start --only firestore
```

**Fix**:
1. Deploy: `firebase deploy --only firestore:rules`
2. Verificar helper em `firestore.rules` (linha 1-300)

### §4.2. "Read fails com 'unavailable'"

**Causa**: offline ou Firestore indisponível.

**Fix**: implementar retry com backoff em hooks.

### §4.3. "Write succeeds mas read retorna null"

**Causa**: cache do Firestore client.

**Fix**:
```js
import { getDocFromServer } from 'firebase/firestore';
// Usar getDocFromServer em vez de getDoc para bypass cache
```

### §4.4. "Permission denied persiste mesmo com rule relaxada"

**Sintoma**: `Missing or insufficient permissions` mesmo após
`firestore.rules` ter sido deployada com rule simples.

**Causa (sw-v82..v84)**: a falha pode ser no **READ** (getDoc) e não
no **WRITE** (setDoc). A stack trace mostra `getDoc` falhando com
403 ANTES do setDoc, throw genérico "Voluntário já está na rostagem"
aparece (D-DEBUG-FIRESTORE-RULES-LEVEL-2).

**Diagnóstico (workflow em 4 níveis)**:
1. **Nível 1**: Simplificar a rule de CREATE
   ```js
   // De
   allow create: if isAuth() && isAppCheckVerified() && (isPlatformAdmin() || ...);
   // Para
   allow create: if isAuth() && isOwner(userId);
   ```

2. **Nível 2**: Se persiste, simplificar READ também
   ```js
   // De
   allow read: if isAuth() && (isPlatformAdmin() || isClubOwnerOrAdmin(...) || ...);
   // Para
   allow read: if isAuth();
   ```

3. **Nível 3**: Se persiste, verificar se getDoc ANTES do setDoc é o
   problema. Adicionar try/catch defensivo:
   ```js
   let existing = null;
   try {
     const existingSnap = await getDoc(ref);
     existing = existingSnap.exists() ? existingSnap : null;
   } catch (readErr) {
     if (readErr?.code === 'permission-denied') {
       existing = null;  // assume doc não existe
     } else {
       throw readErr;
     }
   }
   ```

4. **Nível 4**: Se persiste, verificar se é race condition (doc foi
   criado em tentativa anterior). Tratar como IDEMPOTENTE:
   ```js
   if (existing) {
     return { id: existing.id, ...existing.data(), _alreadyExisted: true };
   }
   ```

**Fix Final (defense-in-depth)**:
- Service: idempotente + try/catch defensivo
- Rules: estritas (defense final)
- 3 camadas juntas: usuário nunca vê erro genérico

### §4.5. "setDoc called with invalid data. Unsupported field value: undefined"

**Sintoma (sw-v80)**: erro do Firestore ao enviar `undefined` em campo
opcional.

**Causa**: Firestore rejeita `undefined` em setDoc.

**Fix**: omitir campos vazios via conditional spread
(D-FIRESTORE-NO-UNDEFINED):
```js
// ❌ Errado
await setDoc(ref, { radius_km: undefined, notes: undefined });

// ✅ Correto
await setDoc(ref, {
  ...(radiusKm !== '' ? { radius_km: Number(radiusKm) } : {}),
  ...(notes.trim() ? { notes: notes.trim() } : {}),
});
```

### §4.6. "First write treated as create, missing signature_text"

**Sintoma (sw-v75)**: `Permission denied` no primeiro write de
`volunteer_profile/main` (mesmo com rule create simples).

**Causa**: `setDoc({merge: true})` no primeiro write é interpretado
como `create`. Rules de `create` aplicam (incluindo
`signature_text.size() >= 2`).

**Fix** (D-FIRESTORE-CREATE-VALIDATION + D-VOLUNTEER-SIGNATURE-FIELD):
SEMPRE incluir TODOS os campos obrigatórios da rule de `create`:
```js
await setDoc(ref, {
  terms_accepted_at: now,
  terms_version: parsed.terms_version,
  document_hash,
  signature_text: parsed.signature_text,  // ★ OBRIGATÓRIO
  signature_hash_input: `${s}|${v}|${now}`,  // audit trail
  updated_at: serverTimestamp(),
}, { merge: true });
```

## §5. Auth

### §5.1. "User não consegue logar"

**Causas comuns**:
1. Cookies bloqueados
2. Popup blocker
3. OAuth credentials inválidas

**Diagnóstico**:
```js
// Console
import { getAuth } from 'firebase/auth';
console.log(getAuth().currentUser);
```

**Fix**:
1. Verificar `firebase.js` config
2. Verificar Authorized domains (Firebase Console → Auth)

### §5.2. "Profile não carrega"

**Causa**: documento `users/{uid}` não existe.

**Fix**: criar documento no primeiro login (via `onAuthStateChanged`).

## §6. CI/CD

### §6.1. "GitHub Actions failing"

**Diagnóstico**:
```bash
# Ver logs
gh run view <run-id> --log
```

**Causas comuns**:
1. Tests failing
2. Lint failing
3. Build failing
4. Secrets missing

### §6.2. "Deploy failing"

**Causas comuns**:
1. `firebaseServiceAccount` secret missing
2. Quota exceeded
3. Build artifact > limite

**Fix**:
1. Verificar secrets (Settings → Secrets)
2. Verificar quota (Firebase Console)

## §7. UI

### §7.1. "Página em branco"

**Causas comuns**:
1. Erro de import (build OK, runtime fail)
2. ErrorBoundary triggered
3. Route guard bloqueando

**Diagnóstico**:
```js
// Console
window.addEventListener('error', (e) => console.error(e));
window.addEventListener('unhandledrejection', (e) => console.error(e));
```

**Fix**:
1. Ver console errors
2. Ver `ErrorBoundary` message

### §7.2. "Layout quebrado em mobile"

**Causa**: CSS não responsivo.

**Fix**:
- Usar `md:`, `lg:` prefix para breakpoints
- Testar em `DevTools → Toggle device toolbar`

### §7.3. "Imagem não carrega"

**Causas comuns**:
1. URL inválida
2. CORS
3. Storage rules bloqueando

**Fix**:
1. Verificar URL (404?)
2. Verificar Storage rules

## §8. SCRUM

### §8.1. "SCRUM_TASKS.json inconsistente"

**Sintoma**: `node .harness/sync.cjs --check` reporta inconsistências.

**Fix**:
```bash
# Auto-sync
node .harness/sync.cjs --fix

# Verificar novamente
node .harness/sync.cjs --check
```

**Prevenção**: REGRA A — rodar `--fix` após cada merge.

## §9. Performance

### §9.1. "Página lenta"

**Causas comuns**:
1. Muitas subscriptions realtime
2. Bundle grande
3. Imagens não otimizadas
4. N+1 queries

**Diagnóstico**:
- DevTools → Performance
- Firebase Console → Usage

**Fix**:
1. Lazy load
2. Code split
3. Image optimization
4. Pagination

## §10. Quando Tudo Mais Falha

1. **Verificar `15-RECENT-FIXES.md`** — fix recente pode ter introduzido
2. **Verificar `13-DECISIONS.md`** — decisão similar pode dar contexto
3. **Verificar git log** — `git log --oneline -20` para mudanças recentes
4. **Reverter** — `git revert HEAD` se for culpa de merge recente
5. **Perguntar ao usuário** — explicitamente, com contexto

---

## §11. React Query (sw-v87)

### §11.1. "React error #306 (Maximum update depth exceeded) em componente com useQuery"

**Sintoma**: React error #306 + TabErrorBoundary captura. Stack mostra:
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
[volta para onSubscribe]              ← LOOP INFINITO
```

**Causa (sw-v87)**: `useQuery` com `queryKey` que tem OBJETO criado a
cada render. React Query compara `queryKey` por **REFERÊNCIA** de
objeto. Vê que mudou → refetch → re-render → loop.

```js
// ❌ Errado (LOOP INFINITO)
const { data } = useQuery({
  queryKey: ['volunteers', clubId, options],  // options é objeto
  queryFn: () => listVolunteers(clubId, options),
});
```

**Diagnóstico**:
```bash
# Procurar TODOS os hooks com queryKey usando objeto
grep -rn "queryKey:.*\boptions\b" src/ --include="*.jsx" --include="*.js"
```

**Fix** (D-REACT-QUERY-KEY-PRIMITIVES): SEMPRE extrair primitivos
de `options` e usar `?? null` para nullables:
```js
// ✅ Correto
const { status, maxResults } = options;
const { data } = useQuery({
  queryKey: ['volunteers', clubId, status ?? null, maxResults ?? 200],
  queryFn: () => listVolunteers(clubId, options),
});
```

**Aplicação preventiva**: rodar o grep acima em TODOS os hooks do
projeto. sw-v87 corrigiu 10 hooks:
- useShelterVolunteers, useUserVolunteerRosters
- useVolunteerAssignments, useParticipations
- useApplications, useExhibitions, useFosters
- useMedicalRecords, useMedications, usePetPhotos

### §11.2. "Render counter threshold não captura o loop"

**Sintoma**: React #306 dispara ANTES do `if (renderCount > 3) throw`.

**Causa**: Loops síncronos disparam #306 mais rápido que o threshold.

**Diagnóstico**: o loop é tão rápido que React captura antes do
counter atualizar. Stack trace mostra `MessagePort` (scheduler async)
mas o setState loop é síncrono.

**Fix alternativo**: desabilitar o componente como teste de
isolamento (D-MODULE-LEVEL-CONSTANTS-NO-TREE-SHAKE):
```js
// No escopo do MÓDULO (não inline, evita tree-shaking)
const SHOW_VOLUNTEERS_TAB = false;

// Na render
{SHOW_VOLUNTEERS_TAB && activeGroupKey === 'people' && ...}
```

Se o erro PARAR com aba desabilitada: bug é específico do componente.
Se PERSISTIR: bug é em outro lugar (provider, query global).

### §11.3. "useState com initial object é instável a cada render"

**Sintoma (sw-v82)**: `useState({ volunteerUid: null })` parece OK,
mas na verdade o initializer é chamado a cada render (embora o
state em si só mude quando setState é chamado). React Query
queryKey dependente de filter (que vem do state) pode disparar
re-fetch em loop.

**Fix**: extrair primitivos do state, usar no queryKey:
```js
const [filter, setFilter] = useState({ volunteerUid: null });
const { volunteerUid } = filter;  // extrair
const { data } = useQuery({
  queryKey: ['list', clubId, volunteerUid ?? null],  // primitivo
  queryFn: () => list(clubId, filter),
});
```

---

**Próxima leitura**: `15-RECENT-FIXES.md` §8 (linha do tempo completa do ciclo VolunteerSignup).
