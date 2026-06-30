import { describe, it, expect } from 'vitest';
import { isCompatible, filterCompatiblePets, sortByRelevance } from './matching.js';

const baseProfile = {
  housing_type: 'house_with_yard',
  has_yard: true,
  daily_walks: 'long',
  has_children: false,
  has_elderly: false,
  other_pets: [],
  budget_level: 'moderate',
  profile_completed: true,
};

const basePet = {
  status: 'available',
  size: 'medium',
  age_group: 'adult',
  species: 'dog',
  needs_yard: false,
  needs_screened_apt: false,
  good_with_kids: true,
  good_with_dogs: true,
  good_with_cats: true,
  health_notes: '',
};

describe('isCompatible', () => {
  it('retorna false para pet não disponível', () => {
    expect(isCompatible(baseProfile, { ...basePet, status: 'adopted' })).toBe(false);
  });

  it('retorna true para combinação compatível', () => {
    expect(isCompatible(baseProfile, basePet)).toBe(true);
  });

  it('bloqueia pet grande em apartamento', () => {
    const profile = { ...baseProfile, housing_type: 'apartment_screened' };
    const pet = { ...basePet, size: 'large' };
    expect(isCompatible(profile, pet)).toBe(false);
  });

  it('bloqueia pet que precisa de pátio em apartamento', () => {
    const profile = { ...baseProfile, housing_type: 'apartment_screened' };
    const pet = { ...basePet, needs_yard: true };
    expect(isCompatible(profile, pet)).toBe(false);
  });

  it('permite pet que precisa de pátio em casa com pátio', () => {
    const pet = { ...basePet, needs_yard: true };
    expect(isCompatible(baseProfile, pet)).toBe(true);
  });

  it('bloqueia pet que não se dá com crianças quando há crianças', () => {
    const profile = { ...baseProfile, has_children: true };
    const pet = { ...basePet, good_with_kids: false };
    expect(isCompatible(profile, pet)).toBe(false);
  });

  it('bloqueia pet que não se dá com cães quando há cão em casa', () => {
    const profile = { ...baseProfile, other_pets: ['dog'] };
    const pet = { ...basePet, good_with_dogs: false };
    expect(isCompatible(profile, pet)).toBe(false);
  });

  it('bloqueia filhote grande para quem não passeia', () => {
    const profile = { ...baseProfile, daily_walks: 'none' };
    const pet = { ...basePet, age_group: 'puppy', size: 'large' };
    expect(isCompatible(profile, pet)).toBe(false);
  });

  it('bloqueia pet com necessidades especiais para orçamento básico', () => {
    const profile = { ...baseProfile, budget_level: 'basic' };
    const pet = { ...basePet, health_notes: 'Diabetes — insulina diária' };
    expect(isCompatible(profile, pet)).toBe(false);
  });

  it('retorna false para perfil ou pet nulo', () => {
    expect(isCompatible(null, basePet)).toBe(false);
    expect(isCompatible(baseProfile, null)).toBe(false);
  });
});

describe('filterCompatiblePets', () => {
  it('retorna apenas pets compatíveis', () => {
    const pets = [
      { ...basePet, id: '1' },
      { ...basePet, id: '2', status: 'adopted' },
      { ...basePet, id: '3', size: 'large' },
    ];
    const profile = { ...baseProfile, housing_type: 'apartment_screened' };
    const result = filterCompatiblePets(pets, profile);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('retorna array vazio para lista vazia', () => {
    expect(filterCompatiblePets([], baseProfile)).toEqual([]);
  });
});

describe('sortByRelevance', () => {
  it('ordena por priority_score decrescente', () => {
    const pets = [
      { id: 'a', priority_score: 0, created_at: { seconds: 100 } },
      { id: 'b', priority_score: 10, created_at: { seconds: 200 } },
    ];
    const sorted = sortByRelevance(pets);
    expect(sorted[0].id).toBe('b');
  });
});
