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
`role` (`platform_admin | user`). Escrito por `FirebaseAuthContext`.

### `athlete_profiles/{uid}`
Projeção **pública** e privacy-filtrada de `users/{uid}` para o diretório de
adotantes (nome legado do fork/PickleTour, coleção ativa). `directory_listed`
controla visibilidade; telefone/e-mail/endereço só aparecem se marcados como
públicos. Sincronizado por `athleteService.syncAthleteProfile` (best-effort,
nunca lança erro).

## Pets e adoção

### `pets/{id}`
`title`, `species`, `size` (`small|medium|large|giant`), `age_group`, `city`,
`state`, `owner_id` (uid ou id de clube), `status` (`available → adopted`),
`adopted_by`, `adopted_at`, `priority_score` (0–3, calculado por idade do
anúncio: 90/180/365 dias). Flags de matching: `needs_yard`,
`needs_screened_apt`, `good_with_kids`, `good_with_dogs`, `good_with_cats`,
`health_notes`. Feed filtra `status == 'available'`, ordena por
`priority_score desc, created_at asc`.

Formulário de doação/adoção (item 5): `adoption_form_url` (link externo
opcional) e/ou `adoption_form` (formulário montado na plataforma —
`{ fields: [{ id, type, label, required, options? }] }`, com
`type ∈ short_text|long_text|yes_no|single_choice`). Definição pura e
validação em `pets/domain/adoptionForm.js` (testado). Editado pelo
responsável em `CreatePet`; respondido pelo adotante em `PetDetail`.

### `adoption_interests/{petId_userId}`
`pet_id`, `user_id`, `user_name`, `user_photo`, `status`
(`pending → approved/rejected`), `form_answers?` (respostas ao
`pets/{id}.adoption_form`, mapa `fieldId → valor`, gravado só quando há
formulário na plataforma). Gera notificações
`adoption_interest`/`adoption_match`/`adoption_rejected`.

## Comunidade — clubes (rotas `/comunidade` e `/organizacoes`)

> Feature em produção; serviços `clubService.js` (CRUD, membros, eventos,
> mural, campanhas, financeiro) e `forumService.js` (tópicos/comentários/
> enquetes). Nomes de arquivo ainda usam "Club" (herança do fork), mas a UI
> chama isso de "Organizações". `/comunidade` é o diretório/perfil público
> (`ClubsDirectory`/`ClubDetail`); `/organizacoes` é o hub de gestão
> (`OrganizationsHub`) com o painel de administração em
> `/organizacoes/:id/admin` (`OrganizationAdminPanel`) — ver
> `domain/permissions.js` para o modelo de permissões abaixo.

### `clubs/{id}`
`name`, `description`, `city`, `state`, `logo_url`, `invite_code`,
`member_count` (cosmético, nunca fonte de verdade), `created_by` (uid do
proprietário — sempre com as 5 permissões, imutável pela UI), `creator_name`,
`directory_status` (`active | review | suspended`), `featured` (boolean) e
`community_id`/`community_name` (vínculo editorial opcional para o diretório).

### `communities/{id}`
Entidade própria de curadoria/global para agrupar organizações no diretório:
`name`, `description`, `city`, `state`, `cover_url`, `featured`, `priority`,
`visibility` (`public | hidden`). Escrita exclusiva de `platform_admin`;
leitura pública.

### `club_members/{clubId_uid}`
`club_id`, `user_id`, `user_name`, `user_email`, `photo_url`, `role`
(`admin | member`), `joined_at`, `permissions?` (opcional —
`{ animals, finance, donations, feed, team }`, todas `boolean`). Fonte de
verdade de "quem é membro/admin" (usada pelas regras via
`isClubMember`/`isClubAdmin`/`hasClubPermission`).
Semântica de `permissions` (ver `domain/permissions.js`):
- Proprietário (`user_id == clubs.created_by`): todas as 5, implícito,
  nunca lido do doc.
- Admin (`role: 'admin'`) **sem** `permissions`: todas as 5, implícito
  (compatibilidade com admins promovidos antes deste modelo existir).
- Admin **com** `permissions` explícito, ou membro comum com `permissions`:
  só as chaves `true`. `animals` também aceita o campo legado
  `permissions.edit_pets` (única permissão granular antes desta mudança).

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
- `participants/{id}` — participantes do "dia de jogo".
- `games/{id}` — jogos organizados/sorteados do dia de jogo.

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

### `club_campaigns/{id}` — chamados de doação
`club_id`, `title`, `description`, `goal` (BRL, número), `raised` (BRL,
atualizado manualmente pelo admin via "Registrar valor"), `deadline`
(`YYYY-MM-DD` ou `null`), `status` (`active | concluded`), `created_by`.
Leitura pública (transparência de arrecadação); escrita exige permissão
`donations` (ou admin). Gerido na aba "Doações" do painel de administração
(`ClubDonationsTab.jsx`).

### `club_ledger/{id}` — prestação de contas
`club_id`, `type` (`revenue | expense`), `category` (string livre, com
sugestões em `LEDGER_CATEGORY_PRESETS`), `value` (BRL), `date`
(`YYYY-MM-DD`), `note`, `created_by`. Leitura e escrita exigem permissão
`finance` (ou admin) — não é público, diferente das campanhas. A aba
"Prestação de Contas" (`ClubFinanceTab.jsx`) agrega por período (mensal/
semestral/anual, calculado no client a partir de `date`) e por categoria.

> `organizations`/`organization_members`/`organization_reports`
> (`organizationService.js`) existem no código com um modelo parecido (ONGs,
> `org_id`/`user_id`/`role`), mas **não estão conectados a nenhuma
> rota/UI** — parecem substituídos pelas coleções `club_*` acima. Antes de
> excluir, confirmar que nada os referencia.

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
`club_join_request`, `forum_reply`, etc. — ver `NOTIFICATION_TYPE` em
`core/services/notificationService.js`), `link`, `read`, `actor_id`.

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

## Relacionamentos (resumo)

```
users (1) ──< athlete_profiles (perfil público, directory_listed)
users (1) ──< pets (owner_id) ──< adoption_interests
clubs (1) ──< club_members ──> users
      ├──< club_join_requests / club_member_invites (ingresso)
      ├──< club_posts (mural) · club_forum_threads ──< comments / poll_votes
      ├──< club_campaigns (doações) · club_ledger (financeiro)
      └──< club_events ──< dates ──< date_rsvps · messages · participants · games
                       └──< event_invites / club_event_rsvps
conversations ──< messages
(qualquer ação) ──> audit_logs ; (qualquer usuário) ──> notifications
```

## Storage (`storage.rules`)

Todo upload de imagem/anexo (`core/services/storageService.js`) grava em
`uploads/{uid}/{folder}/...` (`folder`: `pets`, `reports`, `posts`, `forum`,
`chat`, `misc`) — dono grava no próprio caminho, leitura pública. Além disso,
`pets/{uid}/**`, `reports/{uid}/**`, `organizations/{orgId}/**` e
`users/{uid}/**` têm regras dedicadas (usadas por fluxos específicos, ex.
avatar em `users/{uid}/avatar`).

## Regras de segurança (`firestore.rules`) — princípios

- Cobre toda coleção listada acima (`match /<col>/{id}`). Banco nomeado:
  bloco `match /databases/{database}/documents`.
- **Aditividade**: ao adicionar coleção, adicione regra sem afetar as demais
  — regra ausente = acesso negado por padrão, não "acesso liberado".
- Acesso por **papel-de-recurso**: membros/admins de clube via
  `club_members` (`isClubMember`/`isClubAdmin`); permissão granular via
  `hasClubPermission(clubId, key)` (lê `club_members.permissions.{key}`,
  independente do papel); admin global via
  `users/{uid}.role == 'platform_admin'` (`isPlatformAdmin`).
- Ids deterministas permitem regras simples do tipo "dono do par
  recurso+uid".
