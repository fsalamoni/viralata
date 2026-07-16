/**
 * @fileoverview AdopterDashboard — dashboard unificado do adotante (TASK-339).
 *
 * Rota: /meu-painel
 * Flag: SHELTER_ADOPTER_DASHBOARD_V1 (default OFF)
 *
 * Cards:
 *  1. Adoções concluídas (status concluded/completed/closed)
 *  2. Adoções em andamento (applied + in_review + approved)
 *  3. Pets favoritos (subcollection users/{uid}/favorites)
 *  4. Perfil completo % (do adopter profile)
 *  5. Próximas milestones de pós-adoção (kanban cards tag post-adoption)
 *  6. Notificações não lidas
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § TASK-339
 */
import { Link } from 'react-router-dom';
import {
  Heart,
  PawPrint,
  Bell,
  CheckCircle2,
  Clock,
  Star,
  UserCheck,
  ArrowRight,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAdopterDashboard } from '@/modules/adopter/hooks/useAdopterDashboard';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

function MetricCard({ icon: Icon, label, value, sublabel, href, tone = 'default' }) {
  const tones = {
    default: 'border-l-4 border-l-primary',
    success: 'border-l-4 border-l-green-500',
    warning: 'border-l-4 border-l-amber-500',
    danger: 'border-l-4 border-l-red-500',
    info: 'border-l-4 border-l-blue-500',
  };

  const content = (
    <Card className={`${tones[tone] || tones.default} hover:shadow-md transition-shadow cursor-pointer`}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className="rounded-full bg-primary/10 p-3 shrink-0">
          <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p>}
        </div>
        {href && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link to={href} className="block">{content}</Link>;
  }
  return content;
}

function ProfileCompletenessCard({ completeness, isLoading }) {
  const pct = Math.round(completeness ?? 0);
  const tone = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'danger';

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-6 w-16 mb-2" />
          <Skeleton className="h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${tone === 'success' ? 'border-l-green-500' : tone === 'warning' ? 'border-l-amber-500' : 'border-l-red-500'}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <UserCheck className="h-4 w-4" aria-hidden="true" />
            Perfil completo
          </p>
          <span className="text-lg font-bold">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" aria-label={`Perfil ${pct}% completo`} />
        {pct < 100 && (
          <Link
            to="/perfil"
            className="text-xs text-primary hover:underline mt-2 inline-block"
          >
            Completar perfil →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function MilestoneCard({ milestones = [], isLoading }) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Próximas milestones
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full mb-2" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            Próximas milestones
          </span>
          {milestones.length > 0 && (
            <Badge variant="secondary">{milestones.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Nenhuma milestone nos próximos 30 dias. 🎉
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Próximas milestones">
            {milestones.map((m) => {
              const dueDate = m.due_at?.toDate ? m.due_at.toDate() : new Date(m.due_at);
              const now = new Date();
              const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
              const isOverdue = diffDays < 0;
              const isToday = diffDays === 0;

              return (
                <li key={m.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    {isOverdue && <AlertCircle className="h-4 w-4 text-red-500 shrink-0" aria-label="Atrasado" />}
                    {isToday && <Clock className="h-4 w-4 text-amber-500 shrink-0" aria-label="Vence hoje" />}
                    {!isOverdue && !isToday && <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Agendado" />}
                    <span className="truncate">{m.title || m.name || 'Task sem título'}</span>
                  </div>
                  <span className={`text-xs shrink-0 ml-2 ${isOverdue ? 'text-red-600 font-medium' : isToday ? 'text-amber-600 font-medium' : 'text-muted-foreground'}`}>
                    {isOverdue ? `${Math.abs(diffDays)}d atrasado` : isToday ? 'Hoje' : `Em ${diffDays}d`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        {milestones.length > 0 && (
          <Link
            to="/adoptions"
            className="text-xs text-primary hover:underline mt-3 inline-block"
          >
            Ver todas →
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

export function AdopterDashboard() {
  const flagEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_ADOPTER_DASHBOARD_V1);
  const { isLoading, adoptions, profileCompleteness, milestones, favoritesCount, unreadCount } =
    useAdopterDashboard();

  if (!flagEnabled) {
    return (
      <div className="container mx-auto py-8 px-4 text-center">
        <p className="text-muted-foreground">Painel do adotante em breve.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6" data-testid="adopter-dashboard">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-7 w-7 text-primary" aria-hidden="true" />
          Meu Painel
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Visão geral das suas adoções, perfil e atividades.
        </p>
      </div>

      {/* Métricas principais — grid 1 / 2 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          icon={CheckCircle2}
          label="Adoções concluídas"
          value={isLoading ? '—' : adoptions?.concluded ?? 0}
          sublabel={`De ${isLoading ? '—' : adoptions?.total ?? 0} pedidos`}
          href="/adoptions"
          tone="success"
        />
        <MetricCard
          icon={Clock}
          label="Em andamento"
          value={isLoading ? '—' : (adoptions?.inProgress ?? 0) + (adoptions?.pending ?? 0)}
          sublabel={`${isLoading ? '' : (adoptions?.inProgress ?? 0) > 0 ? `${adoptions.inProgress} aprovadas, ` : ''}${isLoading ? '' : (adoptions?.pending ?? 0) > 0 ? `${adoptions.pending} pendentes` : ''}`}
          href="/adoptions"
          tone="info"
        />
        <MetricCard
          icon={Star}
          label="Pets favoritos"
          value={isLoading ? '—' : favoritesCount}
          href="/busca"
          tone="warning"
        />
      </div>

      {/* Perfil + Notificações */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ProfileCompletenessCard completeness={profileCompleteness} isLoading={isLoading} />
        <MetricCard
          icon={Bell}
          label="Notificações não lidas"
          value={isLoading ? '—' : unreadCount}
          sublabel={unreadCount > 0 ? 'Clique para ver' : undefined}
          tone={unreadCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Milestones de pós-adoção */}
      <MilestoneCard milestones={milestones} isLoading={isLoading} />

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" size="sm">
          <Link to="/adoptions">
            <PawPrint className="h-4 w-4 mr-2" aria-hidden="true" />
            Minhas adoções
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/busca">
            <Star className="h-4 w-4 mr-2" aria-hidden="true" />
            Explorar pets
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/perfil">
            <UserCheck className="h-4 w-4 mr-2" aria-hidden="true" />
            Meu perfil
          </Link>
        </Button>
      </div>
    </div>
  );
}
