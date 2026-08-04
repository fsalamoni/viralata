# EXEC_PLAN_V4_PERSONAS.md — Registro de Execução da V4 (Personas)

> **Status**: EM EXECUÇÃO
> **Início**: 2026-08-03
> **Autor**: Mavis (Claude Opus 4.8 mode)
> **Worktree**: `.worktrees/feature-v4-personas`
> **Branch**: `feature/v4-personas`
> **Documento-guia**: `docs/PLAN_PERSONAS_V4.md` (v1.1 — DEFINIÇÕES APROVADAS)

---

## §0. Estado de Execução por Fase

| Fase | Descrição | Status | Commit |
|---|---|---|---|
| **0** | Preparação (validação + feature flags) | ✅ DONE | (initial) |
| **1** | Schema de dados (personaService + useActivePersona) | ✅ DONE | (a705ccc6) |
| **2** | PersonaSwitcher + PersonaGate + PersonaBottomTabBar | ✅ DONE | (bdd400ef) |
| **3** | PersonaSelection + ShelterEntry + CommunityEntry + DonorOnboarding + App.jsx + Layout.jsx | ✅ DONE | (e5946da0) |
| **4** | Persona Adotante (AdopterOnboarding wrapper) | ✅ DONE | (2925fe93) |
| **5** | Persona Doador (DonorDashboard, PetTransferDialog, useUserClubMemberships) | ✅ DONE | (2925fe93) |
| **6** | Persona Membro de Abrigo (ShelterPicker) | ✅ DONE | (2925fe93) |
| **7** | Persona Membro de Comunidade (estrutura análoga) | 🟡 PARCIAL | — |
| **8** | Persona Voluntário (VolunteerShelterPicker, VolunteerPool) | ✅ DONE | (2925fe93) |
| **9** | Persona Platform Admin (AdminPersonaView) | ✅ DONE | (this commit) |
| 10 | Polimento e rollout (testes, docs finais) | 🟡 EM ANDAMENTO | — |
| 11 | Limpeza (remover legados) | ⏸ Pendente | — |

**Legenda**: ✅ Done | 🟡 Em andamento | ⏸ Pendente | ❌ Bloqueado

## §0.1. Resumo de Entregas (Fases 0-9)

**Componentes criados (15 arquivos):**
- `src/core/domain/personas.js` + `.test.js` (29 testes)
- `src/core/services/personaService.js` + `.test.js` (20 testes)
- `src/core/hooks/useActivePersona.js` + `.test.js` (6 testes)
- `src/components/PersonaSwitcher.jsx`
- `src/components/PersonaBottomTabBar.jsx`
- `src/components/guards/PersonaGate.jsx` + `.test.js` (10 testes)
- `src/components/ShelterPicker.jsx`
- `src/components/VolunteerShelterPicker.jsx`
- `src/pages/PersonaSelection.jsx`
- `src/pages/onboarding/{AdopterOnboarding,ShelterEntry,CommunityEntry,DonorOnboarding}.jsx`
- `src/pages/DonorDashboard.jsx`
- `src/pages/VolunteerPool.jsx`
- `src/modules/pets/components/PetTransferDialog.jsx`
- `src/modules/admin/pages/AdminPersonaView.jsx`
- `src/modules/organizations/hooks/useUserClubMemberships.js`

**Arquivos modificados (3):**
- `src/App.jsx`: 8 novas rotas, ONBOARDING_ALLOWED_PATHS expandido
- `src/components/Layout.jsx`: PersonaSwitcher + Pickers no TopBar, PersonaBottomTabBar condicional
- `src/core/featureFlags.js`: 11 flags V4_PERSONA_*

**Total de testes novos: 65** (29 personas + 20 personaService + 6 useActivePersona + 10 PersonaGate)

**Total de testes passing: 364+** (core) + 4 (Layout) + 65 (novos) = **~430 testes sem regressão**

---

## §1. Decisões D-PERSONA-* a Implementar

Total: **25 decisões**. Ver `docs/AI_GUIDE/13-DECISIONS.md §16`.

| # | Decisão | Fase |
|---|---|---|
| 1 | D-PERSONA-MULTI | 2 (auth/UX) |
| 2 | D-PERSONA-DONOR-EXPLICIT-CONFIRM | 5 (donor) |
| 3 | D-PERSONA-FEED-EXCLUSIVE-ADOPTER | 4 (adopter) |
| 4 | D-PERSONA-ADMIN-OVERRIDE | 9 (admin) |
| 5 | D-PERSONA-ADMIN-OWNER-ONLY | 9 (admin) |
| 6 | D-PERSONA-NAMES-UX | 3 (selection) |
| 7 | D-PERSONA-ONE-AT-A-TIME | 3 (selection) |
| 8 | D-PERSONA-ONBOARDING-ONCE | 2/4-8 (onboarding) |
| 9 | D-PERSONA-SWITCH-NO-CONFIRM | 2 (switcher) |
| 10 | D-PERSONA-SWITCHER-VISIBILITY | 2 (switcher) |
| 11 | D-PERSONA-FIRST-ACCESS-FORCED | 3 (selection) |
| 12 | D-PERSONA-MULTI-CLUB | 6 (shelter) |
| 13 | D-PERSONA-MULTI-ROSTER-ISOLATED | 8 (volunteer) |
| 14 | D-PERSONA-MEMBERSHIP-INDEPENDENT | 6/8 (shelter+volunteer) |
| 15 | D-PERSONA-PET-TRANSFER | 5 (donor) |
| 16 | D-PERSONA-ORPHAN-PETS | 5 (donor) + 9 (admin) |
| 17 | D-PERSONA-ADMIN-CANNOT-DEMOTE | 9 (admin) |
| 18 | D-PERSONA-ADOPTER-ONBOARDING | 4 (adopter) |
| 19 | D-PERSONA-DONOR-ONBOARDING | 5 (donor) |
| 20 | D-PERSONA-SHELTER-ENTRY | 6 (shelter) |
| 21 | D-PERSONA-VOLUNTEER-POOL | 8 (volunteer) |
| 22 | D-PERSONA-SWITCHER-INCOMPLETE-BADGE | 2/3 (switcher) |
| 23 | D-PERSONA-NO-EXPIRATION | N/A (sem código) |
| 24 | D-PERSONA-MIGRATION-AUTO | 1 (schema) |
| 25 | D-PERSONA-FLAG-GRADUAL | 0 (flag) |

---

## §2. Componentes Novos a Criar

| Componente | Caminho | Fase | Status |
|---|---|---|---|
| `useActivePersona` hook | `src/core/hooks/useActivePersona.js` | 2 | ⏸ |
| `PersonaSwitcher` | `src/components/PersonaSwitcher.jsx` | 2 | ⏸ |
| `PersonaGate` | `src/components/guards/PersonaGate.jsx` | 2 | ⏸ |
| `PersonaBottomTabBar` | `src/components/PersonaBottomTabBar.jsx` | 2 | ⏸ |
| `PersonaSelection` page | `src/pages/PersonaSelection.jsx` | 3 | ⏸ |
| `ShelterPicker` | `src/components/ShelterPicker.jsx` | 6 | ⏸ |
| `CommunityPicker` | `src/components/CommunityPicker.jsx` | 7 | ⏸ |
| `VolunteerShelterPicker` | `src/components/VolunteerShelterPicker.jsx` | 8 | ⏸ |
| `DonorOnboarding` | `src/pages/onboarding/DonorOnboarding.jsx` | 5 | ⏸ |
| `ShelterEntry` | `src/pages/onboarding/ShelterEntry.jsx` | 6 | ⏸ |
| `CommunityEntry` | `src/pages/onboarding/CommunityEntry.jsx` | 7 | ⏸ |
| `VolunteerPool` page | `src/pages/VolunteerPool.jsx` | 8 | ⏸ |
| `PetTransferDialog` | `src/modules/pets/components/PetTransferDialog.jsx` | 5 | ⏸ |

---

## §3. Mudanças em Arquivos Existentes

| Arquivo | Mudança | Fase |
|---|---|---|
| `src/core/lib/FirebaseAuthContext.jsx` | + active_persona, personas_enabled, setActivePersona | 2 |
| `src/core/featureFlags.js` | + V4_PERSONA_ENABLED, V4_PERSONA_*, D-PERSONA-FLAG-GRADUAL | 0 |
| `src/components/Layout.jsx` | integrar PersonaSwitcher no TopBar | 2 |
| `src/components/BottomTabBar.jsx` | delegar para PersonaBottomTabBar | 2 |
| `src/App.jsx` | PersonaGate, rotas /acesso, /entrar/abrigo, etc. | 2/3 |
| `src/modules/onboarding/pages/OnboardingQuestionnaire.jsx` | renomear para AdopterOnboarding | 4 |
| `firestore.rules` | novos helpers se necessário | 1 |

---

## §4. Subcoleções Novas

- `users/{uid}/adopter_profile/main` (cache do perfil adotante)
- `users/{uid}/donor_profile/main` (NOVO, perfil doador)
- `users/{uid}/shelter_memberships/{clubId}` (cache da membership)
- `users/{uid}/community_memberships/{communityId}` (cache)
- `users/{uid}/volunteer_profile/main` (já existe)
- `volunteer_pool/{uid}` (NOVO, para Q26)

---

## §5. Cronograma de Commits

Por fase, múltiplos commits pequenos com mensagens descritivas
padrão `feat(v4-personas): ...` ou `docs(v4-personas): ...`.

---

## §6. Log de Execução (atualizar conforme avança)

### 2026-08-03 — Início

- ✅ Worktree `feature/v4-personas` criado
- ✅ `node_modules` linkado
- ✅ Documento `EXEC_PLAN_V4_PERSONAS.md` criado
- 🟡 Fase 0 em andamento (feature flags)
