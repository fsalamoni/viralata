/**
 * @fileoverview PROFILE V3 — redesign completo no padrão DS-V2.
 *
 * V3 (TASK-V3-PROFILE): implementação do zero, sem aproveitar o JSX do V1.
 * Flag: V3_PAGE_PROFILE (default OFF, gated via React.lazy).
 *
 * Decisões:
 *  - D-PROFILE-V3-01: tabs sticky no topo (mobile) com offset pra topbar
 *  - D-PROFILE-V3-02: 5 abas (Visão Geral / Voluntário / Adoções / Eventos / Privacidade)
 *  - D-PROFILE-V3-03: hero com avatar grande + 4 stat cards horizontais
 *  - D-PROFILE-V3-04: usa componentes do V1 via props (não duplica lógica)
 *  - D-PROFILE-V3-05: empty state claro em cada aba ("Você ainda não...")
 *  - D-PROFILE-V3-06: a11y — Tabs Radix + aria-labels
 *  - D-PROFILE-V3-07: dark mode com tokens DS-V2
 *
 * @see docs/V3_PROFILE_QUESTIONS.md
 * @see docs/REGENCY_PROFILE_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  User, Heart, Calendar, Shield, AlertCircle, LogOut,
  Edit, Camera, Award, TrendingUp, Sparkles, ChevronRight,
  Home as HomeIcon, Bell, Lock, Download, Trash2,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useQuery } from '@tanstack/react-query';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Seo } from '@/components/Seo';
import { UserAvatar } from '@/components/ui/user-avatar';
import { AppearanceSettings } from '@/components/AppearanceSettings';
import { VolunteerSection } from '@/modules/shelter/components/VolunteerSection';
import { MyAdoptionsSection } from '@/modules/shelter/components/MyAdoptionsSection';
import { MyFostersSection } from '@/modules/shelter/components/MyFostersSection';
import { MyTasksSection } from '@/modules/shelter/components/MyTasksSection';
import { CrossRosterSection } from '@/modules/shelter/components/CrossRosterSection';
import { UpcomingEventsSection } from '@/modules/communities/components/UpcomingEventsSection';
import { exportMyData, downloadDataExport } from '@/core/services/dataExportService';

// ============================================================================
// DATA
// ============================================================================

const STAT_CARDS = [
  { key: 'adoptions', label: 'Adoções concluídas', icon: Heart, color: 'text-rose-500' },
  { key: 'fosters', label: 'Lares temporários', icon: HomeIcon, color: 'text-amber-500' },
  { key: 'tasks', label: 'Tarefas voluntário', icon: Award, color: 'text-emerald-500' },
  { key: 'events', label: 'Eventos próximos', icon: Calendar, color: 'text-sky-500' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

// ============================================================================
// HOOKS AUXILIARES
// ============================================================================

/**
 * Busca contadores agregados do usuário (adoções, lares, tarefas, eventos).
 * Usa Firestore count queries com cache 5min.
 */
function useProfileStats(uid) {
  return useQuery({
    queryKey: ['profile-stats', uid],
    queryFn: async () => {
      if (!db || !uid) return { adoptions: 0, fosters: 0, tasks: 0, events: 0 };

      try {
        // Adoções: collection 'adoptions' onde userUid == uid
        const adoptionsQ = query(collection(db, 'adoptions'), where('userUid', '==', uid));
        const adoptionsSnap = await getCountFromServer(adoptionsQ);

        // Lares temporários: 'fosters' onde userUid == uid
        const fostersQ = query(collection(db, 'fosters'), where('userUid', '==', uid));
        const fostersSnap = await getCountFromServer(fostersQ);

        // Tarefas voluntário: 'volunteerTasks' onde volunteerUid == uid
        const tasksQ = query(collection(db, 'volunteerTasks'), where('volunteerUid', '==', uid));
        const tasksSnap = await getCountFromServer(tasksQ);

        return {
          adoptions: adoptionsSnap.data().count,
          fosters: fostersSnap.data().count,
          tasks: tasksSnap.data().count,
          events: 0, // Eventos é dinâmico, calculado em UpcomingEventsSection
        };
      } catch (err) {
        console.warn('[useProfileStats] Firestore fetch falhou:', err);
        return { adoptions: 0, fosters: 0, tasks: 0, events: 0 };
      }
    },
    enabled: !!uid,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function ProfileHero({ user, stats, reduce }) {
  const fullName = user?.displayName || user?.email?.split('@')[0] || 'Usuário';
  const email = user?.email || '';
  const isVolunteer = !!stats?.isVolunteer;

  return (
    <section
      aria-labelledby="profile-hero-title"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 p-6 text-white shadow-lg sm:p-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
      <motion.div
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : stagger}
        className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7"
      >
        <motion.div variants={fadeUp} className="relative flex-shrink-0">
          <UserAvatar user={user} size="2xl" className="ring-4 ring-white/30" />
          <button
            type="button"
            className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-card text-foreground shadow-md transition-transform hover:scale-110"
            aria-label="Alterar foto de perfil"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
          </button>
        </motion.div>
        <div className="flex-1 min-w-0">
          <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-2">
            <h1 id="profile-hero-title" className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              {fullName}
            </h1>
            {isVolunteer && (
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                <Award className="mr-1 h-3 w-3" aria-hidden="true" />
                Voluntário
              </Badge>
            )}
          </motion.div>
          <motion.p variants={fadeUp} className="mt-1 text-sm text-white/80">
            {email}
          </motion.p>
          <motion.div variants={fadeUp} className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-0">
              <Link to="/onboarding">
                <Edit className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                Editar perfil
              </Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="text-white hover:bg-white/20">
              <Link to="/feed">
                <Heart className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                Ver pets
              </Link>
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function StatsRow({ stats, loading, reduce }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map((s) => (
          <div key={s.key} className="rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="mt-2 h-7 w-12" />
            <Skeleton className="mt-1 h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={reduce ? undefined : stagger}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4"
    >
      {STAT_CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats?.[card.key] ?? 0;
        return (
          <motion.div
            key={card.key}
            variants={fadeUp}
            className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
          >
            <Icon className={`h-5 w-5 ${card.color}`} aria-hidden="true" />
            <div className="mt-2 text-2xl font-extrabold text-foreground">{value}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{card.label}</div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

function OverviewTab({ user, stats, reduce }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={reduce ? undefined : stagger}
      className="space-y-5"
    >
      <motion.section variants={fadeUp} className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-foreground">Resumo</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Acompanhe sua jornada na plataforma. Adoções, lares temporários e atividades
          de voluntário aparecem aqui e nas abas dedicadas.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li className="flex items-center gap-2 text-foreground/90">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{stats?.adoptions ?? 0} adoções realizadas</span>
          </li>
          <li className="flex items-center gap-2 text-foreground/90">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{stats?.fosters ?? 0} lares temporários oferecidos</span>
          </li>
          <li className="flex items-center gap-2 text-foreground/90">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{stats?.tasks ?? 0} tarefas de voluntário</span>
          </li>
        </ul>
      </motion.section>

      <motion.section variants={fadeUp} className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-foreground">Notificações</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Receba alertas de pets compatíveis, mensagens de ONGs e atualizações de
          adoções em andamento. Configurável no menu de preferências.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-3">
          <Link to="/preferencias">
            Configurar notificações
            <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </Button>
      </motion.section>
    </motion.div>
  );
}

function PrivacyTab({ user, reduce }) {
  const [exporting, setExporting] = useState(false);
  const navigate = useNavigate();

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportMyData();
      downloadDataExport(data);
    } catch (err) {
      console.error('Export falhou:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={reduce ? undefined : stagger}
      className="space-y-5"
    >
      <motion.section variants={fadeUp}>
        <AppearanceSettings />
      </motion.section>

      <motion.section variants={fadeUp} className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-bold text-foreground">Seus dados (LGPD)</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Exporte todos os dados que armazenamos sobre você em formato JSON. Inclui
          perfil, adoções, mensagens, avaliações e configurações.
        </p>
        <Button onClick={handleExport} disabled={exporting} size="sm" className="mt-3">
          {exporting ? 'Exportando...' : 'Exportar meus dados'}
        </Button>
      </motion.section>

      <motion.section variants={fadeUp} className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
          <h2 className="text-base font-bold text-destructive">Excluir conta</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta ação é <strong>permanente e irreversível</strong>. Todos os seus dados
          serão removidos, incluindo adoções em andamento e mensagens.
        </p>
        <Button asChild variant="destructive" size="sm" className="mt-3">
          <Link to="/excluir-conta">
            <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Excluir conta permanentemente
          </Link>
        </Button>
      </motion.section>
    </motion.div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function ProfileV3() {
  const reduce = useReducedMotion();
  const { user, isLoadingAuth, isProfileComplete } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Stats do Firestore
  const { data: stats, isLoading: statsLoading } = useProfileStats(user?.uid);

  // Detectar se é voluntário (heurística simples — se tem tasks > 0 ou foster > 0)
  const isVolunteer = useMemo(
    () => (stats?.tasks ?? 0) > 0 || (stats?.fosters ?? 0) > 0,
    [stats]
  );

  // Skeleton se carregando auth
  if (isLoadingAuth) {
    return <ProfileSkeleton />;
  }

  // Não autenticado
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <User className="mx-auto h-12 w-12 text-muted-foreground" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-extrabold text-foreground">Você não está logado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre para acessar seu perfil, adoções e configurações.
        </p>
        <Button asChild className="mt-6">
          <Link to="/login">Entrar</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="arena-page mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8" data-testid="profile-page">
      <Seo
        title="Meu perfil — Viralata"
        description="Gerencie seu perfil, adoções, atividades de voluntário e configurações de privacidade."
      />

      <ProfileHero user={user} stats={{ ...stats, isVolunteer }} reduce={reduce} />

      <div className="mt-6">
        <StatsRow stats={stats} loading={statsLoading} reduce={reduce} />
      </div>

      {/* Tabs sticky no topo (mobile-first) */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="mt-6"
      >
        <div className="sticky top-[64px] z-30 -mx-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:-mx-6 sm:px-6">
          <TabsList className="flex w-full justify-start gap-1 overflow-x-auto bg-transparent p-0 scrollbar-hide">
            <TabsTrigger value="overview" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <User className="mr-2 h-4 w-4" aria-hidden="true" />
              Visão geral
            </TabsTrigger>
            <TabsTrigger value="volunteer" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Award className="mr-2 h-4 w-4" aria-hidden="true" />
              Voluntário
            </TabsTrigger>
            <TabsTrigger value="adoptions" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Heart className="mr-2 h-4 w-4" aria-hidden="true" />
              Adoções
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Calendar className="mr-2 h-4 w-4" aria-hidden="true" />
              Eventos
            </TabsTrigger>
            <TabsTrigger value="privacy" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Shield className="mr-2 h-4 w-4" aria-hidden="true" />
              Privacidade
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-5">
          <OverviewTab user={user} stats={stats} reduce={reduce} />
        </TabsContent>

        <TabsContent value="volunteer" className="mt-5">
          {user?.uid ? (
            <VolunteerSection userUid={user.uid} />
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Faça login para acessar o painel de voluntário.
            </div>
          )}
        </TabsContent>

        <TabsContent value="adoptions" className="mt-5 space-y-5">
          {user?.uid ? (
            <>
              <MyAdoptionsSection userUid={user.uid} />
              <MyFostersSection userUid={user.uid} />
              <MyTasksSection userUid={user.uid} />
              <CrossRosterSection userUid={user.uid} />
            </>
          ) : (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Faça login para ver suas adoções.
            </div>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-5">
          <UpcomingEventsSection userUid={user.uid} />
        </TabsContent>

        <TabsContent value="privacy" className="mt-5">
          <PrivacyTab user={user} reduce={reduce} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
