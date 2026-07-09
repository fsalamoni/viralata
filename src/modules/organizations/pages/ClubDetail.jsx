import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, Settings, PawPrint, MessageSquare, HandCoins, Wallet, Users, Info } from 'lucide-react';
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
import { JOIN_REQUEST_STATUS } from '../domain/constants';
import { isClubOwner, hasClubPermission, hasAnyClubPermission } from '../domain/permissions';
import { CLUB_PERMISSION } from '../domain/constants';
import ClubPetsPublicTab from '../components/ClubPetsPublicTab';
import ClubGeneralTab from '../components/ClubGeneralTab';
import ClubFeedTab from '../components/ClubFeedTab';
import ClubDonationsTab from '../components/ClubDonationsTab';
import ClubFinanceTab from '../components/ClubFinanceTab';
import ClubTeamPublicTab from '../components/ClubTeamPublicTab';
import { cn } from '@/core/lib/utils';

/** Abas públicas da ONG. */
const TABS = [
  { key: 'general', label: 'Geral', icon: Info },
  { key: 'pets', label: 'Pets para Adoção', icon: PawPrint },
  { key: 'feed', label: 'Mural', icon: MessageSquare },
  { key: 'donations', label: 'Chamados de Doação', icon: HandCoins },
  { key: 'finance', label: 'Prestação de Contas', icon: Wallet },
  { key: 'team', label: 'Equipe', icon: Users },
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
      <div className="arena-page mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="arena-page mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
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
      <div className="arena-page mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={Building2}
          title="Organização indisponível"
          description="Esta organização foi removida temporariamente do diretório público."
          action={<Button asChild><Link to="/organizacoes">Voltar</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* HEADER — minimalista: voltar + ações à direita, sem card pesado. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link to="/organizacoes">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <Button asChild size="sm" className="bg-foreground text-background hover:bg-foreground/90">
              <Link to={`/organizacoes/${orgId}/admin`}>
                <Settings className="mr-1.5 h-4 w-4" /> Painel Administrativo
              </Link>
            </Button>
          )}
          {!isMember && !isAdmin && (
            isInvited ? (
              <Button size="sm" variant="outline" className="border-warning text-warning" disabled>
                Você foi convidado
              </Button>
            ) : isPending ? (
              <Button size="sm" variant="outline" disabled>
                Pedido enviado
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handleRequest} disabled={requestToJoin.isPending}>
                {requestToJoin.isPending ? 'Enviando...' : 'Pedir para ingressar'}
              </Button>
            )
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-transparent p-0 sm:gap-1.5">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.key}
                value={tab.key}
                className={cn(
                  'rounded-lg gap-1.5 data-[state=active]:bg-foreground data-[state=active]:text-background',
                )}
              >
                <tab.icon className="h-4 w-4" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="general" className="outline-none">
          <ClubGeneralTab club={club} />
        </TabsContent>

        <TabsContent value="pets" className="min-h-[400px] outline-none">
          <ClubPetsPublicTab clubId={orgId} clubName={club?.name} />
        </TabsContent>

        <TabsContent value="feed" className="outline-none">
          <ClubFeedTab clubId={orgId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="donations" className="outline-none">
          <ClubDonationsTab clubId={orgId} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="finance" className="outline-none">
          <ClubFinanceTab clubId={orgId} readOnly={!isAdmin} />
        </TabsContent>

        <TabsContent value="team" className="outline-none">
          <ClubTeamPublicTab clubId={orgId} club={club} viewerMembership={membership} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
