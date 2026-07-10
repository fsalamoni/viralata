/**
 * @fileoverview Componente: ExhibitionShiftsManager (Fase 12).
 *
 * Gerenciador de escalas (shifts/turnos) para uma vitrine. CRUD
 * completo de shifts e atribuição de voluntários aos turnos.
 *
 * Feature flag: `shelter_exhibition_rsvps` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (RSVP / Escalas)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  SHIFT_ROLE,
  SHIFT_ROLE_LABELS,
  shiftDurationHours,
  shiftNeedsMoreVolunteers,
  shiftRemainingSpots,
} from '@/modules/shelter/domain/operational/exhibitionRsvp';
import {
  useShifts,
  useCreateShift,
  useUpdateShift,
  useDeleteShift,
  useAssignVolunteer,
  useUnassignVolunteer,
} from '@/modules/shelter/hooks/useExhibitionRsvps';

export function ExhibitionShiftsManager({
  shelterClubId,
  exhibitionId,
  canEdit = false,
  actor,
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState(null);
  const [assignUid, setAssignUid] = useState({});   // { [shiftId]: uid }

  // form state
  const [date, setDate] = useState('');
  const [timeStart, setTimeStart] = useState('');
  const [timeEnd, setTimeEnd] = useState('');
  const [role, setRole] = useState('cuidador');
  const [roleLabel, setRoleLabel] = useState('');
  const [neededCount, setNeededCount] = useState(1);
  const [notes, setNotes] = useState('');

  const { data: shifts = [], isLoading } = useShifts(shelterClubId, exhibitionId);
  const createMutation = useCreateShift(shelterClubId, exhibitionId);
  const updateMutation = useUpdateShift(shelterClubId, exhibitionId);
  const deleteMutation = useDeleteShift(shelterClubId, exhibitionId);
  const assignMutation = useAssignVolunteer(shelterClubId, exhibitionId);
  const unassignMutation = useUnassignVolunteer(shelterClubId, exhibitionId);
  const { toast } = useToast();

  if (!shelterClubId || !exhibitionId) {
    return <p className="text-sm text-muted-foreground">Exhibition/abrigo não definidos.</p>;
  }

  const resetForm = () => {
    setDate(''); setTimeStart(''); setTimeEnd('');
    setRole('cuidador'); setRoleLabel(''); setNeededCount(1);
    setNotes(''); setEditingShiftId(null);
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (!date || !timeStart || !timeEnd || !roleLabel) {
      toast({ title: 'Preencha todos os campos obrigatórios.', variant: 'destructive' });
      return;
    }
    const input = {
      date, time_start: timeStart, time_end: timeEnd,
      role, role_label: roleLabel, needed_count: neededCount,
      notes: notes || undefined,
    };
    try {
      if (editingShiftId) {
        await updateMutation.mutateAsync({
          shiftId: editingShiftId, patch: input, actor,
        });
        toast({ title: 'Escala atualizada.' });
      } else {
        await createMutation.mutateAsync({ input, actor });
        toast({ title: 'Escala criada.' });
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleEdit = (shift) => {
    setEditingShiftId(shift.id);
    setDate(shift.date);
    setTimeStart(shift.time_start);
    setTimeEnd(shift.time_end);
    setRole(shift.role);
    setRoleLabel(shift.role_label);
    setNeededCount(shift.needed_count);
    setNotes(shift.notes || '');
    setShowForm(true);
  };

  const handleDelete = async (shift) => {
    if (!window.confirm(`Excluir escala "${shift.role_label}" (${shift.date})?`)) return;
    try {
      await deleteMutation.mutateAsync({ shiftId: shift.id, actor });
      toast({ title: 'Escala excluída.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleAssign = async (shift) => {
    const uid = (assignUid[shift.id] || '').trim();
    if (!uid) {
      toast({ title: 'Informe o UID do voluntário.', variant: 'destructive' });
      return;
    }
    try {
      await assignMutation.mutateAsync({ shiftId: shift.id, volunteerUid: uid, actor });
      toast({ title: 'Voluntário escalado.' });
      setAssignUid((prev) => ({ ...prev, [shift.id]: '' }));
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleUnassign = async (shift, volunteerUid) => {
    if (!window.confirm('Remover voluntário desta escala?')) return;
    try {
      await unassignMutation.mutateAsync({ shiftId: shift.id, volunteerUid, actor });
      toast({ title: 'Voluntário removido da escala.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Escalas (Shifts)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {shifts.length} escala(s) cadastrada(s)
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant={showForm ? 'outline' : 'default'}
              onClick={() => {
                resetForm();
                setShowForm((v) => !v);
              }}
            >
              {showForm ? 'Cancelar' : '+ Nova escala'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {showForm && canEdit && (
          <form onSubmit={handleCreateOrUpdate} className="space-y-3 rounded-md border border-border p-4 bg-zinc-50 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Data</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Função (role)</label>
                <select
                  value={role} onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-sm"
                >
                  {SHIFT_ROLE.map((r) => (
                    <option key={r} value={r}>{SHIFT_ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Início (HH:MM)</label>
                <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Fim (HH:MM)</label>
                <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Label da função</label>
                <Input
                  value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="Ex.: Cuidador dos cães"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Vagas necessárias</label>
                <Input
                  type="number" min="1" max="200"
                  value={neededCount} onChange={(e) => setNeededCount(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-foreground block mb-1">Observações (opcional)</label>
                <Textarea
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  maxLength={2000} rows={2}
                  placeholder="Ex.: Levar ração para 5 cães"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingShiftId
                  ? (updateMutation.isPending ? 'Salvando…' : 'Atualizar escala')
                  : (createMutation.isPending ? 'Criando…' : 'Criar escala')}
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando escalas…</p>
        ) : shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma escala cadastrada. {canEdit && 'Clique em "+ Nova escala" para começar.'}
          </p>
        ) : (
          <ol className="space-y-3">
            {shifts.map((shift) => {
              const assigned = Array.isArray(shift.assigned_uids) ? shift.assigned_uids : [];
              const remaining = shiftRemainingSpots(shift);
              const needsMore = shiftNeedsMoreVolunteers(shift);
              return (
                <li key={shift.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {shift.role_label}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {SHIFT_ROLE_LABELS[shift.role] || shift.role}
                        </Badge>
                        {needsMore ? (
                          <Badge className="bg-amber-100 text-amber-700 text-xs">
                            Faltam {remaining}
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            Completo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        📅 {shift.date} · ⏰ {shift.time_start}–{shift.time_end} · {shiftDurationHours(shift)}h
                      </p>
                      {shift.notes && (
                        <p className="text-xs text-foreground mt-1">📝 {shift.notes}</p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleEdit(shift)}
                          className="text-xs h-7 px-2"
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleDelete(shift)}
                          className="text-xs h-7 px-2 text-red-600"
                        >
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Atribuídos */}
                  <div className="mt-3">
                    <p className="text-xs font-medium text-foreground mb-1">
                      Escalados ({assigned.length}/{shift.needed_count}):
                    </p>
                    {assigned.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Nenhum voluntário atribuído.</p>
                    ) : (
                      <ul className="space-y-1">
                        {assigned.map((uid) => (
                          <li key={uid} className="text-xs text-foreground flex items-center justify-between bg-zinc-50 rounded px-2 py-1">
                            <span>{uid}</span>
                            {canEdit && (
                              <Button
                                size="sm" variant="ghost"
                                onClick={() => handleUnassign(shift, uid)}
                                className="text-xs h-5 px-1 text-red-600"
                              >
                                ✕
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Form de atribuição */}
                  {canEdit && needsMore && (
                    <div className="mt-2 flex gap-2">
                      <Input
                        placeholder="UID do voluntário"
                        value={assignUid[shift.id] || ''}
                        onChange={(e) => setAssignUid((prev) => ({ ...prev, [shift.id]: e.target.value }))}
                        className="text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleAssign(shift)}
                        disabled={assignMutation.isPending}
                      >
                        Escalar
                      </Button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
