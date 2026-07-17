import React, { useState } from 'react';
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
import LegalFooter from '@/components/LegalFooter';
import BottomTabBar, { useBottomTabBarHeight } from '@/components/BottomTabBar';
import { useUiPreferences, BOTTOM_TAB_MODES } from '@/core/hooks/useUiPreferences';
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

  // V3 (TASK-V3-UI-4): a barra inferior (BottomTabBar) é fixa e ocupa
  // espaço na viewport. Para que o conteúdo do <main> não role por trás
  // dela quando "sempre visível" estiver ativo, aplicamos padding-bottom
  // DINÂMICO igual à altura real da barra (medida via ResizeObserver).
  // Quando bottomTabBarMode === 'hidden' ou não autenticado, height = 0
  // e o main não tem padding extra.
  const bottomTabMode = uiPrefs?.bottomTabBarMode || BOTTOM_TAB_MODES.FIXED;
  const bottomTabHeight = useBottomTabBarHeight(bottomTabMode);
  const mainPaddingBottom = isAuthenticated && bottomTabMode !== BOTTOM_TAB_MODES.HIDDEN
    ? { paddingBottom: `max(${bottomTabHeight}px, 5rem)` }
    : {};

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
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
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

      {/* Skip link */}
      <SkipLink targetId="main-content" />

      {/* Main — V3 (TASK-V3-UI-4): padding-bottom dinâmico = altura da
          BottomTabBar. Isso garante que o conteúdo da página se encerre
          na linha SUPERIOR da barra inferior quando "sempre visível" está
          ativo, sem rolar por trás dela. Em desktop (md+) ou quando a
          barra está oculta, padding é 0. */}
      <main
        id="main-content"
        className="flex-1 relative"
        style={mainPaddingBottom}
      >
        {children}
      </main>

      {/* Banner de nova versão disponível — avisa o usuário quando o PWA
          detecta um deploy novo. Sem isso, mobile fica preso no bundle
          antigo mesmo com skipWaiting+clientsClaim. */}
      <SwUpdateBanner />

      {/* Bottom tab bar (mobile, autenticado) — TASK-V3-UI-4
          Componente dedicado com 3 modos (FIXED/AUTOHIDE/HIDDEN) que
          respeita a preferência visual do usuário. */}
      <BottomTabBar />

      {/* Rodapé com links legais. TASK-051: links exigidos pelo Guia
          de Implementação Legal v2 (10/07/2026) §5. TASK-401: agora
          respeita a preferência do usuário (footerMode: fixed/autohide/hidden)
          e se oculta quando SHELTER_LEGAL_TERMS_V1 está OFF. */}
      <LegalFooter />
    </div>
  );
}
