/**
 * @fileoverview Componente TimelineList (Fase 2).
 *
 * Lista cronológica reversa dos eventos de vida do animal. Eventos `note`
 * com `visibility='internal'` ficam ocultos para visualizadores públicos
 * (apenas o abrigo vê).
 *
 * Feature flag: `shelter_pet_timeline` (default OFF).
 *  - OFF: não é renderizado em lugar nenhum.
 *  - ON: aparece no PetDetail como nova aba "Histórico".
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 2
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  TIMELINE_EVENT_LABELS,
  TIMELINE_EVENT_ICONS,
} from '@/modules/shelter/domain/core/timeline';
import {
  useTimeline,
  useAddTimelineEvent,
  useDeleteTimelineEvent,
} from '@/modules/shelter/hooks/useTimeline';
import { TimelineEventForm } from './TimelineEventForm';
import { confirmDialog } from '@/components/ui/confirm-provider';

/**
 * @param {object} props
 * @param {string} props.petId
 * @param {string} props.shelterClubId - multi-tenant
 * @param {boolean} props.canEdit - permissão para adicionar/remover
 * @param {boolean} props.showInternal - se true, mostra notas internas
 *                                         (default: mesmo de canEdit)
 * @param {string} props.actorUid
 * @param {string} props.actorDisplayName
 */
export function TimelineList({
  petId,
  shelterClubId,
  canEdit = false,
  showInternal,
  actorUid,
  actorDisplayName,
}) {
  const { data: events = [], isLoading } = useTimeline(petId, shelterClubId);
  const addMutation = useAddTimelineEvent(petId, shelterClubId);
  const deleteMutation = useDeleteTimelineEvent(petId, shelterClubId);
  const { toast } = useToast();

  const _showInternal = showInternal ?? canEdit;
  const [showForm, setShowForm] = useState(false);

  if (!shelterClubId) {
    return (
      <p className="text-sm text-muted-foreground">
        Pet não vinculado a um abrigo — sem histórico.
      </p>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando histórico…</p>;
  }

  // Filtrar: ocultar internos se não for staff
  const visibleEvents = events.filter((ev) => {
    if (ev.type === 'note' && ev.data?.visibility === 'internal' && !_showInternal) {
      return false;
    }
    if (ev.deleted_at) return false; // soft-deleted não aparece
    return true;
  });

  const handleAdd = async (input) => {
    try {
      await addMutation.mutateAsync({ ...input, recorded_by_name: actorDisplayName });
      toast({ title: 'Evento adicionado ao histórico.' });
      setShowForm(false);
    } catch (err) {
      toast({
        title: 'Erro ao adicionar evento',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (eventId) => {
    if (!(await confirmDialog({ title: 'Remover este evento do histórico?' }))) return;
    try {
      await deleteMutation.mutateAsync(eventId);
      toast({ title: 'Evento removido.' });
    } catch (err) {
      toast({
        title: 'Erro ao remover',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Histórico do Animal</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {visibleEvents.length} evento(s) registrado(s)
            {_showInternal ? ' (incluindo notas internas)' : ''}
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={() => setShowForm((v) => !v)}
            variant={showForm ? 'outline' : 'default'}
          >
            {showForm ? 'Cancelar' : '+ Adicionar evento'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {showForm && (
          <div className="mb-6">
            <TimelineEventForm
              onSubmit={handleAdd}
              onCancel={() => setShowForm(false)}
              isSubmitting={addMutation.isPending}
            />
          </div>
        )}

        {visibleEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum evento registrado ainda.
          </p>
        ) : (
          <ol className="space-y-3">
            {visibleEvents.map((ev) => (
              <li
                key={ev.id}
                className="flex gap-3 pb-3 border-b border-border last:border-0"
              >
                <div className="text-2xl shrink-0" aria-hidden="true">
                  {TIMELINE_EVENT_ICONS[ev.type] || '•'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="secondary">
                      {TIMELINE_EVENT_LABELS[ev.type] || ev.type}
                    </Badge>
                    <time className="text-xs text-muted-foreground">
                      {_formatDate(ev.event_date)}
                    </time>
                    {ev.data?.visibility === 'internal' && (
                      <Badge variant="outline" className="text-xs">
                        interno
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-foreground">
                    {_renderEventSummary(ev)}
                  </div>
                  {ev.recorded_by_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      por {ev.recorded_by_name}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(ev.id)}
                    className="text-xs"
                  >
                    Remover
                  </Button>
                )}
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function _formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function _renderEventSummary(ev) {
  const d = ev.data || {};
  switch (ev.type) {
    case 'vaccine':
      return (
        <>
          Vacina <strong>{d.vaccine_name}</strong>
          {d.manufacturer ? ` (${d.manufacturer})` : ''}
          {d.next_dose_date ? ` • próxima dose em ${_formatDate(d.next_dose_date)}` : ''}
        </>
      );
    case 'deworming':
      return <>Vermífugo <strong>{d.product_name}</strong>{d.next_dose_date ? ` • próxima dose em ${_formatDate(d.next_dose_date)}` : ''}</>;
    case 'weight_measurement':
      return <>Peso: <strong>{d.weight_kg} kg</strong>{d.notes ? ` — ${d.notes}` : ''}</>;
    case 'vet_visit':
      return (
        <>
          <strong>{d.reason}</strong>
          {d.clinic_name ? ` @ ${d.clinic_name}` : ''}
          {d.diagnosis ? <div className="text-xs mt-1">Diagnóstico: {d.diagnosis}</div> : null}
        </>
      );
    case 'medication':
      return (
        <>
          Medicação: <strong>{d.medication_name}</strong>
          {d.dose ? ` (${d.dose})` : ''}
        </>
      );
    case 'status_change':
      return <>Status: {d.from_status} → <strong>{d.to_status}</strong>{d.reason ? ` — ${d.reason}` : ''}</>;
    case 'transfer':
      return <>Transferido para <strong>{d.to_club_name || d.to_club_id}</strong>{d.reason ? ` (${d.reason})` : ''}</>;
    case 'microchip_registered':
      return <>Microchip <strong>{d.microchip_id}</strong> implantado{d.implant_location ? ` (${d.implant_location})` : ''}</>;
    case 'note':
      return <span className="whitespace-pre-wrap">{d.text}</span>;
    case 'asilomar_assessment':
      return (
        <>
          Asilomar: {d.from_status || '?'} → <strong>{d.to_status}</strong>
          {d.reason ? ` (${d.reason})` : ''}
        </>
      );
    case 'deceased':
      return <>Óbito: <strong>{d.cause}</strong>{d.necropsy ? ' (com necropsia)' : ''}</>;
    case 'returned':
      return <>Devolvido: <strong>{d.return_reason}</strong></>;
    case 'intake':
      return <>Entrada: <strong>{d.intake_type}</strong>{d.source ? ` — ${d.source}` : ''}</>;
    case 'photo_added':
      return <>Foto adicionada{d.caption ? `: ${d.caption}` : ''}</>;
    default:
      return <code className="text-xs">{JSON.stringify(d)}</code>;
  }
}
