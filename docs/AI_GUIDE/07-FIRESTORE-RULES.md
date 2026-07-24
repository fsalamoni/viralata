# 07-FIRESTORE-RULES.md — Firestore Security Rules

> **Atualizado em 2026-07-24** (2155 linhas, 104 match blocks)

## §1. Visão Geral

- **Total match blocks**: 104
- **Total linhas**: 2155
- **Database**: `viralata` (NÃO `(default)`)
- **Strategy**: deny by default, allow com helpers

## §2. Helpers (linhas 1-300)

### §2.1. Autenticação

```js
function isAuth() {
  return request.auth != null;
}

function isOwner(userId) {
  return isAuth() && request.auth.uid == userId;
}

function isAuthUid(uid) {
  return isAuth() && request.auth.uid == uid;
}
```

### §2.2. Plataforma

```js
function isPlatformAdmin() {
  return isAuth() &&
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.is_platform_admin == true;
}
```

### §2.3. Organização (Clube)

```js
function isClubMember(clubId) {
  return isAuth() &&
    exists(/databases/$(database)/documents/clubs/$(clubId)/members/$(request.auth.uid));
}

function isClubOwner(clubId) {
  return isClubMember(clubId) &&
    get(/databases/$(database)/documents/clubs/$(clubId)/members/$(request.auth.uid)).data.role == 'owner';
}

function isClubAdmin(clubId) {
  return isClubMember(clubId) &&
    get(/databases/$(database)/documents/clubs/$(clubId)/members/$(request.auth.uid)).data.role in ['owner', 'admin'];
}

function isClubOwnerOrAdmin(clubId) {
  return isClubOwner(clubId) || isClubAdmin(clubId);
}

function isClubVolunteer(clubId) {
  return isClubMember(clubId) &&
    get(/databases/$(database)/documents/clubs/$(clubId)/members/$(request.auth.uid)).data.role in ['owner', 'admin', 'manager', 'volunteer'];
}
```

### §2.4. Permissões granulares

```js
function hasClubPermission(clubId, perm) {
  return isClubMember(clubId) &&
    perm in get(/databases/$(database)/documents/clubs/$(clubId)/members/$(request.auth.uid)).data.permissions;
}

function canEditClubPets(clubId) {
  return isClubOwnerOrAdmin(clubId) &&
    (hasClubPermission(clubId, 'animals') || isClubOwner(clubId));
}
```

### §2.5. Pet (V3)

```js
function canManagePet(petId) {
  let pet = get(/databases/$(database)/documents/pets/$(petId)).data;
  return isAuth() && (
    isOwner(pet.owner_id) ||
    (pet.owner_type == 'organization' && canEditClubPets(pet.shelter_id))
  );
}

function canViewPet(petId) {
  return true;  // público por default
}
```

### §2.6. Contratos (V3)

```js
function isContractAdopter(contractData) {
  return isAuth() && contractData.user_uid == request.auth.uid;
}
```

### §2.7. Defesa contra cross-tenant

```js
function searchEntity(collection, docId) {
  return exists(/databases/$(database)/documents/$(collection)/$(docId));
}
```

## §3. Coleções Top-Level

### §3.1. `users/{uid}`

| Operação | Regra |
|----------|-------|
| Read | Próprio user OR platform_admin |
| Create | Próprio user apenas (no primeiro login) |
| Update | Próprio user (campos específicos) OR platform_admin |
| Delete | platform_admin apenas |

```js
match /users/{userId} {
  allow read: if isOwner(userId) || isPlatformAdmin();
  allow create: if isOwner(userId);
  allow update: if isOwner(userId) || isPlatformAdmin();
  allow delete: if isPlatformAdmin();
}
```

### §3.2. `pets/{petId}`

| Operação | Regra |
|----------|-------|
| Read | público |
| Create | canManagePet (após criar) |
| Update | canManagePet, MAS `pet_seq` é imutável |
| Delete | owner ou platform_admin |

```js
match /pets/{petId} {
  allow read: if true;
  allow create: if isAuth() &&
    request.resource.data.owner_id == request.auth.uid;
  allow update: if canManagePet(petId) &&
    request.resource.data.pet_seq == resource.data.pet_seq;  // ★ IMUTÁVEL
  allow delete: if canManagePet(petId);
}
```

**D-PET-SEQ-IMMUTABLE**: `pet_seq` é o ID PERMANENTE. NUNCA pode ser alterado.

### §3.3. `pet_seq_counter/{counterId}`

```js
match /pet_seq_counter/{counterId} {
  allow read: if isPlatformAdmin();
  allow write: if false;  // ★ Apenas Cloud Function com Admin SDK
}
```

### §3.4. `interests/{interestId}`

| Operação | Regra |
|----------|-------|
| Read | user_id (próprio) OR pet owner OR platform_admin |
| Create | user_id = auth.uid |
| Update | pet owner (status apenas) OR platform_admin |
| Delete | user_id (próprio, se status=pending) OR platform_admin |

### §3.5. `adoptions/{adoptionId}`

| Operação | Regra |
|----------|-------|
| Read | user_id (próprio) OR pet owner OR platform_admin |
| Create | Cloud Function apenas (Admin SDK) |
| Update | user_id (campos específicos) OR shelter admin OR platform_admin |
| Delete | platform_admin apenas |

### §3.6. `clubs/{clubId}`

| Operação | Regra |
|----------|-------|
| Read | público (se directory_status=='public') |
| Create | platform_admin apenas (aprovação) |
| Update | isClubOwnerOrAdmin OR platform_admin |
| Delete | platform_admin apenas |

### §3.7. `communities/{communityId}`

| Operação | Regra |
|----------|-------|
| Read | type=='public' OR member OR platform_admin |
| Create | platform_admin apenas |
| Update | owner OR platform_admin |
| Delete | platform_admin apenas |

### §3.8. `audit_logs/{logId}`

```js
match /audit_logs/{logId} {
  allow read: if isPlatformAdmin();
  allow create: if isAuth();  // qualquer ação logada
  allow update: if false;  // ★ IMUTÁVEL
  allow delete: if isPlatformAdmin();
}
```

### §3.9. `terms_acceptances/{acceptanceId}`

```js
match /terms_acceptances/{acceptanceId} {
  allow read: if isOwner(resource.data.user_uid) || isPlatformAdmin();
  allow create: if isAuth() &&
    request.resource.data.user_uid == request.auth.uid;
  allow update: if false;  // ★ IMUTÁVEL
  allow delete: if isPlatformAdmin();
}
```

## §4. Subcoleções de `pets/{petId}`

### §4.1. `pet_vet_visits/`, `pet_treatments/`, `pet_care_log/`

```js
match /pet_vet_visits/{visitId} {
  allow read: if canViewPet(petId) || canManagePet(petId);
  allow write: if canManagePet(petId);
}
```

### §4.2. `pet_devolutions/{devolutionId}`

```js
match /pet_devolutions/{devolutionId} {
  allow read: if canViewPet(petId) || canManagePet(petId);
  allow create: if canManagePet(petId) || (isAuth() && isContractAdopter(get(/databases/$(database)/documents/adoptions/$(request.resource.data.adoption_id)).data));
  allow update, delete: if canManagePet(petId);
}
```

### §4.3. `pet_audit_log/{logId}` (V3 TASK-029)

```js
match /pet_audit_log/{logId} {
  allow read: if canManagePet(petId) || isPlatformAdmin();
  allow create: if canManagePet(petId) || isAuth();  // log automático
  allow update: if false;  // ★ IMUTÁVEL
  allow delete: if isPlatformAdmin();
}
```

**D-PET-LOG-IMMUTABLE**: `pet_audit_log` é append-only.

### §4.4. `pet_notes/{noteId}` (V3 TASK-029)

```js
match /pet_notes/{noteId} {
  allow read: if canManagePet(petId) || isPlatformAdmin();
  allow create: if canManagePet(petId);
  allow update: if canManagePet(petId);
  allow delete: if (isAuth() && resource.data.author.uid == request.auth.uid) || isPlatformAdmin();
}
```

**D-PET-NOTES-AUTHOR-DELETE**: notas só autor ou platform_admin podem deletar.

## §5. Subcoleções de `clubs/{clubId}`

### §5.1. `members/{uid}`

```js
match /members/{memberUid} {
  allow read: if isAuth() && (memberUid == request.auth.uid || isClubOwnerOrAdmin(clubId) || isPlatformAdmin());
  allow create: if isClubOwnerOrAdmin(clubId) || isPlatformAdmin();
  allow update: if isClubOwnerOrAdmin(clubId) || isPlatformAdmin();
  allow delete: if isClubOwner(clubId) || isPlatformAdmin();
}
```

### §5.2. `volunteers/{volunteerUid}`

```js
match /volunteers/{volunteerUid} {
  allow read: if isClubOwnerOrAdmin(clubId) || isAuthUid(volunteerUid) || isPlatformAdmin();
  allow create: if isClubOwnerOrAdmin(clubId);
  allow update: if isClubOwnerOrAdmin(clubId);
  allow delete: if isClubOwner(clubId);
}
```

### §5.3. `volunteer_assignments/{assignmentId}` (TASK-274)

```js
match /volunteer_assignments/{assignmentId} {
  allow read: if isClubOwnerOrAdmin(clubId) || isAuthUid(resource.data.volunteer_uid) || isPlatformAdmin();
  allow write: if isClubOwnerOrAdmin(clubId);
}
```

### §5.4. `events/`, `donations/`, `mural/`, `forum/`

Padrão similar: read público (quando aplicável), write por owner/admin.

## §6. Coleções Denormalizadas (TASK-312)

### §6.1. `search_pets/`, `search_clubs/`, `search_fosters/`, `search_volunteers/`

```js
match /search_pets/{petId} {
  allow read: if true;  // público
  allow write: if false;  // ★ Apenas Cloud Function com Admin SDK
}
```

**Importante**: testes DEVEM esperar o nome da coleção denormalizada,
NÃO a original. Ex: `searchService.test.js` espera `search_fosters`.

## §7. Coleções de Sistema

### §7.1. `notifications/{notificationId}`

```js
match /notifications/{notificationId} {
  allow read: if isOwner(resource.data.user_id) || isPlatformAdmin();
  allow create: if isAuth() || isPlatformAdmin();  // Cloud Function cria
  allow update: if isOwner(resource.data.user_id);  // user marca como lida
  allow delete: if isOwner(resource.data.user_id) || isPlatformAdmin();
}
```

### §7.2. `volunteer_profile/{uid}`

```js
match /volunteer_profile/{volunteerUid} {
  allow read: if isAuth();
  allow create: if isAuthUid(volunteerUid);
  allow update: if isAuthUid(volunteerUid) || isPlatformAdmin();
  allow delete: if isPlatformAdmin();
}
```

### §7.3. `platform_settings/{settingId}`

```js
match /platform_settings/{settingId} {
  allow read: if isPlatformAdmin();
  allow write: if isPlatformAdmin();
}
```

### §7.4. `partners/{partnerId}`

```js
match /partners/{partnerId} {
  allow read: if resource.data.status == 'active' || isPlatformAdmin();
  allow create, update, delete: if isPlatformAdmin();
}
```

## §8. Princípios de Segurança

### §8.1. Defense-in-Depth

Toda escrita segue o padrão:
1. **UI**: esconde botão se user não tem permissão
2. **Hook**: valida permissão antes de chamar service
3. **Service**: re-valida com helper (ensureCanMutatePet, etc)
4. **Firestore Rules**: bloqueio final

### §8.2. Imutabilidade

- `pet_seq` (ID permanente)
- `pet_audit_log` (log de mudanças)
- `audit_logs` (log de ações admin)
- `terms_acceptances` (LGPD)

### §8.3. Cloud Functions Only

- `pet_seq_counter` — geração de pet_seq
- `search_*` (denormalização) — Cloud Function atualiza

### §8.4. LGPD

- `terms_acceptances` — aceite canônico
- Direito ao esquecimento: delete por platform_admin apenas
- PII minimizado (denormalização nunca inclui PII)

## §9. Como Testar Rules

### §9.1. Emulator

```bash
firebase emulators:start --only firestore
```

### §9.2. Testes com `@firebase/rules-unit-testing`

```js
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';

const env = await initializeTestEnvironment({
  projectId: 'demo-viralata',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
});

it('only owner can read private data', async () => {
  const alice = env.authenticatedContext('alice');
  await assertFails(alice.firestore().doc('private/x').get());
});
```

## §10. Como Adicionar Nova Coleção

1. Adicionar helper em `firestore.rules` (se necessário)
2. Adicionar `match /<collection>/{docId}` com regras
3. Adicionar `match /<collection>/{docId}/<sub>/{subDocId}` (se subcoleção)
4. Atualizar `02-DATA-MODEL.md`
5. Adicionar índice em `firestore.indexes.json` (se query composta)
6. Testar com emulator
7. Deploy: `firebase deploy --only firestore:rules`

## §11. Deploy

```bash
# Validar
firebase firestore:rules:test

# Deploy apenas rules
firebase deploy --only firestore:rules

# Deploy com índice
firebase deploy --only firestore:rules,firestore:indexes
```

---

**Próxima leitura**: `08-TESTING.md` (padrões de teste).
