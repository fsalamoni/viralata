/**
 * @fileoverview CPF validation service — client-side callable wrapper.
 *
 * TASK-321: Server-side CPF digit validation.
 * Chama a Cloud Function `validateCpf` para validação definitiva no servidor.
 * O módulo cpfUtils.js faz validação client-side (UX sugar) antes de chamar.
 *
 * @see functions/validateCpf.js
 * @see src/core/lib/cpfUtils.js
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';

/**
 * Valida CPF no servidor (fonte da verdade).
 *
 * @param {string} cpf
 * @returns {Promise<{ valid: boolean, reason?: string, cpf?: string }>}
 */
export async function validateCpfServer(cpf) {
  if (!functions) {
    // Fallback client-side em dev
    const { validateCpfClient } = await import('@/core/lib/cpfUtils');
    return validateCpfClient(cpf);
  }
  try {
    const callable = httpsCallable(functions, 'validateCpf');
    const res = await callable({ cpf });
    return res.data || { valid: false, reason: 'Resposta inválida do servidor.' };
  } catch (err) {
    logger.warn('cpfValidationService: validateCpfServer falhou', { error: String(err) });
    return { valid: false, reason: 'Erro ao validar CPF no servidor.' };
  }
}
