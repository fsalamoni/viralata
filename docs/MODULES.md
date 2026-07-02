# MODULES

> O que cada módulo faz, arquivos-chave e fluxos principais. Panorama em
> `docs/AI_CONTEXT.md`; dados em `docs/DATA_MODEL.md`.

## pets/ — núcleo (feed, adoção, match, radar)

Cadastro de pets, feed com compatibilidade comportamental, interesse de
adoção, avaliação pós-adoção e o Radar de Pets.

- **pages**: `PetFeed` (feed público, filtra `status == 'available'`),
  `PetDetail` (galeria, interesse, avaliação), `CreatePet` (criar/editar,
  reusa o mesmo form via `isEditing`), `MyPets` (pets do usuário logado),
  `RadarSettings` (liga/desliga o Radar de Pets).
- **components**: `PetCard` (card do feed, ícone por espécie), `InterestPanel`
  (lista/gerencia interesses de quem é dono do pet), `RatingForm` /
  `RatingBadge` (avaliação pós-adoção e sua média), `PetShareCard` (imagem
  "story" para compartilhar o pet, com QR code via `usePetShareImage`).
- **services**: `petService` (`createPet`, `updatePet`, `deletePet`,
  `getAvailablePets`, `getPetsByOwner`, `completePetAdoption` — notifica os
  demais interessados como `adoption_rejected`, `recalculatePriorityScores`),
  `interestService` (CRUD de `adoption_interests`, id `petId_userId`),
  `petRadarService` (`getMyRadar`, `setRadarActive`), `ratingService`
  (`createRating`, `getRatingsForUser`, `summarizeRatings`).
- **domain (puro, testado)**: `matching.js` (`isCompatible`,
  `filterCompatiblePets`, `sortByRelevance` — regra de ouro: um pet só entra
  no feed/radar de alguém se `isCompatible()` retornar `true`), `priority.js`
  (`calculatePriorityScore` — bônus de destaque para pets há mais tempo no
  feed: 90/180/365 dias).
- **hooks**: `usePets.js` — todos os hooks de React Query do módulo
  (`usePetFeed`, `useMyPets`, `useCreatePet`, `useCreateInterest`,
  `useMyRadar`, `useCreateRating`, etc.).

Fluxo típico: usuário completa o onboarding → feed mostra pets compatíveis
(`isCompatible`) ordenados por prioridade → demonstra interesse
(`adoption_interests`) → doador aprova e conversa pelo chat → marca como
adotado (`completePetAdoption`, notifica os demais interessados) → ambas as
partes podem se avaliar (`adoption_ratings`). Em paralelo, qualquer pet novo
compatível com o perfil de quem tem o Radar ligado dispara uma notificação
via Cloud Function (ver `docs/AI_CONTEXT.md` seção 8).

## organizations/ — organizações (ONGs/lojas) e comunidade

Diretório de organizações com associação por papel, mural, fórum (com
enquetes), eventos e planilha de gestão de pets para a equipe. Nomes de
arquivo/coleção usam "Club"/"club" (herança do fork anterior) — a UI sempre
chama isso de "Organização".

- **pages**: `ClubsDirectory` (diretório público), `CreateClub` (cadastro,
  inclui `cnpj` e `donation_link` opcionais), `ClubDetail` (abas), `EventDetail`.
- **components**: `ClubMembersTab`, `ClubAdminTab` (pedidos de ingresso,
  convites, membros, toggles de permissão granular por membro), `ClubFeedTab`
  (mural), `ClubForumsTab` + `ForumThreadView`/`CreateThreadDialog`/
  `ForumPoll`/`PollBuilder`, `ClubEventsTab` + `EventChat`/
  `EventParticipantsPanel`/`EventDatesPanel`, `ClubPetsDataGrid` (tabela de
  gestão de pets da organização, edição inline).
- **services**: `clubService` (organização, membros, pedidos, convites — ids
  deterministas `clubId_uid`), `forumService` (tópicos/comentários/enquetes).
  `organizationService.js` existe com um modelo parecido
  (`organizations`/`organization_members`/`organization_reports`) mas **não
  está conectado a nenhuma rota/UI** — código órfão de uma tentativa anterior,
  mantido porque `firestore.rules` ainda cobre essas coleções; não estender.
- **domain (puro, testado)**: `forumPoll` (apuração de votos), `constants`
  (tipos de evento, limites do chat de evento).
- **hooks**: `useClubs`, `useClubForum`.

Ingresso (3 caminhos): **pedir para ingressar** (`club_join_requests` →
notifica admins → aprovação cria `club_members`), **convite do admin**
(`club_member_invites` → notifica convidado → aceite cria membro), **código
de convite**. Permissões granulares (`club_members.permissions.edit_pets`
etc.) deixam um membro comum editar pets da organização sem virar admin
(`canEditClubPets` em `firestore.rules`). Eventos públicos publicados
notificam membros; cada evento tem datas com RSVP e um chat próprio.

## onboarding/ — questionário de perfil (gate pós-login)

Único arquivo: `pages/OnboardingQuestionnaire.jsx`. Wizard de passo único
(sem `domain/`/`services/` — grava direto via `updateUserProfile` do
`useAuth()`) que coleta moradia, rotina de passeios, composição familiar,
outros animais, orçamento, localização e o **consentimento LGPD**
obrigatório (`lgpd_consent_at`). Ao concluir, marca
`users/{uid}.profile_completed = true` e libera o feed. As respostas
alimentam diretamente `isCompatible()` (ver `pets/domain/matching.js`).

## chat/ — mensagens

Conversas 1:1 e em grupo entre qualquer par de usuários da plataforma (não
restrito a contexto de adoção, embora uma conversa possa referenciar um pet).
- `pages/ChatPage`, `hooks/useChat` (inclui `useChatUserDirectory`, que lista
  usuários elegíveis para iniciar conversa a partir da coleção `users`).
- **components**: `ConversationList`, `ChatWindow`, `MessageBubble`,
  `ChatComposer` (texto + anexos), `NewChatDialog` (novo direto/grupo ou
  chamar mais pessoas), `ChatLauncherButton`.
- **domain**: `conversations.js` (resolução de título/contraparte, preview da
  última mensagem, testado).
- Gera notificações `chat_message` / `chat_invite`.

## reports/ — denúncia de maus-tratos

Fluxo simples e auto-contido: `pages/CreateReport` + `services/reportService`
(`createAbuseReport` — descrição, geolocalização, fotos via Storage;
`getMyReports`, `getAllReports` para o admin). A plataforma **não investiga**
— apenas gera o relatório (`abuse_reports`) para o usuário encaminhar à
Polícia Civil ou órgão ambiental competente (ver `pages/Legislation.jsx`).

## notifications/ — sino

- `hooks/useNotifications` — lê `notifications` do usuário, expõe
  `unreadCount` e `markAsRead`. Renderizado pelo sino no `Layout`.
- Serviço de escrita é compartilhado: `core/services/notificationService.js`.

## admin/ — plataforma

Painel exclusivo de `platform_admin` (`/admin/*`), sem sub-papéis.
- **pages**: `AdminDashboard` (hub com atalhos), `AdminPets` (moderar/excluir
  qualquer pet), `AdminReports` (ver todas as denúncias), `AdminUsers`
  (banir/desbanir), `AdminOrganizations` (excluir organização, cascata via
  `clubService.deleteClub`), `AdminMetrics` (gráficos com `recharts`:
  adoções/mês, crescimento de usuários, pets por estado, denúncias/mês),
  `AdminContentEditor` (CMS em Markdown das páginas institucionais, ver
  abaixo).
- **services**: `adminService` (`listAllUsers`, `banUser`/`unbanUser` — geram
  `audit_logs` `user_banned`/`user_unbanned`), `metricsService`
  (`fetchMetricsData`, `groupByMonth`, `groupByField` — funções puras
  testadas, consumem os dados já buscados).

## Fora dos módulos (`src/pages/`, `src/core/`)

- `pages/Home.jsx` — landing pública. `pages/Login.jsx` — login Google.
  `pages/Profile.jsx` — dados do usuário, LGPD (exportar/excluir dados via
  `core/services/dataExportService.js` e `deleteAccountService.js`), link
  para "meus pets"/"radar". `pages/Terms.jsx`, `PrivacyPolicy.jsx`,
  `Legislation.jsx` — conteúdo institucional em Markdown, editável por
  `platform_admin` em `/admin/conteudo` (`AdminContentEditor` +
  `core/services/platformContentService.js`, coleção `platform_content`).
  Cada página busca o Markdown salvo e, se ainda não houver edição, usa o
  texto padrão embutido em `DEFAULT_PLATFORM_CONTENT`. Renderização via
  `components/ui/markdown-content.jsx`; edição via
  `components/ui/markdown-editor.jsx`. Layout do cabeçalho compartilhado por
  `src/components/legal-page.jsx`.
  `pages/BannedNotice.jsx` — tela de conta suspensa.
- `components/AdSlot.jsx` — card "conteúdo patrocinado" atrás da feature
  flag `AD_SLOTS` (`core/featureFlags.js`); sem integração real de ads.
- `core/services/` — ver `docs/ARCHITECTURE.md` (auditoria, notificações,
  storage, observabilidade, export/exclusão de dados).

## Mapa rota → módulo

| Rota | Módulo / arquivo |
| --- | --- |
| `/feed`, `/pets/*`, `/meus-pets`, `/radar` | pets/pages/* |
| `/onboarding` | onboarding/pages/OnboardingQuestionnaire |
| `/organizacoes/*` | organizations/pages/* |
| `/chat*` | chat/pages/ChatPage |
| `/denuncias/nova` | reports/pages/CreateReport |
| `/perfil` | pages/Profile |
| `/`, `/login`, `/termos`, `/politica-privacidade`, `/legislacao` | pages/* |
| `/admin/*` | admin/pages/* |
