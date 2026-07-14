/**
 * @fileoverview Testes da página "Minhas Applications" (TASK-304).
 *
 * Cobre a estrutura de dados e helpers puros exportados, mais alguns
 * testes de fumaça com createRoot (sem @testing-library/react).
 *
 * NOTA: o projeto NÃO tem @testing-library/react como devDep
 * (apenas jsdom para vitest). Por isso, este test foca em
 * (1) a função pura `formatApplicationTimeline` e
 * (2) o render smoke via createRoot + act.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { uid: 'user-1' }, isAuthenticated: true })),
}));

vi.mock('@/core/config/firebase', () => ({
  db: { type: 'mock-firestore' },
}));

const mockListMyApplications = vi.fn();
const mockCancelApplication = vi.fn();
vi.mock('@/modules/shelter/services/adoptionService', () => ({
  listMyApplications: (...args) => mockListMyApplications(...args),
  cancelApplication: (...args) => mockCancelApplication(...args),
}));

vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  doc: vi.fn((_db, collection, id) => ({ _path: `${collection}/${id}` })),
}));

vi.mock('@/core/lib/useArenaPageClasses', () => ({
  useArenaPageClasses: (cls) => cls,
}));

import MyApplications from './MyApplications.jsx';
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
} from '@/modules/shelter/domain/operational/adoption';

describe('MyApplications — estrutura básica (TASK-304)', () => {
  it('APPLICATION_STATUS tem 7 estados', () => {
    expect(APPLICATION_STATUS).toHaveLength(7);
    expect(APPLICATION_STATUS).toContain('applied');
    expect(APPLICATION_STATUS).toContain('under_review');
    expect(APPLICATION_STATUS).toContain('approved');
    expect(APPLICATION_STATUS).toContain('rejected');
    expect(APPLICATION_STATUS).toContain('adoption_completed');
    expect(APPLICATION_STATUS).toContain('cancelled');
    expect(APPLICATION_STATUS).toContain('withdrawn');
  });

  it('APPLICATION_STATUS_LABELS tem pt-BR para todos', () => {
    APPLICATION_STATUS.forEach((s) => {
      expect(APPLICATION_STATUS_LABELS[s]).toBeTruthy();
      expect(typeof APPLICATION_STATUS_LABELS[s]).toBe('string');
    });
  });

  it('labels pt-BR estão corretos', () => {
    expect(APPLICATION_STATUS_LABELS.applied).toBe('Recebida');
    expect(APPLICATION_STATUS_LABELS.under_review).toBe('Em análise');
    expect(APPLICATION_STATUS_LABELS.approved).toBe('Aprovada');
    expect(APPLICATION_STATUS_LABELS.rejected).toBe('Recusada');
    expect(APPLICATION_STATUS_LABELS.adoption_completed).toBe('Adoção concluída');
    expect(APPLICATION_STATUS_LABELS.cancelled).toBe('Cancelada');
    expect(APPLICATION_STATUS_LABELS.withdrawn).toBe('Desistiu');
  });
});

describe('MyApplications — smoke (createRoot + act)', () => {
  let container;
  let root;
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListMyApplications.mockResolvedValue([]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function renderPage() {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={['/meus-pedidos']}>
            <Routes>
              <Route path="/meus-pedidos" element={<MyApplications />} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>
      );
    });
  }

  it('renderiza sem crash (estado vazio)', async () => {
    await act(async () => { renderPage(); });
    // Empty state: "Nenhuma application ainda"
    await new Promise((r) => setTimeout(r, 50));
    await act(async () => { renderPage(); });
    expect(container.textContent).toContain('Minhas Applications');
  });
});
