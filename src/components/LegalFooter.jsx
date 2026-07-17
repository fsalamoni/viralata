/**
 * @fileoverview Rodapé com links para documentos legais.
 * Aparece em todas as páginas autenticadas (e nas públicas) —
 * conforme exigido pelo Guia de Implementação Legal v2
 * (10/07/2026) §5: "Estes documentos devem estar sempre acessíveis
 * a qualquer visitante, com links no rodapé de todas as páginas."
 *
 * **Modos de exibição (TASK-401 + TASK-V3-UI-6)** — controlado por
 * preferência do usuário (`useUiPreferences().footerMode`):
 *  - `fixed`     (default) — SEMPRE visível, FIXO no bottom da viewport
 *    (em DESKTOP). Em MOBILE, fica no fluxo normal (relativo, depois do
 *    conteúdo) porque o BottomTabBar já ocupa o bottom mobile.
 *  - `autohide`  — fixo no rodapé da viewport, aparece quando o mouse se
 *    aproxima (desktop). Em mobile, fica sempre visível.
 *  - `hidden`    — não renderiza (LGPD/legal ainda acessível via
 *    Settings/Ajuda; use com cuidado)
 *
 * Quando flag `SHELTER_LEGAL_TERMS_V1` está OFF, o componente apenas
 * escolhe QUAL conjunto de links mostrar (rotas /legal/* vs legadas).
 * O rodapé em si nunca oculta por causa da flag.
 *
 * **Altura medida via ResizeObserver** e exposta via CSS var
 * `--legal-footer-height` no :root, para que o <main> aplique
 * padding-bottom correto (igual ao BottomTabBar).
 */
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useUiPreferences, FOOTER_MODES } from '@/core/hooks/useUiPreferences';
import { LEGAL_PAGES } from '@/modules/shelter/domain/legal';
import { cn } from '@/core/lib/utils';

const PUBLIC_SLUGS = new Set([
  'cookies',
  'avisos-legais',
  'legislacao-animal',
  'politica-de-privacidade',
  'termos-de-uso',
  'codigo-de-conduta',
]);

const LEGAL_FOOTER_HEIGHT_VAR = '--legal-footer-height';

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

function useAutoHideVisibility(active) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!active) return undefined;
    if (typeof window === 'undefined') return undefined;
    if (window.matchMedia('(hover: none)').matches) {
      setVisible(true);
      return undefined;
    }
    let timer = null;
    const handleMouseMove = (e) => {
      const near = window.innerHeight - e.clientY < 80;
      if (near) {
        setVisible(true);
        if (timer) clearTimeout(timer);
      } else if (visible) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setVisible(false), 1500);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (timer) clearTimeout(timer);
    };
  }, [active, visible]);
  return visible;
}

/**
 * Hook utilitário: retorna a altura atual do LegalFooter em pixels.
 * @param {string} mode - 'fixed' | 'autohide' | 'hidden'
 * @returns {number} altura em px (0 quando hidden)
 */
export function useLegalFooterHeight(mode) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (mode === FOOTER_MODES.HIDDEN) {
      setHeight(0);
      return undefined;
    }
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(LEGAL_FOOTER_HEIGHT_VAR)
        .trim();
      const num = parseInt(v, 10);
      if (Number.isFinite(num)) setHeight(num);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', read);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', read);
    };
  }, [mode]);

  return height;
}

export default function LegalFooter() {
  const enabled = useFeatureFlag(FEATURE_FLAG.SHELTER_LEGAL_TERMS_V1);
  const [uiPrefs] = useUiPreferences();
  const links = buildFooterLinks(enabled);
  const footerRef = useRef(null);

  const mode = uiPrefs?.footerMode || FOOTER_MODES.FIXED;
  const autoHideActive = mode === FOOTER_MODES.AUTOHIDE;
  const visible = useAutoHideVisibility(autoHideActive);

  // Se usuário escolheu 'hidden', oculta
  if (mode === FOOTER_MODES.HIDDEN) return null;

  const isFixed = mode === FOOTER_MODES.FIXED;
  const isAutohide = mode === FOOTER_MODES.AUTOHIDE;

  // V3 (TASK-V3-UI-6): mede a altura real do footer e expõe via CSS var
  // para que o <main> tenha padding-bottom dinâmico.
  useEffect(() => {
    const el = footerRef.current;
    if (!el) return undefined;
    const measure = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty(LEGAL_FOOTER_HEIGHT_VAR, `${h}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      aria-label="Rodapé com documentos legais"
      data-footer-mode={mode}
      className={cn(
        // Base
        'border-t border-border bg-secondary/30 px-5 py-6 text-xs text-muted-foreground',
        // V3 (TASK-V3-UI-6): FIXED em DESKTOP = `fixed bottom-0` para que
        // o rodapé flutue no bottom da viewport (igual BottomTabBar no mobile).
        // Em MOBILE, fica `relative` (no fluxo) para não brigar com a
        // BottomTabBar que também é fixed bottom.
        isFixed && 'relative md:fixed md:inset-x-0 md:bottom-0 md:z-30 md:bg-card/95 md:backdrop-blur-xl md:border-t md:shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.12)]',
        // Autohide: fixed no bottom, com transição de opacidade/transform
        isAutohide && cn(
          'fixed inset-x-0 bottom-0 z-30 transition-all duration-200 ease-out',
          'shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
        ),
      )}
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
