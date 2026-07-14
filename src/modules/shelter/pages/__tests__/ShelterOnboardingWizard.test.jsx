/**
 * @fileoverview Smoke tests for ShelterOnboardingWizard (TASK-309).
 *
 * O projeto usa createRoot (react-dom/client) + act + jsdom.
 * Validamos: renderização sem crash, presença de strings-chaves no DOM.
 *
 * NOTA: A verificação visual completa deve ser feita em
 * viralata.web.app/abrigo/{clubId}/onboarding com a flag
 * SHELTER_ONBOARDING_WIZARD ativa.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import React from 'react';

// ── Mocks — aplicados antes do import do componente ─────────────────────────
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: vi.fn(() => true),
}));

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'u1', displayName: 'Admin Test' },
    userProfile: { name: 'Admin Test' },
  })),
}));

vi.mock('@/core/lib/useArenaPageClasses', () => ({
  useArenaPageClasses: vi.fn(() => 'test-arena'),
}));

vi.mock('@/modules/shelter/hooks/useShelterOnboarding', () => ({
  useOnboardingProgress: vi.fn(() => ({
    data: null,
    isLoading: false,
  })),
  useSaveOnboardingProgress: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
  useCompleteOnboarding: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/modules/organizations/hooks/useClubs', () => ({
  useUpdateClub: vi.fn(() => ({
    mutateAsync: vi.fn(),
    isPending: false,
  })),
}));

vi.mock('@/modules/shelter/components/legal/SingleAcceptanceDialog', () => ({
  default: vi.fn(({ open }) =>
    open
      ? React.createElement('div', { 'data-testid': 'dpa-dialog' })
      : null
  ),
}));

// Import after mocks
import ShelterOnboardingWizard from '@/modules/shelter/pages/ShelterOnboardingWizard';

let container, root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

async function renderWizard() {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/abrigo/club1/onboarding']}>
        <Routes>
          <Route path="/abrigo/:clubId/onboarding" element={<ShelterOnboardingWizard />} />
          <Route
            path="/organizacoes/:id/admin"
            element={<div data-testid="admin-page">Admin</div>}
          />
        </Routes>
      </MemoryRouter>
    );
  });
  // Wait for useEffect
  await act(async () => new Promise((r) => setTimeout(r, 50)));
}

describe('ShelterOnboardingWizard smoke tests', () => {
  it('renders without crashing', async () => {
    await renderWizard();
    expect(container.innerHTML).toBeTruthy();
  });

  it('renders the wizard header', async () => {
    await renderWizard();
    expect(container.innerHTML).toContain('Configurar seu abrigo');
  });

  it('renders all 5 step labels in the stepper', async () => {
    await renderWizard();
    const html = container.innerHTML;
    expect(html).toContain('Logo e capa');
    expect(html).toContain('Endereço');
    expect(html).toContain('Equipe');
    expect(html).toContain('Termos');
    expect(html).toContain('Primeiro pet');
  });

  it('shows step 1 (Logo e capa) on load', async () => {
    await renderWizard();
    expect(container.innerHTML).toContain('Passo 1');
    expect(container.innerHTML).toContain('Logo e capa');
    expect(container.innerHTML).toContain('Adicione a identidade visual');
  });

  it('has Próximo and Pular buttons on step 1', async () => {
    await renderWizard();
    expect(container.innerHTML).toContain('Próximo');
    expect(container.innerHTML).toContain('Pular');
  });
});
