/**
 * @fileoverview BottomTabBar — barra de navegação inferior (mobile, autenticado).
 *
 * TASK-V3-UI-4 (2026-07-17): respeita `useUiPreferences().bottomTabBarMode`:
 *  - `fixed`     → sempre visível, com padding-bottom no main
 *  - `autohide`  → aparece com scroll-up, some com scroll-down (mobile)
 *  - `hidden`    → não renderiza (sem padding)
 *
 * Implementação:
 *  - Componente extraído do Layout.jsx para isolar lógica de visibilidade
 *    e altura dinâmica
 *  - `ResizeObserver` na própria nav mede a altura real (varia com safe-area
 *    inset-bottom em devices com notch)
 *  - Altura é exportada via `useBottomTabBarHeight()` (CSS variable no
 *    :root) para que o <main> tenha padding-bottom correto
 *  - Mobile only (`md:hidden`)
 *
 * @see docs/REGENCY_FEED_V3.md § "Configurabilidade de UI"
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PawPrint, Building2, Users, Plus, MessageCircle, User } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';
import { useUiPreferences, BOTTOM_TAB_MODES } from '@/core/hooks/useUiPreferences';
import { cn } from '@/core/lib/utils';

const BOTTOM_TAB_HEIGHT_VAR = '--bottom-tab-bar-height';

/**
 * Hook utilitário: retorna a altura atual da barra inferior em pixels.
 * Use no <main> para aplicar padding-bottom dinâmico.
 *
 * @param {string} mode - 'fixed' | 'autohide' | 'hidden'
 * @returns {number} altura em px (0 quando hidden)
 */
export function useBottomTabBarHeight(mode) {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (mode === BOTTOM_TAB_MODES.HIDDEN) {
      setHeight(0);
      return undefined;
    }
    // Lê do CSS var (atualizado pelo BottomTabBar)
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(BOTTOM_TAB_HEIGHT_VAR)
        .trim();
      const num = parseInt(v, 10);
      if (Number.isFinite(num)) setHeight(num);
    };
    read();
    // Observa mudanças
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

export default function BottomTabBar() {
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const { settings } = usePlatformSettings();
  const [uiPrefs] = useUiPreferences();
  const navRef = useRef(null);
  const lastScrollY = useRef(0);
  const [visible, setVisible] = useState(true);

  const mode = uiPrefs?.bottomTabBarMode || BOTTOM_TAB_MODES.FIXED;

  const bottomTabItems = [
    { label: 'Feed', icon: PawPrint, to: '/feed' },
    { label: 'ONGs', icon: Building2, to: '/organizacoes' },
    { label: 'Comunidade', icon: Users, to: '/comunidade' },
    { label: settings.ui_labels.mobile_create_pet_cta, icon: Plus, to: '/pets/new', center: true },
    { label: 'Chat', icon: MessageCircle, to: '/chat' },
    { label: 'Perfil', icon: User, to: '/perfil' },
  ];

  // Mede altura da nav e expõe via CSS var
  useEffect(() => {
    const el = navRef.current;
    if (!el) return undefined;
    const measure = () => {
      const h = el.offsetHeight;
      document.documentElement.style.setProperty(BOTTOM_TAB_HEIGHT_VAR, `${h}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Autohide: aparece com scroll-up, some com scroll-down
  useEffect(() => {
    if (mode !== BOTTOM_TAB_MODES.AUTOHIDE) {
      setVisible(true);
      return undefined;
    }
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      // Scroll para baixo (delta > 0) → some
      // Scroll para cima (delta < 0) → aparece
      if (Math.abs(delta) > 4) {
        setVisible(delta < 0);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mode]);

  if (!isAuthenticated) return null;
  if (mode === BOTTOM_TAB_MODES.HIDDEN) return null;

  const isAutohide = mode === BOTTOM_TAB_MODES.AUTOHIDE;
  const isFixed = mode === BOTTOM_TAB_MODES.FIXED;

  return (
    <nav
      ref={navRef}
      aria-label="Navegação inferior (mobile)"
      data-bottom-tab-mode={mode}
      className={cn(
        'safe-pb fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border bg-card/95 px-2 pt-2 backdrop-blur-xl md:hidden',
        isAutohide && cn(
          'transition-transform duration-200 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ),
        isFixed && 'translate-y-0',
      )}
    >
      {bottomTabItems.map(({ label, icon: Icon, to, center }) => {
        const active = location.pathname.startsWith(to);
        if (center) {
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 pb-1.5"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <span className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_14px_26px_-10px_rgba(64,34,18,0.6)]">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={to}
            to={to}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-medium transition-colors',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground/80',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
