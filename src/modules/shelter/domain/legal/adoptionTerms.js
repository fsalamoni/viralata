/**
 * @fileoverview Termo de Adoção — VERSÃO INTEGRAL (Fase 19 / Bloco 4).
 *
 * Texto exibido ao adotante no momento do submit da application.
 * Integra a Fase 3 (adoptionService.submitAdoptionApplication),
 * gravando `terms_accepted_at` + `terms_version` + `signature_text`
 * no doc da application.
 *
 * Versão atual: 2026-07-10. Migration-safe: docs anteriores ao PR
 * NÃO tinham esses campos, e a lógica nova é puramente aditiva
 * (Zod .partial() aceita docs sem os campos, e a regra de firestore
 * só EXIGE esses campos em create/update de aplicações NOVAS).
 *
 * LGPD: art. 7º, V (execução de contrato). Lei 14.063/2020:
 * assinatura eletrônica nível básico (registro + hash do
 * signature_text no audit log).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 + Fase 3
 * @see src/modules/shelter/domain/legal/texts/adoptionTerms.v1.js
 */

import { ADOPTION_TERMS_TEXT_V1 } from '@/modules/shelter/domain/legal/texts/adoptionTerms.v1';

export const ADOPTION_TERMS_VERSION = '2026-07-10';

export const ADOPTION_TERMS_TEXT = ADOPTION_TERMS_TEXT_V1;

export const ADOPTION_TERMS_SHORT_LABEL = 'Termo de Adoção Responsável';

export function getAdoptionTermsLabel() {
  return `${ADOPTION_TERMS_SHORT_LABEL} (versão ${ADOPTION_TERMS_VERSION})`;
}

export function isCurrentAdoptionTermsVersion(acceptedVersion) {
  return acceptedVersion === ADOPTION_TERMS_VERSION;
}

/**
 * Helper: constrói o payload dos campos de aceite para gravar no doc
 * da application. Usado por `adoptionService.submitAdoptionApplication`.
 *
 * @param {string} signatureText - nome completo do adotante (assinatura)
 * @returns {{
 *   terms_accepted_at: string,
 *   terms_version: string,
 *   signature_text: string,
 * }}
 */
export function buildAdoptionTermsAcceptance(signatureText) {
  if (!signatureText || typeof signatureText !== 'string' || signatureText.trim().length < 3) {
    throw new Error('Assinatura (signature_text) deve ter no mínimo 3 caracteres.');
  }
  return {
    terms_accepted_at: new Date().toISOString(),
    terms_version: ADOPTION_TERMS_VERSION,
    signature_text: signatureText.trim(),
  };
}
