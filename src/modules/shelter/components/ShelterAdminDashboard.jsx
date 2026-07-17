/**
 * @fileoverview ShelterAdminDashboard — dashboard pessoal do admin
 * do abrigo (TASK-311).
 *
 * Cards filtrados por uid:
 *  - "Minhas tasks pendentes" (kanban onde sou assignee)
 *  - "Applications atribuídas a mim"
 *  - "Pets que cadastrei"
 *
 * Diferente do DashboardPage (que é do abrigo inteiro, métricas
 * agregadas). Aqui o foco é a carga pessoal do admin.
 *
 * Flag: SHELTER_ADMIN_DASHBOARD_V1 (default OFF).
 */

import { useState, useEffect } from 'react';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { Link } from 'react-router-dom';
import {
  CheckSquare, FileText, PawPrint, Home, Clock, ChevronRight,
} from 'lucide-react';
import { PostAdoptionReturnedList } from '@/modules/shelter/components/PostAdoptionReturnedList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import Seo from '@/components/Seo';
import PageHero from '@/components/PageHero';
import { db } from '@/core/config/firebase';
import {
  collection, collectionGroup, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { logger } from '@/core/lib/logger';
import { cn } from '@/core/lib/utils';

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

function TaskRow({ task }) {
  const overdue = isOverdue(task.due_at);
  return (
    <li
      className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-border/40 hover:bg-muted/30"
      data-testid={`admin-task-${task.id}`}
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium truncate">{task.title || task.name || 'Task'}</p>
        <div className="flex items-center gap-1.5 flex-wrap text-xs text-muted-foreground">
          {task.shelter_name && <span>{task.shelter_name}</span>}
          {task.due_at && (
            <span className={cn('inline-flex items-center gap-1', overdue && 'text-red-600 font-medium')}>
              <Clock className="h-3 w-3" /> {formatDate(task.due_at)}
            </span>
          )}
        </div>
      </div>
      {task.shelter_club_id && (
        <Button asChild size="sm" variant="ghost">
          <Link to={`/abrigos/${task.shelter_club_id}/kanban`}>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </Button>
      )}
    </li>
  );
}

function ApplicationRow({ app }) {
  return (
    <li
      className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-border/40 hover:bg-muted/30"
      data-testid={`admin-app-${app.id}`}
    >
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium truncate">
          {app.pet_name || app.applicant_name || 'Application'}
        </p>
        <p className="text-xs text-muted-foreground">
          {app.applicant_name || 'Adotante'} · {formatDate(app.created_at)}
        </p>
      </div>
      <Badge
        className={cn(
          'text-[10px]',
          app.status === 'approved' && 'bg-emerald-100 text-emerald-800 border-emerald-200',
          app.status === 'rejected' && 'bg-red-100 text-red-800 border-red-200',
          app.status === 'in_review' && 'bg-amber-100 text-amber-800 border-amber-200',
          !['approved', 'rejected', 'in_review'].includes(app.status) && 'bg-slate-100 text-slate-700 border-slate-200',
        )}
      >
        {app.status || 'pending'}
      </Badge>
    </li>
  );
}

function PetRow({ pet }) {
  return (
    <li
      className="flex items-center justify-between gap-2 p-2.5 rounded-md border border-border/40 hover:bg-muted/30"
      data-testid={`admin-pet-${pet.id}`}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {pet.photo_url ? (
          <img
            src={pet.photo_url}
            alt={pet.name}
            className="h-9 w-9 rounded-md object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
            <PawPrint className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{pet.name || pet.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {pet.species} · {pet.status || 'available'}
          </p>
        </div>
      </div>
      <Button asChild size="sm" variant="ghost">
        <Link to={`/pet/${pet.id}`}>
          <ChevronRight className="h-3 w-3" />
        </Link>
      </Button>
    </li>
  );
}

export function ShelterAdminDashboard({ clubId }) {
  const { user } = useAuth();
  const flagEnabled = useFeatureFlag('SHELTER_ADMIN_DASHBOARD_V1');
  // FIX: todas as 3 views agora usam useArenaPageClasses em vez de
  // className hardcoded 'container py-8 max-w-Xxl', garantindo consistência DS_V2.
  const disabledClass = useArenaPageClasses('arena-page mx-auto max-w-2xl px-4 py-8');
  const signinClass = useArenaPageClasses('arena-page mx-auto max-w-2xl px-4 py-8');
  const mainClass = useArenaPageClasses('arena-page mx-auto max-w-5xl px-4 py-8');
  const loadingClass = useArenaPageClasses('arena-page mx-auto max-w-5xl px-4');

  const [tasks, setTasks] = useState([]);
  const [apps, setApps] = useState([]);
  const [myPets, setMyPets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
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

        // 2) Applications pendentes deste abrigo
        let appItems = [];
        if (clubId) {
          const appsQ = query(
            collection(db, 'clubs', clubId, 'adoption_applications'),
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
          logger.warn('ShelterAdminDashboard', { err: String(err) });
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid, clubId]);

  if (!flagEnabled) {
    return (
      <main className={disabledClass} data-testid="admin-dash-disabled">
        <EmptyState
          icon={Home}
          title="Dashboard pessoal do admin"
          description="Funcionalidade em rollout gradual. Em breve disponível para todos os admins."
        />
      </main>
    );
  }

  if (!user) {
    return (
      <main className={signinClass} data-testid="admin-dash-signin">
        <EmptyState
          icon={Home}
          title="Faça login para acessar"
          description="Entre como admin do abrigo para ver suas tasks."
          action={
            <Button asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          }
        />
      </main>
    );
  }

  return (
    <main className={mainClass} data-testid="shelter-admin-dashboard">
      <Seo title="Meu painel do abrigo" description="Minhas tasks, applications e pets cadastrados." />
      <PageHero
        icon={Home}
        title="Meu painel do abrigo"
        subtitle="Sua carga pessoal de trabalho, não do abrigo inteiro."
      />

      {loading ? (
        <div className={loadingClass}>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <section className="arena-section-card">
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" /> Minhas tasks
                </span>
                <Badge variant="secondary" className="text-[10px]">{tasks.length}</Badge>
              </h3>
              <p className="arena-section-card-description">Kanban onde sou assignee</p>
            </div>
            <div className="arena-section-card-body space-y-1.5">
              {tasks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
                  Nenhuma task atribuída a você.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {tasks.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} />)}
                </ul>
              )}
            </div>
          </section>

          <section className="arena-section-card">
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Applications
                </span>
                <Badge variant="secondary" className="text-[10px]">{apps.length}</Badge>
              </h3>
              <p className="arena-section-card-description">Recentes neste abrigo</p>
            </div>
            <div className="arena-section-card-body space-y-1.5">
              {apps.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
                  Nenhuma application no abrigo.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {apps.slice(0, 5).map((a) => <ApplicationRow key={a.id} app={a} />)}
                </ul>
              )}
            </div>
          </section>

          <section className="arena-section-card">
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <PawPrint className="h-4 w-4 text-primary" /> Pets cadastrados
                </span>
                <Badge variant="secondary" className="text-[10px]">{myPets.length}</Badge>
              </h3>
              <p className="arena-section-card-description">Pets onde sou criador</p>
            </div>
            <div className="arena-section-card-body space-y-1.5">
              {myPets.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-1 py-2">
                  Você ainda não cadastrou pets.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {myPets.slice(0, 5).map((p) => <PetRow key={p.id} pet={p} />)}
                </ul>
              )}
            </div>
          </section>

          {/* Devoluções pós-adoção (TASK-308) */}
          {clubId && (
            <PostAdoptionReturnedList shelterClubId={clubId} />
          )}
        </div>
      )}
    </main>
  );
}

export default ShelterAdminDashboard;
