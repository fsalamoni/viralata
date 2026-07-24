# Module 02 — Organizations (ONGs, Clubes)

> ONGs e lojas parceiras. Diretório público + painel admin completo.

## §1. Visão Geral

**Path**: `src/modules/organizations/`
**Linhas**: ~5000
**Tests**: 159
**D-**: D-CLUB-DETAIL-PANEL-UNICO, D-LINK-PLURAL-ORGS.

## §2. Funcionalidades

### §2.1. Diretório público (`/organizacoes`)

- Lista de ONGs (com filtros)
- Card com logo, nome, city
- D-LINK-PLURAL-ORGS: SEMPRE `/organizacoes/` (plural)

### §2.2. Detalhe público (`/organizacoes/:id`)

- D-CLUB-DETAIL-PANEL-UNICO: APENAS 1 botão Painel, no topo
- Mural público
- Pets em destaque
- Eventos
- Doações

### §2.3. Painel admin (`/organizacoes/:id/admin`)

- 11 abas:
  - Operacional (pets)
  - Membros
  - Financeiro
  - Equipe
  - Mural
  - Fórum
  - Doações
  - Eventos
  - Voluntários
  - Settings
- Acesso: `OrgAdminRoute` (owner/admin)

## §3. Componentes Principais

| Componente | Descrição |
|------------|-----------|
| `ClubCard.jsx` | Card de ONG no diretório |
| `ClubsDirectory.jsx` | Diretório |
| `ClubDetail.v3.jsx` | Detalhe PÚBLICO |
| `ClubDetailAdmin.jsx` | Detalhe ADMIN |
| `OrganizationAdminPanel.v3.jsx` | Painel admin (11 abas) |
| `PetsOpsTable.jsx` | Tabela de pets (TASK-029) |
| `OrgMembersTab.jsx` | Aba membros |
| `OrgFinanceTab.jsx` | Aba financeiro |
| `OrgTeamTab.jsx` | Aba equipe |
| `OrgMuralTab.jsx` | Mural da ONG |
| `OrgForumTab.jsx` | Fórum da ONG |
| `OrgDonationsTab.jsx` | Doações |
| `OrgEventsTab.jsx` | Eventos |
| `OrgVolunteersTab.jsx` | Voluntários |
| `PublicMuralFeed.v3.jsx` | Mural público |
| `ClubForumPublic.jsx` | Fórum público |
| `ClubEventsPublic.jsx` | Eventos públicos |
| `ClubDonationsPublic.jsx` | Doações públicas |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `clubService.js` | CRUD de clube |
| `membershipService.js` | Memberships, roles, permissions |
| `joinRequestService.js` | Requests de join |
| `orgAdminService.js` | Operações de admin (canManage) |
| `clubPetsService.js` | Pets do clube |
| `clubEventsService.js` | Eventos |
| `clubDonationsService.js` | Doações |
| `orgPermissions.js` | `isClubOwnerOrAdmin`, `canEditClubPets` |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useClub` | Query de uma ONG |
| `useClubs` | Lista de ONGs |
| `useMyMembership` | Memberships do user |
| `useMyJoinRequests` | Requests de join do user |
| `useOrgAdmin` | Permissões de admin |
| `useClubPets` | Pets do clube |
| `useClubEvents` | Eventos do clube |
| `useClubDonations` | Doações |

## §6. Schema (resumo)

Ver `02-DATA-MODEL.md` §2.6 (clubs) e §4 (subcoleções).

## §7. Tests

| Test | Tipo |
|------|------|
| `clubService.test.js` | Unit |
| `membershipService.test.js` | Unit |
| `orgAdminService.test.js` | Unit |
| `orgPermissions.test.js` | Unit |
| `PetsOpsTable.runtime.test.jsx` | Runtime |

## §8. Permissões Granulares

Cada admin do clube tem:
- `role`: 'owner' | 'admin' | 'manager' | 'volunteer' | 'follower'
- `permissions[]`: 'animals', 'finance', 'donations', 'mural', 'team'

Helpers em `firestore.rules`:
- `isClubOwner(clubId)`
- `isClubAdmin(clubId)`
- `isClubOwnerOrAdmin(clubId)`
- `hasClubPermission(clubId, perm)`
- `canEditClubPets(clubId)`

---

**Próximo módulo**: `modules/03-COMMUNITIES.md`
