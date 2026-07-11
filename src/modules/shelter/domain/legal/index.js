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

// ─── Estrutura de domínio (Bloco 6) ────────────────────────────────────
// 06 Doações, 07 DPA resumido (já embutido no termo de adesão),
// 11 Lar Temporário — apenas a estrutura de domínio fica aqui.
// Textos integrais podem ser adicionados em PR futuro.

export { DONATION_TERMS_VERSION } from '@/modules/shelter/domain/legal/donationTerms';
export { FOSTER_TERMS_VERSION } from '@/modules/shelter/domain/legal/fosterTerms';

/**
 * Helper: lista canônica de todas as páginas legais estáticas
 * (rota + label + versão). Usado pelo Footer e pela rota
 * `/legal/$slug` para rotear para a página certa.
 */
export const LEGAL_PAGES = Object.freeze([
  {
    slug: 'termos-de-uso',
    title: 'Termos de Uso',
    description: 'Regras gerais de uso da Plataforma Viralata.',
    version: TERMS_OF_USE_VERSION,
  },
  {
    slug: 'politica-de-privacidade',
    title: 'Política de Privacidade',
    description: 'Como tratamos seus Dados Pessoais conforme a LGPD.',
    version: PRIVACY_POLICY_VERSION,
  },
  {
    slug: 'avisos-legais',
    title: 'Avisos Legais',
    description: 'Natureza da Plataforma, isenção de responsabilidade, propriedade intelectual.',
    version: LEGAL_NOTICES_VERSION,
  },
  {
    slug: 'codigo-de-conduta',
    title: 'Código de Conduta',
    description: 'Regras de comportamento para todos os Usuários.',
    version: CODE_OF_CONDUCT_VERSION,
  },
  {
    slug: 'cookies',
    title: 'Política de Cookies',
    description: 'Cookies, tecnologias semelhantes e legislação aplicável.',
    version: CONSENT_VERSION,
  },
  {
    slug: 'legislacao-animal',
    title: 'Legislação Animal',
    description: 'Compilação comentada das principais normas brasileiras de proteção animal.',
    version: ANIMAL_LEGISLATION_VERSION,
  },
]);

/**
 * Helper: lookup de página legal pelo slug.
 */
export function getLegalPageBySlug(slug) {
  return LEGAL_PAGES.find((p) => p.slug === slug) || null;
}
