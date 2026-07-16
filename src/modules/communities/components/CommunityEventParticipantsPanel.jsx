import React, { useMemo } from 'react';
import { toast } from 'sonner';
import { Users, Check, HelpCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useCommunityEventRsvps,
  useSetCommunityEventRsvp,
  useRemoveCommunityEventRsvp,
} from '@/modules/communities/hooks/useCommunities';
import {
  COMMUNITY_EVENT_RSVP,
  COMMUNITY_EVENT_RSVP_LABELS,
} from '@/modules/communities/domain/constants';

export default function CommunityEventParticipantsPanel({ event, communityId }) {
  const { user } = useAuth();
  const { data: rsvps = [], isLoading } = useCommunityEventRsvps(event.id);
  const setRsvp = useSetCommunityEventRsvp(event.id);
  const removeRsvp = useRemoveCommunityEventRsvp(event.id);

  const myRsvp = useMemo(
    () => rsvps.find((r) => r.user_id === user?.uid),
    [rsvps, user?.uid],
  );

  const going = rsvps.filter((r) => r.status === COMMUNITY_EVENT_RSVP.GOING);
  const maybe = rsvps.filter((r) => r.status === COMMUNITY_EVENT_RSVP.MAYBE);
  const notGoing = rsvps.filter((r) => r.status === COMMUNITY_EVENT_RSVP.NOT_GOING);

  const handleRsvp = async (status) => {
    try {
      await setRsvp.mutateAsync(status);
      toast.success(`RSVP atualizado: ${COMMUNITY_EVENT_RSVP_LABELS[status]}`);
    } catch (err) {
      toast.error(err.message || 'Não foi possível atualizar sua confirmação.');
    }
  };

  const handleRemove = async () => {
    try {
      await removeRsvp.mutateAsync();
      toast.success('Confirmação removida.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover.');
    }
  };

  const isGoing = myRsvp?.status === COMMUNITY_EVENT_RSVP.GOING;
  const isMaybe = myRsvp?.status === COMMUNITY_EVENT_RSVP.MAYBE;
  const isNotGoing = myRsvp?.status === COMMUNITY_EVENT_RSVP.NOT_GOING;

  return (
    <div className="space-y-4">
      {/* Minha RSVP card */}
      <section className="arena-section-card rounded-xl">
        <div className="arena-section-card-body flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {myRsvp
                ? `Você respondeu: ${COMMUNITY_EVENT_RSVP_LABELS[myRsvp.status]}`
                : 'Confirme sua presença'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Sua resposta ajuda o organizador a ter uma noção do público.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={isGoing ? 'default' : 'outline'}
              onClick={() => handleRsvp(COMMUNITY_EVENT_RSVP.GOING)}
              disabled={setRsvp.isPending}
            >
              <Check className="mr-1.5 h-4 w-4" /> Vou
            </Button>
            <Button
              size="sm"
              variant={isMaybe ? 'default' : 'outline'}
              onClick={() => handleRsvp(COMMUNITY_EVENT_RSVP.MAYBE)}
              disabled={setRsvp.isPending}
            >
              <HelpCircle className="mr-1.5 h-4 w-4" /> Talvez
            </Button>
            <Button
              size="sm"
              variant={isNotGoing ? 'default' : 'outline'}
              onClick={() => handleRsvp(COMMUNITY_EVENT_RSVP.NOT_GOING)}
              disabled={setRsvp.isPending}
            >
              <X className="mr-1.5 h-4 w-4" /> Não vou
            </Button>
            {myRsvp && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRemove}
                disabled={removeRsvp.isPending}
              >
                Remover
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Resumo */}
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="success" className="rounded-full">
          <Check className="mr-1 h-3 w-3" />
          {going.length} vão
        </Badge>
        <Badge variant="secondary" className="rounded-full">
          <HelpCircle className="mr-1 h-3 w-3" />
          {maybe.length} talvez
        </Badge>
        <Badge variant="outline" className="rounded-full">
          <X className="mr-1 h-3 w-3" />
          {notGoing.length} não vão
        </Badge>
      </div>

      {/* Lista de participantes */}
      <section className="arena-section-card rounded-xl">
        <div className="arena-section-card-body space-y-4 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Respostas</h3>
          </div>

          {isLoading ? (
            <Skeleton className="h-20 rounded-lg" />
          ) : rsvps.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Sem respostas ainda"
              description="Seja o primeiro a confirmar sua presença!"
            />
          ) : (
            <>
              {going.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Vou ({going.length})
                  </h4>
                  <div className="space-y-1.5">
                    {going.map((r) => (
                      <RsvpRow key={r.id} rsvp={r} event={event} />
                    ))}
                  </div>
                </div>
              )}
              {maybe.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Talvez ({maybe.length})
                  </h4>
                  <div className="space-y-1.5">
                    {maybe.map((r) => (
                      <RsvpRow key={r.id} rsvp={r} event={event} />
                    ))}
                  </div>
                </div>
              )}
              {notGoing.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Não vou ({notGoing.length})
                  </h4>
                  <div className="space-y-1.5">
                    {notGoing.map((r) => (
                      <RsvpRow key={r.id} rsvp={r} event={event} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function RsvpRow({ rsvp, event }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/50 p-2">
      <UserAvatar
        name={rsvp.user_name}
        photoUrl={rsvp.user_photo}
        size="sm"
      />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {rsvp.user_name}
          {event && rsvp.user_id === event.created_by && (
            <span className="ml-1 text-xs text-primary">(organizador)</span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground/80">
          {COMMUNITY_EVENT_RSVP_LABELS[rsvp.status]}
        </div>
      </div>
    </div>
  );
}
