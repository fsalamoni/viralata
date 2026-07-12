/**
 * @fileoverview Domínio: Termos, Políticas e Aceite Eletrônico (Fase 19).
 *
 * Define:
 *  - Tipos de termos (general, privacy, conduct, adopter, shelter,
 *    volunteer, foster, donor, cookies) e suas versões canônicas.
 *  - Schema Zod de `termsAcceptance` (assinatura eletrônica conforme
 *    Lei 14.063/2020 + LGPD).
 *  - Helpers: `computeDocumentHash`, `getCurrentTermsVersion`,
 *    `getTermsDocument`, `isAcceptanceCurrent`, validação de fluxo.
 *
 * Conformidade legal:
 *  - **LGPD (Lei 13.709/2018)**: base legal explícita (Art. 7º), DPO,
 *    direito de exportação/exclusão.
 *  - **Lei 14.063/2020** (assinatura eletrônica avançada): hash do
 *    documento + timestamp + IP + liveness + texto de assinatura.
 *  - **Marco Civil (Lei 12.965/2014) Art. 15**: retenção de logs 6m.
 *  - **Art. 936 CC + CFMV 1.465/2022**: disclaimers permanentes.
 *
 * O hash é SHA-256 do conteúdo canônico do termo (UTF-8) prefixado
 * por "viralata:terms:v1:" para evitar ambiguidade de algoritmo.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

import { z } from 'zod';

// ─── Tipos de termo ────────────────────────────────────────────────────

/** Tipos canônicos de termo/política que o usuário pode aceitar. */
export const TERMS_TYPE = Object.freeze({
  GENERAL: 'general',         // Termos de Uso (Geral)
  PRIVACY: 'privacy',         // Política de Privacidade (LGPD)
  CONDUCT: 'conduct',         // Código de Conduta
  ADOPTER: 'adopter',         // Termo de Adoção
  SHELTER: 'shelter',         // Termo de Adesão de Abrigo (com DPA)
  VOLUNTEER: 'volunteer',     // Termo de Voluntariado
  FOSTER: 'foster',           // Termo de Lar Temporário (LT)
  DONOR: 'donor',             // Termo de Doação
  COOKIES: 'cookies',         // Política de Cookies
});

/** Lista imutável para validação Zod. */
export const TERMS_TYPE_VALUES = Object.freeze(Object.values(TERMS_TYPE));

/** Versão atual (canônica) de cada termo. Incrementar quando o doc muda. */
export const CURRENT_TERMS_VERSION = Object.freeze({
  [TERMS_TYPE.GENERAL]: '2026-07-10',
  [TERMS_TYPE.PRIVACY]: '2026-07-10',
  [TERMS_TYPE.CONDUCT]: '2026-07-10',
  [TERMS_TYPE.ADOPTER]: '2026-07-10',
  [TERMS_TYPE.SHELTER]: '2026-07-10',
  [TERMS_TYPE.VOLUNTEER]: '2026-07-10-v2',
  [TERMS_TYPE.FOSTER]: '2026-07-10',
  [TERMS_TYPE.DONOR]: '2026-07-10',
  [TERMS_TYPE.COOKIES]: '2026-07-10',
});

/** Tipos de termo exigidos para criar conta e usar a plataforma. */
export const MANDATORY_TERMS_FOR_SIGNUP = Object.freeze([
  TERMS_TYPE.GENERAL,
  TERMS_TYPE.PRIVACY,
  TERMS_TYPE.CONDUCT,
]);

/** Tipos adicionais exigidos conforme papel (role) do usuário. */
export const ROLE_REQUIRED_TERMS = Object.freeze({
  adopter: [TERMS_TYPE.ADOPTER],
  shelter_admin: [TERMS_TYPE.SHELTER, TERMS_TYPE.ADOPTER],
  volunteer: [TERMS_TYPE.VOLUNTEER],
  foster: [TERMS_TYPE.FOSTER],
  donor: [TERMS_TYPE.DONOR],
});

/** Metadados de UI (label + descrição curta) para cada tipo de termo. */
export const TERMS_TYPE_META = Object.freeze({
  [TERMS_TYPE.GENERAL]: {
    label: 'Termos de Uso',
    short: 'Condições gerais para uso da plataforma Viralata.',
    requires_signature: true,
    section_path: '/termos',
  },
  [TERMS_TYPE.PRIVACY]: {
    label: 'Política de Privacidade',
    short: 'Como coletamos, usamos e protegemos seus dados (LGPD).',
    requires_signature: true,
    section_path: '/politica-privacidade',
  },
  [TERMS_TYPE.CONDUCT]: {
    label: 'Código de Conduta',
    short: 'Regras de convivência e tolerância zero a maus-tratos.',
    requires_signature: true,
    section_path: '/codigo-conduta',
  },
  [TERMS_TYPE.ADOPTER]: {
    label: 'Termo de Adoção',
    short: 'Responsabilidades do adotante (Art. 936 CC + Lei 14.063/2020).',
    requires_signature: true,
    section_path: '/termos-adocao',
  },
  [TERMS_TYPE.SHELTER]: {
    label: 'Termo de Adesão do Abrigo (com DPA)',
    short: 'Contrato de adesão + DPA (LGPD) para ONGs parceiras.',
    requires_signature: true,
    section_path: '/termos-abrigo',
  },
  [TERMS_TYPE.VOLUNTEER]: {
    label: 'Termo de Voluntariado',
    short: 'Termo de adesão para voluntários da plataforma.',
    requires_signature: true,
    section_path: '/termos-voluntario',
  },
  [TERMS_TYPE.FOSTER]: {
    label: 'Termo de Lar Temporário (LT)',
    short: 'Responsabilidades do lar temporário.',
    requires_signature: true,
    section_path: '/termos-lar-temporario',
  },
  [TERMS_TYPE.DONOR]: {
    label: 'Termo de Doação',
    short: 'Natureza filantrópica irreversível + ITCMD.',
    requires_signature: true,
    section_path: '/termos-doador',
  },
  [TERMS_TYPE.COOKIES]: {
    label: 'Política de Cookies',
    short: 'Cookies e tecnologias de rastreamento (LGPD Art. 9).',
    requires_signature: false,
    section_path: '/politica-cookies',
  },
});

// ─── Hash do documento ────────────────────────────────────────────────

/**
 * Hash canônico SHA-256 (browser) — usa Web Crypto API com fallback
 * para Node `crypto` (vitest).
 * O retorno SEMPRE é a string `"sha256:<hex>"` para tornar a versão
 * do algoritmo explícita e evitar confusão com SHA-1, MD5 etc.
 *
 * @param {string} content - conteúdo canônico do termo (UTF-8)
 * @returns {Promise<string>} "sha256:<64 hex chars>"
 */
export async function computeDocumentHash(content) {
  if (typeof content !== 'string') {
    throw new TypeError('computeDocumentHash: content deve ser string');
  }
  const payload = `viralata:terms:v1:${content}`;

  // Browser
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    const enc = new TextEncoder().encode(payload);
    const buf = await globalThis.crypto.subtle.digest('SHA-256', enc);
    return `sha256:${toHex(new Uint8Array(buf))}`;
  }

  // Node (testes)
  if (typeof process !== 'undefined' && process.versions?.node) {
    // eslint-disable-next-line global-require
    const nodeCrypto = await import('node:crypto');
    const h = nodeCrypto.createHash('sha256').update(payload, 'utf8').digest('hex');
    return `sha256:${h}`;
  }

  throw new Error('computeDocumentHash: ambiente sem crypto.subtle nem node:crypto');
}

/** Hex helper (browser). */
function toHex(bytes) {
  const out = new Array(bytes.length);
  for (let i = 0; i < bytes.length; i += 1) {
    out[i] = bytes[i].toString(16).padStart(2, '0');
  }
  return out.join('');
}

/** Versão síncrona para testes determinísticos (usa Node crypto). */
export function computeDocumentHashSync(content) {
  if (typeof content !== 'string') {
    throw new TypeError('computeDocumentHashSync: content deve ser string');
  }
  if (typeof process === 'undefined' || !process.versions?.node) {
    throw new Error('computeDocumentHashSync: só disponível em Node');
  }
  // eslint-disable-next-line global-require
  const nodeCrypto = require('node:crypto');
  const h = nodeCrypto.createHash('sha256').update(`viralata:terms:v1:${content}`, 'utf8').digest('hex');
  return `sha256:${h}`;
}

// ─── Schemas Zod ──────────────────────────────────────────────────────

/** Hash no formato "sha256:<hex>". */
export const documentHashSchema = z
  .string()
  .regex(/^sha256:[a-f0-9]{64}$/, 'Hash deve ser sha256:<64 hex chars>');

/** Validação de IP (IPv4 ou IPv6). Aceita "unknown" quando não disponível. */
export const ipAddressSchema = z
  .string()
  .max(64)
  .refine(
    (v) => v === 'unknown' || /^[0-9a-fA-F:.]+$/.test(v),
    'IP deve ser IPv4/IPv6 ou "unknown"',
  );

/** Texto de assinatura (nome digitado). Mínimo 3 chars, máx 120. */
export const signatureTextSchema = z
  .string()
  .trim()
  .min(3, 'Assinatura deve ter ao menos 3 caracteres')
  .max(120, 'Assinatura deve ter no máximo 120 caracteres');

/**
 * Schema do doc `terms_acceptances/{acceptanceId}` na subcoleção
 * `users/{userId}/terms_acceptances/`.
 *
 * `terms_version` aceita `YYYY-MM-DD` ou `YYYY-MM-DD-vN` (caso do
 * Termo de Voluntariado v2 — Lei 14.063/2020 exige versionamento
 * inequívoco, então sufixos semânticos são permitidos).
 */
export const termsAcceptanceSchema = z.object({
  terms_version: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(-v\d+)?$/,
      'Versão deve ser YYYY-MM-DD ou YYYY-MM-DD-vN',
    ),
  terms_type: z.enum(TERMS_TYPE_VALUES),
  accepted_at: z.any(), // Firestore Timestamp ou Date (validado no service)
  ip_address: ipAddressSchema,
  user_agent: z.string().max(500),
  document_hash: documentHashSchema,
  signature_text: signatureTextSchema,
  liveness_verified: z.boolean().default(false),
  // Campos opcionais para auditoria LGPD
  legal_basis: z.string().max(120).optional(),
  expires_at: z.any().optional(),
});

/** Schema da entrada (sem accepted_at — preenchido pelo service). */
export const recordAcceptanceInputSchema = z.object({
  terms_type: z.enum(TERMS_TYPE_VALUES),
  terms_version: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}(-v\d+)?$/,
      'Versão deve ser YYYY-MM-DD ou YYYY-MM-DD-vN',
    ),
  document_hash: documentHashSchema,
  signature_text: signatureTextSchema,
  user_agent: z.string().max(500).default(''),
  ip_address: ipAddressSchema.default('unknown'),
  liveness_verified: z.boolean().default(false),
  legal_basis: z.string().max(120).optional(),
});

// ─── Helpers de versionamento ──────────────────────────────────────────

/**
 * Retorna a versão canônica atual de um tipo de termo.
 * @param {string} type
 * @returns {string} YYYY-MM-DD
 */
export function getCurrentTermsVersion(type) {
  if (!TERMS_TYPE_VALUES.includes(type)) {
    throw new Error(`getCurrentTermsVersion: tipo inválido "${type}"`);
  }
  return CURRENT_TERMS_VERSION[type];
}

/**
 * Retorna o conteúdo canônico (markdown) do termo.
 * Como os termos são renderizados em React a partir dos componentes
 * de página, retornamos aqui uma STRING DESCRITIVA leve (resumo +
 * caminho da página) que serve como base para o hash. O hash real é
 * recomputado server-side a partir do Markdown autoritativo, mas o
 * service aceita o hash já calculado pelo cliente e revalida.
 *
 * @param {string} type
 * @returns {{path: string, label: string, content: string}}
 */
export function getTermsDocument(type) {
  if (!TERMS_TYPE_VALUES.includes(type)) {
    throw new Error(`getTermsDocument: tipo inválido "${type}"`);
  }
  const meta = TERMS_TYPE_META[type];
  return {
    path: meta.section_path,
    label: meta.label,
    type,
    version: getCurrentTermsVersion(type),
    content: `${meta.label}\n\n${meta.short}\n\nVeja a versão completa em ${meta.section_path}.`,
  };
}

/**
 * Verifica se um aceite está atualizado (mesma versão que a canônica).
 * @param {{terms_type: string, terms_version: string}} acceptance
 * @returns {boolean}
 */
export function isAcceptanceCurrent(acceptance) {
  if (!acceptance?.terms_type || !acceptance?.terms_version) return false;
  return acceptance.terms_version === getCurrentTermsVersion(acceptance.terms_type);
}

/**
 * Determina os tipos de termo que o usuário precisa aceitar dado o
 * papel (role). Inclui os obrigatórios de cadastro.
 *
 * @param {string|string[]} roles
 * @returns {string[]} tipos únicos
 */
export function getRequiredTermsForRoles(roles) {
  const arr = Array.isArray(roles) ? roles : [roles];
  const set = new Set(MANDATORY_TERMS_FOR_SIGNUP);
  for (const role of arr) {
    const extra = ROLE_REQUIRED_TERMS[role];
    if (extra) extra.forEach((t) => set.add(t));
  }
  return Array.from(set);
}

/**
 * Garante que o aceite reportado bate com a versão atual.
 * Lança erro se a versão for diferente.
 */
export function assertAcceptanceIsCurrent(termsType, termsVersion) {
  const current = getCurrentTermsVersion(termsType);
  if (current !== termsVersion) {
    const err = new Error(
      `Versão do termo desatualizada: informado "${termsVersion}", atual "${current}".`,
    );
    err.code = 'TERMS_VERSION_OUTDATED';
    throw err;
  }
}

/**
 * Compara duas listas de aceites e retorna os tipos ainda pendentes.
 * @param {string[]} requiredTypes
 * @param {Array<{terms_type: string, terms_version: string}>} acceptances
 * @returns {string[]} tipos sem aceite válido
 */
export function getPendingAcceptances(requiredTypes, acceptances) {
  const current = new Map();
  for (const acc of acceptances || []) {
    if (isAcceptanceCurrent(acc)) current.set(acc.terms_type, acc);
  }
  return requiredTypes.filter((t) => !current.has(t));
}
