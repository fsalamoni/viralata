# AI_CONTEXT — Leia isto primeiro

> Documento-mestre, denso e otimizado para IA. Em ~1 leitura você entende a
> plataforma sem abrir o código. Os demais docs em `docs/` aprofundam temas.
> Atualize este arquivo quando mudar arquitetura, coleções ou rotas.

## 1. O que é

**Viralata** — plataforma web (PWA) de **adoção responsável de pets** no
Brasil, conectando pessoas e organizações (ONGs/lojas) que têm animais para
doação com adotantes interessados. Projeto Firebase: `viralata-4cf0b`. Site de
hosting: `viralata`. UI e textos em **português (pt-BR)**.

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

- **React 18 + Vite**, JSX (sem TypeScript; `typecheck` via JSDoc/`jsconfig.json`).
- **Tailwind + shadcn/ui** (Radix) — primitivos em `src/components/ui/`.
  Design system oficial v1.0 com tokens semânticos (paleta
  terracota/creme/oliva/mostarda) — ver `docs/DESIGN_SYSTEM.md` e
  `docs/ROADMAP.md` → **Fase 4 (DS_V2)** para o plano de aplicação
  bloco a bloco.
- **Firebase**: Auth (Google), **Firestore** (database nomeada `viralata`,
  não a `(default)`), Storage, Hosting (site `viralata`). **Cloud Functions**
  pontuais em `functions/` (Node 20) — hoje só o gatilho do Radar de Pets;
  todo o resto da lógica roda no client, protegida por `firestore.rules`.
- **React Query** (`@tanstack/react-query`) para data fetching/cache.
- **Vitest** (unit, ~61 testes no app + testes próprios em `functions/`) +
  **Playwright** (E2E/QA visual).
- **react-router-dom** (BrowserRouter), **react-hook-form + zod**, `sonner`
  (toasts), `date-fns`, `lucide-react` (ícones padrão — usado em 204
  arquivos; spec v1.0 convive com Material Symbols Outlined via
  `DS_V2_TOKENS`), `framer-motion` (instalar via `DS_V2_MOTION`),
  `recharts` (gráficos do admin), `qrcode`, `html-to-image`.

## 3. Arquitetura em uma frase

App **client-only por módulos de domínio** (mais um punhado de Cloud
Functions só onde é impossível fazer no client), cada módulo em camadas
`domain → services → hooks → components/pages`. Domínio é **puro e testado**;
services falam com Firestore; hooks expõem React Query; UI consome hooks.

```
src/
├── App.jsx              # Roteamento + providers (Theme, QueryClient, Auth, Feature Flags)
├── main.jsx             # Bootstrap + registro PWA (atrás de flag)
├── components/          # Layout (shell, sino, navegação, toggle de tema) + ui/ (shadcn) + AdSlot, legal-page
├── core/
│   ├── config/firebase.js           # init app/auth/db/storage/functions (database 'viralata')
│   ├── lib/FirebaseAuthContext.jsx  # AuthProvider + useAuth (user, perfil, papéis, banido)
│   ├── lib/FeatureFlagsContext.jsx  # flags lidas de platform_settings/global
│   ├── lib/ThemeContext.jsx         # tema claro/escuro (localStorage + preferência do sistema)
│   ├── featureFlags.js              # catálogo de flags (hoje: AD_SLOTS)
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

`functions/` é um pacote Node separado (própria `package.json`/testes), fora
do bundle do Vite — ver seção 8.

## 4. Autenticação e papéis

- Login **Google** via Firebase Auth. `AuthProvider` cria/lê `users/{uid}` e
  expõe via `useAuth()`: `user`, `userProfile`, `isAuthenticated`,
  `isAuthAvailable`, `isPlatformAdmin`, `isBanned`, `updateUserProfile`,
  `signOut`.
- **Papéis** (campo `users/{uid}.role`):
  - `platform_admin` — admin global. O primeiro admin é o dono fixo da
    plataforma, identificado por e-mail (`fsalamoni@gmail.com`, checado tanto
    no client quanto em `firestore.rules`). Acessa `/admin/*`.
  - `user` — usuário comum (adotante e/ou doador; não há distinção de papel
    entre esses dois, qualquer usuário pode cadastrar um pet).
- **Admin de organização** é papel *por recurso* (`club_members.role ==
  'admin'`), independente do admin global. Membros comuns podem ganhar
  permissões granulares (`club_members.permissions.edit_pets`, etc.) sem
  virar admin.
- **Banimento**: `users/{uid}.banned` (+ `banned_at`, `banned_reason`), só
  alterável por `platform_admin`. Usuário banido cai em `BannedNotice` via
  `BannedGate` em `App.jsx`.
- **Onboarding obrigatório**: `users/{uid}.profile_completed` controla o
  gate. Sem perfil completo, `OnboardedRoute`/redirects levam a
  `/onboarding` antes de liberar o feed.

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
  `platform_settings/global` (feature flags) · `platform_content/{pageKey}`
  (Markdown das páginas institucionais, editável em `/admin/conteudo`).

Princípios: **sem joins** — desnormalização e leitura por coleção; ids
deterministas (`clubId_uid`) evitam duplicidade e simplificam regras;
escritas relevantes geram `audit_logs` via `auditService`.

## 7. Notificações (sino)

`core/services/notificationService.js`: `createNotification(...)` e
`notifyUsers(ids, ...)` (em lote, ≤400/batch). Coleção `notifications`.
Hook `modules/notifications/hooks/useNotifications.js` alimenta o sino no
`Layout`. Tipos (`NOTIFICATION_TYPE`) incluem: `chat_message`, `chat_invite`,
`forum_reply`, `forum_mention`, `event_invite`, `club_join_request`,
`club_join_approved`, `club_join_rejected`, `club_invite`,
`club_invite_accepted`, `club_event_published`, `adoption_interest`,
`adoption_match`, `adoption_rejected`, `pet_radar_match` (gerada pela Cloud
Function do Radar), `generic`.

## 8. Cloud Functions (`functions/`)

Único gatilho de servidor da plataforma. `functions/index.js`:
`onDocumentCreated('pets/{petId}')` na database `viralata`, região
`southamerica-east1` — ao cadastrar um pet, busca `pet_radars` ativos, roda
`isCompatible()` (cópia pura de `src/modules/pets/domain/matching.js`,
mantida em `functions/matching.js` com seus próprios testes) contra o perfil
de cada usuário com radar ligado, e cria `notifications` em lote via
`firebase-admin` (ignora `firestore.rules`, que só valem para o client).
Justificativa: é a única operação que exige reagir à criação de **qualquer**
pet por **qualquer** usuário — o client só escuta o que o próprio usuário
está olhando.

Pacote Node independente (`functions/package.json`, `functions/vitest.config.js`)
— não faz parte do bundle do Vite. Deploy: `firebase deploy --only functions`
(automatizado no CI, ver seção 9).

## 9. Build, testes e deploy

```bash
npm run dev       # Vite dev (http://localhost:5173)
npm run lint      # ESLint (--quiet no CI)
npm run test      # Vitest unit (app)
npm run e2e       # Playwright
npm run build     # produção → dist/
npm --prefix functions test   # Vitest das Cloud Functions
```

- **Deploy**: push em `main` dispara `.github/workflows/deploy.yml`
  ("Deploy Viralata → Firebase Hosting") → build do app + deploy no Firebase
  Hosting (site `viralata`) e nas Functions. Regras do Firestore/Storage são
  publicadas via CLI (fora do workflow atual — publicar manualmente após
  mudar `firestore.rules`/`storage.rules`).
- **Env**: variáveis `VITE_FIREBASE_*` (ver `.env.example`),
  `VITE_FIRESTORE_DATABASE_ID` (padrão `viralata`).
- **PWA**: manifest/ícones em `public/` (identidade visual Viralata — paw
  print terracota). Service worker gerado por `vite-plugin-pwa`.

## 10. Convenções para quem edita (humano ou IA)

1. **Lógica pura → `domain/` com teste.** Service só I/O; componente só UI.
2. Mudou Firestore? Atualize **`firestore.rules`** (aditivas, sem quebrar
   coleções existentes) e `docs/DATA_MODEL.md`. Valide com o emulador local
   (`firebase emulators:start --only firestore`) antes de commitar.
3. Toda escrita relevante gera **`audit_logs`** via `auditService`.
4. Alias de import: `@/` → `src/`.
5. Antes de commitar: `npm run lint && npm run build && npm test` verdes
   (e `npm --prefix functions test` se mexer em `functions/`).
6. Cores/UI: use os **tokens semânticos** do design system
   (`bg-primary`, `text-foreground`, `text-muted-foreground`, etc.) — nunca
   cores literais do Tailwind (`orange-500`, `gray-900`...). Ver
   `docs/DESIGN_SYSTEM.md`.
7. Textos de UI em **pt-BR**.
8. Deploy só com a tríade verde; confira o run do workflow após o push.
9. Nomes de arquivo/coleção com heranças do fork anterior (`clubs`,
   `club_members`, `ClubDetail.jsx`) representam **organizações**, não
   "clubes de pickleball" — é dívida de nomenclatura conhecida, não um bug.

## 11. Mapa dos demais docs

- `docs/ARCHITECTURE.md` — camadas, design system, Firebase, PWA, testes, CI/CD.
- `docs/DATA_MODEL.md` — coleções, campos, relacionamentos, resumo das regras.
- `docs/MODULES.md` — o que cada módulo faz, arquivos-chave e fluxos.
- `docs/DESIGN_SYSTEM.md` — **especificação oficial v1.0** do design
  system: paleta, tipografia, espaçamento, raios, sombras, componentes,
  ícones, motion, voz, acessibilidade.
- `docs/design-system-v2/` — snapshot portátil da v1.0 em 5 formatos
  (`.md` canônico, `.json` tokens, `.html` preview, `.fig` placeholder,
  `.pdf`). Não editar; é material de referência.
- `docs/REGENCY_PET_OPS_V3.md` — Pet Ops V3 (TASK-V3-PET-OPS-LOG, sw-v72.4): tabela operacional, pet_seq imutável, log de mudanças, anotações e timeline visual.
- **sw-v72.5 (2026-07-22)**: hotfix de import — `MessageSquare` foi usado em PetDetailV3 mas não adicionado ao import do lucide-react. Quebrou `/pets/<id>` em produção. **D-PET-OPS-LUCIDE-IMPORT**: validar que TODOS os ícones do lucide usados em JSX estão no import. 5 testes novos (4 runtime + 1 estático) + `scripts/validate-lucide-imports.mjs`.
- **sw-v73 (2026-07-22)**: cadeia de hotfixes do PWA. (1) **sw-v73.1** auto-unregister de SWS stale; (2) **sw-v73.2** unregister roda SEMPRE (não só quando PWA_ENABLED=true); (3) **sw-v73.3** defer reload se user está interagindo. **D-PWA-STALE-UNREGISTER-DEFER**: NUNCA `window.location.reload()` se user pode estar digitando/rolando/clicando. Track user activity via `pwa-stale-last-activity` (sessionStorage). 6 testes no `registerPwa.test.js`.
- **sw-v73.3 canEdit fix (2026-07-22)**: hotfix em PetDetailV3.jsx linha 770. `canEdit` (renomeada para `canEditHistory` em sw-v72) estava sendo usada em `PetNotes` (adicionada em sw-v72.4) sem atualizar a referência. Bug só foi pego por **runtime test** que renderiza o componente com dados mockados. **D-PET-DETAIL-RUNTIME-TEST**: SEMPRE criar `*.runtime.test.jsx` que renderiza componentes críticos com dados mockados. Static analysis + imports tests não substituem.
- **sw-v73.3 test fixes (2026-07-23)**: 3 testes quebrados corrigidos: (1) `ShelterAdminDashboard.test.jsx` importava named export em vez de default; (2) `searchService.test.js` esperava `fosters` mas TASK-312 introduziu `search_fosters` (denormalizado); (3) `volunteerAssignmentService.test.js` misturava ESM e CJS no mesmo arquivo.
- `docs/ROADMAP.md` — histórico do plano de execução por fases. **Fases
  0-3 concluídas (paleta terracota antiga). Fase 4 (DS_V2) em
  andamento**: reaplicação da spec v1.0 por bloco, cada um com
  feature flag default OFF.
