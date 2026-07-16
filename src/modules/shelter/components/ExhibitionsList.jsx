/**
 * @fileoverview Componente: ExhibitionsList (Fase 11).
 *
 * Lista de vitrines do abrigo com filtros por status, badges de status,
 * ações contextuais conforme o state machine.
 *
 * Feature flag: `shelter_exhibition_workflow_v1` (default OFF).
 */

import { confirmDialog } from '@/components/ui/confirm-provider';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  EXHIBITION_STATUS,
  EXHIBITION_STATUS_LABELS,
  isExhibitionLive,
  isExhibitionUpcoming,
  isExhibitionPast,
  totalExhibitionAnimals,
  formatExhibitionDateTime,
} from '@/modules/shelter/domain/operational/exhibition';
import {
  useExhibitions,
  useStartExhibition,
  useCompleteExhibition,
  useCancelExhibition,
} from '@/modules/shelter/hooks/useExhibitions';

const STATUS_BADGE = {
  scheduled: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300',
  completed: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  cancelled: 'bg-zinc-200 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400',
};

function LiveBadge({ exhibition }) {
  if (isExhibitionLive(exhibition)) {
    return <Badge className="bg-emerald-500 text-white animate-pulse">AO VIVO</Badge>;
  }
  if (isExhibitionUpcoming(exhibition)) {
    return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">Em breve</Badge>;
  }
  if (isExhibitionPast(exhibition)) {
    return <Badge className="bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">Passada</Badge>;
  }
  return null;
}

export function ExhibitionsList({ shelterClubId, actor, onSelect, onCreate }) {
  const [statusFilter, setStatusFilter] = useState(null);
  const { data: exhibitionList = [], isLoading } = useExhibitions(
    shelterClubId,
    statusFilter ? { status: statusFilter } : {},
  );
  const startMutation = useStartExhibition(shelterClubId);
  const completeMutation = useCompleteExhibition(shelterClubId);
  const cancelMutation = useCancelExhibition(shelterClubId);
  const { toast } = useToast();

  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }
  if (isLoading) {
    return (
      <div className="arena-section-card">
        <div className="arena-section-card-header">
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="arena-section-card-body space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-white/60 bg-white/60 p-4 shadow-sm">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-5 w-32 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-64 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleStart = async (exhibitionId) => {
    try {
      await startMutation.mutateAsync({ exhibitionId, actor });
      toast({ title: '✓ Vitrine iniciada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleComplete = async (exhibitionId) => {
    if (!(await confirmDialog({ title: 'Marcar vitrine como concluída?' }))) return;
    try {
      await completeMutation.mutateAsync({ exhibitionId, actor });
      toast({ title: '✓ Vitrine concluída.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCancel = async (exhibitionId) => {
    const reason = window.prompt('Motivo do cancelamento (mín. 3 caracteres):');
    if (!reason || reason.trim().length < 3) return;
    try {
      await cancelMutation.mutateAsync({ exhibitionId, reason: reason.trim(), actor });
      toast({ title: '✓ Vitrine cancelada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title">Vitrines</h3>
        {onCreate && (
          <Button size="sm" onClick={onCreate}>
            + Nova vitrine
          </Button>
        )}
      </div>
      <div className="arena-section-card-body">
        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            size="sm"
            variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
          >
            Todas ({exhibitionList.length})
          </Button>
          {EXHIBITION_STATUS.map((s) => {
            const count = exhibitionList.filter((e) => e.status === s).length;
            return (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {EXHIBITION_STATUS_LABELS[s]} ({count})
              </Button>
            );
          })}
        </div>

        {exhibitionList.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma vitrine {statusFilter ? `com status "${EXHIBITION_STATUS_LABELS[statusFilter]}"` : 'cadastrada'}.
          </p>
        ) : (
          <ul className="space-y-3">
            {exhibitionList.map((ex) => (
              <li key={ex.id} className="arena-section-card">
                <div className="arena-section-card-body">
                  <div className="flex flex-wrap items-start gap-3 md:items-center md:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-semibold truncate">{ex.title}</span>
                        <Badge className={STATUS_BADGE[ex.status]}>
                          {EXHIBITION_STATUS_LABELS[ex.status]}
                        </Badge>
                        <LiveBadge exhibition={ex} />
                        {ex.requires_volunteers && (
                          <Badge variant="outline">Precisa voluntários</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatExhibitionDateTime(ex.datetime_start)}
                        {' → '}
                        {formatExhibitionDateTime(ex.datetime_end)}
                        {' · '}
                        {ex.venue?.address || '—'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {totalExhibitionAnimals(ex)} animal(is) ·
                        organizador: {ex.organizer_name || ex.organizer_uid}
                        {ex.co_organizers_uids?.length > 0 && (
                          <> · {ex.co_organizers_uids.length} co-org.</>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {onSelect && (
                        <Button size="sm" variant="outline" onClick={() => onSelect(ex)}>
                          Detalhes
                        </Button>
                      )}
                      {ex.status === 'scheduled' && (
                        <Button size="sm" onClick={() => handleStart(ex.id)}>
                          Iniciar
                        </Button>
                      )}
                      {ex.status === 'active' && (
                        <Button size="sm" variant="secondary" onClick={() => handleComplete(ex.id)}>
                          Concluir
                        </Button>
                      )}
                      {(ex.status === 'scheduled' || ex.status === 'active') && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(ex.id)}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
