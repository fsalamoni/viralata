import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Info,
  Users,
  Globe,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyCommunityMembership, useCommunityEvent } from '@/modules/communities/hooks/useCommunities';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import CommunityEventParticipantsPanel from '../components/CommunityEventParticipantsPanel';

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CommunityEventDetail() {
  const { communityId, eventId } = useParams();
  const { data: membership } = useMyCommunityMembership(communityId);
  const { data: event, isLoading, isError } = useCommunityEvent(communityId, eventId);
  const [tab, setTab] = useState('detalhes');

  const loadingClass = useArenaPageClasses('arena-page mx-auto max-w-4xl space-y-6 px-5 py-6 pb-12');
  const errorClass = useArenaPageClasses('arena-page mx-auto max-w-2xl px-5 py-6 pb-12');
  const successClass = useArenaPageClasses('arena-page mx-auto max-w-4xl space-y-6 px-5 py-6 pb-12');

  if (isLoading) {
    return (
      <div className={loadingClass}>
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className={errorClass}>
        <EmptyState
          icon={CalendarDays}
          title="Evento não encontrado"
          description={
            membership
              ? 'O evento que você procura não existe ou foi removido.'
              : 'Você precisa participar desta comunidade para acessar este evento.'
          }
          action={
            <Button asChild>
              <Link to={membership ? `/comunidade/${communityId}?tab=eventos` : '/comunidade'}>
                {membership ? 'Voltar para eventos' : 'Ver comunidades'}
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isPrivate = event.visibility === 'private';
  const when = formatDateTime(event.starts_at);

  return (
    <div className={successClass}>
      <Button asChild variant="ghost" size="sm">
        <Link to={`/comunidade/${communityId}?tab=eventos`}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para eventos
        </Link>
      </Button>

      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="rounded-full">
                Evento
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-full bg-white/15 text-white"
              >
                {isPrivate ? (
                  <Lock className="mr-1 h-3 w-3" />
                ) : (
                  <Globe className="mr-1 h-3 w-3" />
                )}
                {isPrivate ? 'Privado' : 'Público'}
              </Badge>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              {event.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-orange-50/85">
              {when && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-4 w-4" /> {when}
                </span>
              )}
              {event.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {event.location}
                </span>
              )}
            </div>
          </div>
        </div>
        {event.description && (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-orange-50/85">
            {event.description}
          </p>
        )}
      </section>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="arena-tab-bar">
          <TabsTrigger value="detalhes" className="arena-tab-pill">
            <Info className="mr-1.5 h-4 w-4" /> Detalhes
          </TabsTrigger>
          <TabsTrigger value="participantes" className="arena-tab-pill">
            <Users className="mr-1.5 h-4 w-4" /> Participantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-12 px-1 sm:mt-14">
          {event.description && (
            <section className="arena-section-card mb-4 rounded-xl">
              <div className="arena-section-card-body p-6 sm:p-7">
                <h3 className="mb-1 text-sm font-semibold text-foreground">
                  Sobre o evento
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {event.description}
                </p>
              </div>
            </section>
          )}
          {event.starts_at && (
            <section className="arena-section-card rounded-xl">
              <div className="arena-section-card-body p-6 sm:p-7">
                <h3 className="mb-1 text-sm font-semibold text-foreground">
                  Data e horário
                </h3>
                <p className="text-sm text-muted-foreground">{when}</p>
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="participantes" className="mt-12 px-1 sm:mt-14">
          <CommunityEventParticipantsPanel event={event} communityId={communityId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
