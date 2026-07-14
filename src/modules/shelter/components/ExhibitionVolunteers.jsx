/**
 * @fileoverview ExhibitionVolunteers — lista voluntários escalados
 * para uma vitrine (TASK-208).
 *
 * Mostra:
 * - Foto + nome
 * - Role (cuidador, transporte, etc.)
 * - Status (pending/confirmed/checked_in/completed)
 * - Horário (check-in/out)
 *
 * Rota: usado dentro do ExhibitionDetails (admin) ou PublicExhibitionDetail
 */

import { useState, useEffect } from 'react';
import { Users, Clock, UserCheck, UserX } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { UserAvatar } from '@/components/ui/user-avatar';
import { listParticipations } from '@/modules/shelter/services/volunteerParticipationService';
import {
  VOLUNTEER_PARTICIPATION_ROLE_LABELS,
} from '@/modules/shelter/domain/operational/volunteerProfile';

const STATUS_LABELS = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  checked_in: 'Em ação',
  completed: 'Concluído',
  no_show: 'Não compareceu',
  cancelled: 'Cancelado',
};

const STATUS_TONE = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  checked_in: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  no_show: 'bg-rose-100 text-rose-700 border-rose-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

function formatTime(iso) {
  if (!iso) return null;
  const d = typeof iso === 'string' ? new Date(iso) : iso?.toDate?.() || null;
  if (!d) return null;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function ExhibitionVolunteers({ shelterClubId, exhibitionId, max = 20 }) {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!shelterClubId || !exhibitionId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listParticipations(shelterClubId, { exhibitionId, maxResults: max })
      .then((data) => {
        if (!cancelled) {
          setParticipations(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [shelterClubId, exhibitionId, max]);

  if (!shelterClubId || !exhibitionId) return null;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voluntários escalados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voluntários escalados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="Não foi possível carregar"
            description={error}
          />
        </CardContent>
      </Card>
    );
  }

  if (participations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Voluntários escalados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Users}
            title="Nenhum voluntário escalado ainda"
            description="Conforme voluntários confirmarem presença, eles aparecerão aqui."
          />
        </CardContent>
      </Card>
    );
  }

  const checkedInCount = participations.filter((p) => p.status === 'checked_in').length;
  const completedCount = participations.filter((p) => p.status === 'completed').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Voluntários escalados ({participations.length})
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          {checkedInCount > 0 && (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <UserCheck className="h-3 w-3" /> {checkedInCount} em ação
            </span>
          )}
          {completedCount > 0 && (
            <span className="inline-flex items-center gap-1">
              {completedCount} concluído{completedCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ul
          className="space-y-2"
          aria-label="Lista de voluntários escalados"
        >
          {participations.map((p) => {
            const checkIn = formatTime(p.check_in);
            const checkOut = formatTime(p.check_out);
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 p-2 rounded-md border border-border/40 hover:bg-muted/30"
                data-testid={`volunteer-${p.id}`}
              >
                <UserAvatar
                  photoUrl={p.volunteer_photo}
                  name={p.volunteer_name}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.volunteer_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {VOLUNTEER_PARTICIPATION_ROLE_LABELS[p.role] || p.role}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={STATUS_TONE[p.status] || STATUS_TONE.pending}>
                    {STATUS_LABELS[p.status] || p.status}
                  </Badge>
                  {(checkIn || checkOut) && (
                    <p className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {checkIn || '—'} → {checkOut || '—'}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export default ExhibitionVolunteers;
