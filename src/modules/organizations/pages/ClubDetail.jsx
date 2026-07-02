import React, { useState } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
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
} from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, JOIN_REQUEST_STATUS } from '@/modules/organizations/domain/constants';
import ClubMembersTab from '@/modules/organizations/components/ClubMembersTab';
import ClubEventsTab from '@/modules/organizations/components/ClubEventsTab';
import ClubFeedTab from '@/modules/organizations/components/ClubFeedTab';
import ClubForumsTab from '@/modules/organizations/components/ClubForumsTab';
import ClubAdminTab from '@/modules/organizations/components/ClubAdminTab';
import ClubPetsDataGrid from '@/modules/organizations/components/ClubPetsDataGrid';
import RatingBadge from '@/modules/pets/components/RatingBadge';
import { QrCode } from '@/components/ui/qr-code';
import AdSlot from '@/components/AdSlot';

export default function ClubDetail() {
  const { clubId } = useParams();
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
  const activeTab = searchParams.get('tab') || 'members';
  const threadParam = searchParams.get('thread') || null;

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
  const canEditPets = isAdmin || membership?.permissions?.edit_pets === true;

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      await joinClub.mutateAsync(code.trim());
      toast.success('Você entrou no clube!');
      setCode('');
    } catch (err) {
      toast.error(err.message || 'Código inválido para este clube.');
    }
  };

  const handleLeave = async () => {
    try {
      await leaveClub.mutateAsync();
      toast.success('Você saiu do clube.');
      setConfirmLeave(false);
      navigate('/organizacoes');
    } catch (err) {
      toast.error(err.message || 'Não foi possível sair do clube.');
    }
  };

  const handleRequestJoin = async () => {
    try {
      const res = await requestToJoin.mutateAsync(club);
      if (res?.alreadyMember) toast.success('Você já é membro deste clube.');
      else toast.success('Pedido enviado! Os administradores foram avisados.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível enviar o pedido.');
    }
  };

  const handleAcceptInvite = async () => {
    try {
      await acceptInvite.mutateAsync(myInvite);
      toast.success('Convite aceito! Bem-vindo ao clube.');
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
      <div className="mx-auto max-w-4xl space-y-4">
        <Skeleton className="h-40 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="mx-auto max-w-2xl">
        <EmptyState
          icon={Building2}
          title="Clube não encontrado"
          description="O clube que você procura não existe ou foi removido."
          action={<Button asChild><Link to="/organizacoes">Voltar para clubes</Link></Button>}
        />
      </div>
    );
  }

  const location = [club.city, club.state].filter(Boolean).join(' / ');

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <Button asChild variant="ghost" size="sm" className="text-orange-50 hover:bg-white/10 hover:text-white">
        <Link to="/organizacoes"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para clubes</Link>
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
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setConfirmLeave(true)}
            >
              <LogOut className="mr-1.5 h-4 w-4" /> Sair do clube
            </Button>
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
              <p className="text-sm font-semibold text-white">Apoie este clube com uma doação</p>
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
              <Button type="submit" variant="outline" disabled={joinClub.isPending || !code.trim() || !isAuthenticated}>
                {joinClub.isPending ? 'Entrando…' : 'Entrar com código'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isMember && (
        <Tabs value={(activeTab === 'admin' || (activeTab === 'pets' && !canEditPets)) && !isAdmin ? 'members' : activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/60 p-1">
            <TabsTrigger value="members"><Users className="mr-1.5 h-4 w-4" /> Membros</TabsTrigger>
            <TabsTrigger value="events"><CalendarDays className="mr-1.5 h-4 w-4" /> Eventos</TabsTrigger>
            <TabsTrigger value="feed"><MessageSquare className="mr-1.5 h-4 w-4" /> Mural</TabsTrigger>
            <TabsTrigger value="forums"><MessagesSquare className="mr-1.5 h-4 w-4" /> Fóruns</TabsTrigger>
            {canEditPets && <TabsTrigger value="pets"><PawPrint className="mr-1.5 h-4 w-4" /> Pets</TabsTrigger>}
            {isAdmin && <TabsTrigger value="admin"><Settings className="mr-1.5 h-4 w-4" /> Administração</TabsTrigger>}
          </TabsList>

          <TabsContent value="members" className="mt-4">
            <ClubMembersTab clubId={clubId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="events" className="mt-4">
            <ClubEventsTab clubId={clubId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="feed" className="mt-4">
            <ClubFeedTab clubId={clubId} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="forums" className="mt-4">
            <ClubForumsTab
              clubId={clubId}
              isAdmin={isAdmin}
              initialThreadId={threadParam}
              onThreadChange={setThreadParam}
            />
          </TabsContent>

          {canEditPets && (
            <TabsContent value="pets" className="mt-4 space-y-4">
              <AdSlot />
              <ClubPetsDataGrid clubId={clubId} />
            </TabsContent>
          )}

          {isAdmin && (
            <TabsContent value="admin" className="mt-4">
              <ClubAdminTab club={club} />
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
