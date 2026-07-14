/**
 * @fileoverview Testes do SimilarPets (TASK-324).
 * Smoke tests sem @testing-library (usa forwardRef-toBeTruthy pattern).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const useFeatureFlagMock = vi.hoisted(() => vi.fn());
vi.mock('@/core/lib/FeatureFlagsContext', () => ({
  useFeatureFlag: useFeatureFlagMock,
}));

vi.mock('@/modules/shelter/domain/constants', () => ({
  SHELTER_FEATURE_FLAG: { SHELTER_SIMILAR_PETS: 'shelter_similar_pets' },
}));

import { SimilarPets } from './SimilarPets.jsx';

const MOCK_PET = {
  id: 'pet-1',
  title: 'Bolinha',
  species: 'dog',
  size: 'medium',
  age_group: 'adult',
  city: 'São Paulo',
  photos: ['https://example.com/bolinha.jpg'],
};

const MOCK_SIMILAR = [
  { id: 'pet-2', title: 'Luna', species: 'dog', size: 'medium', age_group: 'puppy', city: 'São Paulo', photos: [] },
  { id: 'pet-3', title: 'Thor', species: 'dog', size: 'large', age_group: 'adult', city: 'Rio de Janeiro', photos: [] },
  { id: 'pet-4', title: 'Mia', species: 'cat', size: 'small', age_group: 'adult', city: 'São Paulo', photos: [] },
];

describe('SimilarPets (TASK-324)', () => {
  it('é uma função', () => {
    expect(typeof SimilarPets).toBe('function');
  });

  it('retorna JSX (forwardRef)', () => {
    const result = SimilarPets({ pet: MOCK_PET, similarPets: [], isLoading: false });
    expect(result).toBeTruthy();
  });

  it('retorna JSX com pet diverso', () => {
    const result = SimilarPets({ pet: {}, similarPets: MOCK_SIMILAR, isLoading: false });
    expect(result).toBeTruthy();
  });

  it('não crasha com empty props', () => {
    expect(() => SimilarPets({ pet: null, similarPets: [], isLoading: false })).not.toThrow();
  });

  it('não crasha com similarPets undefined', () => {
    expect(() => SimilarPets({ pet: MOCK_PET, similarPets: undefined, isLoading: false })).not.toThrow();
  });

  it('não crasha com pet sem city', () => {
    const noCity = { id: 'pet-x', species: 'dog' };
    expect(() => SimilarPets({ pet: noCity, similarPets: MOCK_SIMILAR, isLoading: false })).not.toThrow();
  });

  it('função tem aria-label no output', () => {
    const result = SimilarPets({ pet: MOCK_PET, similarPets: [], isLoading: false });
    const str = JSON.stringify(result);
    // Section deve ter aria-label
    expect(str).toContain('Pets similares');
  });
});
