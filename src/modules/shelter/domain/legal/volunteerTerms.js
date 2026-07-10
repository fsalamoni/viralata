/**
 * @fileoverview Termo de Voluntariado — stub versionado (Fase 13).
 *
 * Texto RESUMIDO exibido na UI no momento do aceite. O termo INTEGRAL
 * vive em `/workspace/attachments/legal-seg/08_Termos_Voluntariado_LT.md`
 * (documento externo, mantido fora do repositório por decisão do
 * time — ver `docs/SHELTER_MGMT_ROADMAP.md` §11.6).
 *
 * LGPD: o aceite do termo é gravado como snapshot imutável em
 * `users/{uid}/volunteer_profile/main` (campos `terms_accepted_at` +
 * `terms_version`). Cada abrigo também guarda o snapshot do aceite
 * na sua rostagem (`clubs/{clubId}/volunteers/{uid}`).
 *
 * Fase 18 (Legal Terms) substituirá este stub pelo texto integral
 * (com tabela de aceites, versionamento semântico, e-assinatura
 * avançada Lei 14.063/2020). Por ora, snapshot resumido é suficiente
 * para a Fase 13 entrar em produção com flag OFF.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 13 + §11.6
 */

export const VOLUNTEER_TERMS_VERSION = '2026-07-10';

/**
 * Texto exibido ao voluntário no momento do aceite. Curto (1-2
 * parágrafos) e aponta para o termo integral. Emojis opcionais,
 * separados por uma linha em branco para renderização.
 */
export const VOLUNTEER_TERMS_TEXT = `Eu, voluntário(a) da plataforma Viralata, declaro ter lido e estar de acordo com o Termo de Voluntariado integral (versão ${VOLUNTEER_TERMS_VERSION}), disponível para consulta em /workspace/attachments/legal-seg/08_Termos_Voluntariado_LT.md. Compreendo que meu cadastro como voluntário é gratuito, não gera vínculo empregatício, e que meus dados pessoais serão tratados conforme a Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018) e a Política de Privacidade da plataforma. Autorizo o uso dos meus dados de disponibilidade, habilidades e contato para fins exclusivos de convocação e gestão de atividades voluntárias em abrigos parceiros, e posso revogar este consentimento a qualquer momento pela minha conta.`;

export const VOLUNTEER_TERMS_SHORT_LABEL = 'Termo de Voluntariado';

/**
 * Helper: retorna o label + versão para exibição.
 */
export function getVolunteerTermsLabel() {
  return `${VOLUNTEER_TERMS_SHORT_LABEL} (versão ${VOLUNTEER_TERMS_VERSION})`;
}
