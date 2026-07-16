import React, { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  Hash,
  Instagram,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  MessagesSquare,
  PawPrint,
  Phone,
  Settings,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
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
  useMyClubInvite,
  useAcceptClubInvite,
  useDeclineClubInvite,
} from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, JOIN_REQUEST_STATUS } from '@/modules/organizations/domain/constants';
import ClubMembersTab from '@/modules/organizations/components/ClubMembersTab';
import ClubEventsTab from '@/modules/organizations/components/ClubEventsTab';
import ClubFeedTab from '@/modules/organizations/components/ClubFeedTab';
import ClubForumsTab from '@/modules/organizations/components/ClubForumsTab';
import ClubAdminTab from '@/modules/organizations/components/ClubAdminTab';
import ClubReportsPanel from '@/modules/organizations/components/ClubReportsPanel';
import ClubPetsDataGrid from '@/modules/organizations/components/ClubPetsDataGrid';
import RatingBadge from '@/modules/pets/components/RatingBadge';
import { QrCode } from '@/components/ui/qr-code';
import AdSlot from '@/components/AdSlot';

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

  const isMember = !!membership;
  const isAdmin = membership?.role === CLUB_ROLE.ADMIN;
  const canEditPets = isAdmin || membership?.permissions?.edit_pets === true;
  const canManageTeam = isAdmin || membership?.permissions?.manage_team === true;
  const canViewReports = isAdmin || membership?.permissions?.view_reports === true;
  const canSeeAdminTab = isAdmin || canManageTeam;

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

      {!isMember && myInvite && (
        <Card className="rounded-[1.5rem] border-amber-300 bg-amber-50/80">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-foreground">Você foi convidado para este clube</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {myInvite.inviter_name || 'Um administrador'} convidou você a participar. Aceite para entrar e acessar eventos, mural e fórum.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleAcceptInvite} disabled={acceptInvite.isPending}>
                {acceptInvite.isPending ? 'Entrando…' : 'Aceitar convite'}
              </Button>
              <Button variant="outline" onClick={handleDeclineInvite} disabled={declineInvite.isPending}>
                Recusar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!isMember && !myInvite && (
        <Card className="rounded-[1.5rem] border-primary/20 bg-primary/5">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-foreground">Participe deste clube</h3>
            {myRequest?.status === JOIN_REQUEST_STATUS.PENDING ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800">
                Pedido enviado — aguardando aprovação de um administrador.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {myRequest?.status === JOIN_REQUEST_STATUS.REJECTED
                    ? 'Seu pedido anterior não foi aprovado. Você pode pedir novamente.'
                    : 'Peça para ingressar e um administrador irá aprovar, ou entre direto com o código de convite.'}
                </p>
                <Button className="mt-4" onClick={handleRequestJoin} disabled={requestToJoin.isPending || !isAuthenticated}>
                  {requestToJoin.isPending ? 'Enviando…' : 'Pedir para ingressar'}
                </Button>
              </>
            )}
            <form onSubmit={handleJoin} className="mt-4 flex flex-col gap-3 border-t border-primary/10 pt-4 sm:flex-row">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TENHO UM CÓDIGO"
                  maxLength={12}
                  className="pl-9 uppercase tracking-[0.2em]"
                  disabled={!isAuthenticated}
                />
              </div>
            )}
          </div>

      {isMember && (
        <Tabs
          value={
            (activeTab === 'admin' && !canSeeAdminTab)
            || (activeTab === 'pets' && !canEditPets)
            || (activeTab === 'reports' && !canViewReports)
              ? 'members' : activeTab
          }
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
            <TabsTrigger value="members"><Users className="mr-1.5 h-4 w-4" /> Membros</TabsTrigger>
            <TabsTrigger value="events"><CalendarDays className="mr-1.5 h-4 w-4" /> Eventos</TabsTrigger>
            <TabsTrigger value="feed"><MessageSquare className="mr-1.5 h-4 w-4" /> Mural</TabsTrigger>
            <TabsTrigger value="forums"><MessagesSquare className="mr-1.5 h-4 w-4" /> Fóruns</TabsTrigger>
            {canEditPets && <TabsTrigger value="pets"><PawPrint className="mr-1.5 h-4 w-4" /> Pets</TabsTrigger>}
            {canViewReports && <TabsTrigger value="reports"><BarChart3 className="mr-1.5 h-4 w-4" /> Relatórios</TabsTrigger>}
            {canSeeAdminTab && <TabsTrigger value="admin"><Settings className="mr-1.5 h-4 w-4" /> Administração</TabsTrigger>}
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <ClubMembersTab clubId={clubId} isAdmin={isAdmin} canManageTeam={canManageTeam} />
          </TabsContent>

          <BalancedTabsContent value="feed" className="mt-6 outline-none sm:mt-8">
            <ClubFeedTab clubId={orgId} club={club} membership={membership} canManageFeed={false} />
          </BalancedTabsContent>

          <BalancedTabsContent value="donations" className="mt-6 outline-none sm:mt-8">
            <ClubDonationsTab clubId={orgId} club={club} membership={membership} canManage={false} />
          </BalancedTabsContent>

          <BalancedTabsContent value="finance" className="mt-6 outline-none sm:mt-8">
            <ClubFinanceTab clubId={orgId} canManage={false} />
          </BalancedTabsContent>

          {canEditPets && (
            <TabsContent value="pets" className="mt-4 space-y-4">
              <AdSlot />
              <ClubPetsDataGrid clubId={clubId} />
            </TabsContent>
          )}

          {canViewReports && (
            <TabsContent value="reports" className="mt-4">
              <ClubReportsPanel clubId={clubId} />
            </TabsContent>
          )}

          {canSeeAdminTab && (
            <TabsContent value="admin" className="mt-4">
              <ClubAdminTab club={club} isAdmin={isAdmin} canManageTeam={canManageTeam} />
            </TabsContent>
          )}
        </Tabs>
      )}

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Sair do clube"
        description={`Tem certeza que deseja sair de "${club.name}"?`}
        confirmLabel="Sair"
        destructive
        loading={leaveClub.isPending}
        onConfirm={handleLeave}
      />
    </div>
  );
}

function InfoChip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1">
      <Icon className="h-3.5 w-3.5" /> {children}
    </span>
  );
}
