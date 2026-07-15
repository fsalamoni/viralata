/**
 * @fileoverview TASK-321: Server-side CPF validation callable.
 *
 * Valida dígitos verificadores do CPF (algo que o client-side Zod schema
 * não faz — só valida formato com regex).
 *
 * Algoritmo oficial Receita Federal:
 *   1. Remove máscara e extrai só dígitos
 *   2. Deve ter exatamente 11 dígitos
 *   3. Não pode ter todos os dígitos iguais (CPF "序列" inválido)
 *   4. Dígito 10:  sum(d[i] * (10-i)) % 11 → DV1
 *   5. Dígito 11:  sum(d[i] * (11-i)) % 11 → DV2
 *
 * Callable: `validateCpf({ cpf: string })
 * Returns:  { valid: boolean, reason?: string, cpf?: string (normalizado) }
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');

const REGION = process.env.FUNCTIONS_REGION || 'southamerica-east1';

/**
 * Valida dígitos verificadores de um CPF.
 * Função pura — exported para uso em testes e em outros módulos.
 *
 * @param {string} rawCpf - CPF com ou sem máscara (pontos, hífen)
 * @returns {{ valid: boolean, reason?: string, cpf?: string }}
 */
function validateCpf(rawCpf) {
  if (!rawCpf || typeof rawCpf !== 'string') {
    return { valid: false, reason: 'CPF é obrigatório.' };
  }

  // 1) Extrai só dígitos
  const digits = rawCpf.replace(/\D/g, '');

  // 2) Deve ter 11 dígitos
  if (digits.length !== 11) {
    return { valid: false, reason: 'CPF deve ter 11 dígitos.' };
  }

  // 3) Sequência inválida (todos iguais)
  if (/^(\d)\1{10}$/.test(digits)) {
    return { valid: false, reason: 'CPF inválido (sequência).' };
  }

  // 4) Primeiro dígito verificador
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

  // 5) Segundo dígito verificador
  let sum2 = 0;
  for (let i = 0; i < 10; i++) {
    sum2 += d[i] * (11 - i);
  }
  const rem2 = sum2 % 11;
  const dv2 = rem2 < 2 ? 0 : 11 - rem2;
  if (d[10] !== dv2) {
    return { valid: false, reason: 'CPF com dígito verificador inválido.' };
  }

  // 6) Normalizado (sem máscara)
  return { valid: true, cpf: digits };
}

exports.validateCpf = validateCpf;

/**
 * Callable Firebase: `validateCpf`
 * Qualquer usuário autenticado pode validar um CPF.
 */
exports.validateCpfCallable = onCall(
  { region: REGION, cors: true },
  (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Callable requer autenticação.');
    }

    const { cpf } = request.data || {};
    const result = validateCpf(cpf);

    return result;
  },
);
