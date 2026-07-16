/**
 * @fileoverview Componente: ParticipationsList (Fase 13).
 *
 * Lista de participations do abrigo, com badges, totais de horas,
 * ações de check-in/out (abrigoo OU self-service do voluntário).
 *
 * Feature flag: `shelter_volunteer_profile_v1` (default OFF, ENFORCED at runtime).
 */

import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  VOLUNTEER_PARTICIPATION_ROLE_LABELS,
  VOLUNTEER_PARTICIPATION_EVENT_TYPE_LABELS,
  isParticipationInProgress,
  isParticipationCompleted,
} from '@/modules/shelter/domain/operational/volunteerProfile';
import {
  useParticipations,
  useCheckInOut,
  useDeleteParticipation,
} from '@/modules/shelter/hooks/useVolunteerParticipations';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { confirmDialog } from '@/components/ui/confirm-provider';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ParticipationsList({
  shelterClubId, actor, canAbriho = false,
  isVolunteer = false, selfVolunteerUid = null,
}) {
  const isV1Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const [filter, setFilter] = useState({ volunteerUid: selfVolunteerUid || null });
  const { data: participations = [], isLoading, isError, refetch } = useParticipations(shelterClubId, filter);
  const checkMutation = useCheckInOut(shelterClubId, null);
  const deleteMutation = useDeleteParticipation(shelterClubId);
  const { toast } = useToast();

  if (!isV1Enabled) return null;
  if (!shelterClubId) return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  if (isLoading) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Carregando participações">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar as participações.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>Tentar de novo</button>
      </p>
    );
  }

  const totalHours = participations.reduce((sum, p) => sum + (p.hours_logged || 0), 0);
  const inProgress = participations.filter(isParticipationInProgress).length;
  const completed = participations.filter(isParticipationCompleted).length;

  const handleCheckInOut = async (participationId, action) => {
    try {
      await checkMutation.mutateAsync({ input: { action }, actor });
      toast({ title: action === 'check_in' ? '✓ Check-in feito.' : '✓ Check-out feito.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleDelete = async (participationId) => {
    if (!(await confirmDialog({ title: 'Remover esta participation?' }))) return;
    try {
      await deleteMutation.mutateAsync({ participationId, actor });
      toast({ title: 'Participation removida.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <section className="arena-section-card">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-3 flex-wrap">
          Participations ({participations.length})
          <Badge className="bg-blue-100 text-blue-900">
            {totalHours.toFixed(1)}h total
          </Badge>
          {inProgress > 0 && (
            <Badge className="bg-amber-100 text-amber-900">{inProgress} em andamento</Badge>
          )}
          {completed > 0 && (
            <Badge className="bg-green-100 text-green-900">{completed} concluídas</Badge>
          )}
        </h3>
      </div>
      <div className="arena-section-card-body">
        {participations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma participation registrada.</p>
        ) : (
          <ul className="space-y-3">
            {participations.map((p) => {
              const inProg = isParticipationInProgress(p);
              const done = isParticipationCompleted(p);
              const canSelfCheck = isVolunteer && selfVolunteerUid === p.volunteer_uid;
              const canManage = canAbriho || canSelfCheck;
              return (
                <li key={p.id} className="border rounded p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm">{p.volunteer_name}</strong>
                    <Badge variant="outline">
                      {VOLUNTEER_PARTICIPATION_EVENT_TYPE_LABELS[p.event_type]}
                    </Badge>
                    <Badge variant="outline">
                      {VOLUNTEER_PARTICIPATION_ROLE_LABELS[p.role]}
                    </Badge>
                    {inProg && <Badge className="bg-amber-100 text-amber-900">Em andamento</Badge>}
                    {done && <Badge className="bg-green-100 text-green-900">Concluída ({p.hours_logged}h)</Badge>}
                  </div>
                  <p className="text-sm">{p.event_label}</p>
                  <p className="text-xs text-muted-foreground">
                    📅 {formatDate(p.event_date)}
                    {p.exhibition_id && ` · Vitrine: ${p.exhibition_id}`}
                  </p>
                  {p.check_in && (
                    <p className="text-xs text-muted-foreground">
                      ✓ Check-in: {formatDate(p.check_in)}
                      {p.check_out && ` · Check-out: ${formatDate(p.check_out)}`}
                    </p>
                  )}
                  {p.notes && (
                    <p className="text-xs text-muted-foreground italic">&ldquo;{p.notes}&rdquo;</p>
                  )}
                  {canManage && (
                    <div className="flex gap-1 flex-wrap">
                      {!p.check_in && !p.check_out && (
                        <Button size="sm" onClick={() => handleCheckInOut(p.id, 'check_in')}>
                          Check-in
                        </Button>
                      )}
                      {p.check_in && !p.check_out && (
                        <Button size="sm" onClick={() => handleCheckInOut(p.id, 'check_out')}>
                          Check-out
                        </Button>
                      )}
                      {canAbriho && (
                        <Button size="sm" variant="ghost" className="text-red-700" onClick={() => handleDelete(p.id)}>
                          Excluir
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
