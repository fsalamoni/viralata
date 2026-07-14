/**
 * @fileoverview PublicFosterHistory — histórico público de um Lar Temporário (TASK-326).
 *
 * Rota: /lares-temporarios/:uid/historico
 *
 * Lista pets que passaram pelo LT com consent_to_show_history=true.
 * Cartão: foto + nome + status final + rating do LT.
 *
 * Flag: SHELTER_FOSTER_PUBLIC_HISTORY_V1 (default OFF).
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Home, ArrowLeft, PawPrint, Star, Calendar, CheckCircle2,
  Heart, Loader2, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import PageHero from '@/components/PageHero';
import Seo from '@/components/Seo';
import { getFosterPublicHistory } from '@/modules/shelter/services/fosterHistoryPublicService';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';

const STATUS_META = {
  ended_adopted: {
    label: 'Adotado via LT',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    icon: CheckCircle2,
  },
  ended_returned: {
    label: 'Devolvido ao abrigo',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Heart,
  },
  ended: {
    label: 'Encerrado',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: CheckCircle2,
  },
  cancelled_by_foster: {
    label: 'Cancelado',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: AlertCircle,
  },
  cancelled_by_shelter: {
    label: 'Cancelado',
    color: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: AlertCircle,
  },
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

function StarRating({ rating }) {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-0.5" aria-label={`Nota ${rating} de 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function PetCard({ placement }) {
  const meta = STATUS_META[placement.status] || STATUS_META.ended;
  const StatusIcon = meta.icon || CheckCircle2;

  return (
    <Card className="overflow-hidden rounded-2xl">
      {placement.pet_photo_url ? (
        <div className="aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={placement.pet_photo_url}
            alt={`${placement.pet_name}, ${meta.label}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted flex items-center justify-center">
          <PawPrint className="h-12 w-12 text-muted-foreground/40" aria-hidden="true" />
        </div>
      )}
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-tight line-clamp-1">
            {placement.pet_name}
          </h3>
          {placement.foster_rating && (
            <StarRating rating={placement.foster_rating} />
          )}
        </div>
        <Badge className={`text-[10px] ${meta.color}`} aria-label={`Status: ${meta.label}`}>
          <StatusIcon className="h-3 w-3 mr-1" aria-hidden="true" />
          {meta.label}
        </Badge>
        {placement.ended_at && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            <span>Finalizado em {formatDate(placement.ended_at)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} className="overflow-hidden rounded-2xl">
          <Skeleton className="aspect-[4/3]" />
          <CardContent className="p-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PublicFosterHistory() {
  const { uid } = useParams();
  const flagEnabled = useFeatureFlag('SHELTER_FOSTER_PUBLIC_HISTORY_V1');
  const [state, setState] = useState({
    loading: true,
    denied: false,
    fullName: '',
    placements: [],
    error: null,
  });

  useEffect(() => {
    if (!flagEnabled) {
      setState({ loading: false, denied: false, fullName: '', placements: [], error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    getFosterPublicHistory(uid)
      .then((result) => {
        if (cancelled) return;
        setState({
          loading: false,
          denied: result.denied,
          fullName: result.fullName || 'Lar Temporário',
          placements: result.placements || [],
          error: null,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, denied: false, fullName: '', placements: [], error: err.message });
      });
    return () => { cancelled = true; };
  }, [uid, flagEnabled]);

  if (!flagEnabled) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <EmptyState
          icon={ShieldCheck}
          title="Página em manutenção"
          description="O histórico público de Lares Temporários está temporariamente indisponível. Volte em breve!"
        />
      </div>
    );
  }

  if (state.loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  if (state.denied) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <EmptyState
          icon={ShieldCheck}
          title="Histórico não disponível"
          description="Este lar temporário optou por não exibir seu histórico público de pets."
          action={
            <Button asChild variant="outline" className="mt-4">
              <Link to="/lares-temporarios">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Ver todos os Lares Temporários
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar"
          description="Não foi possível carregar o histórico. Tente novamente mais tarde."
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Seo
        title={`Histórico de ${state.fullName} — Lares Temporários`}
        description={`Conheça os pets que passaram pelo lar temporário ${state.fullName}.`}
      />

      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
          <Link to="/lares-temporarios">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Lares Temporários
          </Link>
        </Button>
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 rounded-full p-3 mt-0.5">
            <Home className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {state.fullName}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {state.placements.length === 0
                ? 'Nenhum pet registrado'
                : `${state.placements.length} pet${state.placements.length === 1 ? '' : 's'} já acolhido${state.placements.length === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>
      </div>

      {state.placements.length === 0 ? (
        <EmptyState
          icon={PawPrint}
          title="Nenhum pet registrado"
          description={`${state.fullName} ainda não acolheu pets pelo programa de Lares Temporários.`}
          action={
            <Button asChild variant="outline">
              <Link to="/lares-temporarios">Ver todos os Lares Temporários</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {state.placements.map((placement) => (
            <PetCard key={placement.id} placement={placement} />
          ))}
        </div>
      )}
    </div>
  );
}
