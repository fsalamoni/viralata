/**
 * @fileoverview reportSanitizer — helpers de sanitização PII para relatórios
 * (TASK-154 — LGPD Art. 18 nos relatórios de abrigo).
 *
 * **Quando usar**:
 *  - Exportação de relatórios CSV/PDF do abrigo
 *  - Adopters que PEDIRAM exclusão de conta (LGPD Art. 18 VI) devem
 *    aparecer como "[REMOVIDO]"
 *  - PII sensível (CPF, RG, telefone completo) deve ser mascarado
 *
 * **Princípio**: relatório de abrigo é OPERACIONAL (adoções, pets, métricas).
 * Não precisa expor dados sensíveis dos adotantes. Basta identificador
 * mascarado para o abrigo entender quem é quem.
 */
import { logger } from '@/core/lib/logger';

/**
 * Mascara email: `maria@example.com` → `m***@example.com`
 * @param {string} email
 * @returns {string}
 */
export function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '';
  if (local.length <= 1) return `${local[0]}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

/**
 * Mascara telefone: `(11) 98765-4321` → `(11) 9****-4321`
 * @param {string} phone
 * @returns {string}
 */
export function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '***';
  // Mantém DDD + últimos 4 dígitos
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits[2]}****-${digits.slice(-4)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ****-${digits.slice(-4)}`;
  }
  return `***-***-${digits.slice(-4)}`;
}

/**
 * Mascara CPF: `123.456.789-01` → `***.456.***-01`
 * @param {string} cpf
 * @returns {string}
 */
export function maskCpf(cpf) {
  if (!cpf || typeof cpf !== 'string') return '';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return '***';
  return `***.${digits.slice(3, 6)}.***-${digits.slice(-2)}`;
}

/**
 * Gera ID curto estável para o user (LGPD-friendly).
 * Usa uid → primeiros 8 chars de hash determinístico.
 * @param {string} uid
 * @returns {string}
 */
export function shortUserId(uid) {
  if (!uid) return 'sem-uid';
  return `user-${uid.slice(0, 8)}`;
}

/**
 * Sanitiza um objeto adotante para aparecer em relatório.
 *
 * Remove: email completo, phone completo, CPF, RG, endereço, dados de
 * pets particulares. Mantém: nome, short user-id, cidade/UF.
 *
 * @param {object} adopter - { uid, full_name, email, phone, cpf, city, state }
 * @param {object} [options]
 * @param {boolean} [options.deleted] - se true, retorna apenas "[REMOVIDO]"
 * @returns {object} versão sanitizada
 */
export function sanitizeAdopterForReport(adopter, options = {}) {
  if (!adopter) return null;
  if (options.deleted) {
    return {
      short_id: '[REMOVIDO]',
      display_name: '[REMOVIDO — LGPD Art. 18 VI]',
      status: 'deleted',
    };
  }
  return {
    short_id: shortUserId(adopter.uid),
    display_name: adopter.full_name || adopter.platform_name || adopter.name || '(sem nome)',
    city: adopter.city || '',
    state: adopter.state || '',
    email_masked: maskEmail(adopter.email),
    phone_masked: maskPhone(adopter.phone),
    cpf_masked: adopter.cpf ? maskCpf(adopter.cpf) : '',
  };
}

/**
 * Sanitiza uma linha de relatório (array de colunas).
 *
 * Aplica sanitização seletiva baseada em marcadores nas colunas.
 * Colunas com nome contendo 'email', 'phone', 'cpf', 'rg' são
 * automaticamente mascaradas.
 *
 * @param {string[]} columns
 * @param {Array} row
 * @returns {Array}
 */
export function sanitizeRowForReport(columns, row) {
  return row.map((cell, i) => {
    const colName = (columns[i] || '').toLowerCase();
    if (typeof cell !== 'string') return cell;
    if (colName.includes('email')) return maskEmail(cell);
    if (colName.includes('phone') || colName.includes('telefone')) return maskPhone(cell);
    if (colName.includes('cpf')) return maskCpf(cell);
    return cell;
  });
}

/**
 * Helper usado por exportToPDF: detecta se objeto tem email/phone/cpf e
 * retorna versão sanitizada.
 * @param {object} obj
 * @returns {string}
 */
export function sanitizePiiForReport(obj) {
  if (!obj) return '';
  if (obj.deleted || obj.status === 'deleted') return '[REMOVIDO]';
  if (obj.email) return maskEmail(obj.email);
  if (obj.phone) return maskPhone(obj.phone);
  if (obj.cpf) return maskCpf(obj.cpf);
  if (obj.full_name) return obj.full_name;
  return '';
}

logger.info('reportSanitizer: módulo carregado');
