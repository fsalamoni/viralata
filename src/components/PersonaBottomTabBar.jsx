/**
 * @fileoverview PersonaBottomTabBar — barra de navegação inferior contextual por persona.
 *
 * Cada persona tem seu próprio array de items. O componente lê
 * a persona ativa do `useActivePersona()` e renderiza o array
 * correspondente. Também respeita `useUiPreferences().bottomTabBarMode`
 * (fixed/autohide/hidden) herdado do BottomTabBar original.
 *
 * D-PERSONA-FEED-EXCLUSIVE-ADOPTER (Q4): feed SÓ aparece no
 * acesso Adotante.
 *
 * @see docs/PLAN_PERSONAS_V3.md (BottomTabBar original)
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { useUiPreferences, BOTTOM_TAB_MODES } from '@/core/hooks/useUiPreferences';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { getPersonaCapabilities } from '@/core/domain/personaCapabilities';
import { isPersonaGatewayPath } from '@/core/domain/personaGatewayRoutes';
import { cn } from '@/core/lib/utils';

const BOTTOM_TAB_HEIGHT_VAR = '--bottom-tab-bar-height';

/**
 * Hook utilitário: retorna a altura atual da barra inferior em pixels.
 */
export function useBottomTabBarHeight(mode) {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (mode === BOTTOM_TAB_MODES.HIDDEN) {
      setHeight(0);
      return undefined;
    }
    const read = () => {
      const v = getComputedStyle(document.documentElement)
        .getPropertyValue(BOTTOM_TAB_HEIGHT_VAR)
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

export function PersonaBottomTabBar() {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_ENABLED);
  const { user, isAuthenticated } = useAuth();
  const { active, isLoading } = useActivePersona();
  const [uiPrefs] = useUiPreferences();
  const location = useLocation();
  const navRef = useRef(null);
  const lastScrollY = useRef(0);
  const [visible, setVisible] = useState(true);

  const mode = uiPrefs?.bottomTabBarMode || BOTTOM_TAB_MODES.FIXED;

  // Items por persona — da fonte única personaCapabilities. Em rotas gateway
  // (ex.: /entrar/abrigo) o usuário ainda não entrou em um escopo: sem
  // navegação escopada na barra inferior (mantém a paridade com a topbar).
  const isGateway = isPersonaGatewayPath(location.pathname);
  const items = React.useMemo(
    () => (isGateway ? [] : getPersonaCapabilities(active).bottomNav || []),
    [active, isGateway],
  );

  // Mede altura
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
  }, [items]);

  // Autohide
  useEffect(() => {
    if (mode !== BOTTOM_TAB_MODES.AUTOHIDE) {
      setVisible(true);
      return undefined;
    }
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollY.current;
      if (Math.abs(delta) > 4) {
        setVisible(delta < 0);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [mode]);

  // Gating
  if (!enabled) return null;
  if (!isAuthenticated || !user) return null;
  if (mode === BOTTOM_TAB_MODES.HIDDEN) return null;
  if (isLoading) return null;
  if (items.length === 0) return null;

  const isAutohide = mode === BOTTOM_TAB_MODES.AUTOHIDE;

  return (
    <nav
      ref={navRef}
      aria-label="Navegação inferior (mobile)"
      data-bottom-tab-mode={mode}
      data-persona={active.type}
      className={cn(
        'safe-pb fixed inset-x-0 bottom-0 z-30 flex items-end justify-around border-t border-border bg-card/95 px-2 pt-2 backdrop-blur-xl md:hidden',
        isAutohide && cn(
          'transition-transform duration-200 ease-out',
          visible ? 'translate-y-0' : 'translate-y-full',
        ),
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.to.split('?')[0] ||
          location.pathname.startsWith(item.to.split('?')[0] + '/');
        return (
          <Link
            key={`${item.to}-${item.label}`}
            to={item.to}
            aria-current={isActive ? 'page' : undefined}
            aria-label={item.label}
            className={cn(
              'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition',
              item.center && 'relative -top-2',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid={`bottom-tab-${item.label.toLowerCase()}`}
          >
            {item.center ? (
              <span
                className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md"
                aria-hidden="true"
              >
                <Icon className="h-6 w-6" />
              </span>
            ) : (
              <Icon className="h-5 w-5" aria-hidden="true" />
            )}
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default PersonaBottomTabBar;
