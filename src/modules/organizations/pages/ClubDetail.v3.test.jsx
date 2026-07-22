/**
 * @fileoverview Testes da ClubDetail V3 — TASK-V3-CLUB-PANEL-FIX (sw-v72.3).
 *
 * **REGRA ATUAL (sw-v72.3)**: O botão "Painel" da ClubDetail V3 é a ÚNICA
 * porta de entrada para /organizacoes/<orgId>/admin. Deve estar visível
 * APENAS para isMember (criador + membership), e a URL deve ser plural
 * (/organizacoes/) para não dar 404.
 *
 * Botões duplicados (no hero, na área de CTAs, e na aba "Gestão") foram
 * removidos. O usuário clica UMA vez no botão do topo do hero.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
}
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = (q) => ({ matches: false, addListener: () => {}, removeListener: () => {} });
}

const mockUseAuth = vi.fn();
const mockGetClub = vi.fn();
const mockUseMyMembership = vi.fn();

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/core/config/firebase', () => ({
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _collection, id) => ({ id })),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  limit: vi.fn(),
}));

vi.mock('@/modules/organizations/services/clubService', () => ({
  getClub: () => mockGetClub(),
  getMembership: vi.fn(),
  listClubMembers: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/modules/organizations/hooks/useClubs', () => ({
  useMyMembership: () => mockUseMyMembership(),
  useRequestToJoinClub: vi.fn(),
  useMyJoinRequests: vi.fn(),
  useMyClubInvites: vi.fn(),
}));

vi.mock('@/components/Lightbox', () => ({
  Lightbox: () => null,
}));

vi.mock('@/components/Seo', () => ({
  default: () => null,
}));

import ClubDetailV3 from './ClubDetail.v3.jsx';

describe('ClubDetail V3 — botão Painel (TASK-V3-CLUB-PANEL-FIX, sw-v72.3)', () => {
  let qc;
  beforeEach(() => {
    vi.clearAllMocks();
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  function renderWith(initialPath) {
    return render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route path="/organizacoes/:orgId" element={<ClubDetailV3 />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
  }

  // Espera async (mock getClub) usando delay real
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  it('VISITANTE (não logado): NÃO vê botão Painel', async () => {
    mockUseAuth.mockReturnValue({ user: null, isPlatformAdmin: false });
    mockGetClub.mockResolvedValue({
      id: 'TM9MBn5aFXgObfRZ39m9',
      name: 'Pet lover',
      created_by: 'owner-uid',
      about: 'Bla bla bla',
      city: 'Porto Alegre',
      state: 'RS',
      member_count: 1,
      pets_count: 0,
    });
    mockUseMyMembership.mockReturnValue({ data: null });
    renderWith('/organizacoes/TM9MBn5aFXgObfRZ39m9');
    await wait(500);
    expect(screen.getByTestId('club-detail-page')).toBeInTheDocument();
    // Visitante não deve ver o botão "Painel"
    expect(screen.queryByRole('link', { name: /Painel/i })).toBeNull();
  });

  it('MEMBRO (criador do clube): VÊ botão Painel com link /organizacoes/<id>/admin', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'owner-uid' }, isPlatformAdmin: false });
    mockGetClub.mockResolvedValue({
      id: 'TM9MBn5aFXgObfRZ39m9',
      name: 'Pet lover',
      created_by: 'owner-uid', // owner-uid === current user
      about: 'Bla bla bla',
      city: 'Porto Alegre',
      state: 'RS',
      member_count: 1,
      pets_count: 0,
    });
    mockUseMyMembership.mockReturnValue({ data: { user_id: 'owner-uid', role: 'admin' } });
    renderWith('/organizacoes/TM9MBn5aFXgObfRZ39m9');
    await wait(500);
    expect(screen.getByTestId('club-detail-page')).toBeInTheDocument();
    // Membro (owner) DEVE ver o botão Painel
    const painelLink = screen.queryByRole('link', { name: /Painel/i });
    expect(painelLink).not.toBeNull();
    // Link deve apontar para /organizacoes/<id>/admin (plural, sem 404)
    expect(painelLink.getAttribute('href')).toBe('/organizacoes/TM9MBn5aFXgObfRZ39m9/admin');
  });

  it('MEMBRO (com membership): VÊ botão Painel com link /organizacoes/<id>/admin', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'member-uid' }, isPlatformAdmin: false });
    mockGetClub.mockResolvedValue({
      id: 'TM9MBn5aFXgObfRZ39m9',
      name: 'Pet lover',
      created_by: 'owner-uid', // owner-uid !== current user
      about: 'Bla bla bla',
      city: 'Porto Alegre',
      state: 'RS',
      member_count: 2,
      pets_count: 0,
    });
    mockUseMyMembership.mockReturnValue({
      data: { user_id: 'member-uid', role: 'volunteer' },
    });
    renderWith('/organizacoes/TM9MBn5aFXgObfRZ39m9');
    await wait(500);
    expect(screen.getByTestId('club-detail-page')).toBeInTheDocument();
    // Membro (não-owner) DEVE ver o botão Painel
    const painelLink = screen.queryByRole('link', { name: /Painel/i });
    expect(painelLink).not.toBeNull();
    expect(painelLink.getAttribute('href')).toBe('/organizacoes/TM9MBn5aFXgObfRZ39m9/admin');
  });

  it('NÃO-MEMBRO: NÃO vê botão Painel', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'random-uid' }, isPlatformAdmin: false });
    mockGetClub.mockResolvedValue({
      id: 'TM9MBn5aFXgObfRZ39m9',
      name: 'Pet lover',
      created_by: 'owner-uid', // random-uid !== owner
      about: 'Bla bla bla',
      city: 'Porto Alegre',
      state: 'RS',
      member_count: 1,
      pets_count: 0,
    });
    mockUseMyMembership.mockReturnValue({ data: null });
    renderWith('/organizacoes/TM9MBn5aFXgObfRZ39m9');
    await wait(500);
    expect(screen.getByTestId('club-detail-page')).toBeInTheDocument();
    // NÃO-membro NÃO deve ver o botão Painel
    expect(screen.queryByRole('link', { name: /Painel/i })).toBeNull();
  });

  it('ABA Gestão + Painel: REMOVIDA (sw-v72.3) — apenas 1 link Painel', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'owner-uid' }, isPlatformAdmin: false });
    mockGetClub.mockResolvedValue({
      id: 'TM9MBn5aFXgObfRZ39m9',
      name: 'Pet lover',
      created_by: 'owner-uid',
      about: 'Bla bla bla',
      city: 'Porto Alegre',
      state: 'RS',
      member_count: 1,
      pets_count: 0,
    });
    mockUseMyMembership.mockReturnValue({ data: { user_id: 'owner-uid', role: 'admin' } });
    renderWith('/organizacoes/TM9MBn5aFXgObfRZ39m9');
    await wait(500);
    expect(screen.getByTestId('club-detail-page')).toBeInTheDocument();
    // Botão "Gestão" removido
    expect(screen.queryByRole('button', { name: /^Gestão$/i })).toBeNull();
    // APENAS 1 link "Painel" (o do topo)
    const painelLinks = screen.queryAllByRole('link', { name: /Painel/i });
    expect(painelLinks.length).toBe(1);
  });
});
