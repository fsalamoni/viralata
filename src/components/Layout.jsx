import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  PawPrint, Heart, Building2, MessageCircle, User, Menu, X,
  Plus, Shield, ShieldCheck, AlertTriangle, LogOut, Radar, Users
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import NotificationsMenu from '@/modules/notifications/components/NotificationsMenu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/core/lib/utils';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';

const STANDALONE_PAGES = ['Home', 'Login', 'OnboardingQuestionnaire'];

// Pill nav central do header desktop — só os 4 destinos do protótipo
// (Feed / Organizações / Comunidade / Chat). "Meus Pets" mora só no menu do
// avatar, como especificado no handoff.
const NAV_ITEMS = [
  { label: 'Feed', icon: PawPrint, to: '/feed' },
  { label: 'Organizações', icon: Building2, to: '/organizacoes', auth: true },
  { label: 'Comunidade', icon: Users, to: '/comunidade' },
  { label: 'Chat', icon: MessageCircle, to: '/chat', auth: true },
];

// Menu mobile (hambúrguer) reaproveita o pill nav e soma os atalhos que no
// desktop vivem só no menu do avatar, já que o mobile não tem esse menu.
const MOBILE_MENU_EXTRA_ITEMS = [
  { label: 'Meus Pets', icon: Heart, to: '/meus-pets', auth: true },
];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, isAuthenticated, isPlatformAdmin, signOut } = useAuth();
  const { settings } = usePlatformSettings();
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
            <button className="md:hidden p-1.5 rounded-full hover:bg-secondary/70" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-border/70 bg-background/95 backdrop-blur-xl px-4 py-3 space-y-1 safe-px">
            {[...NAV_ITEMS, ...MOBILE_MENU_EXTRA_ITEMS].filter((item) => !item.auth || isAuthenticated).map(({ label, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-colors',
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

      {/* Main */}
      <main className={cn('flex-1 relative', isAuthenticated && 'pb-20 md:pb-0')}>
        {children}
      </main>

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
    </div>
  );
}
