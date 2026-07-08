import React, { useState, useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Plus, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { listCommunityEvents, createCommunityEvent, deleteCommunityEvent } from '../services/communityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { hasCommunityPermission } from '../domain/permissions';
import { COMMUNITY_PERMISSION } from '../domain/constants';

import { ptBR } from 'date-fns/locale';

export default function EventsTab({ communityId, isAdmin, membership, community }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const fetchEvents = () => {
    listCommunityEvents(communityId).then(setEvents).catch(console.error);
  };

  useEffect(() => {
    fetchEvents();
  }, [communityId]);

  // Dono da comunidade SEMPRE pode gerenciar eventos (não depende da
  // membership carregar). Membros com permissão granular `manage_events`
  // também. Evita o bug de "criei a comunidade e o botão de criar evento
  // não aparece" em dados legados / membership ainda carregando.
  const isCommunityCreator = community?.owner_id === user?.uid;
  const canManageEvents = isCommunityCreator
    || hasCommunityPermission(community, membership, COMMUNITY_PERMISSION.EVENTS, user?.uid);

  const handleDelete = async (eventId, e) => {
    e.stopPropagation();
    if (!confirm('Deseja excluir este evento?')) return;
    try {
      await deleteCommunityEvent(eventId);
      toast.success('Evento excluído');
      fetchEvents();
    } catch (err) {
      toast.error('Erro ao excluir evento');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Próximos Eventos</h2>
        {canManageEvents && (
          <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          Nenhum evento agendado nesta comunidade.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map(ev => (
            <Card key={ev.id} className="p-4 flex flex-col gap-3 hover:bg-secondary/10 transition-colors">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-base">{ev.title}</h3>
                {canManageEvents && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(ev.id, e)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{ev.description}</p>

              <div className="space-y-1 mt-auto pt-2 border-t border-border/50">
                {ev.starts_at && (
                  <div className="text-xs flex items-center gap-1.5 text-foreground/80 font-medium">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {format(new Date(ev.starts_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                  </div>
                )}
                {ev.location && (
                  <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" /> {ev.location}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {isDialogOpen && (
        <EventFormDialog
          communityId={communityId}
          open={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={fetchEvents}
        />
      )}
    </div>
  );
}

function EventFormDialog({ communityId, open, onClose, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: '', description: '', location: '', starts_at: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Título é obrigatório');
    setLoading(true);
    try {
      await createCommunityEvent(communityId, form, user);
      toast.success('Evento criado!');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Erro ao criar evento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Título do Evento *</label>
            <Input
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
              placeholder="Ex: Encontro de Pets"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Data e Hora</label>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={e => setForm({...form, starts_at: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Local</label>
            <Input
              value={form.location}
              onChange={e => setForm({...form, location: e.target.value})}
              placeholder="Ex: Parque da Cidade"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Detalhes sobre o evento..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading}>Salvar</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
