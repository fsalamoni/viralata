import { describe, it, expect } from 'vitest';
import { isCompatible } from './matching.js';

const baseProfile = {
  housing_type: 'house_with_yard',
  daily_walks: 'long',
  has_children: false,
  other_pets: [],
  budget_level: 'moderate',
};

const basePet = {
  status: 'available',
  size: 'medium',
  age_group: 'adult',
  needs_yard: false,
  needs_screened_apt: false,
  good_with_kids: true,
  good_with_dogs: true,
  good_with_cats: true,
  health_notes: '',
};

describe('functions/matching.isCompatible (cópia usada pelo Radar de Pets)', () => {
  it('retorna true para combinação compatível', () => {
    expect(isCompatible(baseProfile, basePet)).toBe(true);
  });

  it('retorna false para pet não disponível', () => {
    expect(isCompatible(baseProfile, { ...basePet, status: 'adopted' })).toBe(false);
  });

  it('bloqueia pet grande em apartamento', () => {
    const profile = { ...baseProfile, housing_type: 'apartment_screened' };
    expect(isCompatible(profile, { ...basePet, size: 'large' })).toBe(false);
  });

  it('bloqueia pet que não se dá com crianças quando há crianças', () => {
    const profile = { ...baseProfile, has_children: true };
    expect(isCompatible(profile, { ...basePet, good_with_kids: false })).toBe(false);
  });

  it('retorna false para perfil ou pet nulo', () => {
    expect(isCompatible(null, basePet)).toBe(false);
    expect(isCompatible(baseProfile, null)).toBe(false);
  });
});
