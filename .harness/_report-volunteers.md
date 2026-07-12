# Relatório Agente A — VOLUNTÁRIOS (Regra A 5 eixos)

**Data:** 2026-07-11
**Worktree:** D:\viralata\.worktrees\wt-e79e15ca
**Sessão:** mvs_311d078987d0414a90f57ef28b789b18
**Frente:** VOLUNTÁRIOS
**Status:** ✅ Concluído (READ-ONLY)
**Escopo da pesquisa:** módulo `src/modules/shelter/`, `src/modules/organizations/`, `src/modules/pets/`, `src/pages/`, `firestore.rules`, `firestore.indexes.json`, `functions/`, `.harness/SCRUM_TASKS.json`.

---

## Resumo executivo

- **Total de eixos avaliados:** 5 (UX · Papéis · Regras · Integrações · Pós-Deploy)
- **Cobertura atual estimada:** ~ **55%** (modelo de dados + services + regras de negócio + UI admin prontos; **falta UI pública, perfil do usuário, atribuições finas, integrações e pós-deploy**).
- **Gaps identificados:** **25** (10 críticos/blockers, 8 altos, 5 médios, 2 baixos).
- **Tasks novas propostas:** **25** (sucessoras de TASK-231).
- **Blockers:** **5** (UX público sem CTA, perfil sem seção, VolunteerProfileForm órfã, JoinVolunteerModal ausente, atribuições finas por voluntário inexistentes).
- **Estado atual:** módulo `shelter/` já tem **Fase 13 implementada e testada** (perfil global + roster per-shelter + participations + termo v2 + Zod + audit + Firestore rules com return explícito). **A grande lacuna é a UX de ponta-a-ponta** (página pública sem CTA, perfil sem seção, vitrine não usa participations ativamente, sem atribuições finas por voluntário, sem FCM, sem smart-search de voluntários, sem Cloud Function de boas-vindas).

---

## 1. UX (User Experience)

### ✅ O que existe

| Arquivo | O que cobre |
|---|---|
| `src/modules/shelter/components/VolunteersRoster.jsx:188` | Roster de voluntários no painel admin do abrigo, com filtros por status, badges de background check, ações (pausar/retomar/bloquear/saída/excluir), empty/loading states e error boundary via `SafeTab` (OrganizationAdminPanel.jsx:368) |
| `src/modules/shelter/components/VolunteerProfileForm.jsx:277` | Formulário de perfil do voluntário (skills, availability, radius, transporte, notas) **+ aceite do termo (LGPD) embutido** com snapshot versionado. Empty/loading states OK |
| `src/modules/shelter/components/ParticipationForm.jsx:197` | Form de participation (registrar turno de voluntário em evento) — pelo abrigo |
| `src/modules/shelter/components/ParticipationsList.jsx:149` | Lista de participations com check-in/out self-service, badges de status, totais de horas, filtro por voluntário |
| `src/modules/organizations/pages/OrganizationAdminPanel.jsx:367-371` | Aba "Voluntários" gated por `SHELTER_VOLUNTEERS + SHELTER_FOUNDATION` |
| `src/modules/shelter/domain/operational/indicators.js:21-23` | Tipos de indicadores `volunteer_summary` + `volunteer_detail` prontos (Fase 17) |
| `src/modules/shelter/domain/operational/volunteerProfile.js:382-387` | `canVolunteerParticipate(rosterEntry)` — helper de gating |
| `src/modules/shelter/components/ExhibitionForm.jsx:213-220` | Toggle "Precisa de voluntários" no form de criação de vitrine (Fase 11) |
| `src/modules/shelter/components/ExhibitionDetails.jsx:515-583` | Escalas (shifts) exibidas quando `requires_volunteers=true` |
| Mobile / a11y | Cards em `VolunteersRoster` usam `flex-col sm:flex-row`, badges têm contraste alto, navegação por teclado nativa (shadcn/ui). **Mas:** ausência de `aria-label` específico em ações (só o texto do botão). |

### ❌ Gaps

- **[GAP-UX-01] Página pública do abrigo SEM CTA "Quero ser voluntário"** — `src/modules/organizations/pages/ClubDetail.jsx:35-42` lista apenas 6 abas (Visão Geral, Animais, Mural, Doações, Prestação de Contas, Equipe). **Nenhuma aba "Voluntários" pública, nenhum botão de "Quero ser voluntário" no cover**. Visitante só consegue entrar via `pedir para ingressar` (que é para virar MEMBRO do abrigo, não voluntário).
- **[GAP-UX-02] VolunteerProfileForm é componente ÓRFÃO** — `Select-String` confirma que é importado **apenas em `AdminDebugPage.jsx` e `PublicDebugPage.jsx` (páginas de debug)**. **Não há rota em `src/App.jsx` nem uso em `src/pages/Profile.jsx`** para o usuário editar seu próprio perfil de voluntário. O usuário logado não tem como acessar essa UI.
- **[GAP-UX-03] Perfil do usuário SEM seção de voluntário** — `src/pages/Profile.jsx:470` cobre apenas "Dados pessoais" + "Perfil de adotante" + "Privacidade e dados". **Nenhuma menção a voluntariado** (skills, availability, rostagem por abrigo, histórico de participations).
- **[GAP-UX-04] Sem `useJoinShelterAsVolunteer` invocado em nenhum lugar** — hook existe em `src/modules/shelter/hooks/useVolunteerProfile.js:81`, mas **nenhum componente chama `mutateAsync`**. A action `joinShelterAsVolunteer` está implementada no service, mas **não tem front-end trigger** (modal, página dedicada, deep link).
- **[GAP-UX-05] Sem UI de atribuições finas (assignments) por voluntário** — não há componente de matriz `(voluntário × role/tarefa)` para o abrigo atribuir voluntário a atividades específicas (ex: "Maria → banho e tosa", "João → transporte"). O modelo `volunteerProfile.js:86-100` define `VOLUNTEER_PARTICIPATION_ROLES`, mas a atribuição é só por participation (turno-evento), não por capability persistente.
- **[GAP-UX-06] Vitrine (exhibition) tem `requires_volunteers` mas não usa `volunteer_participations`** — `ExhibitionDetails.jsx:515-583` mostra scales (shifts) com `slots_total/slots_filled` mas **nenhuma UI de vincular participations existentes ou recrutar voluntários**. O `ParticipationForm.jsx:139-162` aceita `exhibition_id` mas é chamado pelo abrigo manualmente, não integrado ao fluxo da vitrine.
- **[GAP-UX-07] Sem empty/loading states em "Meu perfil de voluntário"** — porque a UI não existe (ver GAP-UX-02).
- **[GAP-UX-08] Smart Search (Fase 18) NÃO inclui `volunteer` como entidade** — `src/modules/shelter/domain/search/search.js:42-121` define entidades: pet, adopter, shelter, foster, exhibition. **Voluntário não é pesquisável** (não há `SEARCH_ENTITIES.volunteer`).
- **[GAP-UX-09] Página pública do abrigo (ClubDetail) sem badge/contagem de voluntários ativos** — seria natural mostrar "12 voluntários" no cover.
- **[GAP-UX-10] Falta a11y: `aria-label` específico em ações de admin do roster** — `VolunteersRoster.jsx:148-178` usa texto nos botões (OK), mas a navegação por teclado para a checkbox de filtro de status pode pular sem ordem explícita (falta `aria-controls` ligando tabs).

---

## 2. Papéis (Roles)

### ✅ O que existe

| Arquivo | Permissão / helper |
|---|---|
| `firestore.rules:935-970` | `clubs/{clubId}/volunteers/{uid}`: read = abrigo OU próprio voluntário; create = abrigo OU auto-join; update = abrigo OU self-pausar/retomar; delete = platform_admin |
| `firestore.rules:982-1018` | `clubs/{clubId}/volunteer_participations/{id}`: read = abrigo OU próprio; create = abrigo; update = abrigo OU self check-in/out; delete = platform_admin |
| `firestore.rules:186-191` | `users/{uid}/volunteer_profile/main`: read = próprio + platform_admin; create = próprio; update = próprio; delete = próprio + platform_admin |
| `src/modules/organizations/domain/permissions.js:46-56` | `hasClubPermission()` cobre `animals` (usado nas rules de volunteers) — **owner, admin com permissions, ou membro com `animals: true`** |
| `src/modules/shelter/services/volunteerProfileService.js:75-78` | Defense-in-depth: `actor.uid !== uid` → throw "Apenas o próprio voluntário pode editar o perfil" |
| `src/modules/shelter/domain/operational/volunteerProfile.js:382-387` | `canVolunteerParticipate(rosterEntry)` — usado em `ParticipationsList.jsx:93` para gating |
| `src/modules/shelter/components/VolunteersRoster.jsx:49` | Aceita prop `canAbriho` (admin do abrigo) — renderiza ações só para admin |

### ❌ Gaps

- **[GAP-ROLES-01] Sem permissão granular `volunteers:read|apply|manage_status|bg_check|bulk|delete`** — `src/modules/organizations/domain/permissions.js` define apenas `ANIMALS, FINANCE, DONATIONS, FEED, TEAM`. **Não há chave `VOLUNTEERS`**. Hoje, o que dá acesso é a permissão `animals` (usada como proxy), o que é confuso. A regra de "quem gerencia voluntários" deveria ser `volunteers:manage`, separada de `animals:manage`.
- **[GAP-ROLES-02] Sem UI helper `canManageVolunteers(club, membership, uid)`** — espelho de `canManageClubTeam`. Hoje o admin panel passa `canAbriho` boolean direto (`OrganizationAdminPanel.jsx:369`), mas falta a função reutilizável para reusar em outros pontos (ex: card na Home do abrigo, indicadores).
- **[GAP-ROLES-03] Papel `volunteer` não existe formalmente** — `users` tem apenas `role: 'user' | 'platform_admin'`. Voluntário é um **atributo derivado** (presença de `users/{uid}/volunteer_profile/main`). Para gates de UI (ex: mostrar tab "Minhas participations" só para voluntários), falta um helper `isVolunteer(uid)` cacheado.
- **[GAP-ROLES-04] `team_member` (membro comum) sem permissão para gerenciar voluntários** — `hasClubPermission(club, member, 'volunteers', uid)` falha silenciosamente hoje (porque a chave não existe). A regra de "equipe do abrigo pode adicionar voluntário" precisa ser explícita.
- **[GAP-ROLES-05] Sem smoke test cross-role documentado** — não há `tests/` específico para verificar comportamento de cada papel. Testes unitários cobrem service, mas o fluxo end-to-end (visitante → CTA → signup → admin aprova → voluntário logado vê dashboard) não tem cobertura.
- **[GAP-ROLES-06] Sem papel `system` para Cloud Functions de voluntário** — `functions/index.js` não tem triggers `onVolunteerCreated`, `onVolunteerApproved`, `onVolunteerAssigned` (ver GAP-INT-*).

---

## 3. Regras de Negócio (Business Rules)

### ✅ O que existe

| Arquivo | Regra |
|---|---|
| `src/modules/shelter/domain/operational/volunteerProfile.js:133-202` | Schemas Zod rigorosos: `volunteerProfileSchema`, `upsertVolunteerProfileSchema`, `acceptVolunteerTermsSchema`, `shelterVolunteerRosterSchema`, `joinShelterAsVolunteerSchema`, `updateShelterVolunteerSchema`, `volunteerParticipationSchema` — todos com `.strict()`, refinements e limites de tamanho |
| `src/modules/shelter/domain/operational/volunteerProfile.js:289-330` | `assertValidVolunteerStatusTransition` + `assertValidBgCheckTransition` — state machines com transições proibidas |
| `src/modules/shelter/services/volunteerProfileService.js:94-103, 141-154, 279-292, 350-358, 392-396` | `createAuditLog` em todas as mutações: `volunteer_profile_created/updated`, `volunteer_terms_accepted`, `volunteer_joined_shelter`, `volunteer_roster_updated`, `volunteer_roster_deleted` — com `details` contendo uid + shelter_club_id + fields |
| `src/modules/shelter/services/volunteerProfileService.js:165-175` | **Hash simples (não-criptográfico) de signature_text** gravado no audit log em vez do nome em claro — minimização LGPD |
| `src/modules/shelter/services/volunteerProfileService.js:81-92` | Multi-tenant: o perfil global é do próprio user, o snapshot para `clubs/{clubId}/volunteers/{uid}` é desnormalizado (defense-in-depth + LGPD) |
| `src/modules/shelter/services/volunteerProfileService.js:239-251` | Cross-tenant blocked: valida que `parsed.terms_version === VOLUNTEER_TERMS_VERSION` e que profile global tem `terms_accepted_at` |
| `src/modules/shelter/services/volunteerProfileService.js:319-321` | `prev.shelter_club_id !== shelterClubId` → throw |
| `firestore.rules:186-191` | `volunteer_profile`: apenas próprio user lê/escreve; platform_admin debug |
| `firestore.rules:923-1018` | `volunteers` e `volunteer_participations` com `return` explícito, multi-tenant, write-once em `shelter_club_id/volunteer_uid` |
| `firestore.indexes.json:165-170` | Indexes compostos: `volunteers(status,volunteer_name)` e `volunteer_participations(volunteer_uid,event_date)` + `volunteer_participations(exhibition_id,event_date)` |

### ❌ Gaps

- **[GAP-REGRAS-01] Sem rate limit em `joinShelterAsVolunteer`** — qualquer user pode se adicionar em N abrigos via spam (regra: limite de 5 tentativas/min, 20/shelter, audit log de tentativas suspeitas). Falta.
- **[GAP-REGRAS-02] Snapshot mutável em `volunteer_participations`** — schema permite update de `event_label`, `event_date`, `notes`, `role`, etc. **Falta marcar `event_type`, `shelter_club_id`, `volunteer_uid` como imutáveis na regra do Firestore (estão — linha 1007-1009) mas falta um helper `assertParticipationImmutableFields` no service** que valide ANTES de chamar o client. Em caso de bypass via Admin SDK ou bug, a defense-in-depth fica no Firestore.
- **[GAP-REGRAS-03] Sem LGPD: delete voluntário + anonimização** — `deleteShelterVolunteer` (line 378) faz **hard delete** sem anonimizar PII em collections adjacentes (audit_logs, volunteer_participations). A regra de "direito ao esquecimento" (LGPD art. 18) precisa de um soft-delete + tombstone (5 anos) OU anonimização massiva via Cloud Function.
- **[GAP-REGRAS-04] Sem LGPD: export de dados do voluntário** — `exportMyData` (em `src/core/services/dataExportService.js`) provavelmente cobre user_profile mas **não inclui `volunteer_profile` + todas as rostagens + participations**. Falta testar/garantir.
- **[GAP-REGRAS-05] BG check é "per-shelter" mas `background_check_notes` não tem limite LGPD** — schema permite 1000 chars, ok, mas **falta versionar histórico de BG check** (aprovado → rejeitado → aprovado: perde contexto).
- **[GAP-REGRAS-06] `terms_accepted_at` pode ser REESCRITO silenciosamente** — o service `acceptVolunteerTerms` (line 116-162) sobrescreve a data se a versão bater. A regra do Firestore (line 188-190) **NÃO bloqueia update do campo `terms_accepted_at`** (só restringe create ao próprio user). Para "imutabilidade legal pós-aceite" (Lei 14.063/2020), o ideal seria mover para `terms_acceptances/{id}` (já existe o match no firestore.rules:205, mas o service de voluntário NÃO usa — usa o campo direto no profile).
- **[GAP-REGRAS-07] `volunteer_profile` index com `display_name`** — `firestore.indexes.json:188-193` declara `volunteer_profiles` (collectionGroup) com `(shelter_club_id, display_name)`. **Mas o doc real é em `users/{uid}/volunteer_profile/main`** (subcoleção com id fixo "main", não collectionGroup). Esse index está **errado/órfão** — collectionGroup `volunteer_profiles` não bate com a estrutura. **É um bug**: ou o nome do índice está errado, ou foi planejado para uma estrutura futura não implementada.
- **[GAP-REGRAS-08] `volunteer_profiles` index VIOLA a regra §1.3** — "Single-field `collectionGroup` NUNCA declarar em `firestore.indexes.json`". O índice atual é de 2 campos, então OK tecnicamente, mas está em collectionGroup `volunteer_profiles` que **não corresponde a nenhuma coleção real** (é subcoleção `volunteer_profile` com typo). **Ação:** remover ou corrigir.
- **[GAP-REGRAS-09] `notes` do voluntário sem rate limit** — usuário pode salvar o mesmo texto 1000x/seg. Firestore não bloqueia, mas há risco de DoS financeiro.

---

## 4. Integrações (Integrations)

### ✅ O que existe

| Arquivo | Integração |
|---|---|
| `src/modules/shelter/services/volunteerProfileService.js:23, 94, 141, 279, 350, 392` | `createAuditLog` do `core/services/auditService.js` — escrito em `audit_logs` collection |
| `src/modules/shelter/services/volunteerParticipationService.js:22, 119-130` | Audit log em `volunteer_participation_created/updated/check_in/check_out` |
| `src/modules/shelter/domain/legal/volunteerTerms.js:38` | Texto integral do termo em `texts/volunteerTerms.v2.js` (3-5 telas) |
| `src/modules/shelter/domain/legal/texts/volunteerTerms.v2.js` | Termo v2 com LGPD + Lei 14.063/2020 — texto integral |
| `firestore.rules:186-191, 205-210, 935-1018` | Rules multi-tenant com audit trail imutável |

### ❌ Gaps

- **[GAP-INT-01] SEM Cloud Function `onVolunteerCreate` (email boas-vindas)** — `functions/index.js` lista `adminAlerts, galleryPurgeCron, googleFormsWebhook, matching, platformHealthCron, postAdoptionCron, securityAlerts`. **Nenhuma trigger de voluntário.** Falta: ao aceitar o termo, enviar email "Bem-vindo, ${nome}! Obrigado por se voluntariar."
- **[GAP-INT-02] SEM Cloud Function `onVolunteerJoinedShelter` (FCM ao admin do abrigo)** — quando voluntário entra na rostagem, admin do abrigo não recebe push nem email. Falta.
- **[GAP-INT-03] SEM Cloud Function `onVolunteerAssigned` (FCM ao voluntário)** — quando participation é criada/atribuída, voluntário não recebe push com detalhes (data, local, role). Falta.
- **[GAP-INT-04] SEM Cloud Function `onBgCheckApproved` (FCM ao voluntário + email)** — quando abrigo aprova BG check, voluntário não é notificado que "está liberado". Falta.
- **[GAP-INT-05] SEM Cloud Function `onParticipationCheckIn`** — quando voluntário faz check-in, abrigo não é notificado em tempo real. Falta.
- **[GAP-INT-06] SEM Cloud Function `dailyDigest` de voluntários** — admin do abrigo não recebe "Resumo diário: 3 novos candidatos, 2 BG checks pendentes, 5 participations esta semana". Existe para outros (matching), mas não para voluntários.
- **[GAP-INT-07] SEM Storage: upload de documentos (RG, CPF, atestado)** — schema não tem campo para `documents[]` com URL do Storage. **Para abrigos que exigem BG check, o voluntário precisa subir docs**. Falta: schema + service + rule + UI.
- **[GAP-INT-08] SEM Storage: termo assinado em PDF** — `signature_text` é só uma string digitada. Para "prova legal" completa (Lei 14.063/2020), o ideal é gerar PDF com timestamp + hash e gravar em Storage. **Opcional mas desejável.**
- **[GAP-INT-09] SEM Google Forms: import de voluntários** — `GoogleFormsConfigPanel` e `googleFormsService` (Fase 5) existem para adotantes. **Falta o equivalente para voluntários** (alguns abrigos coletam cadastro via Google Forms público).
- **[GAP-INT-10] SEM Search index de voluntários** — `search.js` não tem `SEARCH_ENTITIES.volunteer` (ver GAP-UX-08). Falta adicionar: `collection: 'clubs/{shelterId}/volunteers'` (com snapshot denormalizado de nome), searchable fields `volunteer_name, volunteer_email, notes`, `isPublic: false`, `requireShelterId: true`.
- **[GAP-INT-11] SEM email template "Termo aceito"** — ver GAP-INT-01.
- **[GAP-INT-12] SEM email template "BG check aprovado"** — ver GAP-INT-04.
- **[GAP-INT-13] SEM Analytics: funil de voluntário** — `recordPageView` é genérico, mas falta evento `volunteer_signup_started`, `volunteer_terms_accepted`, `volunteer_joined_shelter`, `volunteer_first_participation`. Firebase Analytics + custom metrics.
- **[GAP-INT-14] SEM Sentry: instrumentação de erros de volunteer** — `src/core/services/observabilityService.js` (Fase 21) é genérico, mas falta tag `domain:volunteer` para separar alertas de erros de voluntário dos demais.

---

## 5. Estado Pós-Deploy (Production State)

### ✅ O que existe

| Arquivo | Estado |
|---|---|
| `src/modules/shelter/domain/constants.js:27-90` | `SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS` + `SHELTER_VOLUNTEER_PROFILE_V1` declaradas, default OFF |
| `src/modules/shelter/domain/constants.js:191-210` | `SHELTER_FEATURE_FLAG_META` com `label` + `description` ricos para o painel `/admin/flags` |
| `src/modules/shelter/domain/constants.js:293-297` | `DEFAULT_SHELTER_FLAGS` — todos OFF |
| `src/modules/organizations/pages/OrganizationAdminPanel.jsx:142, 192-194` | `useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS)` — gating da aba "Voluntários" no admin |
| `src/modules/shelter/components/VolunteersRoster.jsx:7` | `Feature flag: shelter_volunteer_profile_v1` (default OFF) — JSDoc |
| `src/modules/shelter/components/VolunteerProfileForm.jsx:10` | Mesma flag documentada |
| `src/core/featureFlags.js` (referenciado em constants.js:17) | Estrutura de feature flags centralizada com `FEATURE_FLAG` enum |

### ❌ Gaps

- **[GAP-DEPLOY-01] Sem `scripts/smoke-prod.mjs` específico para voluntários** — `scripts/smoke-routes.mjs` (Fase 25) cobre 25 rotas, mas não há `smoke-volunteer.mjs` que rode fluxo end-to-end: signup → terms → join abrigo → admin aprova → check-in.
- **[GAP-DEPLOY-02] Sem documentação de rollback** — `docs/DELIVERABLE.md` provavelmente cobre o que foi entregue, mas **falta plano explícito de rollback** ("se quebrar X, desabilitar flag Y e rodar script Z").
- **[GAP-DEPLOY-03] Sem Sentry/observability dedicado** — ver GAP-INT-14.
- **[GAP-DEPLOY-04] Sem bundle hash no PR** — o `commit conventional` pede bundle hash mas não há script automatizado que adicione ao PR. Fora do escopo direto de voluntários mas relevante.
- **[GAP-DEPLOY-05] Sem DPO review específica para voluntários** — `docs/AGENTS_CHANGELOG.md` ou `docs/AGENTS_LGPD.md` (se existir) não menciona revisão DPO desta feature. A assinatura de termo foi feita na Fase 19 (Legal v1) mas falta uma nota de "DPO aprovou fluxo de voluntário em DATA".
- **[GAP-DEPLOY-06] Sem monitor de métrica "conversion rate voluntário"** — quantos visitantes do abrigo clicam em "Quero ser voluntário" / quantos completam signup / quantos ficam ativos após 30 dias. Funil não instrumentado.
- **[GAP-DEPLOY-07] Sem flag específica para UI pública de voluntários** — hoje, a flag `SHELTER_VOLUNTEERS` esconde TUDO (admin + futuro público). Falta `SHELTER_VOLUNTEERS_PUBLIC` separada para fazer canário em 1 abrigo só na UI pública.
- **[GAP-DEPLOY-08] Sem alarme de "0 voluntário ativo há 30 dias"** — para detectar abrigos "estagnados".

---

## Tasks novas propostas (ordenadas por prioridade)

> IDs sucessor de TASK-231. Faixa: **TASK-232 a TASK-256** (25 tasks). Nenhuma delas foi adicionada ao SCRUM_TASKS.json (READ-ONLY) — só estruturadas aqui para o orquestrador consolidar.

### 🔴 BLOCKERS (impedem `done` da feature)

| ID | Título | Tipo | Priority | Eixo | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|
| TASK-232 | CTA "Quero ser voluntário" na página pública do abrigo | feature | critical | 1-ux | [] | Adicionar tab "Voluntários" pública em `src/modules/organizations/pages/ClubDetail.jsx` + botão no cover. Mostrar: contagem de voluntários ativos, chamada de "Precisamos de voluntários para X/Y/Z" configurável pelo abrigo, botão CTA que abre modal de signup (gated por `isAuthenticated`). Se não autenticado, redireciona a `/login?next=...`. Mobile + a11y (focus trap, aria-live). Empty state: "Seja o primeiro voluntário!". Loading: skeleton. |
| TASK-233 | Modal/Botão de inscrição de voluntário (JoinVolunteerModal) | feature | critical | 1-ux | [TASK-232] | Criar `src/modules/shelter/components/JoinVolunteerModal.jsx`. Usa `useJoinShelterAsVolunteer` (já existe em `useVolunteerProfile.js:81`). Mostra: aceite do termo (botão "Li e aceito" com link para `/legal/termo-voluntariado`), campos de skills, availability, radius. Se user já tem `users/{uid}/volunteer_profile/main`, pré-popula. Se NÃO tem, mostra passo 1 (termo) → passo 2 (perfil) → passo 3 (confirmar). On success, toast + invalida `useShelterVolunteers` (já feito pelo hook). |
| TASK-234 | Seção "Voluntário" em Profile.jsx | feature | critical | 1-ux | [] | Adicionar nova `Card` em `src/pages/Profile.jsx` com: badge "Sou voluntário" se `users/{uid}/volunteer_profile/main` existe, link "Tornar-me voluntário" se NÃO, e `<VolunteerProfileForm uid={user.uid} actor={user} onSaved={refreshProfile} />` se já é. Empty state: "Você ainda não é voluntário — descubra como ajudar abrigos próximos." Aceita o termo se versão mudou (banner amarelo). |
| TASK-235 | Rota `/perfil/voluntario` dedicada | feature | critical | 1-ux | [TASK-234] | Criar `src/pages/VolunteerProfile.jsx` (lazy em `App.jsx`) com rota `/perfil/voluntario`. Mostra: `<VolunteerProfileForm>`, lista de abrigos onde é voluntário (`useMyShelterMembershipsAsVolunteer` — hook novo), histórico de participations (cards por abrigo com totais de horas), botão "Sair do abrigo" por abrigo. |
| TASK-236 | Permissão granular `volunteers:read/apply/manage_status/bg_check/bulk/delete` | refactor | critical | 2-roles | [] | (a) Adicionar chaves em `src/modules/organizations/domain/constants.js`: `CLUB_PERMISSION.VOLUNTEERS = 'volunteers'`. (b) Atualizar `hasClubPermission` para reconhecer. (c) Atualizar `PERMISSION_DESCRIPTIONS` em `ClubTeamTab.jsx` + renderizar nova toggle na grade. (d) Atualizar `firestore.rules` para usar `hasClubPermission(clubId, 'volunteers')` em vez de `'animals'` nas regras de `volunteers` e `volunteer_participations`. (e) Testar: owner pode, member com `volunteers:true` pode, sem permissão é bloqueado. |

### 🟠 CRITICAL (LGPD, security, multi-tenant)

| ID | Título | Tipo | Priority | Eixo | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|
| TASK-237 | Cloud Function `onVolunteerJoinedShelter` (FCM admin + email boas-vindas) | feature | critical | 4-int | [] | Trigger Firestore `onCreate` em `clubs/{clubId}/volunteers/{uid}`. (a) FCM para todos admins do abrigo (topic `shelter-{clubId}-admins`). (b) Email via SendGrid/Resend template `volunteer-welcome-v1` (criar template). (c) Grava `notifications/{auto}` para o admin. (d) Audit log. (e) Idempotente (skip se `notif_sent_at` já existe). (f) Flag-gated por `SHELTER_VOLUNTEER_NOTIFY_V1` default OFF. |
| TASK-238 | Cloud Function `onVolunteerParticipationCreated` (FCM ao voluntário) | feature | critical | 4-int | [] | Trigger `onCreate` em `clubs/{clubId}/volunteer_participations/{id}`. (a) FCM para `volunteer_uid` com payload `{title, event_label, event_date, role, url}`. (b) Adiciona ao calendar (escrita em `volunteer_uid/calendar/{id}` subcollection ou via Google Calendar API). (c) Email template `volunteer-shift-confirmed-v1`. (d) Audit log. |
| TASK-239 | Cloud Function `onBgCheckApproved` (FCM ao voluntário) | feature | critical | 4-int | [] | Trigger `onUpdate` em `clubs/{clubId}/volunteers/{uid}` quando `background_check_status` muda para `approved`. FCM para `volunteer_uid`: "BG check aprovado! Você já pode participar de eventos." Email template `bg-check-approved-v1`. Audit log. |
| TASK-240 | Storage: upload de documentos de voluntário (RG, CPF, atestado) | feature | critical | 4-int | [] | (a) Schema: `clubs/{clubId}/volunteers/{uid}/documents/{docId}` (subcoleção) com `{type, file_url, file_name, mime_type, uploaded_at, expires_at}`. (b) Service: `uploadVolunteerDocument` valida mime (`image/jpeg,png,pdf`), tamanho (max 10MB), tipo (`['rg', 'cpf', 'medical_cert', 'address_proof', 'other']`). (c) Rule: read = próprio + abrigo com `volunteers:read`; create = próprio; update = abrigo com `volunteers:manage`; delete = próprio + platform_admin. (d) UI: tab "Documentos" no admin + upload widget no perfil. (e) LGPD: retention 5 anos pós-sai. |
| TASK-241 | Soft-delete voluntário + anonimização LGPD (art. 18) | feature | critical | 3-regras | [] | (a) Adicionar campo `deleted_at`, `anonymized_at`, `pseudonym_uid` em `clubs/{clubId}/volunteers/{uid}`. (b) Função `softDeleteVolunteer` (Cloud Function, Admin SDK): marca `deleted_at`, anonimiza PII (name → "Voluntário #{shortId}", email/phone → null, signature_text → null, mantém FKs para histórico). (c) Função `eraseMyVolunteerData` (Cloud Function): apaga `users/{uid}/volunteer_profile/main` + todas as rostagens + participations + documents. (d) API: `DELETE /api/volunteer/me` (autenticado). (e) Audit log da anonimização. (f) Regra do Firestore: read em roster com `deleted_at` → 403 exceto platform_admin. |

### 🟡 HIGH (UX público, mobile, a11y, polish)

| ID | Título | Tipo | Priority | Eixo | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|
| TASK-242 | Smart Search: adicionar entidade `volunteer` | feature | high | 4-int | [] | Em `src/modules/shelter/domain/search/search.js`: adicionar `volunteer: { collection: 'volunteers', pathType: 'subcollection', parentCollection: 'clubs', isPublic: false, searchableFields: ['volunteer_name', 'volunteer_email', 'notes'], filterableFields: { status: {type: 'string'}, shelter_club_id: {type: 'string', required: true} }, titleField: 'volunteer_name', subtitleField: 'volunteer_email', urlPattern: '/admin/volunteers/{id}' }`. Atualizar `SEARCH_ENTITIES` + testes. Index composto `volunteers(shelter_club_id, status, volunteer_name)` em `firestore.indexes.json`. |
| TASK-243 | Atribuições finas (capability matrix) por voluntário | feature | high | 1-ux | [TASK-236] | (a) Schema: `clubs/{clubId}/volunteer_assignments/{assignmentId}` com `{volunteer_uid, capability: enum, scope: enum, starts_at, ends_at, assigned_by_uid, assigned_at, notes}`. Capability enum: mesma de `VOLUNTEER_PARTICIPATION_ROLES` + `general_help`, `photography`, `foster_support`. Scope: `shelter`, `pet`, `event_type`, `task_id`. (b) Service CRUD + Zod + audit. (c) UI: matriz `(voluntário × capability)` no admin, com toggles e badges de "atribuído até DD/MM". (d) Regra: só abrigo com `volunteers:manage` escreve; próprio voluntário lê os seus. |
| TASK-244 | Integração Exhibition ↔ volunteer_participations (vincular participação à vitrine) | feature | high | 1-ux | [] | Em `ExhibitionDetails.jsx`: nova seção "Voluntários" abaixo de Escalas. (a) Lista de participations filtrada por `event_type=exhibition, exhibition_id={id}`. (b) Botão "+ Adicionar voluntário" abre dropdown com `useShelterVolunteers({status:'active', background_check_status:['approved','not_required']})`. (c) Ao selecionar, chama `useCreateParticipation` com `event_type='exhibition', exhibition_id={id}, shelter_club_id={clubId}, volunteer_uid, volunteer_name, event_label={exhibition.title}, event_date={exhibition.datetime_start}, role`. (d) Mostra `canVolunteerParticipate` em badge. (e) Empty state: "Nenhum voluntário escalado para esta vitrine. Adicione um na aba Voluntários." |
| TASK-245 | Cloud Function `dailyDigest` para voluntários do abrigo | feature | high | 4-int | [TASK-237] | Cron diário (Fase 14 já tem padrão de cron jobs). Para cada abrigo, agrega: novos voluntários últimos 7d, BG checks pendentes, participations próximas 7d, total de horas do mês. Email template `volunteer-digest-daily-v1` para cada admin (com permissão `volunteers:read`). Audit log. Flag-gated `SHELTER_VOLUNTEER_DIGEST_V1`. |
| TASK-246 | Rate limit em `joinShelterAsVolunteer` e `acceptVolunteerTerms` | security | high | 3-regras | [] | (a) `functions/middleware/rateLimit.js` (já existe padrão): 5 tentativas/min por uid, 20/shelter/dia. (b) Throws `functions/logger.error` + cria `platform_security_alerts` com `type: 'rate_limit_exceeded'`. (c) Audit log. (d) Regra Firestore NÃO pode fazer rate limit sozinha (não tem memória entre requests) — Cloud Function + counter doc é o caminho. (e) Teste: 6 calls em 1min → 6ª throws. |
| TASK-247 | `volunteer_profiles` collectionGroup index (bug) — remover ou corrigir | bug | high | 3-regras | [] | `firestore.indexes.json:188-193` tem index `volunteer_profiles(shelter_club_id, display_name)`. Mas a coleção real é `users/{uid}/volunteer_profile/main` (subcoleção, não collectionGroup com esse nome). **Ação:** remover o índice órfão. Se a intenção era indexar a subcoleção, o nome correto é `volunteer_profile` (sem 's'). Validar no emulador. |
| TASK-248 | `acceptVolunteerTerms` migrar para `terms_acceptances` (imutabilidade legal) | refactor | high | 3-regras | [TASK-241] | Hoje: `users/{uid}/volunteer_profile/main` tem campos `terms_accepted_at, terms_version` (mutáveis). Migração: criar doc em `users/{uid}/terms_acceptances/{acceptanceId}` (já tem rule imutável em firestore.rules:205-210) com `{terms_type: 'volunteer_v1', terms_version, signature_text_hash, accepted_at, ip, user_agent}`. Service `acceptVolunteerTerms` chama `addDoc` em `terms_acceptances`. Profile global mantém referência (`last_terms_acceptance_id`) mas NÃO é o storage primário. Migration script para usuários que aceitaram antes. |
| TASK-249 | UI helper `canManageVolunteers(club, membership, uid)` + smoke cross-role | feature | high | 2-roles | [TASK-236] | (a) Em `src/modules/organizations/domain/permissions.js`: `canManageVolunteers(club, membership, uid) = hasClubPermission(club, membership, 'volunteers', uid)`. (b) Smoke test em `tests/e2e/volunteer-flow.spec.ts` (Playwright): (1) volunteer_signs_up_to_shelter, (2) admin_approves_application, (3) admin_assigns_to_event, (4) volunteer_checks_in, (5) shelter_receives_digest, (6) volunteer_erases_data. (c) Gating em toda UI de voluntários (substituir `canAbriho` boolean). |

### 🟢 MEDIUM (nice-to-have, polish)

| ID | Título | Tipo | Priority | Eixo | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|
| TASK-250 | Smoke test `scripts/smoke-volunteer.mjs` end-to-end | docs | medium | 5-deploy | [TASK-232, TASK-233, TASK-234, TASK-237] | Script Node que: (1) cria user de teste via Admin SDK, (2) cria abrigo de teste, (3) chama `joinShelterAsVolunteer`, (4) verifica audit_log, (5) verifica email enfileirado (mock), (6) admin faz BG check approve, (7) verifica FCM mock, (8) cria participation, (9) check-in, (10) verifica total de horas. Roda contra emulador + prod canário. |
| TASK-251 | Analytics: funil de voluntário | feature | medium | 4-int | [] | Em `src/core/services/observabilityService.js`: novos eventos `volunteer_signup_started`, `volunteer_terms_accepted`, `volunteer_joined_shelter`, `volunteer_first_participation`. Cada um com propriedades: `source: 'public_page' | 'profile' | 'admin_invite'`, `shelter_id`, `user_uid`. Dashboard em `/admin/metricas` com funil. |
| TASK-252 | Sentry: tag `domain:volunteer` em erros | docs | medium | 4-int | [] | Onde der throw em `volunteer*Service.js`, anexar `Sentry.setTag('domain', 'volunteer')` no contexto. Alerta no Sentry: "errors em volunteer > 5/dia" → page on-call. |
| TASK-253 | Empty/loading/error states em VolunteerProfileForm + MyVolunteerList | feature | medium | 1-ux | [TASK-234] | (a) `VolunteerProfileForm` já tem loading OK; falta error state explícito (atualmente é só toast). (b) Criar `MyVolunteerList.jsx` com empty ("Você não está em nenhum abrigo ainda") + skeleton + error. (c) Componente `EmptyState` (shadcn) já existe em `src/components/ui/empty-state.jsx` — usar consistentemente. |
| TASK-254 | Geração de PDF do termo assinado (Lei 14.063/2020) | feature | medium | 4-int | [TASK-248] | Cloud Function `generateVolunteerTermsPDF`: ao aceitar o termo, gera PDF (pdf-lib) com `signature_text_hash`, `terms_version`, `accepted_at`, `user_uid`. Upload em `users/{uid}/volunteer_terms_pdfs/{acceptanceId}.pdf` (Storage). Email com link de download. |

### 🔵 LOW (docs, refactor)

| ID | Título | Tipo | Priority | Eixo | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|
| TASK-255 | Atualizar `docs/SHELTER_MGMT_ROADMAP.md` § Fase 13 com checklist dos gaps acima | docs | low | 5-deploy | [] | Documentar o que foi implementado na Fase 13 e o que ficou como Fase 13.1 (público + perfil + atribuições + integrações). Marcar Fase 13 como "80% done". |
| TASK-256 | DPO review nota em `docs/AGENTS_LGPD.md` (ou criar) para voluntários | docs | low | 5-deploy | [] | Nota assinada por DPO confirmando que: (a) termo v2 atende LGPD, (b) snapshot do aceite é minimização (hash em vez de nome em claro no audit), (c) soft-delete + anonimização estão planejados (TASK-241). Sem essa nota, **feature não pode ir pra prod** mesmo com flag OFF em abrigo canário. |

---

## Interfaces com Agente B (Abrigos/Foster/Adoção) e Agente C (Comunidade/Adotante/Eventos)

| ID | Interface | Frente | Descrição |
|---|---|---|---|
| INT-01 | Volunteer ↔ Exhibition (vincular voluntário a evento) | Agente C (Eventos) | O `exhibition_id` em `volunteer_participations` é FK opcional para Fase 11 (vitrines). Hoje, a UI de ExhibitionDetails (`ExhibitionDetails.jsx:515`) não usa a participation — ver TASK-244. **Coordenação:** Agente C mapeia criação de eventos; Agente A implementa o "Add volunteer" no detalhe da vitrine consumindo participations existentes. |
| INT-02 | Volunteer ↔ Foster (Lares Temporários) | Agente B (Foster) | Foster (`clubs/{clubId}/fosters/{fosterId}`) tem `foster_uid`. **Pergunta para Agente B:** o foster é modelado como VOLUNTÁRIO + papel adicional, ou é uma entidade separada? Se overlap, talvez `is_foster: true` no roster voluntário + entry separada em `fosters`. **Coordenação urgente** antes de TASK-243. |
| INT-03 | Volunteer ↔ Adopter (papel duplo) | Agente B (Adoção) | Usuário pode ser ADOTANTE (aplicou num pet) E VOLUNTÁRIO (de um abrigo). As coleções são independentes. Mas: na home do abrigo, vê "interessados em adotar" (lista do pet) E "voluntários" (rostagem). **Sem conflito hoje** mas considerar: notif unificada (FCM topic `user-{uid}-all`) para não spammar. |
| INT-04 | Volunteer ↔ Community (Comunidade Editorial) | Agente C (Comunidade) | Comunidade é entidade editorial (postagens), Voluntário é entidade operacional (abrigado). Sem overlap técnico, mas a **home do usuário** pode misturar "Meus posts em comunidades" + "Minhas participations em abrigos". Coordenação: dashboard unificado em `/perfil` (já é onde TASK-234 adiciona a seção). |
| INT-05 | Volunteer ← Adoption Term Acceptance Pattern | Agente B (Adoção) | O padrão de "terms_accepted_at + terms_version" + migration para `terms_acceptances/` (TASK-248) deve ser **o mesmo** que o Agente B adota para adoção. Se Agente B já moveu adoção, replicar exatamente. **Sincronizar.** |
| INT-06 | Volunteer em Smart Search (cross-entidade) | Agente C (Busca) | TASK-242 adiciona `volunteer` ao smart search. **Coordenação:** Agente C já tem 5 entities. Adicionar a 6ª (volunteer) requer atualizar `getSearchableEntities()` + UI de filtro. |
| INT-07 | Volunteer Termo v2 + outras features Legais | Agente C (Eventos) + Agente B (Adoção) | O termo `volunteerTerms.v2.js` foi feito na Fase 19 (junto com adoção, foster, donation). A feature de **auto-join via modal** (TASK-233) precisa garantir que o aceite está acoplado ao `consent_version` atual. **Padrão igual ao de adoção.** |
| INT-08 | Volunteer Notifications aggregation | Agente C (Notificações) | `notifications/{id}` collection é genérica. Quando TASK-237 dispara FCM/email, deve também gravar `notifications/{id}` para o admin. Coordenação: o serviço de notifications (`core/services/notificationService.js`) precisa ter método `notifyVolunteerEvent(eventType, payload)`. |
| INT-09 | Volunteer Hours ↔ Adopter Score | Agente B (Pós-adoção) | Após adoção, o adotante tem rating (`adoption_ratings`). **Pergunta:** voluntario que ajudou na adoption deveria ter bônus de reputação? Métrica: "horas_voluntariadas". Decisão de produto + Agente B. |
| INT-10 | Admin Panel: nova aba Voluntários vs.Equipe (ClubTeamTab) | Agente C (Equipe) | `ClubTeamTab` (linha 99) mostra `useClubMembers` (membros da ONG). Voluntários (TASK-232) é lista separada. **Decisão:** mesclar em uma única aba "Pessoas" (sub-tabs: Equipe / Voluntários) ou manter separadas? UX — provavelmente separar é mais limpo. |

---

## Recomendações

### Ordem de implementação sugerida

1. **MR imediato (BLOQUEIA UX público):** TASK-232 (CTA público) + TASK-233 (JoinVolunteerModal) + TASK-234 (seção perfil) → branch `feat/shelter-volunteers-public-v1`. Smoke em 1 abrigo canário.
2. **MR de segurança/LGPD:** TASK-236 (permissões granulares) + TASK-247 (corrigir index órfão) + TASK-241 (soft-delete) → branch `feat/shelter-volunteers-lgpd-v1`. Bloqueia deploy em prod.
3. **MR de integrações:** TASK-237 (FCM admin) + TASK-238 (FCM voluntário) + TASK-239 (FCM BG check) + TASK-242 (Smart Search) → branch `feat/shelter-volunteers-integrations-v1`. Pode ir junto com o MR 2.
4. **MR de atribuições:** TASK-243 (capability matrix) + TASK-244 (Exhibition ↔ volunteer) → branch `feat/shelter-volunteers-assignments-v1`. Polished feature.
5. **MR de analytics + Sentry:** TASK-251 + TASK-252 → branch `feat/shelter-volunteers-observability-v1`.
6. **MR de docs + DPO:** TASK-255 + TASK-256 (antes de qualquer canário em prod).

### Riscos identificados

- **RISCO-A01:** O `VolunteerProfileForm` órfão (GAP-UX-02) pode ter sido importado em algum commit recente que não chegou no worktree. Validar com `git log -p --all -- src/modules/shelter/components/VolunteerProfileForm.jsx` antes de propor TASK-234.
- **RISCO-A02:** O `terms_acceptances/` collection (firestore.rules:205-210) já tem rule imutável, mas **não há nenhum service que escreva nele hoje**. Se TASK-248 mover aceite, é mudança breaking para dados existentes (perfis com `terms_accepted_at` no volunteer_profile mas sem doc em `terms_acceptances/`). Migration script é obrigatório.
- **RISCO-A03:** O índice `volunteer_profiles` (firestore.indexes.json:188-193) pode ter sido gerado por um script de `firestore.indexes.json --build` que estava olhando para uma estrutura antiga. **Validar com emulador antes de remover (TASK-247).**
- **RISCO-A04:** FCM e SendGrid/Resend não estão visivelmente configurados. Se `core/services/notificationService.js` é mock em dev, todas as tasks de integração (TASK-237/238/239/245) precisam de setup real.
- **RISCO-A05:** A interface com Agente B sobre Foster (INT-02) pode gerar retrabalho em TASK-243 se a decisão for "foster = voluntário com capability especial".

### Dependências externas

- **SendGrid/Resend** para emails transacionais (TASK-237/238/239). Verificar se já está configurado em `functions/package.json` + env vars.
- **Firebase Cloud Messaging** (FCM) para push. Configurar `messaging` no client.
- **Firebase Storage** para upload de docs (TASK-240) + PDFs (TASK-254). Storage rules já existem (`storage.rules`).
- **Firebase Hosting/Cloud Scheduler** para cron `dailyDigest` (TASK-245). Padrão já estabelecido (Fase 14).
- **DPO humano** para assinar TASK-256 antes de qualquer canário em prod.

---

## Anti-patterns Regra A verificados

- [x] **Sem aba sem UX público** — GAP-UX-01: o painel admin TEM a aba Voluntários, mas a página pública NÃO. ⚠️ **GAP.**
- [x] **Empty/error/loading states em todas as telas** — admin OK (Roster tem empty + loading + ErrorBoundary). **Falta em VolunteerProfileForm (error) e na seção MyVolunteerList (não existe).** ⚠️ **GAP parcial.**
- [x] **Mobile + a11y** — VolunteersRoster usa `flex-col sm:flex-row`, `tap targets` >= 36px. VolunteerProfileForm tem 4 cards verticais mobile-friendly. Faltam `aria-live` em mudanças de status. ⚠️ **GAP parcial.**
- [x] **Zod validation em mutations** — 100% das mutations voluntário têm Zod. ✅ **OK.**
- [x] **LGPD em PII de voluntário** — termo v2 ✅, snapshot imutável (parcial) ✅, soft-delete planejado (TASK-241) ⚠️, export planejado (GAP-REGRAS-04) ⚠️. **GAP crítico.**
- [x] **Feature flag default OFF** — `SHELTER_VOLUNTEERS` + `SHELTER_VOLUNTEER_PROFILE_V1` ambas default OFF. ✅ **OK.**
- [x] **Smoke test cross-role** — não há (TASK-249 planeja). ⚠️ **GAP.**
- [x] **Auditoria de mudanças** — `createAuditLog` em todas as mutations (6 actions). ✅ **OK.**
- [x] **Multi-tenant `shelter_club_id` em toda collection** — 100%. ✅ **OK.**
- [x] **Firestore rules com return explícito** — `volunteers` e `volunteer_participations` todas com return explícito. ✅ **OK.**
- [x] **Single-field collectionGroup NUNCA declarado** — `volunteer_profiles` index tem 2 campos, então OK tecnicamente, mas está em collectionGroup errado. ⚠️ **GAP (TASK-247).**

---

## Apêndice A — Arquivos do escopo

### Cobertos (analisados)
- `src/modules/shelter/components/VolunteersRoster.jsx` (188 linhas) ✅
- `src/modules/shelter/components/VolunteerProfileForm.jsx` (277 linhas) ✅
- `src/modules/shelter/components/ParticipationForm.jsx` (197 linhas) ✅
- `src/modules/shelter/components/ParticipationsList.jsx` (149 linhas) ✅
- `src/modules/shelter/components/ExhibitionsList.jsx` (201 linhas, parcial) ✅
- `src/modules/shelter/components/ExhibitionForm.jsx` (251 linhas) ✅
- `src/modules/shelter/components/ExhibitionDetails.jsx` (645 linhas) ✅
- `src/modules/shelter/hooks/useVolunteerProfile.js` (122 linhas) ✅
- `src/modules/shelter/hooks/useVolunteerParticipations.js` (83 linhas) ✅
- `src/modules/shelter/services/volunteerProfileService.js` (399 linhas) ✅
- `src/modules/shelter/services/volunteerParticipationService.js` (284 linhas, parcial) ✅
- `src/modules/shelter/domain/operational/volunteerProfile.js` (388 linhas) ✅
- `src/modules/shelter/domain/operational/exhibition.js` (402 linhas, parcial) ✅
- `src/modules/shelter/domain/operational/indicators.js` (467 linhas, parcial) ✅
- `src/modules/swelter/domain/operational/search.js` (NÃO EXISTE — está em `src/modules/swelter/domain/search/search.js`) — analisado (655 linhas, parcial) ✅
- `src/modules/swelter/domain/legal/volunteerTerms.js` (73 linhas) ✅
- `src/modules/swelter/domain/legal/texts/volunteerTerms.v2.js` (existe) ✅
- `src/modules/swelter/domain/constants.js` (311 linhas) ✅
- `src/modules/organizations/pages/OrganizationAdminPanel.jsx` (424 linhas) ✅
- `src/modules/organizations/pages/ClubDetail.jsx` (249 linhas) ✅
- `src/modules/organizations/components/ClubTeamPublicTab.jsx` (196 linhas) ✅
- `src/modules/organizations/components/ClubTeamTab.jsx` (388 linhas, parcial) ✅
- `src/modules/organizations/components/ClubCover.jsx` (171 linhas, parcial) ✅
- `src/modules/organizations/domain/permissions.js` (178 linhas) ✅
- `src/pages/Profile.jsx` (470 linhas) ✅
- `src/pages/VolunteerTerms.jsx` (existe, página legal estática — analisado via `Select-String`) ✅
- `src/App.jsx` (370 linhas) ✅
- `firestore.rules` (1629 linhas) ✅
- `firestore.indexes.json` (44 indexes) ✅
- `functions/` (8 cloud functions listadas, nenhuma de voluntário) ✅
- `.harness/SCRUM_TASKS.json` (parcial — tasks TASK-130 a TASK-140 e busca de "voluntário") ✅

### Não cobertos (citados mas não lidos na íntegra)
- `src/modules/swelter/services/indicatorsService.js` (citado por indicadores.js)
- `src/modules/swelter/services/adoptionService.js` (Fase 3 — não muda voluntário)
- `src/modules/swelter/services/fosterService.js` (Fase 6 — relação com Foster ver INT-02)
- `tests/` (estrutura geral verificada, específicos de voluntário cobertos via service.test.js)
- `src/core/services/auditService.js` (existe, usado)
- `src/core/services/notificationService.js` (existe, não lido — relevante para TASK-237)
- `src/core/services/dataExportService.js` (existe, GAP-REGRAS-04)

---

> **Próximo passo do orquestrador:** consolidar com relatórios de Agente B (Abrigos/Foster/Adoção) e Agente C (Comunidade/Adotante/Eventos), validar INT-02 + INT-10, e priorizar tasks 232-256 conforme dependências.
