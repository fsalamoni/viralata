import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, MessageSquare, MessageCircle, Info, Settings } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { getCommunity, joinCommunity } from '../services/communityService';
import { deriveCommunityMembershipState } from '../domain/permissions';
import { useMyCommunityMembership } from '../hooks/useCommunities';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { toast } from 'sonner';

import MuralTab from '../components/MuralTab';
import ForumTab from '../components/ForumTab';
import EventsTab from '../components/EventsTab';
import AboutTab from '../components/AboutTab';
import CommunityTeamTab from '../components/CommunityTeamTab';
import CommunityDebugPanel from '../components/CommunityDebugPanel';
import CommunityCover from '../components/CommunityCover';
import { cn } from '@/core/lib/utils';

/** Abas públicas da comunidade (modo padrão, sem `arena-tab-bar`). */
const TABS_LEGACY = [
  { key: 'mural', label: 'Mural', icon: MessageSquare },
  { key: 'forum', label: 'Fórum', icon: MessageCircle },
  { key: 'eventos', label: 'Eventos', icon: Calendar },
  { key: 'sobre', label: 'Sobre', icon: Info },
];

/** Abas públicas no modo paridade ONG (com `arena-tab-bar` da plataforma). */
const TABS_PARITY = [
  { key: 'mural', label: 'Mural', icon: MessageSquare },
  { key: 'forum', label: 'Fórum', icon: MessageCircle },
  { key: 'eventos', label: 'Eventos', icon: Calendar },
  { key: 'sobre', label: 'Sobre', icon: Info },
];

export default function CommunityDetail() {
  const { communityId } = useParams();
  const { user } = useAuth();
  const [community, setCommunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('mural');

  // Flag da paridade ONG. Default OFF — quando o admin ligar, a página
  // pública da comunidade passa a usar `<CommunityCover>` (mesmo padrão
  // visual do `<ClubCover>`) e a `arena-tab-bar` ao invés do
  // `h-auto w-full flex-wrap` original. Mantém o comportamento atual
  // byte-a-byte com a flag desligada.
  const parityEnabled = useFeatureFlag(FEATURE_FLAG.COMMUNITY_NGO_PARITY);

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
      // membership vai chegar via useMyCommunityMembership — isMember deriva de lá
      toast.success('Você entrou na comunidade!');
    } catch (err) {
      toast.error('Erro ao entrar');
    }
  };

  // Stats para a capa (modo paridade) — derivado aqui para manter
  // consistência entre o `<CommunityCover>` e qualquer outro componente
  // que precisar dos mesmos números.
  const stats = React.useMemo(() => {
    if (!community) return null;
    return {
      members: community.member_count || 1,
      founded: community.created_at?.toDate ? community.created_at.toDate().getFullYear() : null,
    };
  }, [community]);

  if (loading) return <div className={loadingClass}><Skeleton className="h-64 rounded-3xl" /></div>;
  if (!community) return <div>Comunidade não encontrada</div>;

  return (
    <div className={successClass}>
      <Button variant="ghost" size="sm" asChild>
        <Link to="/comunidade"><ArrowLeft className="mr-2 w-4 h-4" /> Voltar</Link>
      </Button>

      {/* Modo PARIDADE (flag ON): usa o `<CommunityCover>` espelhado do
          `<ClubCover>` da ONG — banner gradiente, avatar-iniciais
          sobreposto, nome, cidade e chips Padronizados. O botão "Editar"
          / "Painel Administrativo" já fica embutido no canto do banner. */}
      {parityEnabled && (
        <CommunityCover community={community} stats={stats} isAdmin={canAdmin} />
      )}

      {/* Painel de diagnóstico temporário — remover após identificar a causa */}
      <CommunityDebugPanel
        community={community}
        membership={membership}
        user={user}
        canAdmin={canAdmin}
        isMember={isMember}
        onClaimed={refreshCommunity}
      />

      {/* Modo LEGADO (flag OFF): capa-flat simples com nome + contagem
          de membros + botões "Editar" / "Participar". Mantido idêntico
          ao original byte-a-byte. */}
      {!parityEnabled && (
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
      )}

      {/* Ações "Participar" no modo paridade — vão à direita das abas
          (mesmo padrão do "Pedir para ingressar" da ONG). A
          `arena-tab-bar` e o botão ficam em um flex row com
          `border-b` para o delineador. */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className={parityEnabled ? 'w-full' : 'w-full space-y-5'}>
        {parityEnabled ? (
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
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-xl bg-transparent p-0 sm:gap-2">
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
