/**
 * @fileoverview Componente: ExhibitionRsvpPanel (Fase 12).
 *
 * Painel de convites (RSVP) para o abrigo gerenciar convocações
 * de voluntários para uma vitrine. Lista todos os invites, mostra
 * contadores agregados por status, e permite convidar um novo
 * voluntário.
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
  RSVP_STATUS,
  RSVP_STATUS_LABELS,
  RSVP_STATUS_COLORS,
  summarizeRsvpStatuses,
} from '@/modules/shelter/domain/operational/exhibitionRsvp';
import {
  useInvites,
  useCreateInvite,
  useCancelInvite,
} from '@/modules/shelter/hooks/useExhibitionRsvps';

export function ExhibitionRsvpPanel({
  shelterClubId,
  exhibitionId,
  canEdit = false,
  actor,
}) {
  const [showForm, setShowForm] = useState(false);
  const [volunteerUid, setVolunteerUid] = useState('');
  const [volunteerName, setVolunteerName] = useState('');
  const [notes, setNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);

  const { data: invites = [], isLoading } = useInvites(
    shelterClubId, exhibitionId, statusFilter ? { status: statusFilter } : {},
  );
  const createMutation = useCreateInvite(shelterClubId, exhibitionId);
  const cancelMutation = useCancelInvite(shelterClubId, exhibitionId);
  const { toast } = useToast();

  if (!shelterClubId || !exhibitionId) {
    return <p className="text-sm text-muted-foreground">Exhibition/abrigo não definidos.</p>;
  }

  const summary = summarizeRsvpStatuses(invites);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!volunteerUid || !volunteerName) {
      toast({ title: 'UID e nome do voluntário são obrigatórios.', variant: 'destructive' });
      return;
    }
    try {
      await createMutation.mutateAsync({
        input: {
          volunteer_uid: volunteerUid,
          volunteer_name: volunteerName,
          notes: notes || undefined,
        },
        actor,
      });
      toast({ title: 'Voluntário convocado.' });
      setVolunteerUid('');
      setVolunteerName('');
      setNotes('');
      setShowForm(false);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCancel = async (inviteId, volunteerName) => {
    if (!window.confirm(`Cancelar convocação de ${volunteerName}?`)) return;
    try {
      await cancelMutation.mutateAsync({ inviteId, actor });
      toast({ title: 'Convocação cancelada.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Convocações (RSVP)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.total} convite(s) · {summary.yes} confirmado(s) · {summary.no} recusado(s) · {summary.maybe} talvez · {summary.pending} pendente(s)
            </p>
          </div>
          {canEdit && (
            <Button
              size="sm"
              variant={showForm ? 'outline' : 'default'}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? 'Cancelar' : '+ Convidar voluntário'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Form de convocação */}
        {showForm && canEdit && (
          <form onSubmit={handleInvite} className="space-y-3 rounded-md border border-border p-4 bg-zinc-50 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">UID do voluntário</label>
                <Input
                  value={volunteerUid}
                  onChange={(e) => setVolunteerUid(e.target.value)}
                  placeholder="user-abc123"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Nome do voluntário</label>
                <Input
                  value={volunteerName}
                  onChange={(e) => setVolunteerName(e.target.value)}
                  placeholder="Maria Silva"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-foreground block mb-1">Observações (opcional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex.: Pode chegar 30min mais cedo"
                  maxLength={2000}
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Convidando…' : 'Enviar convocação'}
              </Button>
            </div>
          </form>
        )}

        {/* Filtro por status */}
        <div className="flex flex-wrap gap-1 mb-3">
          <Button
            size="sm" variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
          >
            Todos
          </Button>
          {RSVP_STATUS.map((s) => (
            <Button
              key={s} size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {RSVP_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>

        {/* Lista */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Carregando convocações…</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma convocação {statusFilter ? `(${RSVP_STATUS_LABELS[statusFilter]})` : 'ainda'}.
          </p>
        ) : (
          <ol className="space-y-2">
            {invites.map((inv) => (
              <li key={inv.id} className="rounded-md border border-border p-3 flex gap-3 items-center">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground">{inv.volunteer_name}</span>
                    <Badge className={RSVP_STATUS_COLORS[inv.status] || ''}>
                      {RSVP_STATUS_LABELS[inv.status] || inv.status}
                    </Badge>
                  </div>
                  {inv.notes && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      📝 {inv.notes}
                    </p>
                  )}
                  {inv.response_notes && (
                    <p className="text-xs text-foreground mt-1 line-clamp-2">
                      💬 {inv.response_notes}
                    </p>
                  )}
                  {inv.responded_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Respondeu em {new Date(inv.responded_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
                {canEdit && (
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => handleCancel(inv.id, inv.volunteer_name)}
                    className="text-xs h-7 px-2"
                    disabled={cancelMutation.isPending}
                  >
                    Cancelar
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
