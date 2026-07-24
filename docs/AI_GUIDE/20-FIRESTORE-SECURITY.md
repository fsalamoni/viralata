# 20-FIRESTORE-SECURITY.md — Boas Práticas de Segurança Firestore

> **Atualizado em 2026-07-24**
>
> Detalhamento profundo das práticas de segurança, padrões e exemplos.

## §1. Princípios Fundamentais

### §1.1. Defense-in-Depth (4 Camadas)

```
┌─────────────────────────────────────┐
│  Camada 1: UI (esconde controles)   │
├─────────────────────────────────────┤
│  Camada 2: Hook (valida permissão)  │
├─────────────────────────────────────┤
│  Camada 3: Service (re-valida)      │
├─────────────────────────────────────┤
│  Camada 4: Rules (bloqueio final)   │
└─────────────────────────────────────┘
```

**Nunca confie só no client**. Valide em cada camada.

### §1.2. Default Deny

```js
// firestore.rules SEMPRE começa com:
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Tudo é NEGADO por default
    // Adicionar regras explícitas para cada collection
  }
}
```

### §1.3. Least Privilege

Cada user/role tem **apenas** o mínimo de permissões necessárias.
NÃO dar permissão ampla "porque é mais fácil".

### §1.4. Append-Only para Audit

- `audit_logs` — append-only (update=false)
- `pet_audit_log` — append-only
- `terms_acceptances` — append-only (LGPD)

### §1.5. Imutabilidade de Identidade

- `pet_seq` — IMUTÁVEL (D-PET-SEQ-IMMUTABLE)
- `terms_version` — IMUTÁVEL após aceite
- `created_at` — IMUTÁVEL

## §2. Helpers Essenciais

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

### §2.2. Roles

```js
function isPlatformAdmin() {
  return isAuth() &&
    exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.is_platform_admin == true;
}

function isClubMember(clubId) {
  return isAuth() &&
    exists(/databases/$(database)/documents/clubs/$(clubId)/members/$(request.auth.uid));
}

function isClubOwner(clubId) {
  return isClubMember(clubId) &&
    get(...).data.role == 'owner';
}

function isClubAdmin(clubId) {
  return isClubMember(clubId) &&
    get(...).data.role in ['owner', 'admin'];
}

function isClubOwnerOrAdmin(clubId) {
  return isClubOwner(clubId) || isClubAdmin(clubId);
}
```

### §2.3. Permissões Granulares

```js
function hasClubPermission(clubId, perm) {
  return isClubMember(clubId) &&
    perm in get(...).data.permissions;
}

function canEditClubPets(clubId) {
  return isClubOwnerOrAdmin(clubId) &&
    (hasClubPermission(clubId, 'animals') || isClubOwner(clubId));
}
```

### §2.4. Pet

```js
function canManagePet(petId) {
  let pet = get(/databases/$(database)/documents/pets/$(petId)).data;
  return isAuth() && (
    isOwner(pet.owner_id) ||
    (pet.owner_type == 'organization' && canEditClubPets(pet.shelter_id))
  );
}
```

### §2.5. Performance

```js
// Cache de chamadas (até 5 lookups por request)
function isOwnerCached(uid) {
  return isAuth() && request.auth.uid == uid;
}
```

## §3. Padrões de Rules

### §3.1. Public Read, Owner/Admin Write

```js
match /pets/{petId} {
  allow read: if true;
  allow create: if isAuth() && request.resource.data.owner_id == request.auth.uid;
  allow update: if canManagePet(petId) &&
    request.resource.data.pet_seq == resource.data.pet_seq;  // IMUTÁVEL
  allow delete: if canManagePet(petId);
}
```

### §3.2. Private (Owner Only)

```js
match /users/{userId} {
  allow read: if isOwner(userId) || isPlatformAdmin();
  allow create: if isOwner(userId);
  allow update: if isOwner(userId) || isPlatformAdmin();
  allow delete: if isPlatformAdmin();
}
```

### §3.3. Append-Only Audit

```js
match /audit_logs/{logId} {
  allow read: if isPlatformAdmin();
  allow create: if isAuth();
  allow update: if false;  // IMUTÁVEL
  allow delete: if isPlatformAdmin();
}
```

### §3.4. Cloud Function Only

```js
match /pet_seq_counter/{counterId} {
  allow read: if isPlatformAdmin();
  allow write: if false;  // APENAS Cloud Function com Admin SDK
}
```

### §3.5. Denormalized Search Index

```js
match /search_pets/{petId} {
  allow read: if true;
  allow write: if false;  // APENAS Cloud Function
}
```

### §3.6. Author-Only Delete

```js
match /pet_notes/{noteId} {
  allow read: if canManagePet(petId) || isPlatformAdmin();
  allow create: if canManagePet(petId);
  allow update: if canManagePet(petId);
  allow delete: if (isAuth() && resource.data.author.uid == request.auth.uid) || isPlatformAdmin();
}
```

## §4. Validação de Input

### §4.1. Tipos de dados

```js
allow create: if request.resource.data.name is string &&
  request.resource.data.name.size() >= 2 &&
  request.resource.data.name.size() <= 50;
```

### §4.2. Enums

```js
allow create: if request.resource.data.species in ['dog', 'cat', 'other'];
```

### §4.3. Required fields

```js
allow create: if request.resource.data.keys().hasAll(['name', 'species', 'gender', 'size']);
```

### §4.4. No extra fields

```js
allow create: if request.resource.data.keys().hasOnly(['name', 'species', 'gender', 'size', 'created_at']);
```

### §4.5. Email validation

```js
allow create: if request.resource.data.email.matches('^[^@]+@[^@]+\\.[^@]+$');
```

## §5. Cross-Tenant Protection

### §5.1. Tenant Isolation

```js
// ONG 1 não pode ver pets de ONG 2
function isSameTenant(clubId) {
  return isAuth() && request.auth.token.club_id == clubId;  // custom claim
}
```

### §5.2. Search Entity Helper

```js
// Prevenir que user force URL com outro tenant
function searchEntity(collection, docId) {
  return exists(/databases/$(database)/documents/$(collection)/$(docId));
}
```

### §5.3. Service-Level Filter

```js
// service/searchService.js
export async function searchFosters(clubId) {
  if (!db || !clubId) return [];
  const q = query(
    collection(db, 'clubs', clubId, 'search_fosters'),
    where('is_active', '==', true)
  );
  // Firestore Rules ainda bloqueiam acesso cross-tenant
}
```

## §6. LGPD (Lei Geral de Proteção de Dados)

### §6.1. Aceite Canônico

```typescript
// terms_acceptances/{acceptanceId}
{
  user_uid: string,
  terms_type: 'general' | 'privacy' | 'conduct' | ...,
  terms_version: string,  // ex: '2026-07-10-v2'
  document_hash: string,  // SHA-256
  signature_text: string,
  ip_address: string,
  user_agent: string,
  liveness_verified: boolean,
  legal_basis: string,  // 'LGPD Art. 7º I'
  accepted_at: timestamp,
}
```

**Regras**: append-only (imutável).

### §6.2. Direito ao Esquecimento

- User pode pedir deleção de conta
- Platform admin deleta via `firestore.deleteDocument`
- Log de deleção fica em `audit_logs` (mesmo após user deletado)

### §6.3. PII Minimizado

- Coleções denormalizadas (`search_*`) NUNCA contêm PII
- Apenas dados públicos (nome, foto, cidade)
- LGPD-compliant por design

### §6.4. Consent Explícito

- Cookies: banner de opt-in
- Push (FCM): opt-in separado
- Compartilhamento: opt-in por ação

## §7. Service-Level Security

### §7.1. ensureCanMutatePet

```js
// src/modules/pets/services/petPermissions.js
export async function ensureCanMutatePet(petId, actor) {
  if (!db) throw new Error('Firestore not available');
  
  const snap = await getDoc(doc(db, 'pets', petId));
  if (!snap.exists()) throw new Error('Pet not found');
  
  const pet = snap.data();
  const isOwner = pet.owner_id === actor.uid;
  const isOrgAdmin = pet.owner_type === 'organization' && 
    await checkOrgPermission(pet.shelter_id, actor.uid, 'animals');
  const isPlatformAdmin = actor.isPlatformAdmin;
  
  if (!isOwner && !isOrgAdmin && !isPlatformAdmin) {
    throw new Error('Permission denied: cannot mutate pet');
  }
}
```

### §7.2. Audit Logging

```js
// src/core/services/auditService.js
export async function createAuditLog({ action, actor, details }) {
  if (!db) return;
  await addDoc(collection(db, 'audit_logs'), {
    action,
    actor: { uid: actor.uid, email: actor.email },
    details,
    created_at: serverTimestamp(),
  });
}
```

### §7.3. Input Validation (Zod)

```js
// src/modules/pets/domain/petSchema.js
import { z } from 'zod';

export const createPetSchema = z.object({
  name: z.string().min(2).max(50),
  species: z.enum(['dog', 'cat', 'other']),
  gender: z.enum(['male', 'female', 'unknown']),
  size: z.enum(['small', 'medium', 'large', 'extra-large']),
  city: z.string().min(2),
  state: z.string().length(2),
  owner_id: z.string().min(1),
});

// Validação
const result = createPetSchema.safeParse(input);
if (!result.success) {
  throw new Error(result.error.errors[0].message);
}
```

## §8. Cloud Functions

### §8.1. Funções server-side

```js
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.getNextPetSeq = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error('Unauthenticated');
  
  const counterRef = admin.firestore().doc('pet_seq_counter/global');
  const result = await counterRef.get();
  const current = result.exists ? result.data().current_value : 0;
  const next = current + 1;
  
  await counterRef.set({ current_value: next, updated_at: Date.now() });
  return next;
});
```

### §8.2. Triggers

```js
exports.onPetCreated = functions.firestore
  .document('pets/{petId}')
  .onCreate(async (snap, context) => {
    const pet = snap.data();
    // Log automático
    await admin.firestore().collection('audit_logs').add({
      action: 'pet_created',
      pet_id: context.params.petId,
      actor: pet.created_by,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    // Denormalizar para search
    await admin.firestore().collection('search_pets').doc(context.params.petId).set({
      name_lower: pet.name.toLowerCase(),
      species: pet.species,
      city: pet.city,
      // ...
    });
  });
```

## §9. Índices

### §9.1. Compostos

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "pets",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### §9.2. Single-field

Auto-criados pelo Firestore.

## §10. Auditoria e Testes

### §10.1. Testar Rules com Emulator

```bash
firebase emulators:start --only firestore
```

```js
// __tests__/firestore-rules.test.js
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const env = await initializeTestEnvironment({
  projectId: 'demo-viralata',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') },
});

it('user can read public pet', async () => {
  const ctx = env.unauthenticatedContext();
  await assertSucceeds(ctx.firestore().doc('pets/p1').get());
});

it('user cannot update pet_seq', async () => {
  const ctx = env.authenticatedContext('user1');
  await assertFails(
    ctx.firestore().doc('pets/p1').update({ pet_seq: 999 })
  );
});
```

### §10.2. Validar com Script

```bash
firebase firestore:rules:test
```

## §11. Checklist de Segurança

Antes de deployar nova rule:

- [ ] Testada com emulator
- [ ] `firebase firestore:rules:test` passa
- [ ] Nenhuma regra `allow *` (default deny)
- [ ] Read é público APENAS se apropriado
- [ ] Write/update valida permissão específica
- [ ] Append-only para audit logs
- [ ] Imutabilidade de campos identidade
- [ ] Custom claims para cross-tenant
- [ ] Helpers em vez de lógica inline

## §12. Quando Pedir Review

Pedir review de security antes de:
- Adicionar nova collection
- Mudar helper
- Adicionar `allow write: if true` (NUNCA!)
- Adicionar custom claim
- Mudar schema
- Deploy de rules

## §13. Recursos Externos

- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules Language](https://firebase.google.com/docs/rules/rules-language)
- [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [LGPD](https://www.gov.br/cidadania/pt-br/acesso-a-informacao/lgpd)

---

**Próxima leitura**: `07-FIRESTORE-RULES.md` (rules atuais)
