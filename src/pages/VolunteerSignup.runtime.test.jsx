import { render, fireEvent, waitFor, act } from '@testing-library/react';
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

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'u1', email: 'u@e.com', displayName: 'Test User' },
    userProfile: { full_name: 'Test User' },
    isAuthenticated: true,
    isLoadingAuth: false,
  })),
}));

vi.mock('@/core/hooks/useToast', () => ({
  useToast: vi.fn(() => ({ toast: vi.fn() })),
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

// IMPORTANTE: simular user que JÁ aceitou o termo
const mockAcceptTerms = vi.fn();
vi.mock('@/modules/shelter/hooks/useVolunteerProfile', () => ({
  useVolunteerProfile: vi.fn(() => ({ 
    data: { 
      id: 'main', 
      terms_accepted_at: '2026-07-22T00:00:00.000Z', 
      terms_version: '2026-07-10-v2',
    }, 
    isLoading: false 
  })),
  useUpsertVolunteerProfile: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useAcceptVolunteerTerms: vi.fn(() => ({
    mutateAsync: mockAcceptTerms,
    isPending: false,
  })),
  useJoinShelterAsVolunteer: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
  useClubs: vi.fn(() => ({ data: [], isLoading: false })),
}));

import VolunteerSignup from './VolunteerSignup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('VolunteerSignup — user who already accepted', () => {
  it('should NOT show terms step if user already accepted', () => {
    const { container } = render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <VolunteerSignup />
        </MemoryRouter>
      </QueryClientProvider>
    );

    console.log('--- Initial headings ---');
    const headings = Array.from(container.querySelectorAll('h1, h2, h3')).map(h => h.textContent);
    console.log(headings);
    
    // O input de signature nao deve existir (porque ja aceitou)
    const sigInput = container.querySelector('#signup-signature');
    console.log('Signature input found?', sigInput !== null);
  });
});
