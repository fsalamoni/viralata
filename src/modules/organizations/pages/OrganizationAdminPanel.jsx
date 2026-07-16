import React, { useEffect, useMemo } from 'react';
import { concatSafe } from '@/core/lib/concatSafe';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, LayoutGrid, PawPrint, MessageSquare, HandCoins, Wallet, Users, ShieldCheck, Info, MessageCircle, BarChart2, TrendingUp,
  LayoutDashboard, Kanban, Eye, Heart, Stethoscope, Pill, Clock, Home,
  Compass, Users2, Megaphone, Receipt, Settings as SettingsIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';
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
import { isClubOwner, hasAnyClubPermission, visibleAdminTabs, hasClubPermission, canViewVolunteersRoster } from '@/modules/organizations/domain/permissions';
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
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import ReportsTab from '@/modules/shelter/components/ReportsTab';
import IndicatorsTab from '@/modules/shelter/components/IndicatorsTab';
import { DashboardPage } from '@/modules/shelter/components/DashboardPage';
import { KanbanPage } from '@/modules/shelter/components/KanbanPage';
import { ExhibitionsList } from '@/modules/shelter/components/ExhibitionsList';
import { VolunteersAdminTab } from '@/modules/shelter/components/VolunteersAdminTab';
import { MedicalRecordsList } from '@/modules/shelter/components/MedicalRecordsList';
import { MedicationsList } from '@/modules/shelter/components/MedicationsList';
import { TimelineList } from '@/modules/shelter/components/TimelineList';
import { FostersList } from '@/modules/shelter/components/FostersList';
import { ShelterDonationsTab } from '@/modules/shelter/components/ShelterDonationsTab';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { parseTimestamp } from '@/core/utils/timestamp';

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

// Helper defensivo: garante array, descarta não-arrays, descarta entradas sem .key
// TASK-068 — defensivo contra hooks retornando undefined (que crashava
// em produção com "G is not a function or its return value is not iterable")
// quando o array vinha de useMemo com dependência instável.
function safeTabs(...sources) {
  return concatSafe(...sources).filter((t) => t && typeof t === 'object' && t.key);
}

// ErrorBoundary local para isolar falhas de uma aba sem derrubar o painel
// inteiro. TASK-069 — se ReportsTab ou KanbanPage lançar (ex: query falha),
// as outras abas continuam funcionando.
class TabErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error('[TabErrorBoundary]', this.props.label, err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
          <p className="font-semibold text-destructive">Não foi possível carregar esta aba.</p>
          <p className="mt-1 text-muted-foreground">
            O restante do painel continua funcionando. Tente recarregar a página.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

function SafeTab({ label, children }) {
  return <TabErrorBoundary label={label}>{children}</TabErrorBoundary>;
}

export default function OrganizationAdminPanel() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { data: club, isLoading: loadingClub } = useClub(orgId);
  const { data: membership, isLoading: loadingMembership } = useMyMembership(orgId);
  const [searchParams, setSearchParams] = useSearchParams();

  // Shelter feature flags — `useFeatureFlag` retorna um booleano, NÃO um
  // tuple. Versões anteriores faziam `const [x] = useFeatureFlag(...)` e
  // crashavam em produção (boolean não é iterável) — o teste passava só
  // porque o mock retornava `[bool, fn]`. Agora pega o bool direto.
  const shelterFoundation = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION);
  const shelterDashboard = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD);
  const shelterKanban = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_KANBAN);
  const shelterReports = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_REPORTS);
  const shelterIndicators = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_INDICATORS);
  const shelterExhibitions = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_EXHIBITIONS);
  const shelterVolunteers = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS);
  const shelterVolunteerProfileV1 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const shelterHealthRecords = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_HEALTH_RECORDS);
  const shelterMedication = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_MEDICATION);
  const shelterPetTimeline = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_PET_TIMELINE);
  const shelterFoster = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOSTER);
  const shelterDonations = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_DONATIONS);

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
  // TASK-231: gate da aba Voluntários — exige `volunteers` (raiz) OU
  // `volunteers:read` (sub-permissão de leitura). canViewVolunteersRoster
  // cobre ambos e respeita o owner.
  const canViewVolunteers = canViewVolunteersRoster(club, membership, user?.uid);

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
    if (shelterFoundation && shelterVolunteers && shelterVolunteerProfileV1 && canViewVolunteers) {
      tabs.push({ key: 'volunteers', label: 'Voluntários', icon: TAB_ICONS.volunteers, permission: 'volunteers' });
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
    if (shelterFoundation && shelterDonations) {
      tabs.push({ key: 'shelter_donations', label: 'Campanhas', icon: TAB_ICONS.donations, permission: 'donations' });
    }
    return tabs;
  }, [shelterFoundation, shelterDashboard, shelterKanban, shelterExhibitions, shelterVolunteers, shelterVolunteerProfileV1, shelterHealthRecords, shelterMedication, shelterPetTimeline, shelterFoster, canViewVolunteers, shelterDonations]);

  // === REORGANIZAÇÃO DS_V2: 19 abas → 6 grupos semânticos ===
  // Cada grupo = 1 aba no header. Sub-abas viram pills horizontais
  // dentro do TabsContent do grupo. Isso resolve o transbordar de 2 fileiras
  // (causa da sobreposição "Medicação" / "Lares Temporários" da imagem).
  // Mapa: tab_key → { grupo, label_curto, icon }
  const TAB_TO_GROUP = {
    overview: { group: 'overview', label: 'Visão Geral', icon: LayoutGrid },
    general: { group: 'settings', label: 'Dados gerais', icon: Info },
    animals: { group: 'operational', label: 'Pets', icon: PawPrint },
    medical_records: { group: 'operational', label: 'Prontuário', icon: Stethoscope },
    medications: { group: 'operational', label: 'Medicação', icon: Pill },
    timeline: { group: 'operational', label: 'Timeline', icon: Clock },
    team: { group: 'people', label: 'Equipe', icon: Users },
    volunteers: { group: 'people', label: 'Voluntários', icon: Heart },
    foster: { group: 'people', label: 'Lares Temp.', icon: Home },
    feed: { group: 'engagement', label: 'Mural', icon: MessageSquare },
    chat: { group: 'engagement', label: 'Conversas', icon: MessageCircle },
    kanban: { group: 'engagement', label: 'Pendências', icon: Kanban },
    exhibitions: { group: 'engagement', label: 'Vitrines', icon: Eye },
    dashboard: { group: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    donations: { group: 'finance', label: 'Doações', icon: HandCoins },
    shelter_donations: { group: 'finance', label: 'Campanhas', icon: HandCoins },
    finance: { group: 'finance', label: 'Prestação', icon: Wallet },
    reports: { group: 'finance', label: 'Relatórios', icon: BarChart2 },
    indicators: { group: 'finance', label: 'Indicadores', icon: TrendingUp },
    settings: { group: 'settings', label: 'Configurações', icon: ShieldCheck },
  };

  // 6 grupos semânticos com ícone + label + ordem fixa
  const TAB_GROUPS = [
    { key: 'overview', label: 'Visão Geral', icon: LayoutGrid, shortLabel: 'Início' },
    { key: 'operational', label: 'Operacional', icon: Compass, shortLabel: 'Operacional' },
    { key: 'people', label: 'Pessoas', icon: Users2, shortLabel: 'Pessoas' },
    { key: 'engagement', label: 'Engajamento', icon: Megaphone, shortLabel: 'Engajamento' },
    { key: 'finance', label: 'Financeiro', icon: Receipt, shortLabel: 'Financeiro' },
    { key: 'settings', label: 'Configurações', icon: SettingsIcon, shortLabel: 'Ajustes' },
  ];

  // Mapear cada tab_key (ex: 'animals', 'kanban') para seu grupo
  // Combina visibleTabs (community) + shelterTabs (com flag gate)
  const allVisibleTabs = useMemo(() => safeTabs(visibleTabs, shelterTabs), [visibleTabs, shelterTabs]);

  // Sub-abas agrupadas por grupo (para renderizar pills dentro de cada grupo)
  const subsByGroup = useMemo(() => {
    const map = { overview: [], operational: [], people: [], engagement: [], finance: [], settings: [] };
    for (const t of allVisibleTabs) {
      const groupInfo = TAB_TO_GROUP[t.key];
      if (groupInfo && map[groupInfo.group]) {
        map[groupInfo.group].push({
          key: t.key,
          label: groupInfo.label,
          icon: groupInfo.icon,
        });
      }
    }
    return map;
  }, [allVisibleTabs]);

  // Grupos visíveis: incluir grupo apenas se tem pelo menos 1 sub-aba
  // (exceto 'overview' que sempre existe via OverviewTab)
  const visibleGroups = useMemo(() => {
    return TAB_GROUPS.filter((g) => g.key === 'overview' || (subsByGroup[g.key] && subsByGroup[g.key].length > 0));
  }, [subsByGroup]);

  // Tab ativa = primeiro sub-aba do grupo ativo (formato "group:sub" ex: "operational:animals")
  const requestedTab = searchParams.get('tab') || 'overview:overview';
  const [reqGroup, reqSub] = requestedTab.split(':');
  const validGroup = visibleGroups.find((g) => g.key === reqGroup);
  const activeGroupKey = validGroup ? reqGroup : (visibleGroups[0]?.key || 'overview');
  const activeGroup = visibleGroups.find((g) => g.key === activeGroupKey);
  // Sub-aba ativa: primeiro sub-aba do grupo (ou 'overview' se for o grupo overview sem sub-abas)
  const activeSubKey = activeGroupKey === 'overview'
    ? 'overview'
    : (subsByGroup[activeGroupKey]?.find((s) => s.key === reqSub)?.key
        || subsByGroup[activeGroupKey]?.[0]?.key
        || '');

  const setActiveTab = (groupKey, subKey) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', subKey ? `${groupKey}:${subKey}` : groupKey);
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
      <div className="flex flex-col gap-2">
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={`/organizacoes/${orgId}`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para a ONG
          </Link>
        </Button>
        <Breadcrumb
          items={[
            { label: 'Início', href: '/', icon: Home },
            { label: 'Organizações', href: '/organizacoes' },
            { label: club.name || 'Organização', href: `/organizacoes/${orgId}` },
            { label: 'Administração' },
          ]}
        />
      </div>

      {/* Header do painel admin — padding generoso (p-6 sm:p-10) e
          gap-5 sm:gap-6 entre o avatar e o bloco de texto. Mais respiro
          que o p-5 sm:p-8 antigo. */}
      <section className="arena-admin-header">
        <div className="arena-admin-header-content">
          <span className="arena-admin-header-avatar" aria-hidden>
            {initials || <Building2 className="h-7 w-7" />}
          </span>
          <div className="arena-admin-header-info">
            <div className="arena-admin-header-title-row">
              <h1 className="arena-admin-header-title">{club.name || 'Organização'}</h1>
              <span className="arena-admin-header-badge">
                <ShieldCheck className="h-3.5 w-3.5" /> Administração
              </span>
              {club.community_name && (
                <span className="arena-admin-header-badge" title="Comunidade vinculada">
                  <Building2 className="h-3.5 w-3.5" /> {club.community_name}
                </span>
              )}
              {(club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE) !== CLUB_DIRECTORY_STATUS.ACTIVE && (
                <span className="arena-admin-header-badge">
                  {CLUB_DIRECTORY_STATUS_LABELS[club.directory_status || CLUB_DIRECTORY_STATUS.ACTIVE]}
                </span>
              )}
            </div>
            <p className="arena-admin-header-subtitle">
              Painel interno de gestão{location ? ` · ${location}` : ''}
              {owner ? ' · Você é o proprietário' : ''}
            </p>
          </div>
        </div>
      </section>

      <Tabs value={activeGroupKey} onValueChange={(g) => setActiveTab(g, '')} className="w-full">
        <TabsList className="arena-admin-tabs">
          {visibleGroups.map((group) => (
            <TabsTrigger key={group.key} value={group.key} className={cn('arena-admin-tab-trigger')}>
              <group.icon className="h-4 w-4" />{' '}
              <span className="hidden sm:inline">{group.label}</span>
              <span className="sm:hidden">{group.shortLabel}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* === GRUPO: Visão Geral === */}
        <TabsContent value="overview" className="mt-6 sm:mt-8 focus-visible:outline-none">
          <OverviewTab club={club} />
        </TabsContent>

        {/* === GRUPO: Operacional === */}
        <TabsContent value="operational" className="mt-6 sm:mt-8 focus-visible:outline-none">
          <div className="arena-subtab-bar">
            {subsByGroup.operational.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setActiveTab('operational', sub.key)}
                data-active={sub.key === activeSubKey}
                className="arena-subtab-trigger"
              >
                <sub.icon className="h-3.5 w-3.5" /> {sub.label}
              </button>
            ))}
          </div>
          {activeSubKey === 'animals' && <ClubPetsDataGrid clubId={orgId} canManage={canManageAnimals} />}
          {activeSubKey === 'medical_records' && shelterFoundation && shelterHealthRecords && (
            <SafeTab label="medical_records"><ShelterPetScopedTab clubId={orgId} kind="medical" /></SafeTab>
          )}
          {activeSubKey === 'medications' && shelterFoundation && shelterMedication && (
            <SafeTab label="medications"><ShelterPetScopedTab clubId={orgId} kind="medications" /></SafeTab>
          )}
          {activeSubKey === 'timeline' && shelterFoundation && shelterPetTimeline && (
            <SafeTab label="timeline"><ShelterPetScopedTab clubId={orgId} kind="timeline" /></SafeTab>
          )}
        </TabsContent>

        {/* === GRUPO: Pessoas === */}
        <TabsContent value="people" className="mt-6 sm:mt-8 focus-visible:outline-none">
          <div className="arena-subtab-bar">
            {subsByGroup.people.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setActiveTab('people', sub.key)}
                data-active={sub.key === activeSubKey}
                className="arena-subtab-trigger"
              >
                <sub.icon className="h-3.5 w-3.5" /> {sub.label}
              </button>
            ))}
          </div>
          {activeSubKey === 'team' && <ClubTeamTab club={club} viewerMembership={membership} viewerUid={user?.uid} />}
          {activeSubKey === 'volunteers' && shelterFoundation && shelterVolunteers && shelterVolunteerProfileV1 && canViewVolunteers && (
            <SafeTab label="volunteers">
              <VolunteersAdminTab
                shelterClubId={orgId}
                club={club}
                membership={membership}
                currentUserUid={user?.uid}
              />
            </SafeTab>
          )}
          {activeSubKey === 'foster' && shelterFoundation && shelterFoster && (
            <SafeTab label="foster"><FostersList shelterClubId={orgId} canAbriho={canManageTeam} actor={{ uid: user?.uid, displayName: user?.displayName }} /></SafeTab>
          )}
        </TabsContent>

        {/* === GRUPO: Engajamento === */}
        <TabsContent value="engagement" className="mt-6 sm:mt-8 focus-visible:outline-none">
          <div className="arena-subtab-bar">
            {subsByGroup.engagement.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setActiveTab('engagement', sub.key)}
                data-active={sub.key === activeSubKey}
                className="arena-subtab-trigger"
              >
                <sub.icon className="h-3.5 w-3.5" /> {sub.label}
              </button>
            ))}
          </div>
          {activeSubKey === 'feed' && <ClubFeedTab clubId={orgId} club={club} membership={membership} canManageFeed={canManageFeed} />}
          {activeSubKey === 'chat' && <ClubChatAdminTab club={club} />}
          {activeSubKey === 'kanban' && shelterFoundation && shelterKanban && (
            <SafeTab label="kanban"><KanbanPage clubId={orgId} /></SafeTab>
          )}
          {activeSubKey === 'exhibitions' && shelterFoundation && shelterExhibitions && (
            <SafeTab label="exhibitions"><ExhibitionsList shelterClubId={orgId} /></SafeTab>
          )}
        </TabsContent>

        {/* === GRUPO: Financeiro === */}
        <TabsContent value="finance" className="mt-6 sm:mt-8 focus-visible:outline-none">
          <div className="arena-subtab-bar">
            {subsByGroup.finance.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setActiveTab('finance', sub.key)}
                data-active={sub.key === activeSubKey}
                className="arena-subtab-trigger"
              >
                <sub.icon className="h-3.5 w-3.5" /> {sub.label}
              </button>
            ))}
          </div>
          {activeSubKey === 'donations' && <ClubDonationsTab clubId={orgId} club={club} membership={membership} canManage={canManageDonations} />}
          {activeSubKey === 'shelter_donations' && (
            <ShelterDonationsTab clubId={orgId} canManage={canManageDonations} />
          )}
          {activeSubKey === 'finance' && <ClubFinanceTab clubId={orgId} canManage={canManageFinance} />}
          {activeSubKey === 'reports' && showReportsTab && (
            <SafeTab label="reports"><ReportsTab clubId={orgId} /></SafeTab>
          )}
          {activeSubKey === 'indicators' && showIndicatorsTab && (
            <SafeTab label="indicators"><IndicatorsTab clubId={orgId} /></SafeTab>
          )}
        </TabsContent>

        {/* === GRUPO: Configurações === */}
        <TabsContent value="settings" className="mt-6 sm:mt-8 focus-visible:outline-none">
          <div className="arena-subtab-bar">
            {subsByGroup.settings.map((sub) => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setActiveTab('settings', sub.key)}
                data-active={sub.key === activeSubKey}
                className="arena-subtab-trigger"
              >
                <sub.icon className="h-3.5 w-3.5" /> {sub.label}
              </button>
            ))}
          </div>
          {activeSubKey === 'general' && <ClubGeneralAdminTab club={club} />}
          {activeSubKey === 'settings' && <ClubAdminTab club={club} />}
          {activeSubKey === 'dashboard' && shelterFoundation && shelterDashboard && (
            <SafeTab label="dashboard"><DashboardPage clubId={orgId} /></SafeTab>
          )}
        </TabsContent>
      </Tabs>
    </ClubThemedScope>
  );
}

function OverviewTab({ club }) {
  const founded = parseTimestamp(club.created_at)?.getFullYear() ?? null;
  const { data: pets = [], isLoading: loadingPets } = useMyPets(club.id);
  return (
    <div className="space-y-6">
      <div className="arena-stats-grid">
        <StatCard
          value={loadingPets ? null : pets.length}
          label="Animais cadastrados"
          icon={PawPrint}
        />
        <StatCard
          value={club.member_count || 0}
          label="Seguidores"
          icon={Users2}
        />
        <StatCard
          value={founded || '—'}
          label="Fundação"
          icon={Clock}
        />
        <StatCard
          value={club.adoption_count ?? '—'}
          label="Adoções concretizadas"
          icon={Heart}
        />
      </div>

      <div className="arena-section-card">
        <div className="arena-section-card-header">
          <div>
            <h3 className="arena-section-card-title">Sobre a organização</h3>
            <p className="arena-section-card-description">Descrição pública visível no diretório.</p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/organizacoes/${club.id}`}>
              Ver página pública <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="arena-section-card-body">
          {club.description ? (
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground/85">
              {club.description}
            </p>
          ) : (
            <EmptyState
              icon={Info}
              title="Nenhuma descrição cadastrada"
              description="Adicione uma descrição pública para que visitantes conheçam o abrigo."
              className="py-6"
            />
          )}
        </div>
      </div>

      <div className="arena-section-card">
        <div className="arena-section-card-header">
          <div>
            <h3 className="arena-section-card-title">Atalhos rápidos</h3>
            <p className="arena-section-card-description">Ações mais usadas do painel.</p>
          </div>
        </div>
        <div className="arena-section-card-body grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <ShortcutCard
            href={`/organizacoes/${club.id}/admin?tab=operational:animals`}
            icon={PawPrint}
            title="Cadastrar pet"
            description="Adicione um novo animal para adoção."
          />
          <ShortcutCard
            href={`/organizacoes/${club.id}/admin?tab=engagement:feed`}
            icon={MessageSquare}
            title="Nova publicação"
            description="Publique um aviso no mural da ONG."
          />
          <ShortcutCard
            href={`/organizacoes/${club.id}/admin?tab=engagement:kanban`}
            icon={Kanban}
            title="Abrir Kanban"
            description="Organize pendências do abrigo."
          />
          <ShortcutCard
            href={`/organizacoes/${club.id}/admin?tab=people:volunteers`}
            icon={Heart}
            title="Voluntários"
            description="Gerencie escalas e atribuições."
          />
          <ShortcutCard
            href={`/organizacoes/${club.id}/admin?tab=finance:donations`}
            icon={HandCoins}
            title="Chamados de doação"
            description="Crie campanhas de arrecadação."
          />
          <ShortcutCard
            href={`/organizacoes/${club.id}/admin?tab=settings:general`}
            icon={ShieldCheck}
            title="Configurações"
            description="Edite dados do abrigo."
          />
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ href, icon: Icon, title, description }) {
  return (
    <Link
      to={href}
      className="group flex items-start gap-3 rounded-2xl border border-border/60 bg-white/60 p-4 transition-all hover:border-orange-300/60 hover:bg-white/80 hover:shadow-[0_18px_40px_-24px_rgba(64,34,18,0.22)]"
    >
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100/80 text-orange-700 transition-colors group-hover:bg-orange-500 group-hover:text-white">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 self-center text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function StatCard({ value, label, icon: Icon }) {
  return (
    <div className="arena-stat-card">
      <div className="flex items-start justify-between gap-2">
        <p className="arena-stat-card-label">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground/70" />}
      </div>
      {value === null || value === undefined ? (
        <Skeleton className="mt-2 h-7 w-16 rounded-md" />
      ) : (
        <div className="arena-stat-card-value">{value}</div>
      )}
    </div>
  );
}
