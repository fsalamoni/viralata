import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Trash2, UserPlus, Users, Globe, Lock, Send, Award, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useEventInvites,
  useInviteToEvent,
  useSetEventResponse,
  useRemoveEventInvite,
  useUpdateEvent,
  useClubMembers,
  useGenerateEventCertificate,
  useMyEventCertificate,
} from '@/modules/organizations/hooks/useClubs';
import {
  INVITE_STATUS,
  INVITE_SOURCE,
  EVENT_VISIBILITY,
  isPrivateEvent,
} from '@/modules/organizations/domain/constants';

export default function EventParticipantsPanel({ event, clubId }) {
  const { user } = useAuth();
  const { data: invites = [], isLoading } = useEventInvites(event.id);
  const setResponse = useSetEventResponse(event);
  const removeInvite = useRemoveEventInvite(event.id);
  const updateEvent = useUpdateEvent(event.id);
  const [inviteOpen, setInviteOpen] = useState(false);

  const isPrivate = isPrivateEvent(event);
  const isManager = user?.uid === event.created_by;
  const myInvite = invites.find((i) => i.user_id === user?.uid);
  const myStatus = myInvite?.status;

  const amParticipant = !!myInvite && myStatus !== INVITE_STATUS.INVITED;
  const amInvited = myStatus === INVITE_STATUS.INVITED;

  const handleJoin = async () => {
    try {
      await setResponse.mutateAsync(INVITE_STATUS.GOING);
      toast.success('Você agora participa deste evento.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível participar.');
    }
  };

  const handleLeave = async () => {
    try {
      await removeInvite.mutateAsync(user.uid);
      toast.success('Você saiu do evento.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível sair.');
    }
  };

  const handleRemove = async (userId) => {
    try {
      await removeInvite.mutateAsync(userId);
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover.');
    }
  };

  const handleVisibility = async (visibility) => {
    try {
      await updateEvent.mutateAsync({ visibility });
      toast.success(visibility === EVENT_VISIBILITY.PRIVATE ? 'Evento agora é privado.' : 'Evento agora é público.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível alterar a visibilidade.');
    }
  };

  const counts = {
    participants: invites.filter((i) => i.status !== INVITE_STATUS.INVITED).length,
    invited: invites.filter((i) => i.status === INVITE_STATUS.INVITED).length,
  };

  return (
    <div className="space-y-4">
      {/* Visibilidade */}
      <Card className="rounded-xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2">
            {isPrivate ? <Lock className="h-5 w-5 text-highlight-foreground" /> : <Globe className="h-5 w-5 text-primary" />}
            <div>
              <h3 className="text-sm font-semibold text-foreground">{isPrivate ? 'Evento privado' : 'Evento público'}</h3>
              <p className="text-xs text-muted-foreground">
                {isPrivate
                  ? 'Visível apenas para participantes e convidados.'
                  : 'Visível para todos os membros da organização.'}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={!isPrivate ? 'default' : 'outline'}
              onClick={() => handleVisibility(EVENT_VISIBILITY.PUBLIC)}
              disabled={updateEvent.isPending || !isPrivate}
            >
              <Globe className="mr-1.5 h-4 w-4" /> Público
            </Button>
            <Button
              size="sm"
              variant={isPrivate ? 'default' : 'outline'}
              onClick={() => handleVisibility(EVENT_VISIBILITY.PRIVATE)}
              disabled={updateEvent.isPending || isPrivate}
            >
              <Lock className="mr-1.5 h-4 w-4" /> Privado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Minha participação no evento (a confirmação por data fica em cada data) */}
      <Card className="rounded-xl">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {amParticipant ? 'Você participa deste evento' : amInvited ? 'Você foi convidado' : 'Participe deste evento'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Confirme sua presença em cada data na aba “Detalhes e datas”.
            </p>
          </div>
          {amParticipant ? (
            <Button size="sm" variant="outline" onClick={handleLeave} disabled={removeInvite.isPending || isManager}>
              Sair do evento
            </Button>
          ) : (
            <Button size="sm" onClick={handleJoin} disabled={setResponse.isPending}>
              {amInvited ? 'Aceitar convite' : 'Participar'}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* TASK-343: Admin — gerar certificados em lote */}
      {isManager && (
        <AdminCertsSection event={event} invites={invites} />
      )}

      {/* Participantes / convidados */}
      <Card className="rounded-xl">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold text-foreground">Participantes do evento</h3>
            </div>
            <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Convidar pessoas
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="success" className="rounded-full">{counts.participants} participante(s)</Badge>
            <Badge variant="secondary" className="rounded-full">{counts.invited} convite(s) pendente(s)</Badge>
          </div>

          {isLoading ? (
            <Skeleton className="h-20 rounded-lg" />
          ) : invites.length === 0 ? (
            <EmptyState icon={Users} title="Sem participantes ainda" description="Convide os membros da organização para integrarem o evento." />
          ) : (
            <div className="divide-y divide-border">
              {invites.map((inv) => {
                const canRemove = isManager || inv.user_id === user?.uid;
                return (
                  <div key={inv.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <UserAvatar name={inv.user_name} photoUrl={inv.user_photo} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {inv.user_name}
                          {inv.user_id === event.created_by && <span className="ml-1 text-xs text-primary">(organizador)</span>}
                        </div>
                        {inv.source === INVITE_SOURCE.PLATFORM && (
                          <div className="text-[11px] text-muted-foreground/80">Convidado da plataforma</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inv.status === INVITE_STATUS.INVITED ? 'secondary' : 'success'} className="rounded-full">
                        {inv.status === INVITE_STATUS.INVITED ? 'Convidado' : 'Participante'}
                      </Badge>
                      {canRemove && inv.user_id !== event.created_by && (
                        <button onClick={() => handleRemove(inv.user_id)} className="text-muted-foreground/80 transition-colors hover:text-destructive" title="Remover">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <InviteDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        event={event}
        clubId={clubId}
        invites={invites}
      />
    </div>
  );
}

function InviteDialog({ open, onClose, event, clubId, invites }) {
  const invite = useInviteToEvent(event);
  const { data: members = [] } = useClubMembers(clubId);
  const [search, setSearch] = useState('');

  const invitedIds = useMemo(() => new Set(invites.map((i) => i.user_id)), [invites]);

  const clubPool = useMemo(() => {
    const map = new Map();
    members.forEach((m) => {
      if (!m.user_id || invitedIds.has(m.user_id) || map.has(m.user_id)) return;
      map.set(m.user_id, { user_id: m.user_id, user_name: m.user_name || 'Membro', user_photo: m.photo_url || '', source: INVITE_SOURCE.CLUB });
    });
    return Array.from(map.values()).sort((a, b) => a.user_name.localeCompare(b.user_name));
  }, [members, invitedIds]);

  const q = search.trim().toLowerCase();
  const f = (p) => !q || p.user_name.toLowerCase().includes(q);

  const handleInvite = async (target) => {
    try {
      await invite.mutateAsync(target);
      toast.success(`Convite enviado para ${target.user_name}.`);
    } catch (err) {
      toast.error(err.message || 'Não foi possível convidar.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Convidar pessoas</DialogTitle>
          <DialogDescription>
            Convide membros da organização para o evento — eles recebem uma notificação para responder.
          </DialogDescription>
        </DialogHeader>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome…" />
        <div className="max-h-[50vh] space-y-4 overflow-y-auto">
          <Pool title="Membros da organização" people={clubPool.filter(f)} onInvite={handleInvite} emptyText="Todos os membros já participam." />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Pool({ title, people, onInvite, emptyText }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title} ({people.length})</h4>
      {people.length === 0 ? (
        <p className="text-sm text-muted-foreground/80">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {people.map((p) => (
            <div key={p.user_id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2">
              <div className="flex min-w-0 items-center gap-2">
                <UserAvatar name={p.user_name} photoUrl={p.user_photo} size="sm" />
                <span className="truncate text-sm font-medium text-foreground">{p.user_name}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => onInvite(p)}>
                <Send className="mr-1 h-3.5 w-3.5" /> Convidar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * TASK-343 — Admin section: bulk-generate certificates for going participants.
 * Shown only to the event organizer (isManager).
 */
function AdminCertsSection({ event, invites }) {
  const going = invites.filter((i) => i.status !== INVITE_STATUS.INVITED);
  const { data: certs = {} } = _useCertificates(event.id, going.map((i) => i.user_id));
  const genMutation = useGenerateEventCertificate(event.id);
  const [generatingFor, setGeneratingFor] = useState(null);

  async function handleGenerateFor(inv) {
    setGeneratingFor(inv.user_id);
    try {
      await genMutation.mutateAsync(inv.user_id);
      toast.success(`Certificado gerado para ${inv.user_name}.`);
    } catch (err) {
      toast.error(`Falha para ${inv.user_name}: ${err.message}`);
    } finally {
      setGeneratingFor(null);
    }
  }

  return (
    <Card className="rounded-xl border-orange-200/50">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-orange-600" />
          <h3 className="text-sm font-semibold text-foreground">Certificados de Participação</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Gere o certificado em PDF para cada participante. O arquivo fica disponível
          publicamente para download via link seguro.
        </p>
        {going.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum participante confirmado ainda.</p>
        ) : (
          <div className="divide-y divide-border max-h-48 overflow-y-auto">
            {going.map((inv) => {
              const cert = certs[inv.user_id];
              const isLoading = generatingFor === inv.user_id;
              return (
                <div key={inv.id} className="flex items-center justify-between gap-2 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <UserAvatar name={inv.user_name} photoUrl={inv.user_photo} size="sm" />
                    <span className="truncate text-sm text-foreground">{inv.user_name}</span>
                  </div>
                  <div className="shrink-0">
                    {cert?.downloadUrl ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => window.open(cert.downloadUrl, '_blank', 'noopener,noreferrer')}
                      >
                        <Award className="h-3.5 w-3.5 text-orange-600" />
                        Ver PDF
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={isLoading}
                        onClick={() => handleGenerateFor(inv)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Award className="h-3.5 w-3.5" />
                        )}
                        Gerar
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Lightweight local hook to fetch certificate records for a list of userIds.
 * Returns a map: { [userId]: certificateData }
 */
function _useCertificates(eventId, userIds) {
  const { useState, useEffect } = require('react');
  const { getFirestore } = require('firebase/firestore');
  const { doc, getDoc } = require('firebase/firestore');
  const [certs, setCerts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId || userIds.length === 0) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const db = getFirestore();
      const results = {};
      await Promise.all(
        userIds.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, 'club_events', eventId, 'certificates', uid));
            if (snap.exists) results[uid] = { id: snap.id, ...snap.data() };
          } catch (_) {}
        })
      );
      if (!cancelled) { setCerts(results); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [eventId, JSON.stringify(userIds)]);

  return { data: certs, isLoading: loading };
}
