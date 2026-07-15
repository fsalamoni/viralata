/**
 * @fileoverview CPF utilities — client-side helpers.
 *
 * Algoritmo espelhado de functions/validateCpf.js.
 * Usa-se para validação rápida ANTES de chamar o callable server-side
 * (que é a fonte da verdade — este módulo é só UX sugar).
 *
 * @see functions/validateCpf.js
 */

/**
 * Valida dígitos verificadores de um CPF (mesmo algoritmo server-side).
 *
 * @param {string} rawCpf
 * @returns {{ valid: boolean, reason?: string, cpf?: string }}
 */
export function validateCpfClient(rawCpf) {
  if (!rawCpf || typeof rawCpf !== 'string') {
    return { valid: false, reason: 'CPF é obrigatório.' };
  }

  const digits = rawCpf.replace(/\D/g, '');

  if (digits.length !== 11) {
    return { valid: false, reason: 'CPF deve ter 11 dígitos.' };
  }

  if (/^(\d)\1{10}$/.test(digits)) {
    return { valid: false, reason: 'CPF inválido (sequência).' };
  }

  const d = digits.split('').map(Number);

  let sum1 = 0;
  for (let i = 0; i < 9; i++) {
    sum1 += d[i] * (10 - i);
  }
  const rem1 = sum1 % 11;
  const dv1 = rem1 < 2 ? 0 : 11 - rem1;
  if (d[9] !== dv1) {
    return { valid: false, reason: 'CPF com dígito verificador inválido.' };
  }

  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += d[i] * (11 - i);
  }
  const rem2 = sum2 % 11;
  const dv2 = rem2 < 2 ? 0 : 11 - rem2;
  if (d[10] !== dv2) {
    return { valid: false, reason: 'CPF com dígito verificador inválido.' };
  }

  return { valid: true, cpf: digits };
}

/**
 * Formata CPF para exibição (XXX.XXX.XXX-XX).
 *
 * @param {string} cpf - string numérica de 11 dígitos
 * @returns {string}
 */
export function formatCpf(cpf) {
  if (!cpf || typeof cpf !== 'string') return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}
