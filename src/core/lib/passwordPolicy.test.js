/**
 * @fileoverview Tests do passwordPolicy (TASK-040).
 */
import { describe, it, expect } from 'vitest';
import {
  validatePassword, strengthLabel, strengthColor, PASSWORD_POLICY,
} from './passwordPolicy.js';

describe('passwordPolicy — validatePassword (TASK-040)', () => {
  it('rejeita senha muito curta', () => {
    const r = validatePassword('Abc1!');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /12/.test(e))).toBe(true);
  });

  it('rejeita sem minúscula', () => {
    const r = validatePassword('PASSWORD123!@#');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /minúscula/i.test(e))).toBe(true);
  });

  it('rejeita sem maiúscula', () => {
    const r = validatePassword('password123!@#');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /maiúscula/i.test(e))).toBe(true);
  });

  it('rejeita sem dígito', () => {
    const r = validatePassword('PasswordNoDigits!@#');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /dígito/i.test(e))).toBe(true);
  });

  it('rejeita sem caractere especial', () => {
    const r = validatePassword('Password1234567');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /especial/i.test(e))).toBe(true);
  });

  it('rejeita senha comum (lista top 100)', () => {
    const r = validatePassword('dragonAB12!@#');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => /comum/i.test(e))).toBe(true);
  });

  it('aceita senha que não está na lista', () => {
    const r = validatePassword('MyP@ssw0rd2024!');
    expect(r.errors.some((e) => /comum/i.test(e))).toBe(false);
  });

  it('aceita senha válida', () => {
    const r = validatePassword('MyP@ssw0rd2024!');
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(['strong', 'very-strong']).toContain(r.strength);
  });

  it('input inválido (não-string)', () => {
    const r = validatePassword(null);
    expect(r.valid).toBe(false);
    expect(r.strength).toBe('weak');
    expect(r.score).toBe(0);
  });

  it('calcula score entre 0-100', () => {
    const r1 = validatePassword('a');
    expect(r1.score).toBeGreaterThanOrEqual(0);
    const r2 = validatePassword('aB1!aB1!aB1!aB1!');
    expect(r2.score).toBeGreaterThan(0);
    expect(r2.score).toBeLessThanOrEqual(100);
  });

  it('penaliza repetição de caracteres', () => {
    const sem = validatePassword('MyP@ssw0rd2024!xx').score;
    const com = validatePassword('MyP@ssw0rd2024!xxx').score;
    expect(com).toBeLessThanOrEqual(sem);
  });

  it('penaliza sequência comum', () => {
    const sem = validatePassword('MyP@ssw0rdXyZ2024!').score;
    const com = validatePassword('MyP@ssw0rdabc!@#!@#').score;
    expect(com).toBeLessThan(sem);
  });
});

describe('passwordPolicy — strength', () => {
  it('strengthLabel para cada nível', () => {
    expect(strengthLabel('weak')).toBe('Fraca');
    expect(strengthLabel('medium')).toBe('Média');
    expect(strengthLabel('strong')).toBe('Forte');
    expect(strengthLabel('very-strong')).toBe('Muito forte');
  });

  it('strengthColor para cada nível', () => {
    expect(strengthColor('weak')).toMatch(/hsl/);
    expect(strengthColor('medium')).toMatch(/hsl/);
    expect(strengthColor('strong')).toMatch(/hsl/);
    expect(strengthColor('very-strong')).toMatch(/hsl/);
  });

  it('strength default', () => {
    expect(strengthLabel('unknown')).toBe('—');
  });
});

describe('passwordPolicy — PASSWORD_POLICY constant', () => {
  it('tem minLength 12', () => {
    expect(PASSWORD_POLICY.minLength).toBe(12);
  });

  it('requer todos os tipos de caractere', () => {
    expect(PASSWORD_POLICY.requireLowercase).toBe(true);
    expect(PASSWORD_POLICY.requireUppercase).toBe(true);
    expect(PASSWORD_POLICY.requireDigit).toBe(true);
    expect(PASSWORD_POLICY.requireSpecial).toBe(true);
  });
});
