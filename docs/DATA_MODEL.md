# DATA_MODEL

> Coleções do Firestore **nomeado `viralata`** (não é o banco `(default)` —
> ver `firebase.json`/`src/core/config/firebase.js`), campos-chave e
> relacionamentos. Sem joins: desnormalização e ids deterministas. Campos
> comuns: `created_at`/`created_at_ms`, `updated_at` (`serverTimestamp`).

## Convenções

- **Id determinista** (`clubId_uid`, `petId_userId`, `eventId_userId`): evita
  duplicidade e simplifica regras (1 doc por par recurso+usuário).
- **Desnormalização**: nomes/e-mails/fotos do ator são copiados no doc para
  evitar leitura cruzada.
- **Auditoria**: mutações relevantes gravam `audit_logs`.
- Toda escrita é validada por `firestore.rules` (lógica roda no client; **sem
  Cloud Functions**). Ao adicionar uma coleção nova, adicione a regra
  correspondente — sem rule, o Firestore nega leitura/escrita por padrão.

## Identidade

### `users/{uid}`
Perfil privado/operacional. `email`, `platform_name`, `full_name`, `phone`,
`photo_url`, `city`, `state`, `profile_completed` (gate de onboarding),
`housing_type`, `has_yard`, `daily_walks`, `has_children`, `children_ages`,
`has_elderly`, `other_pets[]`, `budget_level`, `phone_public`, `email_public`,
`lgpd_consent_at` (consentimento do onboarding), `role`
(`platform_admin | user`), `banned`, `banned_at`, `banned_reason` (só
alteráveis por `platform_admin`, ver `firestore.rules`). Escrito por
`FirebaseAuthContext`/`OnboardingQuestionnaire`; `banned*` por
`adminService.banUser`/`unbanUser`.

> Não existe diretório público de perfis (a coleção `athlete_profiles`, do
> fork anterior, foi removida junto com o módulo de atletas — ver
> `docs/ROADMAP.md` Fase 2). Nome/foto do usuário aparecem publicamente de
> forma pontual e desnormalizada (anúncios de pets, avaliações, membros de
> organização), não como um perfil público agregado.

## Pets e adoção

### `pets/{id}`
`title`, `species` (`dog|cat|rabbit|bird|other`), `size`
(`small|medium|large|giant`), `age_group`, `city`, `state`, `owner_id` (uid
ou id de organização), `owner_type` (`user | organization`), `status`
(`available → in_process → adopted`), `adopted_by`, `adopted_at`,
`priority_score` (0–3, calculado por idade do anúncio: 90/180/365 dias).
Flags de matching: `needs_yard`, `needs_screened_apt`, `good_with_kids`,
`good_with_dogs`, `good_with_cats`, `health_notes`. Feed filtra
`status == 'available'`, ordena por `priority_score desc, created_at asc`.
`status = 'in_process'` é setado quando o doador aprova um interessado
(`updateInterestStatus`); ao concluir a adoção (`completePetAdoption`), os
demais `adoption_interests` pendentes daquele pet são notificados como
`adoption_rejected`.

### `adoption_interests/{petId_userId}`
`pet_id`, `user_id`, `user_name`, `user_photo`, `status`
(`pending → approved/rejected`). Gera notificações
`adoption_interest`/`adoption_match`/`adoption_rejected`.

### `adoption_ratings/{petId_raterUid}`
Avaliação pós-adoção, mútua entre doador e adotante. `pet_id`, `rated_uid`,
`rater_uid`, `stars` (1–5), `comment`, `created_at`. Leitura pública
(reputação); criação só pelo próprio `rater_uid`, nunca autoavaliação
(`rated_uid != rater_uid`). Sem contador denormalizado — a média
(`ratingService.summarizeRatings`) é calculada no client a partir de
`getRatingsForUser`.

### `pet_radars/{uid}`
"Radar de Pets": alerta quando um pet compatível com o perfil do usuário é
cadastrado. `user_id`, `active` (liga/desliga em `RadarSettings`). Os
critérios de compatibilidade são os mesmos campos do perfil em
`users/{uid}` — não há duplicação de critérios aqui. Só leitura/escrita pelo
dono (regra) **e** pela Cloud Function via `firebase-admin` (ignora
`firestore.rules`) — ver `docs/AI_CONTEXT.md` seção 8.

## Comunidade — clubes (rota `/organizacoes`)

> Feature em produção; serviços `clubService.js` (CRUD, membros, eventos,
> mural) e `forumService.js` (tópicos/comentários/enquetes). Nomes de arquivo
> ainda usam "Club" (herança do fork), mas a UI chama isso de "Organizações".

### `clubs/{id}`
`name`, `description`, `city`, `state`, `logo_url`, `invite_code`, `cnpj`
(opcional, ONG formalizada), `donation_link` (opcional, Pix/vaquinha —
renderizado como QR code em `ClubDetail`), `member_count` (cosmético, nunca
fonte de verdade), `created_by`, `creator_name`.

### `club_members/{clubId_uid}`
`club_id`, `user_id`, `user_name`, `user_email`, `photo_url`, `role`
(`admin | member`), `permissions` (opcional: `{ edit_pets, view_reports,
manage_team, reply_chat }` — concede a um `member` uma permissão pontual sem
promovê-lo a `admin`; admins já têm tudo implicitamente), `joined_at`.
Fonte de verdade de "quem é membro/admin" (usada pelas regras via
`isClubMember`/`isClubAdmin`/`canEditClubPets`/`canManageClubTeam`/
`canReplyClubChat`). Só um `platform_admin` ou um `admin` do próprio clube
altera `role`/`permissions` — escalação de privilégio não é delegável via
`manage_team`.

### `club_join_requests/{clubId_uid}`
Pedido de ingresso ("Pedir para ingressar"). `status`
(`pending | approved | rejected`). Aprovação cria `club_members` e notifica.

### `club_member_invites/{clubId_uid}`
Convite enviado por admin. `status` (`pending | accepted | declined`);
aceitar cria `club_members` e notifica o convidante.

### `club_events/{id}`
`club_id`, `title`, `description`, `type`, `location`, `starts_at`,
`recurring`, `visibility` (`public | private`), `created_by`. Subcoleções:
- `dates/{id}` — datas do evento (`date_time`, `location`, `note`).
- `date_rsvps/{dateId_uid}` — resposta por data.
- `messages/{id}` — chat cronológico do evento (`sender_id`, `text`).
- `participants/{id}` — participantes confirmados do evento.

### `club_event_rsvps/{eventId_uid}`
Presença em evento (coleção de nível superior, legado/paralelo às
`date_rsvps`).

### `event_invites/{eventId_uid}`
Convite/participação em evento — pode incluir usuários fora do clube
(`source: 'club' | 'platform'`), `status`
(`invited | going | maybe | declined`).

### `club_posts/{id}`
Mural do clube. `club_id`, `author_id`, `author_name`, `content`, `images[]`.

### `club_forum_threads/{id}`
`club_id`, `title`, `body`, `author_id`, `pinned`, `comment_count`
(cosmético), `participant_ids[]`, `poll` (opcional). Subcoleções:
- `comments/{id}` — `club_id`, `author_id`, `body`, `attachments[]`.
- `poll_votes/{uid}` — 1 doc por usuário (id = uid), `option_ids[]`.

> `organizations`/`organization_members`/`organization_reports`
> (`organizationService.js`) existem no código e em `firestore.rules` com um
> modelo parecido (ONGs, `org_id`/`user_id`/`role`), mas **confirmado sem
> nenhum import de rota/UI** — código órfão de uma tentativa anterior,
> substituído pelas coleções `club_*` acima. Não estender; candidato a
> remoção numa limpeza futura.

## Chat

### `conversations/{id}`
`type` (`direct | group`), `title`, `member_ids[]` (para `array-contains` e
regra `request.auth.uid in member_ids`), `members[]`, `hidden_for[]` (soft
delete por usuário), `pet_id`/`pet_title` (contexto de adoção opcional),
`last_message` (`{text, sender_id, sender_name, at_ms}`).

### `conversations/{id}/messages/{id}`
`sender_id`, `sender_name`, `text`, `attachments[]`, `edited`. **Atenção**:
o campo é `sender_id` (não `sender_uid`) — a regra de update precisa bater
com esse nome exato.

## Transversal

### `notifications/{id}`
`user_id`, `title`, `message`, `type` (`chat_message`, `adoption_interest`,
`adoption_match`, `adoption_rejected`, `pet_radar_match` (só criada pela
Cloud Function), `club_join_request`, `forum_reply`, etc. — ver
`NOTIFICATION_TYPE` em `core/services/notificationService.js`), `link`,
`read`, `actor_id`.

### `abuse_reports/{id}`
`reporter_uid`, `reporter_name`, `description`, `latitude`, `longitude`,
`address`, `photo_urls[]` (Storage, pasta `uploads/{uid}/reports/`),
`status`.

### `audit_logs/{id}`
Trilha de auditoria imutável (`allow update, delete: if false`). `action`
(`pet_created`, `club_member_invited`, `club_join_approved`,
`adoption_completed`, …), `actor_id`/`actor_name`, `details`.

### `platform_settings/global`
Doc único (não é a coleção `feature_flags`, que não existe). Campo
`feature_flags: { [flagKey]: boolean }`, editado só pelo admin master
(`platformSettingsService.setFeatureFlag`).

### `platform_content/{pageKey}`
CMS mínimo das páginas institucionais. `pageKey` é `termos`, `privacidade`
ou `legislacao`. Campos: `body` (Markdown, renderizado por
`components/ui/markdown-content.jsx`), `updated_at`. Leitura pública;
escrita só por `platform_admin`, em `/admin/conteudo`
(`AdminContentEditor.jsx` + `platformContentService.setPlatformContent`).
Se o doc não existir, a página usa o texto padrão embutido em
`DEFAULT_PLATFORM_CONTENT` (`platformContentService.js`) — nunca fica em
branco.

## Relacionamentos (resumo)

```
users (1) ──< pet_radars (1:1, radar de compatibilidade)
users (1) ──< pets (owner_id) ──< adoption_interests
                                ├──< adoption_ratings
clubs (1) ──< club_members ──> users
      ├──< club_join_requests / club_member_invites (ingresso)
      ├──< club_posts (mural) · club_forum_threads ──< comments / poll_votes
      └──< club_events ──< dates ──< date_rsvps · messages · participants
                       └──< event_invites / club_event_rsvps
conversations ──< messages
(qualquer ação) ──> audit_logs ; (qualquer usuário) ──> notifications
```

## Storage (`storage.rules`)

Todo upload de imagem/anexo (`core/services/storageService.js`) grava em
`uploads/{uid}/{folder}/...` (`folder`: `pets`, `reports`, `posts`, `forum`,
`chat`, `misc`) — dono grava no próprio caminho, leitura pública. Além
disso, `users/{uid}/**` tem regra dedicada para o avatar
(`users/{uid}/avatar`). Os caminhos legados `pets/{uid}/**`,
`reports/{uid}/**` e `organizations/{orgId}/**` foram removidos das regras
por não serem usados por nenhum fluxo do app (uploads de pets, denúncias e
logo de organização sempre passam por `uploads/{uid}/{folder}`).

> Nota de privacidade: as fotos de denúncia de maus-tratos, embora
> potencialmente sensíveis, hoje ficam em `uploads/{uid}/reports/...`, com
> **leitura pública** (mesma regra genérica de `uploads/`). Restringi-las
> exigiria trocar o caminho de upload e a forma como `AdminReports.jsx`
> exibe as imagens (hoje `<img src>` direto) — decisão de produto em
> aberto, não implementada nesta revisão.

## Regras de segurança (`firestore.rules`) — princípios

- Cobre toda coleção listada acima (`match /<col>/{id}`). Banco nomeado:
  bloco `match /databases/{database}/documents`.
- **Aditividade**: ao adicionar coleção, adicione regra sem afetar as demais
  — regra ausente = acesso negado por padrão, não "acesso liberado".
- Acesso por **papel-de-recurso**: membros/admins de clube via
  `club_members` (`isClubMember`/`isClubAdmin`/`canEditClubPets`); admin
  global via `users/{uid}.role == 'platform_admin'` (`isPlatformAdmin`), com
  um bootstrap fixo por e-mail (`isPlatformOwnerAuth`) para o primeiro admin.
- Campos sensíveis de `users/{uid}` (`role`, `banned*`) são **imutáveis pelo
  próprio dono** na regra de `update` — só um `platform_admin` os altera.
- Mesmo princípio vale para `club_members`: o próprio usuário só pode se
  auto-criar como `role: 'member'` e sem `permissions` (exceto o criador do
  clube, que pode se auto-nomear `admin` no bootstrap — `isClubCreator`,
  amarrado ao campo imutável `clubs.created_by`). `role`/`permissions` só
  mudam pela mão de um admin real; `canManageClubTeam` cria/remove membros
  comuns, mas nunca cria um admin nem remove um admin existente — a regra
  de `create`/`delete` valida isso explicitamente, não só a UI.
- Ids deterministas permitem regras simples do tipo "dono do par
  recurso+uid".
