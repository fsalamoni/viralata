# 🐾 Viralata — Plataforma de Adoção Responsável de Pets

> Site: [viralata.web.app](https://viralata.web.app)

## Sobre

O **Viralata** é uma plataforma PWA (Progressive Web App) de marketplace de adoção de pets. Conecta animais que precisam de um lar com famílias que têm amor para dar. **Não há venda de animais** — apenas doações responsáveis.

A plataforma é baseada na arquitetura do [PickleTour](https://pickletour.web.app), reutilizando o core de Firebase, chat em tempo real, notificações e sistema de organizações.

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
VITE_FIREBASE_DATABASE_ID=(default)
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
| `VITE_FIREBASE_DATABASE_ID` | Database ID |

---

## Coleções Firestore

| Coleção | Descrição |
|---|---|
| `users` | Perfis de usuários com dados de onboarding |
| `pets` | Anúncios de pets para adoção |
| `adoption_interests` | Interesses de adotantes (ID: `{petId}_{userId}`) |
| `organizations` | ONGs e lojas parceiras |
| `organization_members` | Membros de organizações (ID: `{orgId}_{userId}`) |
| `organization_reports` | Prestação de contas das organizações |
| `conversations` | Conversas do chat |
| `conversations/{id}/messages` | Mensagens de cada conversa |
| `notifications` | Notificações em tempo real |
| `abuse_reports` | Denúncias de maus-tratos |
| `audit_logs` | Logs de auditoria (imutáveis) |
| `feature_flags` | Flags de funcionalidades |

---

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
