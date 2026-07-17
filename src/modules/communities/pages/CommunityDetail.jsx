import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, Calendar, MessageSquare, MessageCircle, Info, Settings, Building2 } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabsContentStack, BalancedTabsContent } from '@/components/ui/BalancedTabs';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
import CommunityCover from '../components/CommunityCover';
import { cn } from '@/core/lib/utils';
import { parseTimestamp } from '@/core/utils/timestamp';

/** Abas da comunidade — organizadas em 2 grupos semânticos (padrão DS_V2 2-layer). */
const TABS_PUBLIC = [
  { key: 'mural', label: 'Mural', icon: MessageSquare },
  { key: 'forum', label: 'Fórum', icon: MessageCircle },
  { key: 'eventos', label: 'Eventos', icon: Calendar },
  { key: 'sobre', label: 'Sobre', icon: Info },
];
const TABS_ADMIN = [
  { key: 'equipe', label: 'Equipe', icon: Users },
];

/** Abas legacy (paridade OFF — mantidas para transição). */
const TABS_LEGACY = [
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
  const [searchParams, setSearchParams] = useSearchParams();
  // ─── Tab state — 2-layer: ?tab=group:sub ───
  // Supports legacy single-key (?tab=mural) for backwards compat.
  const urlTab = searchParams.get('tab');
  const isLegacyFormat = TABS_LEGACY.some(t => t.key === urlTab) ||
    TABS_ADMIN.some(t => t.key === urlTab);
  const tabParts = urlTab ? urlTab.split(':') : [];
  const activeGroup = isLegacyFormat ? 'content' : (tabParts[0] || 'content');
  const activeSubKey = isLegacyFormat ? urlTab : (tabParts[1] || 'mural');
  const activeTab = activeSubKey;

  function setActiveTab(subKey) {
    const next = new URLSearchParams(searchParams);
    next.set('tab', `${activeGroup}:${subKey}`);
    setSearchParams(next, { replace: true });
  }
  function setActiveGroup(group) {
    const next = new URLSearchParams(searchParams);
    const defaultSub = group === 'content' ? 'mural' : 'equipe';
    next.set('tab', `${group}:${defaultSub}`);
    setSearchParams(next, { replace: true });
  }

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
      founded: parseTimestamp(community.created_at)?.getFullYear() ?? null,
    };
  }, [community]);

  if (loading) return <div className={loadingClass}><Skeleton className="h-64 rounded-3xl" /></div>;
  if (!community) {
    return (
      <div className={loadingClass}>
        <EmptyState
          icon={Building2}
          title="Comunidade não encontrada"
          description="A comunidade que você procura não existe, foi removida ou você não tem permissão para visualizá-la."
          action={(
            <Button asChild>
              <Link to="/comunidade">Ver todas as comunidades</Link>
            </Button>
          )}
        />
      </div>
    );
  }

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
    <TabsContentStack>
        {/* ─── Barra de navegação 2-layer (padrão DS_V2) ─── */}
        <div className="flex flex-nowrap items-end justify-between gap-3 overflow-x-auto border-b border-border/60 pb-1">
          {/* Grupo 1: Conteúdo (sempre visível) */}
          <div className="flex flex-wrap items-center gap-1">
            <TabsList className="arena-admin-tabs">
              <TabsTrigger
                value="content"
                className="arena-admin-tab-trigger font-semibold"
                onClick={() => setActiveGroup('content')}
              >
                Conteúdo
              </TabsTrigger>
            </TabsList>
            {/* Sub-pills do grupo Conteúdo */}
            <div className="arena-subtab-bar">
              {TABS_PUBLIC.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'arena-subtab-trigger gap-1.5',
                    activeTab === tab.key && 'active',
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grupo 2: Gestão (só se admin) */}
          {canAdmin && (
            <div className="flex flex-wrap items-center gap-1">
              <TabsList className="arena-admin-tabs">
                <TabsTrigger
                  value="management"
                  className="arena-admin-tab-trigger font-semibold"
                  onClick={() => setActiveGroup('management')}
                >
                  Gestão
                </TabsTrigger>
              </TabsList>
              {/* Sub-pills do grupo Gestão */}
              <div className="arena-subtab-bar">
                {TABS_ADMIN.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'arena-subtab-trigger gap-1.5',
                      activeTab === tab.key && 'active',
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botão Participar (não-membro, não-admin) */}
          {!isMember && !canAdmin && (
            <div className="pb-2">
              <Button size="sm" onClick={handleJoin}>
                Participar
              </Button>
            </div>
          )}
        </div>

        {/* ─── Tab contents (renderizados via tab key direto) ─── */}
        <BalancedTabsContent value="mural"><MuralTab communityId={communityId} isMember={isMember} isAdmin={canAdmin} membership={membership} community={community} /></BalancedTabsContent>
        <BalancedTabsContent value="forum"><ForumTab communityId={communityId} /></BalancedTabsContent>
        <BalancedTabsContent value="eventos"><EventsTab communityId={communityId} isAdmin={canAdmin} membership={membership} community={community} /></BalancedTabsContent>
        <BalancedTabsContent value="sobre"><AboutTab community={community} /></BalancedTabsContent>
        {canAdmin && (
          <BalancedTabsContent value="equipe">
            <CommunityTeamTab community={community} membership={membership} />
          </BalancedTabsContent>
        )}
      </TabsContentStack>
    </Tabs>
    </div>
  );
}
