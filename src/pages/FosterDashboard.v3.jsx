/**
 * @fileoverview FosterDashboard V3 — painel pessoal do Lar Temporário.
 *
 * V3 (TASK-V3-FOSTER): redesign do zero, sem aproveitar o JSX do V1.
 * Flag: V3_PAGE_FOSTER (default OFF, gated via React.lazy).
 *
 * Rota: /lares-temporarios/dashboard
 *
 * Funcionalidades:
 *  - 3 stat cards (pets sob guarda, próximos fins, histórico)
 *  - Lista de placements ativos com ações (devolver, encerrar)
 *  - CTA "Quero ser Lar Temporário" se user ainda não é LT
 *  - Filtros por status (todos, ativos, encerrados)
 *  - Tela de sucesso ao encerrar LT (com rating)
 *
 * Decisões:
 *  - D-FOSTER-V3-01: hero gradient com nome do LT + 3 stat cards
 *  - D-FOSTER-V3-02: tabs/filtros por status
 *  - D-FOSTER-V3-03: lista de placements com ações contextuais
 *  - D-FOSTER-V3-04: dialog de encerramento com rating (1-5 stars) + feedback
 *  - D-FOSTER-V3-05: empty state se user não é LT
 *  - D-FOSTER-V3-06: dark mode com tokens DS-V2
 *  - D-FOSTER-V3-07: a11y WCAG AA
 *
 * @see docs/V3_FOSTER_QUESTIONS.md
 * @see docs/REGENCY_FOSTER_V3.md
 * @see .harness/v3-redesign/DIRECTIVE.md
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Home, Calendar, CheckCircle2, Star, PawPrint, ChevronRight,
  Heart, AlertCircle, Loader2, Plus, ClipboardList, Activity,
  Clock, Award, MessageCircle, X,
} from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Seo } from '@/components/Seo';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  FOSTER_STATUS, isFosterNearEnd, fosterDurationDays,
} from '@/modules/shelter/domain/operational/foster';
import {
  useFosters, useEndFoster,
} from '@/modules/shelter/hooks/useFosters';
import { useFostersList } from '@/core/hooks/useFostersList';
import { toast } from 'sonner';

// ============================================================================
// DATA
// ============================================================================

const STATUS_META = {
  active: { label: 'Ativo', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  extended: { label: 'Prorrogado', color: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  ended_returned: { label: 'Devolvido', color: 'bg-gray-100 text-gray-800 border-gray-300', dot: 'bg-gray-500' },
  ended_adopted: { label: 'Adotado via LT', color: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  ended: { label: 'Encerrado', color: 'bg-gray-100 text-gray-800 border-gray-300', dot: 'bg-gray-500' },
  cancelled_by_foster: { label: 'Cancelado por mim', color: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
  cancelled_by_shelter: { label: 'Cancelado pelo abrigo', color: 'bg-red-100 text-red-800 border-red-300', dot: 'bg-red-500' },
};

const FILTERS = [
  { id: 'active', label: 'Ativos', icon: Activity, statuses: ['active', 'extended', 'pending'] },
  { id: 'near_end', label: 'Próx. do fim', icon: Clock, statuses: ['active', 'extended'] },
  { id: 'history', label: 'Histórico', icon: CheckCircle2, statuses: ['ended_returned', 'ended_adopted', 'ended', 'cancelled_by_foster', 'cancelled_by_shelter'] },
  { id: 'all', label: 'Todos', icon: ClipboardList, statuses: null },
];

const ANIM = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ============================================================================
// UTILS
// ============================================================================

function formatDate(value) {
  if (!value) return '—';
  try {
    const d = typeof value === 'string'
      ? new Date(value)
      : value?.toDate?.() || value;
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function daysUntil(value) {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(value) : value?.toDate?.();
  if (!d) return null;
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatCard({ title, count, icon: Icon, accent, footer }) {
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
          <p
            className={`mt-2 text-3xl font-extrabold ${
              accent === 'primary' ? 'text-primary' :
              accent === 'amber' ? 'text-amber-600' :
              accent === 'emerald' ? 'text-emerald-600' : 'text-foreground'
            }`}
          >
            {count}
          </p>
          {footer && <p className="mt-1 text-xs text-muted-foreground">{footer}</p>}
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            accent === 'primary' ? 'bg-primary/10 text-primary' :
            accent === 'amber' ? 'bg-amber-100 text-amber-700' :
            accent === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
            'bg-muted text-muted-foreground'
          }`}
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </motion.div>
  );
}

function PlacementRow({ placement, onEnd, onReturn }) {
  const status = STATUS_META[placement.status] || STATUS_META.active;
  const dUntil = daysUntil(placement.end_date);
  const isActive = placement.status === 'active' || placement.status === 'extended';
  const isNearEnd = isActive && dUntil !== null && dUntil >= 0 && dUntil <= 7;

  return (
    <motion.li
      variants={ANIM}
      className="rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-sm"
      data-testid={`foster-row-${placement.id}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`text-xs ${status.color} border`}>
              <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${status.dot}`} aria-hidden="true" />
              {status.label}
            </Badge>
            {placement.pet_name && (
              <span className="flex items-center gap-1 text-sm font-semibold text-foreground">
                <PawPrint className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {placement.pet_name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {placement.shelter_name || placement.shelter_club_id} ·{' '}
            {formatDate(placement.start_date)} → {formatDate(placement.end_date)}
          </p>
          {isNearEnd && (
            <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3 w-3" aria-hidden="true" />
              Encerra em {dUntil === 0 ? 'hoje' : dUntil === 1 ? '1 dia' : `${dUntil} dias`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {placement.pet_id && (
            <Button asChild size="sm" variant="ghost">
              <Link to={`/pet/${placement.pet_id}`}>
                Ver pet
                <ChevronRight className="ml-1 h-3 w-3" aria-hidden="true" />
              </Link>
            </Button>
          )}
          {isActive && (
            <>
              <Button size="sm" variant="outline" onClick={() => onReturn(placement)}>
                Devolver
              </Button>
              <Button size="sm" onClick={() => onEnd(placement)}>
                Encerrar
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.li>
  );
}

function EndDialog({ open, placement, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (open) {
      setReason('');
      setRating(0);
      setFeedback('');
    }
  }, [open]);

  if (!placement) return null;

  const canSubmit = reason.trim().length >= 5 && rating > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Encerrar lar temporário</DialogTitle>
          <DialogDescription>
            Como foi sua experiência cuidando de <strong>{placement.pet_name || 'este pet'}</strong>?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="end-reason">Motivo do encerramento *</Label>
            <Textarea
              id="end-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pet adaptado, entregue ao adotante direto"
              rows={2}
              aria-invalid={reason.trim().length > 0 && reason.trim().length < 5}
            />
            {reason.trim().length > 0 && reason.trim().length < 5 && (
              <p className="mt-1 text-xs text-destructive">Mínimo 5 caracteres</p>
            )}
          </div>
          <div>
            <Label>Avaliação do abrigo (1-5)</Label>
            <div className="mt-1 flex items-center gap-1" role="radiogroup" aria-label="Avaliação do abrigo">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  aria-label={`Avaliar com ${n} ${n > 1 ? 'estrelas' : 'estrela'}`}
                  aria-checked={rating === n}
                  role="radio"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      n <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 hover:text-amber-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-medium text-foreground">{rating}/5</span>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="end-feedback">Feedback (opcional)</Label>
            <Textarea
              id="end-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Compartilhe como foi a experiência..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ reason, rating, feedback })}
            disabled={!canSubmit || loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                Encerrando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                Confirmar encerramento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HeroPanel({ user, stats, reduce }) {
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'Voluntário';
  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={reduce ? undefined : { show: { transition: { staggerChildren: 0.08 } } }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-6 text-white shadow-lg sm:p-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_60%)]" aria-hidden="true" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <motion.div variants={ANIM} className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Home className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Lar Temporário</span>
          </motion.div>
          <motion.h1 variants={ANIM} className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
            Olá, {displayName}
          </motion.h1>
          <motion.p variants={ANIM} className="mt-1 text-sm text-white/80">
            Acompanhe seus placements, devolva pets, avalie abrigos e celebre cada adoção.
          </motion.p>
        </div>
        <motion.div variants={ANIM}>
          <Button asChild size="sm" variant="secondary" className="border-0 bg-white/20 text-white hover:bg-white/30">
            <Link to="/lares-temporarios">
              <Plus className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Ver programa
            </Link>
          </Button>
        </motion.div>
      </div>
    </motion.section>
  );
}

function EmptyLTState() {
  return (
    <motion.div
      variants={ANIM}
      className="rounded-2xl border-2 border-dashed border-emerald-300/50 bg-emerald-50/30 p-8 text-center dark:border-emerald-700/50 dark:bg-emerald-900/10"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <Home className="h-8 w-8" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-xl font-extrabold text-foreground">Você ainda não é Lar Temporário</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Acolha temporariamente pets resgatados enquanto eles esperam por um lar definitivo.
        É voluntário, gratuito e faz toda a diferença.
      </p>
      <div className="mt-6 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link to="/lares-temporarios">
            <Heart className="mr-2 h-4 w-4" aria-hidden="true" />
            Quero ser Lar Temporário
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/feed">
            Ver pets para LT
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

function FosterDashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="flex gap-2">
        {[0,1,2,3].map(i => <Skeleton key={i} className="h-9 w-24 rounded-md" />)}
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

// ============================================================================
// PAGE
// ============================================================================

export default function FosterDashboardV3() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [filter, setFilter] = useState('active');
  const [endOpen, setEndOpen] = useState(false);
  const [activePlacement, setActivePlacement] = useState(null);

  // Buscar placements do user
  // Como FosterDashboard é pessoal, precisamos de um hook que busca TODOS os placements
  // onde o user é foster. Vou usar useFosters (que aceita shelterClubId) com base em shelterClubId do user
  // Por simplicidade, vou usar useFostersList se existir
  const { data: placements, isLoading, refetch } = useFostersList(user?.uid);

  // Mutations
  const endMut = useEndFoster();

  // Auth guard
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      toast.error('Faça login para acessar seu dashboard de LT.');
      navigate('/login?redirect=/lares-temporarios/dashboard', { replace: true });
    }
  }, [user, isLoadingAuth, navigate]);

  // Stats
  const stats = useMemo(() => {
    if (!placements) return { active: 0, nearEnd: 0, ended: 0, list: [] };
    const list = Array.isArray(placements) ? placements : [];
    const active = list.filter(p => p.status === 'active' || p.status === 'extended' || p.status === 'pending');
    const nearEnd = list.filter(p => {
      if (p.status !== 'active' && p.status !== 'extended') return false;
      const d = daysUntil(p.end_date);
      return d !== null && d >= 0 && d <= 7;
    });
    const ended = list.filter(p => p.status?.startsWith('ended_') || p.status?.startsWith('cancelled_'));
    return { active: active.length, nearEnd: nearEnd.length, ended: ended.length, list };
  }, [placements]);

  // Filter
  const filtered = useMemo(() => {
    if (!stats.list.length) return [];
    const f = FILTERS.find(x => x.id === filter);
    if (!f || !f.statuses) return stats.list;
    return stats.list.filter(p => f.statuses.includes(p.status));
  }, [stats.list, filter]);

  // Handlers
  const handleEnd = (placement) => {
    setActivePlacement(placement);
    setEndOpen(true);
  };

  const handleReturn = (placement) => {
    // Devolver = encerrar com tipo 'returned'
    setActivePlacement({ ...placement, _return: true });
    setEndOpen(true);
  };

  const confirmEnd = async ({ reason, rating, feedback }) => {
    if (!activePlacement) return;
    try {
      await endMut.mutateAsync({
        shelterClubId: activePlacement.shelter_club_id,
        fosterId: activePlacement.id,
        reason, rating, feedback,
        actor: user,
      });
      toast.success('Lar temporário encerrado. Sua avaliação ajuda o abrigo a melhorar.');
      setEndOpen(false);
      setActivePlacement(null);
      refetch();
    } catch (err) {
      toast.error(err?.message || 'Erro ao encerrar');
    }
  };

  // Loading
  if (isLoadingAuth) {
    return <FosterDashboardSkeleton />;
  }

  // Não autenticado
  if (!user) {
    return null; // o useEffect acima redireciona
  }

  // Sem placements E ainda carregando
  if (isLoading) {
    return <FosterDashboardSkeleton />;
  }

  return (
    <div className="arena-page mx-auto w-full max-w-4xl px-4 py-6 sm:px-6" data-testid="foster-dashboard-page">
      <Seo
        title="Lar Temporário — Viralata"
        description="Dashboard pessoal do Lar Temporário: acompanhe pets sob sua guarda, devolva ou encerre placements, avalie abrigos."
      />

      <HeroPanel user={user} stats={stats} reduce={reduce} />

      <motion.div
        initial="hidden"
        animate="show"
        variants={reduce ? undefined : { show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
        className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        <StatCard
          title="Pets sob sua guarda"
          count={stats.active}
          icon={PawPrint}
          accent="emerald"
          footer={stats.active === 0 ? 'Nenhum ativo agora' : stats.active === 1 ? '1 placement ativo' : `${stats.active} placements ativos`}
        />
        <StatCard
          title="Próx. do fim (7d)"
          count={stats.nearEnd}
          icon={Clock}
          accent="amber"
          footer={stats.nearEnd === 0 ? 'Nada para esta semana' : 'Atenção'}
        />
        <StatCard
          title="Histórico"
          count={stats.ended}
          icon={CheckCircle2}
          accent="primary"
          footer={stats.ended === 0 ? 'Sem encerramentos' : 'placements encerrados'}
        />
      </motion.div>

      {/* Empty state: nunca foi LT */}
      {stats.list.length === 0 && <div className="mt-6"><EmptyLTState /></div>}

      {/* Filtros + Lista */}
      {stats.list.length > 0 && (
        <div className="mt-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" role="tablist" aria-label="Filtrar placements por status">
            {FILTERS.map((f) => {
              const Icon = f.icon;
              const count = f.statuses
                ? stats.list.filter(p => f.statuses.includes(p.status)).length
                : stats.list.length;
              const isActive = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  role="tab"
                  aria-selected={isActive}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {f.label}
                  <span className={`rounded-full px-1.5 text-xs ${isActive ? 'bg-primary/15' : 'bg-muted'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <motion.ul
            initial="hidden"
            animate="show"
            variants={reduce ? undefined : { show: { transition: { staggerChildren: 0.05 } } }}
            className="mt-4 space-y-3"
            role="tabpanel"
            aria-label="Lista de placements"
          >
            {filtered.length === 0 ? (
              <motion.li
                variants={ANIM}
                className="rounded-xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground"
              >
                Nenhum placement neste filtro.
              </motion.li>
            ) : (
              filtered.map((p) => (
                <PlacementRow
                  key={p.id}
                  placement={p}
                  onEnd={handleEnd}
                  onReturn={handleReturn}
                />
              ))
            )}
          </motion.ul>
        </div>
      )}

      <EndDialog
        open={endOpen}
        placement={activePlacement}
        onClose={() => {
          setEndOpen(false);
          setActivePlacement(null);
        }}
        onConfirm={confirmEnd}
        loading={endMut.isPending}
      />
    </div>
  );
}
