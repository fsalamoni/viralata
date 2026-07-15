/**
 * @fileoverview Componente: FostersList (Fase 7).
 *
 * Lista de placements de lar temporário com filtros, badges, ações
 * contextuais conforme o status.
 *
 * Feature flag: `shelter_foster` (default OFF).
 */

import { confirmDialog } from '@/components/ui/confirm-provider';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  FOSTER_STATUS,
  isFosterNearEnd,
  isFosterOverdue,
  fosterDurationDays,
} from '@/modules/shelter/domain/operational/foster';
import {
  useFosters,
  useAcceptFoster,
  useExtendFoster,
  useEndFoster,
  useCancelFoster,
} from '@/modules/shelter/hooks/useFosters';
import SingleAcceptanceDialog from '@/modules/shelter/components/legal/SingleAcceptanceDialog';
import FosterActionDialog from '@/modules/shelter/components/FosterActionDialog';
import {
  FOSTER_TERMS_TEXT,
  FOSTER_TERMS_VERSION,
} from '@/modules/shelter/domain/legal/fosterTerms';
import { useClub, useMyMembership } from '@/modules/organizations/hooks/useClubs';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { canManageClubTeam } from '@/modules/organizations/domain/permissions';

const STATUS_LABELS = {
  pending: 'Aguardando aceite',
  active: 'Ativo',
  extended: 'Prorrogado',
  ended: 'Finalizado',
  cancelled: 'Cancelado',
  interrupted: 'Interrompido',
};
const STATUS_TONES = {
  pending: 'bg-amber-100 text-amber-900',
  active: 'bg-green-100 text-green-900',
  extended: 'bg-blue-100 text-blue-900',
  ended: 'bg-zinc-100 text-zinc-700',
  cancelled: 'bg-zinc-100 text-zinc-700',
  interrupted: 'bg-red-100 text-red-900',
};

export function FostersList({ shelterClubId, actor, canAbriho = false, isFoster = false }) {
  const [statusFilter, setStatusFilter] = useState(null);
  const [acceptingFosterId, setAcceptingFosterId] = useState(null);
const [actionContext, setActionContext] = useState(null); // { action, fosterId, currentEndDate? }
  const { data: fosterList = [], isLoading } = useFosters(shelterClubId, {
    status: statusFilter,
  });
  const acceptMutation = useAcceptFoster(shelterClubId);
  const extendMutation = useExtendFoster(shelterClubId);
  const endMutation = useEndFoster(shelterClubId);
  const cancelMutation = useCancelFoster(shelterClubId);
  const { toast } = useToast();

  // TASK-280: permission gate — replaces boolean canAbriho prop.
  const { data: club } = useClub(shelterClubId);
  const { data: membership } = useMyMembership(shelterClubId);
  const { user } = useAuth();
  const uid = user?.uid;
  const canManageTeam = canAbriho === undefined
    ? canManageClubTeam(club, membership, uid)
    : Boolean(canAbriho);

  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando placements…</p>;

  // Abre o modal de aceite do Termo de Lar Temporário (substitui o
  // antigo window.prompt). Garante conformidade com a Lei 14.063/2020
  // (assinatura eletrônica) + LGPD art. 37 (registro de operações).
  const handleAcceptClick = (fosterId) => {
    setAcceptingFosterId(fosterId);
  };

  const handleAcceptConfirm = async ({ signature, documentHash, documentVersion }) => {
    if (!acceptingFosterId) return;
    try {
      await acceptMutation.mutateAsync({
        fosterId: acceptingFosterId,
        acceptance: {
          terms_version: documentVersion,
          signature_text: signature,
          document_hash: documentHash,
        },
        actor,
      });
      toast({ title: '✓ Placement aceito. Termo de Lar Temporário registrado.' });
      setAcceptingFosterId(null);
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
      throw err; // re-throw para o modal NAO fechar
    }
  };

  const handleExtend = async (fosterId, currentEndDate) => {
    setActionContext({ action: 'extend', fosterId, currentEndDate });
  };

  const handleEnd = async (fosterId) => {
    setActionContext({ action: 'end', fosterId });
  };

  const handleCancel = async (fosterId) => {
    setActionContext({ action: 'cancel', fosterId });
  };

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Lares Temporários</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {fosterList.length} placement(s) {statusFilter ? `com status ${STATUS_LABELS[statusFilter]}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            <Button
              size="sm" variant={statusFilter === null ? 'default' : 'outline'}
              onClick={() => setStatusFilter(null)}
            >
              Todos
            </Button>
            {FOSTER_STATUS.map((s) => (
              <Button
                key={s} size="sm"
                variant={statusFilter === s ? 'default' : 'outline'}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_LABELS[s]}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {fosterList.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhum placement {statusFilter ? `com status ${STATUS_LABELS[statusFilter]}` : 'ainda'}.
          </p>
        ) : (
          <ol className="space-y-3">
            {fosterList.map((f) => {
              const nearEnd = (f.status === 'active' || f.status === 'extended') &&
                isFosterNearEnd(f.end_date);
              const overdue = (f.status === 'active' || f.status === 'extended') &&
                isFosterOverdue(f.end_date);
              return (
                <li key={f.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={STATUS_TONES[f.status] || ''}>
                          {STATUS_LABELS[f.status] || f.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          pet: <code className="text-xs">{f.pet_id?.slice(0, 8)}…</code>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          LT: <code className="text-xs">{f.foster_uid?.slice(0, 8)}…</code>
                        </span>
                        {nearEnd && <Badge variant="outline" className="text-amber-700">⚠ Perto do fim</Badge>}
                        {overdue && <Badge variant="outline" className="text-red-700">🚨 Vencido</Badge>}
                      </div>
                      <p className="text-sm text-foreground">
                        <strong>{f.foster_profile_snapshot?.full_name}</strong>
                        {f.foster_profile_snapshot?.environment &&
                          ` • ${f.foster_profile_snapshot.environment.replace(/_/g, ' ')}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Início: {f.start_date?.slice(0, 10)}
                        {' '}→{' '}
                        Fim: {f.end_date?.slice(0, 10)}
                        {f.original_end_date && ` (era ${f.original_end_date.slice(0, 10)})`}
                        {' '}(
                        {fosterDurationDays(f.start_date, f.end_date)} dias)
                      </p>
                      {f.foster_profile_snapshot?.terms_accepted_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ✓ Termo aceito em {new Date(f.foster_profile_snapshot.terms_accepted_at).toLocaleString('pt-BR')}
                          {' '}(v{f.foster_profile_snapshot.terms_version})
                        </p>
                      )}
                      {f.foster_rating && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Avaliação do LT: {'⭐'.repeat(f.foster_rating)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {f.status === 'pending' && isFoster && (
                        <Button size="sm" onClick={() => handleAcceptClick(f.id)}>
                          Aceitar e assinar termo
                        </Button>
                      )}
                      {(f.status === 'active' || f.status === 'extended') && canManageTeam && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleExtend(f.id, f.end_date)}>
                            Prorrogar
                          </Button>
                          <Button size="sm" onClick={() => handleEnd(f.id)}>
                            Finalizar
                          </Button>
                        </>
                      )}
                      {f.status === 'pending' && (canManageTeam || isFoster) && (
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(f.id)}>
                          Cancelar
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>

      {/* Modal do Termo de Lar Temporário — substitui o window.prompt.
          Atende Guia de Implementação Legal v2 §4.2 e Lei 14.063/2020. */}
      <FosterActionDialog
        open={!!actionContext}
        onOpenChange={(open) => { if (!open) setActionContext(null); }}
        action={actionContext?.action}
        fosterId={actionContext?.fosterId}
        currentEndDate={actionContext?.currentEndDate}
        submitting={
          actionContext?.action === 'extend' ? extendMutation.isPending :
          actionContext?.action === 'end' ? endMutation.isPending :
          actionContext?.action === 'cancel' ? cancelMutation.isPending : false
        }
        onSubmit={async (result) => {
          if (!result) return;
          if (actionContext.action === 'extend') {
            try {
              await extendMutation.mutateAsync({
                fosterId: actionContext.fosterId,
                extension: { new_end_date: result.new_end_date, reason: result.reason },
                actor,
              });
              toast({ title: 'Prazo prorrogado.' });
            } catch (err) {
              toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
            }
          } else if (actionContext.action === 'end') {
            try {
              await endMutation.mutateAsync({
                fosterId: actionContext.fosterId,
                endData: { reason: result.reason, pet_returned_healthy: result.pet_returned_healthy },
                actor,
              });
              toast({ title: 'Placement finalizado.' });
            } catch (err) {
              toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
            }
          } else if (actionContext.action === 'cancel') {
            try {
              await cancelMutation.mutateAsync({
                fosterId: actionContext.fosterId,
                reason: result.reason,
                actor,
              });
              toast({ title: 'Placement cancelado.' });
            } catch (err) {
              toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
            }
          }
        }}
      />

      <SingleAcceptanceDialog
        open={!!acceptingFosterId}
        onOpenChange={(open) => { if (!open) setAcceptingFosterId(null); }}
        title="Termo de Responsabilidade de Lar Temporário (LT)"
        description="Antes de iniciar o acolhimento, leia integralmente o termo. Sua assinatura eletrônica será registrada no audit_log com hash do documento, IP, data e versão."
        documentText={FOSTER_TERMS_TEXT}
        documentVersion={FOSTER_TERMS_VERSION}
        prefillSignature={actor?.displayName || ''}
        acceptButtonLabel="Aceitar e iniciar acolhimento"
        onAccept={handleAcceptConfirm}
      />
  </>
  );
}
