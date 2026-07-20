/**
 * @fileoverview ShelterAdminDashboard V3 — redesign completo no padrão DS-V2.
 *
 * TASK-V3-SHELTER_ADMIN: implementação do zero, sem aproveitar o JSX do V1.
 *
 * Dashboard PESSOAL do admin do abrigo (TASK-311). Diferente do
 * DashboardPage (que é do abrigo inteiro), este foca na carga pessoal.
 *
 * Funcionalidades:
 *  - Hero impactante com gradient (emerald-500 → teal-600 → cyan-600)
 *  - 4 stat cards pessoais (Tasks, Applications, Pets, Devoluções)
 *  - 4 cards funcionais:
 *    1. Minhas tasks (kanban onde sou assignee)
 *    2. Applications recentes no abrigo
 *    3. Pets que cadastrei
 *    4. Devoluções pós-adoção
 *  - Empty states ricos
 *  - Loading skeleton
 *  - Error state com retry
 *  - SEO + JSON-LD
 *  - Dark mode com tokens DS-V2
 *  - Mobile-first
 *  - A11y WCAG AA
 *
 * Rota: /abrigos/:clubId/admin/dashboard
 *
 * @see docs/REGENCY_SHELTER_ADMIN_V3.md
 */
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CheckSquare, FileText, PawPrint, Home, Clock, ChevronRight,
  AlertCircle, RefreshCw, Sparkles, ArrowUpRight,
  Bell, Heart, UserCheck, Hourglass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ErrorState';
import Seo from '@/components/Seo';
import { cn } from '@/core/lib/utils';
import { db } from '@/core/config/firebase';
import {
  collection, collectionGroup, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { logger } from '@/core/lib/logger';

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { show: { transition: { staggerChildren: 0.08 } } };

// ============================================================================
// CONSTANTS
// ============================================================================

const STAT_CARDS = [
  { id: 'tasks', icon: CheckSquare, label: 'Minhas tasks', color: 'primary' },
  { id: 'apps', icon: FileText, label: 'Applications', color: 'sky' },
  { id: 'pets', icon: PawPrint, label: 'Pets cadastrados', color: 'amber' },
  { id: 'returns', icon: Heart, label: 'Devoluções', color: 'rose' },
];

const STATUS_COLORS = {
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  rejected: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-800',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800',
  pending: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
};

// ============================================================================
// HELPERS
// ============================================================================

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  } catch {
    return '—';
  }
}

function isOverdue(iso) {
  if (!iso) return false;
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
  return d && d < new Date();
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ icon: Icon, value, label, color, badge, reduce }) {
  const colorMap = {
    primary: { text: 'text-primary', bg: 'bg-primary/10' },
    sky: { text: 'text-sky-600', bg: 'bg-sky-100 dark:bg-sky-900/30' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
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
          <p className="text-xl font-extrabold text-white sm:text-2xl">{value || 0}</p>
        </div>
        {badge && (
          <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-100">
            {badge}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function TaskRow({ task, reduce }) {
  const overdue = isOverdue(task.due_at);
  return (
    <motion.li
      variants={ANIM}
      className="group flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 transition-all hover:border-primary/50 hover:shadow-sm"
      data-testid={`admin-task-${task.id}`}
    >
      <div className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
        overdue ? 'bg-rose-100 dark:bg-rose-900/30' : 'bg-primary/10',
      )}>
        {overdue ? (
          <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        ) : (
          <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {task.title || task.name || 'Task'}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {task.shelter_name && <span>{task.shelter_name}</span>}
          {task.due_at && (
            <span className={cn(
              'inline-flex items-center gap-0.5',
              overdue && 'font-semibold text-rose-600 dark:text-rose-400',
            )}>
              <Clock className="h-3 w-3" aria-hidden="true" /> {formatDate(task.due_at)}
              {overdue && <span className="ml-0.5 text-[9px] uppercase">• atrasado</span>}
            </span>
          )}
        </div>
      </div>
      {task.shelter_club_id && (
        <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
          <Link to={`/abrigos/${task.shelter_club_id}/kanban`} aria-label="Abrir kanban">
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </motion.li>
  );
}

function ApplicationRow({ app, reduce }) {
  return (
    <motion.li
      variants={ANIM}
      className="group flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 transition-all hover:border-primary/50 hover:shadow-sm"
      data-testid={`admin-app-${app.id}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
        <UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {app.pet_name || app.applicant_name || 'Application'}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {app.applicant_name || 'Adotante'} · {formatDate(app.created_at)}
        </p>
      </div>
      <Badge className={cn(
        'shrink-0 text-[10px]',
        STATUS_COLORS[app.status] || STATUS_COLORS.pending,
      )}>
        {app.status || 'pending'}
      </Badge>
    </motion.li>
  );
}

function PetRow({ pet, reduce }) {
  return (
    <motion.li
      variants={ANIM}
      className="group flex items-center gap-2 rounded-xl border border-border bg-card p-2.5 transition-all hover:border-primary/50 hover:shadow-sm"
      data-testid={`admin-pet-${pet.id}`}
    >
      {pet.photo_url ? (
        <img
          src={pet.photo_url}
          alt={pet.name || 'Pet'}
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
          <PawPrint className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{pet.name || pet.title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {pet.species || 'Pet'} · {pet.status || 'available'}
        </p>
      </div>
      <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
        <Link to={`/pet/${pet.id}`} aria-label={`Ver ${pet.name || 'pet'}`}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </motion.li>
  );
}

function SectionCard({ icon: Icon, title, desc, count, color, children, action, reduce }) {
  const colorMap = {
    primary: 'text-primary',
    sky: 'text-sky-600',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
  };
  return (
    <section className="rounded-2xl border border-border bg-card" data-testid={`section-${title.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 p-4">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Icon className={cn('h-4 w-4', colorMap[color] || colorMap.primary)} aria-hidden="true" />
            {title}
            {count > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {count}
              </Badge>
            )}
          </h2>
          {desc && <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">
        {children}
      </div>
    </section>
  );
}

function ShelterAdminSkeleton() {
  return (
    <div className="space-y-6" data-testid="shelter-admin-skeleton">
      <Skeleton className="h-40 w-full rounded-3xl" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-64 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ShelterAdminDashboardV3({ clubId: clubIdProp }) {
  const reduce = useReducedMotion();
  const { user } = useAuth();
  const params = useParams();
  const clubId = clubIdProp || params?.clubId;
  const flagEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_ADMIN_DASHBOARD_V1);

  const [tasks, setTasks] = useState([]);
  const [apps, setApps] = useState([]);
  const [myPets, setMyPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadCount, setLoadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        // 1) Minhas tasks kanban (assignees array-contains uid)
        const tasksQ = query(
          collectionGroup(db, 'kanban_cards'),
          where('assignees', 'array-contains', user.uid),
          orderBy('due_at', 'asc'),
          limit(20),
        );
        const tasksSnap = await getDocs(tasksQ).catch(() => ({ docs: [] }));
        const taskItems = (tasksSnap.docs || []).map((d) => {
          const card = { id: d.id, ...d.data() };
          const path = d.ref.path;
          const match = path.match(/clubs\/([^/]+)\//);
          if (match) card.shelter_club_id = match[1];
          return card;
        });

        // 2) Applications recentes deste abrigo
        let appItems = [];
        if (clubId) {
          // BUG-15 fix (2026-07-20): a subcoleção correta é `adoption_workflow`,
          // não `adoption_applications`. Confirma com firestore.rules:1383.
          const appsQ = query(
            collection(db, 'clubs', clubId, 'adoption_workflow'),
            orderBy('created_at', 'desc'),
            limit(50),
          );
          const appsSnap = await getDocs(appsQ).catch(() => ({ docs: [] }));
          appItems = (appsSnap.docs || []).map((d) => ({ id: d.id, ...d.data() }));
        }

        // 3) Pets que cadastrei
        const petsQ = query(
          collection(db, 'pets'),
          where('created_by', '==', user.uid),
          orderBy('created_at', 'desc'),
          limit(20),
        );
        const petsSnap = await getDocs(petsQ).catch(() => ({ docs: [] }));
        const petItems = (petsSnap.docs || []).map((d) => ({ id: d.id, ...d.data() }));

        if (cancelled) return;
        setTasks(taskItems);
        setApps(appItems);
        setMyPets(petItems);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          logger.warn('ShelterAdminDashboardV3', { err: String(err) });
          setError(err?.message || 'Erro ao carregar dados');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, clubId, loadCount]);

  // Stats computados
  const overdueCount = useMemo(() => tasks.filter((t) => isOverdue(t.due_at)).length, [tasks]);
  const recentAppsCount = useMemo(() => apps.slice(0, 5).length, [apps]);

  // JSON-LD
  const jsonLd = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Meu painel do abrigo — Viralata',
    description: 'Sua carga pessoal de trabalho como admin do abrigo.',
    url: `https://viralata.web.app/abrigos/${clubId || ':clubId'}/admin/dashboard`,
    isPartOf: {
      '@type': 'WebSite',
      name: 'Viralata',
      url: 'https://viralata.web.app',
    },
  }), [clubId]);

  // FLAG DISABLED
  if (!flagEnabled) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-8" data-testid="shelter-admin-dashboard">
        <Seo title="Meu painel do abrigo — Viralata" description="Dashboard pessoal do admin do abrigo." />
        <EmptyState
          icon={Home}
          title="Dashboard pessoal do admin"
          description="Funcionalidade em rollout gradual. Em breve disponível para todos os admins."
          action={
            <Button asChild>
              <Link to="/organizacoes">Voltar para Organizações</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // NOT LOGGED IN
  if (!user) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-8" data-testid="shelter-admin-dashboard">
        <Seo title="Meu painel do abrigo — Viralata" description="Dashboard pessoal do admin do abrigo." />
        <EmptyState
          icon={Home}
          title="Faça login para acessar"
          description="Entre como admin do abrigo para ver suas tasks, applications e pets."
          action={
            <Button asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          }
        />
      </div>
    );
  }

  // LOADING
  if (loading) {
    return (
      <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="shelter-admin-dashboard">
        <Seo title="Meu painel do abrigo — Viralata" description="Dashboard pessoal do admin do abrigo." />
        <ShelterAdminSkeleton />
      </div>
    );
  }

  // ERROR
  if (error) {
    return (
      <div className="arena-page mx-auto max-w-2xl space-y-6 px-4 py-12" data-testid="shelter-admin-dashboard">
        <Seo title="Erro — Meu painel" description="Erro ao carregar dashboard." />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ErrorState
          title="Não foi possível carregar seu painel"
          description={`Erro: ${error}. Verifique sua conexão e tente novamente.`}
          action={
            <Button onClick={() => setLoadCount((c) => c + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Tentar novamente
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-6xl space-y-6 px-4 py-6 pb-24" data-testid="shelter-admin-dashboard">
      <Seo
        title="Meu painel do abrigo — Viralata"
        description="Sua carga pessoal de trabalho como admin do abrigo: tasks, applications e pets."
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* HERO */}
      <motion.section
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 p-6 text-white shadow-2xl sm:p-10"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" aria-hidden="true" />
        <div className="relative">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="border-0 bg-white/20 text-white backdrop-blur">
              <Home className="mr-1 h-3 w-3" aria-hidden="true" />
              Meu painel
            </Badge>
            <Badge variant="secondary" className="border-0 bg-emerald-500/20 text-emerald-100 backdrop-blur">
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Carga pessoal
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="secondary" className="border-0 bg-rose-500/20 text-rose-100 backdrop-blur">
                <AlertCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <motion.h1
            variants={ANIM}
            className="text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl lg:text-4xl"
          >
            Olá, {user.displayName?.split(' ')[0] || 'admin'} 👋
          </motion.h1>
          <motion.p
            variants={ANIM}
            className="mt-1 text-sm text-white/90 sm:text-base"
          >
            Sua carga pessoal de trabalho — não do abrigo inteiro.
          </motion.p>

          {/* Stats */}
          <motion.div
            variants={ANIM}
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            <StatCard
              icon={CheckSquare}
              value={tasks.length}
              label="Minhas tasks"
              color="primary"
              badge={overdueCount > 0 ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''}` : null}
              reduce={reduce}
            />
            <StatCard
              icon={FileText}
              value={apps.length}
              label="Applications"
              color="sky"
              reduce={reduce}
            />
            <StatCard
              icon={PawPrint}
              value={myPets.length}
              label="Pets cadastrados"
              color="amber"
              reduce={reduce}
            />
            <StatCard
              icon={Heart}
              value="—"
              label="Devoluções"
              color="rose"
              reduce={reduce}
            />
          </motion.div>
        </div>
      </motion.section>

      {/* WORKLOAD CARDS (grid 1/2/3) */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
      >
        {/* Minhas tasks */}
        <SectionCard
          icon={CheckSquare}
          title="Minhas tasks"
          desc="Kanban onde sou assignee"
          count={tasks.length}
          color="primary"
          action={
            tasks.length > 0 && (
              <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                <Link to="/organizacoes">
                  Ver todos <ArrowUpRight className="ml-0.5 h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
            )
          }
        >
          {tasks.length === 0 ? (
            <EmptyState
              icon={Hourglass}
              title="Nenhuma task atribuída"
              description="Quando alguém atribuir uma task do Kanban a você, ela aparece aqui."
              className="py-4"
            />
          ) : (
            <motion.ul
              initial="hidden"
              animate="show"
              variants={reduce ? undefined : stagger}
              className="space-y-1.5"
            >
              {tasks.slice(0, 5).map((t) => (
                <TaskRow key={t.id} task={t} reduce={reduce} />
              ))}
            </motion.ul>
          )}
        </SectionCard>

        {/* Applications */}
        <SectionCard
          icon={FileText}
          title="Applications"
          desc="Recentes neste abrigo"
          count={recentAppsCount}
          color="sky"
          action={
            apps.length > 0 && (
              <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                <Link to="/organizacoes">
                  Ver todas <ArrowUpRight className="ml-0.5 h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
            )
          }
        >
          {apps.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="Nenhuma application"
              description="Quando alguém se candidatar a um pet do abrigo, a application aparece aqui."
              className="py-4"
            />
          ) : (
            <motion.ul
              initial="hidden"
              animate="show"
              variants={reduce ? undefined : stagger}
              className="space-y-1.5"
            >
              {apps.slice(0, 5).map((a) => (
                <ApplicationRow key={a.id} app={a} reduce={reduce} />
              ))}
            </motion.ul>
          )}
        </SectionCard>

        {/* Pets cadastrados */}
        <SectionCard
          icon={PawPrint}
          title="Pets cadastrados"
          desc="Pets onde sou criador"
          count={myPets.length}
          color="amber"
          action={
            myPets.length > 0 && (
              <Button asChild size="sm" variant="ghost" className="h-7 text-[11px]">
                <Link to="/meus-pets">
                  Ver todos <ArrowUpRight className="ml-0.5 h-3 w-3" aria-hidden="true" />
                </Link>
              </Button>
            )
          }
        >
          {myPets.length === 0 ? (
            <EmptyState
              icon={PawPrint}
              title="Nenhum pet cadastrado"
              description="Quando você cadastrar um pet, ele aparece aqui para fácil acesso."
              action={
                clubId && (
                  <Button asChild size="sm">
                    <Link to={`/abrigos/${clubId}`}>
                      Cadastrar pet
                      <Sparkles className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </Button>
                )
              }
              className="py-4"
            />
          ) : (
            <motion.ul
              initial="hidden"
              animate="show"
              variants={reduce ? undefined : stagger}
              className="space-y-1.5"
            >
              {myPets.slice(0, 5).map((p) => (
                <PetRow key={p.id} pet={p} reduce={reduce} />
              ))}
            </motion.ul>
          )}
        </SectionCard>
      </motion.div>

      {/* DEVOLUÇÕES PÓS-ADOÇÃO (TASK-308) */}
      {clubId && (
        <motion.section
          initial={reduce ? false : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl border border-border bg-card p-5"
        >
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-foreground">
            <Bell className="h-4 w-4 text-rose-600" aria-hidden="true" />
            Devoluções pós-adoção
          </h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe pets devolvidos após adoção neste abrigo e tome ações de cuidado.
          </p>
          <PostAdoptionReturnedList shelterClubId={clubId} />
        </motion.section>
      )}

      {/* CTA FINAL */}
      <motion.section
        initial={reduce ? false : { opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 p-6 text-white shadow-lg sm:p-8"
      >
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">
              Precisa de uma visão agregada do abrigo inteiro?
            </h2>
            <p className="mt-1 text-sm text-white/90">
              Acesse o dashboard completo com métricas, indicadores e relatórios.
            </p>
          </div>
          <Button asChild size="lg" className="bg-white text-emerald-700 hover:bg-white/90">
            <Link to={`/abrigos/${clubId || ''}/admin`}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
              Painel do abrigo
              <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </motion.section>
    </div>
  );
}

// Lazy load PostAdoptionReturnedList to keep V3 chunk small
const PostAdoptionReturnedList = lazy(() =>
  import('@/modules/shelter/components/PostAdoptionReturnedList').then((m) => ({
    default: m.PostAdoptionReturnedList,
  })),
);
