import { describe, it, expect } from 'vitest';
import {
  lookupCityCoords, lookupCityCoordsByName, haversineKm, resolvePetCoords, hasKnownCoords, normalizePlaceText,
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
});
