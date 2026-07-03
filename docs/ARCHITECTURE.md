# ARCHITECTURE

> Como o código é organizado e por quê. Para o panorama, leia
> `docs/AI_CONTEXT.md` primeiro.

## Camadas (por módulo de domínio)

```
domain/      lógica pura, sem React nem Firebase — sempre com .test.js
services/    I/O com Firestore (CRUD) + auditoria; sem regra de negócio pesada
hooks/       React Query (useQuery/useMutation) sobre os services
pages/       telas mapeadas a rotas
components/  UI específica do módulo (tabs, dialogs, painéis)
```

Regra: a dependência flui só para baixo (`pages → hooks → services → domain`).
Componentes nunca chamam Firestore direto; passam por hooks/services. Lógica de
negócio (matching de adoção, prioridade de espera, permissões de organização,
mapeamento de planilha de animais) vive em `domain/` e é coberta por testes —
é o que dá confiança sem ambiente de execução.

## Estado e dados

- **Servidor**: React Query é a fonte de verdade do dado remoto. `QueryClient`
  em `App.jsx` (`staleTime: 30s`, `refetchOnWindowFocus: false`). Hooks
  invalidam queries relacionadas após mutações (ex.: criar organização
  invalida `['clubs']`/`['my-clubs']`).
- **Sessão/identidade**: `FirebaseAuthContext` (Context API) — `useAuth()`.
- **UI local**: `useState`/`react-hook-form`. Sem Redux/Zustand.
- **Realtime**: `onSnapshot` onde faz sentido (notificações, chat, mural de
  organização, contagem de não lidos); o resto é fetch + invalidação do
  React Query.
- **Exceção notável**: `modules/notifications/hooks/useNotifications.js` é um
  hook próprio (não React Query) com `onSnapshot` interno — não devolve
  `{ data }`, devolve `{ notifications, unreadCount, isLoading, markAsRead }`.

## Design system

- **Tailwind** + **shadcn/ui** (componentes Radix em `src/components/ui/`).
  Use os primitivos existentes (`Button`, `Dialog`, `DropdownMenu`, `Badge`,
  `Tabs`, `Select`, `Toast`/`sonner`…) — não reinvente.
- `cn()` (`core/lib/utils`) para compor classes (clsx + tailwind-merge).
- **Layout** (`src/components/Layout.jsx`): shell autenticado — header glass
  sticky, nav pill central (desktop), menu mobile em dropdown, sino de
  notificações (`NotificationsMenu`), menu de usuário/avatar. Páginas
  públicas "standalone" (Home, Login, Onboarding) renderizam fora do shell
  (`STANDALONE_PAGES` em `Layout.jsx`).
- Identidade visual "terracota/creme/oliva" (ver `docs/DESIGN_SYSTEM.md`)
  via tokens CSS em `src/index.css` — os **nomes** das variáveis shadcn
  padrão (`--primary`, `--secondary`, `--accent`…) não mudam, só os valores.
- `framer-motion` para scroll-reveal e hover-lift sutis, sempre respeitando
  `prefers-reduced-motion`.
- Ícones: `lucide-react`. Datas: `date-fns` / `date-fns-tz` (fuso BRT).

## Firebase

- `core/config/firebase.js` inicializa app, Auth e Firestore. **Database
  nomeada** `viralata` (não a `(default)`), via `getFirestore(app, dbId)` —
  configurável por `VITE_FIRESTORE_DATABASE_ID`.
- Sem backend próprio / Cloud Functions para a maior parte do app: **todas
  as regras de acesso vivem em `firestore.rules`**. Qualquer nova coleção
  precisa de regra correspondente, escrita de forma **aditiva** (não relaxar
  nem quebrar coleções existentes). Exceção: `functions/` tem uma única
  Cloud Function de apoio para o Radar de Pets (alerta assíncrono).
- `core/services/baseService.js` concentra helpers comuns de acesso.
- `auditService` grava `audit_logs` com `{ action, actor, details,
  created_at }` — chamado após mutações relevantes. Rótulos legíveis em
  `AUDIT_ACTION_LABELS`, exibidos em `/admin/auditoria`
  (`AuditLogTable.jsx`).
- `observabilityService` registra page views (`recordPageView` em `App.jsx`).
- `storageService` para upload de imagens (pets, denúncias, mural, avatar).
- `platformSettingsService` para feature flags globais (doc único
  `platform_settings/global`).

## Roteamento

- `react-router-dom` (BrowserRouter), `basename = import.meta.env.BASE_URL`.
- Páginas via `React.lazy` + `Suspense` (code splitting) — ver tabela
  completa de rotas em `docs/AI_CONTEXT.md`.
- Guards: `ProtectedRoute` (exige auth), `AdminRoute` (exige
  `platform_admin`), `BannedGate` (bloqueia usuário banido).
- `/organizacoes` (hub de gestão, autenticado) e `/comunidade` (diretório
  público) são rotas irmãs sobre o mesmo domínio de organizações — ver
  `docs/MODULES.md`. Rotas legadas (`/organizacoes/:orgId` e
  `/organizacoes/:orgId/eventos/:eventId`, do tempo em que `/organizacoes`
  era o diretório) redirecionam para `/comunidade/...` em vez de quebrar
  links de notificações antigas.

## PWA (opcional, aditivo)

- Atrás da flag `VITE_PWA_ENABLED` (desligada por padrão). Desligada:
  `registerPwa()` desregistra qualquer service worker existente e o botão
  de instalação some — **zero impacto**.
- Ligada (apenas build de produção, nunca em DEV): registra
  **`public/sw.js`** — um service worker próprio, escrito à mão (não é o
  Workbox auto-gerado pelo `vite-plugin-pwa`, que também roda no build via
  `generateSW` mas serve outro propósito de cache; o SW registrado de fato
  pelo app é sempre `public/sw.js`, copiado verbatim para `dist/sw.js` pelo
  Vite). Estratégia: navegação em network-first com fallback offline para o
  shell; assets com hash em cache-first; nunca intercepta tráfego
  cross-origin (Firebase/Google).
- Ícones gerados por `scripts/generate-pwa-icons.mjs` (saída em `public/`).
- Headers de cache em `firebase.json`: assets imutáveis (1 ano);
  `index.html`/`sw.js`/manifest com `no-cache`.

## Testes

- **Vitest** (unit) — foco no `domain/` de cada módulo (matching de adoção,
  prioridade de espera, permissões de organização, importação de planilha,
  enquetes de fórum). 80 testes.
- **Playwright** (E2E) — `npm run e2e` (instalar com `npm run e2e:install`);
  hoje cobre só fumaça de páginas públicas
  (`tests/e2e/public-routes.spec.js`), não roda em CI.
- Convenção: cada arquivo puro de domínio tem `*.test.js` ao lado.
- Antes de qualquer push: `npm run lint && npm run build && npm test`.

## CI/CD

- `.github/workflows/deploy.yml` — em push para `main`: build e deploy no
  Firebase Hosting (site `viralata`) + publicação das regras do Firestore.
- Variáveis de build: `VITE_FIREBASE_*`, `VITE_FIRESTORE_DATABASE_ID`,
  flags de analytics/performance/PWA. Ver `.env.example`.

## Convenções de código

- Import alias `@/` → `src/`.
- JS + JSDoc; typedefs compartilhados em `core/domain/types.js`; `npm run typecheck`.
- `logger` (`core/lib/logger`) em vez de `console` nos services.
- Mensagens e UI em **pt-BR**.
- Commits descritivos (Conventional Commits: `feat(...)`, `fix(...)`, `docs(...)`).
