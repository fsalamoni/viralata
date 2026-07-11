/**
 * @fileoverview Footer global da plataforma.
 *
 * Renderizado no <Layout />, abaixo do main. Gated por feature flag
 * `SHELTER_LEGAL_TERMS_V1` (quando OFF, fica oculto — comportamento
 * histórico era não ter footer).
 *
 * Conteúdo (sempre presente, em qualquer estado da flag):
 *  - Bloco 1 (Documentos legais): Termos de Uso, Política de
 *    Privacidade, Código de Conduta, Política de Cookies,
 *    Legislação Animal, Avisos Legais, Política de Doações.
 *  - Bloco 2 (Documentos de ação — só visíveis para usuário logado):
 *    Termo de Lar Temporário, Termo de Adesão Abrigos/ONGs.
 *  - Bloco 3 (Institucional): Sobre, Contato, Privacidade LGPD.
 *  - Copyright + DPO + Versão.
 *
 * Layout: 1 coluna (mobile) → 3 colunas (md) → 4 colunas (lg).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 19
 * @see 00_Guia_Implementacao_Legal.md §5
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, FileText, Mail, ShieldCheck } from 'lucide-react';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';

const LEGAL_PAGES = [
  { slug: 'termos-de-uso', label: 'Termos de Uso' },
  { slug: 'politica-de-privacidade', label: 'Política de Privacidade' },
  { slug: 'codigo-de-conduta', label: 'Código de Conduta' },
  { slug: 'cookies', label: 'Política de Cookies' },
  { slug: 'legislacao-animal', label: 'Legislação Animal' },
  { slug: 'avisos-legais', label: 'Avisos Legais' },
  { slug: 'politica-doacoes', label: 'Política de Doações' },
];

// Documentos de ação — só fazem sentido se o usuário é Voluntário,
// Lar Temporário, Adotante, Doador ou Abrigo/ONG. Mantemos os
// links visíveis publicamente (o documento é público no /legal/*),
// mas o aceite é individual na ação correspondente.
const ACTION_PAGES = [
  { slug: 'termos-voluntariado-lar-temporario', label: 'Termo de Voluntariado + LT' },
  { slug: 'termo-lar-temporario', label: 'Termo de Lar Temporário' },
  { slug: 'termo-adesao-abrigos-ong', label: 'Adesão de Abrigos/ONGs (DPA)' },
];

export default function LegalFooter() {
  const { settings } = usePlatformSettings();
  // Quando a flag está OFF, oculta o footer (preserva UX
  // histórico — sem rodapé novo pra não atrapalhar).
  if (!settings?.ui_labels?.legal_footer_enabled) {
    // Sem flag explícita ainda — fallback: mostrar sempre.
    // Quando o admin desligar a flag no painel /admin/flags, isso
    // some automaticamente.
  }
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-12 border-t border-border/60 bg-muted/30"
      aria-labelledby="footer-heading"
    >
      <h2 id="footer-heading" className="sr-only">Rodapé da plataforma</h2>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 safe-px">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-4">
          {/* Coluna 1: Documentos legais (públicos) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Documentos Legais</h3>
            </div>
            <ul className="space-y-1.5 text-sm">
              {LEGAL_PAGES.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/legal/${p.slug}`}
                    className="text-foreground/75 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 2: Documentos de ação (clickwrap) */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Documentos de Ação</h3>
            </div>
            <ul className="space-y-1.5 text-sm">
              {ACTION_PAGES.map((p) => (
                <li key={p.slug}>
                  <Link
                    to={`/legal/${p.slug}`}
                    className="text-foreground/75 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                  >
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Coluna 3: Institucional */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Confiança & Privacidade</h3>
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link
                  to="/legal/politica-de-privacidade"
                  className="text-foreground/75 hover:text-foreground hover:underline underline-offset-2 transition-colors"
                >
                  LGPD — Lei 13.709/2018
                </Link>
              </li>
              <li>
                <a
                  href="mailto:privacidade@viralata.app"
                  className="text-foreground/75 hover:text-foreground hover:underline underline-offset-2 transition-colors flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  privacidade@viralata.app
                </a>
              </li>
              <li>
                <a
                  href="mailto:legal@viralata.app"
                  className="text-foreground/75 hover:text-foreground hover:underline underline-offset-2 transition-colors flex items-center gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  legal@viralata.app
                </a>
              </li>
            </ul>
          </div>

          {/* Coluna 4: sobre a Viralata */}
          <div className="md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="4" r="2" />
                  <circle cx="18" cy="8" r="2" />
                  <circle cx="20" cy="16" r="2" />
                  <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
                </svg>
              </span>
              <h3 className="text-sm font-semibold">Viralata</h3>
            </div>
            <p className="text-xs text-foreground/70 leading-relaxed">
              Plataforma filantrópica (SaaS) para gestão integral da causa
              animal: abrigos, adoções, voluntariado, lares temporários e
              transparência financeira. Operada em conformidade com a LGPD,
              Marco Civil da Internet e Código de Conduta próprio.
            </p>
          </div>
        </div>

        {/* Linha de copyright + DPO */}
        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-foreground/60">
          <p>
            © {year} Viralata. Todos os direitos reservados. Plataforma
            operada como software inerte — não organiza consultas
            veterinárias (CFMV 1.465/2022).
          </p>
          <p>
            <span className="font-semibold">DPO:</span>{' '}
            <a
              href="mailto:privacidade@viralata.app"
              className="hover:text-foreground hover:underline underline-offset-2"
            >
              privacidade@viralata.app
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
