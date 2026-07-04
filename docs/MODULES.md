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
