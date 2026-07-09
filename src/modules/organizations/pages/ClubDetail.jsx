import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Building2, ArrowLeft, Settings, Info, Instagram, Mail, Phone, Heart } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { getClub } from '../services/clubService';
import { isClubPubliclyVisible, CLUB_DIRECTORY_STATUS } from '@/modules/communities/domain/directory';
import { useMyMembership, useRequestToJoinClub, useMyJoinRequests, useMyClubInvites } from '../hooks/useClubs';
import { JOIN_REQUEST_STATUS } from '@/modules/organizations/domain/constants';
import { hasClubPermission, isClubOwner } from '../domain/permissions';
import { CLUB_PERMISSION } from '../domain/constants';
import ClubPetsDataGrid from '../components/ClubPetsDataGrid';

function RatingBadge({ uid, className }) {
  return null;
}

export default function ClubDetail() {
  const { orgId } = useParams();
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('pets');

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['club', orgId],
    queryFn: () => getClub(orgId),
    enabled: Boolean(orgId),
  });

  const { membership, isLoading: loadingMembership } = useMyMembership(orgId, user?.uid);
  // isMember: doc de membership existe OU user é o criador da ONG (legacy sem doc).
  // O campo correto do doc é `club.created_by` (não `owner_id`).
  const isMember = Boolean(
    membership || (club?.created_by && user?.uid && club.created_by === user?.uid),
  );
  // isAdmin: tem qualquer permissão (incluindo owner via created_by).
  // Sem isso o criador de uma ONG legada (sem doc em organization_members)
  // não consegue Administrar nem gerenciar pets.
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
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-40 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
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

  const location = [club.city, club.state].filter(Boolean).join(' / ');

  return (
    <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/organizacoes"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar</Link>
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
              </div>
              
              {isMember && (
                <Badge variant={isAdmin ? 'warning' : 'success'} className="mt-3 rounded-full uppercase tracking-[0.12em]">
                  {isAdmin ? 'Você é admin' : 'Você é membro da equipe'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2.5">
            {isAdmin && (
              <Button
                asChild
                size="sm"
                className="border-0 bg-white text-foreground hover:bg-secondary"
              >
                <Link to={`/organizacoes/${orgId}/admin`}><Settings className="mr-1.5 h-4 w-4" /> Administrar</Link>
              </Button>
            )}
            {!isMember && (
              <>
                {isInvited ? (
                  <Button size="sm" variant="outline" className="border-warning text-warning hover:bg-warning/10" disabled>
                    Você foi convidado — abrir
                  </Button>
                ) : isPending ? (
                  <Button size="sm" variant="outline" disabled>
                    Pedido enviado
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={handleRequest} disabled={requestToJoin.isPending}>
                    {requestToJoin.isPending ? 'Enviando...' : 'Pedir para ingressar'}
                  </Button>
                )}
              </>
            )}
            {club.donation_link && (
              <Button asChild size="sm" className="bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white hover:opacity-90">
                <a href={club.donation_link} target="_blank" rel="noreferrer">
                  <Heart className="mr-1.5 h-4 w-4" /> Ajudar (Doar)
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
        <div className="overflow-x-auto pb-2 scrollbar-none">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-transparent p-0 sm:gap-2">
            <TabsTrigger value="pets" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Pets para adoção
            </TabsTrigger>
            <TabsTrigger value="sobre" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Sobre a ONG
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pets" className="min-h-[400px] outline-none">
          <ClubPetsDataGrid clubId={orgId} canManage={isAdmin} />
        </TabsContent>

        <TabsContent value="sobre" className="outline-none">
          <div className="arena-panel-strong rounded-2xl p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-bold text-lg text-white mb-2 flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" /> Nossa Missão
              </h3>
              <p className="text-orange-50/90 leading-7 whitespace-pre-wrap">
                {club.description || 'Esta ONG ainda não adicionou uma descrição.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {club.contact_email && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/10">
                  <Mail className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-orange-50/60 uppercase font-bold tracking-wider">E-mail</p>
                    <p className="text-sm font-medium text-white">{club.contact_email}</p>
                  </div>
                </div>
              )}
              {club.contact_phone && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/10">
                  <Phone className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-orange-50/60 uppercase font-bold tracking-wider">Telefone</p>
                    <p className="text-sm font-medium text-white">{club.contact_phone}</p>
                  </div>
                </div>
              )}
              {club.instagram && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/10">
                  <Instagram className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-orange-50/60 uppercase font-bold tracking-wider">Instagram</p>
                    <a href={`https://instagram.com/${club.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-highlight hover:underline">
                      {club.instagram}
                    </a>
                  </div>
                </div>
              )}
              {club.cnpj && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-black/10">
                  <Building2 className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-orange-50/60 uppercase font-bold tracking-wider">CNPJ</p>
                    <p className="text-sm font-medium text-white">{club.cnpj}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
