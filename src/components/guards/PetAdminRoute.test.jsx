/**
 * @fileoverview PetAdminRoute — testes do guard que valida canManage.
 *
 * **BEFORE (BUG)**: ProtectedRoute só checava autenticação. Resultado:
 * qualquer user logado via a página admin de pet alheio, com botões
 * de editar/excluir. Defesa em 3 camadas quebrada.
 *
 * **AFTER (FIX)**: PetAdminRoute:
 * - Sem auth → /login
 * - Pet não existe → /feed
 * - User não canManage → /pet/<id> (público)
 * - User canManage → renderiza children
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────────────
const mockUseAuth = vi.fn();
const mockUsePet = vi.fn();
const mockUsePetPermissions = vi.fn();

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/modules/pets/hooks/usePets', () => ({
  usePet: (petId) => mockUsePet(petId),
}));

vi.mock('@/modules/pets/hooks/usePetPermissions', () => ({
  usePetPermissions: (pet) => mockUsePetPermissions(pet),
}));

import PetAdminRoute from './PetAdminRoute';

function renderRoute({ initialPath }) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/pets/:petId"
          element={
            <PetAdminRoute>
              <div data-testid="admin-children">ADMIN CHILDREN</div>
            </PetAdminRoute>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">LOGIN</div>} />
        <Route path="/feed" element={<div data-testid="feed-page">FEED</div>} />
        <Route path="/pet/:petId" element={<div data-testid="public-pet-page">PUBLIC PET</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PetAdminRoute — guard de canManage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mostra loading enquanto carrega auth', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoadingAuth: true });
    mockUsePet.mockReturnValue({ data: null, isLoading: false });
    mockUsePetPermissions.mockReturnValue({ canEdit: false });
    renderRoute({ initialPath: '/pets/abc' });
    // Deve haver um spinner (não children)
    expect(screen.queryByTestId('admin-children')).toBeNull();
  });

  it('redireciona para /login se não autenticado', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false, isLoadingAuth: false });
    mockUsePet.mockReturnValue({ data: { id: 'abc', owner_id: 'other-user' }, isLoading: false });
    mockUsePetPermissions.mockReturnValue({ canEdit: false });
    renderRoute({ initialPath: '/pets/abc' });
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-children')).toBeNull();
  });

  it('redireciona para /feed se pet não existe', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoadingAuth: false });
    mockUsePet.mockReturnValue({ data: null, isLoading: false, isError: true });
    mockUsePetPermissions.mockReturnValue({ canEdit: false });
    renderRoute({ initialPath: '/pets/abc' });
    await waitFor(() => {
      expect(screen.getByTestId('feed-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-children')).toBeNull();
  });

  it('redireciona para /pet/<id> (público) se user NÃO é canManage', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoadingAuth: false });
    mockUsePet.mockReturnValue({
      data: { id: 'abc', owner_id: 'other-user', owner_type: 'user' },
      isLoading: false,
    });
    mockUsePetPermissions.mockReturnValue({ canEdit: false });
    renderRoute({ initialPath: '/pets/abc' });
    await waitFor(() => {
      expect(screen.getByTestId('public-pet-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('admin-children')).toBeNull();
  });

  it('renderiza children se user É canManage (dono do pet)', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoadingAuth: false, isPlatformAdmin: false });
    mockUsePet.mockReturnValue({
      data: { id: 'abc', owner_id: 'me', owner_type: 'user' },
      isLoading: false,
    });
    mockUsePetPermissions.mockReturnValue({ canEdit: true });
    renderRoute({ initialPath: '/pets/abc' });
    await waitFor(() => {
      expect(screen.getByTestId('admin-children')).toBeInTheDocument();
    });
  });

  it('renderiza children se user É platform admin (mesmo sem ser owner)', async () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true, isLoadingAuth: false, isPlatformAdmin: true });
    mockUsePet.mockReturnValue({
      data: { id: 'abc', owner_id: 'other-user', owner_type: 'user' },
      isLoading: false,
    });
    mockUsePetPermissions.mockReturnValue({ canEdit: true });
    renderRoute({ initialPath: '/pets/abc' });
    await waitFor(() => {
      expect(screen.getByTestId('admin-children')).toBeInTheDocument();
    });
  });
});
