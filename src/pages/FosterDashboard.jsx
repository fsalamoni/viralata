/**
 * @fileoverview FosterDashboard — painel pessoal do Lar Temporário
 * (TASK-306).
 *
 * Rota: /lares-temporarios/dashboard
 *
 * 3 cards de overview:
 *  - Pets sob minha guarda agora
 *  - Próximos fins de placement (7d)
 *  - Histórico de adoções via LT
 *
 * Ações: markAsReturned, endFosterPlacement (com rating + feedback)
 *
 * Flag: SHELTER_FOSTER_DASHBOARD_V1 (default OFF).
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, Calendar, CheckCircle2, XCircle, AlertCircle, Star,
  PawPrint, ChevronRight, Loader2, Heart, MessageSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Seo from '@/components/Seo';
import PageHero from '@/components/PageHero';
import { db } from '@/core/config/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { toast as sonnerToast } from 'sonner';
import { cn } from '@/core/lib/utils';
import { logger } from '@/core/lib/logger';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';

const STATUS_META = {
  active: { label: 'Ativo', color: 'emerald' },
  extended: { label: 'Prorrogado', color: 'blue' },
  pending: { label: 'Pendente', color: 'amber' },
  ended_returned: { label: 'Devolvido', color: 'gray' },
  ended_adopted: { label: 'Adotado via LT', color: 'purple' },
  ended: { label: 'Encerrado', color: 'gray' },
  cancelled_by_foster: { label: 'Cancelado por mim', color: 'red' },
  cancelled_by_shelter: { label: 'Cancelado pelo abrigo', color: 'red' },
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
    if (!d || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

function daysUntil(iso) {
  if (!iso) return null;
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.();
  if (!d) return null;
  const ms = d - new Date();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function StatCard({ title, count, icon: Icon, accent = 'primary', footer }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              {title}
            </p>
            <p
              className={cn(
                'mt-2 text-3xl font-extrabold',
                accent === 'primary' && 'text-primary',
                accent === 'amber' && 'text-amber-600',
                accent === 'purple' && 'text-purple-600',
              )}
            >
              {count}
            </p>
            {footer && (
              <p className="mt-1 text-xs text-muted-foreground">{footer}</p>
            )}
          </div>
          <div
            className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center',
              accent === 'primary' && 'bg-primary/10 text-primary',
              accent === 'amber' && 'bg-amber-100 text-amber-700',
              accent === 'purple' && 'bg-purple-100 text-purple-700',
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlacementRow({ placement, onEnd, onReturn }) {
  const status = STATUS_META[placement.status] || STATUS_META.active;
  const dUntil = placement.status === 'active' || placement.status === 'extended'
    ? daysUntil(placement.end_date)
    : null;
  return (
    <li
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-md border border-border/40 hover:bg-muted/30"
      data-testid={`dash-placement-${placement.id}`}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={cn(
              'text-xs',
              status.color === 'emerald' && 'bg-emerald-100 text-emerald-800 border-emerald-300',
              status.color === 'amber' && 'bg-amber-100 text-amber-800 border-amber-300',
              status.color === 'blue' && 'bg-blue-100 text-blue-800 border-blue-300',
              status.color === 'gray' && 'bg-gray-100 text-gray-800 border-gray-300',
              status.color === 'red' && 'bg-red-100 text-red-800 border-red-300',
              status.color === 'purple' && 'bg-purple-100 text-purple-800 border-purple-300',
            )}
          >
            {status.label}
          </Badge>
          {placement.pet_name && (
            <span className="text-sm font-medium flex items-center gap-1">
              <PawPrint className="h-3 w-3" /> {placement.pet_name}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {placement.shelter_name || placement.shelter_club_id} ·{' '}
          {formatDate(placement.start_date)} → {formatDate(placement.end_date)}
        </p>
        {dUntil !== null && dUntil !== undefined && dUntil >= 0 && dUntil <= 7 && (
          <p className="text-xs text-amber-700">
            ⏰ Encerra em {dUntil === 0 ? 'hoje' : dUntil === 1 ? '1 dia' : `${dUntil} dias`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {placement.pet_id && (
          <Button asChild size="sm" variant="ghost">
            <Link to={`/pet/${placement.pet_id}`}>
              Ver pet <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
        {(placement.status === 'active' || placement.status === 'extended') && (
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
    </li>
  );
}

function EndPlacementDialog({ open, placement, onClose, onConfirm, loading }) {
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
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Encerrar lar temporário</DialogTitle>
          <DialogDescription>
            Como foi sua experiência cuidando de {placement.pet_name || 'este pet'}?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reason">Motivo do encerramento *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Pet adaptado, entregue ao adotante direto"
              rows={2}
              data-testid="end-reason"
            />
          </div>
          <div>
            <Label>Avaliação do abrigo (1-5)</Label>
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  className="focus:outline-none"
                  aria-label={`Avaliar com ${n} estrela${n > 1 ? 's' : ''}`}
                  data-testid={`star-${n}`}
                >
                  <Star
                    className={cn(
                      'h-6 w-6 transition-colors',
                      n <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300 hover:text-amber-300',
                    )}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-xs text-muted-foreground ml-2">{rating}/5</span>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="feedback">Feedback adicional (opcional)</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Compartilhe como foi a experiência..."
              rows={3}
              data-testid="end-feedback"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ reason, rating, feedback })}
            disabled={loading || reason.length < 3}
            data-testid="end-confirm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Encerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function FosterDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [endTarget, setEndTarget] = useState(null);
  const [endSubmitting, setEndSubmitting] = useState(false);
  const flagEnabled = useFeatureFlag('SHELTER_FOSTER_DASHBOARD_V1');

  useEffect(() => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const q = query(
          collection(db, 'foster_placements'),
          where('foster_uid', '==', user.uid),
          orderBy('start_date', 'desc'),
          limit(100),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setPlacements(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          logger.warn('FosterDashboard', { err: String(err) });
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const stats = useMemo(() => {
    const active = placements.filter((p) => ['active', 'extended', 'pending'].includes(p.status));
    const upcoming = active.filter((p) => {
      const d = daysUntil(p.end_date);
      return d !== null && d >= 0 && d <= 7;
    });
    const adopted = placements.filter((p) => p.status === 'ended_adopted');
    return { active, upcoming, adopted };
  }, [placements]);

  if (!flagEnabled) {
    return (
      <main className="container py-8 max-w-2xl" data-testid="foster-dashboard-disabled">
        <EmptyState
          icon={Home}
          title="Dashboard de Lar Temporário"
          description="Esta funcionalidade está em rollout gradual. Em breve disponível para todos os LTs ativos."
        />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="container py-8 max-w-2xl" data-testid="foster-dashboard-signin">
        <EmptyState
          icon={Home}
          title="Faça login para acessar"
          description="Entre na sua conta para ver seus Lares Temporários."
          action={
            <Button asChild>
              <Link to="/login">Entrar</Link>
            </Button>
          }
        />
      </main>
    );
  }

  const handleEnd = async ({ reason, rating, feedback }) => {
    if (!endTarget) return;
    setEndSubmitting(true);
    try {
      // Chama endFosterPlacement (assumindo o helper como dynamic import)
      const { endFosterPlacement } = await import('@/modules/shelter/services/fosterService');
      await endFosterPlacement(endTarget.shelter_club_id, endTarget.id, {
        reason,
        foster_rating: rating || undefined,
        foster_feedback: feedback || undefined,
      }, { uid: user.uid, role: 'foster' });
      sonnerToast.success('Lar temporário encerrado.');
      setPlacements((prev) => prev.map((p) =>
        p.id === endTarget.id ? { ...p, status: 'ended_adopted' } : p,
      ));
      setEndTarget(null);
    } catch (err) {
      logger.error('FosterDashboard.end', { err: String(err) });
      toast({ title: 'Erro ao encerrar', description: String(err?.message || err), variant: 'destructive' });
    } finally {
      setEndSubmitting(false);
    }
  };

  const handleReturn = async (placement) => {
    if (!window.confirm(`Confirmar devolução de ${placement.pet_name || 'este pet'}?`)) return;
    try {
      const { endFosterPlacement } = await import('@/modules/shelter/services/fosterService');
      await endFosterPlacement(placement.shelter_club_id, placement.id, {
        reason: 'Devolvido ao abrigo pelo LT',
        pet_returned_healthy: true,
      }, { uid: user.uid, role: 'foster' });
      sonnerToast.success('Devolução registrada.');
      setPlacements((prev) => prev.map((p) =>
        p.id === placement.id ? { ...p, status: 'ended_returned' } : p,
      ));
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <main className="container py-8 max-w-5xl" data-testid="foster-dashboard-page">
      <Seo title="Meu painel de Lar Temporário" description="Gerencie seus placements, veja pets sob sua guarda e histórico." />
      <PageHero
        icon={Home}
        title="Meu painel de Lar Temporário"
        subtitle="Acompanhe seus pets, placements próximos e histórico."
      />

      {loading ? (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              title="Pets sob minha guarda"
              count={stats.active.length}
              icon={PawPrint}
              accent="primary"
              footer={stats.active.length === 0 ? 'Nenhum ativo' : `${stats.active.length} ${stats.active.length === 1 ? 'pet' : 'pets'}`}
            />
            <StatCard
              title="Encerra em até 7 dias"
              count={stats.upcoming.length}
              icon={Calendar}
              accent="amber"
              footer="Requer ação em breve"
            />
            <StatCard
              title="Adoções via LT"
              count={stats.adopted.length}
              icon={Heart}
              accent="purple"
              footer="Histórico de pets que adotaram pelo LT"
            />
          </div>

          <section className="mt-8 space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <PawPrint className="h-5 w-5 text-primary" /> Pets ativos
            </h2>
            {stats.active.length === 0 ? (
              <EmptyState
                icon={Home}
                title="Nenhum pet sob sua guarda agora"
                description="Quando você for convidado a ser LT, aparecerá aqui."
              />
            ) : (
              <ul className="space-y-1.5">
                {stats.active.map((p) => (
                  <PlacementRow
                    key={p.id}
                    placement={p}
                    onEnd={setEndTarget}
                    onReturn={handleReturn}
                  />
                ))}
              </ul>
            )}
          </section>

          {stats.adopted.length > 0 && (
            <section className="mt-8 space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Heart className="h-5 w-5 text-purple-600" /> Adoções via LT
              </h2>
              <ul className="space-y-1.5">
                {stats.adopted.map((p) => (
                  <PlacementRow
                    key={p.id}
                    placement={p}
                    onEnd={() => {}}
                    onReturn={() => {}}
                  />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <EndPlacementDialog
        open={Boolean(endTarget)}
        placement={endTarget}
        onClose={() => setEndTarget(null)}
        onConfirm={handleEnd}
        loading={endSubmitting}
      />
    </main>
  );
}
