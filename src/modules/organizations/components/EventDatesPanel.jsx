import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CalendarDays, MapPin, Plus, Trash2, Check, X, Pencil, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useEventDates,
  useAddEventDate,
  useUpdateEventDate,
  useDeleteEventDate,
  useEventDateRsvps,
  useSetEventDateRsvp,
} from '@/modules/organizations/hooks/useClubs';
import { RSVP_STATUS, RSVP_STATUS_LABELS } from '@/modules/organizations/domain/constants';

function formatDateTime(value) {
  if (!value) return 'Data a definir';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Data a definir';
  return d.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/**
 * Lista as datas do evento. Cada uma é um card colapsável com local,
 * horário e a resposta de presença (RSVP) de cada membro.
 */
export default function EventDatesPanel({ event, clubId }) {
  const eventId = event.id;
  const { data: dates = [], isLoading } = useEventDates(eventId);
  const { data: rsvps = [] } = useEventDateRsvps(eventId);
  const addDate = useAddEventDate(eventId);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date_time: '', location: event.location || '', note: '' });

  const rsvpsByDate = useMemo(() => {
    const map = new Map();
    rsvps.forEach((r) => {
      if (!map.has(r.date_id)) map.set(r.date_id, []);
      map.get(r.date_id).push(r);
    });
    return map;
  }, [rsvps]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.date_time) {
      toast.error('Informe a data e o horário.');
      return;
    }
    try {
      await addDate.mutateAsync({ club_id: event.club_id, date_time: form.date_time, location: form.location, note: form.note });
      toast.success('Data adicionada.');
      setForm({ date_time: '', location: event.location || '', note: '' });
      setAdding(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível adicionar.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Datas do evento</h3>
          <p className="text-sm text-muted-foreground">Cada data tem local, horário e sua resposta de presença.</p>
        </div>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova data
          </Button>
        )}
      </div>

      {adding && (
        <section className="arena-section-card rounded-xl border-primary/30">
          <div className="arena-section-card-body p-4">
            <form onSubmit={handleAdd} className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="new_date_time">Data e hora *</Label>
                <Input id="new_date_time" type="datetime-local" value={form.date_time} onChange={(e) => setForm((p) => ({ ...p, date_time: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new_date_location">Local</Label>
                <Input id="new_date_location" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} maxLength={160} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="new_date_note">Observação</Label>
                <Input id="new_date_note" value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} maxLength={200} placeholder="Ex.: trazer caixas de transporte, chegar 30min antes…" />
              </div>
              <div className="flex justify-end gap-2 sm:col-span-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={addDate.isPending}>Adicionar</Button>
              </div>
            </form>
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
      ) : dates.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma data cadastrada"
          description="Adicione a primeira data com local e horário."
        />
      ) : (
        <div className="space-y-3">
          {dates.map((d) => (
            <DateCard
              key={d.id}
              event={event}
              clubId={clubId}
              date={d}
              rsvps={rsvpsByDate.get(d.id) || []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DateCard({ event, date, rsvps }) {
  const { user } = useAuth();
  const eventId = event.id;
  const setRsvp = useSetEventDateRsvp(eventId);
  const updateDate = useUpdateEventDate(eventId);
  const deleteDate = useDeleteEventDate(eventId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    date_time: toLocalInput(date.date_time),
    location: date.location || '',
    note: date.note || '',
  });

  const myStatus = rsvps.find((r) => r.user_id === user?.uid)?.status;
  const grouped = {
    [RSVP_STATUS.GOING]: rsvps.filter((r) => r.status === RSVP_STATUS.GOING),
    [RSVP_STATUS.MAYBE]: rsvps.filter((r) => r.status === RSVP_STATUS.MAYBE),
    [RSVP_STATUS.NOT_GOING]: rsvps.filter((r) => r.status === RSVP_STATUS.NOT_GOING),
  };

  const handleRsvp = async (status) => {
    try {
      await setRsvp.mutateAsync({ dateId: date.id, status });
    } catch (err) {
      toast.error(err.message || 'Não foi possível responder.');
    }
  };

  const handleSave = async () => {
    try {
      await updateDate.mutateAsync({ dateId: date.id, updates: form });
      toast.success('Atualizado.');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível salvar.');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDate.mutateAsync(date.id);
      toast.success('Data removida.');
      setConfirmDelete(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover.');
    }
  };

  return (
    <section className="arena-section-card overflow-hidden rounded-xl">
      {/* Cabeçalho colapsável */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-secondary"
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <div className="truncate font-semibold text-foreground">{formatDateTime(date.date_time)}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {date.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {date.location}</span>}
              <span>{grouped[RSVP_STATUS.GOING].length} confirmado(s)</span>
            </div>
          </div>
        </div>
        <Badge variant={myStatus === RSVP_STATUS.GOING ? 'success' : 'secondary'} className="shrink-0 rounded-full">
          {myStatus ? RSVP_STATUS_LABELS[myStatus] : 'Responder'}
        </Badge>
      </button>

      {open && (
        <CardContent className="border-t border-border p-4">
          <PresenceSection
            date={date}
            editing={editing}
            setEditing={setEditing}
            form={form}
            setForm={setForm}
            onSave={handleSave}
            saving={updateDate.isPending}
            onDeleteRequest={() => setConfirmDelete(true)}
            myStatus={myStatus}
            grouped={grouped}
            onRsvp={handleRsvp}
            rsvpPending={setRsvp.isPending}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Remover data"
        description="A data, suas respostas e participantes serão removidos."
        confirmLabel="Remover"
        destructive
        loading={deleteDate.isPending}
        onConfirm={handleDelete}
      />
    </section>
  );
}

function PresenceSection({ date, editing, setEditing, form, setForm, onSave, saving, onDeleteRequest, myStatus, grouped, onRsvp, rsvpPending }) {
  return (
    <div className="space-y-4">
      {editing ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Data e hora</Label>
            <Input type="datetime-local" value={form.date_time} onChange={(e) => setForm((p) => ({ ...p, date_time: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Local</Label>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} maxLength={160} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Observação</Label>
            <Input value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} maxLength={200} />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}><X className="mr-1 h-3.5 w-3.5" /> Cancelar</Button>
            <Button size="sm" onClick={onSave} disabled={saving}><Check className="mr-1 h-3.5 w-3.5" /> Salvar</Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            {date.note ? <p>{date.note}</p> : <p className="text-muted-foreground">Sem observações.</p>}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)} aria-label="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={onDeleteRequest} title="Excluir">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div>
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Sua presença</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.values(RSVP_STATUS).map((status) => (
            <Button
              key={status}
              size="sm"
              variant={myStatus === status ? 'default' : 'outline'}
              disabled={rsvpPending}
              onClick={() => onRsvp(status)}
            >
              {RSVP_STATUS_LABELS[status]} · {grouped[status].length}
            </Button>
          ))}
        </div>
      </div>

      {grouped[RSVP_STATUS.GOING].length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {grouped[RSVP_STATUS.GOING].map((r) => (
            <Badge key={r.id} variant="secondary" className="rounded-full font-normal">{r.user_name}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
