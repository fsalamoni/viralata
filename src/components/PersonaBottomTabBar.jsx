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
import {
  PawPrint,
  User,
  Plus,
  MessageCircle,
  Building2,
  Users,
  Home,
  ClipboardList,
  Calendar,
  Shield,
  Stethoscope,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { useUiPreferences, BOTTOM_TAB_MODES } from '@/core/hooks/useUiPreferences';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE } from '@/core/domain/personas';
import { cn } from '@/core/lib/utils';

const BOTTOM_TAB_HEIGHT_VAR = '--bottom-tab-bar-height';

/**
 * Itens da BottomTabBar por persona.
 * D-PERSONA-FEED-EXCLUSIVE-ADOPTER: feed SÓ para adopter.
 */
const BOTTOM_TABS_BY_PERSONA = {
  [PERSONA_TYPE.ADOPTER]: [
    { label: 'Feed', icon: PawPrint, to: '/feed' },
    { label: 'ONGs', icon: Building2, to: '/organizacoes' },
    { label: 'Comunidade', icon: Users, to: '/comunidade' },
    { label: 'Adotar', icon: Plus, to: '/feed', center: true },
    { label: 'Chat', icon: MessageCircle, to: '/chat' },
    { label: 'Perfil', icon: User, to: '/perfil' },
  ],
  [PERSONA_TYPE.DONOR]: [
    { label: 'Meus pets', icon: PawPrint, to: '/meus-pets' },
    { label: 'Cadastrar', icon: Plus, to: '/pets/new', center: true },
    { label: 'Chat', icon: MessageCircle, to: '/chat' },
    { label: 'Perfil', icon: User, to: '/perfil' },
  ],
  [PERSONA_TYPE.SHELTER_STAFF]: (persona) => {
    const clubId = persona.scopeId;
    return [
      { label: 'Painel', icon: Home, to: `/organizacoes/${clubId}/admin` },
      { label: 'Mural', icon: MessageCircle, to: `/organizacoes/${clubId}?tab=feed` },
      { label: 'Pets', icon: PawPrint, to: `/organizacoes/${clubId}/admin?tab=pets` },
      { label: 'Candidatos', icon: ClipboardList, to: `/organizacoes/${clubId}/admin?tab=applications` },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ];
  },
  [PERSONA_TYPE.COMMUNITY_STAFF]: (persona) => {
    const communityId = persona.scopeId;
    return [
      { label: 'Painel', icon: Home, to: `/comunidade/${communityId}/admin` },
      { label: 'Mural', icon: MessageCircle, to: `/comunidade/${communityId}?tab=feed` },
      { label: 'Eventos', icon: Calendar, to: `/comunidade/${communityId}?tab=events` },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ];
  },
  [PERSONA_TYPE.VOLUNTEER]: (persona) => {
    const clubId = persona.scopeId;
    return [
      { label: 'Início', icon: Home, to: '/perfil/voluntario' },
      { label: 'Escalas', icon: Calendar, to: '/perfil/voluntario#shifts' },
      { label: 'Tarefas', icon: ClipboardList, to: '/perfil/voluntario#tasks' },
      { label: 'Mural', icon: MessageCircle, to: clubId ? `/organizacoes/${clubId}?tab=feed` : '/feed' },
      { label: 'Perfil', icon: User, to: '/perfil' },
    ];
  },
  [PERSONA_TYPE.PLATFORM_ADMIN]: [
    { label: 'Admin', icon: Shield, to: '/admin' },
    { label: 'Feed', icon: PawPrint, to: '/feed' },
    { label: 'ONGs', icon: Building2, to: '/organizacoes' },
    { label: 'Comunidades', icon: Users, to: '/comunidade' },
    { label: 'Saúde', icon: Stethoscope, to: '/admin/saude', center: true },
    { label: 'Perfil', icon: User, to: '/perfil' },
  ],
};

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

  // Items por persona
  const items = React.useMemo(() => {
    const config = BOTTOM_TABS_BY_PERSONA[active.type];
    if (typeof config === 'function') return config(active);
    return config || [];
  }, [active]);

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
