import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  Calendar,
  Download,
  MapPin,
  Pencil,
  Repeat,
  MessageSquare,
  Info,
  Building2,
  Users,
  Globe,
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { useMyMembership, useClubEvent, useDownloadEventIcs } from '@/modules/organizations/hooks/useClubs';
import { eventTypeLabel, isPrivateEvent } from '@/modules/organizations/domain/constants';
import { EventFormDialog } from '@/modules/organizations/components/ClubEventsTab';
import EventDatesPanel from '@/modules/organizations/components/EventDatesPanel';
import EventParticipantsPanel from '@/modules/organizations/components/EventParticipantsPanel';
import EventChat from '@/modules/organizations/components/EventChat';
import PageContainer from '@/components/PageContainer';

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Gera URL do Google Calendar para um evento.
 * @param {{ title: string, starts_at: any, ends_at: any, location: string, description: string }} event
 * @returns {string}
 */
function buildGoogleCalendarUrl(event) {
  const fmt = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const pad = (n) => String(n).padStart(2, '0');
    return (
      date.getFullYear() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      'T' +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      '00'
    );
  };
  const start = fmt(event.starts_at);
  let end = fmt(event.ends_at);
  if (!end && event.starts_at) {
    const d = new Date(event.starts_at);
    d.setHours(d.getHours() + 2);
    end = fmt(d);
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title || 'Evento',
    dates: end ? `${start}/${end}` : start,
    details: event.description || '',
    location: event.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Dispara download do conteúdo .ics no browser.
 * @param {{ ics: string, filename: string }} data
 */
function triggerIcsDownload({ ics, filename }) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function EventDetail() {
  const { orgId: clubId, eventId } = useParams();
  const { data: membership } = useMyMembership(clubId);
  const { data: event, isLoading, isError } = useClubEvent(eventId);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState('detalhes');
  const downloadIcs = useDownloadEventIcs();

  // Hooks de classe dos wrappers. Devem ficar ANTES dos early-returns —
  // chamá-los depois violaria as rules-of-hooks do React.
  const loadingClass = useArenaPageClasses('arena-page mx-auto max-w-4xl space-y-6 px-5 py-6 pb-12');
  const errorClass = useArenaPageClasses('arena-page mx-auto max-w-2xl px-5 py-6 pb-12');
  const successClass = useArenaPageClasses('arena-page mx-auto max-w-4xl space-y-6 px-5 py-6 pb-12');

  if (isLoading) {
    return (
      <PageContainer className="space-y-6 pb-12">
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-64 rounded-[2rem]" />
      </PageContainer>
    );
  }

  // O acesso é controlado pelas regras do Firestore: o evento só carrega para
  // quem pode vê-lo (membro de evento público, convidado, criador ou admin).
  // Se não carregou, é porque não existe ou o usuário não tem acesso.
  if (isError || !event) {
    return (
      <PageContainer className="pb-12">
        <EmptyState
          icon={membership ? CalendarDays : Building2}
          title={membership ? 'Evento não encontrado' : 'Evento indisponível'}
          description={
            membership
              ? 'O evento que você procura não existe ou foi removido.'
              : 'Este evento é privado ou foi removido. Você precisa de um convite ou de ser membro da organização para acessá-lo.'
          }
          action={
            <Button asChild>
              <Link to={membership ? `/organizacoes/${clubId}?tab=events` : `/organizacoes/${clubId}`}>
                {membership ? 'Voltar para eventos' : 'Ir para a organização'}
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const isPrivate = isPrivateEvent(event);
  const when = formatDateTime(event.starts_at);

  return (
    <PageContainer className="space-y-6 pb-12">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/organizacoes/${clubId}?tab=events`}><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para eventos</Link>
      </Button>

      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={TYPE_TONE[event.type] || 'success'} className="rounded-full">{eventTypeLabel(event.type)}</Badge>
              <Badge variant="secondary" className="rounded-full bg-white/15 text-white">
                {isPrivate ? <Lock className="mr-1 h-3 w-3" /> : <Globe className="mr-1 h-3 w-3" />}
                {isPrivate ? 'Privado' : 'Público'}
              </Badge>
              {event.recurring && (
                <Badge variant="secondary" className="rounded-full bg-white/15 text-white">
                  <Repeat className="mr-1 h-3 w-3" /> Recorrente
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{event.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-orange-50/85">
              {when && <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {when}</span>}
              {event.location && <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.location}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Google Calendar — client-side URL, sem backend */}
            <a
              href={buildGoogleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15 hover:text-white"
            >
              <Calendar className="h-3.5 w-3.5" />
              Google Calendar
            </a>

            {/* Download .ics — chama Cloud Function */}
            <button
              disabled={downloadIcs.isPending}
              onClick={() =>
                downloadIcs.mutate(
                  { eventId },
                  {
                    onSuccess: (data) => triggerIcsDownload(data),
                    onError: (err) => toast.error('Erro ao gerar .ics: ' + (err?.message || 'tente novamente')),
                  }
                )
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {downloadIcs.isPending ? 'Gerando...' : 'Baixar .ics'}
            </button>

            <Button
              variant="outline"
              size="sm"
              className="shrink-0 border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" /> Editar evento
            </Button>
          </div>
        </div>
        {event.description && (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-sm leading-7 text-orange-50/85">{event.description}</p>
        )}
      </section>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="arena-tab-bar">
          <TabsTrigger value="detalhes" className="arena-tab-pill">
            <Info className="mr-1.5 h-4 w-4" /> Detalhes e datas
          </TabsTrigger>
          <TabsTrigger value="participantes" className="arena-tab-pill"><Users className="mr-1.5 h-4 w-4" /> Participantes</TabsTrigger>
          <TabsTrigger value="conversa" className="arena-tab-pill"><MessageSquare className="mr-1.5 h-4 w-4" /> Conversa</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-12 space-y-6 px-1 sm:mt-14">
          {event.description && (
            <Card className="rounded-xl">
              <CardContent className="p-6 sm:p-7">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Sobre o evento</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.description}</p>
              </div>
            </section>
          )}
          {linkedPets.length > 0 && (
            <Card className="mb-4 rounded-xl">
              <CardContent className="p-4">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Sobre o evento</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.description}</p>
              </CardContent>
            </Card>
          )}
          <EventDatesPanel event={event} clubId={clubId} />
          {/* TASK-343: Certificado de participação */}
          <EventCertificatesPanel event={event} clubId={clubId} />
        </TabsContent>

        <TabsContent value="participantes" className="mt-12 px-1 sm:mt-14">
          <EventParticipantsPanel event={event} clubId={clubId} />
        </TabsContent>

        <TabsContent value="conversa" className="mt-12 px-1 sm:mt-14">
          <EventChat eventId={eventId} />
        </TabsContent>
      </Tabs>

      <EventFormDialog clubId={clubId} event={event} open={editOpen} onClose={() => setEditOpen(false)} />
    </PageContainer>
  );
}
