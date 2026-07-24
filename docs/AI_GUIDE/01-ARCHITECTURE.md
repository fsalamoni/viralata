# 01-ARCHITECTURE.md — Arquitetura do Projeto Viralata

> **Atualizado em 2026-07-24** (revisão completa pós-varredura 2026-07-23)

## §1. Visão Geral

**Viralata** — plataforma web (PWA) de **adoção responsável de pets** no
Brasil. Conecta pessoas e organizações (ONGs/lojas) que têm animais para
doação com adotantes interessados.

- **Firebase Project**: `viralata-4cf0b`
- **Hosting Site**: `viralata` (produção)
- **Firestore DB**: `viralata` (não `(default)`)
- **Região padrão**: `southamerica-east1`
- **UI**: Português (pt-BR)
- **Público-alvo**: Brasil, mobile-first, baixa conectividade

### §1.1. Pilares

1. **Adoção** — feed de pets, matching por compatibilidade, radar,
   denúncia de maus-tratos
2. **Organizações** — ONGs/lojas parceiras, gestão de abrigos
3. **Comunidades** — grupos de usuários independentes
4. **Notificações** — in-app + FCM push
5. **Auditoria** — toda ação admin fica registrada

---

## §2. Stack Técnico

### §2.1. Frontend

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 18 | UI library |
| Vite | 6.4.2 | Build tool (substitui CRA) |
| React Router | 6 | Roteamento client-side |
| Tailwind CSS | 3 | Utility-first CSS |
| shadcn/ui | latest | Componentes primitivos (Radix-based) |
| Framer Motion | latest | Animações (lazy em alguns lugares) |
| React Query | 5 | Server state, cache, mutations |
| Zod | 3 | Schema validation |
| Lucide React | latest | Ícones |
| Sonner | latest | Toasts |

### §2.2. Backend (Firebase)

| Serviço | Uso |
|--------|-----|
| Auth | Google OAuth |
| Firestore | Database NoSQL (DB `viralata`) |
| Storage | Imagens de pets, logos de ONGs, banners de parceiros |
| Hosting | Site `viralata.web.app` |
| Cloud Functions | Functions server-side (ranking, busca index, FCM) |
| FCM | Push notifications |

### §2.3. Testes

| Ferramenta | Uso |
|-----------|-----|
| Vitest | Test runner |
| @testing-library/react | Render testing |
| Playwright | E2E (opcional) |
| jsdom | DOM emulation |

---

## §3. Camadas da Aplicação

```
┌─────────────────────────────────────────────┐
│            UI (React + Tailwind)              │
├─────────────────────────────────────────────┤
│          Pages (wrappers V1/V3)               │
│  src/pages/*.jsx                            │
├─────────────────────────────────────────────┤
│         Components (60+ UI)                   │
│  src/components/                            │
├─────────────────────────────────────────────┤
│       Modules (15 features)                   │
│  src/modules/{pets,organizations,...}       │
│  ├── components/                             │
│  ├── hooks/                                  │
│  ├── services/                               │
│  └── domain/                                 │
├─────────────────────────────────────────────┤
│          Core (shared)                        │
│  src/core/                                  │
│  ├── config/ (firebase.js)                  │
│  ├── hooks/ (useAuth, useToast, etc)         │
│  ├── services/ (auth, audit, error)          │
│  ├── pwa/ (register, cleanup, sw)           │
│  └── observability/ (logger)                 │
├─────────────────────────────────────────────┤
│        Firestore (DB viralata)                │
│  + Cloud Functions (server-side)             │
└─────────────────────────────────────────────┘
```

### §3.1. Responsabilidades de cada camada

- **UI**: Componentes React puros, sem lógica de negócio
- **Pages**: Wrappers que decidem V1 vs V3 via feature flag
- **Components**: Reutilizáveis, sem acesso direto ao Firestore
- **Modules**: Lógica de domínio + Firestore. Cada módulo é self-contained
- **Core**: Compartilhado entre módulos (auth, errors, pwa)
- **Firestore**: Database. Cloud Functions server-side.

---

## §4. Roteamento (App.jsx)

79 rotas registradas. Ver `04-PAGES-ROUTES.md` para lista completa.

### §4.1. Estrutura de uma rota

```jsx
<Route path="/pets/:id" element={withLayout('PetDetail', PetDetail)} />
<Route path="/admin/users" element={<PlatformAdminRoute><AdminUsers /></PlatformAdminRoute>} />
<Route path="/organizacoes/:id/admin" element={
  <ProtectedRoute>
    {withLayout('OrgAdmin', OrganizationAdminPanel)}
  </ProtectedRoute>
} />
```

### §4.2. Guards

- `PlatformAdminRoute` — só platform_admin
- `ProtectedRoute` — user autenticado + profile completo
- `withLayout(name, Component)` — aplica TopBar/BottomTabBar/Footer
- (futuro) `PetAdminRoute` — admin do pet específico

### §4.3. Redirects canônicos

- `/inicio` → `/feed`
- `/clubes` → `/comunidade`
- `/atletas` → `/feed`
- `*` → PageNotFound

---

## §5. Design System

> Ver `05-DESIGN-SYSTEM.md` para detalhes.

- **Paleta**: terracota (primary), creme (background), oliva (accent),
  mostarda (highlight). NÃO usar cores literais do Tailwind.
- **Tipografia**: Manrope (UI), JetBrains Mono (code).
- **Espaçamento**: múltiplos de 4px.
- **Raios**: 8px (sm), 12px (md), 16px (lg), 24px (xl).
- **Tokens semânticos**: `bg-primary`, `text-foreground`, `text-muted-foreground`.

---

## §6. PWA (Service Worker)

> Ver `06-PWA-CACHE.md` para detalhes completos.

- **SW atual**: `sw-v73.js` (12825 bytes, deployed)
- **Strategy**: GenerateSW (vite-plugin-pwa) + workbox
- **Precache**: 211 entries (~6.5MB)
- **skipWaiting**: true (workbox)
- **clientsClaim**: true (workbox)
- **Cleanup**: manual via `unregisterStaleAndMaybeReload()` no boot

### §6.1. Bump de SW

SEMPRE que mexer em UI, bumpar:

```js
// vite.config.js
filename: 'sw-vN.js'  →  filename: 'sw-vN+1.js'

// registerPwa.js
const swUrl = `sw-vN+1.js`  →  `sw-vN+1.js`

// cleanupStaleCaches.js
const STALE_SW_NAMES = [
  'sw.js', 'sw-v1.js', ..., 'sw-vN.js'  // adiciona vN
];
```

### §6.2. HOTFIX-005 (nuclear reset)

Para browsers com SW **legacy** (v0-v5 ou `sw.js` sem versão), o sistema
faz nukeAllCaches + reload. Flag `hotfix-005-reload` no sessionStorage
evita loop infinito.

---

## §7. Firestore

> Ver `02-DATA-MODEL.md` para schema completo e `07-FIRESTORE-RULES.md`
> para regras.

### §7.1. Helpers em `firestore.rules`

- `isAuth()`: user autenticado
- `isOwner(userId)`: `request.auth.uid == userId`
- `isPlatformAdmin()`: role no Firestore
- `isContractAdopter(contractData)`: user é adotante do contrato
- `isClubOwnerOrAdmin(clubId)`: user é owner/admin da ONG
- `canEditClubPets(clubId)`: user tem permissão de animais
- `hasClubPermission(clubId, perm)`: user tem permissão específica

### §7.2. Defense-in-Depth

Toda escrita segue o padrão:
1. **UI**: esconde botão se user não tem permissão
2. **Hook**: valida permissão antes de chamar service
3. **Service**: re-valida (ensureCanMutatePet, etc)
4. **Firestore Rules**: bloqueio final

NUNCA confiar só no client.

---

## §8. Testes

> Ver `08-TESTING.md` para padrões.

### §8.1. Tipos de Teste

| Tipo | Quando usar | Exemplo |
|------|------------|---------|
| Unit | Lógica pura | `petLogService.test.js` |
| Integration | Hook + service | `usePetPermissions.test.js` |
| Runtime | Render de componente | `PetDetailV3.runtime.test.jsx` |
| Schema | Zod schemas | `acceptVolunteerTermsSchema` |

### §8.2. Padrão de Runtime Test

```jsx
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { uid: 'u1' }, isAuthenticated: true })),
}));

import MyComponent from './MyComponent';
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('MyComponent — runtime safety', () => {
  it('renders without throwing', () => {
    expect(() => {
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter><MyComponent /></MemoryRouter>
        </QueryClientProvider>
      );
    }).not.toThrow();
  });
});
```

### §8.3. Comandos

```bash
npx vitest run src/modules/pets       # Módulo específico
npx vitest run                         # TODOS
npx vitest run -t "specific test"      # Test específico
```

---

## §9. CI/CD

> Ver `09-DEPLOY.md` para detalhes.

### §9.1. Workflows (`.github/workflows/`)

- `deploy.yml` — push em main → build + test + deploy Firebase
- `scrum-sync.yml` — auto-sync do SCRUM_TASKS.json
- `scrum-topbar.yml` / `scrum-topbar-finalizer.yml` — post-deploy

### §9.2. Secrets necessários (GitHub)

- `FIREBASE_SERVICE_ACCOUNT` (JSON)
- `FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (opcional)

---

## §10. Performance

### §10.1. Métricas atuais (2026-07-23)

- **Total dist/**: 6.9MB
- **Chunks**: 194
- **Maior chunk**: `vendor-Dcmich-o.js` (1.7MB)
- **Service Worker**: `sw-v73.js` (12825 bytes)
- **Precache SW**: 211 entries (6.5MB)

### §10.2. Otimizações aplicadas

- **Code splitting**: 194 chunks via Vite
- **Lazy loading**: rotas via `React.lazy()`
- **Image optimization**: WebP, lazy load
- **Bundle analysis**: `vite-bundle-visualizer` (configurado)

### §10.3. Áreas para melhorar

- Tree-shaking de Framer Motion (apenas onde é usado)
- Code-split de Moment.js (se houver)
- Substituir `react-firebase-hooks` por `react-query-firebase` ou similar

---

## §11. Segurança

### §11.1. Camadas (defense-in-depth)

1. **UI**: esconde controles
2. **Hook**: valida permissão
3. **Service**: re-valida com helper
4. **Firestore Rules**: bloqueio final

### §11.2. LGPD (Lei Geral de Proteção de Dados)

- Aceite de termos (Lei 14.063/2020) — `termsAcceptances/`
- Aceite canônico imutável (audit log)
- Document hash (SHA-256) para detectar adulteração
- PII minimizado (email aparece só como domínio, phone mascarado)
- Direito ao esquecimento: delete via `platform_admin` apenas

### §11.3. Auditoria

- `audit_logs/{logId}` — toda ação admin
- `terms_acceptances/{logId}` — aceite de termos
- `pet_audit_log/{logId}` — log imutável de mudanças em pets
- `volunteer_audit_trail/{logId}` — log de voluntários

---

## §12. Diagrama de Fluxo (User → Pet Adoption)

```
1. User acessa viralata.web.app
2. Service Worker v73 carrega (cache + network)
3. React renderiza com TopBar + BottomTabBar
4. User navega para /feed
5. usePet() hook faz query em pets/ (status=available)
6. Feed renderiza com filtros client-side (espécie, porte, cidade, raio)
7. User clica em um pet → /pet/:id
8. PetDetailView carrega (página PÚBLICA, sem admin)
9. User clica "Quero adotar" → /quero-adotar/:petId (wizard)
10. Wizard coleta: dados, ambiente, experiência
11. User completa → submit para Firestore (interests/)
12. ONG recebe notificação
13. ONG aprova/rejeita
14. User é notificado
15. Adoção concluída → /adoptions (pós-adoção)
16. User pode dar rating, ver devoluções
```

---

**Próxima leitura**: `02-DATA-MODEL.md` (schema do Firestore).
