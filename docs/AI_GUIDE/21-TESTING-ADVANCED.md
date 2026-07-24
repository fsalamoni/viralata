# 21-TESTING-ADVANCED.md — Padrões de Teste Avançados

> **Atualizado em 2026-07-24**
>
> Complementa `08-TESTING.md` com padrões avançados para casos
> complexos: async, errors, mocking, performance.

## §1. Testes de Async/Await

### §1.1. Async básico

```js
import { describe, it, expect, vi } from 'vitest';

it('fetches data', async () => {
  const data = await fetchSomething();
  expect(data).toEqual({ id: 1, name: 'Test' });
});
```

### §1.2. Async com timeout

```js
it('fetches within 1s', async () => {
  const start = Date.now();
  await fetchSomething();
  const duration = Date.now() - start;
  expect(duration).toBeLessThan(1000);
});
```

### §1.3. Async com rejeição

```js
it('throws on 404', async () => {
  await expect(fetchInvalid()).rejects.toThrow('Not found');
});

// OU com try/catch
it('throws on 404 (alternative)', async () => {
  let error;
  try {
    await fetchInvalid();
  } catch (e) {
    error = e;
  }
  expect(error).toBeDefined();
  expect(error.message).toContain('Not found');
});
```

### §1.4. Promises paralelas

```js
it('fetches in parallel', async () => {
  const [pet, owner, shelter] = await Promise.all([
    getPet('p1'),
    getUser('u1'),
    getClub('c1'),
  ]);
  expect(pet.id).toBe('p1');
  expect(owner.uid).toBe('u1');
});
```

### §1.5. Retry / flaky

```js
it('eventually succeeds (with retry)', async () => {
  let attempt = 0;
  const result = await retry(() => {
    attempt++;
    if (attempt < 3) throw new Error('temporary');
    return 'success';
  }, { retries: 5 });
  expect(result).toBe('success');
  expect(attempt).toBe(3);
});
```

## §2. Mocking Avançado

### §2.1. Mock parcial

```js
import { vi } from 'vitest';
import * as utils from './utils';

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,  // mantém exports originais
    formatDate: vi.fn(() => '2026-07-24'),  // mocka só este
  };
});

import { formatDate } from './utils';

it('uses mocked formatDate', () => {
  expect(formatDate()).toBe('2026-07-24');
});
```

### §2.2. Mock por condição

```js
vi.mock('./api', () => ({
  fetch: vi.fn(),
}));

import { fetch } from './api';

it('returns success', async () => {
  fetch.mockResolvedValueOnce({ data: 'ok' });
  // ...
});

it('returns error', async () => {
  fetch.mockRejectedValueOnce(new Error('Network error'));
  // ...
});
```

### §2.3. Mock com implementação dinâmica

```js
const mockFn = vi.fn((x) => x * 2);

it('mocks with implementation', () => {
  expect(mockFn(5)).toBe(10);
  expect(mockFn).toHaveBeenCalledWith(5);
});
```

### §2.4. Spy em método existente

```js
import * as firebase from 'firebase/firestore';

it('spies on getDoc', async () => {
  const spy = vi.spyOn(firebase, 'getDoc').mockResolvedValue({
    exists: () => true,
    data: () => ({ id: 'p1' }),
  });
  
  const result = await getPet('p1');
  
  expect(spy).toHaveBeenCalledWith(
    expect.objectContaining({ id: 'pets/p1' })
  );
  expect(result).toEqual({ id: 'p1' });
  
  spy.mockRestore();
});
```

### §2.5. Mock de timers

```js
import { vi } from 'vitest';

it('runs setTimeout', () => {
  vi.useFakeTimers();
  
  const fn = vi.fn();
  setTimeout(fn, 1000);
  
  expect(fn).not.toHaveBeenCalled();
  
  vi.advanceTimersByTime(1000);
  expect(fn).toHaveBeenCalled();
  
  vi.useRealTimers();
});
```

### §2.6. Mock de Date

```js
it('uses fixed date', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));
  
  const now = new Date();
  expect(now.toISOString()).toBe('2026-07-24T12:00:00.000Z');
  
  vi.useRealTimers();
});
```

## §3. Error Boundaries

### §3.1. Testar ErrorBoundary

```jsx
import { ErrorBoundary } from './ErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

it('catches error', () => {
  // Suppress console.error
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/Algo deu errado/i)).toBeInTheDocument();
  expect(spy).toHaveBeenCalled();
  
  spy.mockRestore();
});
```

### §3.2. Testar error recovery

```jsx
it('recovers from error', () => {
  const { rerender } = render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
  
  expect(screen.getByText(/Algo deu errado/i)).toBeInTheDocument();
  
  // Re-render sem erro
  rerender(
    <ErrorBoundary>
      <div>OK</div>
    </ErrorBoundary>
  );
  
  expect(screen.getByText('OK')).toBeInTheDocument();
});
```

## §4. Testes de Componentes com Router

### §4.1. MemoryRouter

```jsx
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen } from '@testing-library/react';

it('renders route', () => {
  render(
    <MemoryRouter initialEntries={['/pets/p1']}>
      <Routes>
        <Route path="/pets/:id" element={<PetDetail />} />
      </Routes>
    </MemoryRouter>
  );
  
  expect(screen.getByText('Pet Detail')).toBeInTheDocument();
});
```

### §4.2. useNavigate mockado

```jsx
import { vi } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

it('navigates on click', async () => {
  render(<MyComponent />);
  await userEvent.click(screen.getByRole('button'));
  expect(mockNavigate).toHaveBeenCalledWith('/target');
});
```

### §4.3. useSearchParams

```jsx
const mockSetSearchParams = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams],
  };
});

it('updates search params', async () => {
  render(<MyComponent />);
  await userEvent.click(screen.getByText('Filter'));
  expect(mockSetSearchParams).toHaveBeenCalledWith({ filter: 'active' });
});
```

## §5. Testes de Hooks (React Query)

### §5.1. Query básico

```jsx
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })}>
    {children}
  </QueryClientProvider>
);

it('fetches data', async () => {
  const { result } = renderHook(() => usePet('p1'), { wrapper });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toEqual({ id: 'p1', name: 'Rex' });
});
```

### §5.2. Query error

```jsx
it('handles error', async () => {
  // Mock service to throw
  vi.mocked(getPet).mockRejectedValue(new Error('Network'));
  
  const { result } = renderHook(() => usePet('p1'), { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(result.current.error).toEqual(new Error('Network'));
});
```

### §5.3. Mutation

```jsx
it('creates pet', async () => {
  const { result } = renderHook(() => useCreatePet(), { wrapper });
  
  act(() => {
    result.current.mutate({ input: { name: 'Rex' }, actor: { uid: 'u1' } });
  });
  
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  expect(result.current.data).toMatchObject({ id: 'p1' });
});
```

## §6. Testes de Forms

### §6.1. Submeter form

```jsx
import userEvent from '@testing-library/user-event';

it('submits form', async () => {
  const onSubmit = vi.fn();
  render(<MyForm onSubmit={onSubmit} />);
  
  await userEvent.type(screen.getByLabelText('Nome'), 'Rex');
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(onSubmit).toHaveBeenCalledWith({ name: 'Rex' });
});
```

### §6.2. Validação

```jsx
it('shows validation error', async () => {
  render(<MyForm />);
  
  await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
  
  expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
});
```

### §6.3. Async submit

```jsx
it('disables button while submitting', async () => {
  render(<MyForm onSubmit={() => new Promise(r => setTimeout(r, 100))} />);
  
  const button = screen.getByRole('button', { name: 'Submit' });
  await userEvent.click(button);
  
  expect(button).toBeDisabled();
  
  await waitFor(() => expect(button).not.toBeDisabled());
});
```

## §7. Testes de Storage / FCM

### §7.1. Mock de Firebase Storage

```js
vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({ fullPath: 'images/p1.jpg' })),
  uploadBytes: vi.fn(() => Promise.resolve({ ref: { fullPath: 'images/p1.jpg' } })),
  getDownloadURL: vi.fn(() => Promise.resolve('https://example.com/p1.jpg')),
}));
```

### §7.2. Mock de FCM

```js
vi.mock('firebase/messaging', () => ({
  getMessaging: vi.fn(() => ({ mocked: true })),
  getToken: vi.fn(() => Promise.resolve('mocked-token')),
  onMessage: vi.fn((messaging, callback) => {
    callback({ notification: { title: 'Test' } });
    return () => {};
  }),
}));
```

## §8. Testes de Performance

### §8.1. Render time

```jsx
it('renders within 100ms', () => {
  const start = performance.now();
  render(<MyComponent />);
  const duration = performance.now() - start;
  expect(duration).toBeLessThan(100);
});
```

### §8.2. Re-render count

```jsx
import { render, screen } from '@testing-library/react';

it('does not re-render unnecessarily', () => {
  let renderCount = 0;
  const Component = () => {
    renderCount++;
    return <div>Count: {renderCount}</div>;
  };
  
  const MemoComponent = React.memo(Component);
  const { rerender } = render(<MemoComponent value={1} />);
  rerender(<MemoComponent value={1} />);  // mesmo value → não re-render
  rerender(<MemoComponent value={2} />);  // valor mudou → re-render
  
  expect(renderCount).toBe(2);
});
```

## §9. Testes de Segurança

### §9.1. Não vaza dados sensíveis

```jsx
it('does not log PII', () => {
  const spy = vi.spyOn(console, 'log');
  render(<MyComponent user={{ uid: 'u1', email: '[email protected]' }} />);
  expect(spy).not.toHaveBeenCalledWith(
    expect.stringContaining('[email protected]')
  );
  spy.mockRestore();
});
```

### §9.2. Não exibe dados de outros users

```jsx
it('does not show other users data', () => {
  render(<PetCard pet={{ owner_id: 'u2' }} currentUserId="u1" />);
  expect(screen.queryByText('Editar')).not.toBeInTheDocument();
});
```

## §10. Snapshot Testing (com cuidado)

```jsx
it('matches snapshot', () => {
  const { container } = render(<MyComponent />);
  expect(container).toMatchSnapshot();
});
```

⚠️ **CUIDADO**: snapshot testing é frágil. Prefira testes explícitos:

```jsx
// ❌ Evitar: snapshot testing cego
it('matches snapshot', () => { /* ... */ });

// ✅ Melhor: testes explícitos
it('displays name', () => {
  render(<MyComponent name="Rex" />);
  expect(screen.getByText('Rex')).toBeInTheDocument();
});
```

## §11. Coverage

### §11.1. Medir coverage

```bash
npx vitest run --coverage
```

### §11.2. Coverage por arquivo

```bash
npx vitest run --coverage --coverage.include='src/modules/pets/**'
```

### §11.3. Thresholds

```js
// vitest.config.js
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
```

## §12. Patterns Comuns

### §12.1. beforeEach / afterEach

```js
describe('MyService', () => {
  beforeEach(() => {
    // Setup antes de cada test
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Cleanup depois de cada test
    vi.restoreAllMocks();
  });
  
  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

### §12.2. describe.aninhado

```js
describe('MyService', () => {
  describe('list', () => {
    it('returns empty', () => { /* ... */ });
    it('returns with filters', () => { /* ... */ });
  });
  
  describe('create', () => {
    it('creates', () => { /* ... */ });
    it('validates input', () => { /* ... */ });
  });
});
```

### §12.3. Test data factories

```js
// test/factories/pet.js
export const makePet = (overrides = {}) => ({
  id: 'p1',
  name: 'Rex',
  species: 'dog',
  ...overrides,
});

// Em test
const pet = makePet({ name: 'Toby' });
```

### §12.4. Test fixtures

```js
// test/fixtures/pets.js
export const validPet = {
  id: 'p1',
  name: 'Rex',
  species: 'dog',
  // ...
};

export const invalidPet = {
  name: '',  // missing
  // ...
};
```

## §13. Debugging Tests

### §13.1. Verbose output

```bash
npx vitest run --reporter=verbose
```

### §13.2. Apenas um test

```bash
npx vitest run -t "specific test name"
```

### §13.3. UI mode

```bash
npx vitest --ui
```

### §13.4. Watch + inspect

```bash
npx vitest --watch --inspect
```

## §14. Performance em Testes

### §14.1. Setup caro

```js
// ❌ Evitar: setup caro em beforeEach
beforeEach(() => {
  const db = initFirebase();  // 500ms
});

// ✅ Melhor: setup uma vez
beforeAll(() => {
  const db = initFirebase();
});

afterAll(() => {
  db.cleanup();
});
```

### §14.2. Tests paralelos

```js
// vitest.config.js
export default defineConfig({
  test: {
    pool: 'forks',  // paralelo
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
```

## §15. Resumo

| Pattern | Quando usar |
|---------|-------------|
| Async básico | Chamadas async |
| Promise.all | Múltiplas paralelas |
| Mock parcial | Manter comportamento, mockar um |
| Spy | Verificar chamada sem mockar |
| Mock timers | setTimeout, setInterval |
| Mock Date | Testes com data fixa |
| ErrorBoundary | Componentes que podem falhar |
| React Query wrapper | Hooks com query/mutation |
| Form testing | user-event |
| Coverage | Medir cobertura |

---

**Próxima leitura**: `08-TESTING.md` (padrões básicos)
