import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, MessageSquare, MessageCircle, Info, LogOut } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabsContentStack, BalancedTabsContent } from '@/components/ui/BalancedTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  getCommunity,
  joinCommunity,
  leaveCommunity,
  getMyCommunityMembership,
  getCommunityMemberCount,
} from '../services/communityService';
import { getClub } from '@/modules/organizations/services/clubService';
import { toast } from 'sonner';

import MuralTab from '../components/MuralTab';
import ForumTab from '../components/ForumTab';
import EventsTab from '../components/EventsTab';
import AboutTab from '../components/AboutTab';
import PageContainer from '@/components/PageContainer';

export default function CommunityDetail() {
  const { communityId } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mural');
  const [isMember, setIsMember] = useState(false);
  const [memberCount, setMemberCount] = useState(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [legacyOrgRedirect, setLegacyOrgRedirect] = useState(false);

  const refreshMemberCount = useCallback(() => {
    getCommunityMemberCount(communityId)
      .then(setMemberCount)
      .catch(() => {});
  }, [communityId]);

  // Associação real (doc determinista `communityId_uid`) — antes o botão
  // "Participar" reaparecia a cada reload mesmo para quem já era membro.
  useEffect(() => {
    if (!user?.uid) {
      setIsMember(false);
      return;
    }
    getMyCommunityMembership(communityId, user.uid)
      .then((membership) => setIsMember(Boolean(membership)))
      .catch(() => {});
  }, [communityId, user?.uid]);

  useEffect(() => {
    refreshMemberCount();
  }, [refreshMemberCount]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getCommunity(communityId);
        if (cancelled) return;
        if (data) {
          setCommunity(data);
          return;
        }
        // Link legado: notificações antigas apontam `/comunidade/{orgId}` para
        // o perfil público de uma ORGANIZAÇÃO (rota que hoje pertence às
        // comunidades). Se o id for de uma organização, redireciona.
        const club = await getClub(communityId).catch(() => null);
        if (cancelled) return;
        if (club) setLegacyOrgRedirect(true);
        else setCommunity(null);
      } catch {
        if (!cancelled) setCommunity(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [communityId]);

  const { data: membership } = useMyCommunityMembership(communityId);

  // IMPORTANTE: derivar isMember/isAdmin diretamente de community + membership + user.
  // Regra única de verdade: `deriveCommunityMembershipState` consolida os
  // dois caminhos (membership doc OU owner_id direto) e retorna
  // { isMember, canAdmin }. Tudo (botão Editar, aba Equipe, mural post
  // form, eventos create) consome canAdmin ou o objeto community/membership
  // diretamente para calcular suas próprias permissões granulares.
  const { isMember, canAdmin } = deriveCommunityMembershipState(community, membership, user?.uid);

  // Hooks de classe dos wrappers. Devem ficar ANTES dos early-returns.
  // Quando a flag de paridade está ligada, usa o wrapper padrão ONG
  // (`arena-page mx-auto max-w-5xl ...`) para casar com o `<CommunityCover>`
  // (que assume `-mt-14 sm:-mt-16` no banner, edge-to-edge).
  const loadingClass = useArenaPageClasses('arena-page mx-auto w-full max-w-5xl px-4 py-6 space-y-6');
  const successClass = useArenaPageClasses(
    parityEnabled
      // Com CommunityCover, o wrapper raiz não pode ter padding-top (a
      // capa sobrepõe a borda). Mantém os outros 3 lados.
      ? 'arena-page mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8 space-y-6'
      : 'arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6',
  );

  const handleJoin = async () => {
    if (!user) return toast.error('Faça login para participar');
    try {
      await joinCommunity(communityId, user.uid);
      setIsMember(true);
      refreshMemberCount();
      toast.success('Você entrou na comunidade!');
    } catch (err) {
      toast.error('Erro ao entrar');
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveCommunity(communityId, user.uid);
      setIsMember(false);
      setConfirmLeave(false);
      refreshMemberCount();
      toast.success('Você saiu da comunidade.');
    } catch {
      toast.error('Não foi possível sair da comunidade.');
    } finally {
      setLeaving(false);
    }
  };

  if (legacyOrgRedirect) return <Navigate to={`/organizacoes/${communityId}`} replace />;
  if (loading) {
    return (
      <PageContainer className="space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
      </PageContainer>
    );
  }
  if (!community) {
    return (
      <PageContainer>
        <EmptyState
          icon={Users}
          title="Comunidade não encontrada"
          description="A comunidade que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/comunidade">Voltar para comunidades</Link></Button>}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/comunidade"><ArrowLeft className="mr-2 w-4 h-4" /> Voltar</Link>
      </Button>

      <section className="arena-panel-strong overflow-hidden rounded-3xl relative min-h-[200px] flex items-end p-6">
        {community.cover_url && (
          <img src={community.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        )}
        <div className="relative z-10 w-full flex flex-wrap justify-between items-end gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-white">{community.name}</h1>
            <p className="text-orange-50/80 mt-1 flex items-center gap-2">
              <Users className="w-4 h-4" /> {memberCount ?? community.member_count ?? 1} membro(s)
            </p>
          </div>
          {isMember ? (
            <Button
              variant="outline"
              size="sm"
              className="border-white/25 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setConfirmLeave(true)}
            >
              <LogOut className="mr-1.5 h-4 w-4" /> Sair da comunidade
            </Button>
          ) : (
            <Button onClick={handleJoin} variant="default">Participar</Button>
          )}
          <div className="relative z-10 w-full flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-white">{community.name}</h1>
              <p className="text-orange-50/80 mt-1 flex items-center gap-2">
                <Users className="w-4 h-4" /> {community.member_count || 1} membros
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canAdmin && (
                 <Button variant="secondary" asChild><Link to={`/comunidade/${communityId}/admin`}><Settings className="w-4 h-4 mr-2" /> Editar</Link></Button>
              )}
              {!isMember && (
                <Button onClick={handleJoin} variant="default">Participar</Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Ações "Participar" no modo paridade — vão à direita das abas
          (mesmo padrão do "Pedir para ingressar" da ONG). A
          `arena-tab-bar` e o botão ficam em um flex row com
          `border-b` para o delineador. */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
    <TabsContentStack>        {parityEnabled ? (
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-1">
            <div className="w-full sm:w-auto">
              <TabsList className="arena-tab-bar">
                {TABS_PARITY.map((tab) => (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className={cn('arena-tab-pill gap-1.5')}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                  </TabsTrigger>
                ))}
                {canAdmin && (
                  <TabsTrigger value="equipe" className={cn('arena-tab-pill gap-1.5')}>
                    <Users className="h-4 w-4" /> Equipe
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            {!isMember && !canAdmin && (
              <div className="pb-2">
                <Button size="sm" onClick={handleJoin}>
                  Participar
                </Button>
              </div>
            )}
          </div>
        ) : (
          <TabsList className="arena-admin-tabs">
            {TABS_LEGACY.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="rounded-lg data-[state=active]:bg-primary">
                <tab.icon className="mr-2 h-4 w-4" /> {tab.label}
              </TabsTrigger>
            ))}
            {canAdmin && (
              <TabsTrigger value="equipe" className="rounded-lg data-[state=active]:bg-primary">
                <Users className="mr-2 h-4 w-4" /> Equipe
              </TabsTrigger>
            )}
          </TabsList>
        )}

        <TabsContent value="mural"><MuralTab communityId={communityId} isMember={isMember} /></TabsContent>
        <TabsContent value="forum"><ForumTab communityId={communityId} isMember={isMember} /></TabsContent>
        <TabsContent value="eventos"><EventsTab communityId={communityId} isMember={isMember} /></TabsContent>
        <TabsContent value="sobre"><AboutTab community={community} /></TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Sair da comunidade"
        description={`Tem certeza que deseja sair de "${community.name}"?`}
        confirmLabel="Sair"
        destructive
        loading={leaving}
        onConfirm={handleLeave}
      />
    </PageContainer>
  );
}
