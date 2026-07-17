import React, { useState, useEffect, useRef } from 'react';
import { SkipLink } from '@/components/ui/skip-link';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  PawPrint, Heart, Building2, MessageCircle, User, Menu, X, BookHeart,
  Plus, Shield, ShieldCheck, AlertTriangle, LogOut, Radar, Users, HeartHandshake,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import NotificationsMenu from '@/modules/notifications/components/NotificationsMenu';
import { Button } from '@/components/ui/button';
import SwUpdateBanner from '@/components/SwUpdateBanner';
import LegalFooter, { useLegalFooterHeight } from '@/components/LegalFooter';
import BottomTabBar, { useBottomTabBarHeight } from '@/components/BottomTabBar';
import { useUiPreferences, BOTTOM_TAB_MODES, TOPBAR_MODES, FOOTER_MODES } from '@/core/hooks/useUiPreferences';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ThemeMenu from '@/components/ThemeMenu';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/core/lib/utils';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';
import { useColorMode } from '@/core/hooks/useColorMode';

const STANDALONE_PAGES = ['Home', 'Login', 'OnboardingQuestionnaire'];

// Pill nav central do header desktop — só os 4 destinos do protótipo
// (Feed / Organizações / Comunidade / Chat). "Meus Pets" mora só no menu do
// avatar, como especificado no handoff.
const NAV_ITEMS = [
  { label: 'Feed', icon: PawPrint, to: '/feed' },
  { label: 'Abrigos', icon: Building2, to: '/organizacoes', auth: true },
  { label: 'Voluntários', icon: HeartHandshake, to: '/voluntarios' },
  { label: 'Comunidade', icon: Users, to: '/comunidade' },
  { label: 'Chat', icon: MessageCircle, to: '/chat', auth: true },
];

// Menu mobile (hambúrguer) reaproveita o pill nav e soma os atalhos que no
// desktop vivem só no menu do avatar, já que o mobile não tem esse menu.
const MOBILE_MENU_EXTRA_ITEMS = [
  { label: 'Meus Pets', icon: Heart, to: '/meus-pets', auth: true },
];

/** Botão de toggle dark/light mode no header — TASK-618 */
function ColorModeToggle() {
  const { isDark, setMode } = useColorMode();
  return (
    <button
      onClick={() => setMode(isDark ? 'light' : 'dark')}
      className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-secondary hover:text-foreground transition-colors"
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={isDark ? 'Modo claro' : 'Modo escuro'}
    >
      {isDark
        ? <Sun className="h-4 w-4" />
        : <Moon className="h-4 w-4" />
      }
    </button>
  );
}

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, isAuthenticated, isPlatformAdmin, signOut } = useAuth();
  const { settings } = usePlatformSettings();
  const [uiPrefs] = useUiPreferences();
  const [mobileOpen, setMobileOpen] = useState(false);

  // V3 (TASK-V3-UI-6): padding-bottom dinâmico = SOMA das alturas reais
  // de BottomTabBar (mobile) + LegalFooter (desktop).
  // Mobile: só BottomTabBar é fixed
  // Desktop: só LegalFooter é fixed (BottomTabBar tem md:hidden)
  // Assim o <main> NUNCA rola por trás de uma barra fixa.
  const bottomTabMode = uiPrefs?.bottomTabBarMode || BOTTOM_TAB_MODES.FIXED;
  const bottomTabHeight = useBottomTabBarHeight(bottomTabMode);
  const footerMode = uiPrefs?.footerMode || FOOTER_MODES.FIXED;
  const footerHeight = useLegalFooterHeight(footerMode);
  const mainPaddingBottom = {
    // Mobile: padding = bottomTabHeight (BottomTabBar)
    // Desktop: padding = footerHeight (LegalFooter)
    // O navegador escolhe via @media (CSS) qual aplicar
    paddingBottom: `max(${bottomTabHeight}px, ${footerHeight}px, 5rem)`,
  };

  // V3 (TASK-V3-UI-5-FIX): topbar respeita topBarMode (FIXED/AUTOHIDE/HIDDEN).
  // FIXED (default) = sempre visível, sticky no topo.
  // AUTOHIDE = aparece com scroll-up, some com scroll-down.
  // HIDDEN = não renderiza.
  const topBarMode = uiPrefs?.topBarMode || TOPBAR_MODES.FIXED;
  const [topBarVisible, setTopBarVisible] = useState(true);
  const lastScrollYForTop = useRef(0);
  useEffect(() => {
    if (topBarMode !== TOPBAR_MODES.AUTOHIDE) {
      setTopBarVisible(true);
      return undefined;
    }
    const handleScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastScrollYForTop.current;
      if (Math.abs(delta) > 4) {
        setTopBarVisible(delta < 0);
      }
      lastScrollYForTop.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [topBarMode]);

  // V3 (TASK-V3-UI-5-FIX): se a topbar está visível, mede a altura dela para
  // aplicar padding-top no <main> (quando FIXED, sempre = altura; quando
  // AUTOHIDE visível, também = altura). Quando hidden ou autohide-sumido,
  // não tem padding-top.
  const topBarRef = useRef(null);
  const [topBarHeight, setTopBarHeight] = useState(64);
  useEffect(() => {
    if (topBarMode === TOPBAR_MODES.HIDDEN) {
      setTopBarHeight(0);
      return undefined;
    }
    const measure = () => {
      const h = topBarRef.current?.offsetHeight || 64;
      setTopBarHeight(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (topBarRef.current) ro.observe(topBarRef.current);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [topBarMode]);
  const mainPaddingTop = topBarMode === TOPBAR_MODES.HIDDEN
    ? {}
    : { paddingTop: topBarVisible ? `${topBarHeight}px` : 0, transition: 'padding-top 200ms ease-out' };

  if (STANDALONE_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  const displayName = userProfile?.full_name || user?.displayName || user?.email || 'Usuário';
  const photoURL = userProfile?.photo_url || user?.photoURL;
  const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="arena-page min-h-screen flex flex-col">
      {/* Header — V3 (TASK-V3-UI-5-FIX): respeita topBarMode.
          FIXED (default) = sticky top-0 sempre visível.
          AUTOHIDE = translate-y-0/[-100%] com scroll up/down.
          HIDDEN = não renderiza. */}
      {topBarMode !== TOPBAR_MODES.HIDDEN && (
        <header
          ref={topBarRef}
          className={cn(
            'sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl',
            topBarMode === TOPBAR_MODES.AUTOHIDE && cn(
              'transition-transform duration-200 ease-out',
              topBarVisible ? 'translate-y-0' : '-translate-y-full',
            ),
          )}
          data-top-bar-mode={topBarMode}
        >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 safe-px">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white shadow-[0_10px_24px_-12px_rgba(64,34,18,0.6)] transition-transform group-hover:-rotate-6">
              <PawPrint className="w-5 h-5" />
            </span>
            <span className="hidden sm:inline arena-heading text-lg font-bold">Viralata</span>
          </Link>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.filter((item) => !item.auth || isAuthenticated).map(({ label, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all',
                  location.pathname.startsWith(to)
                    ? 'bg-primary text-primary-foreground shadow-[0_10px_20px_-12px_rgba(64,34,18,0.55)]'
                    : 'text-foreground/70 hover:bg-secondary/70'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Ações direita */}
          <div className="flex items-center gap-2">
            {/* Dark mode toggle — sempre visível */}
            <ThemeMenu />
            {isAuthenticated ? (
              <>
                {/* Cadastrar Pet — presente no cabeçalho em todas as páginas (item 2) */}
                <Button asChild size="sm">
                  <Link to="/pets/new">{settings.ui_labels.header_create_pet_cta}</Link>
                </Button>

                {/* Notificações */}
                <NotificationsMenu />

                {/* Avatar / Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring">
                      <Avatar className="w-8 h-8 ring-2 ring-white">
                        <AvatarImage src={photoURL} />
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/perfil" className="flex items-center gap-2 cursor-pointer">
                        <User className="w-4 h-4" /> Meu Perfil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/meus-pets" className="flex items-center gap-2 cursor-pointer">
                        <Heart className="w-4 h-4" /> Meus Pets
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/meus-interesses" className="flex items-center gap-2 cursor-pointer">
                        <BookHeart className="w-4 h-4" /> Meus Interesses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/radar" className="flex items-center gap-2 cursor-pointer">
                        <Radar className="w-4 h-4" /> Radar de Pets
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/denuncias/nova" className="flex items-center gap-2 cursor-pointer text-destructive">
                        <AlertTriangle className="w-4 h-4" /> Fazer Denúncia
                      </Link>
                    </DropdownMenuItem>
                    {isPlatformAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-accent">
                            <Shield className="w-4 h-4" /> Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-destructive">
                      <LogOut className="w-4 h-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild size="sm">
                <Link to="/login">Entrar</Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-1.5 rounded-full hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-menu"
              aria-label={mobileOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div
            id="mobile-nav-menu"
            role="navigation"
            aria-label="Menu principal (mobile)"
            className="md:hidden border-t border-border/70 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1 safe-px"
          >
            {[...NAV_ITEMS, ...MOBILE_MENU_EXTRA_ITEMS].filter((item) => !item.auth || isAuthenticated).map(({ label, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                aria-current={location.pathname.startsWith(to) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  location.pathname.startsWith(to)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/80 hover:bg-secondary/70'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </header>
      )}

      {/* Skip link */}
      <SkipLink targetId="main-content" />

      {/* Main — V3 (TASK-V3-UI-4/5): padding-bottom dinâmico = altura da
          BottomTabBar. padding-top dinâmico = altura da topBar (se
          HIDDEN, 0). Isso garante que o conteúdo da página se encerre
          na linha SUPERIOR da barra inferior quando "sempre visível" está
          ativo, sem rolar por trás dela. E o conteúdo começa logo abaixo
          da topbar (que é sticky). */}
      <main
        id="main-content"
        className="flex-1 relative"
        style={{ ...mainPaddingBottom, ...mainPaddingTop }}
      >
        {children}
      </main>

      {/* Banner de nova versão disponível — avisa o usuário quando o PWA
          detecta um deploy novo. Sem isso, mobile fica preso no bundle
          antigo mesmo com skipWaiting+clientsClaim. */}
      <SwUpdateBanner />

      {/* Bottom tab bar (mobile, autenticado) — TASK-V3-UI-4
          Componente dedicado com 3 modos (FIXED/AUTOHIDE/HIDDEN) que
          respeita a preferência visual do usuário em todos os viewports
          (TASK-V3-UI-5-FIX: removido md:hidden para que FIXED apareça
          também em desktop). */}
      <BottomTabBar />

      {/* Rodapé com links legais. TASK-051: links exigidos pelo Guia
          de Implementação Legal v2 (10/07/2026) §5. TASK-401: agora
          respeita a preferência do usuário (footerMode: fixed/autohide/hidden)
          e se oculta quando SHELTER_LEGAL_TERMS_V1 está OFF.
          TASK-V3-UI-6: em DESKTOP, FIXED = `fixed bottom-0` (igual BottomTabBar
          no mobile) para que a barra fique sempre visível na tela. */}
      <LegalFooter />
    </div>
  );
}
