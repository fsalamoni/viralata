import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, LayoutGrid, MessageSquare, Users, ShieldCheck, Building2, Calendar, Edit
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/core/lib/utils';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useCommunity, useMyCommunityMembership } from '@/modules/communities/hooks/useCommunities';
import { COMMUNITY_ROLE, COMMUNITY_PERMISSION } from '@/modules/communities/domain/constants';
import { isCommunityOwner, hasCommunityPermission, hasAnyCommunityPermission } from '@/modules/communities/domain/permissions';

import CommunityAdminTab from '@/modules/communities/components/CommunityAdminTab';
import CommunityTeamTab from '@/modules/communities/components/CommunityTeamTab';

const TABS = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid, permission: null },
  { key: 'team', label: 'Equipe', icon: Users, permission: COMMUNITY_PERMISSION.TEAM },
  { key: 'settings', label: 'Configurações', icon: ShieldCheck, permission: 'admin_only' },
];

export default function CommunityAdminPanel() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: community, isLoading: loadingCommunity } = useCommunity(communityId);
  const { data: membership, isLoading: loadingMembership } = useMyCommunityMembership(communityId);
  const [searchParams, setSearchParams] = useSearchParams();

  const isLoading = loadingCommunity || loadingMembership;
  const isAdmin = membership?.role === COMMUNITY_ROLE.ADMIN;
  const owner = isCommunityOwner(community, membership);
  const canAccess = hasAnyCommunityPermission(community, membership);

  const visibleTabs = useMemo(() => TABS.filter((tab) => {
    if (tab.permission === null) return true;
    if (tab.permission === 'admin_only') return isAdmin;
    return hasCommunityPermission(community, membership, tab.permission);
  }), [community, membership, isAdmin]);

  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = visibleTabs.some((t) => t.key === requestedTab) ? requestedTab : (visibleTabs[0]?.key || 'overview');

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!community || !membership || !canAccess) {
      toast.error('Você não tem permissão para administrar esta comunidade.');
      navigate(`/comunidade/${communityId}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, community, membership, canAccess, navigate, communityId]);

  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-5xl space-y-6 px-5 py-6 pb-12">
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-96 rounded-[2rem]" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="arena-page mx-auto max-w-2xl px-5 py-6 pb-12">
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

  return (
    <div className="arena-page mx-auto max-w-5xl space-y-6 px-5 py-6 pb-12">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/comunidade/${communityId}`}><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar à comunidade</Link>
      </Button>

      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[19px] font-extrabold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{community.name}</h1>
              <Badge className="rounded-full border-0 bg-white/10 text-white hover:bg-white/10">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Administração
              </Badge>
            </div>
            <p className="mt-2 text-sm text-orange-50/80">
              Painel de administração
              {owner && ' · Você é o proprietário'}
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="arena-tab-bar">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className={cn('arena-tab-pill', 'gap-1.5')}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 px-1">
          <OverviewTab community={community} />
        </TabsContent>
        <TabsContent value="team" className="mt-6 px-1">
          <CommunityTeamTab community={community} membership={membership} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6 px-1">
          <CommunityAdminTab community={community} membership={membership} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ community }) {
  const founded = community.created_at?.toDate ? community.created_at.toDate().getFullYear() : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard value={community.member_count || 1} label="Membros" />
        <StatCard value={founded || '—'} label="Fundação" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold">Sobre a comunidade</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {community.description || 'Nenhuma descrição cadastrada ainda.'}
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[21px] font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
