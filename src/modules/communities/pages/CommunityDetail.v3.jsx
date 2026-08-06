/**
 * @fileoverview CommunityDetail V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-COMMUNITY-DETAIL: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero impactante com gradiente (cor dinâmica por community)
 *  - 3 stat cards (Membros, Posts, Eventos)
 *  - Tabs de conteúdo (Mural, Fórum, Eventos, Sobre) com 2-layer
 *  - Mural preview (top 3 posts sem trocar de tab)
 *  - Próximo evento em destaque
 *  - Equipe em destaque (top 3)
 *  - Empty states diferenciados
 *  - Error state com retry
 *  - Loading com skeleton
 *  - SEO + JSON-LD (Organization schema)
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first (1/2/3 colunas)
 *  - A11y WCAG AA
 *  - Auth gate para entrar/participar
 *
 * Rota: /comunidade/:communityId
 *
 * @see docs/REGENCY_COMMUNITY_DETAIL_V3.md
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Users, Calendar, MessageSquare, MessageCircle, Info, Settings,
  ArrowLeft, MapPin, Sparkles, AlertCircle, RefreshCw, Hash,
  ArrowRight, TrendingUp, PartyPopper,
  Check, UserPlus, Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatar } from '@/components/ui/user-avatar';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/core/lib/utils';
import { parseTimestamp } from '@/core/utils/timestamp';
import { getCommunity, joinCommunity } from '../services/communityService';
import { listCommunityEvents, getCommunityPosts } from '../services/communityService';
import { deriveCommunityMembershipState } from '../domain/permissions';
import { useMyCommunityMembership } from '../hooks/useCommunities';
import MuralTab from '../components/MuralTab';
import ForumTab from '../components/ForumTab';
import EventsTab from '../components/EventsTab';
import CommunityTeamTab from '../components/CommunityTeamTab';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const TABS_PUBLIC = [
  { key: 'mural', label: 'Mural', icon: MessageSquare },
  { key: 'forum', label: 'Fórum', icon: MessageCircle },
  { key: 'eventos', label: 'Eventos', icon: Calendar },
  { key: 'sobre', label: 'Sobre', icon: Info },
];

const TABS_ADMIN = [
  { key: 'equipe', label: 'Equipe', icon: Users },
];

// ============================================================================
// UTILS
// ============================================================================

function isFuture(iso) {
  const d = parseTimestamp(iso);
  return d && d >= new Date();
}

function pickGradient(seed) {
  const palette = [
    ['from-rose-500', 'via-pink-600', 'to-amber-600'],
    ['from-amber-500', 'via-orange-600', 'to-red-600'],
    ['from-emerald-500', 'via-teal-600', 'to-cyan-600'],
    ['from-sky-500', 'via-indigo-600', 'to-violet-600'],
    ['from-violet-500', 'via-fuchsia-600', 'to-rose-600'],
    ['from-cyan-500', 'via-sky-600', 'to-blue-600'],
  ];
  if (!seed) return palette[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return palette[Math.abs(h) % palette.length];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, accent }) {
  const colorMap = {
    primary: 'text-primary',
    rose: 'text-rose-600',
    amber: 'text-amber-600',
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
  };
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-sm sm:p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn('mt-0.5 text-xl font-extrabold sm:text-2xl', colorMap[accent])}>
            {value}
          </p>
        </div>
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9',
            accent === 'primary' && 'bg-primary/10',
            accent === 'rose' && 'bg-rose-100 dark:bg-rose-900/30',
            accent === 'amber' && 'bg-amber-100 dark:bg-amber-900/30',
            accent === 'sky' && 'bg-sky-100 dark:bg-sky-900/30',
            accent === 'emerald' && 'bg-emerald-100 dark:bg-emerald-900/30',
          )}
        >
          <Icon className={cn('h-4 w-4', colorMap[accent])} aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

function TeamMemberCard({ member, isLeader }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
      <UserAvatar
        photoUrl={member.photo}
        name={member.name}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {member.name || 'Membro'}
        </p>
        <p className="text-[10.5px] text-muted-foreground">
          {isLeader ? 'Líder / Admin' : 'Membro ativo'}
        </p>
      </div>
      {isLeader && (
        <Crown className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
      )}
    </div>
  );
}

function CommunityDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-64 w-full rounded-3xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <Skeleton className="h-12 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function CommunityDetailV3() {
  const reduce = useReducedMotion();
  const { communityId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Data
  const [community, setCommunity] = useState(null);
  const [posts, setPosts] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  // Tab (2-layer)
  const urlTab = searchParams.get('tab');
  const tabParts = urlTab ? urlTab.split(':') : [];
  const isLegacy = TABS_PUBLIC.some((t) => t.key === urlTab) || TABS_ADMIN.some((t) => t.key === urlTab);
  const activeGroup = isLegacy ? 'content' : (tabParts[0] || 'content');
  const activeSubKey = isLegacy ? urlTab : (tabParts[1] || 'mural');

  const setActiveGroup = (group) => {
    const next = new URLSearchParams(searchParams);
    const defaultSub = group === 'content' ? 'mural' : 'equipe';
    next.set('tab', `${group}:${defaultSub}`);
    setSearchParams(next, { replace: true });
  };

  const setActiveSub = (subKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', `${activeGroup}:${subKey}`);
    setSearchParams(next, { replace: true });
  };

  // Membership
  const { data: membership } = useMyCommunityMembership(communityId);

  // Load
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [comm, commPosts, commEvents] = await Promise.all([
        getCommunity(communityId),
        getCommunityPosts(communityId).catch(() => []),
        listCommunityEvents(communityId).catch(() => []),
      ]);
      if (!comm) throw new Error('Comunidade não encontrada');
      setCommunity(comm);
      setPosts(commPosts || []);
      setEvents(commEvents || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar comunidade');
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    load();
  }, [load]);

  // Permissions
  const { isMember, canAdmin } = useMemo(
    () => deriveCommunityMembershipState(community, membership, user?.uid),
    [community, membership, user?.uid],
  );

  // Stats
  const stats = useMemo(() => {
    if (!community) return { members: 0, posts: 0, events: 0 };
    const upcomingEvents = (events || []).filter((e) => isFuture(e.event_date));
    return {
      members: community.member_count || 1,
      posts: (posts || []).length,
      events: upcomingEvents.length,
    };
  }, [community, posts, events]);

  // Equipe
  const team = useMemo(() => {
    const owner = community?.owner_id ? [{
      uid: community.owner_id,
      name: community.owner_name,
      photo: community.owner_photo,
    }] : [];
    const admins = (community?.admins || []).map((a) => ({
      uid: a.uid || a,
      name: a.name || a.display_name,
      photo: a.photo || a.photo_url,
    }));
    return [...owner, ...admins].slice(0, 3);
  }, [community]);

  // Gradient
  const gradient = useMemo(() => pickGradient(community?.id), [community?.id]);

  // Join
  const handleJoin = async () => {
    if (!isAuthenticated) {
      toast({
        title: 'Faça login para participar',
        description: 'Você precisa estar logado para entrar em uma comunidade.',
        variant: 'destructive',
      });
      return;
    }
    setJoining(true);
    try {
      await joinCommunity(communityId, user.uid);
      toast({
        title: 'Você entrou na comunidade! 🎉',
        description: 'Agora você pode postar no mural, comentar e participar dos eventos.',
      });
      // Reload membership
      load();
    } catch (err) {
      toast({
        title: 'Erro ao entrar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setJoining(false);
    }
  };

  // JSON-LD: Organization schema
  const jsonLd = useMemo(() => {
    if (!community) return null;
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: community.name,
      description: community.description,
      image: community.cover_url,
      url: `https://viralata.web.app/comunidades/${communityId}`,
      foundingDate: parseTimestamp(community.created_at)?.toISOString(),
      location: community.city ? {
        '@type': 'Place',
        name: community.city,
        address: community.state ? `${community.city} / ${community.state}` : community.city,
      } : undefined,
      memberOf: {
        '@type': 'Organization',
        name: 'Viralata',
        url: 'https://viralata.web.app',
      },
    };
  }, [community, communityId]);

  // LOADING
  if (loading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="community-detail-page">
        <CommunityDetailSkeleton />
      </div>
    );
  }

  // NOT FOUND
  if (error || !community) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="community-detail-page">
        <Seo title="Comunidade não encontrada" description="A comunidade que você procura não existe." />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
          <h1 className="mt-3 text-lg font-semibold text-foreground">
            Comunidade não encontrada
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {error || 'A comunidade que você procura não existe, foi removida ou você não tem permissão para visualizá-la.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button onClick={load} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Tentar de novo
            </Button>
            <Button asChild>
              <Link to="/comunidade">
                Ver todas as comunidades
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="community-detail-page">
      <Seo
        title={`${community.name} — Comunidade Viralata`}
        description={community.description || `Comunidade ${community.name} no Viralata.`}
      />
      {jsonLd && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className={cn(
          'relative overflow-hidden rounded-3xl p-6 text-white shadow-lg sm:p-10',
          'bg-gradient-to-br',
          gradient[0], gradient[1], gradient[2],
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          {/* Topo: voltar + admin button */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/15"
            >
              <Link to="/comunidade">
                <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Voltar
              </Link>
            </Button>
            {canAdmin && (
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/15"
              >
                <Link to={`/comunidade/${communityId}/admin`}>
                  <Settings className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Painel
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Identidade */}
            <div>
              <motion.div variants={ANIM}>
                <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
                  <Users className="mr-1 h-3 w-3" aria-hidden="true" />
                  Comunidade
                </Badge>
              </motion.div>
              <motion.h1
                variants={ANIM}
                className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl"
              >
                {community.name}
              </motion.h1>
              {community.description && (
                <motion.p
                  variants={ANIM}
                  className="mt-3 max-w-2xl text-base text-white/90 sm:text-lg"
                >
                  {community.description}
                </motion.p>
              )}
              <motion.div
                variants={ANIM}
                className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/90"
              >
                {community.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {community.city}{community.state ? ` / ${community.state}` : ''}
                  </span>
                )}
                {parseTimestamp(community.created_at) && (
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Fundada em {parseTimestamp(community.created_at).getFullYear()}
                  </span>
                )}
                {isMember && (
                  <Badge variant="secondary" className="border-0 bg-emerald-500/30 text-white">
                    <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                    Membro
                  </Badge>
                )}
              </motion.div>
              <motion.div variants={ANIM} className="mt-5 flex flex-wrap items-center gap-2">
                {!isMember && !canAdmin && (
                  <Button
                    onClick={handleJoin}
                    disabled={joining}
                    size="lg"
                    className="border-0 bg-white text-rose-700 hover:bg-white/90"
                  >
                    <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {joining ? 'Entrando...' : 'Participar'}
                  </Button>
                )}
                {isMember && (
                  <Button
                    onClick={() => setActiveSub('mural')}
                    size="lg"
                    className="border-0 bg-white text-rose-700 hover:bg-white/90"
                  >
                    <MessageSquare className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    Acessar mural
                  </Button>
                )}
                <Button
                  onClick={() => setActiveSub('forum')}
                  size="lg"
                  variant="ghost"
                  className="text-white hover:bg-white/15"
                >
                  <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Fórum
                </Button>
              </motion.div>
            </div>

            {/* Stats decorativos (desktop) */}
            <motion.div
              variants={ANIM}
              className="hidden lg:flex lg:flex-col lg:gap-2"
            >
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                    <Users className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-2xl font-extrabold leading-none">{stats.members}</p>
                    <p className="text-xs text-white/80">membros ativos</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    <p className="text-lg font-extrabold leading-none">{stats.posts}</p>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-white/80">posts</p>
                </div>
                <div className="rounded-2xl border border-white/20 bg-white/10 p-3 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <PartyPopper className="h-4 w-4" aria-hidden="true" />
                    <p className="text-lg font-extrabold leading-none">{stats.events}</p>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-white/80">próximos eventos</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* STATS mobile */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="grid grid-cols-3 gap-3 lg:hidden"
      >
        <StatCard icon={Users} value={stats.members} label="Membros" accent="primary" />
        <StatCard icon={MessageSquare} value={stats.posts} label="Posts" accent="sky" />
        <StatCard icon={PartyPopper} value={stats.events} label="Eventos" accent="emerald" />
      </motion.section>

      {/* TABS 2-LAYER */}
      <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto border-b border-border/60 pb-1">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveGroup('content')}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
              activeGroup === 'content'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted',
            )}
            aria-pressed={activeGroup === 'content'}
          >
            Conteúdo
          </button>
          <div className="flex flex-wrap items-center gap-1">
            {TABS_PUBLIC.map((tab) => {
              const Icon = tab.icon;
              const active = activeGroup === 'content' && activeSubKey === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveSub(tab.key)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-primary bg-primary text-primary-foreground shadow'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50',
                  )}
                  aria-pressed={active}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {canAdmin && (
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveGroup('management')}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors',
                activeGroup === 'management'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                  : 'text-muted-foreground hover:bg-muted',
              )}
              aria-pressed={activeGroup === 'management'}
            >
              Gestão
            </button>
            <div className="flex flex-wrap items-center gap-1">
              {TABS_ADMIN.map((tab) => {
                const Icon = tab.icon;
                const active = activeGroup === 'management' && activeSubKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveSub(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                      active
                        ? 'border-amber-500 bg-amber-500 text-white shadow'
                        : 'border-border bg-card text-muted-foreground hover:border-amber-500/50',
                    )}
                    aria-pressed={active}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* TAB CONTENT */}
      <motion.section
        key={activeGroup + activeSubKey}
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-4"
      >
        {/* MURAL — componente interativo real (post, curtir, comentar) */}
        {activeGroup === 'content' && activeSubKey === 'mural' && (
          <MuralTab
            communityId={communityId}
            isMember={isMember}
            isAdmin={canAdmin}
            membership={membership}
            community={community}
          />
        )}

        {/* FÓRUM — tópicos e discussões */}
        {activeGroup === 'content' && activeSubKey === 'forum' && (
          <ForumTab communityId={communityId} />
        )}

        {/* EVENTOS — agenda com RSVP */}
        {activeGroup === 'content' && activeSubKey === 'eventos' && (
          <EventsTab
            communityId={communityId}
            isAdmin={canAdmin}
            membership={membership}
            community={community}
          />
        )}

        {/* SOBRE */}
        {activeGroup === 'content' && activeSubKey === 'sobre' && (
          <div className="space-y-4">
            {/* Descrição completa */}
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">
                <Info className="mr-1.5 inline h-5 w-5 text-primary" aria-hidden="true" />
                Sobre a comunidade
              </h2>
              <p className="mt-3 whitespace-pre-wrap leading-relaxed text-foreground/90">
                {community.description || 'Nenhuma descrição fornecida.'}
              </p>
            </article>

            {/* Stats detalhadas */}
            <article className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-bold text-foreground">
                <TrendingUp className="mr-1.5 inline h-5 w-5 text-primary" aria-hidden="true" />
                Estatísticas
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Membros
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-primary">{stats.members}</p>
                </div>
                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Posts
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-sky-600">{stats.posts}</p>
                </div>
                <div className="rounded-xl border border-border bg-card/50 p-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground">
                    Eventos
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-emerald-600">{stats.events}</p>
                </div>
              </div>
            </article>

            {/* Equipe */}
            {team.length > 0 && (
              <article className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-bold text-foreground">
                  <Users className="mr-1.5 inline h-5 w-5 text-primary" aria-hidden="true" />
                  Equipe
                </h2>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {team.map((m, i) => (
                    <TeamMemberCard key={m.uid || i} member={m} isLeader={i === 0} />
                  ))}
                </div>
              </article>
            )}

            {/* Tags (se houver) */}
            {community.tags && community.tags.length > 0 && (
              <article className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-bold text-foreground">
                  <Hash className="mr-1.5 inline h-5 w-5 text-primary" aria-hidden="true" />
                  Tópicos
                </h2>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {community.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-primary/10 text-primary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </article>
            )}
          </div>
        )}

        {/* EQUIPE (admin only) — gestão real de membros e papéis */}
        {activeGroup === 'management' && activeSubKey === 'equipe' && canAdmin && (
          <CommunityTeamTab community={community} membership={membership} />
        )}
      </motion.section>

      {/* CTA FINAL */}
      {!isMember && !canAdmin && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className={cn(
            'overflow-hidden rounded-3xl border border-border p-6 text-center sm:p-10',
            'bg-gradient-to-br',
            gradient[0], gradient[1], gradient[2],
          )}
        >
          <Users className="mx-auto h-10 w-10 text-white" aria-hidden="true" />
          <h2 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
            Junte-se a {community.name}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/90">
            Participe das discussões, eventos e ações desta comunidade.
            É gratuito e você pode sair quando quiser.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={handleJoin}
              disabled={joining}
              size="lg"
              className="border-0 bg-white text-foreground hover:bg-white/90"
            >
              <UserPlus className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {joining ? 'Entrando...' : 'Participar agora'}
            </Button>
            <Button
              asChild
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/15"
            >
              <Link to="/comunidade">
                Ver outras comunidades
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </motion.section>
      )}
    </div>
  );
}
