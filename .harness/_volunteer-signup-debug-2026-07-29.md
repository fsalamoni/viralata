# VolunteerSignup Debug Cycle (2026-07-27..29) — sw-v75..sw-v83

## Problem
User `fsalamoni@gmail.com` (platform owner) reportou "Algo deu errado" / "Missing or insufficient permissions" no fluxo `/voluntarios/seja` passo 4 (confirmar inscrição em abrigo).

## Bug sequence (all root-caused + fixed)

### Bug #1: React error #31 (toast shadcn → sonner)
- `useToast()` retorna `sonnerToast` (NÃO shadcn)
- `toast({title, description, variant})` quebrava UI
- **FIX**: converter 9 toasts em VolunteerSignup + 6 em VolunteerProfileForm
- **D-TOAST-SONNER-API**: NUNCA `toast({...})` shape. SEMPRE `toast.success/error(msg, {description})`

### Bug #2: Permission denied — volunteer_profile create
- `setDoc({merge:true})` no primeiro write = `create` (Firestore)
- Rule `volunteer_profile create` exigia `signature_text.size() >= 2`
- Service não enviava signature_text no primeiro write
- **FIX**: adicionar `signature_text: parsed.signature_text` + `signature_hash_input` em `volunteerProfileService.js:153-161`
- **D-VOLUNTEER-SIGNATURE-FIELD**: SEMPRE incluir `signature_text` no primeiro write

### Bug #3: setDoc with invalid data (undefined)
- `VolunteerProfileForm.handleSave` enviava `radius_km: undefined`, `notes: undefined`
- Firestore rejeita undefined
- **FIX**: conditional spread para omitir campos vazios
- **D-FIRESTORE-NO-UNDEFINED**: NUNCA `undefined` em setDoc. Usar `null` ou omitir

### Bug #4: zod rejected null
- `notes: z.string().optional()` aceita `string|undefined`, NÃO `null`
- **FIX**: OMITIR do objeto (conditional spread)
- **D-ZOD-NO-NULL-OPTIONAL**: zod optional não inclui null

### Bug #5: signature_text vazio no joinShelter
- `useEffect` em VolunteerSignup auto-avança step quando `hasAcceptedTerms=true`
- User NUNCA digita no passo 1 (termo já aceito em sessão anterior)
- State local `signatureText` + sessionStorage vazios
- **FIX A (sw-v81)**: sessionStorage persistence
- **FIX B REAL (sw-v82)**: usar `profile.signature_text` do Firestore como FONTE CANÔNICA
- **D-VOLUNTEER-SIGNATURE-SOURCE**: profile.signature_text é a fonte canônica no handleSubmitJoin
- **D-VOLUNTEER-SIGN-PERSIST**: signatureText persistido em sessionStorage

### Bug #6 (EM ANÁLISE, sw-v83): Permission denied em clubs/.../volunteers create
- Rule exigia `isAppCheckVerified() && (...)` (sw-v82)
- **TEMP-DIAG-VOL (2026-07-29)**: removido `isAppCheckVerified` da rule
- **sw-v83**: rule ULTRA relaxada `isAuth() + volunteerUid == request.auth.uid` apenas + logs TEMP-DIAG-VOL no JS

## Logs TEMP-DIAG-VOL (sw-v83) — o que aparecerá no console do user

Ao confirmar inscrição no /voluntarios/seja, o user verá:

```js
[TEMP-DIAG-VOL] joinShelterAsVolunteer BEFORE setDoc {
  refPath: 'clubs/<clubId>/volunteers/<uid>',
  refId: '<uid>',
  actorUid: '<uid>',
  actorEmail: 'fsalamoni@gmail.com',
  payload: {
    shelter_club_id: '<clubId>',
    volunteer_uid: '<uid>',
    volunteer_name: 'Flavio Salamone',
    volunteer_name_type: 'string',
    volunteer_name_size: 15,
    terms_accepted_at: '2026-07-29T...',
    terms_accepted_at_type: 'string',
    terms_version: '2026-07-10-v2',
    signature_text: 'Flavio Salamone...',
    signature_text_size: 15,
    status: 'active',
    joined_at: '2026-07-29T...',
    background_check_status: 'not_required'
  },
  profileTermsAcceptedAt: '2026-07-29T...',
  profileTermsVersion: '2026-07-10-v2'
}

[TEMP-DIAG-VOL] joinShelterAsVolunteer AFTER setDoc OK
// OU
[TEMP-DIAG-VOL] joinShelterAsVolunteer setDoc FAILED {
  errMessage: '...',
  errCode: '...',
  errName: '...',
  errStack: '...',
  errCustomData: '...',
  refPath: '...',
  actorUid: '...',
  payloadKeys: [...]
}
```

## Rule deployed (sw-v83, ULTRA relaxada)

```js
match /volunteers/{volunteerUid} {
  // TEMP-DIAG-VOL (2026-07-29): regra ULTRA relaxada para isolar
  // permission-denied. Apenas isAuth() + é o próprio user. TODA
  // outra validação foi removida temporariamente.
  allow create: if isAuth() &&
    request.auth.uid == volunteerUid;
  // ... outras rules
}
```

## Next steps

1. **SE passar (sw-v83 + ULTRA relaxada)**: investigar por que isAppCheckVerified, isPlatformAdmin, isClubOwnerOrAdmin, hasClubPermission estavam falhando. Provavelmente o `get` interno dessas funções estava retornando `null` por race condition ou cache.
2. **SE falhar**: investigar cache de rules do Firebase Console, outro match, ou path mismatch.
3. **Independente**: bumpar SW para v84 quando próximo fix for deployado.

## Commits (todos os 17 deploys do ciclo)

- sw-v75: c1468a6b (toast + signature_text)
- sw-v76: 4d523efe (debug logs)
- sw-v77: 257cb873 (try/catch)
- sw-v78: d9bd9ac7 (FULL CONTEXT)
- sw-v79: 96a79810 (VolunteerProfileForm)
- sw-v80: ea415856 (zod null + restore rules)
- sw-v81: 6bfb1688 (sessionStorage)
- sw-v82: 312cc6ea (profile.signature_text)
- sw-v82.5: e9a412bb (TEMP-DIAG-VOL firestore.rules)
- sw-v83: 23690bb1 (rule ULTRA + logs)
- sw-v84: 04dbb5a4 (READ rule + getDoc try/catch)
- sw-v85: 2213e9dc (idempotente)
- sw-v86: cb41a53a (rules restauradas)
- sw-v87: f28aed4d (queryKey primitivos)
- sw-v88: 380d8625 (render counter threshold 50)
- sw-v89: d27f8d9d (render counter threshold 3)
- sw-v90: 57883f32 (aba volunteers desabilitada)
- sw-v91: 09ddef7d (constante módulo SHOW_VOLUNTEERS_TAB)

## Status atual (2026-07-31)

### O que ESTÁ funcionando (sw-v97, 2026-07-31)
- ✅ VolunteerSignup fluxo principal (termo, perfil, abrigo)
- ✅ Permission denied corrigido (signature_text + zod null + undefined)
- ✅ Idempotência (race condition resolvida)
- ✅ Toast API (React #31 corrigido)
- ✅ Defense-in-depth (3 camadas: service + try/catch + rules)
- ✅ Regras Firestore restauradas e estritas
- ✅ **React #306 RESOLVIDO** (sw-v92, 2026-07-31)
- ✅ **Painel volunteers REABILITADO** (removeu `SHOW_VOLUNTEERS_TAB`)
- ✅ 9 abas + 4 rotas do painel admin funcionando

### O que foi RESOLVIDO em sw-v92..v97 (Claude, 2026-07-31)
- ✅ **sw-v92 (commit 0ced567e)**: 13 componentes com `React.lazy()`
  tinham apenas named export → adicionado `export default` em todos.
  9 abas + 4 rotas do painel admin corrigidas.
- ✅ **sw-v93 (commit 030691b7)**: 6 crashes de runtime (Sun/Moon
  icons, isEditMode, collectionGroup), 3 rules-of-hooks
  (PetDetailV3, LegalFooter, CrossRosterSection), 2 erros de sintaxe
  (ClubForumsTab, generateEventIcsCore.test), tailwind config
  duplicado, eslint config melhorado (~190 falsos positivos
  eliminados).
- ✅ **sw-v94 (commit 5e64a7ee)**: `pdfkit` faltando em
  `functions/package.json` → adicionado (Cloud Function
  `generateVolunteerCertificate` quebraria em runtime).
- ✅ **sw-v95 (commit 3cb12127)**: 5 correções em `firestore.rules`:
  `shelterCanAccess`/`shelterCanManage` NUNCA definidas, subcoleções
  PET órfãs (6), `auth.uid` (variável inexistente), communities sem
  `communityId`, 8 collectionGroups sem regra `{path=**}`.
- ✅ **sw-v96 (commit 2472640b)**: 4 subcoleções de shelter órfãs
  (`shelter_donations`, `shelter_donation_receipts`, `shelter_ledger`,
  `shelter_ledger_categories`).
- ✅ **sw-v97 (commit 4dd8ed43)**: 4 índices `COLLECTION_GROUP`
  adicionados (volunteers, fosters, post_adoption, banners). Total
  68 índices.

### CAUSA RAIZ DO REACT #306 (DEFINITIVA, sw-v92)

O diagnóstico de sw-v87 (D-REACT-QUERY-KEY-PRIMITIVES) estava
**INCORRETO**. O React Query 5 faz hash determinístico do queryKey
via `hashKey`. Objetos com mesmo conteúdo (mesmo recriados) têm o
mesmo hash. Portanto, `queryKey: [..., options]` NÃO causa loop.

**Causa raiz real**: 13 componentes carregados via `React.lazy()`
tinham apenas **named export**, sem `export default`. Ao resolver,
`module.default` era `undefined` → React #306 "Element type is
invalid... Lazy element type must resolve to a class or function".

Ver **D-LAZY-DEFAULT-EXPORT** em `13-DECISIONS.md` §11.

### Próximos passos (2026-08-03)
- [ ] Adicionar lint rule custom para detectar `lazy()` que
      importa named export only
- [ ] Adicionar E2E test que valida cada rota lazy carrega sem
      erros
- [ ] Adicionar CI que roda `firebase firestore:rules:get
      --emulator` e falha se houver warning "Invalid
      function/variable name"
- [ ] Adicionar CI que verifica `collectionGroup()` tem regra
      `{path=**}` e índice `COLLECTION_GROUP`
