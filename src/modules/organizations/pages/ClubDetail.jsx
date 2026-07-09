import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, PawPrint, MessageSquare, HandCoins, Wallet, Users, Info } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { getClub } from '../services/clubService';
import { isClubPubliclyVisible } from '@/modules/communities/domain/directory';
import {
  useMyMembership,
  useRequestToJoinClub,
  useMyJoinRequests,
  useMyClubInvites,
} from '../hooks/useClubs';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { JOIN_REQUEST_STATUS } from '../domain/constants';
import { isClubOwner, hasClubPermission, hasAnyClubPermission } from '../domain/permissions';
import { CLUB_PERMISSION } from '../domain/constants';
import ClubPetsPublicTab from '../components/ClubPetsPublicTab';
import ClubGeneralTab from '../components/ClubGeneralTab';
import ClubFeedTab from '../components/ClubFeedTab';
import ClubDonationsTab from '../components/ClubDonationsTab';
import ClubFinanceTab from '../components/ClubFinanceTab';
import ClubTeamPublicTab from '../components/ClubTeamPublicTab';
import ClubCover from '../components/ClubCover';
import ClubThemedScope from '../components/ClubThemedScope';
import { cn } from '@/core/lib/utils';

/** Abas públicas da ONG — com badges nas que têm contagem. */
const TABS = [
  { key: 'general', label: 'Visão Geral', icon: Info, badgeKey: null },
  { key: 'pets', label: 'Animais', icon: PawPrint, badgeKey: 'pets' },
  { key: 'feed', label: 'Mural da ONG', icon: MessageSquare, badgeKey: null },
  { key: 'donations', label: 'Chamados de Doação', icon: HandCoins, badgeKey: 'donations' },
  { key: 'finance', label: 'Prestação de Contas', icon: Wallet, badgeKey: null },
  { key: 'team', label: 'Equipe', icon: Users, badgeKey: null },
];

export default function ClubDetail() {
  const { orgId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['club', orgId],
    queryFn: () => getClub(orgId),
    enabled: Boolean(orgId),
  });

  const { membership, isLoading: loadingMembership } = useMyMembership(orgId, user?.uid);
  const isMember = Boolean(
    membership || (club?.created_by && user?.uid && club.created_by === user?.uid),
  );
  const isAdmin = Boolean(
    club && (isClubOwner(club, membership, user?.uid)
      || hasClubPermission(club, membership, CLUB_PERMISSION.TEAM, user?.uid)),
  );

  const { data: myRequests = [] } = useMyJoinRequests();
  const { data: myInvites = [] } = useMyClubInvites();
  const requestToJoin = useRequestToJoinClub();
  const { data: pets = [] } = useMyPets(orgId);

  // Stats para a capa e a aba Geral — derivado aqui para ficar consistente
  // entre header e conteúdo.
  const stats = React.useMemo(() => {
    if (!club) return null;
    return {
      followers: club.member_count || 0,
      animals: pets.filter((p) => !p.status || p.status === 'available').length,
      founded: club.created_at?.toDate ? club.created_at.toDate().getFullYear() : null,
    };
  }, [club, pets]);

  const isPending = myRequests.some((r) => r.club_id === orgId && r.status === JOIN_REQUEST_STATUS.PENDING);
  const isInvited = myInvites.some((i) => i.club_id === orgId);

  const handleRequest = async () => {
    if (!isAuthenticated) {
      toast.error('Você precisa estar logado para ingressar.');
      return;
    }
    try {
      const res = await requestToJoin.mutateAsync(club);
      if (res?.alreadyMember) toast.success('Você já é membro desta organização.');
      else toast.success(`Pedido enviado para ${club.name}.`);
    } catch (err) {
      toast.error(err.message || 'Não foi possível enviar o pedido.');
    }
  };

  if (isLoading || (isAuthenticated && loadingMembership)) {
    return (
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={Building2}
          title="ONG não encontrada"
          description="A organização que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/organizacoes">Voltar</Link></Button>}
        />
      </div>
    );
  }

  if (!isClubPubliclyVisible(club) && !membership) {
    return (
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={Building2}
          title="Organização indisponível"
          description="Esta organização foi removida temporariamente do diretório público."
          action={<Button asChild><Link to="/organizacoes">Voltar</Link></Button>}
        />
      </div>
    );
  }

  // Permissões granulares para os botões das abas. Mantemos a coerência com
  // o painel admin: owner sempre pode tudo; admin legacy (sem `permissions`
  // explícito) também; demais precisam da permissão específica.
  const canManageFeedPub = hasClubPermission(club, membership, CLUB_PERMISSION.FEED, user?.uid);
  const canManageDonationsPub = hasClubPermission(club, membership, CLUB_PERMISSION.DONATIONS, user?.uid);
  const canManageFinancePub = hasClubPermission(club, membership, CLUB_PERMISSION.FINANCE, user?.uid);

  return (
    <ClubThemedScope club={club} className="arena-page mx-auto w-full max-w-5xl px-4 pb-12 pt-0 sm:px-6 lg:px-8">
      {/* Botão "Voltar" no canto superior */}
      <div className="px-1 pb-3 pt-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/organizacoes">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </div>

      {/* CAPA — banner laranja + chips */}
      <ClubCover club={club} stats={stats} isAdmin={isAdmin} />

      {/* TABS + ações de "Pedir para ingressar" à direita (visitante) */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="mt-6 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-1">
          <div className="w-full sm:w-auto">
            <TabsList className="arena-tab-bar">
              {TABS.map((tab) => {
                const badge = tab.badgeKey === 'pets' ? stats.animals
                  : tab.badgeKey === 'donations' ? null // doações: badge dinâmico poderia ser adicionado depois
                  : null;
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className={cn(
                      'arena-tab-pill gap-1.5 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-rose-500 data-[state=active]:text-white',
                    )}
                  >
                    <tab.icon className="h-4 w-4" /> {tab.label}
                    {badge != null && badge > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold data-[state=active]:bg-white/30">
                        {badge}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {!isMember && !isAdmin && (
            <div className="pb-2">
              {isInvited ? (
                <Button size="sm" variant="outline" className="border-warning text-warning" disabled>
                  Você foi convidado
                </Button>
              ) : isPending ? (
                <Button size="sm" variant="outline" disabled>
                  Pedido enviado
                </Button>
              ) : (
                <Button size="sm" onClick={handleRequest} disabled={requestToJoin.isPending}>
                  {requestToJoin.isPending ? 'Enviando...' : 'Pedir para ingressar'}
                </Button>
              )}
            </div>
          )}
        </div>

        <TabsContent value="general" className="mt-8 outline-none">
          <ClubGeneralTab club={club} stats={stats} />
        </TabsContent>

        <TabsContent value="pets" className="mt-8 outline-none">
          <ClubPetsPublicTab clubId={orgId} clubName={club?.name} />
        </TabsContent>

        <TabsContent value="feed" className="mt-8 outline-none">
          <ClubFeedTab clubId={orgId} club={club} membership={membership} canManageFeed={canManageFeedPub} />
        </TabsContent>

        <TabsContent value="donations" className="mt-8 outline-none">
          <ClubDonationsTab clubId={orgId} club={club} membership={membership} canManage={canManageDonationsPub} />
        </TabsContent>

        <TabsContent value="finance" className="mt-8 outline-none">
          <ClubFinanceTab clubId={orgId} canManage={canManageFinancePub} />
        </TabsContent>

        <TabsContent value="team" className="mt-8 outline-none">
          <ClubTeamPublicTab clubId={orgId} club={club} viewerMembership={membership} />
        </TabsContent>
      </Tabs>
    </ClubThemedScope>
  );
}
