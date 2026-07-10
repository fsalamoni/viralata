/**
 * @fileoverview Componente: ExhibitionDetails (Fase 11).
 *
 * Painel de detalhe de uma Vitrine individual. Renderiza:
 *   - Cabeçalho com status + título + schedule
 *   - Bloco de localização + co-organizadores
 *   - Lista de animais (animais do abrigo + pets externos)
 *   - Ações contextuais (ativar, cancelar, encerrar)
 *   - Adicionar pets (abrir dialog com lista dos pets do abrigo)
 *   - Registrar outcomes pós-evento
 *
 * Feature flag: `shelter_exhibitions` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.3
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  EXHIBITION_STATUS_LABELS,
  EXHIBITION_OUTCOMES,
  EXHIBITION_OUTCOME_LABELS,
  formatExhibitionSchedule,
  exhibitionIsUpcoming,
  exhibitionIsPast,
} from '@/modules/shelter/domain/operational/exhibition';
import {
  useExhibition,
  useActivateExhibition,
  useCancelExhibition,
  useCompleteExhibition,
  useAddExhibitionAnimal,
  useRemoveExhibitionAnimal,
  useAddExhibitionOutcome,
} from '@/modules/shelter/hooks/useExhibitions';

const STATUS_TONES = {
  planned: 'bg-blue-100 text-blue-900',
  active: 'bg-green-100 text-green-900',
  done: 'bg-zinc-100 text-zinc-700',
  cancelled: 'bg-red-100 text-red-900',
};

export function ExhibitionDetails({ shelterClubId, exhibitionId, actor, canEdit = false }) {
  const { data: exhibition, isLoading } = useExhibition(shelterClubId, exhibitionId);
  const [newPetId, setNewPetId] = useState('');
  const [outcomePetId, setOutcomePetId] = useState('');
  const [outcomeType, setOutcomeType] = useState('returned');
  const [outcomeAdopterUid, setOutcomeAdopterUid] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const { toast } = useToast();

  const activateMutation = useActivateExhibition(shelterClubId);
  const cancelMutation = useCancelExhibition(shelterClubId);
  const completeMutation = useCompleteExhibition(shelterClubId);
  const addAnimalMutation = useAddExhibitionAnimal(shelterClubId);
  const removeAnimalMutation = useRemoveExhibitionAnimal(shelterClubId);
  const addOutcomeMutation = useAddExhibitionOutcome(shelterClubId);

  if (!shelterClubId || !exhibitionId) {
    return <p className="text-sm text-muted-foreground">Selecione uma vitrine.</p>;
  }
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando vitrine…</p>;
  }
  if (!exhibition) {
    return <p className="text-sm text-muted-foreground">Vitrine não encontrada.</p>;
  }

  const upcoming = exhibitionIsUpcoming(exhibition.date, exhibition.time_start);
  const past = exhibitionIsPast(exhibition.date, exhibition.time_end);

  const handleActivate = async () => {
    try {
      await activateMutation.mutateAsync({ exhibitionId, actor });
      toast({ title: 'Vitrine ativada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Motivo do cancelamento (opcional):');
    try {
      await cancelMutation.mutateAsync({ exhibitionId, reason: reason || null, actor });
      toast({ title: 'Vitrine cancelada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Encerrar a vitrine? Os outcomes podem ser registrados depois.')) return;
    try {
      await completeMutation.mutateAsync({ exhibitionId, postEventLog: [], actor });
      toast({ title: 'Vitrine encerrada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleAddAnimal = async () => {
    if (!newPetId) return;
    try {
      const r = await addAnimalMutation.mutateAsync({ exhibitionId, petId: newPetId, actor });
      if (r.noop) {
        toast({ title: 'Pet já estava na lista.' });
      } else {
        toast({ title: 'Pet adicionado.' });
      }
      setNewPetId('');
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleRemoveAnimal = async (petId) => {
    if (!window.confirm(`Remover pet ${petId} da vitrine?`)) return;
    try {
      await removeAnimalMutation.mutateAsync({ exhibitionId, petId, actor });
      toast({ title: 'Pet removido.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleAddOutcome = async () => {
    if (!outcomePetId) {
      toast({ title: 'Informe o pet_id.', variant: 'destructive' });
      return;
    }
    try {
      await addOutcomeMutation.mutateAsync({
        exhibitionId,
        outcome: {
          pet_id: outcomePetId,
          outcome: outcomeType,
          adopter_uid: outcomeType === 'adopted' ? outcomeAdopterUid || undefined : undefined,
          notes: outcomeNotes || undefined,
        },
        actor,
      });
      toast({ title: 'Destino registrado.' });
      setOutcomePetId('');
      setOutcomeAdopterUid('');
      setOutcomeNotes('');
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge className={STATUS_TONES[exhibition.status] || ''}>
                  {EXHIBITION_STATUS_LABELS[exhibition.status] || exhibition.status}
                </Badge>
                {upcoming && exhibition.status === 'planned' && (
                  <Badge variant="outline" className="text-amber-700">⏰ Próxima</Badge>
                )}
                {past && exhibition.status === 'planned' && (
                  <Badge variant="outline" className="text-red-700">⚠ Atrasada</Badge>
                )}
              </div>
              <CardTitle className="text-lg">{exhibition.title}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatExhibitionSchedule(exhibition.date, exhibition.time_start, exhibition.time_end)}
              </p>
            </div>
            {canEdit && (
              <div className="flex flex-col gap-1">
                {exhibition.status === 'planned' && (
                  <>
                    <Button size="sm" onClick={handleActivate}>
                      Iniciar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </>
                )}
                {exhibition.status === 'active' && (
                  <>
                    <Button size="sm" onClick={handleComplete}>
                      Encerrar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Localização</h4>
            <p className="text-muted-foreground">
              {exhibition.location?.address}<br />
              {exhibition.location?.city} / {exhibition.location?.state}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">Responsáveis</h4>
            <ul className="text-muted-foreground">
              {(exhibition.responsible_uids || []).map((uid) => (
                <li key={uid}>
                  <code className="text-xs">{uid}</code>
                </li>
              ))}
            </ul>
          </div>
          {exhibition.co_organizers?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Co-organizadores</h4>
              <ul className="text-muted-foreground">
                {exhibition.co_organizers.map((c) => (
                  <li key={c}><code className="text-xs">{c}</code></li>
                ))}
              </ul>
            </div>
          )}
          {exhibition.notes && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-1">Observações</h4>
              <p className="text-muted-foreground italic">“{exhibition.notes}”</p>
            </div>
          )}
          {exhibition.cancellation_reason && (
            <div>
              <h4 className="text-xs font-semibold text-red-700 mb-1">Cancelamento</h4>
              <p className="text-red-900 text-xs">{exhibition.cancellation_reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Animais levados */}
      <Card>
        <CardHeader>
          <CardTitle>Animais levados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-foreground mb-1">
              Do abrigo ({exhibition.animals?.length || 0})
            </h4>
            {(exhibition.animals?.length || 0) === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum.</p>
            ) : (
              <ul className="space-y-1">
                {exhibition.animals.map((petId) => (
                  <li key={petId} className="flex items-center justify-between text-sm">
                    <code className="text-xs">{petId}</code>
                    {canEdit && exhibition.status !== 'done' && exhibition.status !== 'cancelled' && (
                      <Button
                        size="sm" variant="ghost" className="text-xs h-6 px-2"
                        onClick={() => handleRemoveAnimal(petId)}
                      >
                        Remover
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEdit && exhibition.status !== 'done' && exhibition.status !== 'cancelled' && (
            <div className="flex gap-2 items-end pt-2 border-t border-border">
              <div className="flex-1">
                <label className="text-xs font-medium block mb-1">Adicionar pet (ID)</label>
                <Input
                  value={newPetId}
                  onChange={(e) => setNewPetId(e.target.value)}
                  placeholder="pet-1"
                />
              </div>
              <Button size="sm" onClick={handleAddAnimal} disabled={!newPetId}>
                Adicionar
              </Button>
            </div>
          )}

          {exhibition.external_pets?.length > 0 && (
            <div className="pt-3 border-t border-border">
              <h4 className="text-xs font-semibold text-foreground mb-1">
                Pets externos / coalizão ({exhibition.external_pets.length})
              </h4>
              <ul className="space-y-1">
                {exhibition.external_pets.map((ep, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground">
                    <code className="text-xs">pet:{ep.pet_id}</code>
                    {' • '}
                    abrigo: <code className="text-xs">{ep.shelter_id}</code>
                    {' • '}
                    owner: <code className="text-xs">{ep.owner_uid}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Post-event log */}
      {exhibition.status !== 'cancelled' && (
        <Card>
          <CardHeader>
            <CardTitle>Destinos pós-evento</CardTitle>
            <p className="text-xs text-muted-foreground">
              {exhibition.post_event_log?.length || 0} destino(s) registrado(s).
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {(exhibition.post_event_log?.length || 0) > 0 && (
              <ol className="space-y-2">
                {exhibition.post_event_log.map((entry, idx) => (
                  <li key={idx} className="rounded-md border border-border p-2 text-sm">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant="secondary">
                        {EXHIBITION_OUTCOME_LABELS[entry.outcome] || entry.outcome}
                      </Badge>
                      <code className="text-xs">pet:{entry.pet_id}</code>
                    </div>
                    {entry.adopter_uid && (
                      <p className="text-xs text-muted-foreground">
                        Adotante: <code className="text-xs">{entry.adopter_uid}</code>
                      </p>
                    )}
                    {entry.notes && (
                      <p className="text-xs text-muted-foreground italic mt-1">“{entry.notes}”</p>
                    )}
                    {entry.recorded_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Registrado: {new Date(entry.recorded_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}

            {canEdit && exhibition.status !== 'cancelled' && (
              <div className="pt-3 border-t border-border space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Registrar destino</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    value={outcomePetId}
                    onChange={(e) => setOutcomePetId(e.target.value)}
                    placeholder="pet_id"
                  />
                  <select
                    value={outcomeType}
                    onChange={(e) => setOutcomeType(e.target.value)}
                    className="rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                  >
                    {EXHIBITION_OUTCOMES.map((o) => (
                      <option key={o} value={o}>
                        {EXHIBITION_OUTCOME_LABELS[o]}
                      </option>
                    ))}
                  </select>
                  {outcomeType === 'adopted' && (
                    <Input
                      value={outcomeAdopterUid}
                      onChange={(e) => setOutcomeAdopterUid(e.target.value)}
                      placeholder="adopter_uid"
                    />
                  )}
                </div>
                <Input
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Observações (opcional)"
                  maxLength={1000}
                />
                <Button size="sm" onClick={handleAddOutcome} disabled={!outcomePetId}>
                  Registrar destino
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
