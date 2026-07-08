import { describe, it, expect } from 'vitest';
import { applyFeedFilters } from './feedFilters.js';

const PETS = [
  { id: 'sp-dog', species: 'dog', size: 'medium', city: 'São Paulo', state: 'SP', owner_id: 'u1' },
  { id: 'campinas-cat', species: 'cat', size: 'small', city: 'Campinas', state: 'SP', owner_id: 'u2' }, // ~95km de SP
  { id: 'rio-dog', species: 'dog', size: 'large', city: 'Rio de Janeiro', state: 'RJ', owner_id: 'u2' }, // ~360km de SP
  { id: 'interior-dog', species: 'dog', size: 'small', city: 'Holambra', state: 'SP', owner_id: 'u3' }, // fora da tabela
  { id: 'no-state-cat', species: 'cat', size: 'medium', city: 'Campinas', owner_id: 'u3' }, // sem UF
];

describe('pets/feedFilters domain', () => {
  it('returns everything when there are no filters', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS);
    expect(pets).toHaveLength(PETS.length);
    expect(locationFallback).toBe(false);
  });

  it('filters by species and size', () => {
    expect(applyFeedFilters(PETS, { species: 'dog' }).pets.map((p) => p.id))
      .toEqual(['sp-dog', 'rio-dog', 'interior-dog']);
    expect(applyFeedFilters(PETS, { species: 'dog', size: 'small' }).pets.map((p) => p.id))
      .toEqual(['interior-dog']);
  });

  it('hides the requesting user own pets when asked', () => {
    const { pets } = applyFeedFilters(PETS, { hideOwnerId: 'u2' });
    expect(pets.map((p) => p.id)).toEqual(['sp-dog', 'interior-dog', 'no-state-cat']);
  });

  it('with a known city and radius, keeps pets within the radius', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { cityText: 'São Paulo', radiusKm: 100 });
    expect(pets.map((p) => p.id)).toEqual(['sp-dog', 'campinas-cat', 'no-state-cat']);
    expect(locationFallback).toBe(false);
  });

  it('resolves pet coords by city name alone when the pet has no state', () => {
    const { pets } = applyFeedFilters(PETS, { cityText: 'São Paulo', radiusKm: 100 });
    expect(pets.some((p) => p.id === 'no-state-cat')).toBe(true);
  });

  it('with a city outside the coords table, matches by normalized text instead of dropping pets', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { cityText: '  holambra ', radiusKm: 25 });
    expect(pets.map((p) => p.id)).toEqual(['interior-dog']);
    expect(locationFallback).toBe(false);
  });

  it('city text match is case and accent insensitive without radius', () => {
    const { pets } = applyFeedFilters(PETS, { cityText: 'sao paulo', radiusKm: null });
    expect(pets.map((p) => p.id)).toEqual(['sp-dog']);
  });

  it('falls back to all matching pets when location empties the list', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { cityText: 'Manaus', radiusKm: 5 });
    expect(pets).toHaveLength(PETS.length);
    expect(locationFallback).toBe(true);
  });

  it('does not fall back when species/size filters (not location) empty the list', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { species: 'rabbit', cityText: 'São Paulo', radiusKm: 25 });
    expect(pets).toHaveLength(0);
    expect(locationFallback).toBe(false);
  });

  it('keeps species/size filters applied inside the location fallback', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { species: 'cat', cityText: 'Manaus', radiusKm: 5 });
    expect(pets.map((p) => p.id)).toEqual(['campinas-cat', 'no-state-cat']);
    expect(locationFallback).toBe(true);
  });
});
