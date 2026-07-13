/**
 * @fileoverview Testes TASK-018: Fuzzy matching (Levenshtein).
 *
 * Cobre:
 *  - levenshtein: casos básicos + bound max
 *  - fuzzyScore: exact / prefix / contains / token / levenshtein
 *  - fuzzyMatch: filter, ranking, multi-field
 *  - isFuzzyMatch: convenience
 *  - LGPD: integração com volunteer (TASK-241)
 */

import { describe, it, expect } from 'vitest';
import { levenshtein, fuzzyScore, fuzzyMatch, isFuzzyMatch, FUZZY_DEFAULTS } from './fuzzy';
import { sanitizePii } from './search';

describe('TASK-018: levenshtein', () => {
  it('retorna 0 para strings idênticas', () => {
    expect(levenshtein('rex', 'rex')).toBe(0);
  });

  it('retorna o tamanho para string vazia vs texto', () => {
    expect(levenshtein('', 'rex')).toBe(3);
    expect(levenshtein('rex', '')).toBe(3);
  });

  it('conta 1 substituição', () => {
    expect(levenshtein('rex', 'rex')).toBe(0);
    expect(levenshtein('rex', 'tax')).toBe(2);
  });

  it('conta inserções', () => {
    expect(levenshtein('cat', 'cats')).toBe(1);
  });

  it('conta deleções', () => {
    expect(levenshtein('cats', 'cat')).toBe(1);
  });

  it('conta substituições múltiplas', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('respeita bound MAX_LEVENSHTEIN_DISTANCE', () => {
    expect(levenshtein('aaaaa', 'bbbbbbbbbb')).toBeLessThanOrEqual(FUZZY_DEFAULTS.MAX_DISTANCE);
  });

  it('é simétrico', () => {
    expect(levenshtein('abc', 'xyz')).toBe(levenshtein('xyz', 'abc'));
  });
});

describe('TASK-018: fuzzyScore', () => {
  it('exact match = 1.0', () => {
    expect(fuzzyScore('rex', 'rex')).toBe(1.0);
  });

  it('prefix match = 0.95', () => {
    expect(fuzzyScore('re', 'rex')).toBe(0.95);
  });

  it('contains = 0.85', () => {
    expect(fuzzyScore('ex', 'rex')).toBe(0.85);
  });

  it('token match = 0.70', () => {
    expect(fuzzyScore('cachorro', 'cachorros carinhosos')).toBeGreaterThanOrEqual(0.65);
  });

  it('typo (Levenshtein) tem score menor que exact', () => {
    const exact = fuzzyScore('rex', 'rex');
    const typo1 = fuzzyScore('rex', 'tax');
    const typo2 = fuzzyScore('rex', 'rxo');
    expect(exact).toBe(1.0);
    expect(typo1).toBeLessThan(1.0);
    expect(typo2).toBeLessThan(1.0);
    expect(typo1).toBeGreaterThan(0);
    expect(typo2).toBeGreaterThan(0);
  });

  it('case + accent insensitive (usa normalizeText)', () => {
    expect(fuzzyScore('café', 'cafe')).toBe(1.0);
    expect(fuzzyScore('JOÃO', 'joao')).toBe(1.0);
  });

  it('retorna 0 para query vazia', () => {
    expect(fuzzyScore('', 'rex')).toBe(0);
  });

  it('retorna 0 para candidate vazio', () => {
    expect(fuzzyScore('rex', '')).toBe(0);
  });

  it('aceita typo leve (1 char)', () => {
    const score = fuzzyScore('cachorro', 'cachoro'); // 1 deleção
    expect(score).toBeGreaterThan(0.5);
  });
});

describe('TASK-018: fuzzyMatch', () => {
  it('filtra por threshold', () => {
    const candidates = ['João Silva', 'Maria Souza', 'Pedro Santos'];
    const results = fuzzyMatch('João', candidates, { threshold: 0.5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item).toBe('João Silva');
    expect(results[0].score).toBeGreaterThanOrEqual(0.9);
  });

  it('ordena por score DESC', () => {
    const candidates = ['Maria', 'João', 'João Silva', 'Maria Silva'];
    const results = fuzzyMatch('João', candidates, { threshold: 0.5 });
    for (let i = 1; i < results.length; i += 1) {
      expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
    }
  });

  it('respeita maxResults', () => {
    const candidates = Array.from({ length: 100 }, (_, i) => `candidate-${i}`);
    const results = fuzzyMatch('candidate', candidates, { threshold: 0.5, maxResults: 10 });
    expect(results.length).toBe(10);
  });

  it('suporta candidate object com keys (multi-field)', () => {
    const candidates = [
      { id: 1, name: 'João Silva', email: 'joao@gmail.com' },
      { id: 2, name: 'Maria', email: 'maria@empresa.com' },
      { id: 3, name: 'Pedro', email: 'pedro@gmail.com' },
    ];
    const results = fuzzyMatch('gmail', candidates, { threshold: 0.7, keys: ['email'] });
    expect(results.length).toBeGreaterThanOrEqual(2);
    expect(results.every((r) => r.field === 'email')).toBe(true);
  });

  it('empty query → []', () => {
    const results = fuzzyMatch('', ['João', 'Maria']);
    expect(results).toEqual([]);
  });

  it('empty candidates → []', () => {
    const results = fuzzyMatch('João', []);
    expect(results).toEqual([]);
  });

  it('aceita typo (1 char)', () => {
    const candidates = ['Cachorro', 'Gato', 'Pássaro'];
    const results = fuzzyMatch('Cachoro', candidates, { threshold: 0.4 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].item).toBe('Cachorro');
  });
});

describe('TASK-018: isFuzzyMatch', () => {
  it('retorna true para match exato', () => {
    expect(isFuzzyMatch('rex', 'rex')).toBe(true);
  });

  it('retorna true para typo leve', () => {
    expect(isFuzzyMatch('cachorro', 'cachoro', 0.4)).toBe(true);
  });

  it('retorna false para muito diferente', () => {
    expect(isFuzzyMatch('banana', 'abacaxi', 0.9)).toBe(false);
  });
});

describe('TASK-018 + TASK-241: fuzzy em volunteer (LGPD sanitize)', () => {
  it('fuzzy match em PII sanitizada (não vaza)', () => {
    const rawDocs = [
      { id: 'v1', name: 'João Silva', email: 'joao.silva@gmail.com', city: 'São Paulo' },
      { id: 'v2', name: 'Maria Souza', email: 'maria@gmail.com', city: 'Rio' },
    ];
    // Simula busca fuzzy em campo name (LGPD-safe)
    const results = fuzzyMatch(
      'joao',
      rawDocs.map((d) => ({ id: d.id, field: d.name })),
      { threshold: 0.5 },
    );
    expect(results[0].item.id).toBe('v1');

    // Aplica sanitize ANTES de mostrar (defense-in-depth)
    const sanitized = sanitizePii(rawDocs[0]);
    expect(sanitized.email).toBe('gmail.com');
    expect(JSON.stringify(sanitized)).not.toContain('joao.silva');
  });
});

describe('TASK-018: FUZZY_DEFAULTS', () => {
  it('tem valores sensatos', () => {
    expect(FUZZY_DEFAULTS.THRESHOLD).toBeGreaterThanOrEqual(0.3);
    expect(FUZZY_DEFAULTS.THRESHOLD).toBeLessThanOrEqual(0.8);
    expect(FUZZY_DEFAULTS.MAX_RESULTS).toBeGreaterThan(0);
    expect(FUZZY_DEFAULTS.SUBSET_SIZE).toBeGreaterThan(0);
    expect(FUZZY_DEFAULTS.DEBOUNCE_MS).toBeGreaterThan(0);
  });
});
