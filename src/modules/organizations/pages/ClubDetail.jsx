import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  HandCoins,
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
import {
  useClub,
  useMyMembership,
  useJoinClub,
  useLeaveClub,
  useMyJoinRequest,
  useRequestToJoinClub,
  useMyClubInvite,
  useAcceptClubInvite,
  useDeclineClubInvite,
  useClubCampaigns,
} from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, JOIN_REQUEST_STATUS, CAMPAIGN_STATUS, CLUB_PERMISSION } from '@/modules/organizations/domain/constants';
import { hasClubPermission } from '@/modules/organizations/domain/permissions';
import ClubMembersTab from '@/modules/organizations/components/ClubMembersTab';
import ClubEventsTab from '@/modules/organizations/components/ClubEventsTab';
import ClubFeedTab from '@/modules/organizations/components/ClubFeedTab';
import ClubForumsTab from '@/modules/organizations/components/ClubForumsTab';
import ClubPetsDataGrid from '@/modules/organizations/components/ClubPetsDataGrid';
import RatingBadge from '@/modules/pets/components/RatingBadge';
import { QrCode } from '@/components/ui/qr-code';

const PUBLIC_TABS = ['members', 'animals', 'events', 'feed', 'forums'];

/**
 * Perfil público da organização (diretório "Comunidade"): Membros, Eventos,
 * Mural, Fóruns. Gestão administrativa (animais em massa, doações,
 * financeiro, equipe, configurações) vive em `/organizacoes/:orgId/admin`
 * (`OrganizationAdminPanel`) — os antigos parâmetros `?tab=admin`/`?tab=pets`
 * desta página redirecionam para lá, preservando links de notificações
 * antigas.
 */
export default function ClubDetail() {
  const { orgId: clubId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: club, isLoading, isError } = useClub(clubId);
  const { data: membership } = useMyMembership(clubId);
  const { data: myRequest } = useMyJoinRequest(clubId);
  const { data: myInvite } = useMyClubInvite(clubId);
  const joinClub = useJoinClub();
  const leaveClub = useLeaveClub(clubId);
  const requestToJoin = useRequestToJoinClub();
  const acceptInvite = useAcceptClubInvite(clubId);
  const declineInvite = useDeclineClubInvite(clubId);
  const [code, setCode] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const requestedTab = rawTab === 'admin' || rawTab === 'pets' ? 'members' : rawTab;
  const activeTab = PUBLIC_TABS.includes(requestedTab) ? requestedTab : 'members';
  const threadParam = searchParams.get('thread') || null;

  useEffect(() => {
    if (rawTab === 'pets') navigate(`/organizacoes/${clubId}/admin?tab=animals`, { replace: true });
    else if (rawTab === 'admin') navigate(`/organizacoes/${clubId}/admin`, { replace: true });
  }, [rawTab, clubId, navigate]);

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'forums') next.delete('thread');
    setSearchParams(next, { replace: true });
  };

  const setThreadParam = (threadId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'forums');
    if (threadId) next.set('thread', threadId);
    else next.delete('thread');
    setSearchParams(next, { replace: true });
  };

  const isMember = !!membership;
  const isAdmin = membership?.role === CLUB_ROLE.ADMIN;
  // Item 7: qualquer visitante vê a lista de animais da organização; só quem
  // tem a atribuição de animais pode baixar modelo, importar ou criar linha.
  const canManageAnimals = hasClubPermission(club, membership, CLUB_PERMISSION.ANIMALS);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await joinClub.mutateAsync(code.trim());
      toast.success('Você entrou na organização!');
      setCode('');
    } catch (err) {
      toast.error(err.message || 'Código inválido para esta organização.');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveClub.mutateAsync();
      toast.success('Você saiu da organização.');
      setConfirmLeave(false);
      navigate('/comunidade');
    } catch (err) {
      toast.error(err.message || 'Não foi possível sair da organização.');
    }
  };

  const handleRequestJoin = async () => {
    try {
      const res = await requestToJoin.mutateAsync(club);
      if (res?.alreadyMember) toast.success('Você já é membro desta organização.');
      else toast.success('Pedido enviado! Os administradores foram avisados.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível enviar o pedido.');
    }
  };

  const handleAcceptInvite = async () => {
    try {
      await acceptInvite.mutateAsync(myInvite);
      toast.success('Convite aceito! Bem-vindo à organização.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível aceitar o convite.');
    }
  };

  const handleDeclineInvite = async () => {
    try {
      await declineInvite.mutateAsync(myInvite);
      toast.success('Convite recusado.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível recusar o convite.');
    }
  };

  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-4xl space-y-6 px-5 py-6 pb-12">
        <Skeleton className="h-40 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="arena-page mx-auto max-w-2xl px-5 py-6 pb-12">
        <EmptyState
          icon={Building2}
          title="Organização não encontrada"
          description="A organização que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/comunidade">Voltar para organizações</Link></Button>}
        />
      </div>
    );
  }

  const location = [club.city, club.state].filter(Boolean).join(' / ');

  return (
    <div className="arena-page mx-auto max-w-4xl space-y-6 px-5 py-6 pb-12">
      <Button asChild variant="ghost" size="sm">
        <Link to="/comunidade"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para organizações</Link>
      </Button>

      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {club.logo_url ? (
              <img src={club.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-2xl border border-white/15 object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-orange-50">
                <Building2 className="h-7 w-7" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{club.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-orange-50/80">
                {location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {location}</span>}
                <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {club.member_count || 0} membro(s)</span>
                <RatingBadge uid={club.id} className="text-amber-200" />
              </div>
              {isMember && (
                <Badge variant={isAdmin ? 'warning' : 'success'} className="mt-3 rounded-full uppercase tracking-[0.12em]">
                  {isAdmin ? 'Você é admin' : 'Você é membro'}
                </Badge>
              )}
            </div>
          </div>

          {isMember && (
            <div className="flex shrink-0 flex-wrap gap-2.5">
              {isAdmin && (
                <Button
                  asChild
                  size="sm"
                  className="border-0 bg-white text-foreground hover:bg-secondary"
                >
                  <Link to={`/organizacoes/${clubId}/admin`}><Settings className="mr-1.5 h-4 w-4" /> Administrar</Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
                onClick={() => setConfirmLeave(true)}
              >
                <LogOut className="mr-1.5 h-4 w-4" /> Sair da organização
              </Button>
            </div>
          )}
        </div>

        {club.description && (
          <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-orange-50/85">{club.description}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2 text-xs text-orange-50/80">
          {club.home_venue && <InfoChip icon={Building2}>{club.home_venue}</InfoChip>}
          {club.contact_email && <InfoChip icon={Mail}>{club.contact_email}</InfoChip>}
          {club.contact_phone && <InfoChip icon={Phone}>{club.contact_phone}</InfoChip>}
          {club.instagram && <InfoChip icon={Instagram}>{club.instagram}</InfoChip>}
          {club.cnpj && <InfoChip icon={Hash}>CNPJ {club.cnpj}</InfoChip>}
        </div>

        {club.donation_link && (
          <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl bg-white/10 p-4 sm:flex-row sm:items-center">
            <QrCode value={club.donation_link} size={104} className="rounded-lg bg-white p-1.5" />
            <div>
              <p className="text-sm font-semibold text-white">Apoie esta organização com uma doação</p>
              <p className="mt-1 text-xs text-orange-50/80">Aponte a câmera para o QR Code ou toque no link.</p>
              <a
                href={club.donation_link}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-xs font-medium text-amber-200 underline"
              >
                {club.donation_link}
              </a>
            </div>
          </div>
        )}
      </section>

      <ActiveCampaigns clubId={clubId} />

      {!isMember && myInvite && (
        <Card className="rounded-[1.5rem] border-highlight/40 bg-highlight/[0.14]">
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-foreground">Você foi convidado para esta organização</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {myInvite.inviter_name || 'Um administrador'} convidou você a participar. Aceite para entrar e acessar eventos, mural e fórum.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
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
            <h3 className="text-base font-semibold text-foreground">Participe desta organização</h3>
            {myRequest?.status === JOIN_REQUEST_STATUS.PENDING ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-highlight/20 px-3 py-1.5 text-sm font-medium text-highlight-foreground">
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
                <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="TENHO UM CÓDIGO"
                  maxLength={12}
                  className="pl-9 uppercase tracking-[0.2em]"
                  disabled={!isAuthenticated}
                />
              </div>
              <Button type="submit" variant="outline" disabled={joinClub.isPending || !code.trim() || !isAuthenticated}>
                {joinClub.isPending ? 'Entrando…' : 'Entrar com código'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isMember && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="arena-tab-bar">
            <TabsTrigger value="members" className="arena-tab-pill"><Users className="mr-1.5 h-4 w-4" /> Membros</TabsTrigger>
            <TabsTrigger value="animals" className="arena-tab-pill"><PawPrint className="mr-1.5 h-4 w-4" /> Animais</TabsTrigger>
            <TabsTrigger value="events" className="arena-tab-pill"><CalendarDays className="mr-1.5 h-4 w-4" /> Eventos</TabsTrigger>
            <TabsTrigger value="feed" className="arena-tab-pill"><MessageSquare className="mr-1.5 h-4 w-4" /> Mural</TabsTrigger>
            <TabsTrigger value="forums" className="arena-tab-pill"><MessagesSquare className="mr-1.5 h-4 w-4" /> Fóruns</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="mt-6 px-1">
            <ClubMembersTab clubId={clubId} isAdmin={isAdmin} club={club} />
          </TabsContent>

          <TabsContent value="animals" className="mt-6 px-1">
            <ClubPetsDataGrid clubId={clubId} canManage={canManageAnimals} />
          </TabsContent>

          <TabsContent value="events" className="mt-6 px-1">
            <ClubEventsTab clubId={clubId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="feed" className="mt-6 px-1">
            <ClubFeedTab clubId={clubId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="forums" className="mt-6 px-1">
            <ClubForumsTab
              clubId={clubId}
              isAdmin={isAdmin}
              initialThreadId={threadParam}
              onThreadChange={setThreadParam}
            />
          </TabsContent>
        </Tabs>
      )}

      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title="Sair da organização"
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

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Chamados de doação ativos — visíveis a todos, não só a quem administra a organização. */
function ActiveCampaigns({ clubId }) {
  const { data: campaigns = [] } = useClubCampaigns(clubId);
  const active = campaigns.filter((c) => c.status !== CAMPAIGN_STATUS.CONCLUDED);
  if (active.length === 0) return null;

  return (
    <Card className="rounded-[1.5rem]">
      <CardContent className="space-y-4 p-5">
        <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
          <HandCoins className="h-4 w-4 text-primary" /> Chamados de doação ativos
        </h3>
        <div className="space-y-3">
          {active.map((campaign) => {
            const pct = campaign.goal > 0 ? Math.min(100, (Number(campaign.raised || 0) / campaign.goal) * 100) : 0;
            return (
              <div key={campaign.id} className="rounded-xl border border-border p-3.5">
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{campaign.title}</span>
                  {campaign.deadline && <span className="text-xs text-muted-foreground">Até {campaign.deadline}</span>}
                </div>
                <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--highlight)))]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  <strong>{brl(campaign.raised)}</strong> arrecadados de {brl(campaign.goal)}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
