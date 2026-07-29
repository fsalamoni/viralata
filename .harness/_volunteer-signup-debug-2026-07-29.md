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

## Commits
- sw-v75: c1468a6b
- sw-v76: 4d523efe
- sw-v77: 257cb873
- sw-v78: d9bd9ac7
- sw-v79: 96a79810
- sw-v80: ea415856
- sw-v81: 6bfb1688
- sw-v82: 312cc6ea
- sw-v82.5: e9a412bb (TEMP-DIAG-VOL firestore.rules)
- sw-v83: 23690bb1 (rule ULTRA + logs)
