# 08-TESTING.md — Padrões de Teste, Runtime Tests

> **Atualizado em 2026-07-24**

## §1. Visão Geral

- **Total test files**: 189
- **Total tests passing**: ~1700+
- **Framework**: Vitest + @testing-library/react
- **Runtime tests**: 30+ arquivos
- **Coverage areas**:
  - `core/pwa` ✅ 12 tests
  - `core/services` ✅ 141 tests
  - `core/hooks` ✅ ~50 tests
  - `modules/pets` ✅ 190 tests
  - `modules/organizations` ✅ 159 tests
  - `modules/communities` ✅ 104 tests
  - `modules/shelter` ✅ ~800 tests
  - `modules/admin` ✅ 57 tests
  - `modules/partners` ✅ 19 tests
  - `components` ✅ 165 tests
  - `core/permissions` ⚠️ 0 tests (gap)
  - `modules/adopter` ⚠️ 2 tests (gap)
  - `modules/reports` ⚠️ 0 tests (gap)

## §2. Tipos de Teste

### §2.1. Unit Test (lógica pura)

```js
// src/modules/pets/services/petLogService.test.js
import { describe, it, expect, vi } from 'vitest';
import { buildPetLogEntry } from './petLogService';

describe('buildPetLogEntry', () => {
  it('creates a log entry with actor and action', () => {
    const entry = buildPetLogEntry({
      action: 'pet_created',
      actor: { uid: 'u1', display_name: 'Alice' },
      target: { collection: 'pets', doc_id: 'p1' },
      details: {},
    });
    expect(entry).toMatchObject({
      action: 'pet_created',
      actor: { uid: 'u1' },
      created_at: expect.any(Number),
    });
  });
});
```

### §2.2. Hook Test (React Query)

```js
// src/modules/pets/hooks/usePet.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { usePet } from './usePet';

vi.mock('../services/petService', () => ({
  getPet: vi.fn(() => Promise.resolve({ id: 'p1', name: 'Rex' })),
}));

describe('usePet', () => {
  it('fetches pet by id', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => usePet('p1'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ id: 'p1', name: 'Rex' });
  });
});
```

### §2.3. Runtime Test (Render de Componente) ★ IMPORTANTE

> **D-PET-DETAIL-RUNTIME-TEST**: para CADA página/componente crítico,
> criar `*.runtime.test.jsx` que renderiza com dados mockados. Static
> analysis + imports tests não substituem runtime tests.

```jsx
// src/modules/pets/pages/PetDetailV3.runtime.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'u1', display_name: 'Alice' },
    isAuthenticated: true,
  })),
}));

vi.mock('../hooks/usePet', () => ({
  usePet: vi.fn(() => ({
    data: {
      id: 'p1',
      name: 'Rex',
      photo_url: 'https://example.com/rex.jpg',
      species: 'dog',
      gender: 'male',
      size: 'medium',
    },
    isLoading: false,
    error: null,
  })),
}));

import PetDetailV3 from './PetDetailV3';

describe('PetDetailV3 — runtime safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without throwing', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    expect(() => {
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter initialEntries={['/pets/p1']}>
            <Routes>
              <Route path="/pets/:id" element={<PetDetailV3 />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    }).not.toThrow();
  });

  it('displays pet name', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={['/pets/p1']}>
          <Routes>
            <Route path="/pets/:id" element={<PetDetailV3 />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(await screen.findByText('Rex')).toBeInTheDocument();
  });
});
```

### §2.4. Schema Test (Zod)

```js
// src/modules/shelter/domain/volunteerTerms.test.js
import { describe, it, expect } from 'vitest';
import { acceptVolunteerTermsSchema } from './volunteerTerms';

describe('acceptVolunteerTermsSchema', () => {
  it('accepts valid input', () => {
    const input = {
      terms_version: '2026-07-10',
      document_hash: 'a'.repeat(64),
      signature_text: 'Alice',
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    };
    expect(() => acceptVolunteerTermsSchema.parse(input)).not.toThrow();
  });

  it('rejects missing signature', () => {
    const input = {
      terms_version: '2026-07-10',
      document_hash: 'a'.repeat(64),
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    };
    expect(() => acceptVolunteerTermsSchema.parse(input)).toThrow();
  });
});
```

### §2.5. Service Test (Firestore mocks)

```js
// src/modules/shelter/services/searchService.test.js
import { describe, it, expect, vi } from 'vitest';
import { searchFosters } from './searchService';

vi.mock('@/core/config/firebase', () => ({
  db: { _mock: true },
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, ...path) => ({ _path: path })),
  getDocs: vi.fn(() => Promise.resolve({
    docs: [
      { id: 'f1', data: () => ({ full_name: 'John Doe' }) },
    ],
  })),
}));

describe('searchFosters', () => {
  it('queries search_fosters denormalized collection', async () => {
    const result = await searchFosters('c1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'f1', full_name: 'John Doe' });
  });
});
```

## §3. Padrões de Mock

### §3.1. Mockar Firebase

```js
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
}));

vi.mock('@/core/config/firebase', () => ({
  db: { _mock: true },
  storage: { _mock: true },
  auth: { _mock: true },
}));
```

### §3.2. Mockar Auth

```js
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'u1', display_name: 'Alice', email: '[email protected]' },
    isAuthenticated: true,
  })),
}));
```

### §3.3. Mockar useNavigate

```js
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});
```

## §4. Comandos

```bash
# Rodar todos os testes
npx vitest run

# Rodar teste específico
npx vitest run src/modules/pets

# Rodar teste por nome
npx vitest run -t "PetDetailV3"

# Watch mode
npx vitest

# Coverage
npx vitest run --coverage

# Test E2E
npx playwright test
```

## §5. Vitest Config (vitest.config.js)

```js
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

## §6. Coverage Targets

| Tipo | Target |
|------|--------|
| Services | 80% |
| Hooks | 70% |
| Components | 50% |
| Pages | 30% (apenas runtime tests) |
| Utils | 90% |

## §7. Regras Importantes

### §7.1. SEMPRE criar runtime test para componentes críticos

> **D-PET-DETAIL-RUNTIME-TEST**: Static analysis + imports tests não
> substituem runtime tests. Variáveis undefined em escopo (como `canEdit`
> → `canEditHistory` bug do sw-v73.3) só são pegas com render real.

### §7.2. SEMPRE usar `.default` em dynamic imports

```js
// ✅ Correto
const Component = (await import('./MyComponent')).default;

// ❌ Errado (se o componente só tem export default)
const Component = await import('./MyComponent');
```

### §7.3. NUNCA misturar `import` e `require` no mesmo `.test.jsx`

```js
// ✅ Correto
import { myFunction } from './myService';
import { describe, it, expect } from 'vitest';

// ❌ Errado
const { myFunction } = require('./myService');  // CJS quebra suite
```

### §7.4. SEMPRE atualizar testes ao adicionar coleção denormalizada

```js
// ❌ Errado (TASK-312 introduziu search_fosters)
expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'fosters');

// ✅ Correto
expect(mockCollection).toHaveBeenCalledWith(mockDb, 'clubs', 'c1', 'search_fosters');
```

### §7.5. SEMPRE atualizar testes ao renomear prop

```jsx
// ❌ Errado
<ErrorState message="Erro" />

// ✅ Correto (após renomeação message → title/description)
<ErrorState title="Erro" description="Tente novamente" />
```

## §8. Teste Manual em Produção

### §8.1. Antes de declarar "task concluída"

1. ✅ `npx vitest run` — todos os testes passing
2. ✅ `npx vite build` — build OK
3. ✅ `node scripts/validate-lucide-imports.mjs` — ícones OK
4. ✅ `curl -m 10 -s https://viralata.web.app/sw-vN.js` — SW deployed
5. ✅ `curl -m 10 -s https://viralata.web.app/ | grep index` — bundle deployed
6. ✅ Navegar manualmente em `viralata.web.app/<rota>`

## §9. Coverage Gaps (TODO)

| Módulo | Atual | Target | Plano |
|--------|-------|--------|-------|
| `core/permissions` | 0 | 80% | Adicionar tests para `canManage`, `isOwner`, `isPlatformAdmin` |
| `modules/adopter` | 2 | 60% | Adicionar tests para fluxo de adoção público |
| `modules/reports` | 0 | 70% | Adicionar tests para criação e listagem de denúncias |
| `core/ads` | 5 | 50% | Mais tests para ad policy |

---

**Próxima leitura**: `09-DEPLOY.md` (CI/CD, deploy).
