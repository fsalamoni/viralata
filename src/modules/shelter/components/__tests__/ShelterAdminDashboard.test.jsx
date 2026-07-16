import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({ user: { uid: 'test-uid' } }),
}));
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: () => true,
}));
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  collectionGroup: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  limit: vi.fn(),
}));

const { ShelterAdminDashboard } = await import('@/modules/shelter/components/ShelterAdminDashboard.jsx');

describe('ShelterAdminDashboard (TASK-311)', () => {
  let container, root;
  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  it('componente é função', () => {
    expect(typeof ShelterAdminDashboard).toBe('function');
  });

  it('renderiza sem crash (smoke)', async () => {
    let err = null;
    try {
      await act(async () => {
        const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query');
        const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        root.render(
          <QueryClientProvider client={qc}>
            <MemoryRouter>
              <ShelterAdminDashboard clubId="test-club" />
            </MemoryRouter>
          </QueryClientProvider>
        );
      });
    } catch (e) {
      err = e;
    }
    expect(err).toBe(null);
  });
});
