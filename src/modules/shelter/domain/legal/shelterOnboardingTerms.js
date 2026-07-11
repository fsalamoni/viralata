/**
 * @fileoverview Termo de Adesão do Abrigo Parceiro com DPA
 * embutido (Fase 19 / Bloco 5).
 *
 * Texto exibido no cadastro de abrigo (membership service /
 * fluxo de criação de clube) ANTES da criação do doc do abrigo.
 * O aceite é gravado em `clubs/{clubId}/onboarding/terms_accepted`
 * (doc com id determinista = 'terms_accepted').
 *
 * Relação:
 *  - Operadora = Viralata (mantém a Plataforma)
 *  - Controlador = Abrigo Parceiro (define finalidades e
 *    tratamento dos Dados Pessoais dos adotantes, LTs,
 *    voluntários, doadores, etc.)
 *  - Operador de dados = Viralata (trata Dados Pessoais em
 *    nome do Abrigo, na infraestrutura Firebase/Google LLC)
 *
 * Este documento cumpre o art. 39 da LGPD (contrato com
 * operador) e serve simultaneamente como:
 *  1. Termo de adesão (relação contratual);
 *  2. DPA — Data Processing Agreement (art. 39 da LGPD);
 *  3. Acordo de níveis de serviço (SLA) e de segurança.
 *
 * Marco legal: LGPD (Lei 13.709/2018, art. 33, 39, 46, 48),
 * Lei 14.063/2020, Marco Civil da Internet (Lei 12.965/2014).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 * @see src/modules/shelter/domain/legal/texts/shelterOnboardingTerms.v1.js
 */

import { SHELTER_ONBOARDING_TERMS_TEXT_V1 } from '@/modules/shelter/domain/legal/texts/shelterOnboardingTerms.v1';

export const SHELTER_ONBOARDING_TERMS_VERSION = '2026-07-10';

export const SHELTER_ONBOARDING_TERMS_TEXT = SHELTER_ONBOARDING_TERMS_TEXT_V1;

export const SHELTER_ONBOARDING_TERMS_SHORT_LABEL = 'Termo de Adesão e DPA';

export function getShelterOnboardingTermsLabel() {
  return `${SHELTER_ONBOARDING_TERMS_SHORT_LABEL} (versão ${SHELTER_ONBOARDING_TERMS_VERSION})`;
}

export function isCurrentShelterOnboardingTermsVersion(acceptedVersion) {
  return acceptedVersion === SHELTER_ONBOARDING_TERMS_VERSION;
}

/**
 * Helper: constrói o payload do aceite para gravar em
 * `clubs/{clubId}/onboarding/terms_accepted`. Usado pelo
 * shelterClubService (ou membership service) ao concluir o
 * cadastro.
 *
 * @param {object} input
 * @param {string} input.legal_rep_name - nome do responsável legal
 * @param {string} input.legal_rep_cpf - CPF do responsável legal
 * @param {string} input.legal_rep_role - cargo (presidente, diretor, etc.)
 * @param {string} [input.cnpj]
 * @returns {object} payload para Firestore
 */
export function buildShelterOnboardingAcceptance({
  legal_rep_name,
  legal_rep_cpf,
  legal_rep_role,
  cnpj,
}) {
  if (!legal_rep_name || typeof legal_rep_name !== 'string' || legal_rep_name.trim().length < 3) {
    throw new Error('Nome do responsável legal deve ter no mínimo 3 caracteres.');
  }
  if (!legal_rep_cpf || typeof legal_rep_cpf !== 'string' || legal_rep_cpf.replace(/\D/g, '').length !== 11) {
    throw new Error('CPF do responsável legal é obrigatório (11 dígitos).');
  }
  if (!legal_rep_role || typeof legal_rep_role !== 'string' || legal_rep_role.trim().length < 2) {
    throw new Error('Cargo do responsável legal é obrigatório.');
  }
  return {
    terms_accepted_at: new Date().toISOString(),
    terms_version: SHELTER_ONBOARDING_TERMS_VERSION,
    signature_text: legal_rep_name.trim(),
    signature_cpf: legal_rep_cpf.replace(/\D/g, ''),
    signature_role: legal_rep_role.trim(),
    cnpj: cnpj ? cnpj.replace(/\D/g, '') : null,
  };
}
