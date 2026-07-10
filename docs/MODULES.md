# MODULES

> O que cada módulo faz, arquivos-chave e fluxos principais. Panorama em
> `docs/AI_CONTEXT.md`; dados em `docs/DATA_MODEL.md`.

## pets/ — adoção

Feed com matching por compatibilidade, cadastro/edição, interesse de
adoção, avaliação pós-adoção, radar de pet compatível.

- **pages**: `PetFeed` (`/feed` — filtros espécie/porte/localização + raio,
  seção "Descobrir" e grid completo), `PetDetail` (`/pets/:id`),
  `CreatePet` (`/pets/new`, `/pets/:id/edit` — wizard, dono pode ser o
  próprio usuário ou uma organização em que ele é admin), `MyPets`
  (`/meus-pets`), `RadarSettings` (`/radar`).
- **components**: `PetCard` (card padrão de pet, usado em feed/grid/meus
  pets), `InterestPanel` (lista de interessados no pet), `RatingBadge`/
  `RatingForm` (avaliação pós-adoção), `PetShareCard` (imagem "story" para
  compartilhamento social, via `usePetShareImage` + `html-to-image`).
- **services**: `petService` (CRUD, `getAvailablePets` com filtros
  espécie/porte/cidade/estado), `interestService`, `ratingService`,
  `petRadarService` (liga/desliga o alerta; o envio em si é uma Cloud
  Function em `functions/`).
- **domain (puro, testado)**: `matching` (compatibilidade pet↔perfil de
  adotante), `priority` (pontuação de prioridade por tempo de espera).
- **hooks**: `usePets` (`usePetFeed`, `useMyPets`, `useCreatePet`,
  `useUpdatePet`, `useDeletePet`, `useCompleteAdoption`, hooks de interesse
  e avaliação).

Fluxo típico: cadastrar pet (wizard: fotos → sobre → saúde → revisão) →
aparece no feed ordenado por `priority_score desc, created_at asc` →
adotante demonstra interesse → dono conversa via chat → marca como
adotado (`completePetAdoption`, notifica os demais interessados) →
avaliação pós-adoção opcional.

## organizations/ — organizações (ONGs e lojas parceiras)

Maior módulo do app. Nomes de arquivo ainda usam "Club" (herança de um
fork anterior), mas a UI chama isso de "Organizações". Duas áreas de
navegação distintas sobre o mesmo domínio:
- **Comunidade** (`/comunidade`, `/comunidade/:id`) — diretório e perfil
  público, aberto a todos: busca, ingressar por código/pedido, abas
  Membros/Eventos/Mural/Fóruns.
- **Organizações** (`/organizacoes`, `/organizacoes/:id/admin`) — hub de
  gestão (só quem administra alguma organização) e painel de
  administração, com abas condicionadas por permissão granular.

- **pages**: `ClubsDirectory` (`/comunidade`), `ClubDetail`
  (`/comunidade/:id`), `CreateClub` (`/organizacoes/criar`),
  `EventDetail` (`/comunidade/:id/eventos/:eventId`), `OrganizationsHub`
  (`/organizacoes` — "Minhas organizações" + "Descobrir outras"),
  `OrganizationAdminPanel` (`/organizacoes/:id/admin` — abas Visão Geral,
  Animais, Mural, Doações, Prestação de Contas, Equipe, Configurações).
- **components**:
  - Perfil público: `ClubMembersTab`, `ClubFeedTab` (mural), `ClubEventsTab`
    + `EventChat`/`EventParticipantsPanel`/`EventDatesPanel`,
    `ClubForumsTab` + `ForumThreadView`/`CreateThreadDialog`/`ForumPoll`/
    `PollBuilder`.
  - Painel de administração: `ClubAdminTab` (aba Configurações — identidade
    do clube, código de convite, exclusão), `ClubTeamTab` (aba Equipe —
    convites, pedidos de ingresso, grade de permissões dos admins),
    `ClubPetsDataGrid` (aba Animais — planilha inline + importação/
    exportação em massa), `ClubDonationsTab` (aba Doações — chamados de
    doação com meta/arrecadado/prazo), `ClubFinanceTab` (aba Prestação de
    Contas — lançamentos por período/categoria).
- **services**: `clubService` (clube, membros, permissões, eventos, mural,
  campanhas de doação, financeiro — ids deterministas `clubId_uid`),
  `forumService`.
- **domain (puro, testado)**: `permissions` (proprietário + permissões
  granulares — `isClubOwner`, `hasClubPermission`, `effectiveClubPermissions`),
  `petImport` (parsing/validação/dedup da planilha de animais),
  `forumPoll` (enquetes de fórum), `constants` (coleções, enums, rótulos).
- **hooks**: `useClubs` (a maior parte das queries/mutations do módulo),
  `useClubForum`.

Ingresso (3 caminhos): **pedir para ingressar** (`club_join_requests` →
notifica admins → aprovação cria `club_members`), **convite do admin**
(`club_member_invites` → notifica convidado → aceite cria membro), **código
de convite**. Eventos públicos publicados notificam membros.

Permissões granulares (`animals`, `finance`, `donations`, `feed`, `team`):
o proprietário (`clubs.created_by`) sempre tem as 5, travado na UI e em
`firestore.rules`; um admin sem `permissions` explícito também é tratado
como tendo todas (compatibilidade); um admin com `permissions` explícito ou
um membro comum só tem as chaves `true`. Ver `domain/permissions.js` e a
seção de permissões em `docs/DATA_MODEL.md`.

Importação de planilha de animais (`domain/petImport.js`): aceita
`.xlsx`/`.csv`/`.json`, mapeia colunas com alias PT/EN, valida contra o
schema de `pets`, deduplica pelo campo `ID` contra os animais já
cadastrados pela organização — usuário decide manter ou substituir cada
duplicata antes de confirmar.

## onboarding/ — perfil de adotante

- `pages/OnboardingQuestionnaire` (`/onboarding`) — 7 passos: moradia,
  rotina de passeios, composição familiar, outros animais, orçamento,
  cidade/UF, consentimento LGPD. Grava em `users/{uid}` e marca
  `profile_completed`, usado como gate por `OnboardedRoute`/redirect em
  `App.jsx` e como entrada do algoritmo de matching (`pets/domain/matching`).

## chat/ — mensagens

Conversas 1:1 e em grupo, com contexto opcional de pet/adoção.
- `pages/ChatPage` (`/chat`, `/chat/:conversationId`), `hooks/useChat`,
  `services/chatService`.
- **components**: `ConversationList`, `ChatWindow`, `MessageBubble`,
  `ChatComposer`, `NewChatDialog`, `ChatLauncherButton`.
- **domain**: `conversations` (resolução/ordenação, testado).
- Gera notificações `chat_message`/`chat_invite`.

## notifications/ — sino

- `hooks/useNotifications` — hook próprio (não React Query) com
  `onSnapshot` em `notifications` filtrado por `user_id`; retorna
  `{ notifications, unreadCount, isLoading, markAsRead }`.
- `components/NotificationsMenu` — painel dropdown do sino no `Layout`:
  ícone por `type` (mapa `TYPE_META`), não lidas destacadas, clique marca
  como lida e navega para `link`, atalho "marcar todas como lidas".
- Serviço de escrita é compartilhado: `core/services/notificationService.js`
  (`NOTIFICATION_TYPE`, `createNotification`, `notifyUsers`).

## reports/ — denúncia de maus-tratos

- `pages/CreateReport` (`/denuncias/nova`) — descrição, endereço + GPS, até
  5 fotos; ao enviar gera protocolo e documento formatado para
  impressão/PDF (`jspdf`) com os dados do denunciante e da ocorrência.
- `services/reportService` — grava em `abuse_reports`.

## admin/ — plataforma

Painel exclusivo de `platform_admin` (`/admin/*`).
- **pages**: `AdminDashboard` (grid de seções), `AdminPets` (moderar
  anúncios), `AdminOrganizations` (moderar comunidades e organizações,
  incluindo status de diretório, destaque e vínculos),
  `AdminReports` (revisar denúncias), `AdminUsers` (papéis, banimento),
  `AdminMetrics` (gráficos de adoções/crescimento/denúncias, via
  `recharts`), `AdminAuditLog` (trilha de auditoria completa, via
  `AuditLogTable` compartilhado em `src/components/`).
- **services**: `adminService`, `metricsService`. Ações geram `audit_logs`
  (`user_banned`, `user_unbanned`, `user_account_deleted`,
  `platform_feature_flag_changed`…).

## communities/ — curadoria global

- Entidade editorial própria para agrupar organizações no diretório público.
- **domain**: `constants` (coleção + visibilidade), `directory` (status do
  diretório, ordenação e filtros públicos).
- **services/hooks**: CRUD em `communities`, usado no admin e no diretório
  `/comunidade`.

## Mapa rota → módulo

| Rota | Módulo / arquivo |
| --- | --- |
| `/`, `/termos`, `/legislacao`, `/politica-privacidade` | `pages/Home`, `pages/Terms`, `pages/Legislation`, `pages/PrivacyPolicy` |
| `/login` | `pages/Login` |
| `/onboarding` | `onboarding/pages/OnboardingQuestionnaire` |
| `/feed`, `/pets/:id`, `/pets/new`, `/pets/:id/edit`, `/meus-pets`, `/radar` | `pets/pages/*` |
| `/comunidade*` | `organizations/pages/ClubsDirectory`, `ClubDetail`, `EventDetail` |
| `/organizacoes*` | `organizations/pages/OrganizationsHub`, `CreateClub`, `OrganizationAdminPanel` |
| `/chat*` | `chat/pages/ChatPage` |
| `/denuncias/nova` | `reports/pages/CreateReport` |
| `/perfil` | `pages/Profile` |
| `/admin/*` | `admin/pages/*` |


## shelter/

> **Status (2026-07-10)**: **11/22 fases concluídas** (Fases 0–10 + 12 ✅, PRs #37–#52 + PR Fase 13).
> Roadmap completo em `docs/SHELTER_MGMT_ROADMAP.md`. Tracker operacional
> em `.mavis/scratchpad/shelter-roadmap-tracker.md`. 22 fases planejadas.
> Todas as SHELTER_* flags default OFF (inclusive `SHELTER_FOUNDATION`).
> Próximas fases: 11 (Vitrines) em paralelo, depois 14 (Dashboard).

### Estrutura interna

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

### Coleções Firestore planejadas (multi-tenant)

**Globais** (sem `club_id`, leitura pública para features de vitrine):
- `pets/{petId}` — cadastro base do animal (campos da Fase 1)
- `users/{uid}` — perfis

**Tenant-specific** (com `club_id`, leitura restrita ao abrigo):
- `pets/{petId}/medical/{recordId}` — prontuário
- `pets/{petId}/medications/{medId}` — medicação
- `pets/{petId}/clinical_notes/{noteId}` — notas internas
- `clubs/{clubId}/intake_records/{recordId}` — resgates
- `clubs/{clubId}/fosters/{fosterId}` — lares temporários
- `clubs/{clubId}/adoption_workflow/{adoptionId}` — adoções
- `clubs/{clubId}/volunteers/{volunteerUid}` — voluntários (Fase 13)
- `clubs/{clubId}/volunteer_participations/{participationId}` — turnos (Fase 13)
- `clubs/{clubId}/kanban/{boardId}/tasks/{taskId}` — kanban operacional
- `clubs/{clubId}/legal_terms/{termId}` — termos de adoção aceitos

**Subcoleção de voluntário** (Fase 13, global):
- `users/{uid}/volunteer_profile/main` (id fixo `main`) — perfil global do voluntário (skills, availability, radius, aceite do termo)

### Feature flags do módulo

22 flags, todas default OFF, administradas em `/admin/flags`:
`shelter_foundation`, `shelter_animal_unified_profile`, `shelter_pet_timeline`, `shelter_adoption_workflow`, `shelter_adopter_full_profile`, `shelter_post_adoption_followup`, `shelter_foster`, `shelter_health_records`, `shelter_medication`, `shelter_gallery`, `shelter_exhibitions`, `shelter_exhibition_rsvps`, `shelter_volunteers` (guarda-chuva), `shelter_volunteer_profile_v1` (Fase 13, perfil + roster + participation), `shelter_dashboard`, `shelter_kanban`, `shelter_reports`, `shelter_indicators`, `shelter_smart_search`, `shelter_legal_terms`, `shelter_security_hardening`, `shelter_platform_health`, `shelter_cutover`.

Cada flag corresponde a 1 fase. Ativar uma flag = o comportamento da fase entra em produção.

### Conformidade legal (Fase 18)

Da análise jurídica (LGPD, CFMV 1.465/2022, Art. 936 CC, Lei 14.063/2020, ITCMD), ver seção 11 do `docs/SHELTER_MGMT_ROADMAP.md`. Itens críticos:
- E-assinatura avançada (Lei 14.063/2020) — hash SHA-256 + timestamp + liveness
- Disclaimer de RPVAR e emergência (CFMV)
- Renúncia a responsabilidade tributária (ITCMD)
- Assunção de risco na adoção (Art. 936 CC)
- DPO designado (LGPD)
- Backup WORM + breach notification (LGPD Art. 48)

### volunteers/ (Fase 13) 🆕

Sub-módulo dentro de `src/modules/shelter/` (convivendo com adoption, fosters, etc.):

- **domain/operational/volunteerProfile.js** — schemas Zod (perfil, roster, participation), 6 enums (SKILLS, DAYS_OF_WEEK, SHELTER_STATUS, BG_CHECK_STATUS, ROLES, EVENT_TYPES), 4 helpers de transição/cálculo.
- **domain/legal/volunteerTerms.js** — stub versionado (`TERMS_VERSION='2026-07-10'`, texto resumido, TODO Fase 18).
- **services/volunteerProfileService.js** — CRUD no perfil global (`users/{uid}/volunteer_profile/main`) + roster per-shelter (`clubs/{clubId}/volunteers/{uid}`), com snapshot do aceite do termo.
- **services/volunteerParticipationService.js** — CRUD em `clubs/{clubId}/volunteer_participations/{id}` com check-in/out e cálculo automático de horas.
- **hooks** — `useVolunteerProfile`, `useUpsertVolunteerProfile`, `useAcceptVolunteerTerms`, `useShelterVolunteers`, `useJoinShelterAsVolunteer`, `useUpdateShelterVolunteer`, `useLeaveShelter`, `useParticipations`, `useCheckInOut`, etc.
- **components** — `VolunteerProfileForm` (perfil + aceite do termo), `VolunteersRoster` (lista do abrigo), `ParticipationForm` (registro de turno), `ParticipationsList` (lista + check-in/out).
- **firestore.rules** — 3 novos match blocks (`volunteer_profile`, `volunteers`, `volunteer_participations`) com `return` explícito + `isClubOwnerOrAdmin`/`canEditClubPets`/`hasClubPermission('animals')` + dono do perfil/participation.

**Padrões**:
- O abrigo **NÃO** lê o `users/{uid}/volunteer_profile` diretamente — o service faz snapshot dos campos relevantes no `clubs/{clubId}/volunteers/{uid}` (defense-in-depth + LGPD).
- Background check é **per-shelter** (não portável) — cada abrigo aprova/rejeita independentemente.
- Termo de voluntariado é **global** (não per-shelter) — uma única aceitação na plataforma, espelhada no roster.
- `exhibition_id` é FK opcional na participation (string livre) — Fase 13 não depende da Fase 11.

