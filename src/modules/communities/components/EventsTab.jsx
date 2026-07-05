import React, { useState, useEffect } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, Plus, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { listClubEvents } from '@/modules/organizations/services/clubService';

export default function EventsTab({ communityId }) {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    listClubEvents(communityId, user?.uid).then(setEvents).catch(console.error);
  }, [communityId, user?.uid]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Próximos Eventos</h2>
        <Button variant="outline" size="sm" onClick={() => toast.info('Criação de eventos pela comunidade será ativada em breve')}>
          <Plus className="w-4 h-4 mr-2" /> Novo Evento
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          Nenhum evento agendado nesta comunidade.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {events.map(ev => (
            <Card key={ev.id} className="p-4 flex flex-col gap-3 hover:bg-secondary/10 cursor-pointer">
              <h3 className="font-bold text-base">{ev.title}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{ev.description}</p>
              {ev.location && (
                <div className="text-xs flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" /> {ev.location}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
