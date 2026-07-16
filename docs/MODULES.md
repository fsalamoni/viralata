# MODULES

> O que cada módulo faz, arquivos-chave e fluxos principais. Panorama em
> `docs/AI_CONTEXT.md`; dados em `docs/DATA_MODEL.md`; design visual em
> `docs/DESIGN_SYSTEM.md` (spec v1.0 oficial).

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

Maior módulo do app. Nomes de arquivo ainda usam "Club" (herança de um
fork anterior), mas a UI chama isso de "Organizações". Tudo vive sob
`/organizacoes` (a rota `/comunidade` pertence ao módulo standalone de
comunidades — ver abaixo):
- **Público** (`/organizacoes`, `/organizacoes/:id`) — diretório e perfil,
  abertos a todos: busca, pets para adoção, campanhas ativas, ingressar
  por código/pedido/convite; membros ganham abas
  Membros/Eventos/Mural/Fóruns (`?tab=` + `?thread=`).
- **Gestão** (`/organizacoes/hub`, `/organizacoes/:id/admin`) — hub de
  gestão (só quem administra alguma organização) e painel de
  administração, com abas condicionadas por permissão granular.

- **pages**: `ClubsDirectory` (`/organizacoes`), `ClubDetail`
  (`/organizacoes/:id`), `CreateClub` (`/organizacoes/criar`),
  `EventDetail` (`/organizacoes/:id/eventos/:eventId`), `OrganizationsHub`
  (`/organizacoes/hub` — "Minhas organizações" + "Descobrir outras"),
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
de convite**. Eventos públicos publicados notificam membros; cada evento
tem datas com RSVP e um chat próprio.

**Permissões granulares** (`club_members.permissions`) deixam um membro
comum assumir uma fatia da administração sem virar `admin` pleno — role e
permissões só mudam pela mão de um admin (`ClubMembersTab.jsx`, toggles por
membro):
- `edit_pets` — cadastrar/editar/concluir adoção dos pets da organização
  (`canEditClubPets` em `firestore.rules`; controla também a aba "Pets" em
  `ClubDetail.jsx` e as ações de editar/excluir em `PetDetail.jsx`).
- `manage_team` — aprovar pedidos de ingresso, convidar e remover membros
  comuns (`canManageClubTeam`), sem poder promover a admin nem editar as
  configurações da própria organização — essas telas ficam dentro da mesma
  aba "Administração" de `ClubAdminTab.jsx`, mas segregadas por essa flag.
- `view_reports` — vê a aba "Relatórios" (`ClubReportsPanel.jsx`, contagem
  de pets por status), sem acesso a mais nada de admin.
- `reply_chat` — em `PetDetail.jsx`, permite ver a aba "Interessados" e
  conversar/rejeitar candidatos para pets da organização mesmo sem
  `edit_pets` (`canReplyClubChat`, incluída em `canManagePet` porque abrir
  uma conversa move o pet para "em processo" — exige escrita em `pets`).

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
  `ChatComposer`, `NewChatDialog`.
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

## communities/ — comunidades de usuários

Grupos sociais independentes das organizações (rota `/comunidade`), com a
mesma entidade `communities` servindo também de vínculo editorial opcional
para agrupar organizações no diretório (`clubs.community_id`).

- **pages**: `CommunitiesDirectory` (`/comunidade` — busca, ingresso por
  código de convite), `CommunityDetail` (`/comunidade/:id` — abas Mural /
  Fórum / Eventos / Sobre, participar/sair; resolve links legados de
  organização redirecionando para `/organizacoes/:id`), `CreateCommunity`
  (`/comunidade/criar`).
- **components**: `MuralTab` (posts com curtidas — doc determinista
  `postId_uid` — e comentários expansíveis), `ForumTab` (tópicos +
  respostas), `EventsTab` (eventos da comunidade), `AboutTab` (descrição +
  código de convite para o dono).
- **services**: `communityService` (CRUD, membros — id determinista
  `communityId_uid` —, posts/curtidas/comentários, fórum, eventos,
  ingresso por `invite_code`, contagem de membros via
  `getCountFromServer`).
- **domain**: `constants` (coleção + visibilidade), `directory` (status do
  diretório, ordenação e filtros públicos — usado também pelo módulo de
  organizações).
- **hooks**: `useCommunities` (diretório/admin CRUD via React Query).

## Mapa rota → módulo

| Rota | Módulo / arquivo |
| --- | --- |
| `/`, `/termos`, `/legislacao`, `/politica-privacidade` | `pages/Home`, `pages/Terms`, `pages/Legislation`, `pages/PrivacyPolicy` |
| `/login` | `pages/Login` |
| `/onboarding` | `onboarding/pages/OnboardingQuestionnaire` |
| `/feed`, `/pets/:id`, `/pets/new`, `/pets/:id/edit`, `/meus-pets`, `/radar` | `pets/pages/*` |
| `/comunidade`, `/comunidade/criar`, `/comunidade/:id` | `communities/pages/*` |
| `/organizacoes`, `/organizacoes/:id`, `/organizacoes/hub`, `/organizacoes/criar`, `/organizacoes/:id/admin`, `/organizacoes/:id/eventos/:eventId` | `organizations/pages/*` |
| `/chat*` | `chat/pages/ChatPage` |
| `/denuncias/nova` | `reports/pages/CreateReport` |
| `/perfil` | `pages/Profile` |
| `/admin/*` | `admin/pages/*` |
