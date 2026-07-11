/**
 * @fileoverview Componente: ExhibitionDetails (Fase 11).
 *
 * Detalhe completo de uma vitrine:
 *   - Cabeçalho com status, ações contextuais
 *   - Lista de animais (internos + externos)
 *   - Escalas (shifts) com CRUD inline
 *   - Post-event log (apenas se status active/completed)
 *
 * Feature flag: `shelter_exhibition_workflow_v1` (default OFF).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  EXHIBITION_STATUS_LABELS,
  SHIFT_ROLE_LABELS,
  POST_EVENT_DESTINATION_LABELS,
  isExhibitionTerminal,
  totalExhibitionAnimals,
  formatExhibitionDateTime,
  exhibitionDurationHours,
} from '@/modules/shelter/domain/operational/exhibition';
import {
  useExhibition,
  useUpdateExhibition,
  useStartExhibition,
  useCompleteExhibition,
  useCancelExhibition,
  useAddInternalPet,
  useRemoveInternalPet,
  useAddExternalPet,
  useRemoveExternalPet,
  useShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  usePostEventLogs,
  useLogPostEvent,
} from '@/modules/shelter/hooks/useExhibitions';

const STATUS_TONES = {
  scheduled: 'bg-amber-100 text-amber-900',
  active: 'bg-green-100 text-green-900',
  completed: 'bg-zinc-100 text-zinc-700',
  cancelled: 'bg-zinc-200 text-zinc-500 line-through',
};

function PetRow({ pet, origin, exhibitionId, shelterClubId, actor, disabled }) {
  const isExternal = origin === 'external';
  const removeInternal = useRemoveInternalPet(shelterClubId);
  const removeExternal = useRemoveExternalPet(shelterClubId);
  const { toast } = useToast();

  const handleRemove = async () => {
    if (!window.confirm(`Remover ${pet.name || pet.pet_id} da vitrine?`)) return;
    try {
      if (isExternal) {
        await removeExternal.mutateAsync({ exhibitionId, input: { pet_id: pet.pet_id }, actor });
      } else {
        await removeInternal.mutateAsync({ exhibitionId, input: { pet_id: pet }, actor });
      }
      toast({ title: '✓ Animal removido.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <li className="flex items-center justify-between border rounded-md p-2">
      <div>
        <div className="font-medium">
          {isExternal ? pet.name : `Pet ${pet}`}
        </div>
        <div className="text-xs text-muted-foreground">
          {isExternal
            ? `externo · ${pet.owner_shelter_name || pet.owner_shelter_id}`
            : 'interno'}
          {pet.species && ` · ${pet.species}`}
        </div>
      </div>
      {!disabled && (
        <Button size="sm" variant="ghost" onClick={handleRemove}>
          Remover
        </Button>
      )}
    </li>
  );
}

function ShiftRow({ shift, exhibitionId, shelterClubId, actor, disabled }) {
  const updateMutation = useUpdateShift(shelterClubId);
  const deleteMutation = useDeleteShift(shelterClubId);
  const { toast } = useToast();

  const handleUpdateFilled = async (delta) => {
    const newFilled = Math.max(0, (shift.slots_filled || 0) + delta);
    if (newFilled > shift.slots_total) {
      toast({ title: 'Limite atingido', description: `Máximo: ${shift.slots_total} vagas.` });
      return;
    }
    try {
      await updateMutation.mutateAsync({
        exhibitionId,
        shiftId: shift.id,
        patch: { slots_filled: newFilled },
        actor,
      });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Remover esta escala?')) return;
    try {
      await deleteMutation.mutateAsync({ exhibitionId, shiftId: shift.id, actor });
      toast({ title: '✓ Escala removida.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const fillPct = shift.slots_total > 0
    ? Math.round((shift.slots_filled / shift.slots_total) * 100)
    : 0;

  return (
    <li className="border rounded-md p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex-1 min-w-0">
        <div className="font-medium">{SHIFT_ROLE_LABELS[shift.role] || shift.role}</div>
        <div className="text-sm text-muted-foreground">
          {formatExhibitionDateTime(shift.start_at)} → {formatExhibitionDateTime(shift.end_at)}
        </div>
        {shift.notes && (
          <div className="text-xs text-muted-foreground mt-1">📝 {shift.notes}</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Badge variant="outline">
          {shift.slots_filled}/{shift.slots_total} ({fillPct}%)
        </Badge>
        {!disabled && (
          <>
            <Button size="sm" variant="outline" onClick={() => handleUpdateFilled(-1)} disabled={shift.slots_filled <= 0}>
              −
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleUpdateFilled(+1)}>
              +
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDelete}>
              Excluir
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function PostEventLogRow({ log }) {
  return (
    <li className="border rounded-md p-2 flex items-center justify-between">
      <div>
        <div className="font-medium">
          {POST_EVENT_DESTINATION_LABELS[log.destination] || log.destination}
        </div>
        <div className="text-xs text-muted-foreground">
          pet: {log.pet_id} ({log.pet_origin})
          {log.logged_by_name && ` · por ${log.logged_by_name}`}
          {log.adopter_uid && ` · adotante: ${log.adopter_uid}`}
          {log.transferred_to_shelter_name && ` → ${log.transferred_to_shelter_name}`}
        </div>
        {log.notes && <div className="text-xs mt-1">📝 {log.notes}</div>}
      </div>
      <div className="text-xs text-muted-foreground">
        {formatExhibitionDateTime(log.logged_at)}
      </div>
    </li>
  );
}

export function ExhibitionDetails({ shelterClubId, exhibitionId, actor, onBack }) {
  const { data: exhibition, isLoading } = useExhibition(shelterClubId, exhibitionId);
  const { data: shifts = [] } = useShifts(shelterClubId, exhibitionId);
  const { data: logs = [] } = usePostEventLogs(shelterClubId, exhibitionId);
  const updateMutation = useUpdateExhibition(shelterClubId);
  const startMutation = useStartExhibition(shelterClubId);
  const completeMutation = useCompleteExhibition(shelterClubId);
  const cancelMutation = useCancelExhibition(shelterClubId);
  const addInternal = useAddInternalPet(shelterClubId);
  const addExternal = useAddExternalPet(shelterClubId);
  const createShiftMutation = useCreateShift(shelterClubId);
  const logPostEvent = useLogPostEvent(shelterClubId);
  const { toast } = useToast();

  // Forms
  const [newInternalPetId, setNewInternalPetId] = useState('');
  const [extForm, setExtForm] = useState({ pet_id: '', owner_shelter_id: '', name: '', species: 'dog' });
  const [shiftForm, setShiftForm] = useState({
    start_at: '', end_at: '', role: 'cuidador', slots_total: 1, notes: '',
  });
  const [logForm, setLogForm] = useState({ pet_id: '', pet_origin: 'internal', destination: 'returned_to_shelter', notes: '' });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando vitrine…</p>;
  if (!exhibition) return <p className="text-sm text-destructive">Vitrine não encontrada.</p>;

  const isTerminal = isExhibitionTerminal(exhibition.status);

  // ─── Handlers ────────────────────────────────────────────────────────

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync({ exhibitionId, actor });
      toast({ title: '✓ Vitrine iniciada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleComplete = async () => {
    if (!window.confirm('Marcar vitrine como concluída?')) return;
    try {
      await completeMutation.mutateAsync({ exhibitionId, actor });
      toast({ title: '✓ Vitrine concluída.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    const reason = window.prompt('Motivo do cancelamento (mín. 3 caracteres):');
    if (!reason || reason.trim().length < 3) return;
    try {
      await cancelMutation.mutateAsync({ exhibitionId, reason: reason.trim(), actor });
      toast({ title: '✓ Vitrine cancelada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleToggleVolunteers = async () => {
    try {
      await updateMutation.mutateAsync({
        exhibitionId,
        patch: { requires_volunteers: !exhibition.requires_volunteers },
        actor,
      });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleAddInternal = async (e) => {
    e.preventDefault();
    if (!newInternalPetId.trim()) return;
    try {
      await addInternal.mutateAsync({
        exhibitionId,
        input: { pet_id: newInternalPetId.trim() },
        actor,
      });
      setNewInternalPetId('');
      toast({ title: '✓ Pet adicionado.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleAddExternal = async (e) => {
    e.preventDefault();
    if (!extForm.pet_id || !extForm.owner_shelter_id || !extForm.name) return;
    try {
      await addExternal.mutateAsync({
        exhibitionId,
        input: { ...extForm, species: extForm.species || undefined },
        actor,
      });
      setExtForm({ pet_id: '', owner_shelter_id: '', name: '', species: 'dog' });
      toast({ title: '✓ Pet externo adicionado.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!shiftForm.start_at || !shiftForm.end_at) return;
    // Converter datetime-local → ISO
    const sd = new Date(shiftForm.start_at);
    const ed = new Date(shiftForm.end_at);
    if (ed <= sd) {
      toast({ title: 'Erro', description: 'Fim deve ser depois do início.' });
      return;
    }
    try {
      await createShiftMutation.mutateAsync({
        exhibitionId,
        input: {
          start_at: sd.toISOString(),
          end_at: ed.toISOString(),
          role: shiftForm.role,
          slots_total: parseInt(shiftForm.slots_total, 10),
          notes: shiftForm.notes.trim() || undefined,
        },
        actor,
      });
      setShiftForm({ start_at: '', end_at: '', role: 'cuidador', slots_total: 1, notes: '' });
      toast({ title: '✓ Escala criada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleLogPostEvent = async (e) => {
    e.preventDefault();
    if (!logForm.pet_id) return;
    try {
      const r = await logPostEvent.mutateAsync({
        exhibitionId,
        input: {
          pet_id: logForm.pet_id,
          pet_origin: logForm.pet_origin,
          destination: logForm.destination,
          notes: logForm.notes.trim() || undefined,
        },
        actor,
      });
      if (r.idempotent) {
        toast({ title: 'Já registrado', description: 'Esse animal já tem destino registrado.' });
      } else {
        toast({ title: '✓ Destino registrado.' });
      }
      setLogForm({ pet_id: '', pet_origin: 'internal', destination: 'returned_to_shelter', notes: '' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate">{exhibition.title}</CardTitle>
              <Badge className={STATUS_TONES[exhibition.status]}>
                {EXHIBITION_STATUS_LABELS[exhibition.status]}
              </Badge>
              {exhibition.requires_volunteers && <Badge variant="outline">Voluntários</Badge>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {formatExhibitionDateTime(exhibition.datetime_start)}
              {' → '}
              {formatExhibitionDateTime(exhibition.datetime_end)}
              {' · '}
              {exhibitionDurationHours(exhibition)}h
            </p>
            <p className="text-sm text-muted-foreground">
              📍 {exhibition.venue?.address} ({exhibition.venue?.lat}, {exhibition.venue?.lng})
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Organizador: {exhibition.organizer_name || exhibition.organizer_uid}
              {exhibition.co_organizers_uids?.length > 0 && (
                <> · Co-org: {exhibition.co_organizers_uids.join(', ')}</>
              )}
            </p>
            {exhibition.notes && (
              <p className="text-sm mt-2 whitespace-pre-wrap">📝 {exhibition.notes}</p>
            )}
            {exhibition.cancelled_at && (
              <p className="text-sm text-red-700 mt-2">
                ❌ Cancelada em {formatExhibitionDateTime(exhibition.cancelled_at)} —{' '}
                {exhibition.cancellation_reason}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {onBack && (
              <Button size="sm" variant="outline" onClick={onBack}>
                ← Voltar
              </Button>
            )}
            {exhibition.status === 'scheduled' && (
              <Button size="sm" onClick={handleStart}>
                Iniciar
              </Button>
            )}
            {exhibition.status === 'active' && (
              <Button size="sm" variant="secondary" onClick={handleComplete}>
                Concluir
              </Button>
            )}
            {(exhibition.status === 'scheduled' || exhibition.status === 'active') && (
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                Cancelar
              </Button>
            )}
            {!isTerminal && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleToggleVolunteers}
                disabled={updateMutation.isPending}
              >
                {exhibition.requires_volunteers ? 'Desmarcar vol.' : 'Marcar vol.'}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Animais */}
      <Card>
        <CardHeader>
          <CardTitle>Animais ({totalExhibitionAnimals(exhibition)})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Internos */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Internos ({exhibition.pet_ids?.length || 0})</h4>
            {(exhibition.pet_ids || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum.</p>
            ) : (
              <ul className="space-y-2">
                {exhibition.pet_ids.map((pid) => (
                  <PetRow
                    key={pid}
                    pet={pid}
                    origin="internal"
                    exhibitionId={exhibitionId}
                    shelterClubId={shelterClubId}
                    actor={actor}
                    disabled={isTerminal}
                  />
                ))}
              </ul>
            )}
            {!isTerminal && (
              <form onSubmit={handleAddInternal} className="flex gap-2 mt-2">
                <Input
                  value={newInternalPetId}
                  onChange={(e) => setNewInternalPetId(e.target.value)}
                  placeholder="ID do pet interno"
                />
                <Button type="submit" size="sm" disabled={addInternal.isPending}>
                  + Adicionar
                </Button>
              </form>
            )}
          </div>

          {/* Externos */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Externos ({exhibition.external_pets?.length || 0})</h4>
            {(exhibition.external_pets || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum.</p>
            ) : (
              <ul className="space-y-2">
                {exhibition.external_pets.map((p) => (
                  <PetRow
                    key={`${p.pet_id}_${p.owner_shelter_id}`}
                    pet={p}
                    origin="external"
                    exhibitionId={exhibitionId}
                    shelterClubId={shelterClubId}
                    actor={actor}
                    disabled={isTerminal}
                  />
                ))}
              </ul>
            )}
            {!isTerminal && (
              <form onSubmit={handleAddExternal} className="grid grid-cols-2 gap-2 mt-2">
                <Input
                  value={extForm.pet_id}
                  onChange={(e) => setExtForm({ ...extForm, pet_id: e.target.value })}
                  placeholder="ID do pet"
                />
                <Input
                  value={extForm.owner_shelter_id}
                  onChange={(e) => setExtForm({ ...extForm, owner_shelter_id: e.target.value })}
                  placeholder="ID do abrigo de origem"
                />
                <Input
                  value={extForm.name}
                  onChange={(e) => setExtForm({ ...extForm, name: e.target.value })}
                  placeholder="Nome"
                />
                <select
                  value={extForm.species}
                  onChange={(e) => setExtForm({ ...extForm, species: e.target.value })}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="dog">cão</option>
                  <option value="cat">gato</option>
                  <option value="bird">ave</option>
                  <option value="other">outro</option>
                </select>
                <Button type="submit" size="sm" disabled={addExternal.isPending} className="col-span-2">
                  + Adicionar pet externo
                </Button>
              </form>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Escalas */}
      {exhibition.requires_volunteers && (
        <Card>
          <CardHeader>
            <CardTitle>Escalas ({shifts.filter((s) => !s.deleted_at).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shifts.filter((s) => !s.deleted_at).length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma escala cadastrada.</p>
            ) : (
              <ul className="space-y-2">
                {shifts.filter((s) => !s.deleted_at).map((s) => (
                  <ShiftRow
                    key={s.id}
                    shift={s}
                    exhibitionId={exhibitionId}
                    shelterClubId={shelterClubId}
                    actor={actor}
                    disabled={isTerminal}
                  />
                ))}
              </ul>
            )}
            {!isTerminal && (
              <form onSubmit={handleCreateShift} className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t">
                <Input
                  type="datetime-local"
                  value={shiftForm.start_at}
                  onChange={(e) => setShiftForm({ ...shiftForm, start_at: e.target.value })}
                  placeholder="Início"
                />
                <Input
                  type="datetime-local"
                  value={shiftForm.end_at}
                  onChange={(e) => setShiftForm({ ...shiftForm, end_at: e.target.value })}
                  placeholder="Fim"
                />
                <select
                  value={shiftForm.role}
                  onChange={(e) => setShiftForm({ ...shiftForm, role: e.target.value })}
                  className="border rounded px-2 py-1 text-sm"
                >
                  {Object.keys(SHIFT_ROLE_LABELS).map((r) => (
                    <option key={r} value={r}>
                      {SHIFT_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={shiftForm.slots_total}
                  onChange={(e) => setShiftForm({ ...shiftForm, slots_total: e.target.value })}
                  placeholder="Vagas"
                />
                <Input
                  value={shiftForm.notes}
                  onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
                  placeholder="Notas (opcional)"
                  className="md:col-span-3"
                />
                <Button type="submit" size="sm" disabled={createShiftMutation.isPending}>
                  + Criar escala
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Post-event log */}
      {(exhibition.status === 'active' || exhibition.status === 'completed') && (
        <Card>
          <CardHeader>
            <CardTitle>Destino dos animais ({logs.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum destino registrado ainda.</p>
            ) : (
              <ul className="space-y-2">
                {logs.map((log) => (
                  <PostEventLogRow key={log.id} log={log} />
                ))}
              </ul>
            )}
            <form onSubmit={handleLogPostEvent} className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t">
              <Input
                value={logForm.pet_id}
                onChange={(e) => setLogForm({ ...logForm, pet_id: e.target.value })}
                placeholder="ID do pet"
              />
              <select
                value={logForm.pet_origin}
                onChange={(e) => setLogForm({ ...logForm, pet_origin: e.target.value })}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="internal">interno</option>
                <option value="external">externo</option>
              </select>
              <select
                value={logForm.destination}
                onChange={(e) => setLogForm({ ...logForm, destination: e.target.value })}
                className="border rounded px-2 py-1 text-sm"
              >
                {Object.keys(POST_EVENT_DESTINATION_LABELS).map((d) => (
                  <option key={d} value={d}>
                    {POST_EVENT_DESTINATION_LABELS[d]}
                  </option>
                ))}
              </select>
              <Input
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                placeholder="Notas (opcional)"
              />
              <Button
                type="submit"
                size="sm"
                disabled={logPostEvent.isPending}
                className="col-span-2 md:col-span-4"
              >
                + Registrar destino
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
