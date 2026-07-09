/**
 * @fileoverview Testes para o helper de tema visual por ONG.
 *
 * O tema persiste como objeto HSL dentro de `clubs.theme` no Firestore.
 * Esses testes cobrem:
 *  - Defaults saneados
 *  - Sanitização de entradas hostis
 *  - Geração de style CSS variables
 *  - Normalização de input (escrita)
 */
import { describe, it, expect } from 'vitest';
import {
  CLUB_THEME_FIELDS,
  DEFAULT_CLUB_THEME,
  effectiveClubTheme,
  buildClubThemeStyle,
  normalizeClubThemeInput,
  sanitizeHslString,
} from '@/modules/organizations/domain/clubTheme';

describe('DEFAULT_CLUB_THEME', () => {
  it('cobre os 5 campos configuráveis', () => {
    expect(Object.keys(DEFAULT_CLUB_THEME)).toEqual(
      expect.arrayContaining(['primary', 'highlight', 'accent', 'background', 'card']),
    );
    expect(Object.keys(DEFAULT_CLUB_THEME).length).toBe(CLUB_THEME_FIELDS.length);
  });

  it('cada valor é uma string HSL não-vazia', () => {
    Object.values(DEFAULT_CLUB_THEME).forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
      // Não deve conter vírgulas nem 'hsl(' — formato Tailwind sem prefixo.
      expect(value).not.toMatch(/,/);
      expect(value).not.toMatch(/hsl\(/);
    });
  });
});

describe('sanitizeHslString', () => {
  it('retorna o fallback se a entrada não for string', () => {
    expect(sanitizeHslString(null, 'fallback')).toBe('fallback');
    expect(sanitizeHslString(undefined, 'fallback')).toBe('fallback');
    expect(sanitizeHslString(123, 'fallback')).toBe('fallback');
  });

  it('retorna o fallback se a string for vazia', () => {
    expect(sanitizeHslString('', 'fallback')).toBe('fallback');
    expect(sanitizeHslString('   ', 'fallback')).toBe('fallback');
  });

  it('rejeita entrada com caracteres não-HSL', () => {
    expect(sanitizeHslString('red', 'fallback')).toBe('fallback');
    expect(sanitizeHslString('<script>', 'fallback')).toBe('fallback');
  });

  it('aceita HSL bem-formado', () => {
    expect(sanitizeHslString('17 72% 45%', 'fallback')).toBe('17 72% 45%');
    expect(sanitizeHslString('0 0% 100%', 'fallback')).toBe('0 0% 100%');
  });

  it('limita tamanho absurdo (defesa contra payloads grandes)', () => {
    const huge = `${'1'.repeat(5000)}`;
    const result = sanitizeHslString(huge, 'fallback');
    expect(result.length).toBeLessThanOrEqual(64);
  });
});

describe('effectiveClubTheme', () => {
  it('retorna defaults para clube sem tema', () => {
    const t = effectiveClubTheme(null);
    expect(t).toEqual(DEFAULT_CLUB_THEME);
  });

  it('retorna defaults para clube com theme vazio', () => {
    const t = effectiveClubTheme({ theme: {} });
    expect(t).toEqual(DEFAULT_CLUB_THEME);
  });

  it('preserva overrides válidos', () => {
    const t = effectiveClubTheme({ theme: { primary: '0 100% 50%' } });
    expect(t.primary).toBe('0 100% 50%');
    // Demais caem no default.
    expect(t.highlight).toBe(DEFAULT_CLUB_THEME.highlight);
  });

  it('ignora overrides inválidos e cai no default', () => {
    const t = effectiveClubTheme({ theme: { primary: '<corrompido>' } });
    expect(t.primary).toBe(DEFAULT_CLUB_THEME.primary);
  });
});

describe('buildClubThemeStyle', () => {
  it('gera CSS variables para os 5 campos', () => {
    const style = buildClubThemeStyle(DEFAULT_CLUB_THEME);
    expect(style['--primary']).toBe(DEFAULT_CLUB_THEME.primary);
    expect(style['--highlight']).toBe(DEFAULT_CLUB_THEME.highlight);
    expect(style['--accent']).toBe(DEFAULT_CLUB_THEME.accent);
    expect(style['--background']).toBe(DEFAULT_CLUB_THEME.background);
    expect(style['--card']).toBe(DEFAULT_CLUB_THEME.card);
  });

  it('usa defaults se receber objeto vazio', () => {
    const style = buildClubThemeStyle({});
    expect(style['--primary']).toBe(DEFAULT_CLUB_THEME.primary);
  });
});

describe('normalizeClubThemeInput', () => {
  it('saneia entrada arbitrária para os 5 campos', () => {
    const input = {
      primary: '12 80% 60%',
      highlight: 'hack(); DROP TABLE',
      // campo desconhecido é descartado
      unknown: 'qualquer',
    };
    const out = normalizeClubThemeInput(input);
    expect(out.primary).toBe('12 80% 60%');
    expect(out.highlight).toBe(DEFAULT_CLUB_THEME.highlight); // fallback
    expect(out.unknown).toBeUndefined();
    // Todos os 5 campos devem existir
    expect(Object.keys(out).sort()).toEqual(
      ['accent', 'background', 'card', 'highlight', 'primary'],
    );
  });

  it('produz objeto com tipos estáveis (round-trip com effectiveClubTheme)', () => {
    const original = { primary: '100 50% 50%' };
    const normalized = normalizeClubThemeInput(original);
    const effective = effectiveClubTheme({ theme: normalized });
    expect(effective.primary).toBe('100 50% 50%');
  });
});
