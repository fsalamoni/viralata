import React, { useState } from 'react';
import VolunteerCtaCard from '@/modules/shelter/components/VolunteerCtaCard';
import FosterCtaCard from '@/modules/shelter/components/FosterCtaCard';
import PublicGallerySection from '@/modules/shelter/components/PublicGallerySection';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Building2, PawPrint, MessageSquare, HandCoins, Wallet, Users, Info, HeartHandshake } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabsContentStack, BalancedTabsContent } from '@/components/ui/BalancedTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { getClub } from '../services/clubService';
import { isClubPubliclyVisible } from '@/modules/communities/domain/directory';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import {
  useMyMembership,
  useRequestToJoinClub,
  useMyJoinRequests,
  useMyClubInvites,
} from '../hooks/useClubs';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { JOIN_REQUEST_STATUS } from '../domain/constants';
import { isClubOwner, hasClubPermission } from '../domain/permissions';
import { CLUB_PERMISSION } from '../domain/constants';
import ClubPetsPublicTab from '../components/ClubPetsPublicTab';
import ClubGeneralTab from '../components/ClubGeneralTab';
import ClubFeedTab from '../components/ClubFeedTab';
import ClubDonationsTab from '../components/ClubDonationsTab';
import ClubFinanceTab from '../components/ClubFinanceTab';
import ClubTeamPublicTab from '../components/ClubTeamPublicTab';
import ClubVolunteersPublicTab from '../components/ClubVolunteersPublicTab';
import ClubCover from '../components/ClubCover';
import ClubThemedScope from '../components/ClubThemedScope';
import { cn } from '@/core/lib/utils';
import { parseTimestamp } from '@/core/utils/timestamp';

/** Abas públicas da ONG — com badges nas que têm contagem. */
const TABS = [
  { key: 'general', label: 'Visão Geral', icon: Info, badgeKey: null },
  { key: 'pets', label: 'Animais', icon: PawPrint, badgeKey: 'pets' },
  { key: 'feed', label: 'Mural da ONG', icon: MessageSquare, badgeKey: null },
  { key: 'donations', label: 'Chamados de Doação', icon: HandCoins, badgeKey: 'donations' },
  { key: 'finance', label: 'Prestação de Contas', icon: Wallet, badgeKey: null },
  { key: 'volunteers', label: 'Voluntários', icon: HeartHandshake, badgeKey: 'volunteers' },
  { key: 'team', label: 'Equipe', icon: Users, badgeKey: null },
];

export default function ClubDetail() {
  const { orgId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const activeTab = urlTab || 'general';
  function setActiveTab(tab) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  }

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
      founded: parseTimestamp(club.created_at)?.getFullYear() ?? null,
    };
  }, [club, pets]);

  const isPending = myRequests.some((r) => r.club_id === orgId && r.status === JOIN_REQUEST_STATUS.PENDING);
  const isInvited = myInvites.some((i) => i.club_id === orgId);

  // Hooks de classe dos wrappers. Devem ficar ANTES dos early-returns.
  const loadingClass = useArenaPageClasses('arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6');
  const errorClass = useArenaPageClasses('arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8');

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
      <div className={loadingClass}>
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className={errorClass}>
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
      <div className={errorClass}>
        <EmptyState
          icon={Building2}
          title="Organização indisponível"
          description="Esta organização foi removida temporariamente do diretório público."
          action={<Button asChild><Link to="/organizacoes">Voltar</Link></Button>}
        />
      </div>
    );
  }

  // A página pública é PURAMENTE para visualização + interações sociais
  // restritas (curtir, comentar, informar contribuição, pedir pra ingressar).
  // Toda gestão — inserir/editar/excluir conteúdo, gerenciar equipe,
  // configurações — passa exclusivamente pelo painel administrativo
  // (visível em /organizacao/:orgId/admin), onde os botões certos aparecem
  // de acordo com as permissões granulares (animals, finance, donations,
  // feed, team).
  //
  // Por isso, nesta página, todos os `canManage*` abaixo são `false`. O
  // painel admin cuida do resto para membros com a permissão adequada.

  return (
    <ClubThemedScope club={club} className="min-h-screen">
      {/* CAPA — full-width edge-to-edge logo abaixo da barra superior.
          O card usa `var(--cover-gradient)` e respeita `max-h-` mesmo em
          telas grandes. As cores vêm de `club.theme` via o `ClubThemedScope`. */}
      <ClubCover club={club} stats={stats} isAdmin={isAdmin} />

      {/* CONTEÚDO ABAIXO DO CARD — max-w + padding para texto/tabs.
          Esse wrapper cuida do breathing visual depois do banner largo. */}
      <div className="arena-page mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
        {/* Botão "Voltar" — agora entre o card e as tabs (uma única
            área de navegação da página pública). */}
        <div className="flex items-center justify-between gap-2 pt-3 pb-1">
          <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
            <Link to="/organizacoes">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>

        {/* TABS + ações de "Pedir para ingressar" à direita (visitante) */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-1 sm:mt-3">
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
                        // Pill ativo usa o gradiente PERSONALIZADO do
                        // card da ONG (definido em `clubs.theme` e
                        // aplicado por `ClubThemedScope`). Quando o admin
                        // não personalizou, cai no default laranja→rosa
                        // declarado em :root. Garante coerência visual
                        // entre o card da ONG e a navegação interna.
                        'arena-tab-pill gap-1.5 data-[state=active]:text-white data-[state=active]:[background:var(--cover-gradient)]',
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

          <TabsContentStack>
          <BalancedTabsContent value="general" className="mt-6 space-y-6 outline-none sm:mt-8">
            {/* TASK-205: CTA "Seja voluntário" (flag-gated, some se OFF) */}
            <VolunteerCtaCard clubId={orgId} clubName={club?.name} />
            <FosterCtaCard clubId={orgId} clubName={club?.name} />
            <ClubGeneralTab club={club} stats={stats} />
            {/* TASK-142: galeria pública (some sem fotos) */}
            <PublicGallerySection clubId={orgId} />
          </BalancedTabsContent>

          <BalancedTabsContent value="pets" className="mt-6 outline-none sm:mt-8">
            <ClubPetsPublicTab clubId={orgId} clubName={club?.name} />
          </BalancedTabsContent>

          <BalancedTabsContent value="feed" className="mt-6 outline-none sm:mt-8">
            <ClubFeedTab clubId={orgId} club={club} membership={membership} canManageFeed={false} />
          </BalancedTabsContent>

          <BalancedTabsContent value="donations" className="mt-6 outline-none sm:mt-8">
            <ClubDonationsTab clubId={orgId} club={club} membership={membership} canManage={false} />
          </BalancedTabsContent>

          <BalancedTabsContent value="finance" className="mt-6 outline-none sm:mt-8">
            <ClubFinanceTab clubId={orgId} canManage={false} />
          </BalancedTabsContent>

          <BalancedTabsContent value="volunteers" className="mt-6 outline-none sm:mt-8">
            <ClubVolunteersPublicTab clubId={orgId} club={club} viewerMembership={membership} />
          </BalancedTabsContent>
          <BalancedTabsContent value="team" className="mt-6 outline-none sm:mt-8">
            <ClubTeamPublicTab clubId={orgId} club={club} viewerMembership={membership} />
          </BalancedTabsContent>
        
        </TabsContentStack></Tabs>
      </div>
    </ClubThemedScope>
  );
}
