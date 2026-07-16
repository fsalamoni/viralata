/**
 * @fileoverview DPA (Data Processing Agreement) para Abrigos e ONGs
 * — helpers de aceite (Fase 19 / Bloco 5).
 *
 * Texto exibido em /legal/dpa-abrigos. O aceite é gravado
 * em `clubs/{clubId}/onboarding/dpa_accepted` (doc com id
 * determinista = 'dpa_accepted'), simultaneamente ao aceite
 * do Termo de Adesão do Abrigo.
 *
 * Este DPA complementa o Termo de Adesão (que já contém o DPA
 * embutido — shelterOnboardingTerms.js). Este documento autônomo
 * existe para atender à exigência de que o abrigo declare
 * ciência отдельным образом das obrigações de Controlador
 * (Art. 37, 39 LGPD).
 *
 * Relação LGPD:
 *  - Operadora = Viralata (mantém a Plataforma SaaS)
 *  - Controlador = Abrigo Parceiro (define finalidades e
 *    tratamento dos Dados Pessoais dos adotantes, LTs,
 *    voluntários, doadores, etc.)
 *
 * Marco legal: LGPD (Lei 13.709/2018, art. 33, 37, 39, 46, 48),
 * Lei 14.063/2020, Marco Civil da Internet (Lei 12.965/2014).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 (Bloco 5)
 * @see src/modules/shelter/domain/legal/texts/dpaAbrigos.js
 */

import { DPA_ABRIGOS_TEXT } from '@/modules/shelter/domain/legal/texts/dpaAbrigos';

export const DPA_ABRIGOS_VERSION = '2026-07-10';

export const DPA_ABRIGOS_TEXT_EXPORT = DPA_ABRIGOS_TEXT;

export const DPA_ABRIGOS_SHORT_LABEL = 'DPA — Acordo de Tratamento de Dados';

export function getDpaAbrigosLabel() {
  return `${DPA_ABRIGOS_SHORT_LABEL} (versão ${DPA_ABRIGOS_VERSION})`;
}

export function isCurrentDpaAbrigosVersion(acceptedVersion) {
  return acceptedVersion === DPA_ABRIGOS_VERSION;
}

/**
 * Helper: constrói o payload do aceite do DPA para gravar em
 * `clubs/{clubId}/onboarding/dpa_accepted`. Usado pelo
 * shelterClubService (ou membership service) ao concluir o
 * cadastro do abrigo.
 *
 * @param {object} input
 * @param {string} input.legal_rep_name - nome do responsável legal do abrigo
 * @param {string} input.legal_rep_cpf - CPF do responsável legal
 * @param {string} input.shelter_id - ID do abrigo na plataforma
 * @param {string} input.shelter_name - nome fantasia do abrigo
 * @returns {object} payload para Firestore
 */
export function buildDpaAbrigosAcceptance({
  legal_rep_name,
  legal_rep_cpf,
  shelter_id,
  shelter_name,
}) {
  if (!legal_rep_name || typeof legal_rep_name !== 'string' || legal_rep_name.trim().length < 3) {
    throw new Error('Nome do responsável legal deve ter no mínimo 3 caracteres.');
  }
  if (!legal_rep_cpf || typeof legal_rep_cpf !== 'string' || legal_rep_cpf.replace(/\D/g, '').length !== 11) {
    throw new Error('CPF do responsável legal é obrigatório (11 dígitos).');
  }
  if (!shelter_id) {
    throw new Error('shelter_id é obrigatório.');
  }
  return {
    dpa_accepted_at: new Date().toISOString(),
    dpa_version: DPA_ABRIGOS_VERSION,
    signature_text: legal_rep_name.trim(),
    signature_cpf_hash: legal_rep_cpf.replace(/\D/g, '').slice(-4), // últimos 4 dígitos do CPF
    shelter_id,
    shelter_name: shelter_name || null,
  };
}
