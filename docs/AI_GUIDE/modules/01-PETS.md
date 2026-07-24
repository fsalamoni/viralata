# Module 01 — Pets

> Adoção de pets. Feed, detalhe, CRUD, log, anotações, timeline.

## §1. Visão Geral

**Path**: `src/modules/pets/`
**Linhas**: ~3000
**Tests**: 190
**D-**: D-PET-SEQ-IMMUTABLE, D-PET-LOG-IMMUTABLE, D-PET-NOTES-AUTHOR-DELETE,
D-HASH-ROUTER-PET-TABS, D-PET-PUBLIC-V2-SEM-ADMIN, D-PET-PUBLIC-V2-HERO.

## §2. Funcionalidades

### §2.1. Feed público (`/feed`)

- Lista de pets disponíveis (`status='available'`)
- Filtros client-side: espécie, porte, cidade, raio
- Paginação
- Lazy loading de imagens

### §2.2. Detalhe público (`/pet/:id`)

- Hero `from-rose-500 via-orange-500 to-amber-500`
- Foto, nome, breed, city
- Botões: "Quero adotar", "Compartilhar", "Reportar"
- **ZERO** botões admin (D-PET-PUBLIC-V2-SEM-ADMIN)

### §2.3. Detalhe admin (`/pets/:id`)

- 3 tabs: Visão geral, Log, Notes, Timeline
- Hash router (`#log`, `#notes`, `#timeline`)
- Botão Editar (canManage)
- PetsOpsTable (kanban de pets da ONG)

### §2.4. CRUD

- Criar (`/meus-pets/criar`)
- Editar (`/meus-pets/:id/editar`)
- Deletar (admin only)
- Log automático em cada operação (D-PET-LOG-PER-CHANGE)

### §2.5. Log imutável (`pet_audit_log`)

- 9 fontes: pet, vet_visits, treatments, care_log, devolutions,
  adopters_history, photos, notes
- Cada ação registra: actor, action, target, details
- Update bloqueado (D-PET-LOG-IMMUTABLE)
- Delete só platform_admin

### §2.6. Notes (`pet_notes`)

- Anotações livres dos admins
- Read/create/update canManage
- Delete: autor OR platform_admin (D-PET-NOTES-AUTHOR-DELETE)

### §2.7. Timeline (`pet_timeline`)

- Combina 9 fontes em uma timeline visual
- Componente `PetTimelineView.jsx`

## §3. Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `PetCard.jsx` | Card de pet no feed |
| `PetFeed.jsx` | Lista de pets |
| `PetDetailView.v3.jsx` | Detalhe PÚBLICO |
| `PetDetailV3.jsx` | Detalhe ADMIN (3 tabs) |
| `CreatePet.jsx` | Form de criação |
| `EditPet.jsx` | Form de edição |
| `MyPets.jsx` | Lista de pets do user |
| `MyInterests.jsx` | Interesses de adoção do user |
| `RadarSettings.jsx` | Configuração de radar |
| `PetLog.jsx` | Log imutável |
| `PetNotes.jsx` | Anotações |
| `PetTimelineView.jsx` | Timeline visual |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `petService.js` | CRUD de pet + `getNextPetSeq()` |
| `petLogService.js` | `appendPetLog`, `listPetLog` |
| `petNotesService.js` | CRUD de `pet_notes` |
| `petTimelineService.js` | Combina 9 fontes em timeline |
| `petPermissions.js` | `ensureCanMutatePet`, `canManagePet` |
| `petShareService.js` | Gera imagem de share |
| `interestService.js` | CRUD de interesses de adoção |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `usePet` | Query de um pet por ID |
| `usePets` | Lista de pets (filtros client-side) |
| `usePetPermissions` | canManage, isOwner, etc |
| `usePetVetVisits` | Subcollection `pet_vet_visits` |
| `usePetTreatments` | Subcollection `pet_treatments` |
| `usePetCareLog` | Subcollection `pet_care_log` |
| `usePetDevolutions` | Subcollection `pet_devolutions` |
| `usePetAdoptersHistory` | Subcollection `pet_adopters_history` |
| `usePetLog` | `pet_audit_log` |
| `usePetNotes` | `pet_notes` |
| `usePetTimeline` | Timeline agregada |
| `usePetShareImage` | Gera imagem de share |
| `useInterest` | Interesse de adoção |
| `useInterests` | Lista de interesses |
| `useCreateInterest` | Mutation de criar interesse |

## §6. Schema (resumo)

Ver `02-DATA-MODEL.md` §2.2 (pets) e §3 (subcoleções).

## §7. Tests

| Test | Tipo |
|------|------|
| `petService.test.js` | Unit |
| `petLogService.test.js` | Unit |
| `petNotesService.test.js` | Unit |
| `petTimelineService.test.js` | Unit |
| `usePet.test.js` | Hook |
| `usePetPermissions.test.js` | Hook |
| `PetDetailV3.runtime.test.jsx` | Runtime |
| `PetDetailV3.imports.test.jsx` | Imports (MessageSquare) |
| `PetNotes.runtime.test.jsx` | Runtime |
| `PetLog.runtime.test.jsx` | Runtime |
| `PetTimelineView.runtime.test.jsx` | Runtime |

## §8. Especificações

- `docs/REGENCY_PET_DETAIL_V3.md` (V3 redesign)
- `docs/REGENCY_PET_OPS_V3.md` (V3 Pet Ops - TASK-029)
- `docs/V3_PET_DETAIL_QUESTIONS.md`

---

**Próximo módulo**: `modules/02-ORGANIZATIONS.md`
