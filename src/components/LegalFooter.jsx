/**
 * @fileoverview Rodapé com links para documentos legais.
 * Aparece em todas as páginas autenticadas (e nas públicas) —
 * conforme exigido pelo Guia de Implementação Legal v2
 * (10/07/2026) §5: "Estes documentos devem estar sempre acessíveis
 * a qualquer visitante, com links no rodapé de todas as páginas."
 *
 * - 03 Avisos Legais → /legal/avisos-legais
 * - 09 Cookies (banner separado via CookieBanner)
 * - 10 Guia de Legislação Animal → /legal/legislacao-animal
 * - 01 Termos de Uso → /legal/termos-de-uso
 * - 02 Política de Privacidade → /legal/politica-de-privacidade
 * - 04 Código de Conduta → /legal/codigo-de-conduta
 *
 * Gated por feature flag `SHELTER_LEGAL_TERMS_V1` (mesma do
 * LegalPageViewer / CookieBanner).
 */

import { Link } from 'react-router-dom';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { LEGAL_PAGES } from '@/modules/shelter/domain/legal';

const PUBLIC_SLUGS = new Set([
  'avisos-legais',
  'legislacao-animal',
  'politica-de-privacidade',
  'termos-de-uso',
  'codigo-de-conduta',
]);

/**
 * Seleciona os links do rodapé (apenas docs públicos, sem aceite
 * obrigatório). Quando a flag está OFF, cai para as rotas legadas
 * (/termos, /politica-privacidade, /legislacao) — mesmo fallback
 * que o LegalPageViewer.
 */
function buildFooterLinks(enabled) {
  if (enabled) {
    return LEGAL_PAGES
      .filter((p) => PUBLIC_SLUGS.has(p.slug))
      .map((p) => ({ slug: p.slug, title: p.title, to: `/legal/${p.slug}` }));
  }
  return [
    { title: 'Termos', to: '/termos' },
    { title: 'Privacidade', to: '/politica-privacidade' },
    { title: 'Legislação Animal', to: '/legislacao' },
  ];
}

export default function LegalFooter() {
  const enabled = useFeatureFlag(FEATURE_FLAG.SHELTER_LEGAL_TERMS_V1);
  const links = buildFooterLinks(enabled);

  return (
    <footer
      aria-label="Rodapé com documentos legais"
      className="border-t border-border bg-secondary/30 px-5 py-6 text-xs text-muted-foreground"
    >
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-6">
        <p className="text-center sm:text-left">
          © {new Date().getFullYear()} Viralata · Plataforma filantrópica de gestão da causa animal
        </p>
        <nav
          aria-label="Links para documentos legais"
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2"
        >
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline"
            >
              {l.title}
            </Link>
          ))}
          <a
            href="mailto:legal@viralata.org"
            className="font-medium text-foreground/80 underline-offset-2 hover:text-primary hover:underline"
          >
            Contato jurídico
          </a>
        </nav>
      </div>
    </footer>
  );
}
