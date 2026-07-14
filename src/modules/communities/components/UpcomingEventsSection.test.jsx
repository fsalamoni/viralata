/**
 * @fileoverview Testes do UpcomingEventsSection (TASK-164).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/core/config/firebase', () => ({
  db: { type: 'mock-firestore' },
}));

const mockGetDocs = vi.fn();
const mockQuery = vi.fn(() => ({ _q: true }));
const mockWhere = vi.fn(() => ({ _w: true }));
const mockLimit = vi.fn(() => ({ _l: true }));
const mockCollection = vi.fn(() => ({ _c: true }));
const mockOrderBy = vi.fn(() => ({ _o: true }));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  limit: (...args) => mockLimit(...args),
  orderBy: (...args) => mockOrderBy(...args),
}));

import UpcomingEventsSection from './UpcomingEventsSection.jsx';

function makeSnap(items) {
  return {
    docs: items.map((data) => ({
      id: data.id || 'no-id',
      data: () => data,
    })),
    empty: items.length === 0,
  };
}

describe('UpcomingEventsSection (TASK-164)', () => {
  it('componente é função', () => {
    expect(typeof UpcomingEventsSection).toBe('function');
  });
});

describe('UpcomingEventsSection — smoke', () => {
  let container;
  let root;
  let queryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it('renderiza sem crash (sem eventos)', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([]));
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UpcomingEventsSection userUid="user-1" />
          </MemoryRouter>
        </QueryClientProvider>
      );
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(container.textContent).toContain('Próximos eventos');
  });

  it('mostra estado vazio quando não há eventos', async () => {
    mockGetDocs.mockResolvedValue(makeSnap([]));
    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <UpcomingEventsSection userUid="user-1" />
          </MemoryRouter>
        </QueryClientProvider>
      );
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(container.textContent).toContain('Explore');
    expect(container.textContent).toContain('comunidades');
  });
});
