import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  PawPrint, Heart, Building2, MessageCircle, Bell, User, Menu, X,
  Plus, Shield, AlertTriangle, LogOut, Home, Radar,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useNotifications } from '@/modules/notifications/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/core/lib/utils';

const STANDALONE_PAGES = ['Home', 'Login', 'OnboardingQuestionnaire'];

const NAV_ITEMS = [
  { label: 'Feed', icon: PawPrint, to: '/feed' },
  { label: 'Organizações', icon: Building2, to: '/organizacoes' },
  { label: 'Chat', icon: MessageCircle, to: '/chat', auth: true },
  { label: 'Meus Pets', icon: Heart, to: '/meus-pets', auth: true },
];

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, isAuthenticated, isPlatformAdmin, signOut } = useAuth();
  const { data: notifications = [] } = useNotifications(user?.uid);
  const [mobileOpen, setMobileOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-orange-500 flex-shrink-0">
            <span className="text-xl">🐾</span>
            <span className="hidden sm:inline">Viralata</span>
          </Link>

          {/* Nav Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.filter((item) => !item.auth || isAuthenticated).map(({ label, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  location.pathname.startsWith(to)
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-100'
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
                {/* Cadastrar Pet */}
                <Button asChild size="sm" className="hidden sm:flex bg-orange-500 hover:bg-orange-600 text-white">
                  <Link to="/pets/new"><Plus className="w-3.5 h-3.5 mr-1" />Pet</Link>
                </Button>

                {/* Notificações */}
                <Button asChild variant="ghost" size="icon" className="relative">
                  <Link to="/perfil#notificacoes">
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </Button>

                {/* Avatar / Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={photoURL} />
                        <AvatarFallback className="bg-orange-100 text-orange-700 text-xs font-bold">{initials}</AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-xs text-gray-400 truncate">{user?.email}</p>
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
                      <Link to="/denuncias/nova" className="flex items-center gap-2 cursor-pointer text-red-600">
                        <AlertTriangle className="w-4 h-4" /> Fazer Denúncia
                      </Link>
                    </DropdownMenuItem>
                    {isPlatformAdmin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-purple-600">
                            <Shield className="w-4 h-4" /> Admin
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="flex items-center gap-2 cursor-pointer text-red-600">
                      <LogOut className="w-4 h-4" /> Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
                <Link to="/login">Entrar</Link>
              </Button>
            )}

            {/* Mobile menu toggle */}
            <button className="md:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setMobileOpen((v) => !v)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {NAV_ITEMS.filter((item) => !item.auth || isAuthenticated).map(({ label, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname.startsWith(to)
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {isAuthenticated && (
              <Link
                to="/pets/new"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-orange-600 hover:bg-orange-50"
              >
                <Plus className="w-4 h-4" /> Cadastrar Pet
              </Link>
            )}
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
