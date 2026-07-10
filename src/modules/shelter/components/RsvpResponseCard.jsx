/**
 * @fileoverview Componente: RsvpResponseCard (Fase 12).
 *
 * Card usado pelo VOLUNTÁRIO para responder um convite de RSVP.
 * Mostra os dados do convite (exhibition, abrigo, observações) e
 * botões grandes para yes / no / maybe. Atualiza status via
 * respondToInvite (service) — funciona com Firestore rules que
 * permitem o próprio voluntário responder.
 *
 * Feature flag: `shelter_exhibition_rsvps` (default OFF).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 12 (RSVP / Escalas)
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  RSVP_STATUS,
  RSVP_STATUS_LABELS,
  RSVP_STATUS_COLORS,
} from '@/modules/shelter/domain/operational/exhibitionRsvp';
import { useRespondToInvite } from '@/modules/shelter/hooks/useExhibitionRsvps';

const STATUS_BUTTON_VARIANT = {
  yes: 'default',
  no: 'destructive',
  maybe: 'outline',
};

const STATUS_EMOJI = {
  yes: '✅',
  no: '❌',
  maybe: '🤔',
};

export function RsvpResponseCard({ invite, currentUserUid, actor }) {
  const [responseNotes, setResponseNotes] = useState(invite.response_notes || '');
  const respondMutation = useRespondToInvite(invite.shelter_club_id, invite.exhibition_id);
  const { toast } = useToast();

  if (!invite?.id) {
    return <p className="text-sm text-muted-foreground">Convite inválido.</p>;
  }

  // Segurança client-side: só o próprio voluntário vê este card
  if (currentUserUid && invite.volunteer_uid && invite.volunteer_uid !== currentUserUid) {
    return null;
  }

  const handleRespond = async (status) => {
    try {
      const r = await respondMutation.mutateAsync({
        inviteId: invite.id,
        response: { status, response_notes: responseNotes || undefined },
        actor,
      });
      if (r.noop) {
        toast({ title: `Você já tinha respondido ${RSVP_STATUS_LABELS[status]}.` });
      } else {
        toast({ title: `Resposta registrada: ${RSVP_STATUS_LABELS[status]}.` });
      }
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Convocação para vitrine</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Você foi convocado(a) para participar.
            </p>
          </div>
          <Badge className={RSVP_STATUS_COLORS[invite.status] || ''}>
            {RSVP_STATUS_LABELS[invite.status] || invite.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {invite.notes && (
          <div className="rounded-md border border-border bg-zinc-50 p-3">
            <p className="text-xs font-medium text-foreground mb-1">📝 Observações do abrigo:</p>
            <p className="text-sm text-foreground">{invite.notes}</p>
          </div>
        )}

        {invite.availability?.from && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Disponibilidade sugerida:</span>{' '}
            {new Date(invite.availability.from).toLocaleString('pt-BR')}
            {invite.availability.to && ` até ${new Date(invite.availability.to).toLocaleString('pt-BR')}`}
          </div>
        )}

        {/* Notas opcionais do voluntário */}
        <div>
          <label className="text-xs font-medium text-foreground block mb-1">
            Mensagem (opcional)
          </label>
          <Textarea
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder="Ex.: Posso chegar 30min mais cedo"
            maxLength={2000}
            rows={2}
          />
        </div>

        {/* Botões de resposta */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {RSVP_STATUS.filter((s) => s !== 'pending').map((s) => (
            <Button
              key={s}
              variant={STATUS_BUTTON_VARIANT[s] || 'outline'}
              onClick={() => handleRespond(s)}
              disabled={respondMutation.isPending}
              className="w-full"
            >
              <span className="mr-2">{STATUS_EMOJI[s]}</span>
              {RSVP_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>

        {invite.responded_at && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Última resposta: {new Date(invite.responded_at).toLocaleString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
