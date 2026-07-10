/**
 * @fileoverview Componente: ApplicationsList (Fase 3).
 *
 * Painel de applications de adoção do abrigo. Filtra por status, mostra
 * badges, permite aprovar/rejeitar/withdraw.
 *
 * Feature flag: `shelter_adoption_workflow` (default OFF).
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  APPLICATION_STATUS_TONES,
  nextStatuses,
  isTerminal,
} from '@/modules/shelter/domain/operational/adoption';
import {
  useApplications,
  useDecideApplication,
  useCancelApplication,
} from '@/modules/shelter/hooks/useAdoptionApplications';

export function ApplicationsList({ shelterClubId, canAdmin = false, actor }) {
  const [statusFilter, setStatusFilter] = useState(null);
  const { data: apps = [], isLoading } = useApplications(shelterClubId, {
    status: statusFilter,
  });
  const decideMutation = useDecideApplication(shelterClubId);
  const cancelMutation = useCancelApplication(shelterClubId);
  const { toast } = useToast();

  const [decisionModal, setDecisionModal] = useState(null);

  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo para ver applications.</p>;
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando applications…</p>;

  const handleDecide = async (appId, toStatus, notes) => {
    try {
      await decideMutation.mutateAsync({
        applicationId: appId,
        decision: { to_status: toStatus, decision_notes: notes },
        actor,
      });
      toast({
        title: toStatus === 'approved' ? '✓ Adoção aprovada'
             : toStatus === 'rejected' ? 'Application rejeitada'
             : `Status atualizado para ${APPLICATION_STATUS_LABELS[toStatus]}`,
      });
      setDecisionModal(null);
    } catch (err) {
      toast({
        title: 'Erro ao decidir',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (appId) => {
    const reason = window.prompt('Motivo do cancelamento?');
    if (reason == null) return;
    try {
      await cancelMutation.mutateAsync({ applicationId: appId, reason, actor });
      toast({ title: 'Application cancelada.' });
    } catch (err) {
      toast({
        title: 'Erro ao cancelar',
        description: String(err?.message || err),
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Applications de Adoção</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {apps.length} application(s)
              {statusFilter ? ` com status ${APPLICATION_STATUS_LABELS[statusFilter]}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm"
              variant={statusFilter === null ? 'default' : 'outline'}
              onClick={() => setStatusFilter(null)}
            >
              Todas
            </Button>
            {APPLICATION_STATUS.filter((s) => !isTerminal(s) || s === 'rejected').map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {APPLICATION_STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {apps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma application {statusFilter ? `com status ${APPLICATION_STATUS_LABELS[statusFilter]}` : 'ainda'}.
          </p>
        ) : (
          <ol className="space-y-3">
            {apps.map((app) => (
              <li
                key={app.id}
                className="rounded-md border border-border p-3"
              >
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge className={APPLICATION_STATUS_TONES[app.status] || ''}>
                        {APPLICATION_STATUS_LABELS[app.status] || app.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        pet: <code className="text-xs">{app.pet_id?.slice(0, 8)}…</code>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        applicant: <code className="text-xs">{app.applicant_uid?.slice(0, 8)}…</code>
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-1">
                      <strong>Motivo:</strong> {app.applicant_form?.reason_to_adopt?.slice(0, 200)}
                      {(app.applicant_form?.reason_to_adopt?.length || 0) > 200 ? '…' : ''}
                    </p>
                    {app.applicant_form?.has_yard !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Quintal: {app.applicant_form.has_yard ? 'sim' : 'não'} •
                        Moradores: {app.applicant_form.household_size || '?'} •
                        Crianças: {app.applicant_form.has_children ? 'sim' : 'não'}
                      </p>
                    )}
                    {app.decision_notes && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        Decisão: {app.decision_notes}
                      </p>
                    )}
                  </div>
                  {canAdmin && !isTerminal(app.status) && (
                    <div className="flex flex-col gap-1">
                      {nextStatuses(app.status).filter((s) => ['under_review', 'approved', 'rejected'].includes(s)).map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={s === 'approved' ? 'default' : s === 'rejected' ? 'destructive' : 'outline'}
                          onClick={() => {
                            if (s === 'approved' || s === 'rejected') {
                              setDecisionModal({ app, toStatus: s });
                            } else {
                              handleDecide(app.id, s, '');
                            }
                          }}
                        >
                          {APPLICATION_STATUS_LABELS[s]}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancel(app.id)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}

        {decisionModal && (
          <DecisionModal
            app={decisionModal.app}
            toStatus={decisionModal.toStatus}
            onSubmit={(notes) => handleDecide(decisionModal.app.id, decisionModal.toStatus, notes)}
            onClose={() => setDecisionModal(null)}
            isSubmitting={decideMutation.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}

function DecisionModal({ app, toStatus, onSubmit, onClose, isSubmitting }) {
  const [notes, setNotes] = useState(app.decision_notes || '');

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-background rounded-lg p-6 max-w-md w-full space-y-4">
        <header>
          <h3 className="text-lg font-semibold">
            {toStatus === 'approved' ? 'Aprovar' : 'Recusar'} application?
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            {toStatus === 'approved'
              ? 'Aprovar cascateia: rejeita outras pendentes do mesmo pet, marca o pet como adotado e registra evento na timeline.'
              : 'Recusa exige um motivo (visível na timeline e notificado ao adotante).'}
          </p>
        </header>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={toStatus === 'rejected' ? 'Motivo da recusa (obrigatório)…' : 'Observações opcionais…'}
          rows={4}
          maxLength={2000}
          required={toStatus === 'rejected'}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Voltar
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(notes)}
            disabled={isSubmitting || (toStatus === 'rejected' && !notes.trim())}
            variant={toStatus === 'rejected' ? 'destructive' : 'default'}
          >
            {isSubmitting ? 'Salvando…' : toStatus === 'approved' ? 'Aprovar' : 'Recusar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
