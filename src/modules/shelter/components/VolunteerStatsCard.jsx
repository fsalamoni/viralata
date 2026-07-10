/**
 * @fileoverview Componente: VolunteerStatsCard (Fase 13).
 *
 * Card de estatísticas agregadas de um voluntário (horas totais,
 * # participações, # transportes ida/volta, breakdown por role).
 *
 * Aceita `participations` como prop OU `volunteerUid` + lista de
 * `shelterClubIds` para carregar via hook.
 *
 * Feature flag: `shelter_volunteers` (default OFF).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  VOLUNTEER_ROLE_LABELS,
  summarizeVolunteerStats,
} from '@/modules/shelter/domain/operational/volunteer';
import { useUserParticipations } from '@/modules/shelter/hooks/useVolunteers';

export function VolunteerStatsCard({ volunteerUid, volunteerName, shelterClubIds, participations }) {
  // Modo 1: passamos participations prontas
  // Modo 2: hook busca via getUserParticipations
  const hookEnabled = !participations && Boolean(volunteerUid) &&
    Array.isArray(shelterClubIds) && shelterClubIds.length > 0;
  const { data: fetchedParticipations = [], isLoading } = useUserParticipations(
    volunteerUid,
    shelterClubIds || [],
  );

  const list = participations || fetchedParticipations;
  const stats = summarizeVolunteerStats(list);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Estatísticas {volunteerName && <>· {volunteerName}</>}
        </CardTitle>
        {hookEnabled && isLoading && (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded border border-border p-3 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.hoursTotal.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground">horas totais</div>
          </div>
          <div className="rounded border border-border p-3 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.participationsCount}
            </div>
            <div className="text-xs text-muted-foreground">participações</div>
          </div>
          <div className="rounded border border-border p-3 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.transportOutbound}
            </div>
            <div className="text-xs text-muted-foreground">transportes (ida)</div>
          </div>
          <div className="rounded border border-border p-3 text-center">
            <div className="text-2xl font-semibold text-foreground">
              {stats.transportReturn}
            </div>
            <div className="text-xs text-muted-foreground">transportes (volta)</div>
          </div>
        </div>

        {Object.keys(stats.byRole).length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs text-muted-foreground">Por papel:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(stats.byRole).map(([role, count]) => (
                <Badge key={role} variant="outline" className="text-xs">
                  {VOLUNTEER_ROLE_LABELS[role] || role}: {count}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {stats.participationsCount === 0 && !isLoading && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma participação registrada ainda.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
