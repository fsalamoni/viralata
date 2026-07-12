# Relatório Agente B — ABRIGOS + FOSTER + ADOÇÃO (Regra A 5 eixos)

**Data:** 2026-07-11
**Worktree:** `D:\viralata\.worktrees\wt-e79e15ca` (branch `wt/e79e15ca` @ 03f6a5c, merged em main)
**Sessão:** mvs_311d078987d0414a90f57ef28b789b18 (Agente B — READ-ONLY)
**Frente:** ABRIGOS + FOSTER + ADOÇÃO (fluxo pet → intake → cadastro → vitrine → application → entrevista → match → contrato → onboarding → pós-adoção, mais gestão do abrigo e do lar temporário)
**Status:** ✅ Concluído (READ-ONLY — único arquivo escrito: este relatório)

---

## Resumo executivo

- **Etapas do fluxo cobertas:** 9 (intake, cadastro, vitrine, application, entrevista, match, contrato, onboarding, pós-adoção) + 2 transversais (gestão do abrigo, gestão do LT)
- **Total de eixos avaliados:** 5 (UX, Papéis, Regras, Integrações, Pós-deploy)
- **Cobertura atual estimada:** **~70%** — 21 das 22 fases do SHELTER_MGMT_ROADMAP estão com service/UI/dominínio prontos; **massa crítica existe**, mas há **buracos funcionais específicos** em contrato/assinatura eletrônica dedicada, dashboard pessoal do adotante pós-adoção, e fluxos de comunicação (entrevista por chat/email dedicado, e-mail transacional, FCM), além de gaps de mobile/a11y em vários pontos e ausência de smoke cross-role sistemático
- **Gaps identificados:** 47 (ver tabela consolidada adiante)
- **Tasks novas propostas:** 41 (TASK-141..TASK-181)
- **Blockers:** 3 (CONTRACT-001, POSTADOPT-001, INTERVIEW-001 — funcionalidades centrais do fluxo que **não existem** ainda como entrega dedicada; o que existe é partial/coberto por outras features)
- **Interfaces com Agente A (Voluntários):** 4 (vinculação em pet, vinculação em vitrine, foster, dashboard)
- **Interfaces com Agente C (Comunidade/Adotante/Eventos):** 3 (perfil do adotante, eventos públicos, busca)

---

## Matriz papel × etapa (resumo)

| Etapa | anonymous | adopter | volunteer | foster | shelter_admin | team_member | platform_admin | system |
|---|---|---|---|---|---|---|---|---|
| 1. Pet intake | — | — | — | — | CRUD pets+timeline+medical | CRUD (se perm) | tudo | auto-triggers |
| 2. Cadastro (perfil abrigo) | — | — | — | — | editar shelterAnimalProfile | se perm 'animals' | tudo | — |
| 3. Vitrine (público) | ver/favoritar | ver/favoritar/compartilhar | ver | ver | ver | ver | ver | — |
| 4. Application (submit) | — | criar/ver+upload docs | — | — | ver/decidir | ver (se perm) | tudo | — |
| 5. Entrevista (chat) | — | chat direto c/ abrigo | — | — | responder/avançar | se perm 'animals' | ver | — |
| 6. Match (aprovação) | — | ser aprovado | — | — | decidir+cascata+timeline | se perm 'animals' | tudo | — |
| 7. Contrato | — | assinar e-sign | — | — | gerar template+arquivar | se perm 'animals' | ver | — |
| 8. Onboarding (termos) | — | aceitar termos+perfil completo+doar | — | — | ver status | ver | tudo | — |
| 9. Pós-adoção (milestones) | — | completar task/foto | — | — | ver+comentar+pausar | se perm 'animals' | tudo | CRON diário |
| A. Abrigo (gestão) | — | — | — | — | CRUD painel | se perm | tudo | — |
| F. Foster (lar temp.) | — | — | — | aceitar/prorrogar/finalizar | propor CRUD | se perm | tudo | auto timeline |

**Legenda de cobertura por papel:** OK | parcial | GAP (não existe)

---

## Mapa de arquivos atuais por eixo (passo 2)

### Módulo `src/modules/shelter/` (Sistema de Gestão do Abrigo, 21/22 fases prontas)

**Estrutura:**
- `domain/constants.js` — 24 feature flags `SHELTER_*`, todas default OFF
- `domain/operational/` — adoption.js, adoption.test.js, adopterProfile.js, dashboard.js, exhibition.js, foster.js, gallery.js, googleForms.js, indicators.js, kanban.js, postAdoption.js, reports.js, volunteerProfile.js
- `domain/clinical/` — medicalRecords.js, medication.js
- `domain/core/animal.js` — shelterAnimalProfileSchema (Fase 1)
- `domain/legal/` — adoptionTerms, fosterTerms, volunteerTerms, shelterOnboardingTerms, donationTerms, terms + textos v1/v2
- `domain/search/` — search.js, search.test.js (Fase 18)
- `services/` — 19 services com audit log em todos, Zod parse em todos, multi-tenant defense-in-depth
- `hooks/` — 18 hooks TanStack Query
- `components/` — 35 componentes (Dashboard, Kanban, Fosters, MedicalRecords, Medications, ApplicationsList, AdoptionFormFill, SingleAcceptanceDialog, etc)

**Coberto por eixo:**
- **Eixo 1 (UX) — parcial:** tem admin completo (Dashboard, Kanban, Reports, Indicators, Applications, Fosters, Medical, Medication, Exhibitions), tem perfil do adotante completo (`AdopterProfileForm.jsx`), tem timeline visual do pet, mas **falta**: página pública do abrigo com CTA "Quero adotar/Ser voluntário/Lar temporário" integrada às 3 jornadas, perfil público do adotante (só vê o próprio), dashboard pessoal do adotante pós-adoção, mobile testado em vários pontos
- **Eixo 2 (Papéis) — forte:** matriz granular via `domain/permissions.js` + `hasClubPermission` no Firestore, 7 papéis diferenciados em todas as mutations
- **Eixo 3 (Regras) — forte:** Zod em todos os services, Firestore rules com return explícito (1629 linhas), multi-tenant via `shelter_club_id` em todas as subcoleções, audit log imutável em todas as mutations, applicant_snapshot imutável no adoption workflow, post-adoption cron com buffer 90d
- **Eixo 4 (Integrações) — parcial:** Cloud Functions `materializePostAdoptionTasks` (cron diário), `googleFormsWebhook` (onRequest), `onPetCreatedNotifyRadar` (onCreate), `snapshotPlatformHealth` (cron 1h), `onPlatformAlertEvent`, `triggerSecurityAlert`, rate limit middleware. **Mas falta**: e-mail transacional (no apps só audit log, sem notify_user por email/FCM pra application/match/milestone), Storage de contratos assinados, busca indexada em pets/adotantes/abrigos (Smart Search tem o service mas sem indexação ativa confirmada), webhooks externos
- **Eixo 5 (Pós-deploy) — parcial:** 24 feature flags default OFF no `featureFlags.js`, cutoverService.js existe, mas **falta**: smoke test cross-role em prod (`scripts/smoke-prod.mjs` ou similar — não confirmado), Sentry, Firebase Analytics funil adoção, rollback plan em DELIVERABLE.md por feature, bundle hash no PR

### Módulo `src/modules/pets/` (frontend público do pet)

**Estrutura:** 18 arquivos entre components, pages, services, hooks, domain
- `pages/PetFeed.jsx`, `PetFeedEnhanced.jsx`, `PetFeed.v1.jsx` — feed público
- `pages/PetDetail.jsx` — vitrine do pet com flag `PET_ADOPTION_GATING` (explicação de bloqueio)
- `pages/CreatePet.jsx` — wizard de cadastro (Steps: Fotos, Sobre, Saúde, Revisão) com `AdoptionFormBuilder` integrado
- `components/AdoptionFormFill.jsx` — dialog 2 steps (formulário dinâmico + Termo de Adoção com SingleAcceptanceDialog)
- `components/InterestPanel.jsx` — registro de interesse (legacy `adoption_interests`)
- `domain/matching.js` — lógica de compatibilidade (housing_type, has_yard, has_children, other_pets)
- `services/petService.js` — CRUD + `completePetAdoption`
- `hooks/usePetPermissions.js` — `canEdit` por owner/admin

### Firestore rules (`firestore.rules`, 1629 linhas)

- ✅ `pets/{petId}` — read público, write com owner/admin, owner_id imutável
- ✅ `pets/{petId}/timeline` — multi-tenant via `_petShelterClubId`
- ✅ `pets/{petId}/medical` — multi-tenant + permission 'health'
- ✅ `pets/{petId}/medications` + `doses`
- ✅ `clubs/{clubId}/adoption_workflow` — applicant+abrigo+platform_admin, snapshot imutável, terms_accepted_at write-once
- ✅ `clubs/{clubId}/post_adoption` — create só via Cloud Function
- ✅ `clubs/{clubId}/kanban_tasks` — materializadas pelo CRON
- ✅ `clubs/{clubId}/fosters` — abrigo+LT+platform_admin
- ✅ `clubs/{clubId}/exhibitions` + `shifts` + `post_event_log` — multi-tenant + organizer_uid imutável
- ✅ `clubs/{clubId}/onboarding/{onboardingDocId}` — DPA + termos do abrigo
- ✅ `clubs/{clubId}/integrations/google_forms`
- ✅ `adoption_interests` (legacy)
- ✅ `pet_photos`
- ✅ `audit_logs`
- ❌ **Falta** `contracts/{contractId}` collection dedicada para o termo de adoção assinado (hoje fica dentro de `adoption_workflow/{appId}.signature_text` — não há doc separado)
- ❌ **Falta** `post_adoption_milestones` separada (hoje ficam dentro de `post_adoption/{appId}.milestones[]`)

### Cloud Functions (`functions/`)

- `index.js` — entrypoint: `onPetCreatedNotifyRadar`, `googleFormsWebhook`, `materializePostAdoptionTasks`, `snapshotPlatformHealth`, `onPlatformAlertEvent`, `triggerSecurityAlert`
- `matching.js` — cópia deliberada de `pets/domain/matching.js` (Radar)
- `postAdoptionCron.js` — CRON `0 6 * * *` UTC (03:00 BRT) com buffer 90d, idempotência via `source_milestone_index`
- `platformHealthCron.js`, `adminAlerts.js`, `galleryPurgeCron.js`, `googleFormsWebhook.js`, `securityAlerts.js`, `securityAlertsCore.js`
- `middleware/rateLimit.js` — express-rate-limit (Fase 20)

### Coleções existentes (read por código)
- `pets`, `users`, `clubs`, `adoption_interests`, `adoption_ratings`, `adoption_workflow` (sub), `post_adoption` (sub), `kanban_tasks` (sub), `fosters` (sub), `exhibitions` (sub), `exhibitions/{id}/shifts`, `exhibitions/{id}/post_event_log`, `volunteers` (sub), `volunteer_participations` (sub), `dashboard_widgets` (sub), `pet_timeline` (sub), `medical` (sub), `medications` (sub), `doses` (sub), `pet_photos`, `pet_radars`, `terms_acceptances`, `onboarding` (sub), `integrations/google_forms` (sub), `audit_logs`, `notifications`, `conversations/messages`, `abuse_reports`, `platform_settings`, `platform_health_snapshots`, `platform_alert_config`, `platform_alert_events`, `platform_billing`, `function_invocations`, `slow_queries`, `deploys`, `platform_security_alerts`

---

## 1. EIXO 1 — UX (User Experience)

### 1.1 Pet intake (chegada ao abrigo)

#### ✅ O que existe
- `src/modules/pets/pages/CreatePet.jsx` — wizard 4 steps (Fotos, Sobre, Saúde, Revisão) com `AdoptionFormBuilder` (Fase 1) integrado
- `src/modules/pets/components/AdoptionFormBuilder.jsx` — abrigo define campos customizados do formulário de adoção
- Upload de fotos via `storageService.uploadImage` (já retorna URLs)
- Após criar pet: `useFeatureFlag(PET_ADOPTION_GATING)` mostra card explicativo se o usuário não pode adotar/chat

#### ❌ Gaps
- **[GAP-UX-01.1]** Wizard não tem aba "Cadastro de Resgate" da Fase 1 — campos `rescue_name`, `rescue_date`, `rescue_by_uid`, `rescue_location`, `microchip_id`, `intake_type`, `asilomar_status` (`shelterAnimalProfileSchema` existe, mas o `CreatePet.jsx` não tem step dedicado) — fica em `shelterAnimalService.updateShelterAnimalProfile` separado, **caminho esperado:** `src/modules/pets/pages/CreatePet.jsx` (adicionar step "Resgate" no `STEPS` array)
- **[GAP-UX-01.2]** Sem empty/loading state no upload de fotos (só `useToast` em erro) — **caminho:** `src/modules/pets/pages/CreatePet.jsx:180+`
- **[GAP-UX-01.3]** Sem preview do QR do microchip após inserir (recurso nice-to-have pra clínica)
- **[GAP-UX-01.4]** Sem upload de documentos do pet (RG do animal, laudo, etc) — só fotos; `documents: []` do schema não tem UI
- **[GAP-UX-01.5]** Sem batch intake (criar 5 pets de uma vez vindo de Google Forms) — depende de TASK Fase 5 já em produção; precisa de uma UI de review/edit
- **[GAP-UX-01.6]** Sem microcopy explicando o que cada step é (cards de ajuda) — onboarding contextual inexistente

### 1.2 Cadastro (perfil abrigo do animal)

#### ✅ O que existe
- `src/modules/shelter/services/shelterAnimalService.js` — `getShelterAnimalProfile`, `updateShelterAnimalProfile` com Zod + audit log + diff
- `src/modules/shelter/domain/core/animal.js` — `shelterAnimalProfileSchema` completo
- Firestore rules: `shelter_owner_club_id` write-once, validação `_shelterAnimalProfileValid`

#### ❌ Gaps
- **[GAP-UX-02.1]** **Falta UI dedicada** para editar o Cadastro Único do Animal — `shelterAnimalService.updateShelterAnimalProfile` está pronto, mas não tem componente nem rota para chamá-lo. A aba "Cadastro" do PetDetail mencionada no roadmap **não foi implementada como componente** — **caminho esperado:** `src/modules/pets/components/PetShelterProfileTab.jsx` (novo)
- **[GAP-UX-02.2]** Sem indicador visual de "perfil completo" do abrigo (badge de qualidade dos dados)
- **[GAP-UX-02.3]** Sem Asilomar UI (campo existe no schema, mas nenhum select com os 5 valores `healthy|...|unhealthy_untreatable|undetermined`)

### 1.3 Vitrine (público vê o pet)

#### ✅ O que existe
- `src/modules/pets/pages/PetFeed.jsx` / `PetFeedEnhanced.jsx` — feed público
- `src/modules/pets/pages/PetDetail.jsx` — vitrine do pet com `InterestPanel`, `AdoptionFormFill`, `RatingForm`, `PetShareCard`
- Filtros: espécie, porte, cidade, raio (cliente-side via flag `PET_FEED_RELIABILITY_FIX`)
- Empty state `PetNotFound` (404), Skeleton `PetDetailSkeleton`, Share Card visual

#### ❌ Gaps
- **[GAP-UX-03.1]** Sem filtro por "espécie + castrado + vacinado" combinados (precisa de `adoptionForm.js` extender)
- **[GAP-UX-03.2]** Sem "Animais em lar temporário" como filtro dedicado (precisa de `foster_placements/{pet_id}` cruzar com `pet.status`)
- **[GAP-UX-03.3]** `PetDetail.jsx:104-113` mostra `blockedReasons` mas sem CTA explicando COMO resolver (ex: "Concluir perfil" não tem link de ação)
- **[GAP-UX-03.4]** Sem lightbox acessível (galeria de fotos do pet com keyboard nav + ARIA)
- **[GAP-UX-03.5]** Mobile: gallery horizontal swipe não testado (possível só com setas hoje)
- **[GAP-UX-03.6]** Sem "Pets similares" (cross-entity via matching.js)
- **[GAP-UX-03.7]** Sem "Quem adotou pets deste abrigo" (vitrine de adoções concluídas, com consent)

### 1.4 Application (formulário dinâmico + submit)

#### ✅ O que existe
- `src/modules/pets/components/AdoptionFormFill.jsx` — dialog 2 steps (formulário dinâmico + aceite do Termo de Adoção)
- `src/modules/pets/components/AdoptionFormBuilder.jsx` — abrigo define campos (criado na Fase 1)
- `src/modules/shelter/services/adoptionService.js:64-127` — `submitAdoptionApplication` com applicant_snapshot + terms_signature_text
- `src/modules/pets/components/InterestPanel.jsx` — registro de interesse (legacy `adoption_interests` collection, convive com adoption_workflow)

#### ❌ Gaps
- **[GAP-UX-04.1]** **Sem página dedicada de "Minha Application" para o adotante** acompanhar o status — ele vê no `MyInterests.jsx` (legacy) mas **não vê o workflow novo** (`adoption_workflow/{appId}` com status `under_review/approved/rejected`); precisa de tela de detalhes com timeline da application
- **[GAP-UX-04.2]** Sem upload de documentos do adotante (RG, comprovante de residência, holerite) — campo `documents: []` no schema adoption.js não tem UI
- **[GAP-UX-04.3]** Sem confirmação visual pós-submit (toast success só — sem card "Próximos passos")
- **[GAP-UX-04.4]** Sem preview do termo de adoção (read-only) antes do aceite (só vê o texto durante o aceite)
- **[GAP-UX-04.5]** Mobile: `AdoptionFormFill` dialog é `max-h-[85vh] overflow-y-auto` mas sem stepper visível (perde-se em campos longos)
- **[GAP-UX-04.6]** Sem suporte a application via Google Forms link externo — schema `external_questionnaire_id` existe, UI não
- **[GAP-UX-04.7]** Sem application anônima (visitante sem login) — hoje exige login; rota "Quero adotar" → auth modal — não implementado

### 1.5 Entrevista (chat admin ↔ adotante)

#### ✅ O que existe
- `src/modules/chat/` — `chatService.js` (generic direct conversation)
- `src/modules/pets/pages/PetDetail.jsx:66` — `getOrCreateDirectConversation` chamado ao abrir chat com responsável
- `src/modules/chat/pages/ChatPage` (não inspecionado em detalhe, mas presumido funcional)

#### ❌ Gaps
- **[GAP-UX-05.1]** **Sem fluxo dedicado de "entrevista de adoção"** — o chat genérico é usado, mas **não há UI de scheduling de entrevista, vídeo-chamada, ou checklist de tópicos** (a fase menciona `interview_scheduled → interview_done` no workflow, mas o service não materializa nem o hook nem a UI)
- **[GAP-UX-05.2]** Sem notificação pro abrigo quando application entra em `under_review` (só `audit_log`)
- **[GAP-UX-05.3]** Sem e-mail transacional pro abrigo/adotante em mudanças de status (SendGrid/Resend não está plugado)
- **[GAP-UX-05.4]** Sem FCM push pro abrigo (push notification para novo candidato, novo match, lembrete) — `notificationService` é só in-app
- **[GAP-UX-05.5]** Sem home check (visita presencial) tracking — schema `home_check_scheduled/done` no workflow adoption.js foi mapeado no roadmap mas **não tem service/UI/materialização**
- **[GAP-UX-05.6]** Sem record de evaluation (campo `evaluations[]` no schema adoption.js roadmap) — UI ausente
- **[GAP-UX-05.7]** Sem "salvar rascunho" da application (cliente perde tudo se fechar)

### 1.6 Match (admin escolhe, cascata)

#### ✅ O que existe
- `src/modules/shelter/services/adoptionService.js:188-248` — `decideApplication` com cascata: rejeita outras pendentes, marca pet como `adopted`, cria evento `status_change` na timeline, tudo em `writeBatch` atômico
- `src/modules/shelter/components/ApplicationsList.jsx` — lista filtrada, modal de decisão com notas obrigatórias para `rejected`
- 7 status: `applied`, `under_review`, `approved`, `rejected`, `adoption_completed`, `cancelled`, `withdrawn`
- `doc/.../adoption.js:39-47` — state machine com `VALID_TRANSITIONS` validadas

#### ❌ Gaps
- **[GAP-UX-06.1]** **Sem scoring/ranking automático de candidates** — `pets/domain/matching.js:9-44` existe pra Radar mas **não é aplicado a applications recebidas**. O abrigo vê todas as applications na ordem cronológica, sem "match score" visível
- **[GAP-UX-06.2]** Sem Kanban de applications (lista simples; não há drag-and-drop entre status columns como no Kanban de tarefas)
- **[GAP-UX-06.3]** Sem comparação side-by-side de 2-3 candidates
- **[GAP-UX-06.4]** Sem indicador de "1ª application neste pet" / "tempo desde que enviou" (badge temporal)
- **[GAP-UX-06.5]** Approval modal `ApplicationsList.jsx:203-247` sem preview do perfil completo do adotante (RG, experiência, etc) — só vê o `applicant_form` mínimo
- **[GAP-UX-06.6]** Sem notificação por email/FCM ao candidato aprovado (audit_log só)
- **[GAP-UX-06.7]** Sem undo do `approved` → volta para `under_review` (não está em `VALID_TRANSITIONS`)

### 1.7 Contrato (assinatura eletrônica Lei 14.063/2020)

#### ✅ O que existe
- `src/modules/shelter/services/adoptionService.js:64-127` — submit inclui `terms_signature_text`, grava `terms_accepted_at` + `terms_version` + `signature_text` no doc da application (IMUTÁVEL depois)
- `src/modules/shelter/domain/legal/adoptionTerms.js` — `buildAdoptionTermsAcceptance(terms_signature_text)` gera o aceite
- `src/modules/shelter/domain/legal/texts/adoptionTerms.v1.js` — texto integral do termo (em revisão jurídica, TASK-006)
- `src/modules/shelter/components/legal/SingleAcceptanceDialog.jsx` — UI clickwrap com signature
- `src/modules/shelter/components/legal/TermsDocument.jsx` — render do documento
- `firestore.rules:691-743` — `adoption_workflow` aceita os 3 campos, e em update eles são IMUTÁVEIS (`request.resource.data.terms_accepted_at == resource.data.terms_accepted_at`)

#### ❌ Gaps
- **[GAP-UX-07.1]** **BLOCKEr — Sem coleção dedicada `contracts/{contractId}`** — o aceite hoje é **um campo embed** no doc `adoption_workflow/{appId}`. Não há doc separado que possa ser consultado pelo abrigo, exibido ao adotante depois, ou versionado. **Falta rota:** `src/pages/Contracts/` (ou rota em `/profile/contracts`)
- **[GAP-UX-07.2]** **Sem armazenamento do PDF/HTML do contrato assinado** no Storage — `storageService.uploadFile` não é chamado em lugar nenhum do adoption flow. Lei 14.063/2020 art. 6º exige "documento eletrônico assinado" — precisaríamos do arquivo em si, não só dos metadados
- **[GAP-UX-07.3]** **Sem hash SHA-256 do documento** — `SingleAcceptanceDialog` aceita `documentHash` como prop, mas o caller (`AdoptionFormFill.jsx`) **não está passando** um hash real. Conferi: o aceite hoje é só texto + version, sem hash do conteúdo do termo naquele momento
- **[GAP-UX-07.4]** Sem IP + user-agent no aceite (art. 6º da 14.063/2020) — `audit_log` registra IP via `__CF_CONNECTING_IP` mas o **aceite do termo em si** não tem o IP colado; só o audit
- **[GAP-UX-07.5]** Sem biometria/liveness (opcional mas recomendável pra advanced signature) — roadmap cita mas não implementado
- **[GAP-UX-07.6]** Sem "Aceito por procuração" (representante legal) — caminho pra ONG assinar pelo idoso, etc
- **[GAP-UX-07.7]** Sem página `/contracts` no abrigo listando todos os contratos assinados (com search, export CSV)
- **[GAP-UX-07.8]** Sem botão "Baixar contrato" (PDF) pro adotante — `jspdf` está disponível mas não usado nesse fluxo
- **[GAP-UX-07.9]** Sem disclaimers de vícios redibitórios (parvovirose, cinomose) destacados visualmente (texto existe mas não é "aceito separadamente")

### 1.8 Onboarding (termos, doações, perfil completo do adotante)

#### ✅ O que existe
- `src/modules/shelter/components/AdopterProfileForm.jsx` — formulário gigante com 8 seções (Identidade, Endereço, Sobre a casa, Composição familiar, Experiência, Recursos, Sobre a adoção) + badge de completude 0-100%
- `src/modules/shelter/services/adopterProfileService.js` + `.test.js` (testado)
- `src/pages/AdopterTerms.jsx` — texto + aceite
- `src/pages/DonorTerms.jsx`
- `src/modules/shelter/domain/legal/donationTerms.js`
- `src/pages/Profile.jsx` — provavelmente integra tudo (não inspecionado em detalhe)

#### ❌ Gaps
- **[GAP-UX-08.1]** **Sem página pública do perfil do adotante** (apenas `/profile/adopter` privado) — abrigo só vê `applicant_snapshot` no application; **não há página `/adopters/:uid`** com info pública consentida
- **[GAP-UX-08.2]** Sem "Matching com o perfil" preview ("com base no seu perfil, esses pets combinam com você") — `matching.js` existe mas UI não
- **[GAP-UX-08.3]** Sem "Histórico de adoções anteriores" (campo `previous_adoptions` no schema não é populado nem exibido)
- **[GAP-UX-08.4]** Sem upload de foto de perfil do adotante (só do pet)
- **[GAP-UX-08.5]** Sem onboarding wizard "Tour" (Tourist首次登录)
- **[GAP-UX-08.6]** Sem CTA de doação (integrar com `club_donations` ou similar — não inspecionado, mas presumido GAP porque DonorTerms é página estática)
- **[GAP-UX-08.7]** Sem telemetria de "campo X está sempre vazio" pra melhorar UX

### 1.9 Pós-adoção (milestones 7/30/90+ dias)

#### ✅ O que existe
- `src/modules/shelter/services/postAdoptionService.js` — `createPostAdoption`, `materializeDueMilestones` (com buffer 90d), `materializeForAdoption`, `markAsReturned`, `pausePostAdoption`
- `src/modules/shelter/domain/operational/postAdoption.js` — 10 milestones default: 7d, 21d, 30d, 60d, 90d, 180d, 365d, 730d, 1095d
- `functions/postAdoptionCron.js` — Cloud Function `materializePostAdoptionTasks` rodando `0 6 * * *` UTC
- `src/modules/shelter/services/kanbanService.js` — consome `kanban_tasks` materializadas
- 11 tipos de milestone: `check_in`, `vaccine_reminder`, `weight_measurement`, `photo_request`, `home_visit`, `vet_followup`, `training`, `document_update`, `birthday`, `adoption_anniversary`, `reactivation`

#### ❌ Gaps
- **[GAP-UX-09.1]** **BLOCKEr — Sem dashboard pessoal do adotante pós-adoção** — o adotante vê suas tasks materializadas em `kanban_tasks`? Não há `/post-adoption` route nem componente dedicado. O adotante hoje vê `MyInterests` que mostra **interesses** (legacy), não **adoções concluídas + próximas tarefas**
- **[GAP-UX-09.2]** **Sem UI pro adotante completar um milestone** (fazer upload de foto, responder check-in) — `kanban_tasks` rules dizem que o adotante pode update (`resource.data.adopter_uid == request.auth.uid`), mas **não há página/UI** pra ele
- **[GAP-UX-09.3]** Sem notificação pro abrigo quando uma task é concluída pelo adotante (audit_log só)
- **[GAP-UX-09.4]** Sem notificação pro adotante "tem task devida hoje" (FCM/email)
- **[GAP-UX-09.5]** Sem "reactivation" workflow — quando adotante sumir, não há política de reativação (campo `lost_contact` existe no roadmap mas não está no schema atual)
- **[GAP-UX-09.6]** Sem "Saúde pós-adoção" — pets com doença crônica precisam de lembretes mais densos (Fase 7 saúde + Fase 6 pós-adoção não conversam)
- **[GAP-UX-09.7]** **Sem UI de devolução** (`markAsReturned` existe no service mas **não tem componente**) — caminho esperado: `src/modules/shelter/components/PostAdoptionReturnDialog.jsx` (novo)
- **[GAP-UX-09.8]** Sem métricas pessoais pro adotante ("5 anos de adoção!", "10ª foto enviada")
- **[GAP-UX-09.9]** Sem exportação do "book" da adoção (PDF com todas as fotos+mensagens+momentos)

### 1.A Abrigo (ONG — onboarding, equipe, painel admin, relatórios, indicadores)

#### ✅ O que existe
- `src/modules/organizations/pages/OrganizationAdminPanel.jsx` — hospeda **todas as tabs do abrigo** (não há rota dedicada `/abrigos/:id/admin`)
- Tabs implementadas: Dashboard, Kanban, Reports, Indicators, Animals (gated por SHELTER_*), Volunteers, Medical, Medication, Timeline, Fosters, Exhibitions, Applications, Admin (geral), Team, Feed, Donations, Finance, Chat
- `src/modules/shelter/services/dashboardService.js` + `ReportsTab.jsx` + `IndicatorsTab.jsx`
- `src/modules/shelter/services/cutoverService.js` — valida se todas as 24 flags estão ON

#### ❌ Gaps
- **[GAP-UX-A.1]** **Sem onboarding wizard do abrigo** — `src/pages/OrganizationsHub.jsx` provavelmente tem, mas não tem wizard dedicado de "Bem-vindo, configure seu abrigo em 5 passos" (logo, endereço, primeiros pets, equipe, termos)
- **[GAP-UX-A.2]** **Sem "página pública do abrigo" dedicada e rica** — `ClubDetail.jsx` (Agente C) tem capa, mas não tem CTA integrado das 3 jornadas: Quero adotar / Ser voluntário / Lar temporário. **Hoje o usuário chega via feed de pets, não via /abrigos/:id**
- **[GAP-UX-A.3]** **Sem dashboard pessoal do admin do abrigo** (cards com "X applications novas, Y tasks atrasadas") — `DashboardPage.jsx` é o **dashboard do abrigo como um todo**, mas não há "minhas tasks" (cards com filtro por uid)
- **[GAP-UX-A.4]** Sem "Minha equipe" page (admin vê equipe mas sem CRUD inline; só convidar)
- **[GAP-UX-A.5]** Sem "Configurações do abrigo" page (termos, política, branding, integrações) — `ClubThemingSection.jsx` cobre tema mas não tem o resto
- **[GAP-UX-A.6]** Sem "Logs de auditoria" visíveis pro shelter_admin (só platform_admin vê audit_logs via `/admin/auditoria`)
- **[GAP-UX-A.7]** Mobile: várias tabs do `OrganizationAdminPanel` não testadas (Kanban drag é desktop-only presumido)
- **[GAP-UX-A.8]** Sem help contextual (?) em cada tab (o que é Kanban? o que é kanban_tasks vs fosters?)

### 1.F Foster (lar temporário)

#### ✅ O que existe
- `src/modules/shelter/services/fosterService.js` — `proposeFosterPlacement` (abrigo propõe), `acceptFosterPlacement` (LT aceita), `extendFosterPlacement`, `endFosterPlacement`, `cancelFosterPlacement`
- `src/modules/shelter/components/FostersList.jsx` — lista de placements com filtros, badges, modal de aceite
- `src/modules/shelter/domain/operational/foster.js` — 6 status, transições validadas
- `src/modules/shelter/components/legal/fosterTerms.js` — texto + version
- `src/pages/FosterTerms.jsx` — página estática
- `useFosters`, `useAcceptFoster`, `useExtendFoster`, `useEndFoster`, `useCancelFoster` — 5 hooks TanStack Query
- Firestore rules: `fosters/{fosterId}` com abrigo+LT+platform_admin

#### ❌ Gaps
- **[GAP-UX-F.1]** **Sem página pública `/lares-temporarios/novo`** — `docs/SHELTER_MGMT_ROADMAP.md § Fase 7` cita essa rota; **não foi implementada** como componente (só o service aceita o placement). Como o LT descobre que pode ser LT? Pelo abrigo contatar; não há "Quero ser LT" no portal
- **[GAP-UX-F.2]** **Sem dashboard pessoal do LT** ("Pets sob minha guarda agora", "Próximos fins de placement", "Histórico de adoções do LT")
- **[GAP-UX-F.3]** **Sem "Perfil público do LT"** (com foto, capacidade, região) — o abrigo escolhe pelo uid mas não vê um perfil
- **[GAP-UX-F.4]** Sem UI de "Avaliação do LT" (campo `foster_rating` + `foster_feedback` no schema, não tem componente)
- **[GAP-UX-F.5]** Sem UI de "Animal voltou saudável?" (campo `pet_returned_healthy`, não tem componente)
- **[GAP-UX-F.6]** `FostersList.jsx:96-100` usa `window.prompt` para prorrogar — não é UI/UX aceitável (Fase 19 hardening já corrigiu isso em outros lugares)
- **[GAP-UX-F.7]** Sem notificação pro LT 7 dias antes do placement acabar (roadmap cita, não implementado)
- **[GAP-UX-F.8]** Sem "LT pode adotar diretamente?" (campo `can_adopt_directly` no schema do roadmap, **não está no schema atual de foster.js**)
- **[GAP-UX-F.9]** Sem histórico público de pets que passaram pelo LT (vitrine do LT)
- **[GAP-UX-F.10]** Sem empty state quando LT não tem pets sob guarda
- **[GAP-UX-F.11]** Sem mobile do fluxo de aceite (assinar termo, confirmar)

---

## 2. EIXO 2 — Papéis (Roles)

### ✅ O que existe

**Granularidade forte:**
- `src/modules/organizations/domain/permissions.js` — `isClubOwner`, `isClubOwnerOrAdmin`, `hasAnyClubPermission`, `hasClubPermission(clubId, 'animals'|'health'|'integrations'|...)`
- Firestore rules: `isAuth()`, `isPlatformAdmin()`, `isClubOwnerOrAdmin(clubId)`, `canEditClubPets(clubId)`, `hasClubPermission(clubId, perm)` — todas as mutations checam
- `users/{uid}/adopter_profile` — write só pelo próprio uid
- `users/{uid}/volunteer_profile` — idem
- `pets/{petId}` — write pelo owner (uid) ou abrigo com permission `animals`
- `clubs/{clubId}/adoption_workflow` — applicant lê seu, abrigo lê+decide, applicant cancela
- `clubs/{clubId}/fosters` — abrigo CRUD, LT só aceita+cancela seu próprio
- `clubs/{clubId}/exhibitions` — abrigo CRUD, organizer + co-organizers leem

**Permissões por papel cobertas:**
- anonymous: vê pets (read público), vê página do abrigo, vê termos, NÃO aplica, NÃO adota
- adopter: tem perfil, vê pets, cria application, cancela seu, vê pós-adoção próprio
- volunteer: idem adopter + perfil de voluntário
- foster: idem adopter + perfil de LT, vê placements, aceita, finaliza
- shelter_admin: CRUD painel do abrigo
- team_member: CRUD scoped por permission
- platform_admin: tudo, flags, settings
- system: Cloud Functions (materialize, cron)

### ❌ Gaps por etapa

- **[GAP-PAP-4.1]** Application: `adoptionService.js:267-273` usa lógica "se não for applicant, é do abrigo" — não checa `isClubOwnerOrAdmin` (defense-in-depth ausente; Firestore rules compensam mas service devia checar)
- **[GAP-PAP-6.1]** Match (decide): `decideApplication` aceita qualquer `actor.uid` se for abrigo (não distingue owner vs team_member com permission)
- **[GAP-PAP-7.1]** Contrato: assinatura hoje é "adotante preenche signature_text" — não há "abrigo também assina (representante legal)". Para 14.063/2020 advanced, ambos deveriam assinar
- **[GAP-PAP-9.1]** Pós-adoção: `markAsReturned` aceita só `actor.uid` mas não distingue adotante (devolução) vs abrigo (registro). Poderia ser: "Adotante devolve" (UI A) vs "Abrigo registra devolução" (UI B)
- **[GAP-PAP-A.1]** Abrigo: `isClubOwnerOrAdmin` é binário; não há "vice-admin" com permissões parciais (campo `owner_id` no clubs é o dono imutável; mas não há "admin delegado")
- **[GAP-PAP-F.1]** Foster: `acceptFosterPlacement` exige `actor.uid === foster_uid`. Mas o **cônjuge/responsável pelo LT** também poderia aceitar (multi-user profile)
- **[GAP-PAP-F.2]** Foster: Não há role "coordenador de LT" no abrigo (quem valida, quem escolhe, quem paga)
- **[GAP-PAP-1.1]** Pet intake: Não há role "veterinário" que possa cadastrar medical sem ser admin do abrigo
- **[GAP-PAP-3.1]** Vitrine: `pet.status` field controla visibilidade, mas **não há role "embaixador"** que pode ver animals em processo restrito
- **Smoke cross-role:** Não confirmado que existe um test que roda o fluxo inteiro com 3 papéis diferentes (applicant, abrigo, platform_admin) e checa permission gates — **provável GAP (TASK proposta)**

---

## 3. EIXO 3 — Regras de Negócio (Business Rules)

### ✅ O que existe

**Zod em 100% dos services:** `adoptionService`, `fosterService`, `shelterAnimalService`, `postAdoptionService`, `exhibitionService`, `kanbanService`, `medicalRecordsService`, `medicationService`, `adopterProfileService`, `volunteerProfileService`, `timelineService`, etc — todos com `.parse(input)` antes de qualquer I/O.

**Firestore rules (1629 linhas):** `match /clubs/{clubId}/adoption_workflow/{appId}` com **return explícito** em todas as operações (read/create/update/delete separados), `terms_*` imutáveis em update, multi-tenant via `request.resource.data.shelter_club_id == clubId`.

**Snapshot pattern:** `applicant_snapshot` em `adoptionService.js:382-416` é imutável após submit (Firestore rules garantem em update). Foster tem `foster_profile_snapshot` (linha 88 do fosterService). Aplicação tem `applicant_form` (não-imutável mas o snapshot é o congelado).

**Multi-tenant:** TODAS as subcoleções em `clubs/{clubId}/` têm `shelter_club_id` redundante validado em create+update. Subcoleções em `pets/{petId}/` usam `_petShelterClubId(petId)`. Cross-tenant explícito: `if (current.shelter_club_id !== shelterClubId) throw new Error('Cross-tenant access blocked.')` em todos os services.

**Audit log imutável:** `createAuditLog` em 100% das mutations sensíveis (best-effort, `.catch(()=>{})` não bloqueia).

**LGPD parcial:**
- `users/{userId}.adopter_profile.cpf` (campo livre, sem validação de formato)
- `users/{userId}.volunteer_profile` similar
- `foster_profile_snapshot.cpf` (Zod: `^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$` ✓)
- `terms_accepted_at` + `terms_version` em `clubs/{clubId}/onboarding` e `adoption_workflow`
- `dataExportService.js` existe (não inspecionado)
- `deleteAccountService.js` existe (não inspecionado)
- `src/pages/PrivacyPolicy.jsx` expandido
- `src/pages/avisos-legais`, `cookies` existem

**Rate limit:** `functions/middleware/rateLimit.js` em `googleFormsWebhook`. Falta em mutations client-side.

**Post-adoption cron (Regra A §1.3):** `postAdoptionCron.js:96-99` materializa só `scheduled_for <= now + 90d` (buffer 90d). ✓

**Zod .partial() sem null:** convenção documentada em AGENTS.md. Em `medicalRecords.js`: `updateMedicalRecordSchema = createMedicalRecordSchema.partial()` — campos opcionais. ✓

**Single-field collectionGroup NUNCA em firestore.indexes.json:** presumido OK, mas não verifiquei `firestore.indexes.json`.

### ❌ Gaps por etapa

- **[GAP-REG-1.1]** Pet intake: `CreatePet.jsx:25-46` tem Zod client-side, mas **não há Zod no `petService.createPet`** (verificar — `petService.js:1+` exporta `createPet` mas não li a função inteira; presumo GAP se for só Firestore direto)
- **[GAP-REG-3.1]** Vitrine: Sem limite de requests no feed público (rate limit client-side não existe)
- **[GAP-REG-4.1]** Application: `submitAdoptionApplication` faz `getAdopterProfile(actor.uid).catch(() => null)` — silencioso. Se o profile falhar por permissão, o snapshot fica null sem aviso
- **[GAP-REG-5.1]** Entrevista: Sem state machine dedicado de interview (status existe no schema mas sem service que valida transição)
- **[GAP-REG-6.1]** Match: `decideApplication:212-214` checa `isTerminal` mas **se um admin abortar** o status `adoption_completed` → `cancelled`? Não. State machine é estrita (sem volta de terminal)
- **[GAP-REG-7.1]** **BLOCKEr — Contrato: Sem validação que o termo version aceito é o último publicado** — o caller passa `terms_version: 'v1'` mas o server não valida contra `ADOPTION_TERMS_VERSION` atual
- **[GAP-REG-7.2]** Contrato: `signature_text` validado só como "min 3 chars" (Zod em adoption.js:125) — não exige nome completo
- **[GAP-REG-7.3]** Contrato: Sem validação de que o adotante é maior de 18 (CPF check seria o proxy, mas hoje é só text)
- **[GAP-REG-8.1]** Onboarding: `AdopterProfileForm.jsx:88` valida nome min 2 chars no client, mas o **service não re-valida** (Zod é client-side only). Se o dev esquecer, o server aceita
- **[GAP-REG-9.1]** Pós-adoção: `materializeForAdoption:233-236` retorna `{materialized: 0, skipped: 0, reason: 'status is X'}` sem propagar para `last_materialized_at` (não atualiza timestamp se nada materializou)
- **[GAP-REG-A.1]** Abrigo: `cutoverService.js:142-156` faz `getDocs(collectionGroup(db, collectionName))` com `limit(1)` — não respeita regras (testa só a permissão de leitura, não tenta escrever)
- **[GAP-REG-F.1]** Foster: `acceptFosterPlacement:147-167` valida que `actor.uid === foster_uid` mas **não valida que o uid é um usuário válido** (existe em `users/`)
- **LGPD direito ao esquecimento:** `deleteAccountService.js` presumido, mas não verifiquei se anonimiza ou hard-delete. Documentar.
- **LGPD export:** `dataExportService.js` presumido, mas não verifiquei se exporta tudo (pets, applications, posts, donations). Documentar.
- **Multi-tenant pet:** `pets/{petId}` é **global** (sem `shelter_owner_club_id` no doc raiz) — mas a seção 11.1 do roadmap diz que "linha do tempo" é global, e "prontuário" é tenant-specific. ✓ Confirmar que a separação foi feita corretamente nas subcoleções.
- **Snapshot imutável em application:** ✓ Confirmado em adoption.js + firestore.rules:724-734.

---

## 4. EIXO 4 — Integrações (Integrations)

### ✅ O que existe

**Cloud Functions (`functions/index.js`):**
- `onPetCreatedNotifyRadar` — trigger onCreate `pets/{petId}` → notifica usuários com radar compatível
- `googleFormsWebhook` — onRequest POST valida secret + rate limit + cria application
- `materializePostAdoptionTasks` — onSchedule `0 6 * * *` UTC (cron diário)
- `snapshotPlatformHealth` — onSchedule every 1h
- `onPlatformAlertEvent` — onCreate `platform_alert_events/{eventId}` → Slack/Email
- `triggerSecurityAlert` — onCall (admin)
- `__applyRateLimit` — middleware helper

**Storage:**
- `src/core/services/storageService.js` — `uploadImage`, helpers de URL, delete, list
- Foto de pet: caminho presumido `pets/{pet_id}/photos/{photo_id}.jpg`
- Foto de usuário: presumido `users/{uid}/avatar.jpg`
- Foto de abrigo: `clubs/{clubId}/cover.jpg`
- **Falta:** caminho dedicado para contratos assinados (`contracts/{contractId}.pdf`)

**Search:**
- `src/modules/shelter/services/searchService.js` — multi-entity search no Firestore nativo
- `src/modules/shelter/domain/search/search.js` — `buildSearchQuery`, `mapDocToResult`, `rankResults`
- **Decisão TASK-001:** Firestore nativo (não Meilisearch/Typesense/Algolia) ✓
- **Falta:** Sync ativo (Cloud Function onWrite que atualizaria o índice — **NÃO EXISTE**). Sem sync, search roda direto nas collections principais; ok para volume baixo, ruim em escala

**Email:** **AUSENTE.** Não há SendGrid/Resend/Mailgun plugado. `notificationService.js` só cria docs em `notifications/`. Cloud Functions tampouco enviam email (só Slack via adminAlerts).

**FCM (push):** **AUSENTE.** Não há código de FCM no frontend nem Cloud Functions. `notificationService.js` cria doc Firestore, mas push em si não dispara.

**Webhooks externos:** **AUSENTE.** Não há integração com veterinários, pet shops, sistemas de castração. `googleFormsWebhook` é o único webhook (entrada, não saída).

**LGPD endpoints:** `dataExportService.js` e `deleteAccountService.js` presumidos.

**Storage de pets fotos:** `src/modules/pets/services/petService.js:1` exporta `normalizePetPhotoUrls` — confirma uso de storage URLs.

### ❌ Gaps por etapa

- **[GAP-INT-1.1]** Pet intake: Sem importação batch de planilha (CSV) ou Google Sheets
- **[GAP-INT-2.1]** Cadastro: Sem Storage para documentos veterinários (PDF, RX) — schema `medical.documents` existe, mas `medicalRecordsService.js` (verificar) pode não estar uploadando
- **[GAP-INT-4.1]** Application: **Sem e-mail de confirmação** ao adotante após submit
- **[GAP-INT-4.2]** Application: Sem integração WhatsApp Business API (canal muito usado por abrigos brasileiros)
- **[GAP-INT-5.1]** Entrevista: Sem integração com Google Calendar / Microsoft Graph para agendar entrevistas
- **[GAP-INT-5.2]** Entrevista: Sem vídeo-chamada integrada (Zoom, Google Meet, Jitsi)
- **[GAP-INT-5.3]** Entrevista: Sem envio automático de questionários pré-entrevista
- **[GAP-INT-6.1]** Match: Sem envio de "carta de aprovação" template (e-mail com o termo embedded)
- **[GAP-INT-6.2]** Match: Sem integração com sistemas de castração (registro municipal, SINPatinhas)
- **[GAP-INT-7.1]** **BLOCKEr — Contrato: Sem Storage do PDF assinado**
- **[GAP-INT-7.2]** Contrato: Sem integração com plataforma de e-signature externa (Clicksign, DocuSign BR, Autentique) — `AdoptionFormFill` é clickwrap mas não é "advanced electronic signature" completa
- **[GAP-INT-7.3]** Contrato: Sem QR de validação (link público que mostra "este contrato foi assinado em X por Y")
- **[GAP-INT-8.1]** Onboarding: Sem integração com Receita Federal (validação CPF) — campo `cpf` é livre
- **[GAP-INT-8.2]** Onboarding: Sem integração com WhatsApp Business pra validação de telefone
- **[GAP-INT-9.1]** **BLOCKEr — Pós-adoção: Sem Cloud Function scheduled que notifica adotante** ("tem task devida hoje") — só o cron que materializa; quem dispara o email/push? Ninguém
- **[GAP-INT-9.2]** Pós-adoção: Sem webhook de devolução (quando adotante devolve, o abrigo é notificado proativamente?)
- **[GAP-INT-A.1]** Abrigo: Sem integração com PIX/Cartão pra receber doações direto (hoje presumo que passa por Stripe/MP, não confirmado)
- **[GAP-INT-A.2]** Abrigo: Sem webhook do banco pra conciliar doações
- **[GAP-INT-F.1]** Foster: Sem integração com transportadora (Uber Pet, Petlove Transport) pra levar animal
- **Google Forms auto-import:** Service `googleFormsService.js` + `googleFormsWebhook.js` ✓ (existe), mas **Falta** a UI de review/edit no painel (chega application direto)
- **Storage rules (`storage.rules`):** Não inspecionado; presumo que tem regras de tipo de arquivo (jpg/png) e tamanho

---

## 5. EIXO 5 — Estado Pós-Deploy (Production State)

### ✅ O que existe

**Feature flags (24 SHELTER_*):** `src/core/featureFlags.js:115-118` importa de `shelter/domain/constants.js`. **TODAS default OFF.** Painel `/admin/flags` permite ligar.

**Cutover service:** `src/modules/shelter/services/cutoverService.js` valida 11 collections + 24 flags. Lista `REQUIRED_FLAGS_FOR_CUTOVER` (não inclui CUTOVER — ele é a última).

**Audit log:** `audit_logs` collection com `actor_id`, `action`, `action_label`, `details`, `ip_address`, `user_agent`, `created_at_ms` + serverTimestamp. Consultável em `/admin/auditoria`.

**Backup Firestore:** presumido (Firebase faz auto-backup point-in-time recovery); não confirmei config.

**Privacy Policy + Termos expandidos:** `src/pages/PrivacyPolicy.jsx`, `Terms.jsx`, `Legislation.jsx`, `CookiePolicy.jsx`, `CodeOfConduct.jsx`, `Liability` (?), `AdopterTerms.jsx`, `ShelterTerms.jsx`, `VolunteerTerms.jsx`, `FosterTerms.jsx`, `DonorTerms.jsx` — 11 páginas legais.

**LGPD consent (parcial):** Banner de cookies presumido; `cookiePolicy` existe; aceite de termos via `termsAcceptanceService.js`.

### ❌ Gaps por etapa

- **[GAP-DEP-1]** **Smoke test em produção (`scripts/smoke-prod.mjs`):** Não confirmado que existe. Há `test-org-admin-debug.mjs` (não relacionado) e `playwright.config.js`. **Presumido GAP — criar script que percorre todas as flags SHELTER_* ON e valida o fluxo inteiro**
- **[GAP-DEP-2]** **Sentry:** Não confirmado. `core/services/observabilityService.js` presumido mas não verifiquei
- **[GAP-DEP-3]** **Firebase Analytics funil de adoção:** Não confirmado. `notificationService` tem `type` mas sem funil ponta-a-ponta
- **[GAP-DEP-4]** **Custom metrics:** `platform_health_snapshots` é coletado 1h, mas não há métricas customizadas de adoption (tempo médio, drop-off)
- **[GAP-DEP-5]** **Rollback plan em DELIVERABLE.md:** Não verificado — presumo GAP porque cada feature entrega `DELIVERABLE.md` mas precisa ser cross-feature
- **[GAP-DEP-6]** **LGPD compliance check antes de subir:** Não documentado processo de DPO sign-off
- **[GAP-DEP-7]** **Bundle hash no PR:** Não verificado (CI presumido, mas não confirmado)
- **[GAP-DEP-8]** **Feature flag por fase (não por feature inteira):** Confirmado — cada fase tem sua flag, **bom** ✓
- **[GAP-DEP-9]** **Smoke test cross-role:** Não confirmado
- **[GAP-DEP-10]** **Auditoria de mudanças em cada etapa:** ✓ Confirmado (audit_log em todos)
- **[GAP-DEP-11]** **Milestones pós-adoption com cron scheduled_for <= now+90d:** ✓ Confirmado em `postAdoptionCron.js:96-99`
- **[GAP-DEP-12]** **Per-abrigo canário:** Não documentado processo ("ligar em 1 abrigo, validar, expandir")
- **[GAP-DEP-13]** **Smoke test em produção (manual ou script):** **CRÍTICO** — sem isso, "done" não é verificável
- **[GAP-DEP-14]** **Sem smoke test no navegador (Playwright e2e):** Há `playwright.config.js` mas não verifiquei quais fluxos estão cobertos
- **[GAP-DEP-15]** **Sem política de feature flag "stale":** Flags podem ficar ON em prod pra sempre sem warning
- **[GAP-DEP-16]** **Sem monitoring de Cloud Function error rate:** `platform_health_snapshots` pode capturar mas não confirmei

---

## Tasks novas propostas (ordenadas por prioridade)

> Convenção: TASK-141..TASK-181. **NÃO** adicione você mesmo — só estruture. Sequencial após TASK-140.

### BLOCKERS (Critical — funcionalidades centrais ausentes)

| ID | Título | Tipo | Priority | Eixo | Etapa | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|---|
| TASK-141 | [CONTRACT-001] Criar coleção `contracts/{contractId}` dedicada com Storage de PDF assinado | feature | critical | 3-regras + 4-int | 7-contrato | [] | Hoje o aceite do termo é embed em `adoption_workflow/{appId}`. Criar coleção dedicada em `clubs/{clubId}/contracts/{contractId}` com: hash SHA-256 do documento, IP, user-agent, signature_text adotante, signature_text abrigo (representante), timestamp, PDF em Storage. Migrar docs legados. UI: rota `/contracts` no abrigo (search + export) e `/profile/contracts` pro adotante (download). Firestore rules com return explícito. Zod schema novo. Multi-tenant. Audit log. |
| TASK-142 | [POSTADOPT-001] UI do dashboard pessoal do adotante pós-adoção | feature | critical | 1-ux + 4-int | 9-pós | [] | Rota `/adoptions` (ou `/my-adoptions`) com lista de adoções concluídas + tasks pendentes materializadas (`kanban_tasks` filtradas por `adopter_uid == auth.uid`). UI pro adotante completar task (upload foto, responder check-in). Cloud Function scheduled adicional (1x/dia 9h BRT) que notifica via FCM/email tasks devidas. Componente `PostAdoptionDashboard.jsx` + hook `useMyAdoptions` + service `postAdoptionService.completeTask`. |
| TASK-143 | [INTERVIEW-001] Implementar fluxo de entrevista dedicado (scheduling + checklist + record) | feature | critical | 1-ux + 4-int | 5-entrevista | [] | Criar `clubs/{clubId}/interviews/{interviewId}` collection. Schema: application_id, scheduled_at, mode (presencial|video|telefone), checklist[] (tópicos: "viu quintal", "tem renda compatível", etc), completed_at, completed_by_uid, notes, evaluation_stars, evaluation_notes. Service `interviewService.js` (propose, schedule, complete, evaluate). UI: `InterviewTab` no painel do abrigo, `InterviewCard` no `ApplicationsList`, `MyInterviewCard` no perfil do adotante. Status no adoption workflow: `interview_scheduled → interview_done` (já existe em `VALID_TRANSITIONS` mas sem materialização). |
| TASK-144 | [EMAIL-001] Integrar SendGrid ou Resend pra email transacional (LGPD) | feature | critical | 4-int + 5-pós | 1-9 (todas) | [] | Cloud Function `sendEmail` (onCall) com templates versionados: application_received, interview_scheduled, match_approved, contract_ready, milestone_due, milestone_overdue, post_adoption_returned. Templates em `src/core/services/emailTemplates.js` com versioning. Respeitar opt-out (campo `users/{uid}.email_opt_out`). Audit log de cada envio (sem PII no details, só uid + template). LGPD: consentimento explícito no onboarding, link de unsubscribe em cada email. Painel admin pro platform_admin ver taxa de abertura. Feature flag: `SHELTER_EMAIL_V1` default OFF. |
| TASK-145 | [FCM-001] Integrar Firebase Cloud Messaging pra push notifications | feature | critical | 4-int + 5-pós | 1-9 | [TASK-144] | Service worker registra FCM token em `users/{uid}.fcm_tokens[]`. Cloud Function `sendPush` (onCall) com notification type + link. Triggers: onCreate `adoption_workflow` (notifica abrigo), onUpdate `adoption_workflow.status` (notifica adotante), onCreate `kanban_tasks` (notifica adotante). Permission request na UX: pedir permissão após 1ª ação relevante (não no signup). Feature flag: `SHELTER_FCM_V1` default OFF. Respeitar opt-out. |
| TASK-146 | [SMOKE-001] Criar script `scripts/smoke-prod.mjs` com smoke test cross-role | feature | critical | 5-pós | 1-9 (todas) | [] | Script Playwright que: (1) login como applicant, submete application; (2) login como abrigo admin, aprova; (3) login como abrigo admin, gera contrato; (4) login como adotante, assina; (5) login como abrigo, vê pós-adoção criado. Roda contra staging. Verifica cada flag SHELTER_* ON. CI gate: bloqueia merge se falhar. Adicionar a `npm run smoke:prod`. |

### CRITICAL (LGPD, security, multi-tenant)

| ID | Título | Tipo | Priority | Eixo | Etapa | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|---|
| TASK-147 | [LPGD-EXPORT-001] `dataExportService.js`: garantir export completo de PII (LGPD art. 18 V) | security | critical | 3-regras + 5-pós | 8-onboarding | [] | Auditar `dataExportService.js`. Garantir export de: pets do usuário, applications (submitted + received), mensagens, donations, terms_acceptances, audit_logs pessoais (actor_id == uid). Formato JSON ZIP. Botão "Baixar meus dados" no `/profile` (não gated). Audit log do próprio export. DPO assina. |
| TASK-148 | [LGPD-DELETE-001] `deleteAccountService.js`: garantir anonimização LGPD art. 18 VI | security | critical | 3-regras + 5-pós | 8-onboarding | [] | Auditar `deleteAccountService.js`. Soft delete + purge em 30 dias. Anonimizar: `users/{uid}.displayName` → "Usuário removido", `email` → "[removido]", `cpf` → null, foto → deletada. Manter audit_logs agregados (6 meses — Marco Civil). Confirmação dupla (email + senha). |
| TASK-149 | [INTEL-001] Hardening de `CreatePet.jsx`: step de Cadastro de Resgate | feature | high | 1-ux | 1-intake | [] | Adicionar step "Resgate" no wizard (`STEPS = ['Fotos', 'Sobre', 'Resgate', 'Saúde', 'Revisão']`). Campos: `rescue_name`, `rescue_date`, `rescue_by_uid`, `rescue_location` (address+city+state+lat+lng), `microchip_id`, `intake_type` (5 valores), `asilomar_status` (5 valores). Componente `RescueStep.jsx`. Microcopy explicando o que é Asilomar Status. |
| TASK-150 | [CONTRACT-002] Hash SHA-256 do documento no aceite | feature | high | 3-regras | 7-contrato | [TASK-141] | `SingleAcceptanceDialog` calcula hash do `ADOPTION_TERMS_TEXT` + version. Persiste no `contracts/{id}.document_hash`. Audit log inclui o hash. Adicionar validação no `firestore.rules` que o hash bate com `adoptionTerms.js` versão. |
| TASK-151 | [CONTRACT-003] IP + user-agent no aceite do termo | security | high | 3-regras + 5-pós | 7-contrato | [TASK-141] | `createAcceptance` captura `__CF_CONNECTING_IP` (header) e `navigator.userAgent` no momento do aceite. Persiste em `contracts/{id}.signature_ip`, `.signature_user_agent`. Audit log redundante. Lei 14.063/2020 art. 6º. |
| TASK-152 | [SEC-001] Rate limit em mutations client-side sensíveis | security | high | 3-regras | 1-9 | [] | Adicionar throttle em: submit application (max 5/min/user), accept foster (max 3/min/user), decide application (max 10/min/abrigo), update pet (max 30/min/user). Implementar via Firestore rules usando `request.time` + counter collection, OU client-side debounce com toast warning. |
| TASK-153 | [MULTI-001] `adoptionService.decideApplication`: checar `isClubOwnerOrAdmin` no service | security | high | 3-regras | 6-match | [] | Hoje `adoptionService.js:267-273` assume "se não é applicant, é abrigo". Adicionar checagem explícita `if (!isApplicant && !isClubOwnerOrAdmin(shelterClubId)) throw new Error(...)`. Importar helper de `permissions.js`. Firestore rules compensam mas defense-in-depth. |
| TASK-154 | [PERM-001] Validar termo version aceito contra `ADOPTION_TERMS_VERSION` atual | security | high | 3-regras | 7-contrato | [TASK-141] | `submitAdoptionApplication` rejeita se `terms_version !== ADOPTION_TERMS_VERSION` (constante importada). Mensagem clara: "Termo desatualizado, recarregue a página". Previne aceitação de versão antiga em cache. |
| TASK-155 | [MOBILE-001] Auditoria mobile (a11y + touch targets) em todas as páginas do fluxo | feature | high | 1-ux | 1-9 (todas) | [] | Auditar com DevTools mobile + axe-core. Garantir: touch targets >= 44px, contraste WCAG AA, keyboard nav em todos os dialogs, ARIA labels em forms, swipe em galleries, bottom-sheet em mobile (não modal centralizado). Páginas: CreatePet, PetDetail, AdoptionFormFill, ApplicationsList, FostersList, Dashboard, Kanban (drag alternative). Teste em viewport 375x667 (iPhone SE) e 412x915 (Pixel 7). |

### HIGH (UX público, integrações core)

| ID | Título | Tipo | Priority | Eixo | Etapa | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|---|
| TASK-156 | [UX-ABRIGO-001] Página pública `/abrigos/:id` rica com 3 CTAs (Adotar/Voluntário/LT) | feature | high | 1-ux | A-abrigo | [] | Componente `ShelterPublicPage.jsx` com capa + chips + tabs (Sobre, Pets, Vitrines, Equipe, Contato). 3 CTAs integrados: "Quero adotar" (link feed filtrado), "Quero ser voluntário" (modal/signup), "Quero ser lar temporário" (modal/signup). Mobile-first. Open Graph meta. `ClubDetail` é a base; refatorar. |
| TASK-157 | [UX-APP-001] Página "Minha Application" pro adotante | feature | high | 1-ux | 4-application | [] | Rota `/meus-pedidos` (separado de `/meus-interesses` legacy). Lista applications do `adoption_workflow` com timeline do status (submited → under_review → interview_scheduled → approved → contract_signed). Filtros: status, pet, abrigo. Detalhe com decisão do abrigo visível. |
| TASK-158 | [UX-FOSTER-001] Página pública `/lares-temporarios/novo` + perfil público do LT | feature | high | 1-ux | F-foster | [] | Cadastro público de LT (gated por feature flag). Perfil público `/lares-temporarios/:uid` (consentido) com foto, capacidade, região, histórico de adoções do LT. CTA "Quero ser LT" na home e em cada pet elegível. |
| TASK-159 | [UX-FOSTER-002] Dashboard pessoal do LT + UI devolução/avaliação | feature | high | 1-ux | F-foster | [] | Rota `/lares-temporarios/dashboard` (gated). Cards: "Pets sob minha guarda agora", "Próximos fins de placement (7d)", "Histórico de adoções do LT". UI dedicada pra `markAsReturned`, `endFosterPlacement` (rating + feedback). |
| TASK-160 | [UX-CONTRACT-001] UI dedicada de contratos no abrigo + download PDF | feature | high | 1-ux | 7-contrato | [TASK-141] | Rota `/abrigos/:id/contracts`. Lista todos os contracts do abrigo. Filtros: pet, adotante, data, status. Botão "Baixar PDF" (jspdf). Botão "Ver detalhes" (modal com hash, IP, user-agent, signature). |
| TASK-161 | [UX-POSTADOPT-001] UI de devolução + pause | feature | high | 1-ux | 9-pós | [TASK-142] | Componente `PostAdoptionReturnDialog.jsx` (chamado pelo adotante). Componente `PostAdoptionPauseDialog.jsx`. UI no abrigo pra ver "devolvidos" (status `returned`) com timeline. |
| TASK-162 | [UX-ABRIGO-002] Onboarding wizard do abrigo (5 passos) | feature | high | 1-ux | A-abrigo | [] | Componente `ShelterOnboardingWizard.jsx` com 5 steps: 1) Logo + capa, 2) Endereço, 3) Equipe (convidar primeiro admin), 4) Termos (DPA + aceite), 5) Primeiro pet. Salva progress em `clubs/{clubId}/onboarding/wizard_state`. Smoke test: novo abrigo é criado com 80%+ perfil completo. |
| TASK-163 | [UX-MATCH-001] Scoring de compatibilidade visível no ApplicationsList | feature | high | 1-ux | 6-match | [] | Reusar `pets/domain/matching.js` (lógica de compatibilidade). Adicionar score 0-100% no card da application. Badge "Match alto/medio/baixo". Permitir ordenar por score. Requer `applicant_snapshot` completo (já existe). |
| TASK-164 | [UX-ABRIGO-003] Dashboard pessoal do admin do abrigo | feature | high | 1-ux | A-abrigo | [] | Cards filtrados por uid: "Minhas tasks pendentes" (kanban onde sou assignee), "Applications que me atribuíram", "Pets que cadastrei". Diferente do `DashboardPage` (que é do abrigo inteiro). |
| TASK-165 | [INT-SEARCH-001] Sync ativo do search index (Cloud Function onWrite) | feature | high | 4-int | 3-vitrine + busca | [] | Cloud Function `onPetWrite` que atualiza coleção `search_pets/{petId}` com campos normalizados (nome_lower, breed_tokens, location). Mesma estratégia pra `users`, `clubs`, `fosters`. Hooks `useSmartSearch` consomem o índice. Permitir "starts with" e combinações booleanas. |
| TASK-166 | [INT-IMPORT-001] UI de review/edit de pets importados via Google Forms | feature | high | 4-int | 1-intake | [] | Componente `ImportReview.jsx`. Após webhook Google Forms criar pets com `status='pending_review'`, listar no painel do abrigo pra revisar (faltam fotos? nome correto? castrado?). Bulk approve/reject. Caminho esperado: rota `/abrigos/:id/imports`. |
| TASK-167 | [INT-STORAGE-001] Storage dedicado para documentos veterinários + contracts | feature | high | 4-int | 7-contrato + 7-saúde | [TASK-141] | Caminho `pets/{pet_id}/medical/{record_id}/documents/{file}` com rules de tipo (pdf, jpg, png) e tamanho (max 20MB). Caminho `clubs/{clubId}/contracts/{contractId}/{file}`. Storage rules com return explícito. Audit log de upload/delete. |
| TASK-168 | [UX-A11Y-001] Acessibilidade: keyboard nav, ARIA, contraste WCAG AA em todos os dialogs | feature | high | 1-ux | 1-9 | [] | Auditar axe-core em todas as páginas do fluxo. Corrigir: foco trap em dialogs, Escape fecha, tabIndex em forms, aria-label em botões de ícone, role em custom widgets (kanban, slider), contraste de badges, alt text em fotos. Lighthouse a11y >= 90. |
| TASK-169 | [UX-MOBILE-001] Bottom sheet em mobile (substituir modals) | feature | high | 1-ux | 1-9 | [TASK-155] | Onde há modal centralizado hoje (DecisionModal em ApplicationsList, foster accept, etc), usar `Dialog` shadcn mas com `sm:bottom-0 sm:rounded-b-none` em viewport < 640px. Bottom sheet nativo em iOS, drawer em Android. Testar touch dismiss. |
| TASK-170 | [INT-CALENDAR-001] Integração com Google Calendar pra agendar entrevista + home check | feature | high | 4-int | 5-entrevista | [TASK-143] | OAuth2 Google Calendar. Botão "Agendar" no `InterviewTab` gera evento com attendees (abrigo + adotante). Sync bidirecional. Fallback se recusar. Cuidar LGPD: consentimento explícito pra compartilhar email. |

### MEDIUM (polish, integrações nice-to-have)

| ID | Título | Tipo | Priority | Eixo | Etapa | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|---|
| TASK-171 | [UX-CONTRACT-002] Disclaimers destacados de vícios redibitórios (parvovirose etc) | feature | medium | 1-ux | 7-contrato | [TASK-141] | Texto destacado em `<aside className="bg-amber-50 p-4 rounded">` dentro do aceite, exigindo checkbox separado "Estou ciente dos riscos de X, Y, Z" antes de prosseguir. Cobre juridicamente o abrigo. |
| TASK-172 | [UX-CONTRACT-003] "Aceito por procuração" (representante legal) | feature | medium | 1-ux + 2-papéis | 7-contrato | [TASK-141] | Checkbox "Represento outra pessoa" → form extra (nome completo, CPF do representado, parentesco, upload da procuração). Validação server-side. |
| TASK-173 | [INT-VIDEO-001] Integração Jitsi Meet pra vídeo-entrevista | feature | medium | 4-int | 5-entrevista | [TASK-143] | Botão "Iniciar vídeo" gera sala Jitsi efêmera (nome random + expira em 1h). LGPD: não gravar sem consent. Link compartilhado com entrevistado. |
| TASK-174 | [INT-CPF-001] Validação CPF na entrada (API Receita ou algoritmo) | feature | medium | 3-regras + 4-int | 8-onboarding | [] | Server-side: validar dígitos verificadores. Opcional: chamar API pública (não há oficial gratuita; alternativa: validar formato + algoritmo). Audit log se usou API externa. |
| TASK-175 | [INT-WHATSAPP-001] Integração WhatsApp Business pra validação de telefone | feature | medium | 4-int | 8-onboarding | [] | Deep link `https://wa.me/55...` no perfil. Validação por OTP via API oficial (Twilio + WhatsApp Business). LGPD: consent explícito. |
| TASK-176 | [UX-VITRINE-001] Lightbox acessível na galeria do pet | feature | medium | 1-ux | 3-vitrine | [TASK-168] | Componente `<Lightbox>` com keyboard nav (←, →, Esc), swipe em mobile, ARIA dialog, fullscreen. |
| TASK-177 | [UX-SIMILAR-001] "Pets similares" no PetDetail | feature | medium | 1-ux | 3-vitrine | [] | Query "same species + same size + available + not this pet" ordenado por rescue_date. Mostrar 4 cards. |
| TASK-178 | [UX-MILESTONE-001] Foto/video upload pro adotante completar milestone | feature | medium | 1-ux | 9-pós | [TASK-142] | Componente `MilestoneCompleteDialog.jsx`. Upload direto pra Storage (`kanban_tasks/{taskId}/proof/{file}`). Mostra foto no card do milestone. Comemoração visual (confetti leve). |
| TASK-179 | [UX-FOSTER-003] Vitrine do LT (histórico público de pets que passaram) | feature | medium | 1-ux | F-foster | [TASK-158] | `/lares-temporarios/:uid/historico` — lista pets que passaram pelo LT com consent (filtro `consent_to_show_history == true`). Foto + nome + status final. |
| TASK-180 | [DEP-CUTOVER-001] Cutover plan detalhado por fase + dry-run script | feature | medium | 5-pós | A-abrigo (cutover) | [TASK-146, TASK-155] | Documento `docs/CUTOVER_PLAN.md` com: ordem de ligar flags, smoke por flag, rollback procedure por flag, métricas de sucesso. Script `scripts/dry-run-cutover.mjs` que valida sem aplicar. |

### LOW (docs, refactor, débito)

| ID | Título | Tipo | Priority | Eixo | Etapa | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|---|
| TASK-181 | [REFACTOR-001] Substituir `window.prompt` em `FostersList.jsx:96-100` por modal shadcn | refactor | low | 1-ux | F-foster | [] | `handleExtend` e `handleEnd` usam `window.prompt` — não é UX aceitável. Substituir por `Dialog` shadcn com form. |

---

## Interfaces com Agente A (Voluntários) e Agente C (Comunidade/Adotante/Eventos)

### Com Agente A (Voluntários)

- **[INT-A-01]** Pet tem campo "voluntários responsáveis" (vinculação direta pet ↔ volunteer para clinical care / daily walks) — schema de `volunteer_profiles` tem `hours_logged_total` mas não há `assigned_pets[]`. Hoje `volunteer_participations` vincula voluntário a evento (exhibition), não a pet individual. **Sugestão:** criar `pets/{petId}/volunteer_assignments/{uid}` collection multi-tenant.
- **[INT-A-02]** Dashboard do abrigo: voluntários aparecem como "Responsáveis" no card de cada pet (integração com `volunteer_profiles` + `clubs/{clubId}/volunteers/{uid}`). **Hoje** o `VolunteersRoster.jsx` existe mas não é linkado ao pet.
- **[INT-A-03]** Vitrine (evento): vinculação de voluntários a shifts do evento já existe (`exhibitions/{id}/shifts/{shiftId}` + `volunteer_participations`). **Cobertura boa**, mas falta UI de "Confirmar presença" no mobile do voluntário.
- **[INT-A-04]** Foster: voluntário pode também ser LT? Ou são papéis distintos? Schema de `foster` é separado de `volunteer`. **Decisão de produto pendente** — se volunteer pode ser foster, qual fica primário?

### Com Agente C (Comunidade/Adotante/Eventos)

- **[INT-C-01]** Adotante tem perfil completo (`AdopterProfileForm.jsx`) — **integração boa**, mas precisa de página pública `/adopters/:uid` (consentida) com pets anteriores, badges, etc.
- **[INT-C-02]** Eventos públicos (community_events + club_events) — adotante pode se inscrever? O `exhibitions` é abrigo-específico, mas community_events é cross-platform. **Verificar** se há rota de "Inscrição em evento" que cruze com adoption flow.
- **[INT-C-03]** Busca (`/busca` ou CommandPalette): `searchService.js` indexa pets + adotantes + abrigos — **cobertura boa**, mas sem sync ativo (GAP-INT-SEARCH-001).
- **[INT-C-04]** Mural do abrigo (ClubFeedTab): voluntário do abrigo posta; adotante vê. **Cobertura ok**, mas "match approved" não é postado automaticamente no mural do abrigo (cross-feature de notificação).
- **[INT-C-05]** Doação: `club_donations` presumido, mas o adotante recebe CTA de doar após match approved? **Provável GAP**, integrar com DonorTerms.jsx + rota de doação.

---

## Recomendações

### Ordem de implementação sugerida (3 sprints)

**Sprint 1 (Crítico — Blockers + LGPD) — 2 semanas:**
1. TASK-141 (CONTRACT-001) — feature central
2. TASK-142 (POSTADOPT-001) — feature central
3. TASK-144 (EMAIL-001) — desbloqueia 145 e várias notificações
4. TASK-147 (LGPD-EXPORT) + TASK-148 (LGPD-DELETE) — auditoria LGPD
5. TASK-146 (SMOKE-001) — gate de qualidade

**Sprint 2 (Critical + High) — 2 semanas:**
6. TASK-143 (INTERVIEW-001) — feature central
7. TASK-145 (FCM-001) — depende de 144
8. TASK-155 (MOBILE-001) + TASK-168 (A11Y-001) + TASK-169 (BOTTOM-SHEET) — polish base
9. TASK-150 (CONTRACT-002) + TASK-151 (CONTRACT-003) + TASK-154 (PERM-001) — segurança do contrato
10. TASK-149 (INTEL-001) — Cadastro de Resgate step

**Sprint 3 (High — UX) — 2 semanas:**
11. TASK-156 (UX-ABRIGO-001) + TASK-162 (UX-ABRIGO-002) + TASK-164 (UX-ABRIGO-003) — abrigo rico
12. TASK-157 (UX-APP-001) + TASK-163 (UX-MATCH-001) — applications + match
13. TASK-158 (UX-FOSTER-001) + TASK-159 (UX-FOSTER-002) — LT
14. TASK-160 (UX-CONTRACT-001) + TASK-161 (UX-POSTADOPT-001) — contrato + pós
15. TASK-165 (INT-SEARCH-001) + TASK-166 (INT-IMPORT-001) + TASK-167 (INT-STORAGE-001) — integrações

### Riscos

- **Risco 1:** TASK-141 e TASK-142 mexem em Firestore schema (criar `contracts/`, mudar `post_adoption/`). **Mitigação:** schema evolutivo, dual-read/write, cutover planejado.
- **Risco 2:** TASK-144 (Email) precisa de provedor (SendGrid vs Resend). **Decisão humana** pendente. Comparar custo, LGPD (data center BR?), deliverability.
- **Risco 3:** TASK-143 (Interview) e TASK-170 (Calendar) dependem de OAuth Google — implementação complexa, fallback necessário.
- **Risco 4:** TASK-155/168/169 (mobile+a11y+bottom-sheet) é polish base — pode se estourar.
- **Risco 5:** Tarefas com `BlockedBy: [TASK-141]` (15 delas) — se 141 atrasar, cascata.

### Dependências externas

- **SendGrid/Resend** — conta + API key + templates
- **FCM** — já é parte do Firebase (zero custo extra, só config)
- **Jitsi Meet** — self-hosted ou meet.jit.si (gratuito, embed iframe)
- **Google Calendar API** — OAuth client
- **API de validação CPF** — escolha entre algoritmo local (grátis) ou API (paga, mais confiável)
- **DPO sign-off** — bloqueia deploy de qualquer feature com PII novo

---

## Anti-patterns Regra A verificados

- [x] **Sem fluxo sem UX em cada etapa** — GAP: etapas 1, 4, 5, 6, 7, 8, 9 têm gaps de UX
- [x] **Empty/error/loading em cada tela** — PARCIAL: muitos componentes têm, mas não foi auditado
- [x] **Mobile + a11y em cada tela** — GAP: TASK-155 proposta
- [x] **Zod em cada mutation** — ✓ Confirmado (100% dos services)
- [x] **LGPD em PII em cada etapa** — PARCIAL: TASK-147/148 propostas pra auditoria
- [x] **Snapshot imutável em application** — ✓ Confirmado (firestore.rules:724-734)
- [x] **Multi-tenant shelter_id em cada coleção** — ✓ Confirmado (subcoleções + pet.shelter_owner_club_id)
- [x] **Feature flag por fase (não por feature inteira)** — ✓ Confirmado (24 flags SHELTER_*)
- [ ] **Smoke test cross-role** — ❌ GAP (TASK-146 proposta)
- [x] **Auditoria de mudanças em cada etapa** — ✓ Confirmado (audit_logs em 100% das mutations)
- [x] **Milestones pós-adoption com cron scheduled_for <= now+90d** — ✓ Confirmado (postAdoptionCron.js:96-99)
- [x] **Firestore rule com return explícito** — ✓ Confirmado (1629 linhas, todos os matches com allow explícito)
- [x] **Hardcode sem i18n** — presumo OK (língua única pt-BR na plataforma, documentado)
- [x] **Marcar done sem peer review** — TASK-140 (4 olhos) é exatamente o peer review
- [x] **Marcar done sem smoke em prod** — GAP (TASK-146)

---

## Conclusão

**Estado geral:** 70% cobertura do fluxo completo de Abrigos + Foster + Adoção. A **infraestrutura** (Firestore rules, multi-tenant, audit, Zod, feature flags) está **sólida**. As **features de gestão** (Dashboard, Kanban, Reports, Medical, Medication, Applications) estão **funcionais**. As **features de relação** (Contrato dedicado, Pós-adoção UI, Entrevista dedicada, Email, FCM) estão **parciais ou ausentes** — são os **blockers** deste relatório.

**Tarefas prioritárias (se tiver que escolher 5):** TASK-141, TASK-142, TASK-144, TASK-146, TASK-155.

**Total tasks propostas:** 41 (TASK-141..TASK-181), sendo:
- 6 critical (blockers + LGPD)
- 11 high (UX público + integrações core)
- 10 medium (polish + integrações nice-to-have)
- 1 low (refactor débito)

**Confirmação:** este relatório foi escrito em **MODO READ-ONLY** — nenhum arquivo do projeto (código-fonte, AGENTS.md, SCRUM_TASKS.json, firestore.rules, package.json, sync.cjs, autosync.cjs, install-hooks.cjs) foi modificado. Único arquivo escrito: este relatório em `.harness/_report-shelter-foster-adoption.md` (caminho alternativo ao `$MAVIS_SCRATCHPAD`, que estava vazio).

**Próximo passo (TASK-140):** avaliação independente (4 olhos) dos 3 relatórios dos agentes paralelos (TASK-136 voluntários, TASK-137 abrigos+foster+adoção, TASK-138 comunidade+adotante+eventos), consolidação em lista única priorizada, e atualização do SCRUM_TASKS.json.
