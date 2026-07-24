# Module 15 — Onboarding (Novo User)

> Onboarding de novos usuários após signup.

## §1. Visão Geral

**Path**: `src/modules/onboarding/`
**Linhas**: ~800
**Tests**: ~5

## §2. Funcionalidades

### §2.1. Questionário (`/onboarding`)

- Step 1: Quem é você (adotante, ONG, voluntário, parceiro)
- Step 2: Cidade, estado
- Step 3: Termos (LGPD)
- Step 4: Confirmação

### §2.2. Redirect baseado em role

- Adotante → `/feed`
- ONG → `/organizacoes/criar`
- Voluntário → `/voluntarios/seja`
- Parceiro → `/parceria`

## §3. Componentes

| Componente | Descrição |
|------------|-----------|
| `OnboardingQuestionnaire.jsx` | Wizard |
| `RoleSelector.jsx` | Step 1 |
| `LocationForm.jsx` | Step 2 |
| `TermsAcceptance.jsx` | Step 3 |

## §4. Services

| Service | Responsabilidade |
|---------|------------------|
| `onboardingService.js` | Operações |
| `roleService.js` | Roles |

## §5. Hooks

| Hook | O que faz |
|------|-----------|
| `useOnboarding` | Estado do onboarding |
| `useCompleteOnboarding` | Mutation |

## §6. Schema

`users/{uid}` é atualizado com:
- `is_profile_complete: true`
- `role: 'adopter' | 'shelter' | 'volunteer' | 'partner'`
- `city`, `state`
- `terms_accepted_at`, `terms_version`

---

**Próximo**: `00-START-HERE.md` (volta ao início)
