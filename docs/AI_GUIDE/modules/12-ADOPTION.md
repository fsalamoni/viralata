# Module 12 — Adoption (Fluxo de Adoção)

> Wizard de adoção, fluxo completo, contrato, pós-adoção.

## §1. Visão Geral

**Path**: `src/modules/adoption/`
**Linhas**: ~1500
**Tests**: ~20

## §2. Funcionalidades

### §2.1. Wizard (`/quero-adotar/:petId`)

- Step 1: Detalhes do pet + compatibilidade
- Step 2: Form do adotante (dados, ambiente)
- Step 3: Revisão + submit
- Step 4: Confirmação

### §2.2. Minhas adoções (`/minhas-adoções`)

- Lista de adoções ativas
- Status: pending, approved, completed

### §2.3. Detalhe (`/minhas-adoções/:id`)

- Pet, ONG, contrato
- Status updates
- Pós-adoção (rating, devolução)

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `AdoptionWizard.jsx` | Wizard multi-step |
| `MyAdoptions.jsx` | Lista |
| `AdoptionDetail.jsx` | Detalhe |
| `AdoptionStep1.jsx` | Step 1 |
| `AdoptionStep2.jsx` | Step 2 |
| `AdoptionStep3.jsx` | Step 3 |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `adoptionService.js` | CRUD de adoções |
| `interestService.js` (em pets) | Interesses |
| `adoptionPermissions.js` | Helpers |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useAdoption` | Query |
| `useAdoptions` | Lista |
| `useCreateAdoption` | Mutation |
| `useRateAdoption` | Rating |

## §6. Schema

Ver `02-DATA-MODEL.md` §2.5.

---

**Próximo módulo**: `modules/13-CONTRACTS.md`
