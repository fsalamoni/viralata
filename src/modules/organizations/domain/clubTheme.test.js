/**
 * @fileoverview Testes para o helper de tema visual por ONG.
 *
 * O tema persiste como objeto HSL dentro de `clubs.theme` no Firestore.
 * Esses testes cobrem:
 *  - Defaults saneados (8 campos: 5 gerais + 3 do card da ONG)
 *  - Sanitização de entradas hostis
 *  - Geração de style CSS variables
 *  - Normalização de input (escrita)
 */
import { describe, it, expect } from 'vitest';
import {
  CLUB_THEME_FIELDS,
  CLUB_THEME_SECTIONS,
  DEFAULT_CLUB_THEME,
  effectiveClubTheme,
  buildClubThemeStyle,
  normalizeClubThemeInput,
  sanitizeHslString,
} from '@/modules/organizations/domain/clubTheme';

describe('Estrutura do tema', () => {
  it('cobre os 8 campos configuráveis (5 gerais + 3 do card da ONG)', () => {
    expect(Object.keys(DEFAULT_CLUB_THEME)).toEqual(
      expect.arrayContaining([
        'primary', 'highlight', 'accent', 'background', 'card', // UI
        'cover_from', 'cover_to', 'cover_name',                    // Card da ONG
      ]),
    );
    expect(Object.keys(DEFAULT_CLUB_THEME).length).toBe(CLUB_THEME_FIELDS.length);
  });

  it('os 3 campos do card estão presentes e a estrutura section é válida', () => {
    const sections = CLUB_THEME_FIELDS.map((f) => f.section);
    expect(sections).toEqual(expect.arrayContaining(['principal', 'superfície', 'card']));

    const coverFields = CLUB_THEME_FIELDS.filter((f) => f.section === 'card');
    expect(coverFields.map((f) => f.key).sort()).toEqual(['cover_from', 'cover_name', 'cover_to']);
  });

  it('CLUB_THEME_SECTIONS lista 3 seções cobrindo todos os campos', () => {
    expect(CLUB_THEME_SECTIONS.length).toBe(3);
    const totalFieldsInSections = CLUB_THEME_SECTIONS.reduce(
      (acc, s) => acc + CLUB_THEME_FIELDS.filter((f) => f.section === s.key).length,
      0,
    );
    expect(totalFieldsInSections).toBe(CLUB_THEME_FIELDS.length);
  });

  it('cada valor é uma string HSL não-vazia', () => {
    Object.values(DEFAULT_CLUB_THEME).forEach((value) => {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
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

  it('preserva overrides válidos nos 5 campos gerais', () => {
    const t = effectiveClubTheme({ theme: { primary: '0 100% 50%' } });
    expect(t.primary).toBe('0 100% 50%');
    expect(t.highlight).toBe(DEFAULT_CLUB_THEME.highlight);
  });

  it('preserva overrides válidos nos 3 campos do card', () => {
    const t = effectiveClubTheme({ theme: {
      cover_from: '200 90% 50%',
      cover_to: '250 80% 55%',
      cover_name: '0 0% 100%',
    } });
    expect(t.cover_from).toBe('200 90% 50%');
    expect(t.cover_to).toBe('250 80% 55%');
    expect(t.cover_name).toBe('0 0% 100%');
  });

  it('ignora overrides inválidos e cai no default (em todos os 8 campos)', () => {
    const t = effectiveClubTheme({
      theme: {
        primary: '<corrompido>',
        cover_from: '<corrompido>',
        cover_name: 'javascript:alert(1)',
      },
    });
    expect(t.primary).toBe(DEFAULT_CLUB_THEME.primary);
    expect(t.cover_from).toBe(DEFAULT_CLUB_THEME.cover_from);
    expect(t.cover_name).toBe(DEFAULT_CLUB_THEME.cover_name);
  });
});

describe('buildClubThemeStyle', () => {
  it('gera CSS variables para os 8 campos', () => {
    const style = buildClubThemeStyle(DEFAULT_CLUB_THEME);
    expect(style['--primary']).toBe(DEFAULT_CLUB_THEME.primary);
    expect(style['--highlight']).toBe(DEFAULT_CLUB_THEME.highlight);
    expect(style['--accent']).toBe(DEFAULT_CLUB_THEME.accent);
    expect(style['--background']).toBe(DEFAULT_CLUB_THEME.background);
    expect(style['--card']).toBe(DEFAULT_CLUB_THEME.card);
    expect(style['--cover-from']).toBe(DEFAULT_CLUB_THEME.cover_from);
    expect(style['--cover-to']).toBe(DEFAULT_CLUB_THEME.cover_to);
    expect(style['--cover-name']).toBe(DEFAULT_CLUB_THEME.cover_name);
  });

  it('gera a variável derivada `--cover-gradient` montada a partir de cover_from/cover_to', () => {
    const style = buildClubThemeStyle({
      ...DEFAULT_CLUB_THEME,
      cover_from: '200 90% 50%',
      cover_to: '250 80% 55%',
    });
    expect(style['--cover-gradient']).toBe(
      'linear-gradient(135deg, hsl(200 90% 50%) 0%, hsl(250 80% 55%) 100%)',
    );
  });

  it('usa defaults se receber objeto vazio', () => {
    const style = buildClubThemeStyle({});
    expect(style['--primary']).toBe(DEFAULT_CLUB_THEME.primary);
    expect(style['--cover-gradient']).toContain('hsl');
  });

  it('a string do `--cover-gradient` é uma string válida para CSS', () => {
    const style = buildClubThemeStyle(DEFAULT_CLUB_THEME);
    expect(style['--cover-gradient']).toMatch(/^linear-gradient\(/);
    expect(style['--cover-gradient']).toContain('hsl(');
  });
});

describe('normalizeClubThemeInput', () => {
  it('saneia entrada arbitrária para os 8 campos', () => {
    const input = {
      primary: '12 80% 60%',
      highlight: 'hack(); DROP TABLE',
      // campo desconhecido é descartado
      unknown: 'qualquer',
    };
    const out = normalizeClubThemeInput(input);
    expect(out.primary).toBe('12 80% 60%');
    expect(out.highlight).toBe(DEFAULT_CLUB_THEME.highlight);
    expect(out.unknown).toBeUndefined();
    expect(Object.keys(out).sort()).toEqual(
      ['accent', 'background', 'card', 'cover_from', 'cover_name', 'cover_to', 'highlight', 'primary'],
    );
  });

  it('produz objeto com tipos estáveis (round-trip com effectiveClubTheme)', () => {
    const original = { primary: '100 50% 50%', cover_from: '0 0% 0%' };
    const normalized = normalizeClubThemeInput(original);
    const effective = effectiveClubTheme({ theme: normalized });
    expect(effective.primary).toBe('100 50% 50%');
    expect(effective.cover_from).toBe('0 0% 0%');
  });
});
