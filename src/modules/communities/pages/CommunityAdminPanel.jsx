import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, LayoutGrid, MessageSquare, Users, ShieldCheck, Building2, Trash2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/core/lib/utils';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useCommunity, useMyCommunityMembership, useDeleteCommunity } from '@/modules/communities/hooks/useCommunities';
import { COMMUNITY_ROLE, COMMUNITY_PERMISSION } from '@/modules/communities/domain/constants';
import { isCommunityOwner, hasCommunityPermission, hasAnyCommunityPermission } from '@/modules/communities/domain/permissions';

import CommunityAdminTab from '@/modules/communities/components/CommunityAdminTab';
import CommunityTeamTab from '@/modules/communities/components/CommunityTeamTab';
import MuralTab from '@/modules/communities/components/MuralTab';
import { parseTimestamp } from '@/core/utils/timestamp';

const TAB_ICONS = {
  overview: LayoutGrid,
  feed: MessageSquare,
  team: Users,
  settings: ShieldCheck,
};

/**
 * Painel de administração da comunidade.
 *
 * Espelha o layout do painel da ONG (`OrganizationAdminPanel`) — mesmo
 * header `arena-panel-strong`, mesmas classes `p-6 sm:p-10`, mesmos stat
 * cards `p-6 sm:p-7`, mesma `arena-tab-bar` e mesmo `mt-12 sm:mt-14`
 * nos contents — porém com **apenas** as abas pertinentes à comunidade:
 *
 *   - Visão Geral (overview)     — stats + descrição
 *   - Mural (feed)                — MuralTab (wrapper por flag)
 *   - Equipe (team)               — CommunityTeamTab
 *   - Configurações (settings)    — CommunityAdminTab (dados da comunidade)
 *                                   + zona de risco (exclusão)
 *
 * Sem abas como "Geral", "Pets", "Doações", "Financeiro", "Conversas"
 * (específicas da ONG, irrelevantes para comunidade).
 *
 * A flag `COMMUNITY_NGO_PARITY` (default OFF) controla o gate. Com ela
 * desligada, o painel renderiza com o layout antigo de 3 abas (overview,
 * team, settings) e padding mais enxuto — puramente aditivo.
 */
export default function CommunityAdminPanel() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: community, isLoading: loadingCommunity } = useCommunity(communityId);
  const { data: membership, isLoading: loadingMembership } = useMyCommunityMembership(communityId);
  const [searchParams, setSearchParams] = useSearchParams();
  const deleteCommunity = useDeleteCommunity();

  // Flag de paridade ONG: liga o novo layout (4 abas no padrão ONG,
  // header com mais respiro, stat cards padronizados, danger zone
  // visualmente consistente). Default OFF = comportamento atual.
  const parityEnabled = useFeatureFlag(FEATURE_FLAG.COMMUNITY_NGO_PARITY);

  // Confirmação da exclusão definitiva da comunidade (zona de risco)
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const isLoading = loadingCommunity || loadingMembership;
  const isAdmin = membership?.role === COMMUNITY_ROLE.ADMIN;
  const owner = isCommunityOwner(community, membership, user?.uid);
  const canAccess = hasAnyCommunityPermission(community, membership, user?.uid);

  // Hooks de classe dos wrappers. Devem ficar ANTES dos early-returns.
  // Quando a flag de paridade está ligada, o `successClass` ganha mais
  // respiro e a `loadingClass` iguala — mesmo padrão ONG.
  const loadingClass = useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-6 px-5 py-6 pb-12');
  const errorClass = useArenaPageClasses('arena-page mx-auto max-w-2xl px-5 py-6 pb-12');
  const successClass = useArenaPageClasses(
    parityEnabled
      ? 'arena-page mx-auto max-w-5xl space-y-8 px-5 py-6 pb-12 sm:space-y-10'
      : 'arena-page mx-auto max-w-5xl space-y-6 px-5 py-6 pb-12',
  );

  // Lista de abas visíveis para o viewer. Filtra por permissão granular
  // (igual à lógica do `visibleAdminTabs` da ONG).
  const visibleTabs = useMemo(() => {
    if (!parityEnabled) {
      // Modo legado: 3 abas fixas (overview, team, settings).
      const tabDefs = [
        { key: 'overview', label: 'Visão Geral', permission: null },
        { key: 'team', label: 'Equipe', permission: COMMUNITY_PERMISSION.TEAM },
        { key: 'settings', label: 'Configurações', permission: 'admin_only' },
      ];
      return tabDefs.filter((tab) => {
        if (tab.permission === null) return true;
        if (tab.permission === 'admin_only') return isAdmin || owner;
        return hasCommunityPermission(community, membership, tab.permission, user?.uid);
      });
    }
    // Modo paridade: 4 abas (overview, feed, team, settings).
    const tabDefs = [
      { key: 'overview', label: 'Visão Geral', permission: null },
      { key: 'feed', label: 'Mural', permission: COMMUNITY_PERMISSION.FEED },
      { key: 'team', label: 'Equipe', permission: COMMUNITY_PERMISSION.TEAM },
      { key: 'settings', label: 'Configurações', permission: 'admin_only' },
    ];
    return tabDefs.filter((tab) => {
      if (tab.permission === null) return true;
      if (tab.permission === 'admin_only') return isAdmin || owner;
      // Mural: visível se o usuário PODE postar (não precisa ser
      // obrigado a ter permissão para VER o mural admin — a aba fica
      // aberta para o admin acompanhar o que está acontecendo).
      if (tab.key === 'feed') {
        return owner || isAdmin
          || hasCommunityPermission(community, membership, COMMUNITY_PERMISSION.FEED, user?.uid);
      }
      return hasCommunityPermission(community, membership, tab.permission, user?.uid);
    });
  }, [parityEnabled, community, membership, isAdmin, owner, user?.uid]);

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

  // Exclusão definitiva da comunidade. Só o owner pode (regra do Firestore
  // reforça isso server-side).
  const handleDelete = async () => {
    try {
      await deleteCommunity.mutateAsync(community.id);
      toast.success('Comunidade excluída.');
      setConfirmDelete(false);
      navigate('/comunidade');
    } catch (err) {
      toast.error(err.message || 'Não foi possível excluir a comunidade.');
    }
  };

  if (isLoading) {
    return (
      <div className={loadingClass}>
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-96 rounded-[2rem]" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className={errorClass}>
        <EmptyState
          icon={Building2}
          title="Comunidade não encontrada"
          description="A comunidade que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/comunidade">Voltar</Link></Button>}
        />
      </div>
    );
  }

  if (!canAccess) return null; // useEffect acima já redireciona com o toast

  const initials = (community.name || 'C').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  return (
    <div className={successClass}>
      <Button asChild variant="ghost" size="sm">
        <Link to={`/comunidade/${communityId}`}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar à comunidade
        </Link>
      </Button>

      {/* Header do painel admin — `arena-panel-strong` (mesmo gradiente
          da plataforma) com padding generoso (`p-6 sm:p-10`). Espelha
          o cabeçalho do `OrganizationAdminPanel`. */}
      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-6 sm:rounded-[2rem] sm:p-10">
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
              {(community.city || community.state) && (
                <> · {[community.city, community.state].filter(Boolean).join(', ')}</>
              )}
              {owner && ' · Você é o proprietário'}
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn('arena-tab-bar', parityEnabled ? '' : 'h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-transparent p-0 sm:gap-2')}>
          {visibleTabs.map((tab) => (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              className={cn(parityEnabled ? 'arena-tab-pill gap-1.5' : 'rounded-lg data-[state=active]:bg-primary')}
            >
              {TAB_ICONS[tab.key] && React.createElement(TAB_ICONS[tab.key], { className: parityEnabled ? 'h-4 w-4' : 'mr-2 h-4 w-4' })}
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent
          value="overview"
          className={parityEnabled ? 'mt-12 px-1 sm:mt-14' : 'mt-6 px-1'}
        >
          <OverviewTab community={community} />
        </TabsContent>
        {parityEnabled && (
          <TabsContent value="feed" className="mt-12 px-1 sm:mt-14">
            <MuralTab
              communityId={community.id}
              isMember
              isAdmin={isAdmin || owner}
              membership={membership}
              community={community}
            />
          </TabsContent>
        )}
        <TabsContent
          value="team"
          className={parityEnabled ? 'mt-12 px-1 sm:mt-14' : 'mt-6 px-1'}
        >
          <CommunityTeamTab community={community} membership={membership} />
        </TabsContent>
        <TabsContent
          value="settings"
          className={parityEnabled ? 'mt-12 px-1 sm:mt-14 space-y-6' : 'mt-6 px-1 space-y-4'}
        >
          <CommunityAdminTab community={community} membership={membership} />
          {/* Zona de risco — só renderiza no modo paridade (segue o
              padrão visual do `OrganizationAdminPanel` que tem um card
              `border-destructive/30` no fim da aba Configurações). */}
          {parityEnabled && (isAdmin || owner) && (
            <section className="arena-section-card rounded-xl border-destructive/30">
              <div className="arena-section-card-header">
                <h3 className="arena-section-card-title">Zona de risco</h3>
                <p className="arena-section-card-description">
                  A exclusão da comunidade remove membros, mural, fórum e eventos.
                  Não pode ser desfeita.
                </p>
              </div>
              <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  disabled={deleteCommunity.isPending}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Excluir comunidade
                </Button>
              </div>
            </section>
          )}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ community }) {
  const founded = parseTimestamp(community.created_at)?.getFullYear() ?? null;
  const members = community.member_count || 1;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard value={members} label={members === 1 ? 'Membro' : 'Membros'} />
        <StatCard value={founded || '—'} label="Fundação" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
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
    <div className="arena-stat-card">
      <p className="arena-stat-card-label">{label}</p>
      <div className="arena-stat-card-value">{value}</div>
    </div>
  );
}
