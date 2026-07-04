import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, LayoutGrid, PawPrint, MessageSquare, HandCoins, Wallet, Users, ShieldCheck,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/core/lib/utils';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { CLUB_DIRECTORY_STATUS, CLUB_DIRECTORY_STATUS_LABELS } from '@/modules/communities/domain/directory';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { useClub, useMyMembership } from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, CLUB_PERMISSION } from '@/modules/organizations/domain/constants';
import { isClubOwner, hasClubPermission, hasAnyClubPermission } from '@/modules/organizations/domain/permissions';
import ClubAdminTab from '@/modules/organizations/components/ClubAdminTab';
import ClubTeamTab from '@/modules/organizations/components/ClubTeamTab';
import ClubPetsDataGrid from '@/modules/organizations/components/ClubPetsDataGrid';
import ClubFeedTab from '@/modules/organizations/components/ClubFeedTab';
import ClubDonationsTab from '@/modules/organizations/components/ClubDonationsTab';
import ClubFinanceTab from '@/modules/organizations/components/ClubFinanceTab';

const TABS = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid, permission: null },
  { key: 'animals', label: 'Animais', icon: PawPrint, permission: CLUB_PERMISSION.ANIMALS },
  { key: 'feed', label: 'Mural da ONG', icon: MessageSquare, permission: CLUB_PERMISSION.FEED },
  { key: 'donations', label: 'Chamados de Doação', icon: HandCoins, permission: CLUB_PERMISSION.DONATIONS },
  { key: 'finance', label: 'Prestação de Contas', icon: Wallet, permission: CLUB_PERMISSION.FINANCE },
  { key: 'team', label: 'Equipe', icon: Users, permission: CLUB_PERMISSION.TEAM },
  { key: 'settings', label: 'Configurações', icon: ShieldCheck, permission: 'admin_only' },
];

export default function OrganizationAdminPanel() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: club, isLoading: loadingClub } = useClub(orgId);
  const { data: membership, isLoading: loadingMembership } = useMyMembership(orgId);
  const [searchParams, setSearchParams] = useSearchParams();

  const isLoading = loadingClub || loadingMembership;
  const isAdmin = membership?.role === CLUB_ROLE.ADMIN;
  const owner = isClubOwner(club, membership);
  const canAccess = hasAnyClubPermission(club, membership);

  const visibleTabs = useMemo(() => TABS.filter((tab) => {
    if (tab.permission === null) return true;
    if (tab.permission === 'admin_only') return isAdmin;
    return hasClubPermission(club, membership, tab.permission);
  }), [club, membership, isAdmin]);

  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = visibleTabs.some((t) => t.key === requestedTab) ? requestedTab : (visibleTabs[0]?.key || 'overview');

  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!club || !membership || !canAccess) {
      toast.error('Você não tem permissão para administrar esta organização.');
      navigate(`/comunidade/${orgId}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, club, membership, canAccess, navigate, orgId]);

  if (isLoading) {
    return (
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-96 rounded-[2rem]" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <EmptyState
          icon={Building2}
          title="Organização não encontrada"
          description="A organização que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/organizacoes">Voltar</Link></Button>}
        />
      </div>
    );
  }

  if (!canAccess) return null; // useEffect acima já redireciona com o toast

  const initials = (club.name || 'A').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const location = [club.city, club.state].filter(Boolean).join(', ');

  return (
    <div className="arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/organizacoes"><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar às minhas organizações</Link>
      </Button>

      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-wrap items-start gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[19px] font-extrabold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{club.name}</h1>
              <Badge className="rounded-full border-0 bg-white/10 text-white hover:bg-white/10">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Administração
              </Badge>
              {club.community_name && (
                <Badge className="rounded-full border-0 bg-white/10 text-white hover:bg-white/10">
                  Comunidade · {club.community_name}
                </Badge>
              )}
              {(club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE) !== CLUB_DIRECTORY_STATUS.ACTIVE && (
                <Badge className="rounded-full border-0 bg-white/10 text-white hover:bg-white/10">
                  {CLUB_DIRECTORY_STATUS_LABELS[club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE]}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-orange-50/80">
              Painel de administração{location ? ` · ${location}` : ''}
              {owner && ' · Você é o proprietário'}
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="arena-tab-bar">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className={cn('arena-tab-pill', 'gap-1.5')}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-6 px-1">
          <OverviewTab club={club} />
        </TabsContent>
        <TabsContent value="animals" className="mt-6 px-1">
          <ClubPetsDataGrid clubId={orgId} />
        </TabsContent>
        <TabsContent value="feed" className="mt-6 px-1">
          <ClubFeedTab clubId={orgId} isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="donations" className="mt-6 px-1">
          <ClubDonationsTab clubId={orgId} />
        </TabsContent>
        <TabsContent value="finance" className="mt-6 px-1">
          <ClubFinanceTab clubId={orgId} />
        </TabsContent>
        <TabsContent value="team" className="mt-6 px-1">
          <ClubTeamTab club={club} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6 px-1">
          <ClubAdminTab club={club} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({ club }) {
  const founded = club.created_at?.toDate ? club.created_at.toDate().getFullYear() : null;
  const { data: pets = [] } = useMyPets(club.id);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard value={pets.length} label="Animais cadastrados" />
        <StatCard value={club.member_count || 0} label="Seguidores" />
        <StatCard value={founded || '—'} label="Fundação" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold">Sobre a organização</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {club.description || 'Nenhuma descrição cadastrada ainda.'}
        </p>
      </div>
    </div>
  );
}

function StatCard({ value, label }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-[21px] font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
