/**
 * @fileoverview OrganizationAdminPanel V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-ORG_ADMIN: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Funcionalidades:
 *  - Hero impactante com gradient (sky-500 → indigo-600 → violet-600)
 *  - 4 stat cards (Membros, Pets, Eventos, Adoções)
 *  - 6 grupos semânticos (Visão Geral, Operacional, Pessoas, Engajamento, Financeiro, Configurações)
 *  - 8+ sub-abas agrupadas (Pets, Equipe, Mural, Doações, etc)
 *  - Welcome message contextual
 *  - Ações rápidas no header
 *  - Loading/Error/Empty states
 *  - SEO + JSON-LD
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first
 *  - A11y WCAG AA
 *
 * Rota: /organizacoes/:orgId/admin
 *
 * @see docs/REGENCY_ORG_ADMIN_V3.md
 */
import React, { useMemo, useEffect, Suspense, lazy } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft, Building2, LayoutGrid, PawPrint, MessageSquare, HandCoins, Wallet, Users, ShieldCheck, Info, MessageCircle, BarChart2, TrendingUp,
  LayoutDashboard, Kanban, Eye, Heart, Stethoscope, Pill, Clock, Home,
  Compass, Users2, Megaphone, Receipt, Settings as SettingsIcon,
  AlertCircle, RefreshCw, Sparkles, ListTodo, Store,
  Activity, Server, Database, ServerCog,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import Seo from '@/components/Seo';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { toast } from 'sonner';
import { PERSONA_TYPE } from '@/core/domain/personas';
import { useIsStaffPersonaActive } from '@/core/hooks/useStaffPersonaView';
import { useClub, useMyMembership } from '@/modules/organizations/hooks/useClubs';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { CLUB_PERMISSION } from '@/modules/organizations/domain/constants';
import { CLUB_DIRECTORY_STATUS, CLUB_DIRECTORY_STATUS_LABELS } from '@/modules/communities/domain/directory';
import { isClubOwner, hasClubPermission, hasAnyClubPermission, canViewVolunteersRoster } from '@/modules/organizations/domain/permissions';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { PET_OPS_CONFIGS, PET_OPS_TAB_ORDER } from '@/modules/shelter/domain/operational/petOpsConfigs';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { parseTimestamp } from '@/core/utils/timestamp';
import { computeShelterStats } from '@/modules/organizations/domain/shelterOverviewStats';
import { CURRENT_LOCATION_LABELS } from '@/modules/shelter/domain/core/animal';
import { cn } from '@/core/lib/utils';
import { captureError } from '@/core/services/errorTracker';
import { recordClientError } from '@/core/services/observabilityService';
import ClubThemedScope from '@/modules/organizations/components/ClubThemedScope';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// LAZY IMPORTS - tabs (V1 reusado como components testados)
// ============================================================================

const ClubAdminTab = lazy(() => import('@/modules/organizations/components/ClubAdminTab'));
const ClubTeamTab = lazy(() => import('@/modules/organizations/components/ClubTeamTab'));
const ClubTeamTabV2 = lazy(() => import('@/modules/organizations/components/ClubTeamTabV2'));
const ClubPetsDataGrid = lazy(() => import('@/modules/organizations/components/ClubPetsDataGrid'));
const TasksBoard = lazy(() => import('@/modules/shelter/components/tasks/TasksBoard'));
const ClubFeedTab = lazy(() => import('@/modules/organizations/components/ClubFeedTab'));
const ClubDonationsTab = lazy(() => import('@/modules/organizations/components/ClubDonationsTab'));
const ClubFinanceTab = lazy(() => import('@/modules/organizations/components/ClubFinanceTab'));
const ClubGeneralAdminTab = lazy(() => import('@/modules/organizations/components/ClubGeneralAdminTab'));
const ClubChatAdminTab = lazy(() => import('@/modules/organizations/components/ClubChatAdminTab'));

const ReportsTab = lazy(() => import('@/modules/shelter/components/ReportsTab'));
const IndicatorsTab = lazy(() => import('@/modules/shelter/components/IndicatorsTab'));
const DashboardPage = lazy(() => import('@/modules/shelter/components/DashboardPage'));
const KanbanPage = lazy(() => import('@/modules/shelter/components/KanbanPage'));
const ExhibitionsList = lazy(() => import('@/modules/shelter/components/ExhibitionsList'));
const ExhibitionsManagerV2 = lazy(() => import('@/modules/shelter/components/ExhibitionsManagerV2'));
const VolunteersAdminTab = lazy(() => import('@/modules/shelter/components/VolunteersAdminTab'));
const MedicalRecordsList = lazy(() => import('@/modules/shelter/components/MedicalRecordsList'));
const MedicationsList = lazy(() => import('@/modules/shelter/components/MedicationsList'));
const TimelineList = lazy(() => import('@/modules/shelter/components/TimelineList'));
const PetOpsTab = lazy(() => import('@/modules/shelter/components/PetOpsTab'));
const StoreAdmin = lazy(() => import('@/modules/shelter/components/store/StoreAdmin'));
const FostersList = lazy(() => import('@/modules/shelter/components/FostersList'));
const FostersListV2 = lazy(() => import('@/modules/shelter/components/FostersListV2'));
const ClubMuralTabV2 = lazy(() => import('@/modules/shelter/components/ClubMuralTabV2'));
const ShelterDonationsTab = lazy(() => import('@/modules/shelter/components/ShelterDonationsTab'));
const ShelterFinanceTab = lazy(() => import('@/modules/shelter/components/ShelterFinanceTab'));

// ============================================================================
// CONSTANTS
// ============================================================================

const TAB_ICONS = {
  overview: LayoutGrid,
  general: Info,
  tasks: ListTodo,
  animals: PawPrint,
  feed: MessageSquare,
  donations: HandCoins,
  finance: Wallet,
  reports: BarChart2,
  indicators: TrendingUp,
  team: Users,
  chat: MessageCircle,
  settings: ShieldCheck,
  dashboard: LayoutDashboard,
  kanban: Kanban,
  exhibitions: Eye,
  volunteers: Heart,
  medical_records: Stethoscope,
  medications: Pill,
  timeline: Clock,
  foster: Home,
  store: Store,
};

const TAB_TO_GROUP = {
  overview: { group: 'overview', label: 'Visão Geral', icon: LayoutGrid },
  general: { group: 'settings', label: 'Dados gerais', icon: Info },
  tasks: { group: 'operational', label: 'Tarefas', icon: ListTodo },
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
  shelter_finance: { group: 'finance', label: 'Prestação', icon: Wallet },
  finance: { group: 'finance', label: 'Prestação ONGs', icon: Wallet },
  reports: { group: 'finance', label: 'Relatórios', icon: BarChart2 },
  indicators: { group: 'finance', label: 'Indicadores', icon: TrendingUp },
  settings: { group: 'settings', label: 'Configurações', icon: ShieldCheck },
  // Tabelas operacionais V1 (SHELTER_PET_OPS_TABLES_V1) — Medicações,
  // Consultas, Tratamentos, Vacinas, Cuidados, Adoções, Devoluções.
  ...Object.fromEntries(PET_OPS_TAB_ORDER.map((v) => {
    const c = PET_OPS_CONFIGS[v];
    return [c.tabKey, { group: 'operational', label: c.title, icon: c.icon }];
  })),
};

const TAB_GROUPS = [
  { key: 'overview', label: 'Visão Geral', icon: LayoutGrid, shortLabel: 'Início' },
  { key: 'operational', label: 'Operacional', icon: Compass, shortLabel: 'Operacional' },
  { key: 'people', label: 'Pessoas', icon: Users2, shortLabel: 'Pessoas' },
  { key: 'engagement', label: 'Engajamento', icon: Megaphone, shortLabel: 'Engajamento' },
  { key: 'store', label: 'Loja', icon: Store, shortLabel: 'Loja' },
  { key: 'finance', label: 'Financeiro', icon: Receipt, shortLabel: 'Financeiro' },
  { key: 'settings', label: 'Configurações', icon: SettingsIcon, shortLabel: 'Ajustes' },
];

const STAT_CARDS = [
  { id: 'members', icon: Users2, label: 'Membros', color: 'sky' },
  { id: 'pets', icon: PawPrint, label: 'Pets cadastrados', color: 'amber' },
  { id: 'adoptions', icon: Heart, label: 'Adoções', color: 'rose' },
  { id: 'events', icon: Activity, label: 'Eventos', color: 'emerald' },
];

// ============================================================================
// ERROR BOUNDARY para tabs (defense in depth - V3 também tem)
// ============================================================================

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err: err };
  }
  componentDidCatch(err, info) {
    // eslint-disable-next-line no-console
    console.error('[TabErrorBoundary]', this.props.label, err, info);
    try {
      recordClientError(err, { source: 'OrgAdminV3-TabErrorBoundary', tab: this.props.label, info, fatal: false });
      captureError(err, { source: 'OrgAdminV3-TabErrorBoundary', tab: this.props.label, info, fatal: false });
    } catch (_) { /* ignore */ }
  }
  render() {
    if (this.state.err) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm" data-testid="tab-error">
          <p className="font-semibold text-destructive">Não foi possível carregar esta aba ({this.props.label || '?'}).</p>
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

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, color, reduce }) {
  const colorMap = {
    primary: { text: 'text-primary', bg: 'bg-primary/10' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-100 dark:bg-rose-900/30' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  };
  const c = colorMap[color] || colorMap.primary;
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', c.bg)}>
          <Icon className={cn('h-4 w-4', c.text)} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">{label}</p>
          <p className="text-xl font-extrabold text-white sm:text-2xl">{value || '—'}</p>
        </div>
      </div>
    </motion.div>
  );
}

/** Card de KPI do dashboard da Visão Geral (clicável quando `onClick`). */
function DashKpi({ icon: Icon, label, value, hint, accent = 'primary', onClick }) {
  const accentMap = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  };
  const Comp = onClick ? motion.button : motion.div;
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      variants={ANIM}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left',
        onClick && 'transition-all hover:border-primary/50 hover:shadow-md',
      )}
    >
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accentMap[accent])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold leading-tight text-foreground">{value}</p>
        {hint && <p className="text-[10.5px] text-muted-foreground">{hint}</p>}
      </div>
    </Comp>
  );
}

/** Bloco de distribuição com barras horizontais proporcionais. */
function DashBreakdown({ icon: Icon, title, rows, total, emptyLabel = 'Sem dados' }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-foreground">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
        {title}
      </h3>
      {rows.length === 0 || total === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {r.value}
                  {total ? <span className="ml-1 text-[10.5px]">({Math.round((r.value / total) * 100)}%)</span> : null}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', r.color || 'bg-primary')}
                  style={{ width: `${Math.max(4, Math.round((r.value / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OrgAdminSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

function OverviewTab({ club, pets = [], loadingPets = false, navigate }) {
  const founded = parseTimestamp(club?.created_at)?.getFullYear() ?? null;
  const yearsActive = founded != null ? Math.max(0, new Date().getFullYear() - founded) : null;
  const stats = useMemo(() => computeShelterStats(pets), [pets]);

  const goTo = (group, sub) => navigate(`/organizacoes/${club?.id}/admin?tab=${group}:${sub}`);

  const STATUS_LABEL = { available: 'Disponível', in_process: 'Em processo', adopted: 'Adotado', unavailable: 'Indisponível' };
  const STATUS_COLOR = { available: 'bg-emerald-500', in_process: 'bg-amber-500', adopted: 'bg-slate-400', unavailable: 'bg-rose-500' };
  const SPECIES_LABEL = { dog: 'Cachorros', cat: 'Gatos', rabbit: 'Coelhos', bird: 'Pássaros', other: 'Outros' };

  const statusRows = ['available', 'in_process', 'adopted', 'unavailable'].map((k) => ({
    key: k, label: STATUS_LABEL[k], value: stats.byStatus[k] || 0, color: STATUS_COLOR[k],
  }));
  const speciesRows = Object.entries(stats.bySpecies)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ key: k, label: SPECIES_LABEL[k] || k, value: v, color: 'bg-primary' }));
  const locationRows = Object.entries(stats.byLocation)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({
      key: k,
      label: CURRENT_LOCATION_LABELS[k] || (k === 'unknown' ? 'Não informado' : k),
      value: v,
      color: 'bg-sky-500',
    }));

  const adoptions = club?.adoption_count ?? stats.adopted;

  return (
    <div className="space-y-6" data-testid="org-admin-overview">
      {/* KPIs principais */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={stagger}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        <DashKpi icon={PawPrint} label="Animais" value={loadingPets ? '…' : stats.total} accent="amber" onClick={() => goTo('operational', 'animals')} />
        <DashKpi icon={Heart} label="Disponíveis" value={loadingPets ? '…' : stats.available} accent="emerald" onClick={() => goTo('operational', 'animals')} />
        <DashKpi icon={Clock} label="Em processo" value={loadingPets ? '…' : stats.inProcess} accent="violet" />
        <DashKpi icon={Sparkles} label="Adoções" value={adoptions} accent="rose" />
        <DashKpi icon={Users2} label="Membros" value={club?.member_count || 0} accent="sky" onClick={() => goTo('people', 'team')} />
        <DashKpi
          icon={Building2}
          label="Fundação"
          value={founded || '—'}
          hint={yearsActive != null ? `${yearsActive} ano(s) de atuação` : undefined}
          accent="primary"
        />
      </motion.div>

      {/* Destaques rápidos */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <DashKpi icon={Activity} label="Novos (30 dias)" value={loadingPets ? '…' : stats.newLast30} hint="Cadastrados no último mês" accent="emerald" />
        <DashKpi icon={Clock} label="Permanência média" value={stats.avgStayDays != null ? `${stats.avgStayDays} d` : '—'} hint="Tempo médio no abrigo" accent="sky" />
        <DashKpi icon={ShieldCheck} label="Castrados" value={`${stats.neuteredPct}%`} hint={`${stats.neutered} de ${stats.total} animais`} accent="violet" />
      </div>

      {/* Distribuições */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashBreakdown icon={Heart} title="Por situação" rows={statusRows} total={stats.total} emptyLabel="Nenhum animal cadastrado ainda." />
        <DashBreakdown icon={PawPrint} title="Por espécie" rows={speciesRows} total={stats.total} emptyLabel="Nenhum animal cadastrado ainda." />
        <DashBreakdown icon={Home} title="Por localização atual" rows={locationRows} total={stats.total} emptyLabel="Sem localização registrada." />
      </div>

      {/* Animal há mais tempo no abrigo */}
      {stats.longest && (
        <button
          type="button"
          onClick={() => stats.longest.id && navigate(`/pets/${stats.longest.id}`)}
          className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50"
          data-testid="overview-longest-stay"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Há mais tempo no abrigo</p>
            <p className="truncate text-sm font-bold text-foreground">{stats.longest.name || 'Animal'}</p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">{stats.longest.days} dias</span>
        </button>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function OrganizationAdminPanelV3() {
  const reduce = useReducedMotion();
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // toast via sonner (imported above)
  const { data: club, isLoading: loadingClub, error: clubError, refetch: refetchClub } = useClub(orgId);
  const { data: membership, isLoading: loadingMembership, error: membershipError, refetch: refetchMembership } = useMyMembership(orgId);
  const { data: pets = [], isLoading: loadingPets } = useMyPets(orgId);
  const [searchParams, setSearchParams] = useSearchParams();

  // Shelter feature flags
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
  const shelterPetOpsTables = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_PET_OPS_TABLES_V1);
  const shelterFoster = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOSTER);
  const shelterDonations = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_DONATIONS);
  const shelterFinance = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FINANCE);
  const shelterStore = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_STORE_V1);
  const shelterTeamV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_TEAM_V2);
  const shelterFosterV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOSTER_V2);
  const shelterMuralV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_MURAL_V2);
  const shelterExhibitionOpsV1 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_OPS_V1);

  // Item 7: no acesso de abrigo (persona shelter_staff), esconde os "escapes"
  // para a visão pública — o usuário está no painel privado do abrigo.
  const inShelterPersona = useIsStaffPersonaActive(PERSONA_TYPE.SHELTER_STAFF);

  const isLoading = loadingClub || loadingMembership;
  const owner = isClubOwner(club, membership, user?.uid);
  const isAdmin = isClubOwner(club, membership, user?.uid) || membership?.role === 'admin';
  const canAccess = hasAnyClubPermission(club, membership, user?.uid);

  const canManageAnimals = hasClubPermission(club, membership, CLUB_PERMISSION.ANIMALS, user?.uid);
  const canManageFeed = hasClubPermission(club, membership, CLUB_PERMISSION.FEED, user?.uid);
  const canManageDonations = hasClubPermission(club, membership, CLUB_PERMISSION.DONATIONS, user?.uid);
  const canManageFinance = hasClubPermission(club, membership, CLUB_PERMISSION.FINANCE, user?.uid);
  const canManageTeam = hasClubPermission(club, membership, CLUB_PERMISSION.TEAM, user?.uid);
  const canViewVolunteers = canViewVolunteersRoster(club, membership, user?.uid);

  // Tabs (community)
  const visibleTabs = useMemo(() => {
    const baseTabs = [
      { key: 'general', label: 'Geral', icon: TAB_ICONS.general, permission: 'team' },
      { key: 'animals', label: 'Pets', icon: TAB_ICONS.animals, permission: CLUB_PERMISSION.ANIMALS },
      { key: 'feed', label: 'Mural', icon: TAB_ICONS.feed, permission: CLUB_PERMISSION.FEED },
      { key: 'donations', label: 'Doações', icon: TAB_ICONS.donations, permission: CLUB_PERMISSION.DONATIONS },
      { key: 'finance', label: 'Prestação', icon: TAB_ICONS.finance, permission: CLUB_PERMISSION.FINANCE },
      { key: 'team', label: 'Equipe', icon: TAB_ICONS.team, permission: CLUB_PERMISSION.TEAM },
      { key: 'chat', label: 'Chat', icon: TAB_ICONS.chat, permission: 'team' },
      { key: 'settings', label: 'Configurações', icon: TAB_ICONS.settings, permission: 'admin_only' },
    ];
    return baseTabs.filter((t) => {
      if (t.permission === null) return true;
      if (t.permission === 'admin_only') return isAdmin;
      if (t.permission === 'team') return canManageTeam;
      return hasClubPermission(club, membership, t.permission, user?.uid);
    });
  }, [club, membership, isAdmin, canManageTeam, user?.uid]);

  // Shelter tabs
  const shelterTabs = useMemo(() => {
    const tabs = [];
    // Tarefas: aba operacional (antes de Pets — reordenada em subsByGroup).
    if (shelterFoundation) tabs.push({ key: 'tasks', label: 'Tarefas', icon: TAB_ICONS.tasks });
    if (shelterFoundation && shelterDashboard) tabs.push({ key: 'dashboard', label: 'Dashboard', icon: TAB_ICONS.dashboard });
    if (shelterFoundation && shelterKanban) tabs.push({ key: 'kanban', label: 'Pendências', icon: TAB_ICONS.kanban });
    if (shelterFoundation && shelterExhibitions) tabs.push({ key: 'exhibitions', label: 'Vitrines', icon: TAB_ICONS.exhibitions });
    if (shelterFoundation && shelterVolunteers && shelterVolunteerProfileV1 && canViewVolunteers) {
      tabs.push({ key: 'volunteers', label: 'Voluntários', icon: TAB_ICONS.volunteers });
    }
    if (shelterFoundation && shelterPetOpsTables) {
      // Tabelas operacionais V1: substitui Prontuário/Medicação/Timeline por
      // Medicações, Consultas, Tratamentos, Vacinas, Cuidados, Adoções, Devoluções.
      PET_OPS_TAB_ORDER.forEach((v) => {
        const c = PET_OPS_CONFIGS[v];
        tabs.push({ key: c.tabKey, label: c.title, icon: c.icon });
      });
    } else {
      if (shelterFoundation && shelterHealthRecords) tabs.push({ key: 'medical_records', label: 'Prontuário', icon: TAB_ICONS.medical_records });
      if (shelterFoundation && shelterMedication) tabs.push({ key: 'medications', label: 'Medicação', icon: TAB_ICONS.medications });
      if (shelterFoundation && shelterPetTimeline) tabs.push({ key: 'timeline', label: 'Timeline', icon: TAB_ICONS.timeline });
    }
    if (shelterFoundation && shelterFoster) tabs.push({ key: 'foster', label: 'Lares', icon: TAB_ICONS.foster });
    if (shelterFoundation && shelterDonations) tabs.push({ key: 'shelter_donations', label: 'Campanhas', icon: TAB_ICONS.donations });
    if (shelterFoundation && shelterFinance) tabs.push({ key: 'shelter_finance', label: 'Prestação', icon: TAB_ICONS.finance });
    if (shelterFoundation && shelterReports) tabs.push({ key: 'reports', label: 'Relatórios', icon: TAB_ICONS.reports });
    if (shelterFoundation && shelterIndicators) tabs.push({ key: 'indicators', label: 'Indicadores', icon: TAB_ICONS.indicators });
    return tabs;
  }, [
    shelterFoundation, shelterDashboard, shelterKanban, shelterExhibitions,
    shelterVolunteers, shelterVolunteerProfileV1, canViewVolunteers,
    shelterHealthRecords, shelterMedication, shelterPetTimeline, shelterPetOpsTables, shelterFoster,
    shelterDonations, shelterFinance, shelterReports, shelterIndicators,
  ]);

  // All visible tabs
  const allVisibleTabs = useMemo(() => [...visibleTabs, ...shelterTabs], [visibleTabs, shelterTabs]);

  // Subs by group
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
    // Tarefas deve aparecer como PRIMEIRA aba de Operacional (antes de Pets).
    const tIdx = map.operational.findIndex((s) => s.key === 'tasks');
    if (tIdx > 0) {
      const [t] = map.operational.splice(tIdx, 1);
      map.operational.unshift(t);
    }
    return map;
  }, [allVisibleTabs]);

  // Visible groups. 'store' é um grupo primário SEM sub-abas (o próprio
  // StoreAdmin tem sub-abas internas), gated pela flag SHELTER_STORE_V1.
  const visibleGroups = useMemo(() => {
    return TAB_GROUPS.filter((g) => {
      if (g.key === 'overview') return true;
      if (g.key === 'store') return shelterFoundation && shelterStore;
      return subsByGroup[g.key] && subsByGroup[g.key].length > 0;
    });
  }, [subsByGroup, shelterFoundation, shelterStore]);

  // Active tab from URL
  const requestedTab = searchParams.get('tab') || 'overview:overview';
  const [reqGroup, reqSub] = requestedTab.split(':');
  const validGroup = visibleGroups.find((g) => g.key === reqGroup);
  const activeGroupKey = validGroup ? reqGroup : (visibleGroups[0]?.key || 'overview');
  const activeGroup = visibleGroups.find((g) => g.key === activeGroupKey);
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

  // Permission redirect
  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (!club || !membership || !canAccess) {
      toast.error('Você não tem permissão para administrar esta organização.');
      navigate(`/comunidade/${orgId}`, { replace: true });
    }
  }, [isLoading, isAuthenticated, club, membership, canAccess, navigate, orgId, toast]);

  // JSON-LD
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: club?.name ? `Admin — ${club.name}` : 'Admin — Viralata',
    description: 'Painel administrativo da organização.',
    url: `https://viralata.web.app/organizacoes/${orgId}/admin`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Viralata',
      url: 'https://viralata.web.app',
    },
  }), [club, orgId]);

  // LOADING
  if (isLoading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24 sm:px-6" data-testid="org-admin-page">
        <Seo title="Admin ONG — Viralata" description="Painel administrativo da organização." />
        <OrgAdminSkeleton />
      </div>
    );
  }

  // ERRORS
  if (clubError || membershipError) {
    const errLabel = clubError?.code || membershipError?.code || 'unknown';
    const errMsg = clubError?.message || membershipError?.message || 'Erro desconhecido';
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6" data-testid="org-admin-page">
        <Seo title="Erro — Admin ONG" description="Erro ao carregar painel." />
        <ErrorState
          title="Não foi possível carregar este painel"
          description={`Erro ${errLabel}: ${errMsg}. Verifique sua conexão e tente recarregar.`}
          action={
            <div className="flex flex-col items-center gap-2 sm:flex-row">
              <Button onClick={() => { refetchClub(); refetchMembership(); }}>
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Tentar novamente
              </Button>
              <Button asChild variant="ghost">
                <Link to="/organizacoes">Voltar para Organizações</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12 sm:px-6" data-testid="org-admin-page">
        <Seo title="ONG não encontrada" description="Organização não encontrada." />
        <EmptyState
          icon={Building2}
          title="Organização não encontrada"
          description="A organização que você procura não existe ou foi removida."
          action={<Button asChild><Link to="/organizacoes">Voltar</Link></Button>}
        />
      </div>
    );
  }

  if (!canAccess) return null;

  const initials = (club.name || 'A').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
  const location = [club.city, club.state].filter(Boolean).join(', ');

  return (
    <ClubThemedScope club={club} className={cn('arena-page mx-auto max-w-6xl space-y-6 px-4 pb-24 sm:px-6', inShelterPersona ? 'pt-3' : 'pt-6')} data-testid="org-admin-page">
      <Seo
        title={`Admin ${club.name || 'ONG'} — Viralata`}
        description={`Painel administrativo de ${club.name || 'organização'}.`}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb + back — SOMENTE fora do acesso de abrigo. No acesso de
          abrigo (item 7) o usuário já está no painel: sem "voltar para a ONG"
          e sem breadcrumb (redundante, o hero já identifica o abrigo). */}
      {!inShelterPersona && (
        <div className="flex flex-col gap-2">
          <Button asChild variant="ghost" size="sm" className="self-start">
            <Link to={`/organizacoes/${orgId}`}>
              <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Voltar para a ONG
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
      )}

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-indigo-600 to-violet-600 p-6 text-white shadow-2xl sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
              <ShieldCheck className="mr-1 h-3 w-3" aria-hidden="true" />
              Administração
            </Badge>
            {owner && (
              <Badge variant="secondary" className="border-0 bg-amber-500/20 text-amber-100 backdrop-blur">
                <Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />
                Proprietário
              </Badge>
            )}
          </div>

          <motion.div
            variants={ANIM}
            className="flex items-start gap-4"
          >
            <div
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-2xl font-extrabold backdrop-blur-sm sm:h-20 sm:w-20"
              aria-hidden="true"
            >
              {initials || <Building2 className="h-7 w-7" />}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
                {club.name || 'Organização'}
              </h1>
              <p className="mt-1 text-sm text-white/90 sm:text-base">
                Painel interno de gestão{location ? ` · ${location}` : ''}
              </p>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={ANIM}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <StatCard
              icon={Users2}
              value={club.member_count || 0}
              label="Membros"
              color="sky"
              reduce={reduce}
            />
            <StatCard
              icon={PawPrint}
              value={loadingPets ? '...' : (pets?.length || 0)}
              label="Pets"
              color="amber"
              reduce={reduce}
            />
            <StatCard
              icon={Heart}
              value={club.adoption_count ?? '—'}
              label="Adoções"
              color="rose"
              reduce={reduce}
            />
            <StatCard
              icon={Activity}
              value="—"
              label="Eventos"
              color="emerald"
              reduce={reduce}
            />
          </motion.div>
        </div>
      </motion.section>

      {/* GROUP TABS */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-card p-2" data-testid="org-admin-groups">
        {visibleGroups.map((group) => {
          const Icon = group.icon;
          const active = activeGroupKey === group.key;
          return (
            <button
              key={group.key}
              type="button"
              onClick={() => setActiveTab(group.key, '')}
              aria-pressed={active}
              data-testid={`group-${group.key}`}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                active
                  ? 'bg-primary text-primary-foreground shadow'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{group.label}</span>
              <span className="sm:hidden">{group.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-TABS (within active group) */}
      {activeGroup && subsByGroup[activeGroupKey] && subsByGroup[activeGroupKey].length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto rounded-2xl border border-border bg-muted/30 p-2" data-testid="org-admin-subs">
          {subsByGroup[activeGroupKey].map((sub) => {
            const Icon = sub.icon;
            const active = sub.key === activeSubKey;
            return (
              <button
                key={sub.key}
                type="button"
                onClick={() => setActiveTab(activeGroupKey, sub.key)}
                aria-pressed={active}
                data-testid={`sub-${sub.key}`}
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  active
                    ? 'bg-foreground text-background shadow'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {sub.label}
              </button>
            );
          })}
        </div>
      )}

      {/* CONTENT */}
      <Suspense fallback={<OrgAdminSkeleton />}>
        {activeGroupKey === 'overview' && (
          <OverviewTab club={club} pets={pets} loadingPets={loadingPets} navigate={navigate} />
        )}

        {activeGroupKey === 'store' && shelterFoundation && shelterStore && (
          <SafeTab label="store">
            <StoreAdmin
              clubId={orgId}
              actor={{ uid: user?.uid, name: user?.displayName || membership?.display_name }}
            />
          </SafeTab>
        )}

        {activeGroupKey === 'operational' && activeSubKey === 'tasks' && shelterFoundation && (
          <SafeTab label="tasks">
            <TasksBoard
              clubId={orgId}
              actor={{ uid: user?.uid, name: user?.displayName || membership?.display_name }}
              canManage={isAdmin || canManageAnimals}
            />
          </SafeTab>
        )}
        {activeGroupKey === 'operational' && activeSubKey === 'animals' && (
          <SafeTab label="animals">
            <ClubPetsDataGrid clubId={orgId} canManage={canManageAnimals} />
          </SafeTab>
        )}
        {activeGroupKey === 'operational' && activeSubKey === 'medical_records' && shelterFoundation && shelterHealthRecords && (
          <SafeTab label="medical_records"><MedicalRecordsList shelterClubId={orgId} /></SafeTab>
        )}
        {activeGroupKey === 'operational' && activeSubKey === 'medications' && shelterFoundation && shelterMedication && (
          <SafeTab label="medications"><MedicationsList shelterClubId={orgId} /></SafeTab>
        )}
        {activeGroupKey === 'operational' && activeSubKey === 'timeline' && shelterFoundation && shelterPetTimeline && (
          <SafeTab label="timeline"><TimelineList shelterClubId={orgId} /></SafeTab>
        )}

        {/* Tabelas operacionais V1 (SHELTER_PET_OPS_TABLES_V1) */}
        {shelterFoundation && shelterPetOpsTables && PET_OPS_TAB_ORDER.map((v) => {
          const c = PET_OPS_CONFIGS[v];
          if (activeGroupKey !== 'operational' || activeSubKey !== c.tabKey) return null;
          return (
            <SafeTab key={c.tabKey} label={c.tabKey}>
              <PetOpsTab
                variant={c.key}
                shelterClubId={orgId}
                canManage={canManageAnimals}
                actor={{ uid: user?.uid, displayName: user?.displayName }}
              />
            </SafeTab>
          );
        })}

        {activeGroupKey === 'people' && activeSubKey === 'team' && (
          <SafeTab label="team">
            {shelterTeamV2 ? (
              <ClubTeamTabV2 club={club} viewerMembership={membership} viewerUid={user?.uid} />
            ) : (
              <ClubTeamTab club={club} viewerMembership={membership} viewerUid={user?.uid} />
            )}
          </SafeTab>
        )}
        {activeGroupKey === 'people' && activeSubKey === 'volunteers' && shelterFoundation && shelterVolunteers && shelterVolunteerProfileV1 && canViewVolunteers && (
          <SafeTab label="volunteers">
            <VolunteersAdminTab
              shelterClubId={orgId}
              club={club}
              membership={membership}
              currentUserUid={user?.uid}
            />
          </SafeTab>
        )}
        {activeGroupKey === 'people' && activeSubKey === 'foster' && shelterFoundation && shelterFoster && (
          <SafeTab label="foster">
            {shelterFosterV2 ? (
              <FostersListV2 shelterClubId={orgId} canAbriho={canManageTeam} actor={{ uid: user?.uid, displayName: user?.displayName }} />
            ) : (
              <FostersList shelterClubId={orgId} canAbriho={canManageTeam} actor={{ uid: user?.uid, displayName: user?.displayName }} />
            )}
          </SafeTab>
        )}

        {activeGroupKey === 'engagement' && activeSubKey === 'feed' && (
          <SafeTab label="feed">
            {shelterMuralV2 ? (
              <ClubMuralTabV2 clubId={orgId} club={club} membership={membership} canManageFeed={canManageFeed} />
            ) : (
              <ClubFeedTab clubId={orgId} club={club} membership={membership} canManageFeed={canManageFeed} />
            )}
          </SafeTab>
        )}
        {activeGroupKey === 'engagement' && activeSubKey === 'chat' && (
          <SafeTab label="chat">
            <ClubChatAdminTab club={club} />
          </SafeTab>
        )}
        {activeGroupKey === 'engagement' && activeSubKey === 'kanban' && shelterFoundation && shelterKanban && (
          <SafeTab label="kanban"><KanbanPage clubId={orgId} /></SafeTab>
        )}
        {activeGroupKey === 'engagement' && activeSubKey === 'exhibitions' && shelterFoundation && shelterExhibitions && (
          <SafeTab label="exhibitions">
            {shelterExhibitionOpsV1 ? (
              <ExhibitionsManagerV2 shelterClubId={orgId} actor={{ uid: user?.uid, displayName: user?.displayName }} />
            ) : (
              <ExhibitionsList shelterClubId={orgId} />
            )}
          </SafeTab>
        )}

        {activeGroupKey === 'finance' && activeSubKey === 'donations' && (
          <SafeTab label="donations">
            <ClubDonationsTab clubId={orgId} club={club} membership={membership} canManage={canManageDonations} />
          </SafeTab>
        )}
        {activeGroupKey === 'finance' && activeSubKey === 'shelter_donations' && (
          <ShelterDonationsTab clubId={orgId} canManage={canManageDonations} />
        )}
        {activeGroupKey === 'finance' && activeSubKey === 'shelter_finance' && (
          <ShelterFinanceTab clubId={orgId} clubName={club?.name} canManage={canManageDonations} />
        )}
        {activeGroupKey === 'finance' && activeSubKey === 'finance' && (
          <SafeTab label="finance">
            <ClubFinanceTab clubId={orgId} canManage={canManageFinance} />
          </SafeTab>
        )}
        {activeGroupKey === 'finance' && activeSubKey === 'reports' && shelterFoundation && shelterReports && (
          <SafeTab label="reports"><ReportsTab clubId={orgId} /></SafeTab>
        )}
        {activeGroupKey === 'finance' && activeSubKey === 'indicators' && shelterFoundation && shelterIndicators && (
          <SafeTab label="indicators"><IndicatorsTab clubId={orgId} /></SafeTab>
        )}

        {activeGroupKey === 'settings' && activeSubKey === 'general' && (
          <SafeTab label="general">
            <ClubGeneralAdminTab club={club} />
          </SafeTab>
        )}
        {activeGroupKey === 'settings' && activeSubKey === 'settings' && (
          <SafeTab label="settings">
            <ClubAdminTab club={club} />
          </SafeTab>
        )}
        {activeGroupKey === 'settings' && activeSubKey === 'dashboard' && shelterFoundation && shelterDashboard && (
          <SafeTab label="dashboard"><DashboardPage clubId={orgId} /></SafeTab>
        )}
      </Suspense>
    </ClubThemedScope>
  );
}
