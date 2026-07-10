/**
 * @fileoverview Componente: ParticipationsManager (Fase 13).
 *
 * Gerenciador de participações de voluntários do abrigo. Lista todas
 * as participações com filtros (voluntário / evento / role), e ações
 * de check-in, check-out, edição de notas e transporte.
 *
 * Feature flag: `shelter_volunteers` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (voluntários)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  VOLUNTEER_ROLE,
  VOLUNTEER_ROLE_LABELS,
  participationIsComplete,
} from '@/modules/shelter/domain/operational/volunteer';
import {
  useParticipations,
  useCreateParticipation,
  useUpdateParticipation,
  useCheckInVolunteer,
  useCheckOutVolunteer,
  useDeleteParticipation,
} from '@/modules/shelter/hooks/useVolunteers';

const STATUS_TONES = {
  pending: 'bg-amber-100 text-amber-900',
  in_progress: 'bg-blue-100 text-blue-900',
  complete: 'bg-green-100 text-green-900',
};

function participationStatus(p) {
  if (!p.check_in) return 'pending';
  if (participationIsComplete(p)) return 'complete';
  return 'in_progress';
}
const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  complete: 'Concluída',
};

function formatTime(ts) {
  if (!ts) return '—';
  const d = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ParticipationsManager({ shelterClubId, actor, canEdit = false }) {
  const [roleFilter, setRoleFilter] = useState('');
  const { data: parts = [], isLoading } = useParticipations(
    shelterClubId,
    roleFilter ? { role: roleFilter } : {},
  );
  const createMutation = useCreateParticipation(shelterClubId);
  const updateMutation = useUpdateParticipation(shelterClubId);
  const deleteMutation = useDeleteParticipation(shelterClubId);
  const checkInMutation = useCheckInVolunteer(shelterClubId);
  const checkOutMutation = useCheckOutVolunteer(shelterClubId);
  const { toast } = useToast();

  const [newForm, setNewForm] = useState({
    volunteer_uid: '',
    volunteer_name: '',
    exhibition_id: '',
    role: 'cuidador',
    role_label: '',
    transport_provided: false,
    notes: '',
  });

  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando participações…</p>;

  const handleCreate = async () => {
    if (!newForm.volunteer_uid || !newForm.volunteer_name) {
      toast({ title: 'Informe UID e nome do voluntário.', variant: 'destructive' });
      return;
    }
    if (newForm.volunteer_name.trim().length < 2) {
      toast({ title: 'Nome deve ter pelo menos 2 caracteres.', variant: 'destructive' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        input: {
          ...newForm,
          exhibition_id: newForm.exhibition_id || null,
        },
        actor,
      });
      setNewForm({
        volunteer_uid: '',
        volunteer_name: '',
        exhibition_id: '',
        role: 'cuidador',
        role_label: '',
        transport_provided: false,
        notes: '',
      });
      toast({ title: '✓ Participação registrada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCheckIn = async (participationId) => {
    try {
      await checkInMutation.mutateAsync({ participationId, actor });
      toast({ title: '✓ Check-in registrado.' });
    } catch (err) {
      toast({ title: 'Erro no check-in', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCheckOut = async (participationId) => {
    try {
      const r = await checkOutMutation.mutateAsync({ participationId, actor });
      toast({
        title: '✓ Check-out registrado.',
        description: `${r.hours_logged.toFixed(2)}h registradas.`,
      });
    } catch (err) {
      toast({ title: 'Erro no check-out', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleEditNotes = async (participationId, currentNotes) => {
    const next = window.prompt('Observações da participação:', currentNotes || '');
    if (next === null) return;
    try {
      await updateMutation.mutateAsync({
        participationId,
        patch: { notes: next || null },
        actor,
      });
      toast({ title: '✓ Observação atualizada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleToggleTransport = async (participationId, current) => {
    try {
      await updateMutation.mutateAsync({
        participationId,
        patch: { transport_provided: !current },
        actor,
      });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleDelete = async (participationId) => {
    if (!actor?.role === 'platform_admin' && !canEdit) {
      toast({ title: 'Sem permissão para deletar.', variant: 'destructive' });
      return;
    }
    if (!window.confirm('Deletar participation? (soft delete, só platform_admin)')) return;
    try {
      await deleteMutation.mutateAsync({ participationId, actor });
      toast({ title: 'Participation deletada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Participações de Voluntários</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {parts.length} participation(s) {roleFilter && `(${VOLUNTEER_ROLE_LABELS[roleFilter]})`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm" variant={roleFilter === '' ? 'default' : 'outline'}
              onClick={() => setRoleFilter('')}
            >
              Todos
            </Button>
            {VOLUNTEER_ROLE.map((r) => (
              <Button
                key={r} size="sm"
                variant={roleFilter === r ? 'default' : 'outline'}
                onClick={() => setRoleFilter(r)}
              >
                {VOLUNTEER_ROLE_LABELS[r]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Form de nova participation */}
        {canEdit && (
          <details className="rounded border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              + Registrar nova participação
            </summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs">UID do voluntário</label>
                <input
                  className="w-full rounded border border-border px-2 py-1 text-sm"
                  value={newForm.volunteer_uid}
                  onChange={(e) => setNewForm({ ...newForm, volunteer_uid: e.target.value })}
                  placeholder="uid123"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs">Nome</label>
                <input
                  className="w-full rounded border border-border px-2 py-1 text-sm"
                  value={newForm.volunteer_name}
                  onChange={(e) => setNewForm({ ...newForm, volunteer_name: e.target.value })}
                  placeholder="Maria Silva"
                />
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs">Papel</label>
                <select
                  className="w-full rounded border border-border px-2 py-1 text-sm"
                  value={newForm.role}
                  onChange={(e) => setNewForm({ ...newForm, role: e.target.value })}
                >
                  {VOLUNTEER_ROLE.map((r) => (
                    <option key={r} value={r}>{VOLUNTEER_ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-3 space-y-1">
                <label className="text-xs">ID Exposição (opcional)</label>
                <input
                  className="w-full rounded border border-border px-2 py-1 text-sm"
                  value={newForm.exhibition_id}
                  onChange={(e) => setNewForm({ ...newForm, exhibition_id: e.target.value })}
                  placeholder="exh-abc"
                />
              </div>
              <div className="md:col-span-12 space-y-1">
                <label className="text-xs">Observações</label>
                <input
                  className="w-full rounded border border-border px-2 py-1 text-sm"
                  value={newForm.notes}
                  onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  placeholder="Trouxe ração especial, etc."
                />
              </div>
              <div className="md:col-span-12 flex justify-end">
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Criando…' : 'Criar participation'}
                </Button>
              </div>
            </div>
          </details>
        )}

        {/* Lista */}
        {parts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma participação {roleFilter ? `com role ${VOLUNTEER_ROLE_LABELS[roleFilter]}` : 'ainda'}.
          </p>
        ) : (
          <ol className="space-y-3">
            {parts.map((p) => {
              const status = participationStatus(p);
              return (
                <li key={p.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={STATUS_TONES[status] || ''}>
                          {STATUS_LABELS[status]}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {p.volunteer_name}
                        </span>
                        <Badge variant="outline">
                          {VOLUNTEER_ROLE_LABELS[p.role] || p.role}
                        </Badge>
                        {p.role_label && p.role === 'outro' && (
                          <span className="text-xs text-muted-foreground italic">
                            ({p.role_label})
                          </span>
                        )}
                        {p.transport_provided && (
                          <Badge className="bg-purple-100 text-purple-900">🚗 Transporte</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        In: {formatTime(p.check_in)} • Out: {formatTime(p.check_out)}
                        {p.hours_logged > 0 && ` • ${p.hours_logged.toFixed(2)}h`}
                        {p.exhibition_id && ` • Evento: ${p.exhibition_id}`}
                      </p>
                      {p.notes && (
                        <p className="text-xs text-foreground mt-1 italic">
                          &ldquo;{p.notes}&rdquo;
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1">
                        {!p.check_in && (
                          <Button size="sm" onClick={() => handleCheckIn(p.id)}>
                            Check-in
                          </Button>
                        )}
                        {p.check_in && !p.check_out && (
                          <Button size="sm" onClick={() => handleCheckOut(p.id)}>
                            Check-out
                          </Button>
                        )}
                        {participationIsComplete(p) && (
                          <Button
                            size="sm" variant="outline"
                            onClick={() => handleEditNotes(p.id, p.notes)}
                          >
                            Editar notas
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => handleToggleTransport(p.id, p.transport_provided)}
                        >
                          {p.transport_provided ? '🚗 Remover transporte' : '🚗 Marcar transporte'}
                        </Button>
                        {actor?.role === 'platform_admin' && (
                          <Button
                            size="sm" variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDelete(p.id)}
                          >
                            Deletar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
