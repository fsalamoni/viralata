# 02-DATA-MODEL.md — Modelo de Dados (Firestore)

> **Atualizado em 2026-07-24** (revisão pós-varredura)

## §1. Database

- **Nome**: `viralata` (NÃO `(default)`)
- **Project**: `viralata-4cf0b`
- **Região**: `southamerica-east1`

## §2. Coleções Top-Level

### §2.1. `users/{uid}`

Documento do usuário. Criado no primeiro login.

```typescript
{
  uid: string,
  email: string,
  display_name: string,
  photo_url: string?,
  phone: string?,
  full_name: string?,
  bio: string?,
  city: string?,
  state: string?,
  birth_date: timestamp?,
  terms_accepted: boolean,
  terms_accepted_at: timestamp?,
  privacy_accepted: boolean,
  privacy_accepted_at: timestamp?,
  code_of_conduct_accepted: boolean,
  code_of_conduct_accepted_at: timestamp?,
  is_profile_complete: boolean,
  is_platform_admin: boolean,
  ui_preferences: object?,
  fcm_tokens: string[],
  created_at: timestamp,
  updated_at: timestamp,
}
```

**Regras**:
- Read: próprio user + platform_admin
- Update: próprio user (campos específicos)
- Delete: platform_admin apenas

### §2.2. `pets/{petId}`

Documento do pet.

```typescript
{
  // Identidade
  id: string,  // = documentId
  pet_seq: number,  // ★ IMUTÁVEL — ID permanente (1, 2, 3, ...)
  name: string,
  species: 'dog' | 'cat' | 'other',
  breed: string?,
  gender: 'male' | 'female' | 'unknown',
  size: 'small' | 'medium' | 'large' | 'extra-large',
  weight_kg: number?,
  age_years: number?,
  age_months: number?,
  birth_date: timestamp?,
  
  // Saúde
  is_vaccinated: boolean,
  is_neutered: boolean,
  is_dewormed: boolean,
  health_notes: string?,
  
  // Comportamento
  temperament: string[],  // ['calm', 'playful', 'shy']
  good_with_kids: boolean,
  good_with_dogs: boolean,
  good_with_cats: boolean,
  energy_level: 'low' | 'medium' | 'high',
  
  // Localização
  city: string,
  state: string,
  location: geopoint?,
  shelter_address: string?,
  
  // Ownership
  owner_id: string,  // uid do dono OU clubId
  owner_type: 'user' | 'organization',
  shelter_id: string?,  // se owner_type=organization
  
  // Status
  status: 'available' | 'pending' | 'adopted' | 'unavailable' | 'removed',
  adoption_interest_count: number,
  
  // Mídia
  photo_url: string,  // foto principal
  photo_urls: string[],  // galeria
  video_url: string?,
  
  // Metadados
  description: string?,
  adoption_fee: number?,  // em BRL
  tags: string[],
  featured: boolean,
  urgent: boolean,
  
  // Audit
  created_at: timestamp,
  updated_at: timestamp,
  created_by: string,  // uid
  updated_by: string,  // uid
}
```

**Subcoleções** (ver §3):
- `pet_vet_visits/{visitId}`
- `pet_treatments/{treatmentId}`
- `pet_care_log/{entryId}`
- `pet_devolutions/{devolutionId}`
- `pet_adopters_history/{historyId}`
- `pet_audit_log/{logId}` (imutável)
- `pet_notes/{noteId}`

**Regras**:
- Read: público
- Create/Update: owner ou org admin com permissão
- Delete: owner ou platform_admin

### §2.3. `pet_seq_counter/{counterId}`

Contador atômico para gerar `pet_seq` (V3 TASK-029).

```typescript
{
  counter_id: 'global',
  current_value: number,
  updated_at: timestamp,
}
```

**Regras**:
- Read: platform_admin apenas
- Write: platform_admin (via Cloud Function)
- Update por client: **BLOQUEADO** (somente Cloud Function com Admin SDK)

### §2.4. `interests/{interestId}`

Interesse de adoção de um user em um pet.

```typescript
{
  id: string,
  pet_id: string,
  pet_seq: number,  // denormalizado
  user_id: string,
  user_name: string,
  user_email: string,
  user_phone: string?,
  user_city: string?,
  
  // Compatibilidade (do questionário)
  compatibility: {
    housing: 'apartment' | 'house' | 'farm',
    has_yard: boolean,
    has_kids: boolean,
    kids_ages: number[],
    has_other_pets: boolean,
    other_pets: string[],
    routine: 'home' | 'commute' | 'travel',
    budget: 'low' | 'medium' | 'high',
    experience: 'first' | 'some' | 'experienced',
  },
  
  // Mensagem
  message: string?,
  
  // Status
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn',
  reviewed_at: timestamp?,
  reviewed_by: string?,
  review_notes: string?,
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

### §2.5. `adoptions/{adoptionId}`

Adoção concluída.

```typescript
{
  id: string,
  pet_id: string,
  pet_seq: number,
  user_id: string,
  shelter_id: string?,  // se pet era de ONG
  
  // Snapshot do pet (imutável)
  pet_snapshot: object,
  
  // Snapshot do adotante
  adopter_snapshot: object,
  
  // Status pós-adoção
  status: 'active' | 'paused' | 'returned' | 'completed',
  adoption_date: timestamp,
  
  // Contrato
  contract_url: string?,  // Storage
  contract_signed_at: timestamp?,
  
  // Acompanhamento
  follow_up_dates: timestamp[],
  rating: number?,  // 1-5
  
  // Devolução
  returned_at: timestamp?,
  return_reason: string?,
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

### §2.6. `clubs/{clubId}` (organizações)

```typescript
{
  id: string,
  name: string,
  slug: string,
  description: string?,
  logo_url: string?,
  cover_url: string?,
  
  // Tipo
  type: 'ong' | 'shelter' | 'loja' | 'partner',
  is_organization: boolean,  // true se ONG/abrigo
  
  // Contato
  email: string,
  phone: string?,
  whatsapp: string?,
  website: string?,
  
  // Endereço
  address: string?,
  city: string,
  state: string,
  location: geopoint?,
  
  // Status
  directory_status: 'public' | 'private' | 'pending',
  is_verified: boolean,
  
  // Permissões granulares por admin
  admins: { [uid: string]: {
    role: 'owner' | 'admin' | 'manager',
    permissions: string[],  // ['animals', 'finance', 'donations', 'mural', 'team']
  }},
  
  // Mídia
  gallery: string[],
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

**Subcoleções** (ver §4).

### §2.7. `communities/{communityId}`

```typescript
{
  id: string,
  name: string,
  slug: string,
  description: string?,
  cover_url: string?,
  
  // Tipo
  type: 'public' | 'private' | 'invite-only',
  
  // Stats
  member_count: number,
  post_count: number,
  
  // Config
  settings: {
    allow_invites: boolean,
    require_approval: boolean,
  },
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

### §2.8. `audit_logs/{logId}`

Log imutável de ações admin.

```typescript
{
  id: string,
  action: string,  // ex: 'pet_created', 'terms_accepted', 'org_updated'
  actor: { uid: string, email: string, display_name: string? },
  target: { collection: string, doc_id: string },
  details: object,
  ip_address: string?,
  user_agent: string?,
  created_at: timestamp,
}
```

**Regras**: Append-only (update=false, delete só platform_admin).

### §2.9. `reports/{reportId}`

Denúncias (maus-tratos, spam, etc).

```typescript
{
  id: string,
  type: 'animal_cruelty' | 'spam' | 'fake' | 'other',
  target_type: 'pet' | 'user' | 'club' | 'community',
  target_id: string,
  reporter_id: string,  // anônimo pode reportar
  
  description: string,
  evidence_urls: string[],  // Storage
  
  status: 'pending' | 'investigating' | 'resolved' | 'dismissed',
  assigned_to: string?,
  resolution_notes: string?,
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

---

## §3. Subcoleções de `pets/{petId}`

### §3.1. `pet_vet_visits/{visitId}`

```typescript
{
  date: timestamp,
  vet_name: string,
  clinic: string?,
  reason: string,
  diagnosis: string?,
  treatment: string?,
  cost_brl: number?,
  follow_up_date: timestamp?,
  documents: string[],  // Storage URLs
  created_at: timestamp,
}
```

### §3.2. `pet_treatments/{treatmentId}`

```typescript
{
  start_date: timestamp,
  end_date: timestamp?,
  medication: string,
  dosage: string,
  frequency: string,
  notes: string?,
  status: 'ongoing' | 'completed' | 'cancelled',
  created_at: timestamp,
}
```

### §3.3. `pet_care_log/{entryId}`

```typescript
{
  date: timestamp,
  category: 'feeding' | 'grooming' | 'exercise' | 'training' | 'other',
  notes: string,
  logged_by: string,  // uid
  created_at: timestamp,
}
```

### §3.4. `pet_devolutions/{devolutionId}`

```typescript
{
  adoption_id: string,
  date: timestamp,
  reason: 'housing' | 'allergy' | 'behavior' | 'health' | 'other',
  notes: string,
  condition: 'good' | 'needs-care' | 'urgent-care',
  reported_by: string,  // uid
  created_at: timestamp,
}
```

### §3.5. `pet_adopters_history/{historyId}`

Histórico de adotantes anteriores do pet (se houve devolução).

```typescript
{
  user_id: string,
  user_name: string,
  adoption_date: timestamp,
  return_date: timestamp?,
  outcome: 'kept' | 'returned' | 'transferred',
  notes: string?,
  created_at: timestamp,
}
```

### §3.6. `pet_audit_log/{logId}` (V3 TASK-029)

Log imutável de TODAS as mudanças no pet. Ver `15-RECENT-FIXES.md` §3.

```typescript
{
  actor: { uid: string, display_name: string? },
  action: 'pet_created' | 'pet_updated' | 'pet_deleted' |
          'pet_field_changed' | 'pet_photo_added' | 'pet_photo_removed' |
          'vet_visit_created' | 'vet_visit_updated' | 'vet_visit_deleted' |
          'treatment_created' | ... | 'medication_deleted' |
          'care_log_created' | ... | 'devolution_created' | ...,
  target: { collection: string, doc_id: string },
  details: object,  // { field, old_value, new_value, etc }
  created_at: timestamp,
}
```

**Regras**: Append-only (update=false, delete=false).

### §3.7. `pet_notes/{noteId}` (V3 TASK-029)

Anotações livres dos admins.

```typescript
{
  text: string,  // max 5000 chars
  author: { uid: string, display_name: string },
  created_at: timestamp,
  updated_at: timestamp?,
}
```

**Regras**:
- Read/Update: canManage (admin)
- Delete: autor OR platform_admin

---

## §4. Subcoleções de `clubs/{clubId}`

### §4.1. `members/{uid}`

```typescript
{
  uid: string,
  role: 'owner' | 'admin' | 'manager' | 'volunteer' | 'follower',
  permissions: string[],
  joined_at: timestamp,
  invited_by: string?,
  status: 'active' | 'pending' | 'left' | 'banned',
}
```

### §4.2. `volunteers/{volunteerUid}` (V3 TASK-274)

Roster per-shelter de voluntários.

```typescript
{
  volunteer_uid: string,
  volunteer_name: string,
  volunteer_photo_url: string?,
  volunteer_email: string?,
  volunteer_phone: string?,
  status: 'active' | 'paused' | 'blocked' | 'left',
  capabilities: string[],  // ['dog_walking', 'transport', 'admin_tasks', ...]
  joined_at: timestamp,
  left_at: timestamp?,
  notes: string?,
}
```

### §4.3. `volunteer_assignments/{assignmentId}` (TASK-274)

Atribuições finas de capabilities com escopo.

```typescript
{
  volunteer_uid: string,
  capability: 'dog_walking' | 'transport' | 'grooming' | 'event_support' | 'foster_support' | 'admin_tasks' | 'general_help' | 'outro',
  scope: 'shelter' | 'pet' | 'event_type' | 'task',
  scope_id: string?,  // ID do pet, event, etc
  is_active: boolean,
  created_at: timestamp,
  expires_at: timestamp?,
  created_by: string,  // admin uid
  notes: string?,
}
```

### §4.4. `events/{eventId}`

Eventos do abrigo (feiras, mutirões, etc).

```typescript
{
  id: string,
  title: string,
  description: string,
  type: 'fair' | 'fundraising' | 'volunteer' | 'campaign' | 'other',
  cover_url: string?,
  
  start_date: timestamp,
  end_date: timestamp,
  location: string,
  city: string,
  state: string,
  location_geopoint: geopoint?,
  
  capacity: number?,
  registered_count: number,
  rsvps: string[],  // uids
  
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled',
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

### §4.5. `fosters/{fosterUid}`

Lares temporários.

```typescript
{
  foster_uid: string,
  full_name: string,
  email: string?,
  phone: string?,
  address: string,
  experience: 'first' | 'some' | 'experienced',
  capacity: number,  // quantos pets
  current_pets: string[],  // petIds atualmente
  status: 'active' | 'paused' | 'inactive',
  notes: string?,
  started_at: timestamp,
}
```

### §4.6. `donations/{donationId}`

Doações financeiras.

```typescript
{
  id: string,
  amount_brl: number,
  donor_uid: string?,  // null se anônimo
  donor_name: string?,  // se anônimo
  donor_email: string?,
  
  method: 'pix' | 'credit_card' | 'bank_transfer' | 'other',
  status: 'pending' | 'confirmed' | 'refunded' | 'failed',
  
  // Metadata
  external_id: string?,  // ID do gateway
  receipt_url: string?,
  notes: string?,
  
  created_at: timestamp,
  confirmed_at: timestamp?,
}
```

### §4.7. `mural/{postId}` (mural da ONG)

```typescript
{
  id: string,
  author_uid: string,  // pode ser admin do clube
  text: string,
  media_urls: string[],
  likes: string[],  // uids
  comment_count: number,
  pinned: boolean,
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

### §4.8. `forum/{topicId}` (fórum da ONG)

```typescript
{
  id: string,
  title: string,
  author_uid: string,
  body: string,
  tags: string[],
  replies: number,
  views: number,
  pinned: boolean,
  locked: boolean,
  last_activity_at: timestamp,
  
  created_at: timestamp,
}
```

---

## §5. Coleções Denormalizadas (TASK-312)

Para performance de busca, Cloud Functions mantêm estas coleções
sincronizadas com as originais:

| Coleção denormalizada | Origem |
|----------------------|--------|
| `search_pets/{petId}` | pets/{petId} |
| `search_clubs/{clubId}` | clubs/{clubId} |
| `search_fosters/{fosterId}` | clubs/{clubId}/fosters/{fosterId} |
| `search_volunteers/{volunteerUid}` | clubs/{clubId}/volunteers/{volunteerUid} |

Campos denormalizados: `name_lower`, `breed_tokens`, `name_prefix_*`,
`location_lower`, etc. Ver `08-TESTING.md` §2 e `12-CODING-STANDARDS.md`.

---

## §6. Coleções de Sistema

### §6.1. `terms_acceptances/{acceptanceId}`

Aceite canônico de termos (Lei 14.063/2020).

```typescript
{
  user_uid: string,
  terms_type: 'general' | 'privacy' | 'conduct' | 'adopter' | 'shelter' | 'volunteer' | 'foster' | 'donor' | 'cookies',
  terms_version: string,  // ex: '2026-07-10' ou '2026-07-10-v2'
  document_hash: string,  // SHA-256
  signature_text: string,
  ip_address: string,
  user_agent: string,
  liveness_verified: boolean,
  legal_basis: string,  // 'LGPD Art. 7º I'
  accepted_at: timestamp,
}
```

**Regras**: Append-only (update=false, delete só platform_admin).

### §6.2. `volunteer_audit_trail/{logId}`

Log de ações do perfil de voluntário.

### §6.3. `notifications/{notificationId}`

Notificações in-app (sino).

```typescript
{
  id: string,
  user_id: string,
  type: 'admin_broadcast' | 'chat_message' | 'pet_status_changed' | 'club_invite' | ...,
  title: string,
  message: string,
  link: string?,
  actor_id: string?,
  actor_name: string?,
  read: boolean,
  read_at: timestamp?,
  created_at: timestamp,
}
```

### §6.4. `volunteer_profile/{uid}`

Perfil global do voluntário.

```typescript
{
  uid: string,
  skills: string[],
  availability: [{ day_of_week, start_time, end_time }],
  radius_km: number?,
  transport_available: boolean,
  has_vehicle: boolean,
  notes: string?,
  
  terms_accepted_at: timestamp?,
  terms_version: string?,
  document_hash: string?,
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

---

## §7. Coleções de Parcerias (TASK-027)

### §7.1. `partners/{partnerId}`

Parceiros publicitários (espaço pago).

```typescript
{
  id: string,
  name: string,
  slug: string,
  type: 'ong' | 'shelter' | 'business' | 'vet' | 'brand',
  description: string?,
  logo_url: string?,
  website: string?,
  email: string,
  phone: string?,
  
  // Banners
  banners: {
    desktop: { image_url, target_url, weight, active },
    mobile: { image_url, target_url, weight, active },
  },
  
  // Stats
  impressions: number,
  clicks: number,
  current_impressions: number,  // denormalizado
  current_clicks: number,
  
  // LGPD
  collect_ip: false,  // NUNCA coletar IP
  collect_ua: 'truncated',  // UA truncado
  
  // Status
  status: 'active' | 'paused' | 'expired' | 'cancelled',
  start_date: timestamp,
  end_date: timestamp,
  
  created_at: timestamp,
  updated_at: timestamp,
}
```

### §7.2. `partner_banners/{partnerId}/{bannerId}/{variant}-{name}.{ext}`

Storage path. Ver `01-ARCHITECTURE.md` §10.

---

## §8. Coleções de Admin

### §8.1. `admin_alerts/{alertId}`

Alertas para platform admin.

```typescript
{
  id: string,
  type: 'security' | 'abuse' | 'system' | 'metric',
  severity: 'low' | 'medium' | 'high' | 'critical',
  title: string,
  message: string,
  context: object,
  status: 'open' | 'investigating' | 'resolved' | 'dismissed',
  assigned_to: string?,
  created_at: timestamp,
  resolved_at: timestamp?,
}
```

### §8.2. `platform_settings/{settingId}`

Configurações da plataforma (geralmente apenas 1 doc: `main`).

```typescript
{
  feature_flags: object,  // overrides de feature flags
  rate_limits: object,
  maintenance_mode: boolean,
  maintenance_message: string?,
  updated_at: timestamp,
  updated_by: string,
}
```

---

## §9. Índices Compostos

Definidos em `firestore.indexes.json`. Compostos críticos:

- `pets`: `(status, created_at)` — feed
- `pets`: `(species, status, created_at)` — filtros
- `clubs`: `(directory_status, name)` — diretório público
- `interests`: `(pet_id, created_at)` — por pet
- `interests`: `(user_id, created_at)` — "meus interesses"
- `notifications`: `(user_id, created_at)` — sino

---

## §10. Realtime Listeners

Usados em:
- `useNotifications` (sino)
- `useChat` (mensagens)
- `usePetInterest` (status em tempo real)
- `useFCM` (push)

Todos implementados com `onSnapshot` + cleanup em `useEffect`.

---

**Próxima leitura**: `03-MODULES.md` (o que cada módulo faz).
