/**
 * @fileoverview Tests para validateCpf.js
 *
 * CPFs válidos: gerados algorithmicamente a partir de 9 dígitos base.
 * 11144477735 = 111.444.777-35 (mock do projeto)
 *
 * @see functions/validateCpf.js
 */

const { validateCpf } = require('./validateCpf');

describe('validateCpf', () => {
  describe('CPFs válidos (com e sem máscara)', () => {
    test('formato com máscara', () => {
      const r = validateCpf('111.444.777-35');
      expect(r.valid).toBe(true);
      expect(r.cpf).toBe('11144477735');
    });

    test('formato sem máscara', () => {
      const r = validateCpf('11144477735');
      expect(r.valid).toBe(true);
      expect(r.cpf).toBe('11144477735');
    });

    test('com espaços e máscara parcial', () => {
      const r = validateCpf('  111.444.77735  ');
      expect(r.valid).toBe(true);
      expect(r.cpf).toBe('11144477735');
    });

    test('CPF gerado algoritmicamente (01234567890)', () => {
      const r = validateCpf('01234567890');
      expect(r.valid).toBe(true);
      expect(r.cpf).toBe('01234567890');
    });

    test('CPF gerado algoritmicamente (09876543229)', () => {
      const r = validateCpf('09876543229');
      expect(r.valid).toBe(true);
      expect(r.cpf).toBe('09876543229');
    });
  });

  describe('CPFs inválidos — estrutura', () => {
    test('null/undefined', () => {
      expect(validateCpf(null)).toEqual({ valid: false, reason: 'CPF é obrigatório.' });
      expect(validateCpf(undefined)).toEqual({ valid: false, reason: 'CPF é obrigatório.' });
    });

    test('string vazia', () => {
      expect(validateCpf('')).toEqual({ valid: false, reason: 'CPF é obrigatório.' });
      expect(validateCpf('   ')).toEqual({ valid: false, reason: 'CPF deve ter 11 dígitos.' });
    });

    test('string não numérica', () => {
      const r = validateCpf('abcdefghij');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('CPF deve ter 11 dígitos.');
    });

    test('menos de 11 dígitos', () => {
      expect(validateCpf('123')).toEqual({ valid: false, reason: 'CPF deve ter 11 dígitos.' });
      expect(validateCpf('1234567890')).toEqual({ valid: false, reason: 'CPF deve ter 11 dígitos.' });
      expect(validateCpf('111.444.777-3')).toEqual({ valid: false, reason: 'CPF deve ter 11 dígitos.' });
    });

    test('mais de 11 dígitos', () => {
      expect(validateCpf('111444777351')).toEqual({ valid: false, reason: 'CPF deve ter 11 dígitos.' });
    });
  });

  describe('CPFs inválidos — sequência (todos iguais)', () => {
    const sequencias = [
      '000.000.000-00',
      '111.111.111-11',
      '222.222.222-22',
      '999.999.999-99',
    ];
    test.each(sequencias)('%s é sequência inválida', (cpf) => {
      const r = validateCpf(cpf);
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('CPF inválido (sequência).');
    });
  });

  describe('CPFs inválidos — dígitos verificadores errados', () => {
    test('DV1 errado', () => {
      // 111.444.777-35 → DV1 correto é 3; testamos com 0
      const r = validateCpf('11144477705');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('CPF com dígito verificador inválido.');
    });

    test('DV2 errado', () => {
      // 111.444.777-35 → DV2 correto é 5; testamos com 0
      const r = validateCpf('11144477730');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('CPF com dígito verificador inválido.');
    });

    test('ambos os DV errados', () => {
      const r = validateCpf('11144477700');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('CPF com dígito verificador inválido.');
    });

    test('CPF arbitrário com DV errado', () => {
      const r = validateCpf('123.456.789-00');
      expect(r.valid).toBe(false);
      expect(r.reason).toBe('CPF com dígito verificador inválido.');
    });
  });

  describe('Edge cases', () => {
    test('caracteres não-dígitos são ignorados (máscara)', () => {
      const r = validateCpf('abc11144477735xyz');
      expect(r.valid).toBe(true);
      expect(r.cpf).toBe('11144477735');
    });

    test('retorna reason apenas quando inválido', () => {
      const r = validateCpf('111.444.777-35');
      expect(r.valid).toBe(true);
      expect(r.reason).toBeUndefined();
    });

    test('objeto ao invés de string', () => {
      expect(validateCpf(12345678901)).toEqual({ valid: false, reason: 'CPF é obrigatório.' });
      expect(validateCpf({})).toEqual({ valid: false, reason: 'CPF é obrigatório.' });
    });
  });
});
