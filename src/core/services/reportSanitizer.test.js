/**
 * @fileoverview Tests do reportSanitizer (TASK-154).
 */
import { describe, it, expect } from 'vitest';
import {
  maskEmail, maskPhone, maskCpf, shortUserId,
  sanitizeAdopterForReport, sanitizeRowForReport, sanitizePiiForReport,
} from './reportSanitizer';

describe('maskEmail', () => {
  it('mascara local-part mantendo domínio', () => {
    expect(maskEmail('maria@example.com')).toBe('m***@example.com');
  });
  it('retorna vazio para input inválido', () => {
    expect(maskEmail('')).toBe('');
    expect(maskEmail(null)).toBe('');
    expect(maskEmail('invalid')).toBe('');
  });
  it('funciona com local-part de 1 char', () => {
    expect(maskEmail('a@x.com')).toBe('a***@x.com');
  });
});

describe('maskPhone', () => {
  it('mascara celular 11 dígitos', () => {
    expect(maskPhone('11987654321')).toBe('(11) 9****-4321');
  });
  it('mascara fixo 10 dígitos', () => {
    expect(maskPhone('1133334444')).toBe('(11) ****-4444');
  });
  it('funciona com formatação', () => {
    expect(maskPhone('(11) 98765-4321')).toBe('(11) 9****-4321');
  });
});

describe('maskCpf', () => {
  it('mascara CPF mantendo últimos 2', () => {
    expect(maskCpf('12345678901')).toBe('***.456.***-01');
  });
  it('retorna *** para CPF inválido', () => {
    expect(maskCpf('123')).toBe('***');
  });
});

describe('shortUserId', () => {
  it('gera user-XXXXXXXX', () => {
    expect(shortUserId('abc123def456ghi789')).toBe('user-abc123de');
  });
  it('retorna sem-uid para falsy', () => {
    expect(shortUserId(null)).toBe('sem-uid');
  });
});

describe('sanitizeAdopterForReport', () => {
  it('mascara email/phone/cpf', () => {
    const out = sanitizeAdopterForReport({
      uid: 'abc12345xyz',
      full_name: 'Maria Silva',
      email: 'maria@example.com',
      phone: '11987654321',
      cpf: '12345678901',
      city: 'São Paulo',
      state: 'SP',
    });
    expect(out.short_id).toBe('user-abc12345');
    expect(out.display_name).toBe('Maria Silva');
    expect(out.email_masked).toBe('m***@example.com');
    expect(out.phone_masked).toBe('(11) 9****-4321');
    expect(out.cpf_masked).toBe('***.456.***-01');
  });

  it('deleted: true → [REMOVIDO]', () => {
    const out = sanitizeAdopterForReport(
      { uid: 'abc', full_name: 'Maria', email: 'm@x.com' },
      { deleted: true }
    );
    expect(out.short_id).toBe('[REMOVIDO]');
    expect(out.display_name).toContain('[REMOVIDO');
  });
});

describe('sanitizeRowForReport', () => {
  it('mascara colunas com nome email/phone/cpf', () => {
    const out = sanitizeRowForReport(
      ['name', 'email', 'phone', 'cpf'],
      ['Maria', 'maria@x.com', '11987654321', '12345678901']
    );
    expect(out[0]).toBe('Maria');
    expect(out[1]).toBe('m***@x.com');
    expect(out[2]).toBe('(11) 9****-4321');
    expect(out[3]).toBe('***.456.***-01');
  });
});

describe('sanitizePiiForReport', () => {
  it('detecta email', () => {
    expect(sanitizePiiForReport({ email: 'maria@x.com' })).toBe('m***@x.com');
  });
  it('detecta deleted', () => {
    expect(sanitizePiiForReport({ status: 'deleted' })).toBe('[REMOVIDO]');
  });
  it('retorna full_name se presente', () => {
    expect(sanitizePiiForReport({ full_name: 'Maria' })).toBe('Maria');
  });
});
