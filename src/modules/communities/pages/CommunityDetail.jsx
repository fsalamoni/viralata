import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, MessageSquare, MessageCircle, Info, LogOut } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }
  if (!community) {
    return (
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={Users}
          title="Comunidade não encontrada"
          description="A comunidade que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/comunidade">Voltar para comunidades</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
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
        </TabsList>

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
    </div>
  );
}
