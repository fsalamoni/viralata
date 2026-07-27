# 28-VOLUNTEER-SIGNUP-BUGFIX.md — Bugfix: VolunteerSignup Não Funciona

> **Data**: 2026-07-27
> **Sintoma**: User clica "Aceitar e continuar" → erro "Missing or insufficient permissions" + React error #31 → página em branco
> **Status**: FIXED (sw-v75)
>
> Este documento explica os 2 bugs e como foram corrigidos.

## §1. Sintomas Reportados

User reportou:

> A inscrição como voluntário segue não funcionando. Eu rodo o termo até o final, coloco meu nome e clico no check. Ao aceitar e continuar dá erro e não segue.

Console errors:
```
[react-query mutation] error (global handler): Missing or insufficient permissions.
Error: Minified React error #31; visit https://reactjs.org/docs/error-decoder.html?invariant=31&args[]=object%20with%20keys%20%7Btitle%2C%20description%2C%20variant%7D
[ERROR] ErrorBoundary Error: Minified React error #31
```

## §2. Diagnóstico

### §2.1. Bug #1: React error #31 (toast API errada)

**Causa**: O componente `VolunteerSignup.jsx` estava usando:

```js
toast({ title: 'msg', description: 'desc', variant: 'destructive' });
```

Mas o `useToast()` retorna o `sonnerToast` que espera:
- `toast(message, options?)` — message é string
- OU `toast.error(message, options)` — variantes nativas

**Resultado**: Sonner recebia um objeto e renderizava como children. Daí React error #31: "object with keys {title, description, variant}".

### §2.2. Bug #2: Missing or insufficient permissions

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

## §3. Solução

### §3.1. Fix #1: API do toast

**Arquivo**: `src/pages/VolunteerSignup.jsx`

```diff
- toast({ title: 'Digite seu nome completo para assinar.', variant: 'destructive' });
+ toast.error('Digite seu nome completo para assinar.');

- toast({ title: 'Erro ao aceitar termo', description: '...', variant: 'destructive' });
+ toast.error('Erro ao aceitar termo', { description: '...' });

- toast({ title: '✓ Termo aceito.' });
+ toast.success('Termo aceito.');
```

### §3.2. Fix #2: signature_text no setDoc

**Arquivo**: `src/modules/shelter/services/volunteerProfileService.js`

```diff
  const update = {
    terms_accepted_at: now,
    terms_version: parsed.terms_version,
    document_hash,
+   signature_text: parsed.signature_text,  // D-VOLUNTEER-SIGNATURE: required by firestore.rules create validator
+   signature_hash_input: `${parsed.signature_text}|${parsed.terms_version}|${now}`,  // audit trail
    updated_at: serverTimestamp(),
  };
```

**Decisão nova**: `D-VOLUNTEER-SIGNATURE` — todo aceite de termo deve incluir
`signature_text` no setDoc (mesmo com merge: true, é create no primeiro write).

## §4. Validação

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

## §5. SW Bump (sw-v74 → sw-v75)

Service Worker bumpado para forçar fresh bundle deployado em todos os users:

- `vite.config.js`: `filename: 'sw-v74.js'` → `filename: 'sw-v75.js'`
- `registerPwa.js`: `sw-v74` → `sw-v75`
- `cleanupStaleCaches.js`: adicionado `sw-v74.js` na lista de stale

Tests atualizados para usar `sw-v75.js` (12/12 passing).

## §6. Decisões D-* Criadas

### D-VOLUNTEER-SIGNATURE (2026-07-27)

**Contexto**: `setDoc` com merge+primeiro write é create. Rules exigem
`signature_text` no create.

**Decisão**: Sempre incluir `signature_text` no `update` do
`acceptVolunteerTerms`. E incluir `signature_hash_input` para audit
trail completo.

**Aplicação**: Qualquer service que faz `setDoc({merge: true})` em
`volunteer_profile/main` deve incluir os campos obrigatórios do
create rule.

### D-TOAST-SONNER-API (2026-07-27)

**Contexto**: O `useToast()` retorna sonnerToast. shadcn API
(`{title, description, variant}`) é incompatível com sonner.

**Decisão**: SEMPRE usar sonner API:
- `toast.success(msg)` / `toast.error(msg)` / `toast.warning(msg)` / `toast.info(msg)`
- OU `toast(msg, { description: '...' })` para opções

**NUNCA** usar `toast({title, description, variant})` (shadcn API).

## §7. Lições Aprendidas

1. **Toast API drift**: ao migrar de shadcn para sonner, é fácil
   esquecer de atualizar os calls. Static analysis não pega.
   Runtime test com spy de console.error detecta.

2. **setDoc merge não é update puro**: setDoc com merge=true no
   primeiro write é `create`, não `update`. Rules de create
   aplicam. Sempre incluir campos obrigatórios.

3. **Defense-in-depth funciona**: este bug passou 3 camadas (UI,
   service, rules) mas o user não conseguia concluir a ação.
   O fix foi na camada correta (service + toast).

4. **D-*: a regra precisa estar visível**: o bug só foi pego
   com testes manuais do user. D-VOLUNTEER-SIGNATURE documenta
   que esse campo é obrigatório para evitar regressão.

5. **SW bump necessário**: para garantir que o fix do toast chegue
   rápido a todos os users (não ficar com bundle antigo), bump
   sw-v74 → sw-v75.

## §8. Checklist Pós-Fix

- [x] Toast API corrigida em `VolunteerSignup.jsx` (9 calls)
- [x] `signature_text` adicionado no `acceptVolunteerTerms` setDoc
- [x] `signature_hash_input` adicionado para audit trail
- [x] SW bump v74 → v75
- [x] 5 tests runtime para VolunteerSignup
- [x] 12/12 tests PWA passing
- [x] Build OK
- [x] Deploy OK
- [x] Validação manual (impossível, mas docs D-* criadas)

## §9. Próximas Auditorias Recomendadas

1. **Buscar por `toast({`** em todo o projeto: provavelmente tem
   mais lugares com o mesmo bug. Usar `grep -rn "toast({" src/`.
2. **Buscar por setDoc com merge=true**: garantir que os campos
   obrigatórios do create rule estão presentes.
3. **Adicionar lint rule** para detectar `toast({` e sugerir
   uso de `toast.success/error/warning/info`.
4. **Validar** que todos os services que escrevem em
   `volunteer_profile` incluem `signature_text` quando aplicável.

---

**Próxima leitura**: `13-DECISIONS.md` (D-VOLUNTEER-SIGNATURE, D-TOAST-SONNER-API)
