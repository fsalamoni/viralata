/**
 * @fileoverview AssignmentMatrix — Matriz de atribuições finas por voluntário (TASK-274).
 *
 * Renderiza uma grade (voluntário × capability) com toggles.
 * Cada célula verde indica que o voluntário tem a capability atribuída.
 * Badge mostra "Atribuído até DD/MM" se há ends_at.
 *
 * Feature flag: `shelter_volunteer_profile_v1` (default OFF, enforced at runtime).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § TASK-274
 */

import { useState } from 'react';
import { Loader2, UserCircle, BadgeCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  VOLUNTEER_ASSIGNMENT_CAPABILITIES,
  VOLUNTEER_ASSIGNMENT_CAPABILITY_LABELS,
  VOLUNTEER_ASSIGNMENT_CAPABILITY_TONES,
  isAssignmentActive,
} from '@/modules/shelter/domain/operational/volunteerAssignment';
import {
  useAssignmentsByVolunteer,
  useToggleAssignment,
} from '@/modules/shelter/hooks/useVolunteerAssignment';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

const SCOPE_DEFAULT = 'shelter';

function CapabilityBadge({ capability }) {
  const tone = VOLUNTEER_ASSIGNMENT_CAPABILITY_TONES[capability] ?? 'bg-zinc-100 text-zinc-700';
  const label = VOLUNTEER_ASSIGNMENT_CAPABILITY_LABELS[capability] ?? capability;
  return (
    <Badge className={`${tone} text-xs font-medium whitespace-nowrap`} variant="secondary">
      {label}
    </Badge>
  );
}

function AssignmentCell({ volunteerUid, capability, assignments, onToggle, isLoading }) {
  const assignment = assignments?.find(
    (a) => a.capability === capability && a.scope === SCOPE_DEFAULT
  );
  const active = assignment ? isAssignmentActive(assignment) : false;
  const isExpired = assignment && !isAssignmentActive(assignment);

  function formatDate(dateStr) {
    if (!dateStr) return null;
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }

  return (
    <td className="border px-2 py-2 text-center min-w-[80px]">
      <button
        type="button"
        disabled={isLoading}
        onClick={() => onToggle(volunteerUid, capability)}
        className={[
          'inline-flex flex-col items-center gap-0.5 rounded px-2 py-1 text-xs transition-all',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          active
            ? 'bg-green-100 hover:bg-green-200 cursor-pointer'
            : isExpired
            ? 'bg-amber-50 hover:bg-amber-100 cursor-pointer'
            : 'bg-zinc-50 hover:bg-zinc-100 cursor-pointer',
          isLoading ? 'opacity-50 cursor-wait' : '',
        ].join(' ')}
        aria-pressed={active}
        aria-label={`${active ? 'Remover' : 'Atribuir'} ${VOLUNTEER_ASSIGNMENT_CAPABILITY_LABELS[capability]} para este voluntário`}
      >
        {active ? (
          <>
            <BadgeCheck className="h-4 w-4 text-green-700 mx-auto" aria-hidden="true" />
            {assignment?.ends_at && (
              <span className="text-[10px] text-green-700 font-medium">
                até {formatDate(assignment.ends_at)}
              </span>
            )}
          </>
        ) : (
          <span className="h-4 w-4 mx-auto text-zinc-400 select-none" aria-hidden="true">—</span>
        )}
      </button>
    </td>
  );
}

export function AssignmentMatrix({ shelterClubId, canManage, actor }) {
  const isV1Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const { data: byVolunteer = {}, isLoading, isError, refetch } = useAssignmentsByVolunteer(shelterClubId);
  const toggleMutation = useToggleAssignment(shelterClubId);
  const { toast } = useToast();

  if (!isV1Enabled) return null;
  if (!shelterClubId) return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;

  const volunteers = Object.keys(byVolunteer).sort();

  async function handleToggle(volunteerUid, capability) {
    if (!canManage) {
      toast({ title: 'Sem permissão', description: 'Apenas admins podem gerenciar atribuições.', variant: 'destructive' });
      return;
    }
    try {
      const result = await toggleMutation.mutateAsync({
        volunteerUid,
        capability,
        scope: SCOPE_DEFAULT,
        actor,
      });
      toast({
        title: result.action === 'created' ? 'Capability atribuída' : 'Capability removida',
        description: `${VOLUNTEER_ASSIGNMENT_CAPABILITY_LABELS[capability]} — ${volunteerUid.slice(0, 8)}…`,
      });
    } catch (err) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full rounded" />
        <Skeleton className="h-8 w-full rounded" />
        <Skeleton className="h-8 w-full rounded" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar as atribuições.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Tentar de novo
        </button>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {volunteers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum voluntário com atribuições ainda.
          {canManage ? ' Use os toggles abaixo para atribuir capabilities.' : ''}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm" aria-label="Matriz de atribuições de voluntários">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="border-r px-3 py-2 text-left font-semibold sticky left-0 bg-muted/50 z-10 min-w-[160px]">
                  Voluntário
                </th>
                {VOLUNTEER_ASSIGNMENT_CAPABILITIES.map((cap) => (
                  <th key={cap} className="border-r px-2 py-2 text-center min-w-[90px]">
                    <CapabilityBadge capability={cap} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {volunteers.map((volunteerUid) => (
                <tr key={volunteerUid} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="border-r px-3 py-2 sticky left-0 bg-background z-10">
                    <span className="flex items-center gap-2">
                      <UserCircle className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                      <span className="font-medium text-xs truncate max-w-[140px]" title={volunteerUid}>
                        {volunteerUid.slice(0, 8)}…
                      </span>
                    </span>
                  </td>
                  {VOLUNTEER_ASSIGNMENT_CAPABILITIES.map((cap) => (
                    <AssignmentCell
                      key={cap}
                      volunteerUid={volunteerUid}
                      capability={cap}
                      assignments={byVolunteer[volunteerUid]}
                      onToggle={handleToggle}
                      isLoading={toggleMutation.isPending}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <p className="text-xs text-muted-foreground text-right">
          Clique em uma célula para atribuir ou remover uma capability.
        </p>
      )}
    </div>
  );
}
