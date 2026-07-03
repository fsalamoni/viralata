import { describe, it, expect } from 'vitest';
import {
  FIELD_TYPES, FORM_LIMITS, createField, normalizeForm, hasQuestions,
  fieldOptions, validateAnswers, summarizeAnswers,
} from './adoptionForm.js';

describe('createField', () => {
  it('cria campo de texto curto por padrão', () => {
    const f = createField();
    expect(f.type).toBe('short_text');
    expect(f.label).toBe('');
    expect(f.required).toBe(false);
    expect(f.id).toMatch(/^f_/);
  });

  it('inicializa escolha única com duas opções vazias', () => {
    expect(createField('single_choice').options).toEqual(['', '']);
  });

  it('cai para texto curto se o tipo for inválido', () => {
    expect(createField('bogus').type).toBe('short_text');
  });

  it('gera ids únicos', () => {
    expect(createField().id).not.toBe(createField().id);
  });
});

describe('normalizeForm', () => {
  it('retorna lista vazia para entrada inválida', () => {
    expect(normalizeForm(null)).toEqual({ fields: [] });
    expect(normalizeForm({})).toEqual({ fields: [] });
    expect(normalizeForm({ fields: 'x' })).toEqual({ fields: [] });
  });

  it('descarta campos sem rótulo e apara o texto', () => {
    const out = normalizeForm({ fields: [
      { type: 'short_text', label: '  Nome  ' },
      { type: 'short_text', label: '   ' },
    ] });
    expect(out.fields).toHaveLength(1);
    expect(out.fields[0].label).toBe('Nome');
  });

  it('preenche as opções fixas de sim/não', () => {
    const out = normalizeForm({ fields: [{ type: 'yes_no', label: 'Tem quintal?' }] });
    expect(out.fields[0].options).toEqual(['Sim', 'Não']);
  });

  it('descarta escolha única com menos de duas opções', () => {
    const out = normalizeForm({ fields: [
      { type: 'single_choice', label: 'Moradia', options: ['Casa'] },
    ] });
    expect(out.fields).toHaveLength(0);
  });

  it('mantém escolha única válida e remove opções vazias', () => {
    const out = normalizeForm({ fields: [
      { type: 'single_choice', label: 'Moradia', options: ['Casa', '  ', 'Apartamento'] },
    ] });
    expect(out.fields[0].options).toEqual(['Casa', 'Apartamento']);
  });

  it('limita a quantidade de campos', () => {
    const many = Array.from({ length: FORM_LIMITS.MAX_FIELDS + 5 }, (_, i) => ({
      type: 'short_text', label: `P${i}`,
    }));
    expect(normalizeForm({ fields: many }).fields).toHaveLength(FORM_LIMITS.MAX_FIELDS);
  });

  it('preserva o tipo de campo válido e normaliza tipo inválido', () => {
    const out = normalizeForm({ fields: [{ type: 'weird', label: 'X' }] });
    expect(out.fields[0].type).toBe('short_text');
    expect(FIELD_TYPES).toContain(out.fields[0].type);
  });
});

describe('hasQuestions', () => {
  it('true só quando há campo utilizável', () => {
    expect(hasQuestions(null)).toBe(false);
    expect(hasQuestions({ fields: [{ type: 'short_text', label: '' }] })).toBe(false);
    expect(hasQuestions({ fields: [{ type: 'short_text', label: 'Nome' }] })).toBe(true);
  });
});

describe('fieldOptions', () => {
  it('retorna Sim/Não para yes_no', () => {
    expect(fieldOptions({ type: 'yes_no' })).toEqual(['Sim', 'Não']);
  });
  it('retorna as opções da escolha única', () => {
    expect(fieldOptions({ type: 'single_choice', options: ['A', 'B'] })).toEqual(['A', 'B']);
  });
  it('retorna vazio para texto', () => {
    expect(fieldOptions({ type: 'short_text' })).toEqual([]);
  });
});

describe('validateAnswers', () => {
  const form = { fields: [
    { id: 'a', type: 'short_text', label: 'Nome', required: true },
    { id: 'b', type: 'long_text', label: 'Motivo', required: false },
    { id: 'c', type: 'yes_no', label: 'Tem quintal?', required: true },
    { id: 'd', type: 'single_choice', label: 'Moradia', required: false, options: ['Casa', 'Apartamento'] },
  ] };

  it('acusa erro em obrigatório vazio', () => {
    const res = validateAnswers(form, { b: 'porque sim' });
    expect(res.valid).toBe(false);
    expect(res.errors.a).toBeDefined();
    expect(res.errors.c).toBeDefined();
  });

  it('valida respostas completas e limpa espaços', () => {
    const res = validateAnswers(form, { a: '  Ana ', c: 'Sim', d: 'Casa' });
    expect(res.valid).toBe(true);
    expect(res.answers.a).toBe('Ana');
    expect(res.answers.c).toBe('Sim');
  });

  it('rejeita valor fora das opções', () => {
    const res = validateAnswers(form, { a: 'Ana', c: 'Talvez' });
    expect(res.valid).toBe(false);
    expect(res.errors.c).toBeDefined();
  });

  it('ignora campo opcional em branco sem erro', () => {
    const res = validateAnswers(form, { a: 'Ana', c: 'Não' });
    expect(res.valid).toBe(true);
    expect(res.answers.b).toBeUndefined();
    expect(res.answers.d).toBeUndefined();
  });

  it('trunca respostas muito longas', () => {
    const long = 'x'.repeat(FORM_LIMITS.ANSWER_MAX + 50);
    const res = validateAnswers(form, { a: long, c: 'Sim' });
    expect(res.answers.a).toHaveLength(FORM_LIMITS.ANSWER_MAX);
  });
});

describe('summarizeAnswers', () => {
  const form = { fields: [
    { id: 'a', type: 'short_text', label: 'Nome', required: true },
    { id: 'b', type: 'yes_no', label: 'Tem quintal?', required: false },
  ] };

  it('casa rótulos com respostas e usa — para vazio', () => {
    const rows = summarizeAnswers(form, { a: 'Ana' });
    expect(rows).toEqual([
      { id: 'a', label: 'Nome', value: 'Ana' },
      { id: 'b', label: 'Tem quintal?', value: '—' },
    ]);
  });
});
