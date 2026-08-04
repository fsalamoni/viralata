# 19-V4-PERSONAS-INDEX.md — Índice de Specs V4 (PERSONAS)

> **Atualizado em 2026-08-04**
>
> Cada `V4_*` documenta a especificação completa de uma feature V4
> (quarta geração) do Viralata. **V4 está implementado e em
> produção** com feature flag default OFF (D-PERSONA-FLAG-GRADUAL).

## §1. Specs V4 (Personas)

| Spec | Status | Implementação | Deploy |
|------|--------|---------------|--------|
| `docs/PLAN_PERSONAS_V4.md` (v1.1) | Done | `feature/v4-personas` | #1480 |
| `docs/EXEC_PLAN_V4_PERSONAS.md` | Done | mergeado no main | #1481 |

**Tamanho**: PLAN_PERSONAS_V4 = 1585 linhas (v1.1 com respostas owner)

## §2. Visão Geral

V4 Personas = sistema de personas dedicado que substitui a
abordagem monolítica "user = adotante" por 6 personas dedicadas:

| # | Persona | Status | Quando habilitado |
|---|---------|--------|-------------------|
| 1 | Adotante | ✅ Done | `V4_PERSONA_ADOPTER` |
| 2 | Doador | ✅ Done | `V4_PERSONA_DONOR` |
| 3 | Membro de Abrigo | ✅ Done | `V4_PERSONA_SHELTER_STAFF` |
| 4 | Membro de Comunidade | ✅ Done | `V4_PERSONA_COMMUNITY_STAFF` |
| 5 | Voluntário | ✅ Done | `V4_PERSONA_VOLUNTEER` |
| 6 | Platform Admin | ✅ Done | `V4_PERSONA_PLATFORM_ADMIN` |

**Multi-persona** (D-PERSONA-MULTI): user pode ter 1+ personas
habilitadas, 1 ativa por vez, troca instantânea
(D-PERSONA-SWITCH-NO-CONFIRM), 0 expiração
(D-PERSONA-NO-EXPIRATION).

## §3. Decisões aplicadas (25 D-PERSONA-*)

Todas em `13-DECISIONS.md §16`. Principais:

- **D-PERSONA-MULTI** (Q1): multi-persona simultânea, ortogonal
- **D-PERSONA-ONE-AT-A-TIME** (Q11): 1 ativa por vez
- **D-PERSONA-ONBOARDING-ONCE** (Q12): onboarding 1x por persona
- **D-PERSONA-SWITCH-NO-CONFIRM** (Q14): troca instantânea
- **D-PERSONA-SWITCHER-VISIBILITY** (Q15): SÓ se 2+ personas
- **D-PERSONA-FIRST-ACCESS-FORCED** (Q16): → `/acesso` após login
- **D-PERSONA-MULTI-CLUB** (Q17): abrigo 1+ abrigos (ShelterPicker)
- **D-PERSONA-MULTI-ROSTER-ISOLATED** (Q18): voluntário 1+ abrigos
- **D-PERSONA-MEMBERSHIP-INDEPENDENT** (Q19): sair de voluntário
- **D-PERSONA-PET-TRANSFER** (Q20): pet pessoal → abrigo, IRREVERSÍVEL
- **D-PERSONA-ORPHAN-PETS** (Q21): pets órfãos ocultos
- **D-PERSONA-ADMIN-CANNOT-DEMOTE** (Q22): admin NÃO se rebaixa
- **D-PERSONA-DONOR-EXPLICIT-CONFIRM** (Q2): modal explícito
- **D-PERSONA-FEED-EXCLUSIVE-ADOPTER** (Q4): feed SÓ no adotante
- **D-PERSONA-NAMES-UX** (Q10): labels canônicos
- **D-PERSONA-SWITCHER-INCOMPLETE-BADGE** (Q27): badge "Incompleto"
- **D-PERSONA-NO-EXPIRATION** (Q28): personas NÃO expiram
- **D-PERSONA-MIGRATION-AUTO** (Q29): pets → donor automático
- **D-PERSONA-FLAG-GRADUAL** (Q30): rollout 5 etapas
- **D-PERSONA-DONOR-ONBOARDING** (Q24): 9 campos
- **D-PERSONA-SHELTER-ENTRY** (Q25): código OU criar
- **D-PERSONA-VOLUNTEER-POOL** (Q26): POOL encontrável
- **D-PERSONA-ADOPTER-ONBOARDING** (Q23): wrapper legacy
- **D-PERSONA-ADMIN-OVERRIDE** (Q7, Q9): admin master
- **D-PERSONA-ADMIN-OWNER-ONLY** (Q8): apenas owner

## §4. Arquitetura

### §4.1. Schema Firestore (users/{uid})

```js
{
  // V3 legacy
  profile_completed: bool,
  role: 'user' | 'platform_admin',
  // ... outros campos legacy

  // V4 PERSONAS (D-PERSONA-MULTI)
  active_persona: 'adopter' | 'donor' | 'shelter_staff:clubId' | ...,
  personas_enabled: ['adopter', 'donor', 'shelter_staff:club_abc', ...],  // max 16

  // Donor persona (D-PERSONA-DONOR-ONBOARDING, Q24)
  donor_profile: {
    donor_motivation: '...',
    has_donated_before: bool,
    pets_count: number,
    experience_with_species: ['dogs', 'cats'],
    experience_years: number,
    donor_accepts_home_check: bool,
    donor_accepts_post_adoption_followup: bool,
    donor_preferred_contact_method: 'phone' | 'email' | 'whatsapp',
    donor_bio: '...',
  },
}
```

### §4.2. Hook principal: useActivePersona

```js
const { active, available, setActive, enablePersona, isLoading } = useActivePersona({
  signals: { petCount, hasVolunteerProfile },
});
// active: { key, type, scopeId, hasOnboarding }
// available: array de personas detectadas
// setActive: (personaKey) => Promise<void>
// enablePersona: (personaKey) => Promise<void>
```

### §4.3. Componentes principais

- **PersonaSwitcher** (TopBar) — dropdown só se 2+ personas
- **PersonaBottomTabBar** — BottomTabBar contextual por persona
- **PersonaGate** — route guard
- **ShelterPicker** (TopBar) — multi-club selector (Q17)
- **VolunteerShelterPicker** (TopBar) — multi-roster (Q18)

### §4.4. Telas de entrada

- `/acesso` — PersonaSelection (primeira escolha, Q11)
- `/entrar/abrigo` — ShelterEntry (Q25)
- `/entrar/comunidade` — CommunityEntry
- `/onboarding/adotante` — AdopterOnboarding (Q23)
- `/onboarding/doador` — DonorOnboarding (Q24, 9 campos)

### §4.5. Dashboards

- `/dashboard/doador` — DonorDashboard (stats + lista pets)
- `/voluntarios/pool` — VolunteerPool (Q26)
- `/admin/personas` — AdminPersonaView (admin master)

## §5. Ativação (Rollout Q30)

V4 está **default OFF** — zero impacto em produção.

```js
// Admin > Remote Config > adicionar:
V4_PERSONA_ENABLED = true
V4_PERSONA_ADOPTER = true
V4_PERSONA_DONOR = true
V4_PERSONA_SHELTER_STAFF = true
V4_PERSONA_COMMUNITY_STAFF = true
V4_PERSONA_VOLUNTEER = true
V4_PERSONA_PLATFORM_ADMIN = true
V4_PERSONA_SWITCHER = true
V4_PERSONA_SELECTION = true
V4_PERSONA_VOLUNTEER_POOL = true
V4_PERSONA_PET_TRANSFER = true
```

**Rollout gradual (D-PERSONA-FLAG-GRADUAL, Q30)**:
1. **1%** dos usuários (canary)
2. **5%** (validação)
3. **25%** (early adopters)
4. **50%** (maioria)
5. **100%** (todos)

Cada etapa: monitorar 1-2 dias antes de subir.

## §6. Métricas Finais

| Métrica | Valor |
|---|---|
| Componentes criados | 15 |
| Rotas novas | 8 |
| Testes unit | 65 |
| Testes integração | 14 |
| Decisões D-PERSONA-* | 25 |
| Bundle impact | 0 (flag OFF) |
| Bundle deployed | sw-v92.js (216 entries) |
| Deploys | #1480, #1481 |
| **Tests total passing** | **2487/2487** |
| **Lint V4** | **0 errors** |

## §7. Onde Está o Código

```
src/
├── core/
│   ├── domain/personas.js          # 6 personas, helpers
│   ├── services/personaService.js  # 10 funções públicas
│   └── hooks/useActivePersona.js   # hook principal
├── components/
│   ├── PersonaSwitcher.jsx
│   ├── PersonaBottomTabBar.jsx
│   ├── ShelterPicker.jsx
│   ├── VolunteerShelterPicker.jsx
│   └── guards/PersonaGate.jsx
├── pages/
│   ├── PersonaSelection.jsx        # /acesso
│   ├── DonorDashboard.jsx          # /dashboard/doador
│   ├── VolunteerPool.jsx           # /voluntarios/pool
│   └── onboarding/
│       ├── AdopterOnboarding.jsx
│       ├── ShelterEntry.jsx
│       ├── CommunityEntry.jsx
│       └── DonorOnboarding.jsx
└── modules/
    ├── admin/pages/AdminPersonaView.jsx
    ├── pets/components/PetTransferDialog.jsx
    └── organizations/hooks/useUserClubMemberships.js
```

## §8. Como Navegar

1. Quer entender a estrutura? → `docs/PLAN_PERSONAS_V4.md`
2. Quer ver execução? → `docs/EXEC_PLAN_V4_PERSONAS.md`
3. Quer saber de cada decisão? → `docs/AI_GUIDE/13-DECISIONS.md §16`
4. Quer saber hardening? → `docs/AI_GUIDE/15-RECENT-FIXES.md §12`
5. Quer ativar? → §5 desta página

## §9. Lição Aprendida (varredura 12 etapas)

Implementar V4 + **varredura completa pós-merge** encontrou 11 bugs
que escaparam dos testes:

1. **1 bug de segurança** (firestore rules sem validação de V4)
2. **1 bug de validação** (enablePersona sem checagem)
3. **8 bugs de lint** (imports não usados, diretivas órfãs)
4. **1 bug de a11y** (botões sem aria)

**SEMPRE** fazer varredura completa pós-merge:
- Bundle deployed
- Tests
- Lint
- Imports/exports
- Firestore rules
- Edge cases
- Feature flags
- Hooks order
- a11y
- Legacy compat
- Regressões
- Build

---

**Próxima leitura**: `13-DECISIONS.md §16` (decisões V4 detalhadas)
