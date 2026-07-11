# Sistema de Gestão do Abrigo — Roadmap Detalhado

> **Status**: 21/22 fases concluídas (0–17 ✅, 19 ✅, 20 ✅, 21 ✅, 22 ✅ PR #66 pendente; Fase 18 ⏸️ decisão backend pendente.
> **Versão**: 0.9.1 — 2026-07-11 (Fase 22 PR #66 pendente; 21/22 concluídas)
> **Owner**: Mavis (sub-agente técnico do repo `fsalamoni/viralata`)
> **Macro-blocos**: 5 (A fundação, B núcleo do animal, C operação, D busca, E legal/segurança/admin)
>
> **Nota sobre numeração**: a Fase 5 deste roadmap (Google Forms webhook) foi adicionada após o plano original — ela **não substitui** a Fase 5 do roadmap (pós-adoção), apenas foi inserida **antes** dela. Resultado: as fases 5+ do projeto estão **+1 acima** do plano original (pós-adoção = Fase 6 do projeto, Lares Temporários = Fase 7, etc.). O tracker em `.mavis/scratchpad/shelter-roadmap-tracker.md` usa a numeração do projeto (que é a fonte da verdade).

## 1. Visão geral

A plataforma Viralata deixa de ser apenas um marketplace de pets para adoção e passa a ser um **sistema de gestão da causa animal** — hub completo de abrigos, animais, adotantes, voluntários, lares temporários, eventos, saúde, medicamentos, acompanhamentos e indicadores.

**Conceito central**: cada animal possui um **cadastro único** que segue o animal durante toda sua trajetória (resgate → abrigo → lar temporário → adotante). Todas as informações relacionadas a ele ficam vinculadas a esse cadastro, com **histórico e log completos e rastreáveis** — nada de planilhas paralelas, nada de retrabalho.

Cada módulo é **isolado e autônomo**: falha em um módulo não derruba os demais. Coleções novas convivem com antigas até a migração completa (sem breaking changes).

## 2. Princípios arquiteturais (válidos pra todas as fases)

1. **Feature flag por fase**. Default OFF; ligar só após validação em produção.
2. **Schema evolutivo, não breaking**: campos novos têm defaults e backfill seguro. Nunca `rename` em produção; usar dual-read/write durante migração.
3. **Coleções novas convivem com antigas**: nada de mexer em `pets`, `adoption_interests` etc. até a fase correspondente. Cada feature nova tem sua própria coleção/subcollection.
4. **Módulo isolado** em `src/modules/shelter/` com `domain/`, `services/`, `hooks/`, `components/`, `pages/`, `permissions/`, `constants/`. Falha em um módulo não derruba o resto.
5. **Logs + audit + fotos** centralizados em `pet_timeline/{pet_id}/events/{event_id}` + `audit_logs`. Toda mutação no abrigo dispara log.
6. **Defense in depth**: Firestore rules + service layer + hook + UI gating.
7. **Compatibilidade retroativa**: dados legados continuam funcionando enquanto a migração está em curso. Nunca deletar coluna/coleção sem plano de migração.
8. **PWA / offline-first**: o sistema funciona em abrigos com internet limitada (campos ficam em draft local, sincroniza depois).
9. **Auditoria como cidadão de primeira classe**: toda ação relevante (CRUD em pets, adoções, vitrines, kanban) gera entrada imutável em `audit_logs`.

## 3. Mapa de fases (22 fases, 5 macro-blocos)

```
┌──────────────────────────────────────────────────────────┐
│  BLOCO A — FUNDAÇÃO (Fase 0)            ~1 PR            │
│  • renomeação Org → Abrigo                              │
│  • módulo shelter/ skeleton                             │
│  • modelagem de dados definitiva                        │
├──────────────────────────────────────────────────────────┤
│  BLOCO B — NÚCLEO DO ANIMAL (Fases 1-9)  ~9 PRs         │
│  • cadastro único, timeline, adoção, adotante,           │
│    pós-adoção, lares temporários, saúde, medicação,     │
│    galeria                                              │
│  • Status (2026-07-10): Fases 1–8 ✅, Fase 9 ⏸️        │
├──────────────────────────────────────────────────────────┤
│  BLOCO C — OPERAÇÃO DO ABRIGO (Fases 10-17) ~8 PRs      │
│  • vitrines, RSVP, voluntários, dashboard, kanban,      │
│    relatórios, indicadores                              │
│  • Status (2026-07-11): Fases 10–17 ✅ (completo!)    │
├──────────────────────────────────────────────────────────┤
│  BLOCO D — BUSCA + DESCOBERTA (Fase 18)  ~1 PR grande   │
│  • sistema de busca inteligente multi-filtro             │
│  • Status (2026-07-10): 🚨 Decisão de backend pendente │
├──────────────────────────────────────────────────────────┤
│  BLOCO E — LEGAL + SEGURANÇA + ADMIN (Fases 19-22) ~5 PRs│
│  • termos completos, LGPD, segurança avançada, painel    │
│    de saúde da plataforma, cutover                       │
│  • Status (2026-07-11): Fases 19 ✅, 20 ✅, 21 ✅, 22 ⏸️ │
│  • Nota: 13 docs legais já guardados em                 │
│    /workspace/attachments/legal-seg/                     │
└──────────────────────────────────────────────────────────┘
```

**21/22 fases concluídas, 1/22 pendente** (18 ⏸️ decisão backend; 22 ⏸️ PR #66 pendente).
```

## 4. Dependências entre fases

```
Fase 0 (preparação)
  └→ Fase 1 (cadastro) ✅
       └→ Fase 2 (timeline) ✅
            ├→ Fase 5 (Google Forms) ✅
            ├→ Fase 6 (pós-adoção) ✅
            ├→ Fase 7 (lares temporários) ✅
            ├→ Fase 8 (saúde / prontuário) ✅
            │    └→ Fase 9 (medicação) ⏸️
            └→ Fase 10 (galeria) ✅
       └→ Fase 3 (adoção workflow) ✅
            └→ Fase 4 (adotante) ✅
  └→ Fase 11 (vitrines) ✅
       └→ Fase 12 (RSVP) ✅
       └→ Fase 13 (voluntários) ✅
  └→ Fase 14 (dashboard) ✅
       ├→ Fase 15 (kanban)
       ├→ Fase 16 (relatórios)
       └→ Fase 17 (indicadores)
  └→ Fase 17 (busca) — depende de TUDO acima
  └→ Fase 18 (busca inteligente) — decisão pendente (Meilisearch vs Typesense vs Algolia vs Firestore)
  └→ Fase 19 (legal) ✅ — completa mergeada em PR #58
  └→ Fase 19 (segurança) ✅ — mergeada em PR #62
  └→ Fase 20 (plataforma saúde) ✅ — mergeada em PR #60
       └→ Fase 21 (cutover)
```

## 5. Fases detalhadas

### Fase 0 — Preparação · flag `SHELTER_FOUNDATION`

**Objetivo**: deixar a base de código pronta para receber o novo sistema, sem renomeações agressivas no Firestore.

**Escopo**:
- Renomear **"Organizações" → "Abrigos"** e **"Organização/ONG" → "Abrigo"** em toda a UI (header, diretórios, CTAs, navegação, copy de marketing, breadcrumb, aba Equipe, aba Donations etc).
- NÃO renomear `clubs` → `shelters` no Firestore (alias `shelters = clubs` em leitura). Migração opcional posterior.
- Criar esqueleto `src/modules/shelter/` com `domain/constants.js`, `domain/permissions.js`, `domain/validators.js`, `services/`, `pages/`, `components/`, `hooks/`.
- Documentar `docs/SHELTER_MGMT_ROADMAP.md` (este doc).
- Atualizar `docs/ROADMAP.md` e `docs/MODULES.md` com referência ao novo doc.
- Criar 22 feature flags `SHELTER_*` no `featureFlags.js` (todas default OFF).

**Não escopo**:
- Mudanças em `clubs` (Firestore).
- Migração de dados.
- Mudanças em features existentes.

**Validação**:
- typecheck/lint/build OK
- testes existentes passam (303)
- smoke test em produção com flag OFF (não muda nada visível)

### Fase 1 — Cadastro Único do Animal · flag `SHELTER_ANIMAL_UNIFIED_PROFILE`

**Objetivo**: enriquecer o doc `pets/{petId}` com os campos que faltam pra um abrigo profissional.

**Novos campos em `pets/{petId}`**:
- `rescue_name` (string) — nome do animal no momento do resgate
- `rescue_date` (timestamp) — data do resgate
- `rescue_by_uid` (uid) — quem resgatou
- `rescue_location` (object) — `{address, city, state, lat, lng, source: 'manual'|'geocoded'}`
- `microchip_id` (string) — número do microchip (se aplicável)
- `intake_type` (enum: `rescue`|`born`|`transfer`|`purchase`|`surrender`)
- `intake_subtype` (string, optional) — ex: "car accident", "abandoned"
- `asilomar_status` (enum: `healthy`|`treatable_rehabilitatable`|`treatable_manageable`|`unhealthy_untreatable`|`undetermined`)
- `deceased_at` (timestamp, optional)
- `death_cause` (string, optional)
- `cross_posting` (object) — `{petfinder_synced_at, rescuegroups_synced_at, ...}`

**UI**:
- Estender `CreatePet.jsx` com nova aba "Cadastro de Resgate" (sub-etapa do wizard).
- Estender `PetDetail.jsx` com nova aba "Cadastro" (read-only se não for owner/admin) + botão "Editar cadastro".
- Form de edição respeita permissões granulares (owner + org com permissão `animals` + platform_admin).

**Firestore rules**: campos novos são append-friendly; só editáveis por owner + admins da ONG dona + platform_admin.

**Índices compostos** (atualizar `firestore.indexes.json`):
- `status` + `species` + `intake_date`
- `owner_id` + `intake_date`
- `asilomar_status` + `created_at`
- `microchip_id` (uniqueness por abrigo)

**Migração de dados**:
- Script Cloud Function (one-off): backfill pets existentes com `intake_type = 'rescue'` quando ausente, `rescue_date = created_at` quando ausente.
- Não destrutivo: campos opcionais ficam `null` em pets legados.

**Validação**:
- typecheck/lint/build OK
- +5 testes (novos campos no sanitizePet, permissões, migração)
- smoke test em produção com flag OFF

### Fase 2 — Linha do Tempo do Animal · flag `SHELTER_PET_TIMELINE`

**Objetivo**: histórico cronológico completo de tudo que aconteceu com o animal.

**Nova coleção**: `pet_timeline/{petId}/events/{eventId}`

**Tipos de evento** (enum):
`rescue` | `intake` | `foster_start` | `foster_end` | `vaccine` | `spay_neuter` | `vet_visit` | `hospitalization` | `medication_start` | `medication_end` | `exhibition` | `adoption` | `return` | `post_adoption_follow_up` | `death` | `other`

**Schema do evento**:
```js
{
  type: 'rescue',
  date: Timestamp,
  by_uid: 'user-abc',
  by_name: 'João Silva',  // denormalized para resiliência
  notes: '...',
  photos: ['https://...', 'https://...'],
  documents: [{ name, url, type, size }],
  related: {
    pet_id?: 'pet-abc',
    shelter_id?: 'shelter-abc',
    foster_id?: 'user-abc',
    adoption_id?: 'app-abc',
    exhibition_id?: 'exh-abc',
    medication_id?: 'med-abc',
    medical_record_id?: 'mr-abc',
  },
  metadata: { /* flexível por tipo */ },
  created_at: Timestamp,
  updated_at: Timestamp,
  logged_by: 'user-xyz',
  source: 'manual' | 'auto',
  ip: '...'  // só pra audit
}
```

**Auto-triggers** (Firestore Cloud Function `onUpdate`):
- Quando `adoption_applications/{id}` → status `finalized` → grava evento `adoption` na timeline do pet.
- Quando `foster_placements/{id}` é criado → grava evento `foster_start`.
- Quando pet é transferido entre abrigos → grava evento `transfer`.
- etc.

**UI**:
- Nova aba "Histórico" no PetDetail com timeline vertical (estilo Twitter/Instagram), fotos em grid, documentos em lista, filtro por tipo.
- Botão "Adicionar evento" (só owner/admin/responsible).
- Edição só pra owner/admin.

**Firestore rules**:
- Create: qualquer logado com permissão `animals` no abrigo do pet.
- Update/Delete: só owner + admin do abrigo + platform_admin. Logs são append-friendly, edição é rara.

**Validação**:
- typecheck/lint/build OK
- +10 testes (CRUD, permissões, auto-triggers, render)
- smoke test em produção com flag OFF

### Fase 3 — Adoção completa (workflow) · flag `SHELTER_ADOPTION_WORKFLOW`

**Objetivo**: pipeline formal de adoção com etapas claras, avaliação, devolução rastreável.

**Status enum** (workflow):
`application_submitted` → `under_review` → `reference_check` → `interview_scheduled` → `interview_done` → `home_check_scheduled` → `home_check_done` → `approved` → `trial` → `finalized` | `rejected` | `cancelled`

**Nova coleção**: `adoption_applications/{applicationId}`
- Substitui `adoption_interests` mas convive via alias.

**Schema**:
```js
{
  id: 'app-abc',
  pet_id: 'pet-xyz',
  applicant_uid: 'user-abc',
  applicant_snapshot: { name, phone, email, cpf, city, state },  // snapshot imutável
  status: 'under_review',
  step_history: [
    { from: null, to: 'application_submitted', at: Timestamp, by_uid: 'user-abc' },
    { from: 'application_submitted', to: 'under_review', at: Timestamp, by_uid: 'shelter-admin-1' }
  ],
  questionnaire_answers: { ... },  // respostas do questionário interno
  external_questionnaire_id: 'gforms-abc',  // FK Google Forms
  evaluations: [
    { evaluator_uid: 'shelter-admin-1', stars: 4, comment: '...', at: Timestamp }
  ],
  documents: [{ name, url, type, size }],
  trial_start: Timestamp | null,
  trial_end: Timestamp | null,
  finalized_at: Timestamp | null,
  rejection_reason: string | null,
  notes: string,
  created_at: Timestamp,
  updated_at: Timestamp,
  created_by: 'user-abc',
  // Auto-calculados (Cloud Function)
  days_rescue_to_application: number,
  days_application_to_finalized: number,
  days_in_shelter_at_adoption: number
}
```

**UI**:
- Wizard de aplicação (5 steps): Adotante → Questionário → Confirmação → Submit.
- Painel "Aplicações" no abrigo: lista filtrada, kanban por status, transições via modal.
- Timeline do pet recebe evento `adoption` ao finalizar.

**Devolução**:
- Status `returned` + novo campo `return_reason` + `return_date`.
- Pet volta a `available` (ou `pending_vet_check` se houver observação médica).
- Timeline recebe evento `return`.
- Aplicação fica com histórico completo (não apaga).

**Firestore rules**:
- Create: applicant_uid == auth.uid OU shelter_admin
- Read: applicant + abrigo dono + platform_admin
- Update: abrigo dono com permissão `animals` (transições) + platform_admin
- Delete: nunca (audit)

**Validação**:
- typecheck/lint/build OK
- +12 testes (workflow, auto-calc, devolução, permissions)
- smoke test em produção com flag OFF

### Fase 4 — Cadastro expandido de Adotante · flag `SHELTER_ADOPTER_FULL_PROFILE`

**Objetivo**: garantir que todo adotante tenha perfil completo e rastreável.

**Novos campos em `users/{userId}.adopter`** (subdocumento):
- `cpf` (string, masked in UI) — obrigatório
- `rg` (string)
- `instagram_handle` (string)
- `questionnaire_external_id` (string) — FK Google Forms
- `adopter_evaluation` (string: 'A'|'B'|'C'|'unevaluated')
- `adopter_notes` (string)
- `adopter_rating_avg` (number, computed)
- `adopter_rating_count` (number, computed)
- `previous_adoptions` (array de FK adoption_id)
- `completion_required_at` (timestamp) — prazo para completar

**Gate no chat/adoção**: enquanto o perfil de adotante estiver incompleto, as ações de chat/adoção mostram modal explicativo (já existe padrão do `PET_ADOPTION_GATING`).

**Integração Google Forms**:
- Webhook HTTPS Function `/api/integrations/google-forms`.
- Recebe payload do GForms, valida assinatura, popula `questionnaire_external_id` + `adopter_evaluation`.
- Cloud Function: dispara Cloud Function em push de novo `users/{id}/adopter/questionnaire_external_id` para notificar o abrigo.

**UI**:
- Nova aba "Dados de Adotante" no Profile.
- Wizard de complemento pós-onboarding.

**Validação**:
- typecheck/lint/build OK
- +8 testes
- smoke test em produção com flag OFF

### Fase 5 — Acompanhamento Pós-Adoção · flag `SHELTER_POST_ADOPTION_FOLLOWUP`

**Objetivo**: criar tarefas automáticas após cada adoção + acompanhar a vida do animal.

**Nova coleção**: `post_adoption_followups/{followupId}`

**Auto-criação** (Cloud Function, on finalize de adoption):
- Tarefa em `+3 semanas`
- Tarefa em `+3 meses`
- Tarefa em `+1 ano`
- Tarefa em `+2 anos`
- Tarefa em `+3 anos`

**Schema**:
```js
{
  id: 'fup-abc',
  adoption_id: 'app-xyz',
  pet_id: 'pet-xyz',
  shelter_id: 'shelter-abc',
  applicant_uid: 'user-abc',
  scheduled_for: Timestamp,
  done_at: Timestamp | null,
  pet_status: 'with_adopter' | 'returned' | 'deceased' | 'transferred' | 'lost_contact' | null,
  notes: string,
  photos: string[],
  documents: [{ name, url, type, size }],
  responsible_uid: 'shelter-admin-1',
  completed: boolean,
  completed_by: 'shelter-admin-1' | null,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Notificações**:
- 3 dias antes: notificação ao responsável.
- Atrasado: lembrete semanal ao abrigo.

**UI**:
- Card no dashboard do abrigo: "X acompanhamentos pendentes" (clicável).
- Página de detalhes com formulário de preenchimento.
- Lista filtrada por shelter / responsável / status.

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 6 — Lares Temporários · flag `SHELTER_FOSTER`

**Objetivo**: gerenciar lares temporários como cidadãos de primeira classe.

**Novo role**: `foster` (orthogonal a `admin`/`member`).

**Subcollections em `users/{userId}.foster_profile`**:
- `capacity` (number) — quantos animais pode receber
- `address_full` (object)
- `available_dates` (array de ranges)
- `preferences` (object) — espécie, porte, etc.
- `animals_history` (FK foster_placement_id)

**Nova coleção**: `foster_placements/{placementId}`

**Schema**:
```js
{
  id: 'fp-abc',
  foster_uid: 'user-abc',
  pet_id: 'pet-xyz',
  shelter_id: 'shelter-abc',
  start_date: Timestamp,
  end_date: Timestamp | null,
  end_reason: 'returned_to_shelter' | 'adopted_by_foster' | 'adopted_by_other' | 'deceased_in_foster' | 'transferred' | null,
  end_notes: string,
  can_adopt_directly: boolean,  // se true, end_reason=adopted_by_foster pula workflow
  // Auto-calculado
  days_in_foster: number,
  created_at: Timestamp,
  updated_at: Timestamp,
  created_by: 'shelter-admin-1'
}
```

**UI**:
- Nova aba "Lares Temporários" no painel do abrigo.
- Cadastro de LT (página pública `/lares-temporarios/novo`).
- Timeline do pet recebe eventos `foster_start` e `foster_end` automaticamente.

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 7 — Gestão de Saúde (Prontuário) · flag `SHELTER_HEALTH_RECORDS`

**Objetivo**: prontuário médico-veterinário completo.

**Subcollection**: `pets/{petId}/medical_records/{recordId}`

**Tipos** (enum):
`consultation` | `surgery` | `hospitalization` | `exam` | `vaccine` | `vermifuge` | `antiparasitic` | `treatment`

**Schema**:
```js
{
  id: 'mr-abc',
  type: 'vaccine',
  date: Timestamp,
  vet_name: 'Dr. Fulano',
  vet_crmv: 'CRMV-RS 12345',
  diagnosis: string,
  prescription: string,
  notes: string,
  documents: [{ name, url, type, size }],
  next_visit_at: Timestamp | null,
  result: string,  // pra exames
  // Auto-vinculado
  timeline_event_id: 'evt-abc',  // se criado via timeline
  created_at: Timestamp,
  updated_at: Timestamp,
  created_by: 'shelter-admin-1'
}
```

**UI**:
- Nova aba "Saúde" no PetDetail com tabela cronológica, filtros por tipo, botão "Adicionar registro".
- Cards: total de vacinas, próxima consulta agendada, vermifugos pendentes.

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 8 — Gestão de Medicamentos · flag `SHELTER_MEDICATION`

**Objetivo**: controle individual de medicação com doses administradas rastreáveis.

**Nova coleção**: `medication_prescriptions/{prescriptionId}`

**Schema**:
```js
{
  id: 'med-abc',
  pet_id: 'pet-xyz',
  medication: 'Dipirona 500mg',
  start_date: Timestamp,
  end_date: Timestamp | null,
  frequency: 'every_8h' | 'every_12h' | 'daily' | 'weekly' | 'custom',
  custom_frequency_hours: number | null,
  times: ['08:00', '16:00', '00:00'],
  doses_total: number,
  doses_administered: [
    { scheduled_at: Timestamp, administered_at: Timestamp | null, by_uid: 'user-abc', skipped: boolean, notes: string }
  ],
  responsible_uid: 'shelter-admin-1',
  active: boolean,
  created_at: Timestamp,
  updated_at: Timestamp
}
```

**Alert automático**:
- 30min antes de cada dose: notificação ao responsável.
- Atrasado: lembrete a cada 1h.

**Dashboard**:
- Card "X medicações ativas, Y doses pendentes hoje".
- Lista de doses do dia com checkbox "Administrado".

**Vinculação com timeline**: cria eventos `medication_start` e `medication_end` na timeline do pet automaticamente.

**Validação**:
- typecheck/lint/build OK
- +12 testes
- smoke test em produção com flag OFF

### Fase 9 — Galeria de Fotos · flag `SHELTER_GALLERY`

**Objetivo**: galeria categorizada por fase, com soft delete e restauração.

**Nova coleção**: `pet_photos/{photoId}`

**Schema**:
```js
{
  id: 'photo-abc',
  pet_id: 'pet-xyz',
  category: 'rescue' | 'profile' | 'health' | 'foster' | 'adoption' | 'post_adoption' | 'exhibition' | 'other',
  url: 'https://firebasestorage...',
  thumb_url: 'https://firebasestorage...',
  uploaded_by: 'user-abc',
  uploaded_at: Timestamp,
  is_deleted: boolean,
  deleted_at: Timestamp | null,
  deleted_by: 'user-abc' | null,
  original_metadata: { width, height, size, exif }
}
```

**Categorias** com tabs na galeria. Filtros por categoria + busca por data.

**Soft delete**:
- Foto sai do perfil visível, mas continua no banco.
- Lixeira: `is_deleted=true` listada em `/lixeira` (só owner/admin).
- Restaurar: setar `is_deleted=false`.
- Audit log de quem deletou/restaurou.

**Storage**: pasta `pets/{pet_id}/photos/{photo_id}/original.jpg` + `thumb.jpg`.

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 10 — Vitrines / Eventos · flag `SHELTER_EXHIBITIONS`

**Objetivo**: gerenciar eventos de exposição onde abrigos levam animais pra adoção.

**Nova coleção**: `exhibitions/{exhibitionId}`

**Schema**:
```js
{
  id: 'exh-abc',
  title: 'Vitrine da Praça XV',
  organizer_shelter_id: 'shelter-abc',
  co_organizers: ['shelter-xyz'],
  location: { address, city, state, lat, lng, place_id },
  date: Timestamp,
  time_start: string,  // '14:00'
  time_end: string,    // '18:00'
  status: 'planned' | 'active' | 'done' | 'cancelled',
  responsible_uids: ['shelter-admin-1', 'volunteer-2'],
  animals: ['pet-1', 'pet-2', 'pet-3'],
  external_pets: [{ owner_uid, pet_id, shelter_id }],
  post_event_log: [
    { pet_id, outcome: 'returned' | 'adopted' | 'foster' | 'other', adopter_uid?, notes? }
  ],
  created_at: Timestamp,
  updated_at: Timestamp,
  created_by: 'shelter-admin-1'
}
```

**UI**:
- Nova página `/abrigos/{id}/vitrines` (criar, listar, ver).
- Vitrine pública `/vitrines/{id}` (visível pra todos).
- Feed de vitrines próximas.

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 11 — Escalas + Confirmação de Presença (Vitrines) · flag `SHELTER_EXHIBITION_RSVPS`

**Objetivo**: convocar voluntários para vitrines.

**Subcollections em `exhibitions/{id}`**:
- `invites/{inviteId}` — FK volunteer_uid + status: `yes` | `no` | `maybe` + notes + availability
- `shifts/{shiftId}` — date + start + end + role + assigned_uids[]

**UI**:
- Notificação ao voluntário quando convidado.
- Página de vitrine mostra escalas + RSVPs + botão de resposta.
- Dashboard do abrigo: lista de RSVPs + escalas.

**Validação**:
- typecheck/lint/build OK
- +8 testes
- smoke test em produção com flag OFF

### Fase 12 — Gestão de Voluntários · flag `SHELTER_VOLUNTEERS`

**Objetivo**: cadastro e histórico de voluntários.

**Tipo de membro**: `volunteer` (orthogonal a `admin`/`member`).

**Subdocumento em `users/{userId}.volunteer_profile`**:
- `skills[]`
- `certifications[]`
- `availability[]`
- `hours_logged_total` (number, computed)
- `transport_provided_count` (number, computed)
- `transport_return_count` (number, computed)
- `events_attended[]` (FK exhibition_id)

**Nova coleção**: `volunteer_participation/{participationId}`
```js
{
  id: 'vp-abc',
  volunteer_uid: 'user-abc',
  exhibition_id: 'exh-abc',
  role: 'carregamento' | 'transporte_ida' | 'transporte_volta' | 'cuidador' | 'outro',
  check_in: Timestamp | null,
  check_out: Timestamp | null,
  hours_logged: number,
  created_at: Timestamp,
  created_by: 'shelter-admin-1'
}
```

**UI**:
- Nova aba "Voluntários" no painel do abrigo.
- Cadastro de voluntário (página pública).
- Histórico de participações.

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 13 — Dashboard do Abrigo (tempo real) · flag `SHELTER_DASHBOARD`

**Objetivo**: visão em tempo real do estado do abrigo.

**Nova página**: `/abrigos/{id}/dashboard` (primeira aba do painel admin).

**Cards padrão** (clicáveis):
- Cães no abrigo
- Gatos no abrigo
- Animais em lar temporário
- Resgates do mês
- Adoções do mês
- Castrações pendentes (abrigo)
- Castrações pendentes (adotados)
- Medicações pendentes
- Acompanhamentos pós-adoção pendentes
- Processos pendentes

**Métricas customizáveis**: abrigo pode criar cards próprios (queries salvas).

**Real-time**: Firestore `onSnapshot` em cada collection subjacente.

**Validação**:
- typecheck/lint/build OK
- +12 testes
- smoke test em produção com flag OFF

### Fase 14 — Central de Pendências (Kanban) · flag `SHELTER_KANBAN` (GRANDE)

**Objetivo**: sistema de kanban com colunas customizáveis, tarefas, drag-and-drop.

**Novas coleções**:
- `kanban_boards/{boardId}` (1+ por abrigo)
- `kanban_columns/{columnId}` — FK board + order + title + color + responsible_uids[]
- `kanban_cards/{cardId}` — FK column + title + description + type + assignees[] + due_at + priority + checklist[] + attachments[] + log[]

**Tipos de card**: `medication` | `spay_neuter` | `vaccine` | `post_adoption_contact` | `process` | `other`

**Default columns** (editáveis): `pendente` | `em desenvolvimento` | `revisadas` | `concluídas`

**DnD**: `@dnd-kit/core`.

**Personalização total**:
- Editar título, cor, ordem das colunas
- Adicionar/remover colunas
- Definir responsáveis por coluna
- Tipos de card customizáveis
- Layout (cards, lista, calendário) — começar só com cards

**Log**: cada movimentação registra `from_column_id`, `to_column_id`, `by_uid`, `at`.

**Dashboard pessoal**: usuário vê só as tarefas onde é assignee (card dedicado no dashboard).

**Validação**:
- typecheck/lint/build OK
- +20 testes
- smoke test em produção com flag OFF

### Fase 15 — Relatórios de Abrigos · flag `SHELTER_REPORTS`

**Objetivo**: relatórios automáticos com gráficos.

**Nova página**: `/abrigos/{id}/relatorios`

**Relatórios**:
- Resgates por mês / ano
- Adoções por mês / ano
- Comparativo entre anos
- Saldo mensal de animais
- Devoluções
- Tempo médio até adoção
- Tempo médio no abrigo
- Animais em LT
- Castrados / não castrados

**UI**: gráficos `recharts` + tabela + export CSV/PDF.

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 16 — Indicadores de Vitrines + Voluntários · flag `SHELTER_INDICATORS`

**Objetivo**: relatórios focados em vitrines e voluntários.

**Indicadores de Vitrines** (por evento e agregados):
- # vitrines
- # participantes
- # adoções
- # retornos
- # LTs
- taxa de adoção (%)

**Indicadores de Voluntários**:
- # participações
- # transporte ida
- # transporte volta
- frequência (%)
- horas totais

**Validação**:
- typecheck/lint/build OK
- +8 testes
- smoke test em produção com flag OFF

### Fase 17 — Busca Inteligente · flag `SHELTER_SMART_SEARCH` (GRANDE)

**Objetivo**: busca global multi-filtro em todas as entidades.

**Backend** (decisão a tomar antes de começar):
- **Meilisearch self-hosted no Cloud Run** (recomendado) — $0, latência <50ms.
- **Typesense Cloud** (managed, mais caro) — $0/até 10k docs.
- **Algolia** (mais caro) — $0.50/1k requests.
- **Firestore nativo + composite indexes** (sem serviço externo) — sem typo-tolerance, sem highlighting.

**Indexação**:
- `pets` indexado: nome, raça, cor, status, location, gender, intake_date, asilomar_status, microchip_id
- `users` indexado: nome, cpf, email, phone, instagram_handle, cidade
- `shelters` indexado
- `foster_placements` indexado
- `exhibitions` indexado
- `pet_timeline` indexado
- `adoption_applications` indexado

**Frontend**:
- Nova página `/busca`
- CommandPalette (`Cmd+K`) global
- Filtros facetados (sidebar)
- Highlighting + typo-tolerance
- Filtros combinados: fêmeas castradas em LT, etc.
- Cross-entity search: "Maria Silva" → adotante + todos os animais dela.

**Sincronização**: Cloud Function on Firestore write → atualiza índice.

**Validação**:
- typecheck/lint/build OK
- +15 testes
- smoke test em produção com flag OFF

### Fase 18 — Termos e Políticas completos (Legal) · flag `SHELTER_LEGAL_TERMS` (GRANDE - textual)

**Objetivo**: textos legais completos e sistema de aceite.

**Páginas a atualizar/criar**:
- `src/pages/Terms.jsx` (expandir)
- `src/pages/PrivacyPolicy.jsx` (expandir)
- `src/pages/Legislation.jsx` (expandir)
- `src/pages/Liability.jsx` (novo — isenção do criador)
- `src/pages/AdopterTerms.jsx` (novo)
- `src/pages/ShelterTerms.jsx` (novo)
- `src/pages/VolunteerTerms.jsx` (novo)
- `src/pages/FosterTerms.jsx` (novo)
- `src/pages/DonorTerms.jsx` (novo)

**Conteúdo**:
- **LGPD completa**: finalidade, base legal, direitos do titular, retenção, DPO
- **Legislação animal**: Lei 9605/98 art. 32, Decreto 24.645/34, leis municipais
- **Código Civil**: guarda, responsabilidade civil
- **Código Penal**: maus-tratos
- **Isenção total** do criador/desenvolvedor
- **Autorização expressa** para uso de imagem, dados, chat, adoções
- **Sigilo de dados** salvo expressa autorização

**Sistema de aceite**:
- Tabela `terms_acceptances/{userId}` com histórico (versão, data, IP, hash)
- Modal de aceite em momentos-chave (onboarding, adoção, chat, abrigo)
- Bloqueio de features até aceite

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 19 — Segurança Avançada · flag `SHELTER_SECURITY_HARDENING`

**Objetivo**: blindar a plataforma.

**Implementações**:
- **Firebase App Check** (reCAPTCHA Enterprise) em produção
- **Rate limiting** em Cloud Functions (express-rate-limit)
- **Firestore rules review** (deny-by-default em novos paths)
- **Storage rules**: bloquear tipos não-imagem/vídeo
- **Alertas de admin** quando: login suspeito, mudança em rules, billing spike
- **Audit log** de tudo (já tem — expandir pra pet/community/club)
- **Penetration testing** (manual ou automatizado)

**Validação**:
- typecheck/lint/build OK
- +8 testes
- smoke test em produção com flag OFF

### Fase 20 — Painel de Saúde da Plataforma (Admin Master) · flag `SHELTER_PLATFORM_HEALTH`

**Objetivo**: dashboard de saúde da plataforma.

**Nova aba no `/admin`**:
- **Saúde**: latência, error rate, deploys, uptime
- **Custos**: Firebase billing API, breakdown por serviço, projeção
- **Capacidade**: tamanho das collections, queries lentas, índices faltando
- **Movimentação**: audit log centralizado de TUDO
- **Gerenciamento de admins**: delegar admin a outros usuários
- **Alertas**: configurar Slack/Email pra billing spike, error rate

**Cloud Functions**:
- Scheduled que busca billing data
- Alertas via SendGrid/email

**Validação**:
- typecheck/lint/build OK
- +10 testes
- smoke test em produção com flag OFF

### Fase 21 — Migração final + Cutover · flag `SHELTER_CUTOVER`

**Objetivo**: remover flags de feature, migrar dados finais.

**Escopo**:
- Renomear `clubs` → `shelters` no Firestore (migração de dados, regras, índices)
- Remover feature flags (código morto)
- Atualizar URLs (se houver)
- Validar tudo em produção

**Validação**:
- typecheck/lint/build OK
- testes passando
- smoke test final

## 6. Stack técnica recomendada

- **Kanban DnD**: `@dnd-kit/core` (moderno, acessível, leve)
- **Gráficos**: `recharts` (já é o padrão do projeto)
- **PDF/CSV**: `jspdf` + `papaparse` (já usados)
- **e-Sign**: simples (hash + nome + data)
- **Busca**: Meilisearch self-hosted no Cloud Run (decisão na Fase 17)
- **Calendar/agenda**: `date-fns` + listas (já é o padrão)
- **Push notifications**: Firebase Cloud Messaging (FCM) — já tem `notifications/`
- **Rate limiting**: `express-rate-limit` (em Cloud Functions)

## 7. Estimativa de complexidade

| Fase | Complexidade | PRs estimados | Tempo |
|---|---|---|---|
| 0 — Preparação | Pequena | 1 | 0.5 dia |
| 1 — Cadastro único | Média | 1-2 | 1-2 dias |
| 2 — Timeline | Média | 1 | 1-2 dias |
| 3 — Adoção workflow | Média-Grande | 1-2 | 2-3 dias |
| 4 — Adotante | Pequena | 1 | 0.5-1 dia |
| 5 — Pós-adoção | Média | 1 | 1-2 dias |
| 6 — Lares Temporários | Média | 1 | 1-2 dias |
| 7 — Saúde | Média | 1 | 1-2 dias |
| 8 — Medicação | Média-Grande | 1-2 | 1-2 dias |
| 9 — Galeria | Pequena | 1 | 0.5-1 dia |
| 10 — Vitrines | Média | 1 | 1-2 dias |
| 11 — RSVP Vitrines | Pequena | 1 | 0.5-1 dia |
| 12 — Voluntários | Média | 1 | 1-2 dias |
| 13 — Dashboard | Média-Grande | 1-2 | 1-2 dias |
| 14 — Kanban | **Grande** | 2-3 | 3-4 dias |
| 15 — Relatórios | Média | 1 | 1-2 dias |
| 16 — Indicadores | Pequena | 1 | 0.5-1 dia |
| 17 — Busca | **Grande** | 2-3 | 3-5 dias |
| 18 — Termos/Legal | **Grande** (textual) | 1-2 | 2-3 dias |
| 19 — Segurança | Média | 1-2 | 1-2 dias |
| 20 — Painel de saúde | Média | 1-2 | 1-2 dias |
| 21 — Cutover | Pequena | 1 | 0.5 dia |

**Total**: 22-28 PRs, 25-40 dias. **Fases 14, 17, 18 são as mais pesadas**.

## 8. Critérios de aceitação (sempre, em toda fase)

- typecheck: 0 erros
- lint: 0 erros
- build: success
- testes existentes passam + testes novos da fase
- smoke test em produção (com flag desligada)
- ativar flag só após validação

## 9. Princípios de não-retrabalho

1. Cada fase é atômica: tudo que ela declara como entregue funciona ponta-a-ponta.
2. Schema evolutivo: nunca deletar/renomear campo sem plano de migração.
3. UI + backend + Firestore rules + testes saem no mesmo PR.
4. Documentação atualizada antes do PR (este roadmap, MODULES.md, DATA_MODEL.md).
5. Worktree isolado por fase.
6. Verifier (sub-agente) lê o diff antes do merge.
7. Backward compatibility: o que funcionava antes continua funcionando.
8. UX/UI passa por design review (sub-agente de design) antes de ativar a flag.

## 10. Comunicação contínua

Ao final de cada fase:
- Atualizar este doc (status da fase: ✅ / 🟡 / ❌)
- Atualizar `docs/ROADMAP.md` com referência
- Atualizar `docs/MODULES.md` se a fase adicionou módulo
- Atualizar `docs/DATA_MODEL.md` se a fase adicionou coleção/campo
- Reportar ao usuário: o que foi feito, em que etapa estamos, qual o próximo passo, quanto falta

---

## 11. Adendo: Conformidade Legal, Multi-Tenant e Engenharia de Custos

> Seção incorporada após análise jurídica + técnica (2026-07-10).
> Origem: documento "Estrutura Analítica e Compliance Jurídico para Plataformas SaaS de Gestão de Causa Animal e Abrigos" + revisão de multi-tenant.

### 11.1 Multi-tenant & isolamento de dados por abrigo (afeta Fases 1, 2, 4, 8)

**Princípio**: O "Cadastro Único" do animal (id, características, foto pública) é **global e segue o animal**. Mas prontuários, tarefas, notas internas, medicamentos, evaluations, listas de adotantes reprovados — tudo isso é **tenant-specific** (do abrigo que o possui no momento).

**Por quê**: Se o animal X for transferido do Abrigo A para o Abrigo B, o Abrigo B **NÃO deve** ver:
- Notas internas do Abrigo A
- Histórico de adotantes reprovados
- Avaliações técnicas que o Abrigo A fez (podem ser sigilosas)
- Decisões de gestão do Abrigo A

**Implementação** (Firestore, sem mudar de banco):

1. **Coleções globais** (sem `club_id`): `pets/{petId}` (dados públicos + identificadores), `users/{uid}`.
2. **Coleções tenant-specific** (com `club_id`): `pets/{petId}/medical/{recordId}`, `pets/{petId}/medications/{medId}`, `pets/{petId}/clinical_notes/{noteId}`, `clubs/{clubId}/intake_records/{recordId}`, `clubs/{clubId}/fosters/{fosterId}`, `clubs/{clubId}/adoption_workflow/{adoptionId}`.
3. **Firestore rules** garantem que um documento de `medical` só é legível se o `request.auth.uid` for membro/admin do `club_id` do documento (ou platform admin).
4. **Migração de histórico**: ao transferir animal, prontuário antigo fica *congelado* (read-only) e o novo abrigo cria prontuário novo. Animal transferido carrega apenas a "linha do tempo pública" (vacinas administradas, idade, peso) — não as notas.
5. **Fase de entrega**: isso entra na **Fase 1** (campo `shelter_owner_club_id` no pet) + **Fase 8** (prontuário é subcoleção com `club_id`).

### 11.2 Soft delete que não custa caro (afeta Fase 10)

**Problema**: Manter fotos excluídas no Firebase Storage cresce o custo indefinidamente.

**Solução aprovada**:
- **Firestore**: soft delete com `deleted_at`, `deleted_by`, `purge_after`. Custo: alguns bytes por doc.
- **Storage**: ao deletar, mover referência para `trash/{petId}/{photoId}.jpg` em bucket separado. Após **30 dias**, Cloud Function agendada **deleta fisicamente** o arquivo do Storage.
- **UI**: thumbnail do item deletado aparece acinzentado na galeria com botão "Restaurar" (até 30 dias). Após 30 dias, some.
- **Backups**: bucket de trash com lifecycle rule de 60 dias para o coldline, depois delete.

**Fase de entrega**: implementado na **Fase 10** (Vitrines / Galeria de fotos) e replicado em todas as coleções de mídia.

### 11.3 Integração com Google Forms (afeta Fase 5)

**Decisão**: **manter Google Forms como canal opcional** (opt-in por abrigo), **além** do formulário nativo.

**Razões** (discordo parcialmente da sugestão de substituir):
1. Google Forms é ótimo para captação **externa sem login** (visitante anônimo do Instagram/Facebook do abrigo).
2. Abrigos pequenos não usam a plataforma diariamente — formulário nativo é fricção.
3. Forms é grátis; formulário nativo requer desenvolvimento e manutenção.

**Arquitetura híbrida (Fase 5 — Adopter Full Profile)**:
- **Formulário nativo** (default): dentro do app, para adotantes logados. UX rica, validação client-side, anexa documentos.
- **Google Forms** (opt-in, por abrigo): webhook que cai em `adopter_applications/{appId}` com `source='google_forms'`, `form_responses/{field}`. Fica numa fila onde o abrigo revisa, marca campos faltantes, e aprova/recusa.
- **Migração de Forms → nativo**: pode ser feito gradual (Fase 18+).

### 11.4 Tarefas de pós-adoção via CRON (afeta Fase 6)

**Problema**: Plano de pós-adoção tem marcos em 3 semanas, 3 meses, 6 meses, 1 ano, 2 anos, 3 anos. Gerar tudo no momento da adoção = 1M+ docs pré-criados.

**Solução aprovada**: **Materialização dinâmica via Cloud Function agendada (CRON diário)**.

```
1. Adoção registrada → cria doc adoption_workflow/{id} com
   adoption_date, milestones[]. Cada milestone tem
   {label, days_after_adoption, type, template_id}.

2. Cloud Function scheduled `materializePostAdoptionTasks`
   roda diariamente:
   - Lê adoções onde adoption_date < today
   - Para cada milestone onde today >= adoption_date + days_after:
     - Cria task no Kanban (se ainda não existe — idempotência)
     - Marca milestone como "materialized"
   - Tasks de até 90 dias no futuro: também materializa agora
     (buffer para não perder se o CRON falhar 1 dia)
   - Tasks de 90+ dias: ficam só como milestone; materializa
     quando faltam 90 dias.

3. Edge case: se o abrigo cancelar adoção, milestones futuras
   são simplesmente ignoradas (não materializam).
```

**Fase de entrega**: **Fase 6** (Pós-adoção follow-up) + **Fase 15** (Kanban) — o Kanban lê direto de `tasks/` que é a materialização.

### 11.5 Organização modular do abrigo (afeta Fase 0 e estrutura geral)

Princípio aprovado, com adaptação ao nosso Firestore (que já é multi-tenant via `club_id`):

```
src/modules/shelter/
├── domain/
│   ├── core/          # Identidade: animal base, abrigo, owner
│   │   ├── animal.js
│   │   └── permissions.js
│   ├── clinical/      # Prontuário, medicação, vacinas, exames
│   │   ├── records.js
│   │   └── medication.js
│   ├── operational/   # Adoção, adotante, kanban, vitrines, RSVP
│   │   ├── adoption.js
│   │   └── kanban.js
│   ├── legal/         # Termos, disclaimers, e-sign
│   │   └── terms.js
│   └── search/        # Indexação (Meilisearch ou similar)
│       └── indexer.js
├── services/          # Camada fina de I/O
├── hooks/             # React Query + Firestore listeners
├── components/        # Componentes compartilhados do abrigo
└── pages/             # Rotas
```

A separação por `domain/{core,clinical,operational,legal,search}` reflete o que a análise propôs (Core/Clínico/Operacional/Eventos/Busca/Admin).

### 11.6 Conformidade legal crítica (afeta Fase 18)

Da análise jurídica, o mínimo viável de Fase 18 (Legal Terms) precisa entregar:

**Telemedicina veterinária (CFMV 1.465/2022)**:
- [ ] Disclaimer permanente: "Este sistema não faz teleconsulta inaugural. Requer RPVAR (consulta presencial prévia)."
- [ ] Bloqueio de módulos de telemedicina para casos de urgência/emergência (redireciona para hospital físico).
- [ ] Limite de 180 dias para renovações de receita remota (aviso + bloqueio).
- [ ] Tela para abrigo designar RT (responsável técnico) com ART ativa.
- [ ] Disclaimer de que a plataforma **não** exerce ato médico — apenas registra.

**LGPD (Lei 13.709/2018)**:
- [ ] Banner de consentimento com base legal explícita (Art. 7º II, V, IX).
- [ ] DPO (Encarregado) designado e contato visível.
- [ ] Direito de exportação de dados (Art. 18 V) — botão "Baixar meus dados".
- [ ] Direito de exclusão (Art. 18 VI) — com soft delete + purge em 30 dias.
- [ ] Retenção de logs de acesso por 6 meses (Marco Civil Art. 15).
- [ ] Protocolo de breach notification à ANPD em 48h (Art. 48) — playbook interno.

**Adoção (Art. 936 CC + Lei 14.063/2020)**:
- [ ] Termo de adoção com cláusula de assunção de risco pelo adotante.
- [ ] Disclaimer de vícios redibitórios biológicos (parvovirose, cinomose, etc).
- [ ] Assinatura eletrônica avançada (Lei 14.063/2020): hash SHA-256 do documento + timestamp + IP + biometria/liveness. Não requer ICP-Brasil (caro demais para abrigos).
- [ ] Transferência de microchip registrada no termo.

**Doações (ITCMD)**:
- [ ] Disclaimer de que a plataforma **não** é substituto tributário nem consultor fiscal.
- [ ] Cada abrigo declara seu regime estadual (isenções de ITCMD variam).
- [ ] Disclaimer de natureza filantrópica irreversível (doação não gera direito a reembolso, salvo chargeback).

**Conteúdo de terceiros (Marco Civil Art. 19)**:
- [ ] Procedimento de notificação judicial e remoção de conteúdo (já temos em `reportContent`).

### 11.7 Segurança crítica (afeta Fase 19)

Da mesma análise, Fase 19 deve entregar:

- [ ] **Backup imutável (WORM)** no GCS, com lifecycle 90 dias.
- [ ] **Criptografia at-rest** (Firestore já faz) + em trânsito (HTTPS forçado).
- [ ] **RBAC granular**: por abrigo, por papel, por feature. (Já temos `isClubOwnerOrAdmin` — estender.)
- [ ] **MFA opcional** para usuários com permissão de admin (TOTP via app authenticator).
- [ ] **Políticas de senha**: mínimo 12 chars, sem repetição das últimas 5.
- [ ] **Política de descarte seguro**: ao excluir user, apaga PII em 30 dias, mantém logs agregados.
- [ ] **Logs de auditoria**: quem viu/editou/excluiu o quê, retidos por 6 meses (Marco Civil).
- [ ] **Penetration test anual**: terceiro independente.

### 11.8 Itens **deprioritizados** (com justificação)

- **Telemedicina completa**: adiamos para além da Fase 22. Custo de manter RTs, risco regulatório alto, e o usuário final do viralata não pediu urgência.
- **CRMV registration da plataforma**: só se virarmos a mediar consultas. Hoje somos software inerte (operador), não organizamos agendas.
- **Busca via Elasticsearch**: Meilisearch é mais leve e suficiente para o escopo.

### 11.9 Resumo do impacto no roadmap

| Fase | Itens novos incorporados | Esforço extra |
|------|--------------------------|---------------|
| **Fase 0** (atual) | Estrutura de pastas `domain/{core,clinical,operational,legal,search}/` no skeleton. | ~30min |
| **Fase 1** | Campo `shelter_owner_club_id` no pet; subcoleções tenant-specific definidas no modelo. | +1h |
| **Fase 5** | Suporte a Google Forms webhook. | +1 dia |
| **Fase 6** | CRON de materialização de tasks de pós-adoção. | +1 dia |
| **Fase 10** | Soft delete + purge de Storage. | +1 dia |
| **Fase 15** | Lê de materialização, não de geração prévia. | incluído |
| **Fase 18** | Todos os 14 itens da seção 11.6. | +3 dias |
| **Fase 19** | Todos os 8 itens da seção 11.7. | +3 dias |

Total extra: **~10 dias** distribuídos em 8 fases. Não muda a sequência de fases.
# Triggering deploy after index fix
