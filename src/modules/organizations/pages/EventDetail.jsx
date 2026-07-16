import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Pencil,
  Repeat,
  MessageSquare,
  Info,
  Building2,
  Users,
  Globe,
  Lock,
  Award,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import {
  useMyMembership,
  useClubEvent,
  useMyEventCertificate,
  useGenerateEventCertificates,
} from '@/modules/organizations/hooks/useClubs';
import { eventTypeLabel, isPrivateEvent } from '@/modules/organizations/domain/constants';
import { EventFormDialog } from '@/modules/organizations/components/ClubEventsTab';
import EventDatesPanel from '@/modules/organizations/components/EventDatesPanel';
import EventParticipantsPanel from '@/modules/organizations/components/EventParticipantsPanel';
import EventChat from '@/modules/organizations/components/EventChat';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Returns true if the membership has admin/owner role. */
function isAdminMember(membership) {
  if (!membership) return false;
  const role = membership.role;
  return role === 'admin' || role === 'owner';
}

/** CertificatePanel — shown in the detalhes tab for participants who have a certificate. */
function CertificatePanel({ eventId, event }) {
  const { data: cert, isLoading } = useMyEventCertificate(eventId);

  if (isLoading) return null;
  if (!cert) return null;

  return (
    <Card className="mb-4 rounded-xl border-orange-200 bg-orange-50/60 dark:bg-orange-950/20">
      <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
            <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Certificado de Participação</p>
            <p className="text-xs text-muted-foreground">
              Gerado em {cert.generated_at?.toDate?.()
                ? cert.generated_at.toDate().toLocaleDateString('pt-BR')
                : cert.generated_at
                  ? new Date(cert.generated_at).toLocaleDateString('pt-BR')
                  : 'recentemente'}
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white"
        >
          <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer" download>
            <Download className="mr-1.5 h-4 w-4" /> Baixar certificado
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function EventDetail() {
  const { orgId: clubId, eventId } = useParams();
  const { data: membership } = useMyMembership(clubId);
  const { data: event, isLoading, isError } = useClubEvent(eventId);
  const [editOpen, setEditOpen] = useState(false);
  const [tab, setTab] = useState('detalhes');

  const generateCerts = useGenerateEventCertificates();

  const isAdmin = isAdminMember(membership);

  // Hooks de classe dos wrappers. Devem ficar ANTES dos early-returns —
  // chamá-los depois violaria as rules-of-hooks do React.
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

  // O acesso é controlado pelas regras do Firestore: o evento só carrega para
  // quem pode vê-lo (membro de evento público, convidado, criador ou admin).
  // Se não carregou, é porque não existe ou o usuário não tem acesso.
  if (isError || !event) {
    return (
      <div className={errorClass}>
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
      </div>
    );
  }

  const isPrivate = isPrivateEvent(event);
  const when = formatDateTime(event.starts_at);

  function handleGenerateCertificates() {
    generateCerts.mutate(eventId, {
      onSuccess: (data) => {
        const count = data?.generated ?? 0;
        if (count > 0) {
          toast.success(`${count} certificado(s) gerado(s) com sucesso!`);
        } else {
          toast.info(data?.message || 'Nenhum certificado gerado.');
        }
      },
      onError: (err) => {
        toast.error('Erro ao gerar certificados: ' + (err?.message || 'tente novamente.'));
      },
    });
  }

  return (
    <div className={successClass}>
      <Button asChild variant="ghost" size="sm">
        <Link to={`/comunidade/${clubId}?tab=events`}><ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar para eventos</Link>
      </Button>

      <section className="arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success" className="rounded-full">{eventTypeLabel(event.type)}</Badge>
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
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" /> Editar evento
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="border-orange-300/40 bg-orange-500/20 text-orange-200 hover:bg-orange-500/30 hover:text-orange-100"
                onClick={handleGenerateCertificates}
                disabled={generateCerts.isPending}
              >
                <Award className="mr-1.5 h-4 w-4" />
                {generateCerts.isPending ? 'Gerando…' : 'Gerar certificados'}
              </Button>
            )}
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

        <TabsContent value="detalhes" className="mt-12 px-1 sm:mt-14">
          {/* Participant certificate (if exists) */}
          <CertificatePanel eventId={eventId} event={event} />

          {event.description && (
            <Card className="mb-4 rounded-xl">
              <CardContent className="p-6 sm:p-7">
                <h3 className="mb-1 text-sm font-semibold text-foreground">Sobre o evento</h3>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{event.description}</p>
              </CardContent>
            </Card>
          )}
          <EventDatesPanel event={event} clubId={clubId} />
        </TabsContent>

        <TabsContent value="participantes" className="mt-12 px-1 sm:mt-14">
          <EventParticipantsPanel event={event} clubId={clubId} />
        </TabsContent>

        <TabsContent value="conversa" className="mt-12 px-1 sm:mt-14">
          <EventChat eventId={eventId} />
        </TabsContent>
      </Tabs>

      <EventFormDialog clubId={clubId} event={event} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
