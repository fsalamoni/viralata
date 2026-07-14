import { describe, it, expect } from 'vitest';
import { isCompatible, filterCompatiblePets, sortByRelevance, calculateMatchScore, getMatchBadge } from './matching.js';

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

describe('calculateMatchScore — TASK-310', () => {
  it('retorna 0 para perfil ou pet nulo', () => {
    expect(calculateMatchScore(null, basePet)).toBe(0);
    expect(calculateMatchScore(baseProfile, null)).toBe(0);
  });

  it('retorna 100 para combinação ideal', () => {
    const profile = {
      housing_type: 'house_with_yard',
      household_children: 0,
      other_pets: [],
      daily_walks: 'long',
      budget_level: 'high',
    };
    const pet = { size: 'medium', needs_yard: false, good_with_kids: true, good_with_dogs: true };
    expect(calculateMatchScore(profile, pet)).toBe(100);
  });

  it('deduz 30 por pet grande em apartamento', () => {
    const profile = { housing_type: 'apartment_screened', household_children: 0, other_pets: [], daily_walks: 'long', budget_level: 'high' };
    const pet = { size: 'large', needs_yard: false, good_with_kids: true, good_with_dogs: true };
    expect(calculateMatchScore(profile, pet)).toBe(70);
  });

  it('deduz 25 por pet que precisa de pátio sem ter', () => {
    const profile = { housing_type: 'house_with_yard', household_children: 0, other_pets: [], daily_walks: 'long', budget_level: 'high' };
    const pet = { size: 'large', needs_yard: true, good_with_kids: true, good_with_dogs: true };
    // large pet + needs_yard=true in house_with_yard = no deduction for yard (has yard)
    // → 100
    expect(calculateMatchScore(profile, pet)).toBe(100);
  });

  it('deduz 25 por pet que precisa de pátio em apartamento', () => {
    const profile = { housing_type: 'apartment_unscreened', household_children: 0, other_pets: [], daily_walks: 'long', budget_level: 'high' };
    const pet = { size: 'large', needs_yard: true, good_with_kids: true, good_with_dogs: true };
    // needs_yard + no yard: -25, apartment large: -30
    expect(calculateMatchScore(profile, pet)).toBe(45);
  });

  it('deduz 30 por pet que não se dá com crianças quando há crianças', () => {
    const profile = { housing_type: 'house_with_yard', household_children: 2, other_pets: [], daily_walks: 'long', budget_level: 'high' };
    const pet = { size: 'medium', needs_yard: false, good_with_kids: false, good_with_dogs: true };
    expect(calculateMatchScore(profile, pet)).toBe(70);
  });

  it('deduz 20 por pet com necessidades de saúde + orçamento básico', () => {
    const profile = { housing_type: 'house_with_yard', household_children: 0, other_pets: [], daily_walks: 'long', budget_level: 'basic' };
    const pet = { size: 'medium', needs_yard: false, good_with_kids: true, good_with_dogs: true, health_notes: 'Diabetes' };
    expect(calculateMatchScore(profile, pet)).toBe(80);
  });

  it('soma bônus de +10 para pet pequeno/médio em apartamento', () => {
    const profile = { housing_type: 'apartment_screened', household_children: 0, other_pets: [], daily_walks: 'long', budget_level: 'high' };
    const pet = { size: 'small', needs_yard: false, good_with_kids: true, good_with_dogs: true };
    // 100 base - 0 deduções + 10 bônus = 110 → clampado a 100
    expect(calculateMatchScore(profile, pet)).toBe(100);
  });

  it('clampa em 0 quando há muitas deduções', () => {
    const profile = { housing_type: 'apartment_unscreened', household_children: 3, other_pets: ['dog', 'cat'], daily_walks: 'none', budget_level: 'basic' };
    const pet = { size: 'giant', needs_yard: true, good_with_kids: false, good_with_dogs: false, good_with_cats: false, age_group: 'puppy', health_notes: 'Cirurgia necessária' };
    // many deductions → should clamp to 0
    expect(calculateMatchScore(profile, pet)).toBe(0);
  });
});

describe('getMatchBadge', () => {
  it('alto >= 75', () => {
    expect(getMatchBadge(75).label).toBe('Match alto');
    expect(getMatchBadge(100).label).toBe('Match alto');
    expect(getMatchBadge(75).variant).toBe('high');
  });

  it('médio 40-74', () => {
    expect(getMatchBadge(74).label).toBe('Match médio');
    expect(getMatchBadge(40).label).toBe('Match médio');
    expect(getMatchBadge(74).variant).toBe('medium');
  });

  it('baixo < 40', () => {
    expect(getMatchBadge(39).label).toBe('Match baixo');
    expect(getMatchBadge(0).label).toBe('Match baixo');
    expect(getMatchBadge(39).variant).toBe('low');
  });
});
