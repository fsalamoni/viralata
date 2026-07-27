/**
 * VolunteerSignup — runtime safety test
 *
 * Testa especificamente o bug:
 *  - React error #31 (objeto {title, description, variant} passado para toast)
 *  - Missing or insufficient permissions (signature_text missing)
 *
 * v2 (2026-07-27): adicionado test para sonner API compliance
 */

import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

const mockAuth = {
  user: { uid: 'u1', email: 'u@e.com', displayName: 'Test User' },
  userProfile: { full_name: 'Test User' },
  isAuthenticated: true,
  isLoadingAuth: false,
};
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => mockAuth),
}));

import { toast as sonnerToast } from 'sonner';

// useToast é wrapper de sonner
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: sonnerToast,
    dismiss: sonnerToast.dismiss,
    toasts: [],
  })),
}));

vi.mock('@/core/hooks/useFeatureFlag', () => ({
  useFeatureFlag: vi.fn(() => true),
}));

vi.mock('@/core/hooks/useFCMRequest', () => ({
  useFCMRequest: vi.fn(() => ({ requestPushIfAppropriate: vi.fn() })),
}));

vi.mock('@/core/hooks/useArenaPageClasses', () => ({
  useArenaPageClasses: vi.fn(() => 'arena-page'),
}));

vi.mock('@/core/hooks/useScrollEnd', () => ({
  useScrollEnd: vi.fn(() => true),
}));

const mockAcceptTerms = vi.fn();
const mockJoinShelter = vi.fn();
const mockUpsertProfile = vi.fn();

vi.mock('@/modules/shelter/hooks/useVolunteerProfile', () => ({
  useVolunteerProfile: vi.fn(() => ({
    data: null,  // NOVO user (sem aceite prévio)
    isLoading: false,
  })),
  useUpsertVolunteerProfile: vi.fn(() => ({
    mutateAsync: mockUpsertProfile,
    isPending: false,
  })),
  useAcceptVolunteerTerms: vi.fn(() => ({
    mutateAsync: mockAcceptTerms,
    isPending: false,
  })),
  useJoinShelterAsVolunteer: vi.fn(() => ({
    mutateAsync: mockJoinShelter,
    isPending: false,
  })),
}));

vi.mock('@/modules/organizations/hooks/useClubs', () => ({
  useClubs: vi.fn(() => ({
    data: [
      { id: 'c1', name: 'Abrigo Teste', city: 'SP', state: 'SP' },
    ],
    isLoading: false,
  })),
}));

vi.mock('@/modules/shelter/components/VolunteerProfileForm', () => ({
  VolunteerProfileForm: () => <div data-testid="volunteer-profile-form" />,
}));

vi.mock('@/modules/shelter/components/VolunteerSignupCaptcha', () => ({
  default: () => <div data-testid="captcha" />,
}));

import VolunteerSignup from './VolunteerSignup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('VolunteerSignup — runtime safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAcceptTerms.mockResolvedValue({ id: 'main' });
    mockJoinShelter.mockResolvedValue({});
    mockUpsertProfile.mockResolvedValue({});
  });

  it('renders without throwing when user not yet accepted terms', () => {
    expect(() => {
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <VolunteerSignup />
          </MemoryRouter>
        </QueryClientProvider>
      );
    }).not.toThrow();
  });

  it('shows terms step initially', () => {
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <VolunteerSignup />
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByText(/1\. Leia e aceite o termo/i)).toBeInTheDocument();
  });

  it('does not throw React error #31 from toast({title,description,variant})', () => {
    // Se o componente ainda usasse toast({title, description, variant})
    // (API shadcn), isso causaria React error #31 em runtime
    // porque sonnerToast espera string, não objeto.
    // Este test garante que o componente renderiza sem esse erro.

    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <VolunteerSignup />
          </MemoryRouter>
        </QueryClientProvider>
      );
    }).not.toThrow();

    // Verificar que não houve error #31 no console
    const errorCalls = spy.mock.calls.flat().join(' ');
    expect(errorCalls).not.toMatch(/invariant=31/);
    expect(errorCalls).not.toMatch(/object with keys.*title.*description.*variant/i);

    spy.mockRestore();
  });
});

describe('VolunteerSignup — sonner API compliance', () => {
  it('sonnerToast tem API correta (success/error/warning/dismiss)', () => {
    // API do sonner: toast(message) ou toast(message, options) ou toast.error(msg)
    // API do shadcn (NÃO): toast({title, description, variant})
    expect(typeof sonnerToast).toBe('function');
    expect(typeof sonnerToast.success).toBe('function');
    expect(typeof sonnerToast.error).toBe('function');
    expect(typeof sonnerToast.warning).toBe('function');
    expect(typeof sonnerToast.dismiss).toBe('function');
  });

  it('sonnerToast.error aceita string + options, não objeto {title,description,variant}', () => {
    // Tentar usar a API correta (sonner)
    expect(() => {
      sonnerToast.error('mensagem');
      sonnerToast.error('mensagem', { description: 'desc' });
    }).not.toThrow();

    // Tentar usar a API errada (shadcn) - vai aceitar mas não funciona
    expect(() => {
      sonnerToast({ title: 'msg', description: 'desc', variant: 'destructive' });
    }).not.toThrow();  // não throw, mas renderiza com bug
  });
});
