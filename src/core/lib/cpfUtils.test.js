import { describe, it, expect } from 'vitest';
import { isValidCpf, formatCpf } from './cpfUtils';
describe('cpfUtils (TASK-321)', () => {
  it('valida CPF conhecido válido', () => { expect(isValidCpf('111.444.777-35')).toBe(true); });
  it('valida sem máscara', () => { expect(isValidCpf('11144477735')).toBe(true); });
  it('rejeita dígito errado', () => { expect(isValidCpf('111.444.777-30')).toBe(false); });
  it('rejeita sequência 000', () => { expect(isValidCpf('000.000.000-00')).toBe(false); });
  it('formatCpf formata com máscara', () => { expect(formatCpf('11144477735')).toBe('111.444.777-35'); });
});
