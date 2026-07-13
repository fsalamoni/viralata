/**
 * @fileoverview Tests do LegalGate (TASK-401 parte 2).
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(),
}));
vi.mock('@/modules/shelter/services/termsAcceptanceService', () => ({
  getCurrentAcceptances: vi.fn(() => Promise.resolve([])),
  recordAcceptance: vi.fn(() => Promise.resolve({ id: 'fake' })),
}));

import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { getCurrentAcceptances, recordAcceptance } from '@/modules/shelter/services/termsAcceptanceService';
import LegalGate from './LegalGate';

let container;
let root;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

function renderAt(initialPath = '/feed') {
  act(() => {
    root.render(
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/feed" element={<LegalGate><div data-testid="child">child</div></LegalGate>} />
          <Route path="/onboarding" element={<LegalGate><div data-testid="child">onboarding</div></LegalGate>} />
        </Routes>
      </MemoryRouter>
    );
  });
}

describe('LegalGate — guard de autenticação', () => {
  it('renderiza children se não autenticado', async () => {
    useAuth.mockReturnValue({ user: null, isAuthenticated: false, isLoadingAuth: false, isProfileComplete: false });
    await act(async () => { renderAt('/feed'); });
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it('renderiza children se ainda não completou profile', async () => {
    useAuth.mockReturnValue({ user: { uid: 'u1' }, isAuthenticated: true, isLoadingAuth: false, isProfileComplete: false });
    await act(async () => { renderAt('/onboarding'); });
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });

  it('renderiza children em path permitido (onboarding/login/legal)', async () => {
    useAuth.mockReturnValue({ user: { uid: 'u1' }, isAuthenticated: true, isLoadingAuth: false, isProfileComplete: true });
    getCurrentAcceptances.mockResolvedValue([]);
    await act(async () => { renderAt('/onboarding'); });
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });
});

describe('LegalGate — aceite de termos', () => {
  it('renderiza children se aceites estão em dia', async () => {
    useAuth.mockReturnValue({ user: { uid: 'u1' }, isAuthenticated: true, isLoadingAuth: false, isProfileComplete: true });
    // Aceites de todas as versões atuais
    getCurrentAcceptances.mockResolvedValue([
      { terms_type: 'general', terms_version: '2026-07-10' },
      { terms_type: 'privacy', terms_version: '2026-07-10' },
      { terms_type: 'conduct', terms_version: '2026-07-10' },
    ]);
    await act(async () => { renderAt('/feed'); });
    // Children visíveis
    expect(container.querySelector('[data-testid="child"]')).toBeTruthy();
  });
});
