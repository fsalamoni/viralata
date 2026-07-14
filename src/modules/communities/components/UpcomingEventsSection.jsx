/**
 * @fileoverview UpcomingEventsSection — bloco "Próximos eventos" no /perfil
 * (TASK-164 / Regra A Eixo 1: perfil do usuário final).
 *
 * Lista eventos de comunidades onde o usuário confirmou presença, com
 * link para o detalhe. Filtra eventos com event_date >= hoje.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { Calendar, MapPin, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { db } from '@/core/config/firebase';
import { parseTimestamp } from '@/core/utils/timestamp';

/** Busca próximos eventos das comunidades onde o usuário confirmou presença. */
async function fetchUpcomingEvents(userUid) {
  if (!db || !userUid) return [];
  try {
    // 1) Buscar RSVPs (confirmed) do user
    const rsvpsQ = query(
      collection(db, 'event_rsvps'),
      where('user_uid', '==', userUid),
      where('status', '==', 'confirmed'),
      limit(50),
    );
    const rsvpsSnap = await getDocs(rsvpsQ);
    const rsvps = rsvpsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (rsvps.length === 0) return [];

    // 2) Para cada RSVP, buscar o evento
    const events = [];
    const now = new Date();
    for (const rsvp of rsvps) {
      const eventRef = await getDocs(
        query(collection(db, 'community_events'), where('__name__', '==', rsvp.event_id), limit(1))
      );
      if (eventRef.empty) continue;
      const ev = { id: eventRef.docs[0].id, ...eventRef.docs[0].data() };
      // Filtrar eventos passados
      const eventDate = ev.event_date?.toDate
        ? ev.event_date.toDate()
        : (ev.event_date ? new Date(ev.event_date) : null);
      if (eventDate && eventDate < now) continue;
      events.push({ ...ev, community_id: rsvp.community_id });
    }
    // Ordenar por data
    events.sort((a, b) => {
      const da = a.event_date?.toMillis ? a.event_date.toMillis() : new Date(a.event_date).getTime();
      const db_ = b.event_date?.toMillis ? b.event_date.toMillis() : new Date(b.event_date).getTime();
      return da - db_;
    });
    return events.slice(0, 6);
  } catch (err) {
    return [];
  }
}

function formatDate(value) {
  if (!value) return '';
  const d = value?.toDate ? parseTimestamp(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function UpcomingEventsSection({ userUid }) {
  const { data: events = [], isLoading, isError } = useQuery({
    queryKey: ['upcoming-events', userUid],
    queryFn: () => fetchUpcomingEvents(userUid),
    enabled: Boolean(userUid),
    staleTime: 60_000,
  });

  return (
    <Card id="proximos-eventos" className="rounded-[24px] p-6 lg:p-7">
      <CardHeader className="p-0 pb-1">
        <CardTitle className="flex items-center gap-2 text-base font-bold">
          <Calendar className="w-[19px] h-[19px] text-accent" /> Próximos eventos
        </CardTitle>
        <CardDescription className="text-[12.5px]">
          Eventos de comunidades onde você confirmou presença.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full rounded-lg" />
            <Skeleton className="h-14 w-full rounded-lg" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar os eventos.
          </p>
        )}
        {!isLoading && !isError && events.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Você não tem eventos próximos. Explore{' '}
            <Link to="/comunidade" className="underline text-primary">comunidades</Link>{' '}
            e participe para vê-los aqui.
          </p>
        )}
        {!isLoading && !isError && events.length > 0 && (
          <ul className="space-y-2" role="list">
            {events.map((ev) => (
              <li
                key={ev.id}
                className="rounded-lg border border-border p-3 hover:bg-secondary/30 transition"
              >
                <div className="flex flex-wrap items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {ev.title || 'Evento'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(ev.event_date)}
                      </span>
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="shrink-0"
                    aria-label={`Ver detalhes de ${ev.title || 'evento'}`}
                  >
                    <Link to={ev.community_id ? `/comunidades/${ev.community_id}#evento-${ev.id}` : '#'}>
                      Ver
                      <ChevronRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
                {ev.type && (
                  <Badge variant="secondary" className="mt-2 text-[10px]">
                    {ev.type}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default UpcomingEventsSection;
