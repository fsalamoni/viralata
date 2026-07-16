import React, { useState } from 'react';
import { SkipLink } from '@/components/ui/skip-link';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  PawPrint, Heart, Building2, MessageCircle, Bell, User, Menu, X,
  Plus, Shield, AlertTriangle, LogOut, Radar, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useTheme } from '@/core/lib/ThemeContext';
import { useNotifications } from '@/modules/notifications/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import SwUpdateBanner from '@/components/SwUpdateBanner';
import LegalFooter from '@/components/LegalFooter';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  // Diretório e perfil de ONGs são públicos — o item aparece também deslogado.
  { label: 'Organizações', icon: Building2, to: '/organizacoes' },
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
  const { data: notifications = [] } = useNotifications(user?.uid);
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

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
  const bottomTabItems = [
    { label: 'Feed', icon: PawPrint, to: '/feed' },
    { label: 'ONGs', icon: Building2, to: '/organizacoes' },
    { label: 'Comunidade', icon: Users, to: '/comunidade' },
    { label: settings.ui_labels.mobile_create_pet_cta, icon: Plus, to: '/pets/new', center: true },
    { label: 'Chat', icon: MessageCircle, to: '/chat' },
    { label: 'Perfil', icon: User, to: '/perfil' },
  ];

  return (
    <div className="arena-page min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4 safe-px">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
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
                      <Avatar className="w-8 h-8 ring-2 ring-card">
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
                    {/* TASK-041: Documentos Legais — exigidos pelo Guia de Implementação
                        Legal v2 §5 (links no rodapé E no menu do usuário). Disponíveis
                        para todos os usuários autenticados, mesmo antes de aceitar
                        termos pendentes (via LegalGate). */}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/legal/termos-de-uso" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" /> Termos de Uso
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/legal/politica-de-privacidade" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" /> Política de Privacidade
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/legal/cookies" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" /> Política de Cookies
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/legal/codigo-de-conduta" className="flex items-center gap-2 cursor-pointer">
                        <FileText className="w-4 h-4" /> Código de Conduta
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
          <div className="md:hidden border-t border-border bg-card/90 backdrop-blur-xl px-4 py-3 space-y-1 safe-px">
            {NAV_ITEMS.filter((item) => !item.auth || isAuthenticated).map(({ label, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                aria-current={location.pathname.startsWith(to) ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  location.pathname.startsWith(to)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground/70 hover:bg-secondary/70'
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

      {/* Main */}
      <main id="main-content" className={cn('flex-1 relative', isAuthenticated && 'pb-20 md:pb-0')}>
        {children}
      </main>

      {/* Banner de nova versão disponível — avisa o usuário quando o PWA
          detecta um deploy novo. Sem isso, mobile fica preso no bundle
          antigo mesmo com skipWaiting+clientsClaim. */}
      <SwUpdateBanner />

      {/* Bottom tab bar (mobile, autenticado) */}
      {isAuthenticated && (
        <nav className="safe-pb fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-border bg-card/95 px-2 pt-2 backdrop-blur-xl md:hidden">
          {bottomTabItems.map(({ label, icon: Icon, to, center }) => {
            const active = location.pathname.startsWith(to);
            if (center) {
              return (
                <Link
                  key={to}
                  to={to}
                  className="flex flex-1 flex-col items-center gap-1 pb-1.5"
                  aria-label={label}
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
      )}

      {/* Rodapé com links legais. TASK-051: links exigidos pelo Guia
          de Implementação Legal v2 (10/07/2026) §5. TASK-401: agora
          respeita a preferência do usuário (footerMode: fixed/autohide/hidden)
          e se oculta quando SHELTER_LEGAL_TERMS_V1 está OFF. */}
      <LegalFooter />
    </div>
  );
}
