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
Componentes nunca chamam Firestore direto; passam por hooks/services. Lógica
de negócio (compatibilidade de match, prioridade do feed, enquetes) vive em
`domain/` e é coberta por testes — é o que dá confiança sem ambiente de
execução. Nem todo módulo tem todas as camadas (ex.: `onboarding/` e
`reports/` são simples o bastante para não ter `domain/`).

## Estado e dados

- **Servidor**: React Query é a fonte de verdade do dado remoto. `QueryClient`
  em `App.jsx` (`staleTime: 30s`, `refetchOnWindowFocus: false`, `retry: 2`).
  Hooks invalidam queries relacionadas após mutações.
- **Sessão/identidade**: `FirebaseAuthContext` (Context API) — `useAuth()`.
- **Feature flags**: `FeatureFlagsContext` lê `platform_settings/global` e
  expõe as flags de `core/featureFlags.js` (hoje só `AD_SLOTS`).
- **UI local**: `useState`/`react-hook-form`. Sem Redux/Zustand.
- **Realtime**: leituras pontuais com `onSnapshot` onde faz sentido (ex.:
  chat, mural do feed); o resto é fetch + invalidação via React Query.

## Design system

- **Tailwind** + **shadcn/ui** (componentes Radix em `src/components/ui/`).
  Use os primitivos existentes (`Button`, `Dialog`, `DropdownMenu`, `Badge`,
  `Tabs`, `Select`, `Toast`/`sonner`…) — não reinvente.
- **Tokens semânticos** (CSS custom properties em `src/index.css`, mapeados
  no `tailwind.config.js`): `primary` (terracota), `secondary`/`muted`
  (creme), `accent` (oliva), `highlight` (mustarda), `destructive`. Classes
  como `bg-primary`, `text-foreground`, `text-muted-foreground`. **Nunca**
  use cores literais do Tailwind (`orange-500`, `bg-gray-50`, `emerald-600`…)
  — ver `docs/DESIGN_SYSTEM.md` para a paleta completa e o racional.
- Classes utilitárias reaproveitáveis em `index.css`: `.arena-page`,
  `.arena-panel`, `.arena-panel-strong`, `.arena-heading`, `.arena-chip` —
  dão o efeito de vidro/gradiente padrão da plataforma.
- `framer-motion` para entrada/hover e revelação em scroll (`whileInView`,
  `viewport={{ once: true }}`) — usado com moderação (ver princípios de
  motion em `docs/DESIGN_SYSTEM.md`), não em toda lista.
- `cn()` (`core/lib/utils`) para compor classes (clsx + tailwind-merge).
- **Layout** (`src/components/Layout.jsx`): shell — header com navegação,
  sino de notificações, menu de usuário. Páginas públicas "standalone"
  ainda passam pelo mesmo `Layout` (ver `withLayout()` em `App.jsx`).
- Ícones: `lucide-react`. Datas: `date-fns`.

## Firebase

- `core/config/firebase.js` inicializa app, Auth, Firestore, Storage e
  Functions. **Database nomeada** `viralata` (não a `(default)`), via
  `getFirestore(app, 'viralata')`.
- Quase sem backend próprio: **a maioria das regras de acesso vive em
  `firestore.rules`**. Qualquer nova coleção precisa de regra
  correspondente, escrita de forma **aditiva** (não relaxar nem quebrar
  coleções existentes). Validar mudanças com o emulador local antes de
  commitar (`firebase emulators:start --only firestore`).
- **Cloud Functions** (`functions/`, pacote Node separado): único gatilho
  de servidor, usado só onde o client genuinamente não consegue resolver
  (reagir à criação de pets de *qualquer* usuário para o Radar de Pets). Ver
  `docs/AI_CONTEXT.md` seção 8. Não adicione lógica de negócio geral aqui —
  é a exceção, não o padrão da casa.
- `core/services/baseService.js` concentra helpers comuns de acesso.
- `auditService` grava `audit_logs` com `{ action, actor, details, created_at }`
  — chamado após mutações relevantes. Coleção imutável (sem update/delete).
- `observabilityService` registra page views (`recordPageView` em `App.jsx`).
- `storageService` para upload de imagens/anexos (`uploads/{uid}/{folder}/...`).
- `dataExportService` / `deleteAccountService`: exportação e exclusão de
  dados do próprio usuário (LGPD), acionados a partir de `pages/Profile.jsx`.

## Roteamento

- `react-router-dom` (BrowserRouter), `basename = import.meta.env.BASE_URL`.
- Páginas via `React.lazy` + `Suspense` (code splitting).
- Guards: `ProtectedRoute` (exige auth), `OnboardedRoute` (auth + perfil
  completo), `AdminRoute` (exige `platform_admin`), `BannedGate` (bloqueia
  usuário banido globalmente, envolvendo todas as rotas).

## PWA

- Manifest e ícones em `public/` com a identidade visual da Viralata (paw
  print terracota). Service worker via `vite-plugin-pwa` (`generateSW`).
- Sem flag de ativação — a PWA é parte padrão do build de produção.

## Testes

- **Vitest** (unit) — foco no `domain/` de cada módulo (match de
  compatibilidade, prioridade do feed, enquetes de fórum, conversas) e nos
  serviços puros (`metricsService`). ~61 testes no app; `functions/` tem
  suíte própria (`npm --prefix functions test`) cobrindo a cópia de
  `isCompatible()` usada pela Cloud Function.
- **Playwright** — usado ad-hoc para QA visual (screenshots de páginas
  durante o desenvolvimento), sem suíte de E2E fixa no repositório hoje.
- Convenção: cada arquivo puro de domínio tem `*.test.js` ao lado.
- Antes de qualquer push: `npm run lint && npm run build && npm test`
  (e `npm --prefix functions test` se `functions/` mudou).

## CI/CD

- `.github/workflows/deploy.yml` ("Deploy Viralata → Firebase Hosting") — em
  push para `main`: instala dependências do app e das Functions, roda os
  testes de ambos, builda o app e faz deploy no Firebase Hosting (site
  `viralata`) e nas Cloud Functions. Em PRs, gera um preview channel.
- Regras do Firestore/Storage **não** são publicadas por este workflow —
  publique manualmente (`firebase deploy --only firestore:rules,storage`)
  após validar no emulador.
- Variáveis de build: `VITE_FIREBASE_*`, `VITE_FIRESTORE_DATABASE_ID`. Ver
  `.env.example`.

## Convenções de código

- Import alias `@/` → `src/`.
- JS + JSDoc; typedefs compartilhados em `core/domain/types.js`; `npm run typecheck`.
- `logger` (`core/lib/logger`) em vez de `console` nos services.
- Mensagens e UI em **pt-BR**.
- Commits descritivos (Conventional Commits: `feat(...)`, `fix(...)`, `docs(...)`).
