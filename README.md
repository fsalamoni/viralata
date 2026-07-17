# 🐾 Viralata — Plataforma de Adoção Responsável de Pets

> Site: [viralata.web.app](https://viralata.web.app)
> Documentação: [`docs/`](docs/) · Arquitetura: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Hooks: [`docs/HOOKS.md`](docs/HOOKS.md)

## Sobre

O **Viralata** é uma plataforma PWA (Progressive Web App) de marketplace de adoção de pets. Conecta animais que precisam de um lar com famílias que têm amor para dar. **Não há venda de animais** — apenas adoções responsáveis.

Shelters (abrigos) e Clubs (ONGs) gerenciam pets, voluntários, eventos e finanças na plataforma.

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + shadcn/ui |
| Estado | TanStack Query (React Query) |
| Auth | Firebase Authentication (Google, Email) |
| Banco de dados | Cloud Firestore |
| Storage | Firebase Storage |
| Hosting | Firebase Hosting (viralata.web.app) |
| PWA | vite-plugin-pwa + Workbox |
| CI/CD | GitHub Actions → Firebase Hosting |

---

## Estrutura de Módulos

```
src/
├── core/               # Infraestrutura: Firebase, Auth, Services, Utils
├── modules/
│   ├── pets/           # 🐾 Catálogo, CRUD, matching, interesses
│   ├── onboarding/     # 📋 Questionário comportamental
│   ├── organizations/  # 🏢 ONGs e lojas parceiras
│   ├── chat/           # 💬 Chat em tempo real (Firestore)
│   ├── reports/        # 🚨 Denúncias de maus-tratos + PDF
│   ├── admin/          # 🛡️ Painel administrativo
│   ├── adopters/       # 👤 Perfis de adotantes
│   └── notifications/  # 🔔 Notificações em tempo real
├── pages/              # Páginas públicas (Home, Login, Profile, etc.)
└── components/         # Layout, UI compartilhados
```

---

## Configuração do Ambiente

### 1. Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=viralata.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=viralata
VITE_FIREBASE_STORAGE_BUCKET=viralata.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
VITE_FIRESTORE_DATABASE_ID=viralata
```

### 2. Instalar dependências

```bash
npm install
```

### 3. Rodar localmente

```bash
npm run dev
```

### 4. Build para produção

```bash
npm run build
```

### 5. Deploy no Firebase

```bash
firebase deploy --only hosting,firestore:rules,storage
```

---

## CI/CD — GitHub Actions

O deploy automático está configurado em `.github/workflows/deploy.yml`:

- **Push para `main`** → deploy em produção (`viralata.web.app`)
- **Pull Request** → deploy em canal de preview

### Secrets necessários no GitHub

| Secret | Descrição |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON da conta de serviço do Firebase |
| `VITE_FIREBASE_API_KEY` | API Key do Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID |
| `VITE_FIREBASE_APP_ID` | App ID |
| `VITE_FIRESTORE_DATABASE_ID` | ID do banco Firestore nomeado (`viralata`) |

### Troubleshooting: deploy falhando com `PERMISSION_DENIED` / "Failed to get Firebase project"

Se o job de deploy falhar com `Failed to get Firebase project viralata. Please make sure
the project exists and your account has permission to access it.` (HTTP 403,
`USER_PROJECT_DENIED`), o build e os testes passaram — o problema é de
permissão no lado do Google Cloud/Firebase, não no código. Para resolver:

1. Confirme em [console.firebase.google.com](https://console.firebase.google.com)
   que existe um projeto com o **Project ID** exatamente `viralata` (case-sensitive).
2. Gere uma nova chave da conta de serviço em *Configurações do projeto → Contas
   de serviço → Gerar nova chave privada* e garanta que essa conta tenha os
   papéis **Firebase Hosting Admin**, **Cloud Datastore User** (ou **Owner**/
   **Editor**) e **Service Usage Consumer** no projeto `viralata`
   (IAM: `console.cloud.google.com/iam-admin/iam?project=viralata`).
3. Atualize o secret `FIREBASE_SERVICE_ACCOUNT` no GitHub com o conteúdo desse
   novo JSON (Settings → Secrets and variables → Actions).
4. Confirme que existe um banco Firestore **nomeado** `viralata` no projeto
   (Firestore usa um banco `(default)` por padrão; este projeto usa um banco
   nomeado — crie-o em *Firestore Database → Criar banco de dados*, ID
   `viralata`, ou via `firebase firestore:databases:create viralata --project viralata`).

Nenhuma dessas ações pode ser feita por push de código — exigem acesso ao
Console do Firebase/Google Cloud do dono do projeto.

---

## Coleções Firestore

| Coleção | Descrição |
|---|---|
| `users` | Perfis de usuários com dados de onboarding |
| `athlete_profiles` | Projeção pública do perfil (diretório), `{uid}` |
| `pets` | Anúncios de pets para adoção |
| `adoption_interests` | Interesses de adotantes (ID: `{petId}_{userId}`) |
| `clubs` | Clubes/organizações da comunidade (rota `/organizacoes`) |
| `club_members` | Vínculo usuário↔clube (ID: `{clubId}_{userId}`) |
| `club_join_requests` | Pedido de ingresso (ID: `{clubId}_{userId}`) |
| `club_member_invites` | Convite de associação (ID: `{clubId}_{userId}`) |
| `club_events` | Eventos do clube (+ subcoleções `dates`, `date_rsvps`, `messages`, `participants`, `games`) |
| `club_event_rsvps` | Presença em evento (legado, nível superior) |
| `event_invites` | Convite/participação em evento (ID: `{eventId}_{userId}`) |
| `club_posts` | Mural do clube |
| `club_forum_threads` | Tópicos de fórum (+ subcoleções `comments`, `poll_votes`) |
| `conversations` | Conversas do chat |
| `conversations/{id}/messages` | Mensagens de cada conversa |
| `notifications` | Notificações em tempo real |
| `abuse_reports` | Denúncias de maus-tratos |
| `audit_logs` | Logs de auditoria (imutáveis) |
| `platform_settings/global` | Doc único com o mapa de feature flags |

> Nota: `organizations`, `organization_members` e `organization_reports`
> (serviço `organizationService.js`) existem no código mas não estão
> conectados a nenhuma rota/UI hoje — a feature de comunidade em produção usa
> as coleções `clubs`/`club_*` acima (serviços `clubService.js`/`forumService.js`).

### Coleções de Abrigo (Shelter/Club)

| Coleção | Descrição |
|---|---|
| `clubs/{clubId}/pets` | Pets do abrigo |
| `clubs/{clubId}/kanban_boards` | Boards do Kanban |
| `clubs/{clubId}/kanban_cards` | Cards do Kanban |
| `clubs/{clubId}/medical_records` | Prontuário médico |
| `clubs/{clubId}/medications` | Medicações |
| `clubs/{clubId}/timeline` | Linha do tempo |
| `clubs/{clubId}/fosters` | Lares temporários |
| `clubs/{clubId}/volunteers` | Voluntários |
| `clubs/{clubId}/ledger_entries` | Livro razão |
| `clubs/{clubId}/reports` | Relatórios |
| `clubs/{clubId}/contracts` | Contratos de adoção |
| `clubs/{clubId}/interviews` | Entrevistas |
| `clubs/{clubId}/exhibitions` | Vitrines/pets em destaque |
| `communities` | Comunidades |
| `communities/{id}/posts` | Posts da comunidade |
| `communities/{id}/chat_threads` | Threads de chat |
| `communities/{id}/events` | Eventos |
| `communities/{id}/forum_threads` | Threads de fórum |

## Feature Flags

O sistema de feature flags usa Firestore + contexto React. Ver [`docs/FLAG_LIFECYCLE.md`](docs/FLAG_LIFECTIME.md) para operação completa.

```js
// Verificar flag no componente
const kanbanEnabled = useFeatureFlag('SHELTER_KANBAN'); // boolean

// Ativar via UI (admin)
// /admin/flags — requer platform_admin
```

---

## PWA

O app é um PWA com Service Worker via `vite-plugin-pwa`. Ver [`docs/PWA_CACHE.md`](docs/PWA_CACHE.md) para detalhes de cache e como invalidar.

```bash
# Após mudar UI/layout/feature flags, bump o SW filename:
# vite.config.js: filename: 'sw-v6.js' → 'sw-v7.js'
# public/registerSW.js: '/sw-v6.js' → '/sw-v7.js'
```

## Cloud Functions

Backend serverless em `functions/` (pacote Node separado). Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) §Firebase.

```bash
# Deployar functions
npm --prefix functions run build
firebase deploy --only functions

# Testar localmente
firebase emulators:start --only functions,firestore
```

## Arquitetura

Ver [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para overview completo:
- Camadas (domain → services → hooks → pages)
- Estado (React Query + Firebase Auth + Feature Flags)
- Design System DS_V2 (tokens semânticos, dark mode)
- Roteamento + guards (ProtectedRoute, AdminRoute, BannedGate)
- Testes (Vitest unit + Firebase emulators)

## Algoritmo de Matching

O algoritmo (`src/modules/pets/domain/matching.js`) é **puro e testável** (sem efeitos colaterais). Ele filtra e pontua pets com base em:

- Compatibilidade de espaço (pátio, tela de proteção)
- Outros animais em casa
- Presença de crianças/idosos
- Orçamento disponível
- Localização (mesma cidade/estado)

Pets com `priority_score > 0` (cadastrados há mais de 90 dias) recebem bônus e aparecem primeiro no feed.

---

## Licença

Proprietário — todos os direitos reservados.
