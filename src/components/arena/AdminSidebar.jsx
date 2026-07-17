import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/core/lib/utils';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Compass,
  Users2,
  Megaphone,
  Receipt,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Home,
} from 'lucide-react';

/**
 * AdminSidebar — barra lateral de navegação para painéis admin.
 *
 * Renderiza os grupos de tabs do admin (Visão Geral, Operacional, Pessoas,
 * Engajamento, Financeiro, Configurações) como links de navegação com ícone.
 *
 * @param {Object} props
 * @param {string} props.orgId - ID da organização/comunidade
 * @param {'club'|'community'} props.type - tipo de entidade
 * @param {string} [props.activeGroup] - grupo ativo (key do TAB_GROUPS)
 * @param {Function} [props.onGroupChange] - callback ao mudar grupo
 * @param {boolean} [props.collapsed=false] - modo colapsado
 * @param {Function} [props.onToggleCollapse] - toggle collapse
 *
 * Uso:
 *   <AdminSidebar orgId={orgId} type="club" activeGroup={activeGroupKey} />
 */
export function AdminSidebar({
  orgId,
  type = 'club',
  activeGroup,
  onGroupChange,
  collapsed = false,
  onToggleCollapse,
}) {
  const location = useLocation();

  const groups = type === 'club' ? CLUB_ADMIN_GROUPS : COMMUNITY_ADMIN_GROUPS;
  const basePath = type === 'club' ? `/organizacoes/${orgId}/admin` : `/comunidade/${orgId}/admin`;

  return (
    <aside
      className={cn(
        'flex flex-col gap-1 rounded-2xl border border-border bg-card p-3 transition-all duration-300',
        collapsed ? 'w-16 items-center' : 'w-56'
      )}
    >
      {/* Toggle button */}
      {onToggleCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="mb-2 self-end text-muted-foreground hover:text-foreground"
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      )}

      {/* Home link */}
      <NavItem
        href="/"
        icon={Home}
        label="Início"
        collapsed={collapsed}
        active={location.pathname === '/'}
      />

      {/* Group links */}
      {groups.map((group) => {
        const isActive = activeGroup === group.key;
        return (
          <NavItem
            key={group.key}
            href={`${basePath}?tab=${group.key}:${group.defaultSub || group.key}`}
            icon={group.icon}
            label={group.label}
            collapsed={collapsed}
            active={isActive}
            onClick={() => onGroupChange?.(group.key)}
          />
        );
      })}

      {/* Footer: org link */}
      {!collapsed && (
        <div className="mt-auto pt-3 border-t border-border">
          <Link
            to={type === 'club' ? `/organizacoes/${orgId}` : `/comunidade/${orgId}`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LayoutGrid className="h-4 w-4 flex-shrink-0" />
            <span>Ver {type === 'club' ? 'ONG' : 'Comunidade'}</span>
          </Link>
        </div>
      )}
    </aside>
  );
}

function NavItem({ href, icon: Icon, label, active, collapsed, onClick }) {
  const base = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
  const activeClass = active
    ? 'bg-primary/10 text-primary'
    : 'text-muted-foreground hover:bg-muted hover:text-foreground';

  return (
    <Link
      to={href}
      onClick={onClick}
      className={cn(base, activeClass, collapsed ? 'justify-center px-0' : '')}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

const CLUB_ADMIN_GROUPS = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid, defaultSub: 'overview' },
  { key: 'operational', label: 'Operacional', icon: Compass, defaultSub: 'animals' },
  { key: 'people', label: 'Pessoas', icon: Users2, defaultSub: 'team' },
  { key: 'engagement', label: 'Engajamento', icon: Megaphone, defaultSub: 'feed' },
  { key: 'finance', label: 'Financeiro', icon: Receipt, defaultSub: 'donations' },
  { key: 'settings', label: 'Configurações', icon: SettingsIcon, defaultSub: 'settings' },
];

const COMMUNITY_ADMIN_GROUPS = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid, defaultSub: 'overview' },
  { key: 'team', label: 'Equipe', icon: Users2, defaultSub: 'team' },
  { key: 'mural', label: 'Mural', icon: Megaphone, defaultSub: 'mural' },
  { key: 'events', label: 'Eventos', icon: Megaphone, defaultSub: 'events' },
  { key: 'settings', label: 'Configurações', icon: SettingsIcon, defaultSub: 'settings' },
];
