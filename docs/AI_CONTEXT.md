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
1. **Adoção** — feed de pets com filtro por espécie/porte/idade, questionário
   de perfil comportamental obrigatório (onboarding), algoritmo de
   compatibilidade (match), interesse/candidatura, avaliação pós-adoção e
   "Radar de Pets" (alerta quando um pet compatível é cadastrado).
2. **Comunidade/Organizações** — diretório de ONGs e lojas parceiras
   ("organizações", historicamente chamadas de "clubes" no código), com
   membros por papel, mural, fórum (com enquetes), eventos (datas + RSVP +
   chat do evento) e planilha de gestão de pets para a equipe.
3. **Chat** 1:1 e em grupo entre usuários da plataforma.
4. **Denúncias** de maus-tratos (gera relatório para encaminhar a órgãos
   competentes — a plataforma não investiga).
5. **Notificações in-app** (sino) e **auditoria** de ações administrativas.
6. **LGPD**: consentimento no onboarding, exportação e exclusão de dados
   pelo próprio usuário.

A plataforma **não vende animais nem intermedia pagamentos** — eventuais
doações financeiras a ONGs (Pix, vaquinha) são diretas, fora do app.

## 2. Stack

- **React 18 + Vite**, JSX (sem TypeScript; `typecheck` via JSDoc/`jsconfig.json`).
- **Tailwind + shadcn/ui** (Radix) — primitivos em `src/components/ui/`.
  Design system com tokens semânticos (paleta terracota/creme/oliva/mustarda)
  — ver `docs/DESIGN_SYSTEM.md`.
- **Firebase**: Auth (Google), **Firestore** (database nomeada `viralata`,
  não a `(default)`), Storage, Hosting (site `viralata`). **Cloud Functions**
  pontuais em `functions/` (Node 20) — hoje só o gatilho do Radar de Pets;
  todo o resto da lógica roda no client, protegida por `firestore.rules`.
- **React Query** (`@tanstack/react-query`) para data fetching/cache.
- **Vitest** (unit, ~61 testes no app + testes próprios em `functions/`) +
  **Playwright** (E2E/QA visual).
- **react-router-dom** (BrowserRouter), **react-hook-form + zod**, `sonner`
  (toasts), `date-fns`, `lucide-react`, `framer-motion` (animações de
  scroll/entrada), `recharts` (gráficos do admin), `qrcode`, `html-to-image`.

## 3. Arquitetura em uma frase

App **client-only por módulos de domínio** (mais um punhado de Cloud
Functions só onde é impossível fazer no client), cada módulo em camadas
`domain → services → hooks → components/pages`. Domínio é **puro e testado**;
services falam com Firestore; hooks expõem React Query; UI consome hooks.

```
src/
├── App.jsx              # Roteamento + providers (QueryClient, Auth, Feature Flags)
├── main.jsx             # Bootstrap + registro PWA (atrás de flag)
├── components/          # Layout (shell, sino, navegação) + ui/ (shadcn) + AdSlot, legal-page
├── core/
│   ├── config/firebase.js           # init app/auth/db/storage/functions (database 'viralata')
│   ├── lib/FirebaseAuthContext.jsx  # AuthProvider + useAuth (user, perfil, papéis, banido)
│   ├── lib/FeatureFlagsContext.jsx  # flags lidas de platform_settings/global
│   ├── featureFlags.js              # catálogo de flags (hoje: AD_SLOTS)
│   ├── lib/{logger,utils,useClipboard}.js
│   ├── domain/types.js              # typedefs JSDoc compartilhados
│   └── services/  # auditService, notificationService, baseService, storageService,
│                   # observabilityService, platformSettingsService, dataExportService,
│                   # deleteAccountService (LGPD)
├── modules/
│   ├── pets/          # feed, cadastro, interesse, match, radar, avaliação pós-adoção
│   ├── organizations/ # organizações (ONGs/lojas): membros, mural, fórum, eventos
│   ├── onboarding/    # questionário de perfil obrigatório (gate pós-login)
│   ├── chat/          # conversas 1:1 e grupo
│   ├── reports/       # denúncia de maus-tratos
│   ├── notifications/ # hook do sino
│   └── admin/         # painel da plataforma (pets, denúncias, usuários, orgs, métricas)
└── pages/  # Home, Login, Profile, Terms, PrivacyPolicy, Legislation, PageNotFound, BannedNotice
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
| `/` `/login` `/politica-privacidade` `/termos` `/legislacao` | público | landing, login, conteúdo institucional |
| `/onboarding` | autenticado | questionário de perfil obrigatório |
| `/feed` `/pets/:petId` | público (auth opcional) | feed de pets, detalhe do pet |
| `/pets/new` `/pets/:petId/edit` `/meus-pets` `/radar` | autenticado | cadastrar/editar pet, meus pets, Radar de Pets |
| `/organizacoes` | público | diretório de organizações |
| `/organizacoes/criar` `/organizacoes/:orgId` `/organizacoes/:orgId/eventos/:eventId` | autenticado | criar/detalhe/evento de organização |
| `/chat` `/chat/:conversationId` | autenticado | mensagens |
| `/denuncias/nova` | autenticado | denúncia de maus-tratos |
| `/perfil` | autenticado | Profile (dados, LGPD, exclusão de conta) |
| `/admin` `/admin/pets` `/admin/denuncias` `/admin/usuarios` `/admin/organizacoes` `/admin/metricas` | platform_admin | painel |

Guards: `ProtectedRoute` (auth), `OnboardedRoute` (auth + perfil completo,
não usado em todas as rotas autenticadas — várias só exigem `ProtectedRoute`
e deixam o próprio fluxo lidar com perfil incompleto), `AdminRoute`
(platform_admin), `BannedGate` (bloqueia usuário banido em qualquer rota).
Redirects legados: `/inicio`→`/feed`, `/clubes`→`/organizacoes`,
`/atletas`→`/feed` (heranças do fork anterior). Páginas via `React.lazy`.
`basename = import.meta.env.BASE_URL`.

## 6. Modelo de dados (Firestore, database `viralata`)

Coleções (todas top-level; ids deterministas quando indicado). Detalhe de
campos em `docs/DATA_MODEL.md`.

- **Identidade**: `users/{uid}` (perfil, respostas do onboarding, `role`,
  `banned`).
- **Pets/adoção**: `pets` · `adoption_interests` (id `petId_userId`) ·
  `adoption_ratings` (id `petId_raterUid`, avaliação pós-adoção) ·
  `pet_radars/{uid}` (critérios + liga/desliga do Radar de Pets).
- **Organizações**: `clubs` (nome de coleção legado; UI chama de
  "organizações") · `club_members` (id `clubId_uid`) · `club_join_requests` ·
  `club_member_invites` · `club_posts` (mural) · `club_forum_threads` (+
  `comments`, `poll_votes`) · `club_events` (+ `dates`, `date_rsvps`,
  `messages`, `participants`) · `club_event_rsvps` · `event_invites`.
- **Chat**: `conversations` · `messages` (subcoleção).
- **Transversal**: `notifications` · `audit_logs` · `abuse_reports` ·
  `platform_settings/global` (feature flags).

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
- `docs/DESIGN_SYSTEM.md` — identidade visual: paleta, tipografia, motion.
- `docs/ROADMAP.md` — histórico do plano de execução por fases (Fases 0-2
  concluídas; Fase 3 lista follow-ups funcionais conhecidos, não
  implementados).
