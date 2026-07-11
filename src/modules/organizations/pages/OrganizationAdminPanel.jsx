import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, LayoutGrid, PawPrint, MessageSquare, HandCoins, Wallet, Users, ShieldCheck, Info, MessageCircle, BarChart2, TrendingUp,
  LayoutDashboard, Kanban, Eye, Heart, Stethoscope, Pill, Clock, Home,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/core/lib/utils';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { CLUB_DIRECTORY_STATUS, CLUB_DIRECTORY_STATUS_LABELS } from '@/modules/communities/domain/directory';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { useClub, useMyMembership } from '@/modules/organizations/hooks/useClubs';
import { CLUB_ROLE, CLUB_PERMISSION } from '@/modules/organizations/domain/constants';
import { isClubOwner, hasAnyClubPermission, visibleAdminTabs, hasClubPermission } from '@/modules/organizations/domain/permissions';
import ClubAdminTab from '@/modules/organizations/components/ClubAdminTab';
import ClubTeamTab from '@/modules/organizations/components/ClubTeamTab';
import ClubPetsDataGrid from '@/modules/organizations/components/ClubPetsDataGrid';
import ClubFeedTab from '@/modules/organizations/components/ClubFeedTab';
import ClubDonationsTab from '@/modules/organizations/components/ClubDonationsTab';
import ClubFinanceTab from '@/modules/organizations/components/ClubFinanceTab';
import ClubGeneralAdminTab from '@/modules/organizations/components/ClubGeneralAdminTab';
import ClubChatAdminTab from '@/modules/organizations/components/ClubChatAdminTab';
import ClubThemedScope from '@/modules/organizations/components/ClubThemedScope';
import { ShelterPetScopedTab } from '@/modules/organizations/components/ShelterPetScopedTab';
import { useFeatureFlag, FEATURE_FLAG } from '@/core/lib/FeatureFlagsContext';
import ReportsTab from '@/modules/shelter/components/ReportsTab';
import IndicatorsTab from '@/modules/shelter/components/IndicatorsTab';
import { DashboardPage } from '@/modules/shelter/components/DashboardPage';
import { KanbanPage } from '@/modules/shelter/components/KanbanPage';
import { ExhibitionsList } from '@/modules/shelter/components/ExhibitionsList';
import { VolunteersRoster } from '@/modules/shelter/components/VolunteersRoster';
import { MedicalRecordsList } from '@/modules/shelter/components/MedicalRecordsList';
import { MedicationsList } from '@/modules/shelter/components/MedicationsList';
import { TimelineList } from '@/modules/shelter/components/TimelineList';
import { FostersList } from '@/modules/shelter/components/FostersList';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

const TAB_ICONS = {
  overview: LayoutGrid,
  general: Info,
  animals: PawPrint,
  feed: MessageSquare,
  donations: HandCoins,
  finance: Wallet,
  reports: BarChart2,
  indicators: TrendingUp,
  team: Users,
  chat: MessageCircle,
  settings: ShieldCheck,
  // Shelter tabs
  dashboard: LayoutDashboard,
  kanban: Kanban,
  exhibitions: Eye,
  volunteers: Heart,
  medical_records: Stethoscope,
  medications: Pill,
  timeline: Clock,
  foster: Home,
};

const TAB_PERMISSION = {
  overview: null,
  general: 'team',     // aba Geral visível para qualquer um com permissão
  animals: CLUB_PERMISSION.ANIMALS,
  feed: CLUB_PERMISSION.FEED,
  donations: CLUB_PERMISSION.DONATIONS,
  finance: CLUB_PERMISSION.FINANCE,
  team: CLUB_PERMISSION.TEAM,
  chat: 'team',        // chat requer permissão de team
  settings: 'admin_only',
};

export default function OrganizationAdminPanel() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: club, isLoading: loadingClub } = useClub(orgId);
  const { data: membership, isLoading: loadingMembership } = useMyMembership(orgId);
  const [searchParams, setSearchParams] = useSearchParams();

  // Shelter feature flags
  const [shelterFoundation] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION);
  const [shelterDashboard] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD);
  const [shelterKanban] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_KANBAN);
  const [shelterReports] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_REPORTS);
  const [shelterIndicators] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_INDICATORS);
  const [shelterExhibitions] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_EXHIBITIONS);
  const [shelterVolunteers] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS);
  const [shelterHealthRecords] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_HEALTH_RECORDS);
  const [shelterMedication] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_MEDICATION);
  const [shelterPetTimeline] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_PET_TIMELINE);
  const [shelterFoster] = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOSTER);

  const isLoading = loadingClub || loadingMembership;
  // Fallback por uid (ONG legada sem doc de membership) — sem isso o
  // criador não consegue Administrar nem ver as abas admin.
  const owner = isClubOwner(club, membership, user?.uid);
  const isAdmin = isClubOwner(club, membership, user?.uid) || membership?.role === CLUB_ROLE.ADMIN;
  const canAccess = hasAnyClubPermission(club, membership, user?.uid);

  // Hooks de classe do wrapper. Devem ficar ANTES dos early-returns —
  // chamá-los depois violaria as rules-of-hooks do React.
  const loadingClass = useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-6 px-5 py-6 pb-12');
  const errorClass = useArenaPageClasses('arena-page mx-auto max-w-2xl px-5 py-6 pb-12');
  const successClass = useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-8 px-5 py-6 pb-12 sm:space-y-10');

  // Permissões granulares efetivas do viewer (usadas para esconder/mostrar
  // botões dentro de cada aba). `hasClubPermission` já cobre o owner e a
  // compatibilidade de admin legado (sem `permissions` map).
  const canManageAnimals = hasClubPermission(club, membership, CLUB_PERMISSION.ANIMALS, user?.uid);
  const canManageFeed = hasClubPermission(club, membership, CLUB_PERMISSION.FEED, user?.uid);
  const canManageDonations = hasClubPermission(club, membership, CLUB_PERMISSION.DONATIONS, user?.uid);
  const canManageFinance = hasClubPermission(club, membership, CLUB_PERMISSION.FINANCE, user?.uid);
  const canManageTeam = hasClubPermission(club, membership, CLUB_PERMISSION.TEAM, user?.uid);

  const visibleTabs = useMemo(() => {
    const list = visibleAdminTabs({ club, membership, currentUserUid: user?.uid, isAdmin });
    return list.map((tab) => ({
      key: tab.key,
      label: tab.label,
      icon: TAB_ICONS[tab.key] || Info,
      permission: tab.permission,
    }));
  }, [club, membership, isAdmin, user?.uid]);

  // Shelter tabs visíveis com feature flag gating
  const shelterTabs = useMemo(() => {
    const tabs = [];
    if (shelterFoundation && shelterDashboard) {
      tabs.push({ key: 'dashboard', label: 'Dashboard', icon: TAB_ICONS.dashboard, permission: 'animals' });
    }
    if (shelterFoundation && shelterKanban) {
      tabs.push({ key: 'kanban', label: 'Pendências', icon: TAB_ICONS.kanban, permission: 'animals' });
    }
    if (shelterFoundation && shelterExhibitions) {
      tabs.push({ key: 'exhibitions', label: 'Vitrines', icon: TAB_ICONS.exhibitions, permission: 'animals' });
    }
    if (shelterFoundation && shelterVolunteers) {
      tabs.push({ key: 'volunteers', label: 'Voluntários', icon: TAB_ICONS.volunteers, permission: 'team' });
    }
    if (shelterFoundation && shelterHealthRecords) {
      tabs.push({ key: 'medical_records', label: 'Prontuário', icon: TAB_ICONS.medical_records, permission: 'animals' });
    }
    if (shelterFoundation && shelterMedication) {
      tabs.push({ key: 'medications', label: 'Medicação', icon: TAB_ICONS.medications, permission: 'animals' });
    }
    if (shelterFoundation && shelterPetTimeline) {
      tabs.push({ key: 'timeline', label: 'Timeline', icon: TAB_ICONS.timeline, permission: 'animals' });
    }
    if (shelterFoundation && shelterFoster) {
      tabs.push({ key: 'foster', label: 'Lares Temporários', icon: TAB_ICONS.foster, permission: 'animals' });
    }
    return tabs;
  }, [shelterFoundation, shelterDashboard, shelterKanban, shelterExhibitions, shelterVolunteers, shelterHealthRecords, shelterMedication, shelterPetTimeline, shelterFoster]);

  const allVisibleTabs = useMemo(() => [...visibleTabs, ...shelterTabs], [visibleTabs, shelterTabs]);

  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = allVisibleTabs.some((t) => t.key === requestedTab) ? requestedTab : (allVisibleTabs[0]?.key || 'overview');

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
      <div className={loadingClass}>
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-96 rounded-[2rem]" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className={errorClass}>
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

  // Feature flag para Reports e Indicators
  const showReportsTab = shelterFoundation && shelterReports;
  const showIndicatorsTab = shelterFoundation && shelterIndicators;

  const initials = (club.name || 'A').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const location = [club.city, club.state].filter(Boolean).join(', ');

  return (
    <ClubThemedScope club={club} className={successClass}>
      <Button asChild variant="ghost" size="sm">
        {/* Saindo do painel admin, o usuário volta direto à PÁGINA
            PÚBLICA da ONG (perfil / home), não à central de organizações.
            Comportamento esperado em qualquer aba do painel admin. */}
        <Link to={`/organizacoes/${orgId}`}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para a ONG
        </Link>
      </Button>

      {/* Header do painel admin — padding generoso (p-6 sm:p-10) e
          gap-5 sm:gap-6 entre o avatar e o bloco de texto. Mais respiro
          que o p-5 sm:p-8 antigo. */}
      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-6 sm:rounded-[2rem] sm:p-10">
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
          {allVisibleTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className={cn('arena-tab-pill gap-1.5')}>
              <tab.icon className="h-4 w-4" /> {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-12 px-1 sm:mt-14">
          <OverviewTab club={club} />
        </TabsContent>
        <TabsContent value="general" className="mt-12 px-1 sm:mt-14">
          <ClubGeneralAdminTab club={club} />
        </TabsContent>
        <TabsContent value="animals" className="mt-12 px-1 sm:mt-14">
          <ClubPetsDataGrid clubId={orgId} canManage={canManageAnimals} />
        </TabsContent>
        <TabsContent value="feed" className="mt-12 px-1 sm:mt-14">
          <ClubFeedTab clubId={orgId} club={club} membership={membership} canManageFeed={canManageFeed} />
        </TabsContent>
        <TabsContent value="donations" className="mt-12 px-1 sm:mt-14">
          <ClubDonationsTab clubId={orgId} club={club} membership={membership} canManage={canManageDonations} />
        </TabsContent>
        <TabsContent value="finance" className="mt-12 px-1 sm:mt-14">
          <ClubFinanceTab clubId={orgId} canManage={canManageFinance} />
        </TabsContent>
        {showReportsTab && (
          <TabsContent value="reports" className="mt-12 px-1 sm:mt-14">
            <ReportsTab clubId={orgId} />
          </TabsContent>
        )}
        {showIndicatorsTab && (
          <TabsContent value="indicators" className="mt-12 px-1 sm:mt-14">
            <IndicatorsTab clubId={orgId} />
          </TabsContent>
        )}
        <TabsContent value="chat" className="mt-12 px-1 sm:mt-14">
          <ClubChatAdminTab club={club} />
        </TabsContent>
        <TabsContent value="team" className="mt-12 px-1 sm:mt-14">
          <ClubTeamTab club={club} viewerMembership={membership} viewerUid={user?.uid} />
        </TabsContent>
        <TabsContent value="settings" className="mt-12 px-1 sm:mt-14">
          <ClubAdminTab club={club} />
        </TabsContent>
        {/* Shelter Tabs com Feature Flag Gating */}
        {shelterFoundation && shelterDashboard && (
          <TabsContent value="dashboard" className="mt-12 px-1 sm:mt-14">
            <DashboardPage clubId={orgId} />
          </TabsContent>
        )}
        {shelterFoundation && shelterKanban && (
          <TabsContent value="kanban" className="mt-12 px-1 sm:mt-14">
            <KanbanPage clubId={orgId} />
          </TabsContent>
        )}
        {shelterFoundation && shelterExhibitions && (
          <TabsContent value="exhibitions" className="mt-12 px-1 sm:mt-14">
            <ExhibitionsList shelterClubId={orgId} />
          </TabsContent>
        )}
        {shelterFoundation && shelterVolunteers && (
          <TabsContent value="volunteers" className="mt-12 px-1 sm:mt-14">
            <VolunteersRoster shelterClubId={orgId} />
          </TabsContent>
        )}
        {shelterFoundation && shelterHealthRecords && (
          <TabsContent value="medical_records" className="mt-12 px-1 sm:mt-14">
            <ShelterPetScopedTab clubId={orgId} kind="medical" />
          </TabsContent>
        )}
        {shelterFoundation && shelterMedication && (
          <TabsContent value="medications" className="mt-12 px-1 sm:mt-14">
            <ShelterPetScopedTab clubId={orgId} kind="medications" />
          </TabsContent>
        )}
        {shelterFoundation && shelterPetTimeline && (
          <TabsContent value="timeline" className="mt-12 px-1 sm:mt-14">
            <ShelterPetScopedTab clubId={orgId} kind="timeline" />
          </TabsContent>
        )}
        {shelterFoundation && shelterFoster && (
          <TabsContent value="foster" className="mt-12 px-1 sm:mt-14">
            <FostersList shelterClubId={orgId} canAbriho />
          </TabsContent>
        )}
      </Tabs>
    </ClubThemedScope>
  );
}

function OverviewTab({ club }) {
  const founded = club.created_at?.toDate ? club.created_at.toDate().getFullYear() : null;
  const { data: pets = [] } = useMyPets(club.id);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard value={pets.length} label="Animais cadastrados" />
        <StatCard value={club.member_count || 0} label="Seguidores" />
        <StatCard value={founded || '—'} label="Fundação" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
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
    <div className="rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="text-[21px] font-extrabold">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
