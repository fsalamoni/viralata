import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'test' })),
  getDoc: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ id: 'test', name: 'Rex' }) }),
  collection: vi.fn(),
  getDocs: vi.fn().mockResolvedValue({ docs: [] }),
  query: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => new Date()),
  where: vi.fn(),
}));

vi.mock('@/core/config/firebase', () => ({ db: {} }));

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { uid: 'u1', displayName: 'User', email: 'u@e.com' } })),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useParams: vi.fn(() => ({ petId: 'test123' })),
    useNavigate: vi.fn(() => vi.fn()),
    useSearchParams: vi.fn(() => [new URLSearchParams(), vi.fn()]),
  };
});

// Mock todos os hooks
vi.mock('../hooks/usePets', () => ({
  usePet: vi.fn(() => ({ data: { id: 'p1', name: 'Rex', species: 'dog', gender: 'male', size: 'medium', weight_kg: 15, is_vaccinated: true, is_neutered: true, is_dewormed: true }, isLoading: false, error: null })),
  useCreateInterest: vi.fn(() => ({ mutate: vi.fn() })),
  useHasInterest: vi.fn(() => ({ data: false })),
  useCompleteAdoption: vi.fn(() => ({ mutate: vi.fn() })),
  useDeletePet: vi.fn(() => ({ mutate: vi.fn() })),
  useMyRatingForPet: vi.fn(() => ({ data: null })),
  useCreateRating: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock('../hooks/usePetPermissions', () => ({
  usePetPermissions: vi.fn(() => ({ canManage: false, isOwner: false, isPlatformAdmin: false, canEdit: false, canEditHistory: false, canView: true })),
}));
vi.mock('../hooks/usePetShareImage', () => ({
  usePetShareImage: vi.fn(() => ({ generate: vi.fn() })),
}));
vi.mock('@/modules/shelter/hooks/useMedications', () => ({
  useMedications: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('../hooks/usePetMedical', () => ({
  usePetVetVisits: vi.fn(() => ({ data: [], isLoading: false })),
  usePetTreatments: vi.fn(() => ({ data: [], isLoading: false })),
  usePetCareLog: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('../hooks/usePetHistory', () => ({
  usePetDevolutions: vi.fn(() => ({ data: [], isLoading: false })),
  usePetAdoptersHistory: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('../hooks/usePetNotes', () => ({
  usePetNotes: vi.fn(() => ({ data: [], isLoading: false })),
  useCreatePetNote: vi.fn(() => ({ mutate: vi.fn() })),
  useDeletePetNote: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock('../hooks/usePetLog', () => ({
  usePetLog: vi.fn(() => ({ data: [], isLoading: false })),
}));
vi.mock('../hooks/usePetTimeline', () => ({
  usePetTimeline: vi.fn(() => ({ data: [], isLoading: false })),
}));

import PetDetailV3 from './PetDetailV3';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('PetDetailV3 — render with real-like data', () => {
  it('renders without throwing', () => {
    let err = null;
    try {
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <PetDetailV3 />
          </MemoryRouter>
        </QueryClientProvider>
      );
    } catch (e) {
      err = e;
    }
    if (err) {
      console.error('ERROR:', err.message);
      console.error('STACK:', err.stack);
    }
    expect(err).toBeNull();
  });
});
