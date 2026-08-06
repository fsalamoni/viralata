import { describe, it, expect } from 'vitest';
import {
  DEFAULT_FOCUS, normalizeFocus, focusPosition, photoFocusPosition,
} from './photoFocus.js';

describe('pets/domain/photoFocus', () => {
  describe('normalizeFocus', () => {
    it('usa o centro quando ausente/ inválido', () => {
      expect(normalizeFocus(null)).toEqual(DEFAULT_FOCUS);
      expect(normalizeFocus({})).toEqual(DEFAULT_FOCUS);
      expect(normalizeFocus({ x: 'a', y: NaN })).toEqual(DEFAULT_FOCUS);
    });

    it('mantém valores válidos e faz clamp a 0–100', () => {
      expect(normalizeFocus({ x: 30, y: 70 })).toEqual({ x: 30, y: 70 });
      expect(normalizeFocus({ x: -10, y: 200 })).toEqual({ x: 0, y: 100 });
    });
  });

  describe('focusPosition', () => {
    it('formata como object-position em porcentagem', () => {
      expect(focusPosition({ x: 25, y: 60 })).toBe('25% 60%');
      expect(focusPosition(null)).toBe('50% 50%');
    });
  });

  describe('photoFocusPosition', () => {
    const map = { 'https://x/a.jpg': { x: 20, y: 80 } };
    it('retorna o foco da url quando existe', () => {
      expect(photoFocusPosition(map, 'https://x/a.jpg')).toBe('20% 80%');
    });
    it('cai no centro quando a url não está no mapa ou o mapa é vazio', () => {
      expect(photoFocusPosition(map, 'https://x/b.jpg')).toBe('50% 50%');
      expect(photoFocusPosition(null, 'https://x/a.jpg')).toBe('50% 50%');
      expect(photoFocusPosition({}, undefined)).toBe('50% 50%');
    });
  });
});
