/**
 * @fileoverview MyFostersSection — seção "Meus Lares Temporários" no
 * /perfil (TASK-133). Lista placements onde o usuário é o foster
 * (foster_uid), agrupados por status (ativo/encerrado/cancelado).
 *
 * Multi-tenant: collectionGroup query em `foster_placements`.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, Calendar, CheckCircle2, XCircle, Loader2, AlertCircle,
  PawPrint, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/core/config/firebase';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { logger } from '@/core/lib/logger';
import { cn } from '@/core/lib/utils';

const STATUS_META = {
  active: { label: 'Ativo', icon: CheckCircle2, color: 'emerald' },
  pending: { label: 'Pendente', icon: Calendar, color: 'amber' },
  extended: { label: 'Prorrogado', icon: Calendar, color: 'blue' },
  ended_returned: { label: 'Encerrado (devolvido)', icon: CheckCircle2, color: 'gray' },
  ended_adopted: { label: 'Adotado direto', icon: PawPrint, color: 'purple' },
  ended: { label: 'Encerrado', icon: CheckCircle2, color: 'gray' },
  cancelled_by_foster: { label: 'Cancelado por você', icon: XCircle, color: 'red' },
  cancelled_by_shelter: { label: 'Cancelado pelo abrigo', icon: XCircle, color: 'red' },
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

function FosterRow({ placement }) {
  const status = STATUS_META[placement.status] || STATUS_META.active;
  const Icon = status.icon;
  return (
    <li
      className="flex items-center justify-between gap-3 p-3 rounded-md border border-border/40 hover:bg-muted/30"
      data-testid={`foster-placement-${placement.id}`}
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
            <Icon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
          {placement.pet_name && (
            <span className="text-sm font-medium">
              <PawPrint className="h-3 w-3 inline-block mr-1" />
              {placement.pet_name}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {placement.shelter_name || placement.shelter_club_id} ·{' '}
          {formatDate(placement.start_date)} → {formatDate(placement.end_date)}
        </p>
      </div>
      {placement.pet_id && (
        <Button asChild size="sm" variant="ghost">
          <Link to={`/pet/${placement.pet_id}`}>
            Ver pet <ChevronRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      )}
    </li>
  );
}

function PlacementsList({ placements, status }) {
  const filtered = placements.filter((p) => {
    if (status === 'active') return ['active', 'extended', 'pending'].includes(p.status);
    if (status === 'ended') return ['ended_returned', 'ended_adopted', 'ended'].includes(p.status);
    if (status === 'cancelled') return ['cancelled_by_foster', 'cancelled_by_shelter'].includes(p.status);
    return true;
  });
  if (filtered.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic px-3 py-2">
        Nenhum nesta categoria.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5" aria-label={`Lares temporários ${status}`}>
      {filtered.map((p) => <FosterRow key={p.id} placement={p} />)}
    </ul>
  );
}

export function MyFostersSection({ userUid }) {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userUid) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // collectionGroup query: lista placements onde foster_uid == userUid
        const q = query(
          collection(db, 'foster_placements'),
          where('foster_uid', '==', userUid),
          orderBy('start_date', 'desc'),
          limit(50),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPlacements(items);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          logger.warn('MyFostersSection', { err: String(err) });
          setError(err.message);
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [userUid]);

  if (!userUid) return null;

  return (
    <section className="rounded-[24px] border-emerald-200" data-testid="my-fosters-section">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
          <Home className="h-5 w-5 text-emerald-700" />
          Meus Lares Temporários
        </h3>
        <p className="arena-section-card-description">
          Pets que você acolheu ou está acolhendo temporariamente.
        </p>
      </div>
      <div className="arena-section-card-body p-6 pt-0 space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-sm text-destructive" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : placements.length === 0 ? (
          <EmptyState
            icon={Home}
            title="Você ainda não acolheu nenhum pet"
            description="Quando você fizer um Lar Temporário pelo abrigo, os placements aparecerão aqui."
            action={
              <Button asChild>
                <Link to="/lares-temporarios">Ver oportunidades de LT</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-4">
            <PlacementsList placements={placements} status="active" />
            <PlacementsList placements={placements} status="ended" />
            <PlacementsList placements={placements} status="cancelled" />
          </div>
        )}
      </div>
    </section>
  );
}

export default MyFostersSection;
