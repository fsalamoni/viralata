# AI_CONTEXT — Leia isto primeiro

> Documento-mestre, denso e otimizado para IA. Em ~1 leitura você entende a
> plataforma sem abrir o código. Os demais docs em `docs/` aprofundam temas.
> Atualize este arquivo quando mudar arquitetura, coleções ou rotas.

## 1. O que é

**Viralata** — plataforma web (PWA) de **adoção responsável de pets** no
Brasil, gratuita, conectando pets que precisam de lar a adotantes, com uma
camada de **comunidade** (organizações/ONGs, mural, fórum, eventos, chat).
UI e textos em **português (pt-BR)**.

Pilares:
1. **Adoção** — feed de pets com filtro por espécie/porte/localização e
   matching por compatibilidade com o perfil do adotante (moradia, rotina,
   orçamento, filhos/idosos em casa), cadastro/edição de pet, interesse de
   adoção, avaliação pós-adoção, radar de pet compatível (alerta), denúncia
   de maus-tratos. O feed usa UMA única query no Firestore (status +
   created_at) e aplica espécie/porte/cidade/raio client-side
   (`pets/domain/feedFilters.js`) — nunca adicionar `where` extra sem
   pensar no índice composto correspondente.
2. **Organizações** — ONGs e lojas parceiras, tudo sob `/organizacoes`:
   diretório público (`/organizacoes`), perfil público
   (`/organizacoes/:id`, com pets para adoção, campanhas ativas e abas de
   membros/eventos/mural/fóruns para membros), eventos
   (`/organizacoes/:id/eventos/:eventId`), hub de gestão
   (`/organizacoes/hub`) e painel de administração
   (`/organizacoes/:id/admin`) com permissões granulares por administrador
   (animais, financeiro, doações, mural, equipe), planilha de animais em
   massa (edição inline + importação/exportação .xlsx/.csv/.json),
   chamados de doação e prestação de contas.
3. **Comunidades** (`/comunidade`) — grupos de usuários independentes das
   organizações: mural (posts com curtidas e comentários), fórum (tópicos
   e respostas), eventos, ingresso aberto ou por código de convite.
4. **Notificações in-app** (sino, painel dropdown) e **auditoria** de ações.
5. **Painel administrativo da plataforma** (`platform_admin`): pets,
   organizações, comunidades, denúncias, usuários, métricas, trilha de
   auditoria.

## 2. Stack

- **React 18 + Vite**, JSX (sem TypeScript; há `typecheck` via JSDoc/`types.js`).
- **Tailwind + shadcn/ui** (Radix) — primitivos em `src/components/ui/`.
  Identidade visual "terracota/creme/oliva" — ver `docs/DESIGN_SYSTEM.md`.
- **Firebase**: Auth (Google), **Firestore** (database nomeada `viralata`,
  não a `(default)`), Hosting (site `viralata`). Sem Cloud Functions próprias
  no client — **toda a lógica roda no client**; a segurança é garantida por
  `firestore.rules`. Há uma única Cloud Function de apoio (Radar de Pets,
  em `functions/`) para o alerta assíncrono de pet compatível.
- **React Query** (`@tanstack/react-query`) para data fetching/cache.
- **framer-motion** para microinterações sutis (scroll-reveal, hover-lift).
- **xlsx** (SheetJS) para o modelo/importação de planilha de animais —
  carregado sob demanda (import dinâmico), nunca no bundle inicial.
- **Vitest** (unit, 80 testes) + **Playwright** (E2E, poucos testes de fumaça).
- **react-router-dom** (BrowserRouter), **react-hook-form + zod**, `sonner`
  (toasts), `date-fns`, `lucide-react`, `jspdf`/`html-to-image`/`qrcode`
  (denúncia em PDF, compartilhamento social do pet, QR de doação).

## 3. Arquitetura em uma frase

App **client-only por módulos de domínio**, cada módulo em camadas
`domain → services → hooks → components/pages`. Domínio é **puro e testado**;
services falam com Firestore; hooks expõem React Query; UI consome hooks.

```
src/
├── App.jsx              # Roteamento + providers (QueryClient, Auth, Router)
├── main.jsx             # Bootstrap + registro PWA (atrás de flag)
├── components/          # Layout (shell, sino, navegação) + ui/ (shadcn)
├── core/
│   ├── config/firebase.js        # init app/auth/db (database 'viralata')
│   ├── lib/FirebaseAuthContext.jsx  # AuthProvider + useAuth (user, perfil, papéis)
│   ├── lib/FeatureFlagsContext.jsx  # feature flags da plataforma
│   ├── lib/{logger,utils,useClipboard}.js
│   ├── domain/types.js           # typedefs JSDoc compartilhados
│   ├── featureFlags.js
│   ├── pwa/                      # registerPwa, usePwaInstall
│   └── services/                 # auditService, notificationService,
│                                 # baseService, storageService, observabilityService,
│                                 # platformSettingsService, dataExportService,
│                                 # deleteAccountService
└── modules/
    ├── pets/           # feed, detalhe, cadastro/edição, radar, avaliações, matching
    ├── organizations/  # organizações: diretório/perfil público + hub/painel de gestão
    ├── communities/    # comunidades de usuários: mural, fórum, eventos, convite
    ├── onboarding/     # questionário de perfil de adotante
    ├── chat/           # conversas 1:1 e grupo
    ├── notifications/  # hook + painel dropdown do sino
    ├── reports/        # denúncia de maus-tratos
    └── admin/          # painel da plataforma (pets, orgs, denúncias, usuários, métricas, auditoria)
```

Convenção de camadas por módulo (nem todo módulo tem todas):
`domain/` (lógica pura + `.test.js`) · `services/` (Firestore CRUD + auditoria)
· `hooks/` (React Query) · `pages/` (rotas) · `components/` (UI do módulo).

## 4. Autenticação e papéis

- Login **Google** via Firebase Auth. `AuthProvider` cria/lê `users/{uid}` e
  expõe via `useAuth()`: `user`, `userProfile`, `isAuthenticated`,
  `isPlatformAdmin`, `isBanned`, `signOut`, `updateProfile`.
- **Papéis de plataforma** (campo `users/{uid}.role`):
  - `platform_admin` — admin global. O primeiro (dono fixo da plataforma) é
    definido por e-mail hardcoded (`isPlatformOwnerAuth` em
    `firestore.rules`); demais precisam ser promovidos por um
    `platform_admin` existente. Acessa `/admin/*`.
  - `user` — usuário comum (adotante e/ou cadastrante de pet).
- **Papel em organização** é *por recurso*, não global: `club_members.role`
  (`admin | member`) + **permissões granulares** por admin
  (`animals`/`finance`/`donations`/`feed`/`team`) + conceito de
  **proprietário** (`clubs.created_by`, sempre com todas, protegido contra
  remoção/rebaixamento tanto na UI quanto em `firestore.rules`) — ver
  `src/modules/organizations/domain/permissions.js`.
- Perfil de adotante (preenchido no onboarding, usado pelo algoritmo de
  match): tipo de moradia, rotina de passeios, orçamento, crianças/idosos em
  casa, outros animais, cidade/UF, consentimento LGPD. Gate de onboarding:
  `userProfile.profile_completed`.

## 5. Rotas (App.jsx)

| Rota | Acesso | Tela |
| --- | --- | --- |
| `/` `/login` `/termos` `/legislacao` `/politica-privacidade` | público | home, login, institucionais |
| `/feed` `/pets/:petId` | público (match usa perfil se logado) | feed de pets, detalhe |
| `/onboarding` | autenticado, perfil incompleto | questionário de adotante |
| `/pets/new` `/pets/:petId/edit` `/meus-pets` `/radar` | autenticado | cadastro/edição, meus pets, radar |
| `/comunidade` | público (diretório) / autenticado (detalhe) | comunidades (grupos de usuários): mural, fórum, eventos |
| `/comunidade/criar` `/comunidade/:communityId` | autenticado | criar comunidade, detalhe da comunidade |
| `/organizacoes` `/organizacoes/:orgId` | público | diretório e perfil público de ONGs |
| `/organizacoes/hub` `/organizacoes/criar` `/organizacoes/:orgId/admin` `/organizacoes/:orgId/eventos/:eventId` | autenticado | hub de gestão, criação, painel de administração, evento |
| `/chat` `/chat/:conversationId` | autenticado | mensagens |
| `/denuncias/nova` | autenticado | denúncia de maus-tratos |
| `/perfil` | autenticado | dados pessoais, perfil de adotante, LGPD |
| `/admin` `/admin/pets` `/admin/denuncias` `/admin/usuarios` `/admin/organizacoes` `/admin/comunidades` `/admin/metricas` `/admin/auditoria` `/admin/notificacoes` `/admin/configuracoes` | `platform_admin` | painel administrativo |

Guards: `ProtectedRoute` (auth), `AdminRoute` (`platform_admin`),
`BannedGate` (bloqueia usuário banido em qualquer rota autenticada).
Redirects legados: `/inicio`→`/feed`, `/clubes`→`/comunidade`,
`/atletas`→`/feed`; `/comunidade/:orgId/eventos/:eventId` (antigo caminho
dos eventos de organização) redireciona para
`/organizacoes/:orgId/eventos/:eventId`, e links antigos
`/comunidade/{orgId}` de notificações são resolvidos pelo fallback do
`CommunityDetail` (detecta id de organização e redireciona) — preserva
links já gravados no Firestore. Páginas via `React.lazy`.
`basename = import.meta.env.BASE_URL`.

Layout: todas as páginas internas usam o container canônico
`src/components/PageContainer.jsx` (mesma largura/paddings do trilho do
header — ver `docs/DESIGN_SYSTEM.md`, seção 7); `Home`, `Login` e
`OnboardingQuestionnaire` são standalone (full-bleed).

## 6. Modelo de dados (Firestore, database `viralata`)

Coleções (todas top-level; ids deterministas quando indicado). Detalhe de
campos em `docs/DATA_MODEL.md`.

- **Identidade**: `users/{uid}` (perfil + role + perfil de adotante).
- **Pets**: `pets` (owner pode ser usuário ou organização) ·
  `adoption_interests` (id `petId_userId`) · `adoption_ratings` ·
  `pet_radars/{uid}` (alerta assíncrono via Cloud Function).
- **Organizações**: `clubs` · `club_members` (id `clubId_uid`, `role` +
  `permissions`) · `club_join_requests`/`club_member_invites`
  (id `clubId_uid`) · `club_posts` (mural) · `club_forum_threads`
  (+ `comments`, `poll_votes`) · `club_events` (+ `dates`, `date_rsvps`,
  `messages`, `participants`) · `club_event_rsvps` · `event_invites` ·
  `club_campaigns` (chamados de doação) · `club_ledger` (prestação de
  contas).
- **Comunidades** (grupos de usuários): `communities` (com `owner_id` e
  `invite_code`) · `community_members` (id `communityId_uid`) ·
  `community_posts` · `community_post_likes` (id `postId_uid`) ·
  `community_post_comments` · `community_forum_threads` ·
  `community_forum_messages` · `community_events`.
- **Chat**: `conversations` · `messages`.
- **Transversal**: `notifications` · `audit_logs` · `abuse_reports` ·
  `platform_settings/global` (feature flags).

Princípios: **sem joins** — desnormalização e leitura por coleção; ids
deterministas (`clubId_uid`) evitam duplicidade e simplificam regras;
escritas relevantes acompanhadas de `audit_logs` via `auditService`.

## 7. Notificações (sino)

`core/services/notificationService.js`: `createNotification(...)` e
`notifyUsers(ids, ...)` (em lote, ≤400/batch). Coleção `notifications`.
Hook `modules/notifications/hooks/useNotifications.js` (sem argumento — lê
o usuário logado via `useAuth()` internamente; retorna `{ notifications,
unreadCount, isLoading, markAsRead }`, **não** é um hook do React Query).
`NotificationsMenu.jsx` é o painel dropdown do sino no `Layout` — ícone por
`type`, não lidas destacadas, clique marca como lida e navega para `link`.

Tipos (`NOTIFICATION_TYPE`): `chat_message`, `chat_invite`,
`adoption_interest`, `adoption_match`, `adoption_rejected`,
`adoption_completed`, `pet_status_changed`, `pet_radar_match`,
`club_invite`, `club_invite_accepted`, `club_join_request`,
`club_join_approved`, `club_join_rejected`, `club_event_published`,
`event_invite`, `forum_reply`, `forum_mention`, `profile_reminder`,
`generic`.

## 8. Domínio de pets (lógica pura testada)

Em `modules/pets/domain/`: `matching` (compatibilidade pet↔perfil de
adotante — moradia, porte vs. tipo de imóvel, crianças/idosos, orçamento) ·
`priority` (pontuação de prioridade por tempo de espera: 0–3, 90/180/365
dias). Em `modules/organizations/domain/`: `permissions` (proprietário +
permissões granulares), `petImport` (validação/mapeamento de planilha de
animais), `forumPoll` (enquetes de fórum). **Regra de ouro**: lógica de
negócio mora em `domain/` (pura, testável), nunca em componentes ou
services.

## 9. Build, testes e deploy

```bash
npm run dev       # Vite dev (http://localhost:5173)
npm run lint      # ESLint (--quiet no CI)
npm run test      # Vitest unit
npm run e2e       # Playwright (instalar antes: npm run e2e:install)
npm run build     # produção → dist/  (VITE_PWA_ENABLED=true ativa PWA)
```

- **Deploy**: push em `main` dispara `.github/workflows/deploy.yml` → build
  e deploy no Firebase Hosting (site `viralata`) + publicação das regras do
  Firestore (`firestore.rules`).
- **Env**: variáveis `VITE_FIREBASE_*` (ver `.env.example`),
  `VITE_FIRESTORE_DATABASE_ID` (padrão `viralata`), `VITE_PWA_ENABLED`.
- **PWA**: aditivo, atrás de `VITE_PWA_ENABLED` (desligada por padrão);
  service worker próprio em `public/sw.js` (não é o Workbox
  auto-gerado do `vite-plugin-pwa` — ver `docs/ARCHITECTURE.md`).

## 10. Convenções para quem edita (humano ou IA)

1. **Lógica pura → `domain/` com teste.** Service só I/O; componente só UI.
2. Mudou Firestore? Atualize **`firestore.rules`** (aditivas, sem quebrar
   coleções existentes) e `docs/DATA_MODEL.md`.
3. Toda escrita relevante gera **`audit_logs`** via `auditService` — e
   precisa de rótulo em `AUDIT_ACTION_LABELS` para aparecer legível em
   `/admin/auditoria`.
4. Notificação nova? Adicione a chave em `NOTIFICATION_TYPE`
   (`core/services/notificationService.js`) **antes** de referenciá-la —
   chave inexistente vira silenciosamente `type: undefined` → `'generic'`
   (já aconteceu uma vez, ver histórico de `NotificationsMenu.jsx`).
5. Alias de import: `@/` → `src/`.
6. Antes de commitar: `npm run lint && npm run build && npm test` verdes.
7. Textos de UI em **pt-BR**.
8. Deploy só com a tríade verde; confira o run do workflow após o push.

## 11. Mapa dos demais docs

- `docs/ARCHITECTURE.md` — camadas, design system, PWA, testes, padrões.
- `docs/DATA_MODEL.md` — coleções, campos, relacionamentos, resumo das regras.
- `docs/MODULES.md` — o que cada módulo faz, arquivos-chave e fluxos.
- `docs/DESIGN_SYSTEM.md` — identidade visual: paleta, tipografia, motion.
- `docs/ROADMAP.md` — histórico de fases e follow-ups funcionais pendentes.
