/**
 * @fileoverview Componente: FostersList (Fase 7).
 *
 * Lista de placements de lar temporário com filtros, badges, ações
 * contextuais conforme o status.
 *
 * Feature flag: `shelter_foster` (default OFF).
 */

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
  const { data: fosterList = [], isLoading } = useFosters(shelterClubId, {
    status: statusFilter,
  });
  const acceptMutation = useAcceptFoster(shelterClubId);
  const extendMutation = useExtendFoster(shelterClubId);
  const endMutation = useEndFoster(shelterClubId);
  const cancelMutation = useCancelFoster(shelterClubId);
  const { toast } = useToast();

  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando placements…</p>;

  const handleAccept = async (fosterId) => {
    const signature = window.prompt('Digite seu nome completo para assinar:');
    if (!signature || signature.length < 2) return;
    try {
      await acceptMutation.mutateAsync({
        fosterId,
        acceptance: { terms_version: '2026-07-10', signature_text: signature },
        actor,
      });
      toast({ title: '✓ Placement aceito. Termo registrado.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleExtend = async (fosterId, currentEndDate) => {
    const newEnd = window.prompt(
      `Nova data final (YYYY-MM-DD, depois de ${currentEndDate.slice(0, 10)}):`,
    );
    if (!newEnd) return;
    const reason = window.prompt('Motivo da prorrogação:');
    if (!reason || reason.length < 3) return;
    try {
      await extendMutation.mutateAsync({
        fosterId,
        extension: { new_end_date: `${newEnd}T00:00:00.000Z`, reason },
        actor,
      });
      toast({ title: 'Prazo prorrogado.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleEnd = async (fosterId) => {
    const reason = window.prompt('Motivo do término:');
    if (!reason || reason.length < 3) return;
    const healthy = window.confirm('Animal voltou saudável?');
    try {
      await endMutation.mutateAsync({
        fosterId,
        endData: { reason, pet_returned_healthy: healthy },
        actor,
      });
      toast({ title: 'Placement finalizado.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleCancel = async (fosterId) => {
    const reason = window.prompt('Motivo do cancelamento:');
    if (!reason) return;
    try {
      await cancelMutation.mutateAsync({ fosterId, reason, actor });
      toast({ title: 'Placement cancelado.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
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
                        <Button size="sm" onClick={() => handleAccept(f.id)}>
                          Aceitar e assinar termo
                        </Button>
                      )}
                      {(f.status === 'active' || f.status === 'extended') && canAbriho && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleExtend(f.id, f.end_date)}>
                            Prorrogar
                          </Button>
                          <Button size="sm" onClick={() => handleEnd(f.id)}>
                            Finalizar
                          </Button>
                        </>
                      )}
                      {f.status === 'pending' && (canAbriho || isFoster) && (
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
  );
}
