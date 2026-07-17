# SERVICES

> Referência dos serviços Firebase do front-end. Para padrões, veja `docs/ARCHITECTURE.md`.
> **61 serviços** organizados por módulo.

## Convenções

- **Localização**: `src/core/services/` (globais) + `src/modules/<modulo>/services/` (por domínio).
- **Firestore**: todas as leituras/escritas via `db` (instância nomeada `viralata`).
- **Erros**: lançamentos como `Error` ou `FirebaseError`. Nunca suprimir sem fallback.
- **LGPD**: `auditService` após mutações relevantes. `dataExportService`/`deleteAccountService` para direitos do titular.

---

## `src/core/services/`

### `auditService.js`
Grava log de auditoria imutável.
```js
import { createAuditLog } from '@/core/services/auditService';
await createAuditLog({ action: 'pet.created', actor: user.uid, details: { petId } });
```
- Coleção: `audit_logs` (só insert, sem update/delete).
- Campos: `action`, `actor`, `details`, `created_at_ms`.
- Usado após mutações de domínio.

### `platformSettingsService.js`
Configurações globais da plataforma + feature flags.
```js
import { subscribePlatformSettings, setFeatureFlag } from '@/core/services/platformSettingsService';
const unsubscribe = subscribePlatformSettings((settings) => { ... });
await setFeatureFlag({ flagKey: 'SHELTER_KANBAN', enabled: true, actor: user });
```
- Coleção: `platform_settings/global`.
- Flags de feature: `SHELTER_*` em `core/featureFlags.js`.
- ⚠️ ADMIN ONLY para escrita (reforçado em `firestore.rules`).

### `storageService.js`
Upload de imagens/anexos.
```js
import { uploadImage } from '@/core/services/storageService';
const url = await uploadImage(file, { uid, folder: 'pets' });
```
- Bucket: default Firebase Storage.
- Paths: `uploads/{uid}/{folder}/...`, `users/{uid}/...`, `volunteers/{uid}/...`.
- Size limits: 5–25 MB por tipo (ver `storage.rules`).
- MIME: só `image/*` e `video/*` (e `application/pdf` para voluntários).

### `notificationService.js`
Notificações push FCM.
```js
import { sendNotification } from '@/core/services/notificationService';
await sendNotification({ userId, title: 'Novo pet!', body: '...' });
```
- Usa FCM Server API (Admin SDK).
- Templates: `notificationTemplates.js`.

### `observabilityService.js`
Page views e métricas.
```js
import { recordPageView } from '@/core/services/observabilityService';
recordPageView({ path, title, userId });
```
- Coleção: `platform_health_snapshots`.

### `securityAlertsService.js`
Alertas de segurança.
```js
import { listAlerts } from '@/core/services/securityAlertsService';
const { data: alerts } = useQuery({ queryKey: ['security-alerts'], queryFn: listAlerts });
```
- Coleção: `security_alerts`.
- Tipos: `suspicious_login`, `rate_limit_exceeded`, `unusual_pattern`.

### `errorTracker.js`
Registro de erros client-side.
```js
import { recordClientError, captureError } from '@/core/services/errorTracker';
recordClientError(err, { source: 'component', context });
```
- Captura: `window.onerror`, `unhandledrejection`, e erros locais.
- Coleção: `client_errors`.

### `rateLimitService.js`
Rate limiting para ações.
```js
import { checkRateLimit } from '@/core/services/rateLimitService';
const allowed = await checkRateLimit({ userId, action: 'create_pet' });
```

### `dataExportService.js`
Exportação de dados do usuário (LGPD Art. 18 VI).
```js
import { exportUserData } from '@/core/services/dataExportService';
await exportUserData(userId); // gera CSV/JSON → Storage
```

### `deleteAccountService.js`
Exclusão de conta + dados (LGPD Art. 18 IV).
```js
import { deleteUserAccount } from '@/core/services/deleteAccountService';
await deleteUserAccount(userId); // soft-delete + purge cron
```

### `mfaService.js`
Autenticação multifator.
```js
import { setupMFA, verifyMFA } from '@/core/services/mfaService';
```

### `cpfValidationService.js`
Validação de CPF.
```js
import { validateCPF } from '@/core/services/cpfValidationService';
validateCPF('123.456.789-00'); // boolean
```

### `platformContentService.js`
Conteúdo editorial da plataforma.
```js
import { getPublicContent } from '@/core/services/platformContentService';
```

### `baseService.js`
Helpers comuns de Firestore.
```js
import { safeGet, safeSet, buildQuery } from '@/core/services/baseService';
```

---

## `src/modules/pets/services/`

### `petService.js`
CRUD de pets.
```js
import { createPet, updatePet, deletePet, listPets } from '@/modules/pets/services/petService';
await createPet({ title, species, size, city, owner_id, owner_type });
```

### `petRadarService.js`
Radar de pets (matching adotante × pet).
```js
import { computeMatches } from '@/modules/pets/services/petRadarService';
```

### `interestService.js`
Manifestação de interesse.
```js
import { createInterest } from '@/modules/pets/services/interestService';
```

### `ratingService.js`
Avaliações de adoção.
```js
import { createRating } from '@/modules/pets/services/ratingService';
```

---

## `src/modules/organizations/services/`

### `clubService.js`
CRUD de organizações.
```js
import { createClub, updateClub, deleteClub } from '@/modules/organizations/services/clubService';
```

### `clubFeedService.js`
Mural da organização.
```js
import { createPost, deletePost } from '@/modules/organizations/services/clubFeedService';
```

### `clubDonationService.js`
Doações da organização.
```js
import { createDonation, updateDonation } from '@/modules/organizations/services/clubDonationService';
```

### `clubLedgerCategoryService.js`
Categorias financeiras.
```js
import { createCategory } from '@/modules/organizations/services/clubLedgerCategoryService';
```

### `forumService.js`
Fórum da organização.
```js
import { createThread } from '@/modules/organizations/services/forumService';
```

### `clubChatService.js`
Chat da organização.
```js
import { sendMessage } from '@/modules/organizations/services/clubChatService';
```

---

## `src/modules/shelter/services/`

### `adopterProfileService.js`
Perfil do adotante.
```js
import { createAdopterProfile } from '@/modules/shelter/services/adopterProfileService';
```

### `useShelterLedger` (via hooks)
Livro razão do abrigo — ver `hooks/useShelterLedger`.

---

## `src/modules/communities/services/`

### `communityService.js`
CRUD de comunidades + posts + eventos.
```js
import { createCommunity, createPost, listCommunityEvents } from '@/modules/communities/services/communityService';
```

### `communityChatService.js`
Chat de comunidade.
```js
import { sendMessage } from '@/modules/communities/services/communityChatService';
```

### `forumModerationService.js`
Moderação de fórum.
```js
import { createForumThread } from '@/modules/communities/services/forumModerationService';
```

### `publicMuralService.js`
Mural público de comunidade.
```js
import { getPublicMural } from '@/modules/communities/services/publicMuralService';
```

### `codeOfConductService.js`
Aceite de Código de Conduta.
```js
import { recordCocAcceptance } from '@/modules/communities/services/codeOfConductService';
```

### `communityInviteService.js`
Convites de comunidade.
```js
import { inviteMember } from '@/modules/communities/services/communityInviteService';
```

---

## `src/modules/contracts/services/`

### `contractsService.js`
Contratos de adoção.
```js
import { createContract } from '@/modules/contracts/services/contractsService';
```
- Coleção: `clubs/{clubId}/contracts/{contractId}`.
- LGPD: `adopter_ip` + `adopter_user_agent` + hash do documento.
- Retenção: 5 anos.

---

## `src/modules/interview/services/`

### `interviewService.js`
Entrevistas de adoção.
```js
import { createInterview } from '@/modules/interview/services/interviewService';
```
- Coleção: `clubs/{clubId}/interviews/{interviewId}`.

---

## `src/modules/reports/services/`

### `reportService.js`
Relatórios do abrigo.
```js
import { createReport, updateReportStatus } from '@/modules/reports/services/reportService';
```

---

## `src/modules/admin/services/`

### `adminService.js`
Operações admin (list users, update role, etc.).
```js
import { listAllUsers } from '@/modules/admin/services/adminService';
```
- ⚠️ REQUIRES `platform_admin` (Firestore rule: `isPlatformAdmin()`).

### `metricsService.js`
Métricas agregadas da plataforma.
```js
import { computeMetrics } from '@/modules/admin/services/metricsService';
```

### `adminAlertsService.js`
Alertas da plataforma.
```js
import { listAlerts } from '@/modules/admin/services/adminAlertsService';
```

### `platformHealthService.js`
Métricas de saúde da plataforma.
```js
import { getHealthMetrics } from '@/modules/admin/services/platformHealthService';
```

### `broadcastService.js`
Broadcast para usuários.
```js
import { sendBroadcast } from '@/modules/admin/services/broadcastService';
```

### `adminUsersService.js`
Gestão de usuários admin.
```js
import { updateUserRole } from '@/modules/admin/services/adminUsersService';
```

---

## Armadilhas Conhecidas

| Service | Armadilha | Correção |
|---------|-----------|----------|
| `auditService` | Não chamar dentro de `useEffect` sem try/catch | Chamadas assíncronas precisam tratar erro |
| `storageService` | Arquivos grandes (>10MB) podem timeout | Chunk upload para PDFs/imagens grandes |
| `clubService.updateClub` | Pode sobrescrever campos não intencionais | Sempre usar `normalizeClubInput` |
| `contractsService` | Acesso só via Callable (não client-side direto) | Usar `createContractCallable.js` Cloud Function |
| `adminService` | Todos methods requerem `platform_admin` | Checar `isPlatformAdmin()` antes de chamar |
| `deleteAccountService` | Soft-delete + purge cron de 30 dias | LGPD Art. 18 IV — confirmar com usuário |
