import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Calendar, Plus, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  listCommunityEvents,
  createCommunityEvent,
  deleteCommunityEvent,
} from '../services/communityService';

function formatEventDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const EMPTY_FORM = { title: '', description: '', location: '', starts_at: '' };

export default function EventsTab({ communityId, isMember }) {
  const { user, userProfile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      setEvents(await listCommunityEvents(communityId));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await createCommunityEvent(communityId, form, user, userProfile);
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await fetchEvents();
      toast.success('Evento criado!');
    } catch (err) {
      toast.error(err.message || 'Não foi possível criar o evento.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteCommunityEvent(confirmDelete.id, user);
      setConfirmDelete(null);
      await fetchEvents();
      toast.success('Evento removido.');
    } catch {
      toast.error('Não foi possível remover o evento.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Próximos Eventos</h2>
        {isMember && (
          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        )}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando eventos…</p>
      ) : events.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          Nenhum evento agendado nesta comunidade.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map((ev) => (
            <Card key={ev.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-base">{ev.title}</h3>
                {user?.uid === ev.created_by && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(ev)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    title="Remover evento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              {ev.starts_at && (
                <div className="text-xs flex items-center gap-1.5 font-medium text-primary">
                  <Calendar className="w-3.5 h-3.5" /> {formatEventDate(ev.starts_at)}
                </div>
              )}
              {ev.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{ev.description}</p>
              )}
              {ev.location && (
                <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {ev.location}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo evento</DialogTitle>
            <DialogDescription>Convide a comunidade para um encontro, mutirão ou feira de adoção.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="community-event-title">Título</Label>
              <Input id="community-event-title" value={form.title} onChange={setField('title')} placeholder="Ex.: Feira de adoção no parque" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="community-event-date">Data e hora</Label>
              <Input id="community-event-date" type="datetime-local" value={form.starts_at} onChange={setField('starts_at')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="community-event-location">Local</Label>
              <Input id="community-event-location" value={form.location} onChange={setField('location')} placeholder="Endereço ou ponto de encontro" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="community-event-description">Descrição</Label>
              <Textarea id="community-event-description" value={form.description} onChange={setField('description')} placeholder="O que vai acontecer? (opcional)" className="min-h-[90px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !form.title.trim()}>
              {creating ? 'Criando…' : 'Criar evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Remover evento"
        description={confirmDelete ? `Tem certeza que deseja remover "${confirmDelete.title}"?` : ''}
        confirmLabel="Remover"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
