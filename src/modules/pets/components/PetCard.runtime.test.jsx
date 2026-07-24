import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock IntersectionObserver (usado por Framer Motion)
class MockIntersectionObserver {
  observe() {}
  disconnect() {}
  unobserve() {}
}
global.IntersectionObserver = MockIntersectionObserver;

vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { uid: 'u1', display_name: 'Alice' },
    isAuthenticated: true,
  })),
}));

vi.mock('@/modules/pets/hooks/usePetPermissions', () => ({
  usePetPermissions: vi.fn(() => ({
    canFavorite: true,
    isFavorited: false,
  })),
}));

import PetCard from './PetCard';

const mockPet = {
  id: 'p1',
  pet_seq: 1,
  name: 'Rex',
  photo_url: 'https://example.com/rex.jpg',
  species: 'dog',
  breed: 'Vira-lata',
  gender: 'male',
  size: 'medium',
  city: 'São Paulo',
  state: 'SP',
  status: 'available',
};

const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;

describe('PetCard — runtime safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without throwing with full pet data', () => {
    expect(() => {
      render(<PetCard pet={mockPet} />, { wrapper });
    }).not.toThrow();
  });

  it('renders without throwing with minimal pet data', () => {
    const minimalPet = { id: 'p2', name: 'Toby' };
    expect(() => {
      render(<PetCard pet={minimalPet} />, { wrapper });
    }).not.toThrow();
  });

  it('displays pet name when provided', () => {
    render(<PetCard pet={mockPet} />, { wrapper });
    expect(screen.getByText('Rex')).toBeInTheDocument();
  });

  it('handles missing photo_url gracefully', () => {
    const petWithoutPhoto = { ...mockPet, photo_url: null };
    expect(() => {
      render(<PetCard pet={petWithoutPhoto} />, { wrapper });
    }).not.toThrow();
  });

  it('handles empty pet object (edge case)', () => {
    expect(() => {
      render(<PetCard pet={{}} />, { wrapper });
    }).not.toThrow();
  });
});
