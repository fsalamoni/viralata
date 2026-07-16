import { describe, it, expect } from 'vitest';
import {
  lookupCityCoords, lookupCityCoordsByName, haversineKm, resolvePetCoords, hasKnownCoords, normalizePlaceText, filterByRadius,
} from './geoDistance.js';

describe('pets/geoDistance domain', () => {
  describe('lookupCityCoords', () => {
    it('finds a known capital regardless of accents/case', () => {
      expect(lookupCityCoords('São Paulo', 'SP')).toEqual([-23.55, -46.63]);
      expect(lookupCityCoords('sao paulo', 'sp')).toEqual([-23.55, -46.63]);
      expect(lookupCityCoords('SÃO PAULO', 'SP')).toEqual([-23.55, -46.63]);
    });
    it('returns null for an unknown city', () => {
      expect(lookupCityCoords('Cidade Inventada', 'XX')).toBeNull();
    });
    it('requires the correct state for a real city', () => {
      expect(lookupCityCoords('São José', 'SC')).not.toBeNull();
      expect(lookupCityCoords('São José', 'ZZ')).toBeNull();
    });
  });

  describe('lookupCityCoordsByName', () => {
    it('finds a known city by name alone, no state needed', () => {
      expect(lookupCityCoordsByName('curitiba')).toEqual([-25.43, -49.27]);
      expect(lookupCityCoordsByName('CURITIBA')).toEqual([-25.43, -49.27]);
    });
    it('returns null for an unknown city name', () => {
      expect(lookupCityCoordsByName('Vila Sem Nome')).toBeNull();
    });
  });

  describe('haversineKm', () => {
    it('is ~0 for the same point', () => {
      expect(haversineKm([-23.55, -46.63], [-23.55, -46.63])).toBeCloseTo(0, 3);
    });
    it('matches the known approximate distance between São Paulo and Rio de Janeiro (~360km)', () => {
      const dist = haversineKm([-23.55, -46.63], [-22.91, -43.17]);
      expect(dist).toBeGreaterThan(340);
      expect(dist).toBeLessThan(380);
    });
    it('calculates the distance between the North and South poles (~20015km)', () => {
      expect(haversineKm([90, 0], [-90, 0])).toBeCloseTo(20015, 0);
    });
    it('calculates distance accurately when crossing the equator', () => {
      expect(haversineKm([1, 1], [-1, -1])).toBeCloseTo(314.5, 1);
    });
    it('calculates distance accurately when crossing the antimeridian', () => {
      expect(haversineKm([10, 179], [10, -179])).toBeCloseTo(219, 0);
    });
    it('calculates 1 degree of latitude to be ~111km', () => {
      expect(haversineKm([0, 0], [1, 0])).toBeCloseTo(111.19, 1);
    });
    it('calculates 1 degree of longitude at the equator to be ~111km', () => {
      expect(haversineKm([0, 0], [0, 1])).toBeCloseTo(111.19, 1);
    });
  });

  describe('hasKnownCoords', () => {
    it('true for a known city name, false otherwise', () => {
      expect(hasKnownCoords('Curitiba')).toBe(true);
      expect(hasKnownCoords('Vila Sem Nome')).toBe(false);
    });
  });

  describe('normalizePlaceText', () => {
    it('trims, lowercases and strips accents', () => {
      expect(normalizePlaceText('  São Paulo ')).toBe('sao paulo');
      expect(normalizePlaceText('CURITIBA')).toBe('curitiba');
      expect(normalizePlaceText(null)).toBe('');
    });
  });

  describe('resolvePetCoords', () => {
    it('resolves by city + state', () => {
      expect(resolvePetCoords({ city: 'São Paulo', state: 'SP' })).toEqual([-23.55, -46.63]);
    });
    it('falls back to city name alone when the state is missing or wrong', () => {
      expect(resolvePetCoords({ city: 'Campinas' })).toEqual([-22.91, -47.06]);
      expect(resolvePetCoords({ city: 'Campinas', state: '' })).toEqual([-22.91, -47.06]);
    });
    it('returns null for a city outside the table', () => {
      expect(resolvePetCoords({ city: 'Cidade Fora Da Tabela', state: 'XX' })).toBeNull();
    });
  });

  describe('filterByRadius', () => {
    const items = [
      { id: 'sp', city: 'São Paulo', state: 'SP' },
      { id: 'campinas', city: 'Campinas', state: 'SP' }, // ~95km de SP
      { id: 'rio', city: 'Rio de Janeiro', state: 'RJ' }, // ~360km de SP
      { id: 'interior', city: 'Holambra', state: 'SP' }, // fora da tabela
    ];
    const origin = lookupCityCoordsByName('São Paulo');

    it('returns null when there is no origin coordinate', () => {
      expect(filterByRadius(items, null, 50)).toBeNull();
    });

    it('keeps items within the radius', () => {
      expect(filterByRadius(items, origin, 100, 'São Paulo').map((i) => i.id)).toEqual(['sp', 'campinas']);
      expect(filterByRadius(items, origin, 400, 'São Paulo').map((i) => i.id)).toEqual(['sp', 'campinas', 'rio']);
    });

    it('keeps items registered in the searched city even without known coords', () => {
      const holambra = [{ id: 'x', city: ' HOLAMBRA ', state: 'SP' }];
      // origem conhecida (São Paulo) + busca textual por Holambra não ocorre
      // junto na prática, mas a regra da própria cidade é o que importa:
      expect(filterByRadius(holambra, origin, 5, 'holambra').map((i) => i.id)).toEqual(['x']);
    });

    it('resolves coords by name alone when the state is missing', () => {
      expect(filterByRadius([{ id: 'c', city: 'Campinas' }], origin, 100, 'São Paulo').map((i) => i.id)).toEqual(['c']);
    });
  });
});
