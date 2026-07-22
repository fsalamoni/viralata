/**
 * @fileoverview PetNotes.runtime.test.jsx — Validação que PetNotes renderiza
 * sem ReferenceError. Testa que TODOS os ícones MessageSquare funcionam.
 *
 * TASK-V3-PET-OPS-LOG-08 (sw-v72.5): bug recorrente.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

// Mock dos hooks
vi.mock('../hooks/usePetNotes', () => ({
  usePetNotes: vi.fn(() => ({ data: [], isLoading: false })),
  useCreatePetNote: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeletePetNote: vi.fn(() => ({ mutate: vi.fn() })),
}));
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({ user: { uid: 'u1' } })),
}));

import PetNotes from './PetNotes';

describe('PetNotes — runtime safety', () => {
  it('renders without ReferenceError', () => {
    expect(() => {
      render(<PetNotes petId="p1" canManage={true} />);
    }).not.toThrow();
  });

  it('renders with empty notes list', () => {
    const { container } = render(<PetNotes petId="p1" canManage={true} />);
    expect(container).toBeDefined();
  });
});
