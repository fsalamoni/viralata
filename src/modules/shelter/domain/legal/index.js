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
//
// NOTA v2: a partir de 2026-07-11, os textos integrais das 6
// páginas estáticas e dos 4 documentos de ação (adoção, lar
// temporário, adesão, doações) foram substituídos pelas versões
// v2 do pacote `Viralata_Documentos_Legais_Completos_v2.zip`.
// Os exports v1 foram mantidos por compatibilidade com testes
// e módulos legados — os novos consumidores devem usar *_V2 ou
// *_TEXT direto de `@/modules/shelter/domain/legal/texts/<doc>.v2`.
import { CONSENT_VERSION } from '@/modules/shelter/domain/legal/texts/cookies';
// NOTA: cookies.v2.js exporta `COOKIE_POLICY_VERSION` (nome padronizado
// para os textos v2 do zip). v1 exporta `CONSENT_VERSION` (nome
// histórico mantido por compat). Aqui aliasamos para o nome comum
// CONSENT_VERSION_V2 que o resto do módulo usa.
import { COOKIE_POLICY_VERSION as CONSENT_VERSION_V2, COOKIE_POLICY_TEXT as COOKIE_POLICY_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/cookies.v2';
import { TERMS_OF_USE_VERSION } from '@/modules/shelter/domain/legal/texts/termosDeUso';
import { TERMS_OF_USE_VERSION as TERMS_OF_USE_VERSION_V2, TERMS_OF_USE_TEXT as TERMS_OF_USE_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/termosDeUso.v2';
import { PRIVACY_POLICY_VERSION } from '@/modules/shelter/domain/legal/texts/politicaDePrivacidade';
import { PRIVACY_POLICY_VERSION as PRIVACY_POLICY_VERSION_V2, PRIVACY_POLICY_TEXT as PRIVACY_POLICY_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/politicaDePrivacidade.v2';
import { LEGAL_NOTICES_VERSION } from '@/modules/shelter/domain/legal/texts/avisosLegais';
import { LEGAL_NOTICES_VERSION as LEGAL_NOTICES_VERSION_V2, LEGAL_NOTICES_TEXT as LEGAL_NOTICES_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/avisosLegais.v2';
import { CODE_OF_CONDUCT_VERSION } from '@/modules/shelter/domain/legal/texts/codigoDeConduta';
import { CODE_OF_CONDUCT_VERSION as CODE_OF_CONDUCT_VERSION_V2, CODE_OF_CONDUCT_TEXT as CODE_OF_CONDUCT_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/codigoDeConduta.v2';
import { ANIMAL_LEGISLATION_VERSION } from '@/modules/shelter/domain/legal/texts/legislacaoAnimal';
import { ANIMAL_LEGISLATION_VERSION as ANIMAL_LEGISLATION_VERSION_V2, ANIMAL_LEGISLATION_TEXT as ANIMAL_LEGISLATION_TEXT_V2 } from '@/modules/shelter/domain/legal/texts/legislacaoAnimal.v2';
import { DONATION_POLICY_VERSION, DONATION_POLICY_TEXT } from '@/modules/shelter/domain/legal/texts/doacoes.v1';
import { FOSTER_TERMS_VERSION as LAR_TEMPORARIO_VERSION_V1, FOSTER_TERMS_TEXT as LAR_TEMPORARIO_TEXT } from '@/modules/shelter/domain/legal/texts/larTemporario.v1';
import { SHELTER_ADHESION_VERSION, SHELTER_ADHESION_TEXT } from '@/modules/shelter/domain/legal/texts/adesaoAbrigosOng.v1';
import { VOLUNTEER_AND_FOSTER_VERSION, VOLUNTEER_AND_FOSTER_TEXT } from '@/modules/shelter/domain/legal/texts/voluntariado.v3';

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

// v2: substitui v1 a partir de 2026-07-11 (zip
// Viralata_Documentos_Legais_Completos_v2.zip).
export {
  TERMS_OF_USE_VERSION as TERMS_OF_USE_VERSION_V2,
  TERMS_OF_USE_TEXT as TERMS_OF_USE_TEXT_V2,
} from '@/modules/shelter/domain/legal/texts/termosDeUso.v2';

export {
  PRIVACY_POLICY_VERSION,
  PRIVACY_POLICY_TEXT,
} from '@/modules/shelter/domain/legal/texts/politicaDePrivacidade';

export {
  PRIVACY_POLICY_VERSION as PRIVACY_POLICY_VERSION_V2,
  PRIVACY_POLICY_TEXT as PRIVACY_POLICY_TEXT_V2,
} from '@/modules/shelter/domain/legal/texts/politicaDePrivacidade.v2';

export {
  LEGAL_NOTICES_VERSION,
  LEGAL_NOTICES_TEXT,
} from '@/modules/shelter/domain/legal/texts/avisosLegais';

export {
  LEGAL_NOTICES_VERSION as LEGAL_NOTICES_VERSION_V2,
  LEGAL_NOTICES_TEXT as LEGAL_NOTICES_TEXT_V2,
} from '@/modules/shelter/domain/legal/texts/avisosLegais.v2';

export {
  CODE_OF_CONDUCT_VERSION,
  CODE_OF_CONDUCT_TEXT,
} from '@/modules/shelter/domain/legal/texts/codigoDeConduta';

export {
  CODE_OF_CONDUCT_VERSION as CODE_OF_CONDUCT_VERSION_V2,
  CODE_OF_CONDUCT_TEXT as CODE_OF_CONDUCT_TEXT_V2,
} from '@/modules/shelter/domain/legal/texts/codigoDeConduta.v2';

export {
  ANIMAL_LEGISLATION_VERSION,
  ANIMAL_LEGISLATION_TEXT,
} from '@/modules/shelter/domain/legal/texts/legislacaoAnimal';

export {
  ANIMAL_LEGISLATION_VERSION as ANIMAL_LEGISLATION_VERSION_V2,
  ANIMAL_LEGISLATION_TEXT as ANIMAL_LEGISLATION_TEXT_V2,
} from '@/modules/shelter/domain/legal/texts/legislacaoAnimal.v2';

// v2: política de cookies reformatada para v2 (banner mostra
// "Aceitar Todos" + "Configurar" + link /legal/cookies).
// NOTA: cookies.v2.js exporta `COOKIE_POLICY_VERSION`, não
// `CONSENT_VERSION` (v2 padroniza nomes por arquivo).
export {
  COOKIE_POLICY_VERSION as CONSENT_VERSION_V2,
  COOKIE_POLICY_TEXT as COOKIE_POLICY_TEXT_V2,
} from '@/modules/shelter/domain/legal/texts/cookies.v2';

// Novos documentos v2 (antes ausentes).
export {
  DONATION_POLICY_VERSION,
  DONATION_POLICY_TEXT,
} from '@/modules/shelter/domain/legal/texts/doacoes.v1';

export { FOSTER_TERMS_VERSION as LAR_TEMPORARIO_VERSION_V1 } from '@/modules/shelter/domain/legal/texts/larTemporario.v1';
export { FOSTER_TERMS_TEXT as LAR_TEMPORARIO_TEXT } from '@/modules/shelter/domain/legal/texts/larTemporario.v1';

export {
  SHELTER_ADHESION_VERSION,
  SHELTER_ADHESION_TEXT,
} from '@/modules/shelter/domain/legal/texts/adesaoAbrigosOng.v1';

export {
  VOLUNTEER_AND_FOSTER_VERSION,
  VOLUNTEER_AND_FOSTER_TEXT,
} from '@/modules/shelter/domain/legal/texts/voluntariado.v3';

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
 *
 * A partir da v2 (10/07/2026), LEGAL_PAGES inclui:
 *  - 5 páginas estáticas originais (termos, privacidade, avisos,
 *    conduta, cookies, legislacao)
 *  - 4 documentos de ação: política de doações, voluntariado
 *    (que cobre LT), termo de lar temporário (standalone),
 *    termo de adesão de abrigos/ONGs (com DPA embutido).
 *  Total: 10 páginas.
 */
export const LEGAL_PAGES = Object.freeze([
  {
    slug: 'termos-de-uso',
    title: 'Termos de Uso',
    description: 'Regras gerais de uso da Plataforma Viralata.',
    version: TERMS_OF_USE_VERSION_V2,
  },
  {
    slug: 'politica-de-privacidade',
    title: 'Política de Privacidade',
    description: 'Como tratamos seus Dados Pessoais conforme a LGPD.',
    version: PRIVACY_POLICY_VERSION_V2,
  },
  {
    slug: 'avisos-legais',
    title: 'Avisos Legais',
    description: 'Natureza da Plataforma, isenção de responsabilidade, propriedade intelectual.',
    version: LEGAL_NOTICES_VERSION_V2,
  },
  {
    slug: 'codigo-de-conduta',
    title: 'Código de Conduta',
    description: 'Regras de comportamento para todos os Usuários.',
    version: CODE_OF_CONDUCT_VERSION_V2,
  },
  {
    slug: 'cookies',
    title: 'Política de Cookies',
    description: 'Cookies, tecnologias semelhantes e legislação aplicável.',
    version: CONSENT_VERSION_V2,
  },
  {
    slug: 'legislacao-animal',
    title: 'Legislação Animal',
    description: 'Compilação comentada das principais normas brasileiras de proteção animal.',
    version: ANIMAL_LEGISLATION_VERSION_V2,
  },
  {
    slug: 'politica-doacoes',
    title: 'Política de Doações',
    description: 'Regras para doações financeiras (crowdfunding filantrópico).',
    version: DONATION_POLICY_VERSION,
  },
  {
    slug: 'termos-voluntariado-lar-temporario',
    title: 'Termo de Voluntariado e Lar Temporário',
    description: 'Termo consolidado para voluntários e lares temporários (Lei 9.608/98).',
    version: VOLUNTEER_AND_FOSTER_VERSION,
  },
  {
    slug: 'termo-lar-temporario',
    title: 'Termo de Lar Temporário (standalone)',
    description: 'Termo individual de LT para assinatura na ação de acolhimento.',
    version: LAR_TEMPORARIO_VERSION_V1,
  },
  {
    slug: 'termo-adesao-abrigos-ong',
    title: 'Termo de Adesão para Abrigos/ONGs',
    description: 'Inclui o Acordo de Tratamento de Dados (DPA) — Lei 13.709/2018.',
    version: SHELTER_ADHESION_VERSION,
  },
]);

/**
 * Helper: lookup de página legal pelo slug.
 */
export function getLegalPageBySlug(slug) {
  return LEGAL_PAGES.find((p) => p.slug === slug) || null;
}
