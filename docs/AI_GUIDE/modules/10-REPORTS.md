# Module 10 — Reports (Denúncias)

> Sistema de denúncias (maus-tratos, spam, fake).

## §1. Visão Geral

**Path**: `src/modules/reports/`
**Linhas**: ~1000
**Tests**: 0 (GAP)

## §2. Funcionalidades

### §2.1. Form público (`/denuncie`)

- Form anônimo (com opção de login)
- Tipos: animal_cruelty, spam, fake, other
- Upload de evidências
- Descrição

### §2.2. Minhas denúncias (`/denuncias`)

- Lista de denúncias do user
- Status

### §2.3. Admin (`/admin/denuncias`)

- Lista de todas
- Investigar
- Resolver / Dispensar

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `PublicReportForm.jsx` | Form público |
| `CreateReport.jsx` | Criar (logado) |
| `MyReports.jsx` | Minhas denúncias |
| `AdminReports.jsx` | Admin |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `reportService.js` | CRUD de denúncias |
| `reportPermissions.js` | Helpers |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useReport` | Query |
| `useReports` | Lista |
| `useCreateReport` | Mutation |

## §6. Schema

Ver `02-DATA-MODEL.md` §2.9.

## §7. GAP

**Recomendação**: Adicionar tests para `reportService.js` (target: 70%).

---

**Próximo módulo**: `modules/11-ADOPTER.md`
