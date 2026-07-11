/**
 * @fileoverview Termo de Voluntariado — VERSÃO INTEGRAL v2 (Fase 19 / Legal Terms v1).
 *
 * Substitui o stub da Fase 13 pelo texto integral do Termo de
 * Voluntariado. O texto é versionado semanticamente:
 *
 *   - `2026-07-10`    v1 (stub — Fase 13,LGPD minimizado)
 *   - `2026-07-10-v2` v2 (texto integral — Fase 19, Lei 14.063/2020)
 *
 * Cada novo aceite GRAVA a versão aceita em
 * `users/{uid}/volunteer_profile/main` (campos `terms_accepted_at` +
 * `terms_version`) e o abrigo espelha em
 * `clubs/{clubId}/volunteers/{volunteerUid}`. Voluntários que aceitaram
 * a v1 precisam REACEITAR a v2 (a UI mostra um banner "termo
 * atualizado" enquanto a versão global != a atual). Migração é manual
 * e idempotente (regra do firestore.rules libera update do campo de
 * aceite).
 *
 * LGPD (Lei 13.709/2018): o aceite é o consentimento (art. 7º, I) para
 * tratamento dos dados cadastrados no perfil do voluntário. O snapshot
 * é imutável após gravação. O termo também satisfaz o art. 9º
 * (informação ao titular) listando finalidades, bases legais,
 * compartilhamento e retenção.
 *
 * Lei 14.063/2020: o aceite usa o nível "básico" de assinatura
 * eletrônica (registro + hash do `signature_text` no audit log).
 * Não usamos certificado digital ICP-Brasil nem biometria — basta
 * para fluxos sem partes obrigadas por lei federal.
 *
 * O texto é renderizado em componentes de UI antes do checkbox
 * "Li e aceito". É longo de propósito: integridade legal > concisão.
 * `getVolunteerTermsText()` retorna o markdown/JSX-friendly blob.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19 + §11.6
 * @see src/modules/shelter/domain/legal/texts/volunteerTerms.v2.js
 */

import { VOLUNTEER_TERMS_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/volunteerTerms.v2';

export const VOLUNTEER_TERMS_VERSION = '2026-07-10-v2';

/**
 * Versões anteriores (para migração e detecção de "termo desatualizado"
 * no perfil do voluntário). NÃO remover — a UI usa para avisar.
 */
export const VOLUNTEER_TERMS_PRIOR_VERSIONS = Object.freeze([
  '2026-07-10', // v1 (stub, Fase 13)
]);

/**
 * Texto integral do termo (markdown simples). Renderizado em
 * `<pre>` ou via componente que parseia headings/listas. Comprimento
 * esperado: 3-5 telas em desktop.
 */
export const VOLUNTEER_TERMS_TEXT = VOLUNTEER_TERMS_TEXT_V2;

export const VOLUNTEER_TERMS_SHORT_LABEL = 'Termo de Voluntariado';

/**
 * Helper: retorna o label + versão para exibição.
 */
export function getVolunteerTermsLabel() {
  return `${VOLUNTEER_TERMS_SHORT_LABEL} (versão ${VOLUNTEER_TERMS_VERSION})`;
}

/**
 * Indica se a versão de termo aceito pelo usuário é a mais recente.
 * @param {string|null|undefined} acceptedVersion
 * @returns {boolean}
 */
export function isCurrentVolunteerTermsVersion(acceptedVersion) {
  return acceptedVersion === VOLUNTEER_TERMS_VERSION;
}
