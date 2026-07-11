/**
 * @fileoverview Termo de Lar Temporário — PLACEHOLDER (Fase 19 / Bloco 6).
 *
 * Estrutura de domínio para o termo de Lar Temporário (LT). O
 * texto integral será adicionado em PR futuro, em conjunto com
 * a evolução da feature de LTs (Fase 7 já tem a estrutura
 * funcional em `foster.js` / `fosterService.js`).
 *
 * O termo cobrirá:
 *  - Responsabilidades do LT (guarda temporária, cuidado
 *    veterinário, observações, devolução ao abrigo)
 *  - Responsabilidades do Abrigo (fornecimento de ração,
 *    medicação, suporte veterinário, pagamento de
 *    despesas comprovadas)
 *  - Prazos (data de início, duração estimada,
 *    possibilidade de prorrogação)
 *  - LGPD: dados do LT, dados do animal sob guarda
 *  - Lei 9.605/1998: vedação a maus-tratos durante a guarda
 *  - Rescisão antecipada
 *
 * Marco legal:
 *  - Código Civil (art. 1.196 a 1.204 — depósito)
 *  - LGPD (art. 7º, V, execução de contrato)
 *  - Lei 9.605/1998 (maus-tratos)
 *  - Lei 14.063/2020 (assinatura eletrônica)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 (Bloco 6) + Fase 7
 */

export const FOSTER_TERMS_VERSION = '2026-07-10';

/**
 * Termo de Lar Temporário (resumido). Texto integral a ser
 * adicionado em PR futuro. O aceite, quando integrado, gravará
 * no doc do foster (já existe em `clubs/{clubId}/fosters/{id}`):
 *   - foster_terms_accepted_at
 *   - foster_terms_version
 *   - foster_signature_text
 */
export const FOSTER_TERMS_TEXT = `Termo de Lar Temporário — versão ${FOSTER_TERMS_VERSION}. Texto integral em desenvolvimento. O Lar Temporário (LT) acolhe temporariamente um animal sob guarda do Abrigo Parceiro, comprometendo-se a tratá-lo com dignidade, alimentação adequada, assistência veterinária e zelo. O LT NÃO adquire propriedade do animal — a posse é temporária, com prazo definido pelo Abrigo. O LT responde civil e criminalmente por maus-tratos (Lei 9.605/1998, art. 32). O Abrigo é responsável pelas despesas veterinárias e alimentação, mediante acordo prévio. A devolução do animal deve ser comunicada com 15 dias de antecedência. Os dados pessoais do LT são tratados conforme LGPD.`;

export const FOSTER_TERMS_SHORT_LABEL = 'Termo de Lar Temporário';

export function getFosterTermsLabel() {
  return `${FOSTER_TERMS_SHORT_LABEL} (versão ${FOSTER_TERMS_VERSION})`;
}

export function isCurrentFosterTermsVersion(acceptedVersion) {
  return acceptedVersion === FOSTER_TERMS_VERSION;
}
