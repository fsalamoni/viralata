import { describe, it, expect } from 'vitest';
import { applyFeedFilters } from './feedFilters.js';

// Coleção de pets com distâncias aproximadas a partir de São Paulo:
//   - campinas  ≈ 95km
//   - holambra  ≈ 120km (fora da tabela de coordenadas)
//   - rio       ≈ 360km
const PETS = [
  { id: 'sp-dog',         species: 'dog',    size: 'medium', city: 'São Paulo',       state: 'SP', owner_id: 'u1' },
  { id: 'campinas-cat',   species: 'cat',    size: 'small',  city: 'Campinas',        state: 'SP', owner_id: 'u2' },
  { id: 'rio-dog',        species: 'dog',    size: 'large',  city: 'Rio de Janeiro',  state: 'RJ', owner_id: 'u2' },
  { id: 'interior-dog',   species: 'dog',    size: 'small',  city: 'Holambra',        state: 'SP', owner_id: 'u3' }, // fora da tabela
  { id: 'no-state-cat',   species: 'cat',    size: 'medium', city: 'Campinas',                 owner_id: 'u3' }, // sem UF
];

describe('pets/feedFilters domain', () => {
  it('devolve todos os pets quando não há filtros', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS);
    expect(pets).toHaveLength(PETS.length);
    expect(locationFallback).toBe(false);
  });

  it('tolera entrada vazia, nula ou não-array', () => {
    expect(applyFeedFilters([]).pets).toEqual([]);
    expect(applyFeedFilters(null).pets).toEqual([]);
    expect(applyFeedFilters(undefined).pets).toEqual([]);
    expect(applyFeedFilters('not an array').pets).toEqual([]);
  });

  it('filtra por espécie e porte separadamente', () => {
    expect(applyFeedFilters(PETS, { species: 'dog' }).pets.map((p) => p.id))
      .toEqual(['sp-dog', 'rio-dog', 'interior-dog']);
    expect(applyFeedFilters(PETS, { size: 'small' }).pets.map((p) => p.id))
      .toEqual(['campinas-cat', 'interior-dog']);
    expect(applyFeedFilters(PETS, { species: 'dog', size: 'small' }).pets.map((p) => p.id))
      .toEqual(['interior-dog']);
  });

  it('esconde pets do próprio dono quando solicitado', () => {
    const { pets } = applyFeedFilters(PETS, { hideOwnerId: 'u2' });
    expect(pets.map((p) => p.id)).toEqual(['sp-dog', 'interior-dog', 'no-state-cat']);
  });

  it('com cidade conhecida e raio, mantém pets dentro do raio', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { cityText: 'São Paulo', radiusKm: 100 });
    expect(pets.map((p) => p.id)).toEqual(['sp-dog', 'campinas-cat', 'no-state-cat']);
    expect(locationFallback).toBe(false);
  });

  it('resolve coords do pet pelo nome da cidade quando a UF está ausente', () => {
    const { pets } = applyFeedFilters(PETS, { cityText: 'São Paulo', radiusKm: 100 });
    expect(pets.some((p) => p.id === 'no-state-cat')).toBe(true);
  });

  it('cidade fora da tabela de coords faz matching por texto normalizado (com raio)', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { cityText: '  holambra ', radiusKm: 25 });
    expect(pets.map((p) => p.id)).toEqual(['interior-dog']);
    expect(locationFallback).toBe(false);
  });

  it('matching de cidade é case/accents/space-insensitive sem raio', () => {
    const { pets } = applyFeedFilters(PETS, { cityText: 'sao paulo', radiusKm: null });
    expect(pets.map((p) => p.id)).toEqual(['sp-dog']);
  });

  it('quando o raio zera os resultados, aplica fallback de localização preservando filtros estruturais', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { cityText: 'Manaus', radiusKm: 5 });
    expect(pets).toHaveLength(PETS.length);
    expect(locationFallback).toBe(true);
  });

  it('NÃO ativa fallback quando os filtros estruturais é que zeraram a lista', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { species: 'rabbit', cityText: 'São Paulo', radiusKm: 25 });
    expect(pets).toHaveLength(0);
    expect(locationFallback).toBe(false);
  });

  it('fallback mantém os filtros estruturais (espécie/porte) aplicados', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { species: 'cat', cityText: 'Manaus', radiusKm: 5 });
    expect(pets.map((p) => p.id)).toEqual(['campinas-cat', 'no-state-cat']);
    expect(locationFallback).toBe(true);
  });

  it('cidade desconhecida sem pets por texto também ativa o fallback (base > 0)', () => {
    const { pets, locationFallback } = applyFeedFilters(PETS, { cityText: 'Cidade Inexistente', radiusKm: 100 });
    expect(pets).toHaveLength(PETS.length);
    expect(locationFallback).toBe(true);
  });
});