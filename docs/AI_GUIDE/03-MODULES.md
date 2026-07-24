# 03-MODULES.md — Mapa dos Módulos

> Cada módulo em `src/modules/<name>/` é uma **feature vertical self-contained**.
> Para detalhes de cada módulo, ver `modules/<NN>-<NAME>.md`.

## §1. Estrutura Padrão de um Módulo

```
src/modules/<name>/
├── components/     # Componentes específicos do módulo
├── hooks/          # React Query hooks
├── services/       # Firestore operations + lógica de negócio
├── domain/         # Schemas Zod, tipos, constantes
├── pages/          # Páginas admin (geralmente .v3.jsx)
├── __tests__/      # Tests específicos
└── index.js        # Public API (opcional)
```

## §2. Os 15 Módulos

| # | Módulo | Path | Descrição | Linhas | Docs |
|---|--------|------|-----------|--------|------|
| 01 | `pets` | `src/modules/pets/` | Pets (feed, detalhe, CRUD, log, anotações) | ~3000 | [modules/01-PETS.md](modules/01-PETS.md) |
| 02 | `organizations` | `src/modules/organizations/` | ONGs/abrigos (público + admin) | ~5000 | [modules/02-ORGANIZATIONS.md](modules/02-ORGANIZATIONS.md) |
| 03 | `communities` | `src/modules/communities/` | Comunidades (mural, fórum, eventos) | ~3000 | [modules/03-COMMUNITIES.md](modules/03-COMMUNITIES.md) |
| 04 | `shelter` | `src/modules/shelter/` | Gestão abrigos (kanban, entrevista, post-adoção) | ~8000 | [modules/04-SHELTER.md](modules/04-SHELTER.md) |
| 05 | `admin` | `src/modules/admin/` | Painel plataforma (métricas, auditoria, flags) | ~4000 | [modules/05-ADMIN.md](modules/05-ADMIN.md) |
| 06 | `partners` | `src/modules/partners/` | Parceiros publicitários (espaço pago) | ~2500 | [modules/06-PARTNERS.md](modules/06-PARTNERS.md) |
| 07 | `users` | `src/modules/users/` | Perfil user + auth | ~1500 | [modules/07-USERS.md](modules/07-USERS.md) |
| 08 | `chat` | `src/modules/chat/` | Mensageria interna | ~2500 | [modules/08-CHAT.md](modules/08-CHAT.md) |
| 09 | `notifications` | `src/modules/notifications/` | Notificações in-app + FCM | ~2000 | [modules/09-NOTIFICATIONS.md](modules/09-NOTIFICATIONS.md) |
| 10 | `reports` | `src/modules/reports/` | Denúncias (maus-tratos) | ~1000 | [modules/10-REPORTS.md](modules/10-REPORTS.md) |
| 11 | `adopter` | `src/modules/adopter/` | Adopter (público) | ~800 | [modules/11-ADOPTER.md](modules/11-ADOPTER.md) |
| 12 | `adoption` | `src/modules/adoption/` | Adoção (wizard, fluxo) | ~1500 | [modules/12-ADOPTION.md](modules/12-ADOPTION.md) |
| 13 | `contracts` | `src/modules/contracts/` | Contratos (termos) | ~1500 | [modules/13-CONTRACTS.md](modules/13-CONTRACTS.md) |
| 14 | `interview` | `src/modules/interview/` | Entrevistas (shelter) | ~1000 | [modules/14-INTERVIEW.md](modules/14-INTERVIEW.md) |
| 15 | `onboarding` | `src/modules/onboarding/` | Onboarding (novo user) | ~800 | [modules/15-ONBOARDING.md](modules/15-ONBOARDING.md) |

**Total**: ~40,000 linhas em módulos.

---

## §3. Como encontrar o módulo certo

### §3.1. Por funcionalidade

| Funcionalidade | Módulo | Componente principal |
|----------------|--------|---------------------|
| Feed de pets | pets | `PetFeed.jsx` |
| Detalhe público de pet | pets | `PetDetailView.v3.jsx` |
| Detalhe admin de pet | pets | `PetDetailV3.jsx` |
| CRUD de pet | pets | `CreatePet.jsx` |
| Listar pets do user | pets | `MyPets.jsx` |
| Listar interesses | pets | `MyInterests.jsx` |
| Radar de pets compatíveis | pets | `RadarSettings.jsx` |
| Listar ONGs | organizations | `ClubsDirectory.jsx` |
| Perfil público de ONG | organizations | `ClubDetail.v3.jsx` |
| Painel admin ONG | organizations | `OrganizationAdminPanel.v3.jsx` |
| Listar comunidades | communities | `CommunitiesDirectory.jsx` |
| Perfil de comunidade | communities | `CommunityDetail.v3.jsx` |
| Mural da comunidade | communities | `PublicMuralFeed.v3.jsx` |
| Fórum | communities | `CommunityForumPublic.jsx` |
| Painel abrigo (admin) | shelter | `ShelterAdminDashboard.v3.jsx` |
| Kanban do abrigo | shelter | `KanbanPage.jsx` |
| Entrevistas | shelter | `ShelterInterviewsList.jsx` |
| Pós-adoção | shelter | `PostAdoptionDashboard.v3.jsx` |
| Painel plataforma | admin | `AdminDashboard.v3.jsx` |
| Métricas | admin | `AdminMetrics.jsx` |
| Flags | admin | `AdminFlags.jsx` |
| Parceiros (admin) | partners | `AdminPartners.jsx` |
| Perfil do user | users | `Profile.jsx` |
| Preferências | users | `Preferences.jsx` |
| Chat | chat | `ChatPage.v3.jsx` |
| Notificações (sino) | notifications | `Notifications.jsx` (no Layout) |
| Denúncias | reports | `CreateReport.jsx` |
| Wizard de adoção | adoption | `AdoptionWizard.jsx` |
| Detalhe de adoção | adoption | `AdoptionDetail.jsx` |
| Onboarding (novo user) | onboarding | `OnboardingQuestionnaire.jsx` |

### §3.2. Por hook (React Query)

| Hook | Módulo | O que faz |
|------|--------|-----------|
| `usePet` | pets | Query de um pet por ID |
| `usePets` | pets | Lista de pets (filtros client-side) |
| `usePetPermissions` | pets | canManage, isOwner, etc |
| `usePetVetVisits` | pets | Subcollection pet_vet_visits |
| `usePetTreatments` | pets | Subcollection pet_treatments |
| `usePetCareLog` | pets | Subcollection pet_care_log |
| `usePetDevolutions` | pets | Subcollection pet_devolutions |
| `usePetAdoptersHistory` | pets | Subcollection pet_adopters_history |
| `usePetLog` | pets | pet_audit_log (V3) |
| `usePetNotes` | pets | pet_notes (V3) |
| `usePetTimeline` | pets | Timeline agregada de 9 fontes (V3) |
| `usePetShareImage` | pets | Gera imagem de share |
| `useClub` | organizations | Query de uma ONG |
| `useClubs` | organizations | Lista de ONGs |
| `useMyMembership` | organizations | Memberships do user |
| `useMyJoinRequests` | organizations | Requests de join |
| `useVolunteerProfile` | shelter | Perfil global do voluntário |
| `useAcceptVolunteerTerms` | shelter | Mutation de aceite de termo |
| `useJoinShelterAsVolunteer` | shelter | Mutation de join |
| `useShelterVolunteers` | shelter | Lista de voluntários do abrigo |
| `useNotifications` | notifications | Notificações do user (realtime) |
| `useFCM` | notifications | FCM token + push handlers |
| `useAuth` | core (não módulo) | User autenticado |

---

## §4. Como Criar um Novo Módulo

### §4.1. Estrutura recomendada

```
src/modules/<name>/
├── components/        # Componentes específicos
│   ├── <Name>Card.jsx
│   ├── <Name>List.jsx
│   └── <Name>Form.jsx
├── hooks/             # React Query
│   ├── use<Name>.js
│   ├── use<Name>List.js
│   └── useCreate<Name>.js
├── services/          # Firestore
│   ├── <name>Service.js
│   └── <name>Service.test.js
├── domain/            # Schemas, tipos
│   ├── <name>.js
│   └── <name>.test.js
├── pages/             # Páginas admin
│   └── <Name>Admin.v3.jsx
├── __tests__/
└── index.js
```

### §4.2. Convenção de nomenclatura

- **Serviços**: `<name>Service.js` (lowercase, singular)
- **Hooks**: `use<Name>.js` (PascalCase, prefix `use`)
- **Componentes**: `<Name>Card.jsx`, `<Name>List.jsx`
- **Pages**: `<Name>Page.jsx` ou `<Name>Admin.v3.jsx`
- **Schemas**: Zod, exportado do `domain/`

### §4.3. Padrão de service

```js
// services/<name>Service.js
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

export async function list<Name>(filters = {}) {
  if (!db) return [];
  const q = query(collection(db, '<name>'), /* ... */);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function get<Name>(id) {
  if (!db || !id) return null;
  const snap = await getDoc(doc(db, '<name>', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}
```

### §4.4. Padrão de hook

```js
// hooks/use<Name>.js
import { useQuery } from '@tanstack/react-query';
import { list<Name>, get<Name> } from '../services/<name>Service';

const STALE_TIME = 30_000;

export function use<Name>(id) {
  return useQuery({
    queryKey: ['<name>', id],
    queryFn: () => get<Name>(id),
    enabled: Boolean(id),
    staleTime: STALE_TIME,
  });
}

export function use<Name>List(filters = {}) {
  return useQuery({
    queryKey: ['<name>-list', filters],
    queryFn: () => list<Name>(filters),
    staleTime: STALE_TIME,
  });
}
```

### §4.5. Padrão de mutation

```js
// hooks/useCreate<Name>.js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { create<Name> } from '../services/<name>Service';

export function useCreate<Name>() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ input, actor }) => create<Name>(input, actor),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['<name>-list'] });
      qc.invalidateQueries({ queryKey: ['<name>', data.id] });
    },
  });
}
```

---

## §5. Módulos Core (não em `src/modules/`)

Funcionalidades compartilhadas estão em `src/core/`:

```
src/core/
├── config/         # firebase.js (init do Firebase)
├── hooks/          # useAuth, useToast, useFeatureFlag, etc
├── services/       # audit, error, observability
├── pwa/            # register, cleanup, service worker
├── observability/  # logger
├── permissions/    # helpers de permissão
├── lib/            # utils, cn
├── domain/         # tipos compartilhados
├── ads/            # AdSlot, AdProvider
├── ads-policy/     # políticas de ads
└── legal/          # documents, terms, etc
```

---

**Próxima leitura**: `04-PAGES-ROUTES.md` (rotas e páginas).
