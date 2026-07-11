/**
 * @fileoverview Módulo de domínio — Termos e Políticas Legais
 * (Fase 19 / Bloco 1-6).
 *
 * Re-exporta todos os termos versionados e helpers de aceite.
 * Cada termo tem sua versão, texto integral e helpers para
 * detectar desatualização.
 *
 * Os textos integrais ficam em `./texts/*` para não carregar
 * strings grandes no bundle de quem só quer importar o enum.
 * Use os helpers `get*Text()` para obter o texto sob demanda.
 *
 * Convenção:
 *   - Nomes de arquivo: `<termo>Terms.js` (helper + enum)
 *   - Textos integrais: `./texts/<termo>Terms.v<N>.js`
 *
 * LGPD: Todos os termos carregam cláusulas LGPD (art. 7º, 9º,
 * 18, 33, 39, 46, 48). Aceite sempre grava:
 *   - terms_accepted_at (ISO timestamp UTC)
 *   - terms_version (string semântica)
 *   - signature_text (nome digitado, Lei 14.063/2020)
 *   - hash do nome (no audit log, não no doc público)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 */

// Importações locais para uso interno (LEGAL_PAGES) — os textos
// longos são re-exportados abaixo para o bundle de quem só quer
// o enum.
import { CONSENT_VERSION } from '@/modules/shelter/domain/legal/texts/cookies';
import { TERMS_OF_USE_VERSION } from '@/modules/shelter/domain/legal/texts/termosDeUso';
import { PRIVACY_POLICY_VERSION } from '@/modules/shelter/domain/legal/texts/politicaDePrivacidade';
import { LEGAL_NOTICES_VERSION } from '@/modules/shelter/domain/legal/texts/avisosLegais';
import { CODE_OF_CONDUCT_VERSION } from '@/modules/shelter/domain/legal/texts/codigoDeConduta';
import { ANIMAL_LEGISLATION_VERSION } from '@/modules/shelter/domain/legal/texts/legislacaoAnimal';

export {
  VOLUNTEER_TERMS_VERSION,
  VOLUNTEER_TERMS_PRIOR_VERSIONS,
  VOLUNTEER_TERMS_TEXT,
  VOLUNTEER_TERMS_SHORT_LABEL,
  getVolunteerTermsLabel,
  isCurrentVolunteerTermsVersion,
} from '@/modules/shelter/domain/legal/volunteerTerms';

export {
  ADOPTION_TERMS_VERSION,
  ADOPTION_TERMS_TEXT,
  ADOPTION_TERMS_SHORT_LABEL,
  getAdoptionTermsLabel,
  isCurrentAdoptionTermsVersion,
  buildAdoptionTermsAcceptance,
} from '@/modules/shelter/domain/legal/adoptionTerms';

export {
  SHELTER_ONBOARDING_TERMS_VERSION,
  SHELTER_ONBOARDING_TERMS_TEXT,
  SHELTER_ONBOARDING_TERMS_SHORT_LABEL,
  getShelterOnboardingTermsLabel,
  isCurrentShelterOnboardingTermsVersion,
  buildShelterOnboardingAcceptance,
} from '@/modules/shelter/domain/legal/shelterOnboardingTerms';

export {
  CONSENT_VERSION,
  COOKIE_POLICY_TEXT,
  buildConsentRecord,
} from '@/modules/shelter/domain/legal/texts/cookies';

export {
  TERMS_OF_USE_VERSION,
  TERMS_OF_USE_TEXT,
} from '@/modules/shelter/domain/legal/texts/termosDeUso';

export {
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_TEXT,
} from '@/modules/shelter/domain/legal/texts/politicaDePrivacidade';

export {
  LEGAL_NOTICES_VERSION,
  LEGAL_NOTICES_TEXT,
} from '@/modules/shelter/domain/legal/texts/avisosLegais';

export {
  CODE_OF_CONDUCT_VERSION,
  CODE_OF_CONDUCT_TEXT,
} from '@/modules/shelter/domain/legal/texts/codigoDeConduta';

export {
  ANIMAL_LEGISLATION_VERSION,
  ANIMAL_LEGISLATION_TEXT,
} from '@/modules/shelter/domain/legal/texts/legislacaoAnimal';

// Bloco 6 — Doações, Lar Temporário e Termo de Adesão (DPA)
// Textos integrais adicionados em 11/07/2026 (Fase 19, pacote
// documental v2). Cada um tem build*Acceptance helper para gravar
// no doc correspondente + audit log com ip/ua/versão.
export {
  DONATION_TERMS_VERSION,
  DONATION_TERMS_TEXT,
  DONATION_TERMS_SHORT_LABEL,
  getDonationTermsLabel,
  isCurrentDonationTermsVersion,
  buildDonationTermsAcceptance,
} from '@/modules/shelter/domain/legal/donationTerms';

export {
  FOSTER_TERMS_VERSION,
  FOSTER_TERMS_TEXT,
  FOSTER_TERMS_SHORT_LABEL,
  getFosterTermsLabel,
  isCurrentFosterTermsVersion,
  buildFosterTermsAcceptance,
} from '@/modules/shelter/domain/legal/fosterTerms';

/**
 * Helper: lista canônica de todas as páginas legais estáticas
 * (rota + label + versão). Usado pelo Footer e pela rota
 * `/legal/$slug` para rotear para a página certa.
 *
 * 12 documentos conforme Guia de Implementação Legal v2
 * (10/07/2026):
 *   01 Termos de Uso
 *   02 Política de Privacidade
 *   03 Avisos Legais
 *   04 Código de Conduta
 *   05 Termo de Adoção
 *   06 Política de Doações
 *   07 DPA Abrigos (referência, embutido no 12)
 *   08 Termos de Voluntariado (referência, texto integral no v2)
 *   09 Cookies e Legislação
 *   10 Guia Legislação Animal
 *   11 Termo de Lar Temporário
 *   12 Termo de Adesão de Abrigos/ONGs (com DPA completo)
 */
export const LEGAL_PAGES = Object.freeze([
  {
    slug: 'termos-de-uso',
    title: 'Termos de Uso',
    description: 'Regras gerais de uso da Plataforma Viralata.',
    version: TERMS_OF_USE_VERSION,
    acceptance_required: true,
    acceptance_target: 'terms_accepted',
  },
  {
    slug: 'politica-de-privacidade',
    title: 'Política de Privacidade',
    description: 'Como tratamos seus Dados Pessoais conforme a LGPD.',
    version: PRIVACY_POLICY_VERSION,
    acceptance_required: true,
    acceptance_target: 'terms_accepted',
  },
  {
    slug: 'avisos-legais',
    title: 'Avisos Legais',
    description: 'Natureza da Plataforma, isenção de responsabilidade, propriedade intelectual.',
    version: LEGAL_NOTICES_VERSION,
    acceptance_required: false,
  },
  {
    slug: 'codigo-de-conduta',
    title: 'Código de Conduta',
    description: 'Regras de comportamento para todos os Usuários (Tolerância Zero).',
    version: CODE_OF_CONDUCT_VERSION,
    acceptance_required: true,
    acceptance_target: 'terms_accepted',
  },
  {
    slug: 'termo-de-adocao',
    title: 'Termo de Adoção Responsável',
    description: 'Termo assinado eletronicamente no momento da adoção de um animal.',
    version: '2026-07-10',
    acceptance_required: true,
    acceptance_target: 'adoption_terms_accepted',
  },
  {
    slug: 'politica-de-doacoes',
    title: 'Política de Doações',
    description: 'Regras para doações financeiras (crowdfunding social) — irreversível.',
    version: '2026-07-10',
    acceptance_required: true,
    acceptance_target: 'donation_terms_accepted',
  },
  {
    slug: 'cookies',
    title: 'Política de Cookies',
    description: 'Cookies, tecnologias semelhantes e legislação aplicável.',
    version: CONSENT_VERSION,
    acceptance_required: false,
  },
  {
    slug: 'legislacao-animal',
    title: 'Legislação Animal',
    description: 'Compilação comentada das principais normas brasileiras de proteção animal.',
    version: ANIMAL_LEGISLATION_VERSION,
    acceptance_required: false,
  },
  {
    slug: 'termo-voluntariado',
    title: 'Termo de Voluntariado',
    description: 'Termo de adesão para voluntários da plataforma.',
    version: '2026-07-10-v2',
    acceptance_required: true,
    acceptance_target: 'volunteer_terms_accepted',
  },
  {
    slug: 'termo-lar-temporario',
    title: 'Termo de Lar Temporário (LT)',
    description: 'Termo de responsabilidade para Lares Temporários de animais.',
    version: '2026-07-10',
    acceptance_required: true,
    acceptance_target: 'foster_terms_accepted',
  },
  {
    slug: 'termo-adesao-abrigos',
    title: 'Termo de Adesão de Abrigos e ONGs (com DPA)',
    description: 'Contrato de adesão + Data Processing Agreement (LGPD) para ONGs parceiras.',
    version: '2026-07-10',
    acceptance_required: true,
    acceptance_target: 'shelter_terms_accepted',
  },
]);

/**
 * Helper: lookup de página legal pelo slug.
 */
export function getLegalPageBySlug(slug) {
  return LEGAL_PAGES.find((p) => p.slug === slug) || null;
}
