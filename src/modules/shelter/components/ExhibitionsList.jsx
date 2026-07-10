/**
 * @fileoverview Componente: ExhibitionsList (Fase 11).
 *
 * Lista de vitrines (eventos de exposição) do abrigo, com filtros
 * por status (planned/active/done/cancelled) e janela temporal
 * (upcoming/past). Ações contextuais conforme o status.
 *
 * Feature flag: `shelter_exhibitions` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.3
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  EXHIBITION_STATUS,
  EXHIBITION_STATUS_LABELS,
  formatExhibitionSchedule,
  exhibitionTotalAnimals,
} from '@/modules/shelter/domain/operational/exhibition';
import {
  useExhibitions,
  useCreateExhibition,
  useUpdateExhibition,
  useCancelExhibition,
  useActivateExhibition,
  useCompleteExhibition,
} from '@/modules/shelter/hooks/useExhibitions';
import { ExhibitionForm } from './ExhibitionForm';

const STATUS_TONES = {
  planned: 'bg-blue-100 text-blue-900',
  active: 'bg-green-100 text-green-900',
  done: 'bg-zinc-100 text-zinc-700',
  cancelled: 'bg-red-100 text-red-900',
};

const WINDOW_FILTERS = [
  { key: 'upcoming', label: 'Próximas' },
  { key: 'past', label: 'Passadas' },
  { key: 'all', label: 'Todas' },
];

export function ExhibitionsList({ shelterClubId, actor, canEdit = false }) {
  const [statusFilter, setStatusFilter] = useState(null);
  const [windowFilter, setWindowFilter] = useState('upcoming');
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const listOpts = {};
  if (statusFilter) listOpts.status = statusFilter;
  if (windowFilter === 'upcoming') listOpts.upcoming = true;
  if (windowFilter === 'past') listOpts.past = true;

  const { data: exhibitions = [], isLoading } = useExhibitions(shelterClubId, listOpts);
  const createMutation = useCreateExhibition();
  const updateMutation = useUpdateExhibition(shelterClubId);
  const cancelMutation = useCancelExhibition(shelterClubId);
  const activateMutation = useActivateExhibition(shelterClubId);
  const completeMutation = useCompleteExhibition(shelterClubId);

  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }

  const handleCreate = async (payload) => {
    try {
      await createMutation.mutateAsync({ input: payload, actor });
      toast({ title: '✓ Vitrine criada.' });
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleActivate = async (exhibitionId) => {
    if (!window.confirm('Marcar vitrine como EM ANDAMENTO (no dia do evento)?')) return;
    try {
      await activateMutation.mutateAsync({ exhibitionId, actor });
      toast({ title: 'Vitrine ativada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCancel = async (exhibitionId) => {
    const reason = window.prompt('Motivo do cancelamento (opcional):');
    try {
      await cancelMutation.mutateAsync({ exhibitionId, reason: reason || null, actor });
      toast({ title: 'Vitrine cancelada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleComplete = async (exhibitionId) => {
    if (!window.confirm('Encerrar a vitrine? Você poderá adicionar os destinos dos animais depois.')) return;
    try {
      await completeMutation.mutateAsync({ exhibitionId, postEventLog: [], actor });
      toast({ title: 'Vitrine encerrada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Vitrines / Eventos</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {exhibitions.length} vitrine(s)
              {statusFilter && ` • ${EXHIBITION_STATUS_LABELS[statusFilter]}`}
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant={showForm ? 'outline' : 'default'}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Fechar formulário' : '+ Nova vitrine'}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {WINDOW_FILTERS.map((w) => (
            <Button
              key={w.key} size="sm"
              variant={windowFilter === w.key ? 'default' : 'outline'}
              onClick={() => setWindowFilter(w.key)}
            >
              {w.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Button
            size="sm" variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
          >
            Todos os status
          </Button>
          {EXHIBITION_STATUS.map((s) => (
            <Button
              key={s} size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {EXHIBITION_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-4">
            <ExhibitionForm
              shelterClubId={shelterClubId}
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              isSubmitting={createMutation.isPending}
            />
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando vitrines…</p>
        ) : exhibitions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma vitrine {windowFilter === 'upcoming' ? 'próxima' : windowFilter === 'past' ? 'passada' : ''}
            {statusFilter ? ` com status ${EXHIBITION_STATUS_LABELS[statusFilter]}` : ''}.
          </p>
        ) : (
          <ol className="space-y-3">
            {exhibitions.map((e) => (
              <li key={e.id} className="rounded-md border border-border p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className={STATUS_TONES[e.status] || ''}>
                        {EXHIBITION_STATUS_LABELS[e.status] || e.status}
                      </Badge>
                      <span className="text-sm font-medium text-foreground">{e.title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatExhibitionSchedule(e.date, e.time_start, e.time_end)}
                      {' • '}
                      {e.location?.city}/{e.location?.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exhibitionTotalAnimals(e)} animal(is) levado(s)
                      {e.co_organizers?.length > 0 &&
                        ` • ${e.co_organizers.length} co-organizador(es)`}
                    </p>
                    {e.notes && (
                      <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">
                        “{e.notes}”
                      </p>
                    )}
                    {e.post_event_log?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {e.post_event_log.length} destino(s) registrado(s).
                      </p>
                    )}
                    {e.cancellation_reason && (
                      <p className="text-xs text-red-700 mt-1">
                        Cancelada: {e.cancellation_reason}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="flex flex-col gap-1">
                      {e.status === 'planned' && (
                        <>
                          <Button size="sm" onClick={() => handleActivate(e.id)}>
                            Iniciar (no dia)
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCancel(e.id)}>
                            Cancelar
                          </Button>
                        </>
                      )}
                      {e.status === 'active' && (
                        <>
                          <Button size="sm" onClick={() => handleComplete(e.id)}>
                            Encerrar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCancel(e.id)}>
                            Cancelar
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
