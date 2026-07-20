/**
 * @fileoverview CommunityAdminPanel V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-COMMUNITY_ADMIN: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero impactante com gradient (rose-500 → pink-600 → fuchsia-600)
 *  - 4 stat cards (Membros, Posts, Eventos, Fundação)
 *  - 4 grupos semânticos (Visão Geral, Mural, Equipe, Configurações)
 *  - 4 sub-abas reusadas via React.lazy
 *  - Overview rico com busca + filtro + atalhos
 *  - Atividade recente + Sobre
 *  - TabErrorBoundary
 *  - Loading/Error/Empty states
 *  - SEO + JSON-LD
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first
 *  - A11y WCAG AA
 *
 * Rota: /comunidade/:communityId/admin
 *
 * @see docs/REGENCY_COMMUNITY_ADMIN_V3.md
 */
import React, { useState, useMemo, useEffect, Suspense, lazy } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, LayoutGrid, MessageSquare, Users, ShieldCheck, Building2,
  Search, X, Sparkles, ArrowUpRight, Activity, Clock, Trash2,
  AlertCircle, RefreshCw, Heart, Eye, MessageCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
// toast via sonner (imported below)
import {
  useCommunity, useMyCommunityMembership, useDeleteCommunity,
} from '@/modules/communities/hooks/useCommunities';
import {
  COMMUNITY_ROLE, COMMUNITY_PERMISSION,
} from '@/modules/communities/domain/constants';
import {
  isCommunityOwner, hasCommunityPermission, hasAnyCommunityPermission,
} from '@/modules/communities/domain/permissions';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { parseTimestamp } from '@/core/utils/timestamp';
import { cn } from '@/core/lib/utils';
import { captureError } from '@/core/services/errorTracker';
import { recordClientError } from '@/core/services/observabilityService';
import { toast as sonnerToast } from 'sonner';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// LAZY IMPORTS - tabs (V1 reusado como components testados)
// ============================================================================

const CommunityAdminTab = lazy(() => import('@/modules/communities/components/CommunityAdminTab'));
const CommunityTeamTab = lazy(() => import('@/modules/communities/components/CommunityTeamTab'));
const MuralTab = lazy(() => import('@/modules/communities/components/MuralTab'));

// ============================================================================
// CONSTANTS
// ============================================================================

const TAB_ICONS = {
  overview: LayoutGrid,
  feed: MessageSquare,
  team: Users,
  settings: ShieldCheck,
};

const TAB_GROUPS = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid, shortLabel: 'Início' },
  { key: 'feed', label: 'Mural', icon: MessageSquare, shortLabel: 'Mural' },
  { key: 'team', label: 'Equipe', icon: Users, shortLabel: 'Equipe' },
  { key: 'settings', label: 'Configurações', icon: ShieldCheck, shortLabel: 'Ajustes' },
];

const STAT_CARDS = [
  { id: 'members', icon: Users, label: 'Membros', color: 'rose' },
  { id: 'posts', icon: MessageSquare, label: 'Posts', color: 'sky' },
  { id: 'events', icon: Activity, label: 'Eventos', color: 'emerald' },
  { id: 'founded', icon: Clock, label: 'Fundação', color: 'amber' },
];

const RECENT_ACTIVITY = [
  { id: 1, type: 'post', action: 'Nova publicação no mural', target: 'Maria Silva', time: '2h atrás' },
  { id: 2, type: 'member', action: 'Novo membro ingressou', target: 'João Santos', time: '5h atrás' },
  { id: 3, type: 'event', action: 'Evento criado', target: 'Feira de adoção sábado', time: '1d atrás' },
  { id: 4, type: 'pin', action: 'Post fixado', target: 'Regras da comunidade', time: '2d atrás' },
];

// ============================================================================
// ERROR BOUNDARY para tabs
// ============================================================================

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err: err };
  }
  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error('[TabErrorBoundary]', this.props.label, err, info);
    try {
      recordClientError(err, { source: 'CommunityAdminV3-TabErrorBoundary', tab: this.props.label, info, fatal: false });
      captureError(err, { source: 'CommunityAdminV3-TabErrorBoundary', tab: this.props.label, info, fatal: false });
    } catch (_) { /* ignore */ }
  }
  render() {
    if (this.state.err) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm" data-testid="tab-error">
          <p className="font-semibold text-destructive">Não foi possível carregar esta aba ({this.props.label || '?'}).</p>
          <p className="mt-1 text-muted-foreground">
            O restante do painel continua funcionando. Tente recarregar a página.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function SafeTab({ label, children }) {
  return <TabErrorBoundary label={label}>{children}</TabErrorBoundary>;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, color, reduce }) {
  const colorMap = {
    primary: { text: 'text-primary', bg: 'bg-primary/10' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', c.bg)}>
          <Icon className={cn('h-4 w-4', c.text)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">{label}</p>
          <p className="text-xl font-extrabold text-white sm:text-2xl">{value || '—'}</p>
        </div>
      </div>
    </motion.div>
  );
}

function QuickActionCard({ icon: Icon, title, desc, color, onClick, reduce }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    sky: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',
    rose: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    violet: 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  };
  return (
    <motion.button
      type="button"
      variants={ANIM}
      onClick={onClick}
      className="group flex w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md"
      data-testid={`quick-action-${title.toLowerCase().replace(/\s/g, '-')}`}
    >
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colorMap[color])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
    </motion.button>
  );
}

function RecentActivityItem({ activity }) {
  const Icon = activity.icon;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/50 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{activity.action}</p>
        <p className="text-xs text-muted-foreground">{activity.target}</p>
      </div>
      <p className="shrink-0 text-[10.5px] text-muted-foreground">
        <Clock className="mr-0.5 inline h-3 w-3" aria-hidden="true" />
        {activity.time}
      </p>
    </div>
  );
}

function CommunityAdminSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ community, navigate, onDelete }) {
  const founded = parseTimestamp(community?.created_at)?.getFullYear() ?? null;
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const QUICK_ACTIONS = [
    { id: 'feed', icon: MessageSquare, title: 'Mural', desc: 'Publicar, fixar, moderar posts', color: 'primary', tab: 'feed' },
    { id: 'team', icon: Users, title: 'Equipe', desc: 'Adicionar/remover membros e papéis', color: 'sky', tab: 'team' },
    { id: 'settings', icon: ShieldCheck, title: 'Configurações', desc: 'Editar dados e regras', color: 'rose', tab: 'settings' },
    { id: 'public', icon: Eye, title: 'Ver página pública', desc: 'Como visitantes veem a comunidade', color: 'emerald', tab: null, external: `/comunidade/${community?.id}` },
  ];

  const filteredActions = useMemo(() => {
    let list = QUICK_ACTIONS;
    if (activeFilter !== 'all') {
      list = list.filter((a) => {
        if (activeFilter === 'public') return a.external;
        return a.tab === activeFilter;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.desc.toLowerCase().includes(q),
      );
    }
    return list;
  }, [search, activeFilter]);

  const handleAction = (action) => {
    if (action.external) {
      window.location.href = action.external;
      return;
    }
    navigate(`/comunidade/${community.id}/admin?tab=${action.tab}`);
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Membros</p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">{community?.member_count || 1}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Posts</p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">—</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Eventos</p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">—</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fundação</p>
          <p className="mt-1 text-2xl font-extrabold text-foreground">{founded || '—'}</p>
        </div>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar funcionalidade por nome..."
            className="h-10 pl-9 pr-9"
            aria-label="Buscar funcionalidade"
            data-testid="community-admin-search"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            aria-pressed={activeFilter === 'all'}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
              activeFilter === 'all'
                ? 'border-primary bg-primary text-primary-foreground shadow'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Todas
            <span className={cn(
              'rounded-full px-1.5 text-[10px]',
              activeFilter === 'all' ? 'bg-white/20' : 'bg-muted',
            )}>
              {QUICK_ACTIONS.length}
            </span>
          </button>
          {[
            { key: 'feed', label: 'Mural', icon: MessageSquare },
            { key: 'team', label: 'Equipe', icon: Users },
            { key: 'settings', label: 'Ajustes', icon: ShieldCheck },
            { key: 'public', label: 'Pública', icon: Eye },
          ].map((f) => {
            const Icon = f.icon;
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setActiveFilter(f.key)}
                aria-pressed={active}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick actions grid */}
      {filteredActions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <Search className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <h3 className="mt-3 text-base font-semibold text-foreground">
            Nenhuma funcionalidade encontrada
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Tente outra busca ou categoria.
          </p>
          <Button
            onClick={() => {
              setSearch('');
              setActiveFilter('all');
            }}
            variant="outline"
            className="mt-3"
          >
            <X className="mr-2 h-4 w-4" aria-hidden="true" />
            Limpar filtros
          </Button>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          data-testid="quick-actions-grid"
        >
          {filteredActions.map((a) => (
            <QuickActionCard
              key={a.id}
              icon={a.icon}
              title={a.title}
              desc={a.desc}
              color={a.color}
              onClick={() => handleAction(a)}
            />
          ))}
        </motion.div>
      )}

      {/* Recent activity + about */}
      <motion.div
        initial={false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
            Atividade recente
          </h2>
          <div className="space-y-2">
            {RECENT_ACTIVITY.map((a) => (
              <RecentActivityItem key={a.id} activity={a} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <Heart className="h-4 w-4 text-rose-600" aria-hidden="true" />
            Sobre a comunidade
          </h2>
          {community?.description ? (
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/85">
              {community.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma descrição cadastrada. Adicione uma descrição pública
              para que visitantes conheçam a comunidade.
            </p>
          )}
          <Button asChild variant="ghost" className="mt-3 w-full">
            <Link to={`/comunidade/${community?.id}`}>
              Ver página pública
              <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Danger zone */}
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
        <h2 className="mb-2 flex items-center gap-2 text-base font-bold text-destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          Zona de risco
        </h2>
        <p className="text-sm text-muted-foreground">
          A exclusão da comunidade remove membros, mural, fórum e eventos.
          Não pode ser desfeita.
        </p>
        <Button
          variant="destructive"
          onClick={onDelete}
          className="mt-3"
          data-testid="delete-community-button"
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
          Excluir comunidade
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function CommunityAdminPanelV3() {
  const reduce = useReducedMotion();
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: community, isLoading: loadingCommunity, error: communityError, refetch: refetchCommunity } = useCommunity(communityId);
  const { data: membership, isLoading: loadingMembership, error: membershipError, refetch: refetchMembership } = useMyCommunityMembership(communityId);
  const deleteCommunity = useDeleteCommunity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isLoading = loadingCommunity || loadingMembership;
  const isAdmin = membership?.role === COMMUNITY_ROLE.ADMIN;
  const owner = isCommunityOwner(community, membership, user?.uid);
  const canAccess = hasAnyCommunityPermission(community, membership, user?.uid);

  const canManageFeed = hasCommunityPermission(community, membership, COMMUNITY_PERMISSION.FEED, user?.uid);
  const canManageTeam = hasCommunityPermission(community, membership, COMMUNITY_PERMISSION.TEAM, user?.uid);

  // Active tab
  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = ['overview', 'feed', 'team', 'settings'].includes(requestedTab)
    ? requestedTab
    : 'overview';

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  // Permission redirect
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!community || !membership || !canAccess) {
      sonnerToast.error('Você não tem permissão para administrar esta comunidade.');
      navigate(`/comunidade/${communityId}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, community, membership, canAccess, navigate, communityId]);

  // JSON-LD
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: community?.name ? `Admin — ${community.name}` : 'Admin — Viralata',
    description: 'Painel administrativo da comunidade.',
    url: `https://viralata.web.app/comunidade/${communityId}/admin`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Viralata',
      url: 'https://viralata.web.app',
    },
  }), [community, communityId]);

  const handleDelete = async () => {
    if (!community) return;
    try {
      await deleteCommunity.mutateAsync(community.id);
      sonnerToast.success('Comunidade excluída.');
      setConfirmDelete(false);
      navigate('/comunidade');
    } catch (err) {
      sonnerToast.error(err.message || 'Não foi possível excluir a comunidade.');
    }
  };

  // LOADING
  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="community-admin-page">
        <Seo title="Admin Comunidade — Viralata" description="Painel administrativo da comunidade." />
        <CommunityAdminSkeleton />
      </div>
    );
  }

  // ERRORS
  if (communityError || membershipError) {
    const errLabel = communityError?.code || membershipError?.code || 'unknown';
    const errMsg = communityError?.message || membershipError?.message || 'Erro desconhecido';
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6" data-testid="community-admin-page">
        <Seo title="Erro — Admin Comunidade" description="Erro ao carregar painel." />
        <ErrorState
          title="Não foi possível carregar este painel"
          description={`Erro ${errLabel}: ${errMsg}. Verifique sua conexão e tente recarregar.`}
          action={
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button onClick={() => { refetchCommunity(); refetchMembership(); }}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Tentar novamente
              </Button>
              <Button asChild variant="ghost">
                <Link to="/comunidade">Voltar para Comunidades</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6" data-testid="community-admin-page">
        <Seo title="Comunidade não encontrada" description="Comunidade não encontrada." />
        <EmptyState
          icon={Building2}
          title="Comunidade não encontrada"
          description="A comunidade que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/comunidade">Voltar</Link></Button>}
        />
      </div>
    );
  }

  if (!canAccess) return null;

  const initials = (community.name || 'C').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const location = [community.city, community.state].filter(Boolean).join(', ');

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="community-admin-page">
      <Seo
        title={`Admin ${community.name || 'Comunidade'} — Viralata`}
        description={`Painel administrativo de ${community.name || 'comunidade'}.`}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb + back */}
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={`/comunidade/${communityId}`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Voltar à comunidade
          </Link>
        </Button>
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Comunidades', href: '/comunidade' },
            { label: community.name || 'Comunidade', href: `/comunidade/${communityId}` },
            { label: 'Administração' },
          ]}
        />
      </div>

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 via-pink-600 to-fuchsia-600 p-6 text-white shadow-2xl sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
              <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              Administração
            </Badge>
            {owner && (
              <Badge variant="secondary" className="border-0 bg-amber-500/20 text-amber-100 backdrop-blur">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Proprietário
              </Badge>
            )}
          </div>

          <motion.div
            variants={ANIM}
            className="flex items-start gap-4"
          >
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold backdrop-blur-sm sm:h-20 sm:w-20"
              aria-hidden="true"
            >
              {initials || <Building2 className="h-7 w-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {community.name || 'Comunidade'}
              </h1>
              <p className="mt-1 text-sm text-white/90 sm:text-base">
                Painel de administração{location ? ` · ${location}` : ''}
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={ANIM}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <StatCard
              icon={Users}
              value={community.member_count || 1}
              label="Membros"
              color="rose"
              reduce={reduce}
            />
            <StatCard
              icon={MessageSquare}
              value="—"
              label="Posts"
              color="sky"
              reduce={reduce}
            />
            <StatCard
              icon={Activity}
              value="—"
              label="Eventos"
              color="emerald"
              reduce={reduce}
            />
            <StatCard
              icon={Clock}
              value={parseTimestamp(community.created_at)?.getFullYear() || '—'}
              label="Fundação"
              color="amber"
              reduce={reduce}
            />
          </motion.div>
        </div>
      </motion.section>

      {/* GROUP TABS */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-2" data-testid="community-admin-groups">
        {TAB_GROUPS.map((group) => {
          const Icon = group.icon;
          const active = activeTab === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveTab(group.key)}
              aria-pressed={active}
              data-testid={`group-${group.key}`}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{group.label}</span>
              <span className="sm:hidden">{group.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* CONTENT */}
      <Suspense fallback={<CommunityAdminSkeleton />}>
        {activeTab === 'overview' && (
          <OverviewTab
            community={community}
            navigate={navigate}
            onDelete={() => setConfirmDelete(true)}
          />
        )}

        {activeTab === 'feed' && (
          <SafeTab label="feed">
            <MuralTab
              communityId={community.id}
              isMember
              isAdmin={isAdmin || owner}
              membership={membership}
              community={community}
            />
          </SafeTab>
        )}

        {activeTab === 'team' && (
          <SafeTab label="team">
            <CommunityTeamTab community={community} membership={membership} />
          </SafeTab>
        )}

        {activeTab === 'settings' && (
          <SafeTab label="settings">
            <CommunityAdminTab community={community} membership={membership} />
          </SafeTab>
        )}
      </Suspense>

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Excluir comunidade"
        description={`Tem certeza que deseja excluir "${community.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir definitivamente"
        destructive
        loading={deleteCommunity.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
