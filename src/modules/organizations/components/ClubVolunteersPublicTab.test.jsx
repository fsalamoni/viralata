/**
 * @fileoverview Testes do ClubVolunteersPublicTab (TASK-263).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { uid: 'user-1' }, isAuthenticated: true })),
}));

vi.mock('@/core/config/firebase', () => ({
  db: { type: 'mock-firestore' },
}));

const mockListClubMembers = vi.fn();
vi.mock('@/modules/organizations/services/clubService', () => ({
  listClubMembers: (...args) => mockListClubMembers(...args),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((...args) => ({ _path: args.join('/') })),
  query: vi.fn(() => ({ _q: true })),
  where: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
}));

import ClubVolunteersPublicTab from './ClubVolunteersPublicTab.jsx';

describe('ClubVolunteersPublicTab (TASK-263)', () => {
  it('componente é função', () => {
    expect(typeof ClubVolunteersPublicTab).toBe('function');
  });

  it('exporta como default', () => {
    expect(ClubVolunteersPublicTab).toBeDefined();
  });
});

describe('ClubVolunteersPublicTab — smoke', () => {
  let container;
  let root;
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockListClubMembers.mockResolvedValue([
      { id: 'v1', role: 'volunteer', display_name: 'Maria Silva' },
      { id: 'v2', role: 'volunteer', display_name: 'João Santos' },
      { id: 'a1', role: 'admin', display_name: 'Admin' },
    ]);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function renderPage() {
    act(() => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <ClubVolunteersPublicTab clubId="club-1" club={{ name: 'Abrigo Test' }} />
          </MemoryRouter>
        </QueryClientProvider>
      );
    });
  }

  it('renderiza contagem de voluntários', async () => {
    await act(async () => { renderPage(); });
    await new Promise((r) => setTimeout(r, 100));
    await act(async () => { renderPage(); });
    expect(container.textContent).toContain('2');
    expect(container.textContent).toContain('voluntário');
  });

  it('mostra CTA "Quero ser voluntário"', async () => {
    await act(async () => { renderPage(); });
    await new Promise((r) => setTimeout(r, 100));
    await act(async () => { renderPage(); });
    expect(container.textContent).toContain('Quero ser voluntário');
  });

  it('mostra tabs (Como ajudar + Voluntários)', async () => {
    await act(async () => { renderPage(); });
    await new Promise((r) => setTimeout(r, 100));
    await act(async () => { renderPage(); });
    expect(container.textContent).toContain('Como ajudar');
    expect(container.textContent).toContain('Voluntários');
  });
});
