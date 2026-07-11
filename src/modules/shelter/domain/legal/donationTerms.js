/**
 * @fileoverview Termo de Doação — PLACEHOLDER (Fase 19 / Bloco 6).
 *
 * Estrutura de domínio para o termo de doação. O texto integral
 * será adicionado em PR futuro, quando a feature de doações
 * estiver em desenvolvimento (não há feature flag ativa para
 * doações no roadmap atual).
 *
 * Por ora, a versão segue o padrão: `2026-07-10` (mesma data-base
 * da Fase 19) e o campo `donation_terms_accepted_at` +
 * `donation_terms_version` pode ser usado no doc de doações
 * (a ser criado) ou no `auditService`.
 *
 * O texto integral será gerado seguindo o padrão dos outros
 * termos: LGPD, Marco Civil, Lei 14.063/2020, e os requisitos
 * específicos de doações (recibo, dedução no IR, etc.).
 *
 * Marco legal relevante:
 *  - Lei 9.250/1995 (dedução no IR) — quando aplicável
 *  - Lei 13.797/2019 (imunidade tributária para OSCs)
 *  - Lei 14.230/2021 (transparência de OSCs)
 *  - LGPD (consentimento para comunicações de marketing)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 (Bloco 6)
 */

export const DONATION_TERMS_VERSION = '2026-07-10';

/**
 * Termo de Doação (resumido). Texto integral a ser adicionado
 * em PR futuro. O aceite, quando integrado, gravará no doc
 * da doação (a ser criado na feature de doações):
 *   - donation_terms_accepted_at
 *   - donation_terms_version
 *   - donation_signature_text
 */
export const DONATION_TERMS_TEXT = `Termo de Doação — versão ${DONATION_TERMS_VERSION}. Texto integral em desenvolvimento. A Doação à Plataforma Viralata é voluntária, não-remunerada e dedutível no IR conforme legislação vigente. O doador autoriza o uso dos dados pessoais estritamente para emissão de recibo, declaração no IR e comunicação sobre o destino da doação. A Plataforma e os Abrigos Parceiros manterão sigilo sobre os dados do doador, exceto quando o próprio doador autorizar divulgação pública (ex.: "doadores anônimos" / "doadores destaque").`;

export const DONATION_TERMS_SHORT_LABEL = 'Termo de Doação';

export function getDonationTermsLabel() {
  return `${DONATION_TERMS_SHORT_LABEL} (versão ${DONATION_TERMS_VERSION})`;
}

export function isCurrentDonationTermsVersion(acceptedVersion) {
  return acceptedVersion === DONATION_TERMS_VERSION;
}
