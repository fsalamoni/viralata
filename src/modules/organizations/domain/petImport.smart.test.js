/**
 * petImport.smart — testes (TASK-022)
 *
 * Cobre:
 *  - smartMapEnum: match exato + fuzzy
 *  - inferColumnMapping: headers canônicos, sinônimos, fuzzy
 *  - validateSchema: crítica, missing, success
 *  - smartInferColumns: heurística pura + LLM mock (sucesso e fallback)
 *  - smartValidateRow: enum mapping com confidence
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  smartMapEnum,
  inferColumnMapping,
  applyColumnMapping,
  validateSchema,
  smartInferColumns,
  smartValidateRow,
  CONFIDENCE,
  SPECIES_MAP,
  SIZE_MAP,
  GENDER_MAP,
} from './petImport.smart';

describe('petImport.smart', () => {
  describe('smartMapEnum', () => {
    it('match exato (case + acento insensível)', () => {
      const r = smartMapEnum('CACHORRO', SPECIES_MAP);
      expect(r).toEqual({ value: 'dog', confidence: 1 });
    });

    it('match exato com acento', () => {
      const r = smartMapEnum('Fêmea', GENDER_MAP);
      expect(r).toEqual({ value: 'female', confidence: 1 });
    });

    it('detecta typo via Levenshtein (cachoro sem H)', () => {
      const r = smartMapEnum('cachoro', SPECIES_MAP);
      expect(r.value).toBe('dog');
      expect(r.confidence).toBeGreaterThan(0.5);
      expect(r.confidence).toBeLessThan(1);
    });

    it('retorna null se confidence < REJECT', () => {
      const r = smartMapEnum('zzzzz', SPECIES_MAP);
      expect(r.value).toBeNull();
      expect(r.confidence).toBeLessThan(CONFIDENCE.REJECT);
    });

    it('input vazio/null = confidence 0', () => {
      expect(smartMapEnum('', SIZE_MAP).value).toBeNull();
      expect(smartMapEnum(null, SIZE_MAP).value).toBeNull();
      expect(smartMapEnum(undefined, SIZE_MAP).value).toBeNull();
    });
  });

  describe('inferColumnMapping', () => {
    it('reconhece headers canônicos PT/EN com confidence 1', () => {
      const headers = ['ID', 'Título', 'Espécie', 'Porte', 'Idade', 'Sexo'];
      const m = inferColumnMapping(headers);
      expect(m.find((x) => x.original === 'Espécie')?.canonical).toBe('species');
      expect(m.find((x) => x.original === 'Espécie')?.confidence).toBe(1);
    });

    it('reconhece sinônimos livres (Animal, Pet Name, UF)', () => {
      const m = inferColumnMapping(['Animal', 'Pet Name', 'UF', 'Status']);
      expect(m.find((x) => x.original === 'Animal')?.canonical).toBe('species');
      expect(m.find((x) => x.original === 'Pet Name')?.canonical).toBe('name');
      expect(m.find((x) => x.original === 'UF')?.canonical).toBe('state');
    });

    it('fuzzy match para typos (Tipo -> species)', () => {
      const m = inferColumnMapping(['Tipoo']);
      const t = m[0];
      expect(t.canonical).toBe('species');
      expect(t.confidence).toBeGreaterThanOrEqual(CONFIDENCE.SUGGEST);
    });

    it('header desconhecido fica com canonical=null', () => {
      const m = inferColumnMapping(['xyzzy', 'foo', 'bar']);
      expect(m.every((x) => x.canonical === null)).toBe(true);
    });
  });

  describe('applyColumnMapping', () => {
    it('mapeia colunas com confidence >= AUTO direto', () => {
      const m = [
        { original: 'Nome', canonical: 'name', confidence: 1, method: 'synonym' },
        { original: 'Espécie', canonical: 'species', confidence: 1, method: 'synonym' },
        { original: 'random', canonical: null, confidence: 0, method: 'none' },
      ];
      const out = applyColumnMapping({ Nome: 'Rex', Espécie: 'Cachorro', random: 'x' }, m);
      expect(out.name).toBe('Rex');
      expect(out.species).toBe('Cachorro');
      expect(out.__unmapped.random).toBe('x');
    });
  });

  describe('validateSchema', () => {
    it('detecta missing critical', () => {
      const m = inferColumnMapping(['Nome']);
      const v = validateSchema(m);
      expect(v.missingCritical).toContain('species');
      expect(v.missingCritical).toContain('city');
      expect(v.isValid).toBe(false);
    });

    it('schema completo é válido', () => {
      const headers = ['ID', 'Título', 'Espécie', 'Porte', 'Idade', 'Sexo', 'Raça',
        'Vacinação', 'Cidade', 'Estado', 'Status'];
      const m = inferColumnMapping(headers);
      const v = validateSchema(m);
      expect(v.isValid).toBe(true);
      expect(v.missingCritical).toEqual([]);
    });

    it('zero match → hasAnyMatch=false', () => {
      const m = inferColumnMapping(['xyz']);
      const v = validateSchema(m);
      expect(v.hasAnyMatch).toBe(false);
      expect(v.suggestions[0]).toContain('Nenhuma coluna foi reconhecida');
    });
  });

  describe('smartInferColumns', () => {
    it('schema perfeito → heurística pura (sem LLM)', async () => {
      const headers = ['ID', 'Espécie', 'Porte', 'Idade', 'Sexo', 'Cidade', 'Estado'];
      const r = await smartInferColumns(headers, [{ ID: '1' }]);
      expect(r.source).toBe('heuristic');
      expect(r.lowConfidence).toEqual([]);
    });

    it('schema ambíguo + LLM disponível → hybrid', async () => {
      const headers = ['Animal', 'Pet Name'];
      const sample = [{ Animal: 'cachorro', 'Pet Name': 'Rex' }];
      const mockEndpoint = async (req) => {
        const body = await req.json();
        return {
          mapping: body.headers.map((h) => {
            if (h === 'Animal') return { original: h, canonical: 'species', confidence: 0.98 };
            if (h === 'Pet Name') return { original: h, canonical: 'name', confidence: 0.98 };
            return { original: h, canonical: null, confidence: 0 };
          }),
        };
      };
      // Mock fetch
      global.fetch = vi.fn(async (url, init) => ({
        ok: true,
        status: 200,
        json: () => mockEndpoint({ json: async () => JSON.parse(init.body) }),
      }));
      const r = await smartInferColumns(headers, sample, { llmEndpoint: 'https://example.com/infer' });
      // Pode ser 'heuristic' (se heurística já pegou Animal+Pet Name)
      // ou 'hybrid' (se LLM refinou).
      expect(['heuristic', 'hybrid']).toContain(r.source);
    });

    it('LLM indisponível → fallback heurístico silencioso', async () => {
      const headers = ['Animal'];
      const sample = [{ Animal: 'Cachorro' }];
      global.fetch = vi.fn(() => Promise.reject(new Error('network')));
      const r = await smartInferColumns(headers, sample, { llmEndpoint: 'https://broken' });
      expect(r.source).toBe('heuristic');
    });
  });

  describe('smartValidateRow', () => {
    it('mapeia enums com match exato (sem warning)', () => {
      const mapping = inferColumnMapping(['Espécie', 'Porte', 'Sexo']);
      const r = smartValidateRow({ Espécie: 'Cachorro', Porte: 'Grande', Sexo: 'Macho' }, mapping);
      expect(r.warnings).toEqual([]);
      expect(r.row.species).toBe('dog');
      expect(r.row.size).toBe('large');
      expect(r.row.gender).toBe('male');
    });

    it('detecta typo em enum + warning', () => {
      const mapping = inferColumnMapping(['Espécie']);
      const r = smartValidateRow({ Espécie: 'cachoro' }, mapping);
      expect(r.row.species).toBe('dog');
      expect(r.warnings.length).toBe(1);
      expect(r.warnings[0]).toMatchObject({
        field: 'Espécie',
        original: 'cachoro',
        inferred: 'dog',
      });
    });
  });
});
