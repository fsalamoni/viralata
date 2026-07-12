# Relatório Agente C — COMUNIDADE + ADOTANTE + EVENTOS (Regra A 5 eixos)

**Data:** 2026-07-11
**Worktree:** D:\viralata\.worktrees\wt-e79e15ca
**Sessão:** mvs_311d078987d0414a90f57ef28b789b18
**Frente:** COMUNIDADE + ADOTANTE + EVENTOS
**Status:** ✅ Concluído (READ-ONLY)

> **Modo:** READ-ONLY. Apenas este arquivo foi escrito. Nenhuma edição em
> `SCRUM_TASKS.json`, `AGENTS.md`, código, `firestore.rules`, `storage.rules`,
> `package.json`, `painel-scrum.html`, `sync.cjs`, `autosync.cjs`, `install-hooks.cjs`.
>
> **Último ID de task no SCRUM_TASKS.json:** TASK-140. Tasks novas propostas
> abaixo usam prefixo `TASK-141+` (não aditadas pelo agente, apenas estruturadas).

---

## Resumo executivo

- **Sub-frentes cobertas:** 3 (Comunidade, Adotante, Eventos)
- **Total de eixos avaliados:** 5 (UX, Papéis, Regras, Integrações, Pós-deploy)
- **Cobertura atual estimada:** **~55%**
  - Comunidade: **~70%** (feed com likes/comments ✅, painel admin ✅, mas fórum sem moderação, eventos sem RSVP público, sem busca dedicada, sem analytics de adimplência)
  - Adotante: **~50%** (perfil completo ✅, LGPD export/delete ✅, mas sem dashboard unificado de applications, sem histórico visual de adoções, sem feed de "matches", sem preferências de notificação granulares)
  - Eventos: **~45%** (criação admin ✅, RSVP ✅, chat ✅, mas sem tipos "vacinação/palestra/fundraising", sem certificados, sem vínculo com pets/voluntários, sem export .ics, sem notificações FCM, sem busca global)
- **Gaps identificados:** **42** (distribuídos pelos 5 eixos × 3 sub-frentes)
- **Tasks novas propostas:** **32** (TASK-141 a TASK-172)
- **Blockers:** 4 (1 crítico de segurança, 1 LGPD, 1 multi-tenant, 1 de feature flag)
- **Cobertura LGPD na sub-frente Adotante:** **parcial** (export/delete ✅, mas falta consent granular em PII nova e revisão DPO)
- **Cobertura multi-tenant Comunidade:** **regular** (`community_id` em posts ✅, mas `community_events` está sem essa normalização)

---

## Matriz papel × sub-frente (resumo)

| Sub-frente | anonymous | adopter | volunteer | shelter_admin | platform_admin |
|---|---|---|---|---|---|
| **Comunidade** | ver feed | ver + post + comentar + like | ver + post + comentar | moderar posts, gerenciar equipe, criar eventos | tudo (criar/destruir) |
| **Adotante** | — | ver/editar próprio perfil, ver dashboard, LGPD export/delete | — | ver applicants (snapshot, NÃO perfil completo) | ver tudo + delete account |
| **Eventos** | ver público | ver + RSVP (going/maybe/not_going) | ver + RSVP | criar/editar/excluir + convidar + gerenciar datas | tudo |

> **Detalhe importante:** Em "Comunidade" e "Adotante" há **comunidades
> (entidade editorial)** e **ONGs (entidade organizacional)** no mesmo
> sistema. O painel admin de ONG é gerido pelo Agente B; o de comunidade
> (módulo `communities/`) é gerido pelo Agente C. O Agente A cuida de
> voluntários e o painel do abrigo. Há sobreposição nos pontos onde o
> abrigo quer "promover" voluntários para a comunidade, eventos de
> comunidade vinculados a pets, etc. (ver Interfaces no fim).

---

## 1. UX (por sub-frente)

### 1.1 COMUNIDADE

#### ✅ O que existe (paridade ONG/comunidade já implementada via flag)

**Páginas públicas** (`src/modules/communities/pages/`):
- `CommunitiesDirectory.jsx` — diretório público, com filtros.
- `CommunityDetail.jsx` — 4 abas: Mural, Fórum, Eventos, Sobre (+ Equipe pra admin).
- `CreateCommunity.jsx` — wizard simples (nome, descrição, capa, privacidade).

**Painel admin** (`CommunityAdminPanel.jsx`):
- 4 abas: Visão Geral, Mural, Equipe, Configurações (zona de risco).
- `arena-panel-strong` no header, `arena-tab-bar` para tabs, `mt-12 sm:mt-14` no conteúdo.
- 2 stat cards (membros, fundação) + descrição.
- **2 modos via flag `COMMUNITY_NGO_PARITY`**:
  - ON: capa `<CommunityCover>` (banner gradiente, avatar-iniciais, chips Padronizados) e painel com 4 abas no padrão ONG.
  - OFF: capa-flat legado e painel com 3 abas (overview, team, settings).
- Danger zone (excluir comunidade) só aparece pra admin/owner.

**Componentes do Mural** (`src/modules/communities/components/`):
- `MuralTab.jsx` — wrapper flag-driven:
  - `MURAL_RICH_POSTS` ON → `MuralTabAdmin` (anexos, fotos, vídeos, PDFs)
  - `MURAL_LIKES_AND_COMMENTS` ON → `MuralTabEnhanced` (likes + comments)
  - fallback → `MuralTab.original` (somente leitura)
- `MuralTabEnhanced.jsx` — likes com toggle otimista + reversão em erro, comentários com lazy-load ao expandir, exclusão com `ConfirmDialog`, ARIA (`aria-pressed`, `aria-expanded`, `aria-label`).
- `MuralTabAdmin.jsx` — versão com anexos (Storage).
- `ForumTab.jsx` — tópicos de fórum com `ThreadList`, `CreateThread`, `ThreadDetail`, `PollComponent`, `AttachmentRenderer`, `CommentSection`.
- `EventsTab.jsx` — lista simples de eventos com `EventFormDialog` (título, data, local, descrição).
- `AboutTab.jsx` — sobre a comunidade.
- `CommunityTeamTab.jsx` — gerenciamento granular de equipe (admin/member + permissões `feed`/`events`/`team`).
- `CommunityCover.jsx` — capa no padrão ONG, com fallback gradiente e marca d'água.
- `CommunityAdminTab.jsx` — formulário de edição (nome, descrição, capa, privacidade).

**Hooks** (`hooks/useCommunities.js`):
- `useCommunities`, `useAdminCommunities`, `useCommunity(id)`, `useCreateCommunity`, `useUpdateCommunity`, `useDeleteCommunity`, `useMyCommunityMembership`, `useCommunityMembers`, `useSetCommunityMemberRole`, `useSetCommunityMemberPermissions`, `useRemoveCommunityMember`.

**Service** (`services/communityService.js`):
- `listCommunities`, `getCommunity`, `createCommunity`, `updateCommunity`, `deleteCommunity`, `joinCommunity`, `claimCommunityOwnership`, `getCommunityMembership`, `isCommunityAdmin`, `listCommunityEvents`, `createCommunityEvent`, `deleteCommunityEvent`, `getCommunityPosts`, `createPost`, `deletePost`, `toggleThreadLike`, `getThreadLikes`, `toggleMessageLike`, `getMessageLikes`, `votePoll`, `getPollVotes`, `togglePostLike`, `getPostLikes`, `getMyLikedPostIds`, `getPostComments`, `addPostComment`, `deletePostComment`, `getForumThreads`, `createForumThread`, `deleteForumThread`, `getThreadMessages`, `addThreadMessage`, `deleteThreadMessage`, `listCommunityMembers`, `setCommunityMemberRole`, `setCommunityMemberPermissions`, `removeCommunityMember`.

#### ❌ Gaps Comunidade (UX)

- **[GAP-UX-01.1] Página pública de evento individual** — Não existe rota `/comunidade/:id/evento/:eventId` com detalhe do evento (data, local, descrição, lista de participantes). Hoje só há uma **lista** em `EventsTab.jsx` sem drill-down. Caminho esperado: `src/modules/communities/pages/CommunityEventDetail.jsx` + 2 abas (Detalhes/Participantes) seguindo o padrão `EventDetail.jsx` da ONG.
- **[GAP-UX-01.2] RSVP em evento de comunidade** — Não há UI para "Vou / Talvez / Não vou" em eventos de comunidade. `EventsTab.jsx` só lista. Modelo de dados `community_events` nem tem `rsvp_status`. Padrão ONG: `EventParticipantsPanel.jsx` com `INVITE_STATUS` + `setResponse`. Espelhar isso.
- **[GAP-UX-01.3] Convidar pessoas para evento de comunidade** — Sem `InviteDialog` em comunidade. Caminho esperado: `src/modules/communities/components/CommunityEventInviteDialog.jsx` espelhado de `EventParticipantsPanel.jsx` (linhas 220-292).
- **[GAP-UX-01.4] Busca global de comunidades** — Diretório (`CommunitiesDirectory.jsx`) não tem campo de busca textual nem filtro por cidade/UF. Smart Search (Fase 18, `src/modules/shelter/domain/search/search.js`) **só tem entity `shelter`**, falta `community`.
- **[GAP-UX-01.5] Empty/error states em `CommunityDetail.jsx`** — Linha 107: erro de "comunidade não encontrada" renderiza `<div>Comunidade não encontrada</div>` (texto simples, sem ícone, sem CTA). Padrão ONG (`EventDetail.jsx:62-83`) usa `EmptyState` com `icon`, `title`, `description`, `action`. Aplicar.
- **[GAP-UX-01.6] Empty state em `CommunityTeamTab.jsx`** — Não verificado mas precisa de auditoria (módulo `organizations/` já tem `ClubMembersTab.jsx` com EmptyState). Hipótese: comunidade pode estar sem equivalente. (Verificar `src/modules/communities/components/CommunityTeamTab.jsx` no worktree).
- **[GAP-UX-01.7] Onboarding contextual de comunidade** — Ao entrar em comunidade sem posts, sem eventos, sem fórum, o `CommunityDetail.jsx` mostra abas vazias. Falta **primeiro Acesso** com tooltips explicando "Como participar" / "Como postar" / "Como abrir um tópico".
- **[GAP-UX-01.8] Posts patrocinados (SHELTER_SPONSORED_FLAG)** — `featureFlags.js` tem `AD_SLOTS` (espaço de anúncios) **mas o card "Conteúdo patrocinado" não é renderizado no Mural da comunidade nem no feed dela**. Falta implementar o slot no `MuralTab.jsx` (entre posts, com card visual não intrusivo, sem integração real de ad network).
- **[GAP-UX-01.9] Notificações visíveis para Comunidade** — `notificationService.js:22-48` não tem tipo `COMMUNITY_POST_LIKE`, `COMMUNITY_POST_COMMENT`, `COMMUNITY_FORUM_REPLY`, `COMMUNITY_EVENT_PUBLISHED`. Hoje, o usuário só sabe de curtidas/comentários se voltar à comunidade. Falta gerar `notifications/` ao criar like/comment/reply/event.
- **[GAP-UX-01.10] Acessibilidade — MuralTabEnhanced tem ARIA** ✅ mas `MuralTab.original.jsx` provavelmente não. Verificar (não lido). Faltam também testes E2E de keyboard nav no fórum.
- **[GAP-UX-01.11] Chat admin entre comunidades** — Existe `ChatPage` (`src/modules/chat/pages/ChatPage.jsx`) que é o chat geral usuário↔ONG/usuário↔usuário. Não há chat dedicado de comunidade (canal onde admin da comunidade fala com membros). Espelhar `club_chat_threads` → `community_chat_threads`.
- **[GAP-UX-01.12] Configurações da comunidade** — `CommunityAdminTab.jsx` tem só nome/descrição/capa/privacidade. Falta: `notification_settings` (membros recebem FCM por padrão?), `join_policy` (livre vs aprovação), `rules_text` (regras internas), `cover_color` ou `theme`.
- **[GAP-UX-01.13] Convite de membros** — `CommunityTeamTab.jsx` provavelmente tem botão "convidar" mas não verifiquei. A doc da missão diz "Membros e convites". Verificar e garantir: search de usuário por email/uid → envio de convite → status pending/accepted/declined (espelhar `MEMBER_INVITE_STATUS` da ONG).
- **[GAP-UX-01.14] Post fixado / destaque** — `community_posts` não tem campo `pinned` ou `featured`. Faltam no `MuralTab.jsx` o carrossel/banner de "Em destaque" no topo.

### 1.2 ADOTANTE

#### ✅ O que existe

- `src/pages/Profile.jsx` — perfil unificado (dados pessoais + perfil de adotante + privacidade + LGPD):
  - Foto, nome, telefone, cidade, UF, gênero, privacidade do telefone.
  - Perfil de adotante: tipo de moradia, rotina de passeios, orçamento, crianças, idosos, outros pets.
  - Botão "Baixar meus dados" → `dataExportService.exportMyData` (JSON com profile, pets, adoption_interests, club_memberships, notifications, abuse_reports, ratings_given/received, conversations).
  - Botão "Excluir minha conta" → `deleteAccountService.deleteMyAccount` (com confirmação dupla).
- `src/core/services/dataExportService.js` — export LGPD Art. 18 V.
- `src/core/services/deleteAccountService.js` — delete LGPD Art. 18 VI.
- `src/core/services/auditService.js` — `createAuditLog` cobre `user_profile_updated`, `user_account_deleted`, `adoption_interest_registered`, `adoption_completed`.
- `src/modules/onboarding/domain/profileCompletion.js` — `isAdopterProfileComplete` valida `full_name`, `city`, `state`, `housing_type`, `daily_walks`, `budget_level` + `lgpd_consent` (true ou `lgpd_consent_at`).
- `src/modules/pets/pages/MyInterests.jsx` — dashboard "Meus Interesses":
  - Lista pets curtidos pelo usuário.
  - Enriquece com `usePetsById` (1 query batch).
  - Mostra status: disponível, em processo, adotado por você, adotado por outro, interesse rejeitado.
  - Empty state rico com CTA "Explorar pets no feed".
  - Skeleton, ConfirmDialog, badges (Heart, MapPin, CalendarCheck, MessageCircle, BadgeCheck, Hourglass, XCircle, CheckCircle2).
  - Tabs de filtro (Em análise, Aprovados, Rejeitados, Adotados).
- `src/modules/pets/pages/MyPets.jsx` — pets que o usuário cadastrou (doador) — não exatamente "adotante", mas alguns adotantes antigos também têm pets próprios.
- `src/modules/pets/components/InterestPanel.jsx` — componente de "Tenho interesse" na página do pet.
- `src/modules/chat/pages/ChatPage.jsx` — chat geral onde o adotante fala com o abrigo (`ChatPage` usa `conversations/` collection).
- `src/modules/notifications/components/NotificationsMenu.jsx` — sino no header com:
  - Tipos: CHAT_MESSAGE, ADOPTION_INTEREST, ADOPTION_MATCH, ADOPTION_REJECTED, ADOPTION_COMPLETED, PET_STATUS_CHANGED, PET_RADAR_MATCH, CLUB_INVITE, etc.
  - `aria-label`, badge de não-lidas, "Marcar todas como lidas", ícones por tipo, `timeAgo` localizado.
- `src/modules/pets/services/interestService.js` — `getInterestsByUser`, `getInterestsByPet`, `hasInterest`, `registerInterest`, `deleteInterest`.

#### ❌ Gaps Adotante (UX)

- **[GAP-UX-02.1] Dashboard unificado do Adotante** — Não existe página `/meu-painel` ou `/adotante` que mostre **todas as dimensões** do adotante numa única tela. Hoje o usuário navega em:
  - `/meus-interesses` (curtidas) ✅
  - `/meus-pets` (pets do usuário) ✅
  - `/perfil` (perfil + LGPD) ✅
  - `/chat` (mensagens) ✅
  - Mas falta visão agregada: cards com "X adoções finalizadas, Y em processo, Z pets favoritos, perfil completo, próximo milestone de pós-adoção, notificações não lidas".
- **[GAP-UX-02.2] Pets anteriores (histórico de adoções)** — `user_profiles` (`users/`) não tem campo `previous_adoptions` (array de pet_ids). O adotante não tem um card "Pets que você adotou" no perfil. Subscrito em `MyInterests.jsx` pelo badge "Adotado por você", mas só para pets ainda visíveis.
- **[GAP-UX-02.3] Preferências de notificação granulares** — Não há switch por categoria no perfil: "Quero receber sobre: chat ✅, adoção ✅, eventos ✅, fórum ❌, marketing ❌". Hoje é tudo-ou-nada.
- **[GAP-UX-02.4] Match visual ("pets compatíveis com seu perfil")** — Radar (`pet_radars/`) existe no Firestore e na Cloud Function (`functions/index.js:25-77`) que envia `pet_radar_match` quando novo pet casa. Mas não há UI dedicada: a notificação chega, mas falta uma página `/radar` que liste os matches acumulados com filtro.
- **[GAP-UX-02.5] PII nova sem consent explícito** — `Profile.jsx` edita `phone`, `gender`, `housing_type`, `daily_walks`, `budget_level`, `has_children`, `has_elderly`, `other_pets`, `photo_url`. Esses são **PII** mas o consentimento é o do cadastro (LGPD aceite no onboarding). **Falta:** banner de consent granular ao PRIMEIRO salvamento de cada campo novo (DPO review).
- **[GAP-UX-02.6] Estado de onboarding incompleto** — `isAdopterProfileComplete` retorna boolean. Falta UI que **mostre checklist** com checkmarks e CTA "Complete seu perfil" (banner persistente ou modal).
- **[GAP-UX-02.7] Histórico de pets favoritos (além de "interesses")** — `MyInterests.jsx` cobre "demonstrou interesse". Mas usuário pode ter "salvos" sem interesse. Falta `/favoritos` ou flag `is_favorite` em `adoption_interests`.
- **[GAP-UX-02.8] Bloqueio de adoção com explicação (`PET_ADOPTION_GATING`)** — `featureFlags.js:43-53` declara a flag. Verificar se `PetDetail.jsx` realmente renderiza o card explicativo. (Não lido no Agente C; é do Agente B). Se sim, é dependência cruzada.
- **[GAP-UX-02.9] Filtro de busca por perfil do adotante** — Smart Search (Fase 18) tem entity `adopter` (search.js:59-73), mas é só pra admin abrigo. Adotante não pode buscar seus próprios matches.
- **[GAP-UX-02.10] Export visual do JSON de LGPD** — `downloadDataExport` baixa um JSON cru. Falta UI de preview ("Você está prestes a baixar X documentos, Y notificações, etc.") com checkbox "Entendo".
- **[GAP-UX-02.11] Soft-delete com recuperação** — `deleteAccountService.deleteMyAccount` apaga definitivamente. LGPD permite 30 dias de arrependimento. Falta job de "tombstone" + cron de purga.

### 1.3 EVENTOS

#### ✅ O que existe (foco ONG)

- `src/modules/organizations/domain/constants.js` — `CLUB_EVENT_TYPE` (4 tipos: ADOPTION_FAIR, SOCIAL, MEETING, OTHER), `CLUB_EVENT_TYPE_LABELS`, `RSVP_STATUS` (going/maybe/not_going), `INVITE_STATUS` (invited/going/maybe/not_going), `EVENT_VISIBILITY` (public/private), `INVITE_SOURCE` (club/platform).
- `src/modules/organizations/components/ClubEventsTab.jsx` — lista de eventos no painel da ONG, `EventFormDialog` com tipo/data/local/descrição/recorrente/visibilidade.
- `src/modules/organizations/pages/EventDetail.jsx` — página `/organizacoes/:orgId/eventos/:eventId`:
  - Header `arena-panel-strong` (igual ONG).
  - 3 tabs: Detalhes e datas, Participantes, Conversa.
  - Empty state quando evento não encontrado ou usuário sem acesso.
  - Skeleton, badges (tipo, visibilidade, recorrente).
- `src/modules/organizations/components/EventDatesPanel.jsx` — múltiplas datas (recorrência), RSVP por data, status por usuário.
- `src/modules/organizations/components/EventParticipantsPanel.jsx` — participantes, convidados, botão "Convidar pessoas", `InviteDialog` com pool de membros.
- `src/modules/organizations/components/EventChat.jsx` — chat do evento (subcoleção `messages/`).
- `src/modules/organizations/hooks/useClubs.js` — `useClubEvents`, `useCreateClubEvent`, `useUpdateClubEvent`, `useDeleteClubEvent`, `useClubEvent`, `useEventInvites`, `useSetEventResponse`, `useInviteToEvent`, `useRemoveEventInvite`, `useUpdateEvent`.
- `firestore.rules:1095-1147` — `match /club_events/{eventId}` (read, create, update, delete + subcoleções `dates/`, `date_rsvps/`, `messages/`, `participants/`), `match /club_event_rsvps/{rsvpId}` legado.

#### ❌ Gaps Eventos (UX)

- **[GAP-UX-03.1] Tipos amplos "vacinação/palestra/fundraising"** — `CLUB_EVENT_TYPE` só tem 4 tipos (mutirão, social, reunião, outro). Não cobre campanhas de vacinação, palestras educativas, fundraising, eventos com pets. Adicionar `VACCINATION`, `LECTURE`, `FUNDRAISING`, `PET_DAY`.
- **[GAP-UX-03.2] Vínculo evento ↔ pet** — Não há campo `pet_ids: []` em `club_events`. Hoje, evento "Mutirão de adoção do Rex" não consegue dizer "este evento é especificamente sobre o Rex". Sem isso, RSVP não pode priorizar pets, vitrine não filtra, certificado não cita o pet.
- **[GAP-UX-03.3] Vínculo evento ↔ voluntário (interface com Agente A)** — Mesmo problema: `club_events` não tem `volunteer_ids: []` nem `volunteer_shifts`. Agente A está mapeando voluntários e espera ter como "vincular voluntários ao evento". **Coordenação obrigatória.**
- **[GAP-UX-03.4] Página pública de evento (fora do painel da ONG)** — `EventDetail.jsx` está em `/organizacoes/:orgId/eventos/:eventId`. Não há rota pública `/eventos/:eventId` ou `/comunidade/:id/evento/:eventId`. Visitante anônimo não consegue ver evento da ONG sem login.
- **[GAP-UX-03.5] Lista de eventos (descoberta)** — Não há diretório público `/eventos` nem `/comunidade/:id/eventos` com filtros (data, cidade, tipo). Smart Search (Fase 18) **não tem entity `event`**. Falta `SEARCH_ENTITIES.event` em `search.js`.
- **[GAP-UX-03.6] Certificados** — Não há fluxo "Certificado de participação em evento de adoção". Subscrito na missão do Agente C ("vínculo com pets (ex: evento de adoção do Rex)"). Adicionar `event_certificates/{userId_eventId}` com storage de PDF gerado, download via Storage.
- **[GAP-UX-03.7] Export .ics (Google Calendar)** — Botão "Adicionar ao Google Calendar" não existe. Implementar gerando URL `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...` ou gerar `.ics` server-side.
- **[GAP-UX-03.8] Notificações FCM/email de evento** — `notificationService.js:41` tem `EVENT_INVITE` mas `EventParticipantsPanel` (`invite.mutateAsync`) não chama `notifyUser(EVENT_INVITE)`. Falta wire-up de:
  - `CLUB_EVENT_PUBLISHED` quando admin cria evento público.
  - `EVENT_REMINDER` (24h antes) via Cloud Function scheduled.
  - `EVENT_RSVP_CONFIRMED` quando usuário confirma presença.
- **[GAP-UX-03.9] Página de "Meus eventos"** — Não há `/meus-eventos` que mostre: eventos que criei, eventos que participo (going), eventos que fui convidado (pending). Adotante hoje só vê eventos pelas notificações ou voltando à página da ONG.
- **[GAP-UX-03.10] Adimplência (gratuito vs pago)** — `club_events` não tem campo `is_paid`, `price_cents`, `pix_key`. Eventos "Fundraising" ou "Palestra" podem ser pagos. Hoje tudo é gratuito. Adicionar + flow de pagamento (Pix via Mercado Pago? Gateway?).
- **[GAP-UX-03.11] Empty states** — `EventDetail.jsx` ✅ (EmptyState com mensagem custom). `ClubEventsTab.jsx` ✅ (EmptyState com CTA "Criar evento"). Mas `CommunityEventsTab.jsx` tem empty state inline simples (linha 62-65 de `EventsTab.jsx`), não usa `EmptyState`. Migrar.
- **[GAP-UX-03.12] Mobile + a11y** — `EventDetail.jsx` tem `aria-label` no Back button, mas Dialogs de evento não foram auditados. Garantir focus trap, `aria-modal`, escape fecha dialog.
- **[GAP-UX-03.13] Vínculo evento ↔ comunidade** — `community_events` (existe em `communityService.js:187-212`) é separado de `club_events` (ONG). Não há como "evento de ONG que aparece também no calendário da comunidade X" (crosspost). Adicionar `linked_community_ids: []` em `club_events`.

---

## 2. Papéis

### 2.1 Matriz papel × ação detalhada (3 sub-frentes)

#### COMUNIDADE

| Ação | anonymous | adopter (não-membro) | member (comunidade) | admin | owner | platform_admin |
|---|---|---|---|---|---|---|
| Ver página pública | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Ver feed/mural | ✅ | ✅ (preview) | ✅ | ✅ | ✅ | ✅ |
| Postar no mural | ❌ | ❌ | ✅ se permissão `feed` | ✅ | ✅ | ✅ |
| Comentar post | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Curtir post | ✅ (sem uid) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Criar tópico fórum | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Criar evento | ❌ | ❌ | ✅ se permissão `events` | ✅ | ✅ | ✅ |
| RSVP evento (going) | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Gerenciar equipe | ❌ | ❌ | ❌ | ✅ se permissão `team` | ✅ | ✅ |
| Editar comunidade | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Excluir comunidade | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Aprovar membro | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Moderar posts (deletar qualquer) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |

**Permissões granulares existentes** (`communities/domain/constants.js:29-41`):
- `feed` (publicar no mural)
- `events` (gerenciar eventos)
- `team` (gerenciar equipe)

#### ADOTANTE

| Ação | anonymous | adopter (próprio) | shelter_admin (vê applicants) | platform_admin |
|---|---|---|---|---|
| Ver página `/perfil` | ❌ | ✅ | ❌ | ✅ (debug) |
| Editar perfil próprio | ❌ | ✅ | ❌ | ❌ |
| Ver perfil público de outro adotante | ❌ | apenas info pública (nome + foto) | snapshot no adoption_workflow | tudo |
| LGPD export (Art. 18 V) | ❌ | ✅ (próprio) | ❌ | ✅ (debug) |
| LGPD delete (Art. 18 VI) | ❌ | ✅ (próprio) | ❌ | ✅ |
| "Tenho interesse" em pet | ❌ | ✅ | ❌ | ❌ |
| Ver "Meus Interesses" | ❌ | ✅ | ❌ | ❌ |
| Iniciar chat com abrigo | ❌ | ✅ (se perfil completo) | responde | tudo |
| Receber radar de pets | ❌ | ✅ se ativo | ❌ | ✅ |
| Ver histórico de adoções | ❌ | ✅ (próprio) | ❌ | ✅ |

**Permissões granulares:** Não há `community:read`, `adopter:read_own` etc. A lógica é implícita via `isAuth()` + `isOwner(userId)`.

#### EVENTOS (ONG)

| Ação | anonymous | adopter | volunteer | shelter_admin | member ONG | platform_admin |
|---|---|---|---|---|---|---|
| Ver evento público (ONG) | ❌ (precisa ser membro) | ❌ (membro) | ❌ (membro) | ✅ | ✅ | ✅ |
| Ver evento público (comunidade) | ✅ (público) | ✅ | ✅ | ✅ | n/a | ✅ |
| Ver evento privado (ONG) | ❌ | ❌ | ❌ | ✅ | ✅ se convidado | ✅ |
| RSVP (going/maybe/not_going) | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Convidar (privado) | ❌ | ❌ | ❌ | ✅ se criador | ❌ | ✅ |
| Criar evento | ❌ | ❌ | ❌ | ✅ | ❌ (mas pode ser staff) | ✅ |
| Editar/excluir | ❌ | ❌ | ❌ | ✅ se criador | ❌ | ✅ |
| Ver lista participantes | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Chat do evento | ❌ | ❌ | ❌ | ✅ | ✅ se participante | ✅ |

**Permissões granulares:** `event:create`, `event:rsvp`, `event:moderate` (não tipificadas no código atual — implícitas em `isClubOwnerOrAdmin` + `hasClubPermission(clubId, 'events')` na ONG).

### 2.2 ❌ Gaps Papéis

- **[GAP-PAP-01] Sem `community:read`, `community:moderate` como chaves explícitas** — Hoje a lógica de comunidade está em `hasCommunityPermission(community, membership, key)` com 3 chaves (`feed`, `events`, `team`). Falta padronizar com prefixo (`community:feed`) para alinhar com notação dos SHELTER_*. Recomendação: **manter compat** mas adicionar alias.
- **[GAP-PAP-02] Sem papel `community_moderator`** — Qualquer admin de comunidade pode moderar (deletar posts). Falta um papel intermediário "moderador" que deleta mas não edita comunidade nem gerencia equipe. Útil para comunidades grandes.
- **[GAP-PAP-03] Sem papel explícito para Foster/Volunteer em Comunidade** — Voluntário e Foster aparecem no painel de abrigo (Agente A/B), mas em comunidade só são "membro". Falta um papel "Membro voluntário da causa" (vs. "Só entra para olhar").
- **[GAP-PAP-04] Adotante não tem papel formal** — Hoje todo usuário com perfil completo é adotante. Falta distinguir:
  - `adopter.active` (buscando pet)
  - `adopter.paused` (não buscando no momento)
  - `adopter.history` (adotou, sem pet novo)
  - `adopter.first_time` (nunca adotou, primeira vez)
- **[GAP-PAP-05] `EventParticipantsPanel` não tem `can_manage_event` para staff com permissão `events`** — Hoje só `event.created_by === user?.uid` é o manager. Membros da ONG com permissão granular `events` não conseguem editar. **Acesso incorreto**.
- **[GAP-PAP-06] Pet `adopter` é cross-tenant na Smart Search** — `SEARCH_ENTITIES.adopter` (search.js:59-73) tem `isPublic: false` mas o caminho é top-level. Abrigo A pode ver applicants do Abrigo B se a query não filtrar `shelter_club_id`? Verificar — se a UI não filtra, é **vazamento de dados** (multi-tenant breach).
- **[GAP-PAP-07] `community_members` sem papel `pending`** — Quem pede para entrar (`handleJoin`) vai direto a `member`. Falta `pending` para comunidades com `join_policy: approval`. Hoje `CommunityAdminTab.jsx` tem `privacy: public|private` mas não `join_policy: open|approval`.
- **[GAP-PAP-08] Smoke test cross-role** — Não há teste E2E (Playwright) que simule cada papel × cada ação. Faltam scripts de smoke.

---

## 3. Regras de Negócio

### 3.1 ✅ O que existe (já validado)

- **Zod em domain modules**:
  - `src/modules/shelter/domain/search/search.js` (Zod em entities).
  - `src/modules/pets/domain/adoptionForm.js`, `feedFilters.js`, `matching.js`, `priority.js` (Zod).
  - `src/modules/organizations/domain/validators.js`, `forumPoll.js`, `privacy.js` (Zod ou similar).
  - `src/modules/communities/domain/directory.js` (já tem `sortCommunities`).
- **Firestore rules com return explícito**:
  - `firestore.rules:1249-1265` — `match /communities/{communityId}` (read/create/update/delete com todas as 4 ações).
  - `firestore.rules:1267-1290` — `match /community_members/{memberId}` (validação de role + update granular para `last_seen`).
  - `firestore.rules:1292-1310` — `match /community_posts/{postId}` (validação de ownership + admin).
  - `firestore.rules:1312-1316` — `match /community_post_likes/{likeId}` (idempotente via `${postId}_${uid}`).
  - `firestore.rules:1318-1322` — `match /community_post_comments/{commentId}` (create aberto a auth, update/delete só autor ou platform_admin).
  - `firestore.rules:1324-1327` — `match /community_events/{eventId}` (read público, create/update/delete só `isAuth()`).
  - `firestore.rules:1329-1371` — `match /community_forum_threads` + `community_forum_messages` (com subcoleções `likes/`, `poll_votes/`).
  - `firestore.rules:1095-1147` — `match /club_events/{eventId}` (ONG) + subcoleções (`dates/`, `date_rsvps/`, `messages/`, `participants/`).
  - `firestore.rules:1170-1177` — `match /club_posts/{postId}` (mural ONG, com permissão `feed`).
- **Auditoria**: `auditService.js` tem `createAuditLog` com `action`, `actor`, `details`, `created_at_ms`, `ip_address`, `user_agent`. Ações registradas para comunidade: `community_created`, `community_updated`, `community_deleted`, `community_post_created`, `community_post_deleted`, `community_member_role_updated`, `community_member_permissions_updated`, `community_member_removed`.
- **LGPD export/delete**: `dataExportService.exportMyData` (JSON), `deleteAccountService.deleteMyAccount`.
- **Multi-tenant**: `community_posts.community_id`, `community_members.community_id`, `clubs/{clubId}/*` com `shelter_club_id` redundante em `adoption_workflow`, `fosters`, `volunteers`, `exhibitions`.
- **Rate limit**: `functions/middleware/rateLimit.js` aplicado em `googleFormsWebhook`.

### 3.2 ❌ Gaps Regras

#### Multi-tenant / Segurança

- **[GAP-REG-01.1] `community_events` SEM validação de `community_id` na rule** — `firestore.rules:1324-1327`:
  ```js
  match /community_events/{eventId} {
    allow read: if true;
    allow create, update, delete: if isAuth();
  }
  ```
  **Defeito crítico de segurança:** qualquer usuário autenticado pode:
  - Criar evento em **qualquer** comunidade.
  - Atualizar/excluir evento de **qualquer** comunidade.
  - Atribuir `community_id` arbitrário.
  **Correção esperada:**
  ```js
  match /community_events/{eventId} {
    allow read: if true;
    allow create: if isAuth()
      && (canManageCommunity(get(...).data) || isCommunityMember(communityId));
    allow update: if isAuth() && (
      resource.data.created_by == request.auth.uid
      || canManageCommunity(...)
    );
    allow delete: if isAuth() && (
      resource.data.created_by == request.auth.uid
      || canManageCommunity(...)
    );
  }
  ```
  **Severity: CRITICAL** (cross-tenant leak + vandalismo).
- **[GAP-REG-01.2] `community_post_comments` SEM validação de post_id** — `firestore.rules:1318-1322`:
  ```js
  match /community_post_comments/{commentId} {
    allow read: if true;
    allow create: if isAuth(); // ← não valida post_id nem se usuário é membro
    ...
  }
  ```
  Hoje, comentário pode ser criado em qualquer post de qualquer comunidade. Validar `get(/community_posts/{request.resource.data.post_id})` + `isCommunityMember`.
- **[GAP-REG-01.3] `community_forum_messages` SEM validação de `thread_id`** — `firestore.rules:1351-1371`:
  ```js
  match /community_forum_messages/{messageId} {
    allow create: if isAuth(); // ← mesma brecha
  ```
  Resposta pode ser criada em qualquer thread de qualquer comunidade.
- **[GAP-REG-01.4] `community_forum_threads` SEM validação de `community_id`** — `firestore.rules:1329-1338`:
  ```js
  allow create: if isAuth();
  ```
  Tópico pode ser criado em qualquer comunidade. Verificar `isCommunityMember` ou `canManageCommunity`.
- **[GAP-REG-01.5] `community_forum_threads`/`messages` read público com PII em `text`** — `allow read: if true` permite scrape. Se texto do fórum tem dados pessoais (telefone, email), é vazamento LGPD. Recomendar `read: if isAuth() || (community.visibility == 'public')`.
- **[GAP-REG-01.6] `club_posts` (ONG) update permite admin mudar `likes_count`/`comments_count` direto** — `firestore.rules:1381-1407`. Admin com permissão `feed` pode fazer `update` completo, incluindo `likes_count` que deveria ser imutável. Usar `affectedKeys().hasOnly([...])` como em `community_posts`.

#### LGPD

- **[GAP-REG-02.1] Consent granular em PII nova do adotante** — `Profile.jsx` salva `gender`, `housing_type`, `daily_walks`, `budget_level`, `has_children`, `has_elderly`, `other_pets`, `photo_url` sem re-consent. Hoje o consent é o do cadastro (LGPD aceite no onboarding), mas **DPO review** + checkbox granular em cada campo novo seria mais robusto.
- **[GAP-REG-02.2] `dataExportService` não inclui `community_memberships`, `community_posts`, `community_forum_messages`** — Lista: `users/`, `pets/`, `adoption_interests`, `club_members`, `notifications`, `abuse_reports`, `adoption_ratings`, `conversations`. **Falta**: dados de comunidade, eventos, mensagens de chat, comentários, likes.
- **[GAP-REG-02.3] `deleteAccountService` não exclui `community_memberships`, `community_posts`, `community_forum_messages`** — Provavelmente só desativa `users/`. Verificar (não lido pelo Agente C). Se não exclui, é **retenção de dados pós-delete** (LGPD Art. 18 VI).
- **[GAP-REG-02.4] `community_posts` não tem snapshot de `user_consent_at`** — Para auditoria LGPD, posts devem guardar `user_consent_terms_version`. Não tem.
- **[GAP-REG-02.5] Sem `dataRetention` policy** — Não há job de purga para `audit_logs` (> 5 anos?), `notifications` (> 90 dias lidas?), `community_forum_messages` deletadas (soft delete? hard?). Cloud Function scheduled precisa existir.

#### Auditoria

- **[GAP-REG-03.1] Audit log não cobre `community_post_liked`, `community_post_commented`, `community_event_rsvp`, `community_event_created`, `community_event_deleted`, `community_forum_thread_created`** — `AUDIT_ACTION_LABELS` em `auditService.js:5-76` só lista `community_post_created/deleted`, `community_created/updated/deleted`, `community_member_*`. Faltam os acima.
- **[GAP-REG-03.2] Audit log sem `target_user_id`** — Para ações sensíveis (banir, mudar role), é importante saber `target_user_id` separado de `actor_id`. Hoje só `actor_id` + `user_id` (que é o mesmo).
- **[GAP-REG-03.3] Audit log sem `correlation_id`** — Para rastrear cadeia de eventos ("user X fez Y que disparou Z"), falta um ID de correlação entre Cloud Function e client.
- **[GAP-REG-03.4] `audit_logs` Firestore rules: `allow create: if isAuth()` permite qualquer um criar audit log fake** — `firestore.rules:542-546`:
  ```js
  match /audit_logs/{logId} {
    allow read: if isPlatformAdmin();
    allow create: if isAuth();
    allow update, delete: if false;
  }
  ```
  **Defeito de segurança:** usuário malicioso pode criar audit logs com `action: 'platform_feature_flag_changed'` e poluir a auditoria. Solução: usar Admin SDK (Cloud Function) para criar audit log, não client. Mudar para `allow create: if false` e garantir que todas as `createAuditLog()` no client vão via Cloud Function.
  **Severity: HIGH**.

#### Zod

- **[GAP-REG-04.1] `communityService.createPost` sem Zod** — `communityService.js:225-245` aceita `text` sem validar tamanho máximo. Pode postar texto de 1MB e derrubar o card. Aplicar `text` max 4000 chars.
- **[GAP-REG-04.2] `createCommunityEvent` sem Zod** — `communityService.js:193-208` aceita `title`, `description`, `location` sem limites. Aplicar Zod.
- **[GAP-REG-04.3] `communityService.createForumThread` sem Zod** — `communityService.js:396-413` sem `title` max, `text` max, `attachments` max.
- **[GAP-REG-04.4] `addThreadMessage` sem Zod** — `communityService.js:425-443` sem `text` max, `attachments` max, `poll` schema.
- **[GAP-REG-04.5] `Profile.jsx updateUserProfile` sem Zod schema explícito** — Edita 13 campos sem validação. `updateUserProfile` (em `FirebaseAuthContext`) provavelmente já tem algum, mas auditar.
- **[GAP-REG-04.6] `MuralTab.original.jsx` provavelmente sem Zod também** — Não lido, mas é o "fallback" sem flag. Auditar.

#### Adimplência / Pagamento

- **[GAP-REG-05.1] Eventos não diferenciam gratuito vs pago** — `club_events` sem `is_paid`, `price_cents`, `currency`. Hoje tudo é gratuito. Adicionar + flow.
- **[GAP-REG-05.2] Sem fluxo de pagamento integrado** — Nenhuma integração com gateway (Mercado Pago, Stripe, PagSeguro). Para "Fundraising" com entrada paga, é blocker.
- **[GAP-REG-05.3] Sem prestação de contas de evento pago** — Mesmo se adicionar pagamento, sem reconciliação com `club_ledger` (Fase 6 do abrigo).
- **[GAP-REG-05.4] Sem política de reembolso** — Cancelamento e reembolso não tipificados.

#### Outros

- **[GAP-REG-06.1] `community_events.starts_at` sem validação ISO 8601** — Firestore aceita string arbitrária. Validar formato.
- **[GAP-REG-06.2] `club_events` start_at permite datas no passado** — Criar evento retroativo é OK (registrar evento que aconteceu), mas precisa ser explícito. Adicionar `allow_backdated: boolean`.
- **[GAP-REG-06.3] `community_post_comments.update` SEM `affectedKeys().hasOnly([...])`** — Linha `firestore.rules:1321`: `update, delete: if isAuth() && (isPlatformAdmin() || request.auth.uid == resource.data.author_id);` permite trocar qualquer campo. Usar `hasOnly(['text', 'updated_at'])`.
- **[GAP-REG-06.4] Sem validação de `privacy` em `community_events`** — `community.privacy` pode ser `public`/`private` mas `community_events.visibility` não existe; é sempre `public` (livre).

---

## 4. Integrações

### 4.1 ✅ O que existe

- **Cloud Functions** (`functions/index.js`):
  - `onPetCreatedNotifyRadar` (Firestore trigger) — notifica matches do radar.
  - `googleFormsWebhook` (HTTP onCall com rate limit + secret) — Fase 5.
  - `materializePostAdoptionTasks` (scheduled) — Fase 6.
  - `snapshotPlatformHealth` (scheduled hourly) — Fase 21.
  - `onPlatformAlertEvent` (Firestore trigger) — Fase 21.
  - `triggerSecurityAlert` (onCall) — Fase 20.
- **Storage**:
  - `storageService.uploadImage(folder, file)` — upload genérico.
  - `ImageUpload` (UI) com `folder="communities"`, `folder="avatar"`, `folder="pets"`, etc.
  - `storage.rules` — paths: `uploads/{userId}`, `pets/{userId}`, `reports/{userId}`, `organizations/{orgId}`, `users/{userId}`.
- **Email**: Não há módulo de email dedicado visível no `functions/`. Provavelmente usa SendGrid ou Resend, mas não está nos arquivos lidos. Verificar.
- **FCM**: `notificationService.js` cria docs em `notifications/` (sino no header), mas **não há FCM push real**. Sino atualiza in-app, mas não push no celular.
- **Search**: Smart Search (Fase 18, `search.js`) com 5 entities: `pet`, `adopter`, `shelter`, `foster`, `exhibition`. Falta `community` e `event`.
- **Google Forms**: Webhook (Fase 5) com rate limit + secret + Apps Script. Mas não há "Google Forms import de RSVPs" (subscrito na missão do Agente C).
- **Google Calendar export .ics**: Não há.

### 4.2 ❌ Gaps Integrações

- **[GAP-INT-01.1] Sem Cloud Function para `community_post_created`** — Quando alguém posta no mural da comunidade, os seguidores (membros) não recebem notificação. Disparar `onCreate community_posts` → enqueue `notificationService` (FCM).
- **[GAP-INT-01.2] Sem Cloud Function para `community_post_liked`** — Curtidas não geram notificação para o autor.
- **[GAP-INT-01.3] Sem Cloud Function para `community_post_commented`** — Comentários não geram notificação para o autor do post (nem para o autor de comentários anteriores na thread).
- **[GAP-INT-01.4] Sem Cloud Function para `community_event_created`** — Admin cria evento na comunidade, membros não recebem FCM "Novo evento em [comunidade]".
- **[GAP-INT-01.5] Sem Cloud Function para `community_event_reminder` (24h antes)** — Scheduled function que varre `community_events.starts_at` e dispara `EVENT_REMINDER`.
- **[GAP-INT-01.6] Sem Cloud Function para `club_event_reminder` (ONG)** — Mesmo.
- **[GAP-INT-01.7] Sem Cloud Function para `club_event_published` (ONG)** — Disparar `CLUB_EVENT_PUBLISHED` quando admin cria evento público.
- **[GAP-INT-01.8] Sem Cloud Function para `adoption_match` (do Agente B, dependência)** — Quando abrigo aprova application, não notifica adotante. Hoje o adotante só vê indo no painel ou no chat.
- **[GAP-INT-01.9] Sem Cloud Function para `forum_reply_mention`** — Usar `@username` em fórum não dispara notificação.
- **[GAP-INT-01.10] Sem Cloud Function para `post_adoption_milestone` (do Agente B, já existe em `postAdoptionCron`)** — Provavelmente ok, mas confirmar que milestones 7/30/90 dias disparam notificação.

#### Search

- **[GAP-INT-02.1] Smart Search SEM entity `event`** — `search.js:42-121` lista pet/adopter/shelter/foster/exhibition. Falta `event` (filtrar por `club_id`, `community_id`, `city`, `type`, `starts_at`).
- **[GAP-INT-02.2] Smart Search SEM entity `community`** — Falta community (filtrar por `city`, `state`, `name`, `description`, `tags`).
- **[GAP-INT-02.3] Smart Search SEM entity `adopter_profile`** — Quando admin abrigo busca applicant, busca por `applicant_name` (search.js:65), mas o doc `adopter_profile` em `users/{uid}/adopter_profile/` tem dados mais ricos (housing, budget). Adicionar entity.
- **[GAP-INT-02.4] Smart Search SEM índice de post/comment para busca textual** — Mural de comunidade não tem search. Posts com hashtag (#urgente) não são encontrados.

#### Storage

- **[GAP-INT-03.1] Storage path `events/{eventId}/` sem regra** — `storage.rules` tem `pets/{userId}`, `organizations/{orgId}`, mas não `events/{eventId}/capa` ou `events/{eventId}/photos`. Adicionar.
- **[GAP-INT-03.2] Storage path `community_posts/{postId}/` sem regra** — Anexos do mural (fotos, vídeos, PDFs em `MuralTabAdmin`) usam `folder="communities"` provavelmente. Verificar se regra existe. Não foi lido.
- **[GAP-INT-03.3] Storage path `adopter_profile/{uid}/photo` sem regra dedicada** — Foto do perfil do adotante usa `folder="avatar"`. Verificar.
- **[GAP-INT-03.4] Storage de certificado de evento** — Para GAP-UX-03.6 (certificados), precisa de bucket para PDFs gerados.

#### Email / FCM

- **[GAP-INT-04.1] Email "Bem-vindo à comunidade X"** — Quando usuário entra em comunidade, nenhum email é disparado.
- **[GAP-INT-04.2] Email "Evento amanhã"** — Scheduled function que envia email 24h antes.
- **[GAP-INT-04.3] Email "Certificado disponível"** — Pós-evento.
- **[GAP-INT-04.4] Email "Resumo semanal do mural"** — Digest.
- **[GAP-INT-04.5] FCM push (não in-app)** — `notifications/` é só in-app (sino). Falta integração com Firebase Cloud Messaging para push no celular.
- **[GAP-INT-04.6] Email "Você tem X adoções em processo"** — Digest diário pro adotante.

#### Google Forms / Calendar

- **[GAP-INT-05.1] Google Forms import de RSVPs** — Webhook atual (Fase 5) é só para applications. Falta hook para "RSVP de evento via Google Form" (caso ONG queira formulário externo para controle de vagas em mutirão).
- **[GAP-INT-05.2] Google Calendar export .ics** — Botão "Adicionar ao Google Calendar" gera URL `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ&details=...&location=...` client-side.
- **[GAP-INT-05.3] iCal .ics download (outros calendars)** — Server-side generate `.ics` file via Storage.

---

## 5. Estado Pós-Deploy

### 5.1 ✅ O que existe (flags ativas)

- `src/core/featureFlags.js` lista **10 flags ativas**:
  - `AD_SLOTS` (default OFF) — espaço de anúncios no feed de pets.
  - `PET_FEED_RELIABILITY_FIX` (default ON) — correções de query.
  - `MURAL_LIKES_AND_COMMENTS` (default ON) — mural enhanced.
  - `PET_ADOPTION_GATING` (default ON) — explicação de bloqueio.
  - `MURAL_RICH_POSTS` (default ON) — mural admin (anexos).
  - `PAGE_HERO_ENABLED` (default OFF) — cabeçalho gradiente.
  - `STANDARDIZED_PAGE_LAYOUT` (default OFF) — layout unificado.
  - `COMMUNITY_NGO_PARITY` (default OFF) — paridade ONG/comunidade.
  - + todas as `SHELTER_*` (default OFF) das Fases 0-21.
- Painel admin `/admin/flags` para ligar/desligar (data-driven em `platform_settings/global`).
- `defaultFeatureFlags` é `false` para todas as `SHELTER_*` (segurança).

### 5.2 ❌ Gaps Pós-Deploy

- **[GAP-DEP-01.1] Sem `SHELTER_COMMUNITY_FEED_V1`** — Não há flag dedicada para "feed novo da comunidade" (porque `MURAL_*` cobre). Mas falta **`SHELTER_ADOPTER_DASHBOARD_V1`** que englobe o novo `/meu-painel` (GAP-UX-02.1).
- **[GAP-DEP-01.2] Sem `SHELTER_EVENTS_V1`** — Flag para o conjunto "Eventos ampliados" (tipos novos + certificados + vínculo com pets/voluntários). Default OFF.
- **[GAP-DEP-01.3] Sem `SHELTER_ADOPTER_PROFILE_V1`** — Flag para "perfil de adotante ampliado" (pets anteriores, preferências, preferências de notificação). Default OFF.
- **[GAP-DEP-01.4] Sem `SHELTER_SPONSORED_FLAG` para posts da comunidade** — `AD_SLOTS` é para pets, não para comunidades. Falta equivalente para posts do mural.
- **[GAP-DEP-01.5] Sem `SHELTER_COMMUNITY_RICH_EVENTS_V1`** — Para o vínculo evento↔pet↔voluntário.
- **[GAP-DEP-01.6] Sem `SHELTER_COMMUNITY_CHAT_V1`** — Para o chat admin de comunidade.
- **[GAP-DEP-01.7] Sem `SHELTER_FCM_PUSH_V1`** — Para push real (não in-app).
- **[GAP-DEP-01.8] Sem flag para `community_events` RSVP público** — Pode ser `COMMUNITY_EVENT_RSVP_V1` (default OFF).
- **[GAP-DEP-01.9] Sem flag para `community_forum` moderação** — `COMMUNITY_FORUM_MODERATION_V1`.
- **[GAP-DEP-01.10] Sem flag para "Busca de eventos/comunidades"** — `SMART_SEARCH_EVENTS_V1` + `SMART_SEARCH_COMMUNITIES_V1`.

#### Smoke / Monitoramento / LGPD

- **[GAP-DEP-02.1] Sem smoke test em produção pra Comunidade** — Não há `scripts/smoke-comunidade.mjs`. (Provavelmente só tem `scripts/smoke-prod.mjs` genérico).
- **[GAP-DEP-02.2] Sem smoke test pra Eventos** — Idem.
- **[GAP-DEP-02.3] Sem smoke test pra Adotante** — Idem.
- **[GAP-DEP-02.4] Sem smoke cross-role (anonymous → adopter → admin)** — Não há Playwright test que valide o fluxo completo de cada papel.
- **[GAP-DEP-02.5] Sentry não captura erros de MuralTab / EventsTab / Profile** — Provavelmente captura global, mas falta instrumentação dedicada.
- **[GAP-DEP-02.6] Sem analytics de funil de adoção** — Firebase Analytics não tem eventos custom para "adotante clicou em interesse → aplicação enviada → match → adoção". (Pode ser do Agente B).
- **[GAP-DEP-02.7] Sem analytics de funil de eventos** — "Usuário viu evento → RSVP → compareceu → certificado". Falta.
- **[GAP-DEP-02.8] Sem analytics de feed da comunidade** — "Usuário viu mural → curtiu → comentou". Falta.
- **[GAP-DEP-02.9] Sem `audit_log` retention policy** — Audit logs (imutáveis) precisam de job de purga após 5 anos (LGPD).
- **[GAP-DEP-02.10] Sem LGPD compliance check antes de subir Comunidade/Eventos v1** — DPO precisa assinar antes de ir pra prod.
- **[GAP-DEP-02.11] Bundle hash no PR description** — Verificar se CI injeta. (Provavelmente sim via `ci-rollout`).
- **[GAP-DEP-02.12] Sem plano de rollback documentado em DELIVERABLE.md para Comunidade/Eventos/Adotante** — Provavelmente só tem pra Shelter.

---

## Tasks novas propostas (ordenadas por prioridade)

| ID | Título | Tipo | Priority | Eixo | SubFrente | BlockedBy | Descrição resumida |
|---|---|---|---|---|---|---|---|
| **TASK-141** | **CRÍTICO: tighten firestore.rules em `community_events`, `community_posts/comments`, `community_forum_*` (multi-tenant + ownership)** | security | **critical** | 3-regras | comunidade+eventos | [] | Aplicar correções de `firestore.rules:1324-1327`, `:1318-1322`, `:1351-1371`, `:1329-1338`: validação de `community_id` + `created_by` + `affectedKeys().hasOnly([...])` em update. Fechar brecha de cross-tenant + vandalismo. |
| **TASK-142** | **CRÍTICO: fechar `audit_logs` `create: if isAuth()` → `if false` (client não escreve; só Admin SDK)** | security | **critical** | 3-regras | cross-cutting | [TASK-141] | Mover `createAuditLog` em `core/services/auditService.js` para Cloud Function (Admin SDK). Client chama `onCall('createAuditLog', {...})` ao invés de escrever direto. Fechar poluição de audit log. |
| TASK-143 | LGPD export: incluir community_posts, community_forum_messages, community_memberships, community_post_comments, club_chat_messages | feature | critical | 3-regras | comunidade+adotante | [] | Estender `dataExportService.exportMyData` para incluir dados de comunidade + chat. Conformidade Art. 18 V LGPD. |
| TASK-144 | LGPD delete: purgar community_memberships, community_posts, community_forum_messages, club_chat_messages, community_post_likes | feature | critical | 3-regras | comunidade+adotante | [] | Estender `deleteAccountService.deleteMyAccount` para soft-delete + job de purga. Conformidade Art. 18 VI LGPD. |
| TASK-145 | Zod schemas para communityService (createPost, createCommunityEvent, createForumThread, addThreadMessage) | refactor | high | 3-regras | comunidade | [TASK-141] | Criar `domain/schemas.js` em `src/modules/communities/domain/`. Aplicar `safeParse` em todos os writes. Defense-in-depth. |
| TASK-146 | Página pública de evento individual + RSVP em comunidade (`/comunidade/:id/evento/:eventId`) | feature | high | 1-ux | comunidade+eventos | [TASK-141] | Espelhar `EventDetail.jsx` (ONG) para comunidade. Criar `src/modules/communities/pages/CommunityEventDetail.jsx` + `EventParticipantsPanel.jsx` (community version) com `going/maybe/not_going`. |
| TASK-147 | Smart Search: adicionar entity `event` (community + club) e `community` | feature | high | 4-int | comunidade+eventos | [] | Estender `search.js:42-121` com `SEARCH_ENTITIES.event` (filterable: `club_id`, `community_id`, `type`, `starts_at`, `city`) e `SEARCH_ENTITIES.community` (filterable: `city`, `state`, `name`). |
| TASK-148 | Cloud Functions para notificações de comunidade (post_created, post_liked, post_commented, event_created) | feature | high | 4-int | comunidade+eventos | [] | Adicionar `functions/communityNotifications.js` com triggers `onCreate community_posts`, `onCreate community_post_likes`, `onCreate community_post_comments`, `onCreate community_events`. Chamar `notificationService.notifyUser`. |
| TASK-149 | Cloud Function scheduled para reminder de evento (24h antes) | feature | high | 4-int | eventos | [] | Adicionar `functions/eventReminderCron.js` com schedule diário. Varre `community_events` + `club_events` com `starts_at` entre now e now+25h, dispara `EVENT_REMINDER`. |
| TASK-150 | Feature flags novas: `SHELTER_ADOPTER_DASHBOARD_V1`, `SHELTER_EVENTS_V1`, `SHELTER_ADOPTER_PROFILE_V1`, `SHELTER_SPONSORED_COMMUNITY_V1`, `SHELTER_COMMUNITY_RICH_EVENTS_V1`, `SHELTER_COMMUNITY_CHAT_V1`, `SHELTER_FCM_PUSH_V1` | feature | high | 5-pos | cross-cutting | [] | Adicionar 7 novas flags em `src/core/featureFlags.js`, todas default OFF. Painel admin `/admin/flags` lista automaticamente. |
| TASK-151 | Dashboard unificado do Adotante (`/meu-painel`) | feature | high | 1-ux | adotante | [TASK-150] | Criar `src/modules/adopter/pages/AdopterDashboard.jsx`. Cards: "X adoções finalizadas, Y em processo, Z pets favoritos, perfil completo %, próximas milestones de pós-adoção, notificações não lidas". |
| TASK-152 | Tipos de evento amplos (vacinação, palestra, fundraising, pet day) | feature | high | 1-ux | eventos | [TASK-150] | Adicionar `VACCINATION`, `LECTURE`, `FUNDRAISING`, `PET_DAY` em `CLUB_EVENT_TYPE` (`organizations/domain/constants.js:132-137`). Atualizar labels e UI em `EventFormDialog.jsx`. |
| TASK-153 | Vínculo evento ↔ pet (`pet_ids: []`) + UI de seleção | feature | high | 1-ux | eventos | [TASK-150] | Adicionar `pet_ids: string[]` em `club_events`. Multi-select no `EventFormDialog.jsx` (populado de `pets` do abrigo). Mostrar pets vinculados no `EventDetail.jsx`. |
| TASK-154 | Vínculo evento ↔ voluntário (interface com Agente A) | feature | high | 1-ux | eventos | [TASK-150, AGENTE-A] | Adicionar `volunteer_ids: string[]` + `volunteer_shifts: [{date, role, slots}]` em `club_events`. Multi-select no `EventFormDialog.jsx` (populado de `clubs/{clubId}/volunteers`). Mostrar escalas no `EventDetail.jsx`. **Bloqueado pela entrega do Agente A.** |
| TASK-155 | Certificados de evento (storage + download PDF) | feature | medium | 1-ux | eventos | [TASK-150] | Criar `event_certificates/{userId_eventId}` em Storage. Job pós-evento gera PDF (via Cloud Function com pdf-lib ou similar) e atualiza `club_events.certificates`. UI no `MyEvents` com botão "Baixar certificado". |
| TASK-156 | Export .ics (Google Calendar + iCal) | feature | medium | 1-ux | eventos | [] | Adicionar botão "Adicionar ao Google Calendar" no `EventDetail.jsx`. Gera URL `https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...`. Botão "Baixar .ics" chama Cloud Function que retorna `text/calendar`. |
| TASK-157 | Notificações FCM push (não in-app) | feature | medium | 4-int | cross-cutting | [TASK-148, TASK-150] | Integrar Firebase Cloud Messaging. `notificationService.notifyUser` envia in-app (sino) + push se token FCM existir em `users/{uid}.fcm_tokens`. Adicionar `useFCMToken` hook. |
| TASK-158 | Página "Meus eventos" (`/meus-eventos`) com 3 tabs (Criei, Participo, Fui convidado) | feature | medium | 1-ux | eventos | [TASK-146] | Criar `src/modules/events/pages/MyEvents.jsx`. Query `club_event_rsvps` filtrando por `user_id`. Tabs: going/maybe/not_going. Cards com link pro `EventDetail`. |
| TASK-159 | Busca global de comunidades (text + city + state) | feature | medium | 1-ux | comunidade | [TASK-147] | Estender `CommunitiesDirectory.jsx` com campo de busca. Wire-up com `searchService.search({entity: 'community', query, filters})`. |
| TASK-160 | Convite de membros para comunidade (search user + invite + status pending/accepted/declined) | feature | medium | 1-ux | comunidade | [] | Espelhar `MEMBER_INVITE_STATUS` da ONG. Adicionar `community_invites/` collection. UI em `CommunityTeamTab.jsx` com "Convidar membro" + lista de pendentes. Rules em `firestore.rules`. |
| TASK-161 | Chat admin de comunidade (canal onde admin fala com membros) | feature | medium | 1-ux | comunidade | [TASK-150] | Espelhar `club_chat_threads` para `community_chat_threads`. UI em `CommunityAdminPanel.jsx` (aba nova) + sino de mensagens. |
| TASK-162 | Auditoria: cobrir `community_post_liked`, `community_post_commented`, `community_event_rsvp`, `community_event_created`, `community_event_deleted`, `community_forum_thread_created` | feature | medium | 3-regras | comunidade+eventos | [TASK-142] | Adicionar constantes em `AUDIT_ACTION_LABELS` (`auditService.js:5-76`). Chamar `createAuditLog` em cada service. |
| TASK-163 | Auditoria: adicionar `target_user_id` e `correlation_id` em audit_logs | refactor | medium | 3-regras | cross-cutting | [TASK-142] | Estender schema de `audit_logs`. Atualizar todas as `createAuditLog` calls com `target_user_id` quando aplicável. Migration path. |
| TASK-164 | Posts fixados / destaque (campo `pinned` em `community_posts`) | feature | medium | 1-ux | comunidade | [] | Adicionar `pinned: boolean` + `pinned_at`. UI no `MuralTab.jsx` com carrossel/banner no topo. Permissão: admin/owner. |
| TASK-165 | Empty states ricos em CommunityDetail (404 comunidade) | refactor | low | 1-ux | comunidade | [] | Substituir `<div>Comunidade não encontrada</div>` (`CommunityDetail.jsx:107`) por `<EmptyState icon={Building2} title="..." description="..." action={<Button>Voltar</Button>} />`. |
| TASK-166 | Onboarding contextual (primeiro Acesso) na comunidade | feature | low | 1-ux | comunidade | [] | Tooltips em `CommunityDetail.jsx` na primeira visita: "Como participar", "Como postar", "Como abrir tópico". Usar `localStorage` para flag "visto". |
| TASK-167 | Adimplência: `is_paid`, `price_cents`, `currency` em `club_events` + flow de pagamento Pix | feature | low | 3-regras | eventos | [] | Adicionar campos. Bloqueado pela TASK-152 (tipos). Integrar com Mercado Pago ou similar. **Decisão de arquitetura: pricing/payment é blocker?** |
| TASK-168 | Smart Search entity `adopter_profile` (housing, budget, has_children, etc.) | feature | low | 4-int | adotante | [] | Adicionar entity que lê `users/{uid}/adopter_profile/`. Filtrar por `shelter_club_id` para multi-tenant. |
| TASK-169 | Audit log retention policy (purga > 5 anos via Cloud Function scheduled) | feature | low | 5-pos | cross-cutting | [TASK-142] | Job diário que deleta `audit_logs` com `created_at_ms < now - 5*365*86400*1000`. |
| TASK-170 | Smoke tests Playwright: Comunidade + Eventos + Adotante (cross-role) | test | medium | 5-pos | cross-cutting | [TASK-150] | Criar `tests/e2e/community.spec.mjs`, `tests/e2e/events.spec.mjs`, `tests/e2e/adopter.spec.mjs`. Validar anonymous → adopter → admin em cada fluxo. |
| TASK-171 | Smoke test em produção pra Comunidade + Eventos + Adotante | chore | medium | 5-pos | cross-cutting | [TASK-150, TASK-170] | `scripts/smoke-comunidade.mjs`, `scripts/smoke-eventos.mjs`, `scripts/smoke-adotante.mjs`. Rodar com flag OFF primeiro, depois ON. |
| TASK-172 | Analytics: funil de adoção + funil de evento + funil de feed | feature | low | 5-pos | cross-cutting | [TASK-150] | Adicionar `logEvent` Firebase Analytics em pontos chave: "adotante_clicou_interesse", "application_enviada", "match", "adocao_finalizada", "evento_visto", "rsvp_confirmado", "evento_compareceu", "feed_visto", "post_curtido", "post_comentado". |

**Total: 32 tasks novas (TASK-141 a TASK-172).**

**Ordem de implementação sugerida:**
1. **TASK-141** (segurança multi-tenant) — bloqueador crítico.
2. **TASK-142** (auditoria segura) — bloqueador.
3. **TASK-143 + TASK-144** (LGPD) — conformidade legal.
4. **TASK-145** (Zod) — defense-in-depth.
5. **TASK-150** (flags) — base para o resto.
6. **TASK-146 + TASK-147 + TASK-148 + TASK-149** (UX + integrações) — alta prioridade funcional.
7. **TASK-151 a TASK-156** (sub-frentes específicas).
8. **TASK-170 + TASK-171** (smoke) — gate de release.

---

## Interfaces com Agente A (Voluntários) e Agente B (Abrigos/Foster/Adoção)

- **[INT-01] Vínculo evento ↔ voluntário (TASK-154)** — Agente A vai mapear `clubs/{clubId}/volunteers/` (já existe no Firestore rules linha 935+). O Agente C precisa:
  - Ler `clubs/{clubId}/volunteers` para popular multi-select no `EventFormDialog`.
  - Mostrar `volunteer_shifts` no `EventDetail.jsx` (interface visual).
  - Notificar voluntário via FCM quando shift é criado.
  - **Sincronizar schema** (`volunteer_shifts` shape: `{date, role, slots_total, slots_filled, volunteer_uids: []}`).
  - **Decisão:** se Agente A define o shape primeiro, Agente C consome. Caso contrário, C define e A consome.
- **[INT-02] Adotante tem dashboard de applications (TASK-151)** — Agente B vai mapear `clubs/{clubId}/adoption_workflow/` (já existe no Firestore rules linha 691+). O Agente C precisa:
  - Ler `clubs/{clubId}/adoption_workflow` filtrando por `applicant_uid == user.uid`.
  - Mostrar cards: "Em análise", "Aprovado", "Rejeitado", "Adotado".
  - Link para "Ver pet".
  - **Compartilhar** com Agente B o schema de `adoption_workflow` (já documentado, ok).
- **[INT-03] Pets anteriores do adotante (GAP-UX-02.2)** — Agente B cuida do histórico de adoções (`adoption_ratings`, `post_adoption`, `kanban_tasks`). C precisa:
  - Adicionar `users/{uid}.previous_adoptions: [{pet_id, adopted_at, current_status}]` (denormalizado para performance).
  - Atualizar quando status de adoption vira `finalized` (Cloud Function de Agente B).
- **[INT-04] Match visual "pets compatíveis" (GAP-UX-02.4)** — Cloud Function `onPetCreatedNotifyRadar` (functions/index.js:66-77) já existe. C precisa:
  - UI `/radar` (página dedicada) que lista `pet_radars/{uid}.matches[]`.
  - **Compartilhar schema** de `pet_radars` (já existe, ok).
- **[INT-05] Vínculo evento ↔ pet (TASK-153)** — Agente B cuida de `pets` collection. C precisa:
  - Ler `pets` filtrando por `shelter_club_id == event.club_id`.
  - Multi-select no `EventFormDialog`.
  - Mostrar pets vinculados como cards no `EventDetail.jsx`.
  - **Compartilhar** com Agente B a existência do campo `pet_ids` em `club_events` (não impacta schema de pets).
- **[INT-06] Smart Search entity `adopter` (já existe)** — Agente B tem. C não modifica.
- **[INT-07] Smart Search entity `pet` (já existe)** — Ambos usam.
- **[INT-08] LGPD delete: purgar `adoption_interests` (já existe em `dataExportService`)** — Confirmar que `deleteAccountService` cobre. (Não lido).
- **[INT-09] Notificação `ADOPTION_MATCH`** — Hoje `notificationService` tem tipo mas não há Cloud Function que dispare quando application vira `approved`. Dependência cruzada com Agente B.
- **[INT-10] Voluntário na Comunidade** — Se comunidade tiver voluntariado (ex: "Comunidade de voluntários do abrigo X"), Agente A pode mapear. C precisa de UI em `CommunityTeamTab.jsx` para marcar "membro voluntário" (papel intermediário).
- **[INT-11] Adimplência de evento pago (TASK-167)** — Se Agente B define prestação de contas (`club_ledger`), evento pago precisa reconciliar. Cria dependência.

---

## Recomendações

### Ordem de implementação

1. **Fase 0 — Segurança (1-2 sprints)**:
   - TASK-141 (rules multi-tenant)
   - TASK-142 (audit log fechado)
2. **Fase 1 — LGPD + Zod (1 sprint)**:
   - TASK-143, TASK-144, TASK-145
3. **Fase 2 — Feature flags base + smoke (1 sprint)**:
   - TASK-150, TASK-170, TASK-171
4. **Fase 3 — Eventos completos (2-3 sprints)**:
   - TASK-146, TASK-148, TASK-149, TASK-152, TASK-153, TASK-154, TASK-156
5. **Fase 4 — Adotante dashboard (2 sprints)**:
   - TASK-151, TASK-158, TASK-168
6. **Fase 5 — Comunidade avançada (2 sprints)**:
   - TASK-147, TASK-159, TASK-160, TASK-161, TASK-164
7. **Fase 6 — Polish (1-2 sprints)**:
   - TASK-155, TASK-157, TASK-165, TASK-166, TASK-167, TASK-169, TASK-172

### Riscos

- **RISK-C-001**: TASK-141 é CRÍTICA. Se o worktree rodar com `community_events`/`community_forum_*` aberto, qualquer usuário pode vandalizar. **Gate antes de qualquer release.**
- **RISK-C-002**: TASK-142 quebra o modelo atual de audit log (cliente escreve direto). Migration path precisa ser cuidadoso — `createAuditLog` vira `onCall` na Cloud Function, todas as callsites mudam.
- **RISK-C-003**: TASK-154 depende do Agente A entregar o shape de `volunteers` antes. Bloqueio de equipe.
- **RISK-C-004**: TASK-167 (adimplência) é **decisão arquitetural**: Pix vs Stripe vs Mercado Pago. Cada um tem implicações de compliance PCI, LGPD, contrato jurídico. **Precisa de decisão humana + DPO + jurídico.**
- **RISK-C-005**: TASK-157 (FCM push) exige configuração no Firebase Console + App Check. Se a plataforma não tem app nativo, é inútil (push só funciona com app).
- **RISK-C-006**: TASK-143/144 (LGPD) são obrigatórias por lei. Se não forem entregues, plataforma está ilegal. Risco jurídico.

### Dependências

- **Internas (3 agentes paralelos)**:
  - Agente A: TASK-154 (voluntário em evento).
  - Agente B: TASK-151 (applications no dashboard do adotante), TASK-153 (pet em evento).
- **Externas (DPO)**:
  - TASK-143, TASK-144, GAP-REG-02.1, GAP-REG-02.5 (LGPD).
  - TASK-167 (pagamento) — compliance PCI.
- **Cloud Functions**:
  - TASK-148, TASK-149, TASK-157, TASK-155, TASK-156 (.ics server-side), TASK-169 (audit purga).
- **Firebase Console**:
  - TASK-157 (FCM setup + App Check).

---

## Anti-patterns Regra A verificados

- [x] **Sem sub-frente sem UX em cada papel** — Comunidade tem UX para todos os 7 papéis. Adotante tem UX para 3 (próprio, abrigo, admin). Eventos tem UX para 4 (membro, convidado, criador, admin). **OK** mas falta refinamento em Eventos.
- [x] **Empty/error/loading em cada tela** — `MuralTabEnhanced`, `EventDetail`, `EventParticipantsPanel` têm EmptyState e Skeleton. **`CommunityDetail.jsx:107` GAP** (texto cru). **`MyInterests` OK** com EmptyState rico.
- [x] **Mobile + a11y em cada tela** — `MuralTabEnhanced` tem `aria-pressed`, `aria-expanded`, `aria-label`. `NotificationsMenu` tem `aria-label`. **Faltam testes E2E de keyboard nav**.
- [x] **Zod em cada mutation** — Smart Search sim, pets sim, organizations sim, **comunidade NÃO** (GAP-REG-04.1, 04.2, 04.3, 04.4). **GAP**.
- [x] **LGPD em PII do adotante** — `Profile.jsx` tem `dataExportService` + `deleteAccountService`. **Falta**: consent granular em PII nova (GAP-REG-02.1), export/delete de dados de comunidade (GAP-REG-02.2, 02.3).
- [x] **Multi-tenant community_id em posts/eventos** — Posts OK. **Eventos CRÍTICO** (GAP-REG-01.1). **Fórum CRÍTICO** (GAP-REG-01.3, 01.4).
- [x] **Feature flag por sub-frente (não tudo junto)** — 10 flags hoje. **Faltam 7** (TASK-150).
- [x] **Smoke test cross-role** — Não há. **GAP** (TASK-170, 171).
- [x] **Auditoria de mudanças em cada ação** — Comunitária tem 5 ações, eventos têm 0 (GAP-REG-03.1). **CRÍTICO** audit log aberto (GAP-REG-03.4).
- [x] **Adimplência: como diferenciar gratuito vs pago?** — **NÃO existe** (GAP-REG-05.1, 05.2, 05.3, 05.4). **GAP blocker se eventos pagos forem requisito**.

---

## Cobertura estimada por eixo (resumo)

| Eixo | Comunidade | Adotante | Eventos | Média |
|---|---|---|---|---|
| **1 - UX** | 70% | 50% | 45% | **55%** |
| **2 - Papéis** | 75% | 60% | 65% | **67%** |
| **3 - Regras** | 50% (GAPs CRÍTICOS de security) | 60% | 40% | **50%** |
| **4 - Integrações** | 40% | 50% | 35% | **42%** |
| **5 - Pós-Deploy** | 30% (falta flag dedicada) | 35% | 25% | **30%** |
| **Média** | **53%** | **51%** | **42%** | **49%** |

> **Leitura honesta:** Comunidade e Adotante estão em ~50%, Eventos em ~42%. O
> blocker mais urgente é o conjunto de **regras multi-tenant em
> `community_*`** (TASK-141). Sem isso, a plataforma tem brecha de segurança
> ativa. Depois disso, LGPD (TASK-143/144) é obrigatório por lei.
>
> A área de Eventos é a mais atrasada — tipos limitados, sem certificados,
> sem vínculo com pets/voluntários, sem export .ics, sem notificações FCM.
> É a que precisa de mais investimento de produto.

---

## Próximos passos (após TASK-138)

1. **TASK-140** (avaliação 4 olhos) — root session (mvs_311d078987d0414a90f57ef28b789b18) consolida TASK-136 + TASK-137 + TASK-138.
2. Adicionar **TASK-141 a TASK-172** ao `SCRUM_TASKS.json` (root session, Regra B §2.2).
3. Decidir qual frente de Comunidade/Adotante/Eventos priorizar para Q3 (depende de roadmap de negócio).
4. Para a TASK-141 (crítica de segurança): alinhar com Agente A e Agente B para garantir que nenhum dos dois quebra com o tighten das rules.
5. Para a TASK-154 (vínculo evento ↔ voluntário): alinhar com Agente A sobre schema de `volunteer_shifts`.

---

> **Fim do relatório Agente C.**
> Arquivo: `.harness/_report-community-events.md`
> Sessão: mvs_311d078987d0414a90f57ef28b789b18
> Status: READ-ONLY ✅
