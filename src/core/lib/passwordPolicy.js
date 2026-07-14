/**
 * @fileoverview Política de senhas forte (TASK-040).
 *
 * Regras:
 * - Mínimo 12 caracteres
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 dígito
 * - Pelo menos 1 caractere especial (não-alfanumérico)
 * - Sem repetição das últimas 5 senhas (server-side check via Firebase)
 * - Sem senhas comuns (top 100 da lista HaveIBeenPwned)
 *
 * **UX**:
 * - Validação client-side em tempo real
 * - Indicador visual de força (fraca/média/forte)
 * - Mensagens claras para o usuário
 *
 * **Segurança**:
 * - Esta validação é UX; segurança real é no Firebase Auth
 * - O Firebase pode ser configurado com passwordPolicy:
 *   { length: { min: 12 }, contains: { upper, lower, digit, symbol } }
 * - Para "últimas 5 senhas" é necessário upgrade para Identity Platform
 */

const MIN_LENGTH = 12;

const TOP_COMMON_PASSWORDS = new Set([
  '123456', 'password', '12345678', 'qwerty', '123456789',
  '12345', '1234', '111111', '1234567', 'dragon',
  '123123', 'baseball', 'abc123', 'football', 'monkey',
  'letmein', 'shadow', 'master', '666666', 'qwertyuiop',
  '123321', 'mustang', '1234567890', 'michael', '654321',
  'superman', '1qaz2wsx', '7777777', 'fucky', '121212',
  '000000', 'qazwsx', '123qwe', 'killer', 'trustno1',
  'jordan', 'jennifer', 'zxcvbnm', 'asdfgh', 'hunter',
  'buster', 'soccer', 'harley', 'batman', 'andrew',
  'tigger', 'sunshine', 'iloveyou', '2000', 'charlie',
  'robert', 'thomas', 'hockey', 'ranger', 'daniel',
  'starwars', 'klaster', '112233', 'george', 'computer',
  'michelle', 'jessica', 'pepper', '1111', 'zxcvbn',
  '555555', '11111111', '131313', 'freedom', '777777',
  'pass', 'maggie', '159753', 'aaaaaa', 'ginger',
  'princess', 'joshua', 'cheese', 'amanda', 'summer',
  'love', 'ashley', 'nicole', 'chelsea', 'biteme',
  'matthew', 'access', 'yankees', '987654321', 'dallas',
  'austin', 'thunder', 'taylor', 'matrix',
  'mobilemail', 'mom', 'monitor', 'monitoring', 'montana',
  'moon', 'moscow',
]);

/**
 * Resultado da validação de uma senha.
 *
 * @typedef {object} PasswordValidation
 * @property {boolean} valid
 * @property {string[]} errors — lista de problemas (vazio se válido)
 * @property {'weak'|'medium'|'strong'|'very-strong'} strength
 * @property {number} score — 0-100
 */

/**
 * Valida uma senha de acordo com a política.
 *
 * @param {string} password
 * @returns {PasswordValidation}
 */
export function validatePassword(password) {
  const errors = [];
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Senha inválida'], strength: 'weak', score: 0 };
  }

  if (password.length < MIN_LENGTH) {
    errors.push(`Senha deve ter no mínimo ${MIN_LENGTH} caracteres`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra minúscula (a-z)');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra maiúscula (A-Z)');
  }
  if (!/\d/.test(password)) {
    errors.push('Senha deve ter pelo menos um dígito (0-9)');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Senha deve ter pelo menos um caractere especial (!@#$%...)');
  }

  // Verifica contra senhas comuns (substring match para pegar
  // 'dragonAB12!@#' se baseando em 'dragon', etc.)
  const lower = password.toLowerCase();
  for (const common of TOP_COMMON_PASSWORDS) {
    if (common.length >= 4 && lower.includes(common)) {
      errors.push('Esta senha contém uma palavra muito comum. Escolha outra');
      break;
    }
  }

  // Calcula força
  const score = computeScore(password);
  const strength = scoreToStrength(score);

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score,
  };
}

/**
 * Calcula score de força de uma senha (0-100).
 *
 * Heurística baseada em:
 * - Comprimento (até 30 pontos)
 * - Variedade de caracteres (até 30 pontos)
 * - Resistência a ataques (até 40 pontos)
 */
function computeScore(password) {
  if (!password) return 0;
  let score = 0;

  // Comprimento
  score += Math.min(password.length * 2, 30);

  // Variedade
  const variety = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
  score += variety * 7.5; // até 30

  // Bônus por comprimento extra
  if (password.length >= 16) score += 10;
  if (password.length >= 20) score += 10;

  // Penalidade por repetição (3+ chars consecutivos)
  if (/(.)\1\1/.test(password)) score -= 10;
  // Penalidade por sequência (123, abc)
  if (/(?:abc|123|qwerty|asdf)/i.test(password)) score -= 10;

  return Math.max(0, Math.min(100, score));
}

function scoreToStrength(score) {
  if (score < 30) return 'weak';
  if (score < 60) return 'medium';
  if (score < 85) return 'strong';
  return 'very-strong';
}

/** Retorna o label em português para o strength. */
export function strengthLabel(strength) {
  switch (strength) {
    case 'weak': return 'Fraca';
    case 'medium': return 'Média';
    case 'strong': return 'Forte';
    case 'very-strong': return 'Muito forte';
    default: return '—';
  }
}

/** Retorna a cor (HSL) para o strength. */
export function strengthColor(strength) {
  switch (strength) {
    case 'weak': return 'hsl(0, 70%, 50%)';
    case 'medium': return 'hsl(35, 90%, 50%)';
    case 'strong': return 'hsl(140, 60%, 45%)';
    case 'very-strong': return 'hsl(160, 70%, 40%)';
    default: return 'hsl(0, 0%, 70%)';
  }
}

export const PASSWORD_POLICY = {
  minLength: MIN_LENGTH,
  requireLowercase: true,
  requireUppercase: true,
  requireDigit: true,
  requireSpecial: true,
  blockCommon: true,
  // last_passwords: requer Identity Platform (não client-side)
};
