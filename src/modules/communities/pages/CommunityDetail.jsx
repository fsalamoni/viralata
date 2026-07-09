import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, MessageSquare, MessageCircle, Info } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getCommunity, joinCommunity } from '../services/communityService';
import { hasAnyCommunityPermission, deriveCommunityMembershipState } from '../domain/permissions';
import { useMyCommunityMembership } from '../hooks/useCommunities';

import { Settings } from 'lucide-react';
import { toast } from 'sonner';

import MuralTab from '../components/MuralTab';
import ForumTab from '../components/ForumTab';
import EventsTab from '../components/EventsTab';
import AboutTab from '../components/AboutTab';
import CommunityTeamTab from '../components/CommunityTeamTab';
import CommunityDebugPanel from '../components/CommunityDebugPanel';

export default function CommunityDetail() {
  const { communityId } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mural');

  useEffect(() => {
    getCommunity(communityId)
      .then(setCommunity)
      .catch(() => toast.error('Comunidade não encontrada'))
      .finally(() => setLoading(false));
  }, [communityId]);

  // Depois de um claim de ownership (comunidade órfã → owner_id = user.uid),
  // recarrega o doc da comunidade pra todos os cálculos (canAdmin, Mural,
  // Eventos, etc.) refletirem o novo owner_id.
  const refreshCommunity = () => {
    setLoading(true);
    getCommunity(communityId)
      .then(setCommunity)
      .catch(() => toast.error('Comunidade não encontrada'))
      .finally(() => setLoading(false));
  };

  const { data: membership } = useMyCommunityMembership(communityId);

  // IMPORTANTE: derivar isMember/isAdmin diretamente de community + membership + user.
  // Antes (commit bug): tinha um useEffect que setava isAdmin a partir de
  // membership.role==='admin' e IGNORAVA o fallback por community.owner_id.
  // Resultado: dono de comunidade LEGADA (sem doc community_members) não
  // conseguia postar no Mural nem criar Eventos — mesmo já tendo acesso
  // ao botão Editar/Equipe (esses usavam canAdmin corretamente).
  //
  // Regra única de verdade: `deriveCommunityMembershipState` consolida os
  // dois caminhos (membership doc OU owner_id direto) e retorna
  // { isMember, canAdmin }. Tudo (botão Editar, aba Equipe, mural post
  // form, eventos create) consome canAdmin ou o objeto community/membership
  // diretamente para calcular suas próprias permissões granulares.
  const { isMember, canAdmin } = deriveCommunityMembershipState(community, membership, user?.uid);

  const handleJoin = async () => {
    if (!user) return toast.error('Faça login para participar');
    try {
      await joinCommunity(communityId, user.uid);
      // membership vai chegar via useMyCommunityMembership — isMember deriva de lá
      toast.success('Você entrou na comunidade!');
    } catch (err) {
      toast.error('Erro ao entrar');
    }
  };

  if (loading) return <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 space-y-6"><Skeleton className="h-64 rounded-3xl" /></div>;
  if (!community) return <div>Comunidade não encontrada</div>;

  return (
    <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/comunidade"><ArrowLeft className="mr-2 w-4 h-4" /> Voltar</Link>
      </Button>

      {/* Painel de diagnóstico temporário — remover após identificar a causa */}
      <CommunityDebugPanel
        community={community}
        membership={membership}
        user={user}
        canAdmin={canAdmin}
        isMember={isMember}
        onClaimed={refreshCommunity}
      />

      <section className="arena-panel-strong overflow-hidden rounded-3xl relative min-h-[200px] flex items-end p-6">
        {community.cover_url && (
          <img src={community.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-5">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-transparent p-0 sm:gap-2">
          <TabsTrigger value="mural" className="rounded-lg data-[state=active]:bg-primary">
            <MessageSquare className="mr-2 h-4 w-4" /> Mural
          </TabsTrigger>
          <TabsTrigger value="forum" className="rounded-lg data-[state=active]:bg-primary">
            <MessageCircle className="mr-2 h-4 w-4" /> Fórum
          </TabsTrigger>
          <TabsTrigger value="eventos" className="rounded-lg data-[state=active]:bg-primary">
            <Calendar className="mr-2 h-4 w-4" /> Eventos
          </TabsTrigger>
          <TabsTrigger value="sobre" className="rounded-lg data-[state=active]:bg-primary">
            <Info className="mr-2 h-4 w-4" /> Sobre
          </TabsTrigger>
          {canAdmin && (
            <TabsTrigger value="equipe" className="rounded-lg data-[state=active]:bg-primary">
              <Users className="mr-2 h-4 w-4" /> Equipe
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="mural"><MuralTab communityId={communityId} isMember={isMember} isAdmin={canAdmin} membership={membership} community={community} /></TabsContent>
        <TabsContent value="forum"><ForumTab communityId={communityId} /></TabsContent>
        <TabsContent value="eventos"><EventsTab communityId={communityId} isAdmin={canAdmin} membership={membership} community={community} /></TabsContent>
        <TabsContent value="sobre"><AboutTab community={community} /></TabsContent>
        {canAdmin && (
          <TabsContent value="equipe">
            <CommunityTeamTab community={community} membership={membership} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
