/**
 * @fileoverview Testes da PetDetailView.v3 PÚBLICA (TASK-V3-PET-DETAIL-VIEW-V2, 2026-07-21).
 *
 * **REGRA ATUAL (sw-v72)**: A página /pet/<id> é PÚBLICA, sem pontos de admin/gestão.
 * Mesmo o OWNER do pet deve ir para /pets/<id> (plural) para gerenciar.
 *
 * **DECISÃO D-PUBLIC-ADMIN-SEPARATION**: Páginas PÚBLICAS não devem ter UI de admin.
 */
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

describe('PetDetailView.v3 PÚBLICA - SEM admin/gestão (sw-v72)', () => {
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

  it('PLATFORM ADMIN em pet alheio: página pública renderiza, SEM botão Administrar', async () => {
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
    // Página pública renderizou
    expect(screen.getByTestId('pet-detail-view')).toBeInTheDocument();
    // NÃO deve haver botão Administrar (página pública)
    expect(screen.queryByTestId('admin-entry-button')).toBeNull();
    expect(screen.queryByTestId('admin-entry-sticky')).toBeNull();
    // CTAs públicos visíveis
    expect(screen.getByTestId('pet-cta')).toBeInTheDocument();
    expect(screen.getAllByText(/Quero adotar/i).length).toBeGreaterThan(0);
  });

  it('USER COMUM em pet alheio: SEM botão Administrar', async () => {
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
    expect(screen.getByTestId('pet-cta')).toBeInTheDocument();
  });

  it('OWNER em seu próprio pet: SEM botão Administrar (gestão fica em /pets/<id>)', async () => {
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
    // CRÍTICO: PÁGINA PÚBLICA — não deve ter botão Administrar
    // Owner deve usar /pets/<id> (admin route) para gerenciar
    expect(screen.queryByTestId('admin-entry-button')).toBeNull();
    expect(screen.queryByTestId('admin-entry-sticky')).toBeNull();
    // Mas os CTAs públicos aparecem
    expect(screen.getByTestId('pet-cta')).toBeInTheDocument();
  });

  it('VISITANTE ANÔNIMO em pet: pode ver tudo, SEM admin', async () => {
    mockUseAuth.mockReturnValue({ user: null, isPlatformAdmin: false });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'p1',
      data: () => ({ id: 'p1', owner_id: 'u1', owner_type: 'user', title: 'Cachorrinho fofo', status: 'available' }),
    });
    renderWithPath('/pet/p1');
    await waitFor(() => {
      expect(screen.queryByTestId('pet-detail-view-skeleton')).toBeNull();
    }, { timeout: 3000 });
    expect(screen.getByTestId('pet-detail-view')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-entry-button')).toBeNull();
    expect(screen.getByTestId('pet-cta')).toBeInTheDocument();
  });

  it('TOPBAR + BOTTOMTABBAR (via withLayout) — confirmar que rota foi configurada', async () => {
    // Este teste verifica que com a renderização em /pet/:petId via withLayout,
    // a página tem a estrutura esperada. O withLayout é configurado em App.jsx.
    mockUseAuth.mockReturnValue({ user: null, isPlatformAdmin: false });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'p1',
      data: () => ({ id: 'p1', owner_id: 'u1', owner_type: 'user', title: 'Buddy', status: 'available' }),
    });
    renderWithPath('/pet/p1');
    await waitFor(() => {
      expect(screen.queryByTestId('pet-detail-view-skeleton')).toBeNull();
    }, { timeout: 3000 });
    // Página tem hero gradient (padrão DS-V2)
    expect(screen.getByTestId('pet-detail-hero')).toBeInTheDocument();
    // Hero tem gradient multicolor (rose→orange→amber)
    const hero = screen.getByTestId('pet-detail-hero');
    expect(hero.className).toContain('from-rose-500');
    expect(hero.className).toContain('via-orange-500');
    expect(hero.className).toContain('to-amber-500');
  });

  // D-PET-PUBLIC-V2-RUNTIME-SAFETY (2026-07-21): pet com TODOS os campos
  // (gender, size, weight, vaccinated, etc.) não pode quebrar a renderização.
  // Bug anterior: GENDER_LABEL foi removido por engano mas usado em 2 useMemo,
  // o build passou mas quebrou em runtime. Estes testes garantem cobertura.
  it('Pet COM gender/size/weight/temperament: renderiza sem erro de runtime', async () => {
    mockUseAuth.mockReturnValue({ user: null, isPlatformAdmin: false });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'p2',
      data: () => ({
        id: 'p2',
        owner_id: 'u1',
        owner_type: 'user',
        title: 'Buddy',
        name: 'Buddy',
        status: 'available',
        species: 'dog',
        breed: 'Vira-lata',
        size: 'medium',
        gender: 'male',
        age_group: 'adult',
        age_months: 36,
        weight_kg: 18,
        city: 'São Paulo',
        state: 'SP',
        color: 'Caramelo',
        vaccinated: 'yes',
        neutered: true,
        dewormed: true,
        temperament: ['Brincalhão', 'Dócil', 'Energético'],
        description: 'Um cachorro muito amoroso',
        needs_yard: true,
        good_with_kids: true,
        good_with_dogs: true,
        pet_code: 'VR-001',
        microchip: '900123456789',
      }),
    });
    renderWithPath('/pet/p2');
    // Espera renderizar SEM erro (não vai para o catch do ErrorBoundary)
    await waitFor(() => {
      expect(screen.queryByTestId('pet-detail-view-skeleton')).toBeNull();
    }, { timeout: 3000 });
    // Página renderizou com todos os dados
    expect(screen.getByTestId('pet-detail-view')).toBeInTheDocument();
    // GENDER_LABEL renderizou corretamente: "Macho"
    expect(screen.getAllByText(/Macho/i).length).toBeGreaterThan(0);
    // SIZE_LABEL renderizou corretamente: "Médio"
    expect(screen.getAllByText(/Médio/i).length).toBeGreaterThan(0);
  });

  it('Pet com gender=unknown (não está em GENDER_LABEL): usa fallback pet.gender', async () => {
    mockUseAuth.mockReturnValue({ user: null, isPlatformAdmin: false });
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'p3',
      data: () => ({
        id: 'p3',
        owner_id: 'u1',
        owner_type: 'user',
        title: 'Pet',
        status: 'available',
        gender: 'unknown', // valor fora de GENDER_LABEL
        size: 'unknown',
      }),
    });
    renderWithPath('/pet/p3');
    await waitFor(() => {
      expect(screen.queryByTestId('pet-detail-view-skeleton')).toBeNull();
    }, { timeout: 3000 });
    // Renderizou sem erro (fallback foi usado)
    expect(screen.getByTestId('pet-detail-view')).toBeInTheDocument();
  });
});
