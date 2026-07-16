import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, MapPin, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { listCommunityEvents, createCommunityEvent, deleteCommunityEvent } from '../services/communityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { hasCommunityPermission } from '../domain/permissions';
import { COMMUNITY_PERMISSION } from '../domain/constants';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

import { ptBR } from 'date-fns/locale';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';

export default function EventsTab({ communityId, isAdmin, membership, community }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState('upcoming'); // 'all' | 'upcoming' | 'past'
  const eventDetailEnabled = useFeatureFlag(FEATURE_FLAG.COMMUNITY_EVENT_DETAIL_V1);

  const fetchEvents = () => {
    setLoading(true);
    listCommunityEvents(communityId)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
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
    if (!(await confirmDialog({ title: 'Deseja excluir este evento?' }))) return;
    try {
      await deleteCommunityEvent(eventId);
      toast.success('Evento excluído');
      fetchEvents();
    } catch (err) {
      toast.error('Erro ao excluir evento');
    }
  };

  const now = new Date();
  const filteredEvents = events.filter(ev => {
    if (eventFilter === 'upcoming') return !ev.starts_at || new Date(ev.starts_at) >= now;
    if (eventFilter === 'past') return ev.starts_at && new Date(ev.starts_at) < now;
    return true;
  });

  const EVENT_FILTERS = [
    { label: 'Próximos', value: 'upcoming' },
    { label: 'Passados', value: 'past' },
    { label: 'Todos', value: 'all' },
  ];

  return (
    <div className="space-y-4">
      {/* Header com título e ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-2">
        <h2 className="text-xl font-bold">Eventos</h2>
        {canManageEvents && (
          <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Novo Evento
          </Button>
        )}
      </div>

      {/* Filtros visíveis */}
      <div className="flex items-center gap-2 flex-wrap">
        {EVENT_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setEventFilter(f.value)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              eventFilter === f.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
            }`}
          >
            {f.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${
              eventFilter === f.value ? 'bg-primary-foreground/20' : 'bg-secondary'
            }`}>
              {f.value === 'upcoming' ? events.filter(e => !e.starts_at || new Date(e.starts_at) >= now).length
                : f.value === 'past' ? events.filter(e => e.starts_at && new Date(e.starts_at) < now).length
                : events.length}
            </span>
          </button>
        ))}
      </div>

      {/* Skeleton de loading */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-2xl border border-border p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={eventFilter === 'upcoming' ? 'Nenhum evento futuro' : eventFilter === 'past' ? 'Nenhum evento passado' : 'Nenhum evento cadastrado'}
          description={eventFilter === 'upcoming' ? 'Esta comunidade ainda não tem eventos agendados.' : 'Não há eventos para exibir.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredEvents.map(ev => {
            const card = (
              <section key={ev.id} className="p-4 flex flex-col gap-3 hover:bg-secondary/10 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-base">{ev.title}</h3>
                  {canManageEvents && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(ev.id, e)} aria-label="Excluir evento">
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
              </section>
            );
            if (eventDetailEnabled) {
              return (
                <Link key={ev.id} to={`/comunidade/${communityId}/eventos/${ev.id}`} className="block">
                  {card}
                </Link>
              );
            }
            return card;
          })}
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
