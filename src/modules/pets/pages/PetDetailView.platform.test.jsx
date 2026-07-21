import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = (q) => ({ matches: false, addListener: () => {}, removeListener: () => {} });
}

const mockUseAuth = vi.fn();
const mockGetDoc = vi.fn();

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/core/config/firebase', () => ({
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _collection, id) => ({ id })),
  getDoc: () => mockGetDoc(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('@/modules/organizations/services/clubService', () => ({
  getMembership: () => Promise.resolve(null),
  getClub: () => Promise.resolve({ id: 'c1', created_by: 'u1' }),
}));

vi.mock('@/components/Lightbox', () => ({
  Lightbox: () => null,
}));

import PetDetailViewV3 from './PetDetailView.v3.jsx';

describe('PetDetailView.v3 - PLATFORM ADMIN não vê botão Administrar', () => {
  let qc;
  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function renderWithPath(initialPath) {
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/pet/:petId" element={<PetDetailViewV3 />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  it('PLATFORM ADMIN em pet pessoal alheio: botão Administrar NÃO aparece', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'admin', email: 'fsalamoni@gmail.com' }, isPlatformAdmin: true });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'p1',
      data: () => ({ id: 'p1', owner_id: 'u1', owner_type: 'user', title: 'Cachorrinho fofo', status: 'available' }),
    });
    renderWithPath('/pet/p1');
    await waitFor(() => {
      expect(screen.queryByTestId('pet-detail-view-skeleton')).toBeNull();
    }, { timeout: 3000 });
    // CRÍTICO: platform admin NÃO deve ver botão Administrar em /pet/<id>
    expect(screen.queryByTestId('admin-entry-button')).toBeNull();
    expect(screen.queryByTestId('admin-entry-sticky')).toBeNull();
  });

  it('USER COMUM em pet pessoal alheio: botão Administrar NÃO aparece', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u2' }, isPlatformAdmin: false });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'p1',
      data: () => ({ id: 'p1', owner_id: 'u1', owner_type: 'user', title: 'Cachorrinho fofo', status: 'available' }),
    });
    renderWithPath('/pet/p1');
    await waitFor(() => {
      expect(screen.queryByTestId('pet-detail-view-skeleton')).toBeNull();
    }, { timeout: 3000 });
    expect(screen.queryByTestId('admin-entry-button')).toBeNull();
  });

  it('OWNER em seu próprio pet: botão Administrar APARECE', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'u1' }, isPlatformAdmin: false });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'p1',
      data: () => ({ id: 'p1', owner_id: 'u1', owner_type: 'user', title: 'Cachorrinho fofo', status: 'available' }),
    });
    renderWithPath('/pet/p1');
    await waitFor(() => {
      expect(screen.queryByTestId('pet-detail-view-skeleton')).toBeNull();
    }, { timeout: 3000 });
    expect(screen.getAllByTestId('admin-entry-button').length).toBeGreaterThan(0);
  });
});
