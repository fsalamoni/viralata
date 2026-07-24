# Module 04 — Shelter (Gestão de Abrigos)

> Sistema completo de gestão para abrigos: kanban, entrevistas, pós-adoção,
> voluntários, ranking.

## §1. Visão Geral

**Path**: `src/modules/shelter/`
**Linhas**: ~8000
**Tests**: ~800
**Maior módulo do projeto**

## §2. Funcionalidades

### §2.1. Dashboard (`/abrigo`)

- Métricas: pets disponíveis, adoções, entrevistas
- Acesso: `ShelterAdminRoute`

### §2.2. Kanban (`/abrigo/kanban`)

- Drag-and-drop de pets por status
- Colunas: available, pending, adopted, unavailable
- Filtros

### §2.3. Entrevistas (`/abrigo/entrevistas`)

- Lista de entrevistas pendentes
- Aceitar/rejeitar com notas

### §2.4. Pós-adoção (`/abrigo/pos-adoacao`)

- Lista de adoções ativas
- Follow-up
- Rating
- Devoluções

### §2.5. Ranking (`/abrigo/ranking`)

- Ranking de ONGs (por adoções, qualidade)
- Cloud Function processa

### §2.6. Buscas (`/abrigo/buscas`)

- Histórico de buscas dos adotantes
- Analytics

### §2.7. Voluntários (`/organizacoes/:id/admin/voluntarios`)

- Roster per-shelter
- Capabilities
- Assignments
- Perfil global

## §3. Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `ShelterAdminDashboard.v3.jsx` | Dashboard |
| `KanbanPage.jsx` | Kanban |
| `ShelterInterviewsList.jsx` | Entrevistas |
| `PostAdoptionDashboard.v3.jsx` | Pós-adoção |
| `ShelterRanking.jsx` | Ranking |
| `ShelterSearches.jsx` | Buscas |
| `ShelterVolunteerProfile.jsx` | Perfil voluntário |
| `VolunteerSignup.jsx` | Wizard público |
| `VolunteerProfileForm.jsx` | Form de perfil |
| `VolunteersPublic.jsx` | Entrada pública |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `kanbanService.js` | Operações kanban |
| `interviewService.js` | CRUD entrevistas |
| `postAdoptionService.js` | Pós-adoção |
| `rankingService.js` | Ranking (read) |
| `searchService.js` | Buscas |
| `volunteerProfileService.js` | Perfil global |
| `volunteerAssignmentService.js` | Assignments |
| `fosterService.js` | Lares temporários |
| `shelterPermissions.js` | Helpers |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useKanban` | Estado do kanban |
| `useInterviews` | Lista de entrevistas |
| `usePostAdoption` | Adoções ativas |
| `useVolunteerProfile` | Perfil global |
| `useAcceptVolunteerTerms` | Mutation de aceite |
| `useJoinShelterAsVolunteer` | Mutation de join |
| `useShelterVolunteers` | Voluntários do abrigo |

## §6. Schema

Ver `02-DATA-MODEL.md` §4 (subcoleções de club).

## §7. Tests

- `searchService.test.js` (foster) — FEITO (sw-v73.3 fix)
- `volunteerAssignmentService.test.js` — FEITO (sw-v73.3 fix)
- `volunteerProfileService.test.js`
- `interviewService.test.js`
- `postAdoptionService.test.js`
- `VolunteerSignup.runtime.test.jsx` (NEW, sw-v72.5)
- `ShelterAdminDashboard.test.jsx` — FEITO (sw-v73.3 fix)

---

**Próximo módulo**: `modules/05-ADMIN.md`
