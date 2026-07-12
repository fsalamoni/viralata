/**
 * @fileoverview Componente: VolunteersRoster (Fase 13).
 *
 * Lista de voluntários do abrigo, com filtros por status, badges de
 * background check, ações (pausar, retomar, bloquear, aprovar BG check).
 *
 * Feature flag: `shelter_volunteer_profile_v1` (default OFF, ENFORCED at runtime).
 */

import { confirmDialog } from '@/components/ui/confirm-provider';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  VOLUNTEER_SHELTER_STATUS,
  VOLUNTEER_BG_CHECK_STATUS,
  canVolunteerParticipate,
} from '@/modules/shelter/domain/operational/volunteerProfile';
import {
  useShelterVolunteers,
  useUpdateShelterVolunteer,
  useLeaveShelter,
  useDeleteShelterVolunteer,
} from '@/modules/shelter/hooks/useVolunteerProfile';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useClub, useMyMembership } from '@/modules/organizations/hooks/useClubs';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  canManageVolunteers,
  canManageVolunteerStatus,
  canManageVolunteerBG,
  canDeleteVolunteer,
} from '@/modules/organizations/domain/permissions';

const SHELTER_STATUS_LABELS = {
  active: 'Ativo', paused: 'Pausado', blocked: 'Bloqueado', left: 'Saiu',
};
const SHELTER_STATUS_TONES = {
  active: 'bg-green-100 text-green-900',
  paused: 'bg-amber-100 text-amber-900',
  blocked: 'bg-red-100 text-red-900',
  left: 'bg-zinc-100 text-zinc-700',
};
const BG_CHECK_LABELS = {
  not_required: 'Não exigido',
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};
const BG_CHECK_TONES = {
  not_required: 'bg-zinc-100 text-zinc-700',
  pending: 'bg-amber-100 text-amber-900',
  approved: 'bg-green-100 text-green-900',
  rejected: 'bg-red-100 text-red-900',
};

export function VolunteersRoster({ shelterClubId, actor, canAbriho }) {
  const isV1Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const [statusFilter, setStatusFilter] = useState(null);
  const { data: volunteers = [], isLoading } = useShelterVolunteers(shelterClubId, { status: statusFilter });
  const updateMutation = useUpdateShelterVolunteer(shelterClubId, null); // sobrescrito por item
  const leaveMutation = useLeaveShelter(shelterClubId);
  const deleteMutation = useDeleteShelterVolunteer(shelterClubId);
  const { toast } = useToast();

  const { data: club } = useClub(shelterClubId);
  const { data: membership } = useMyMembership(shelterClubId);
  const { user } = useAuth();
  const uid = user?.uid;
  const perm = canAbriho === undefined ? canManageVolunteers(club, membership, uid) : Boolean(canAbriho);
  const canManageStatus = canManageVolunteerStatus(club, membership, uid);
  const canManageBG = canManageVolunteerBG(club, membership, uid);
  const canDeleteVol = canDeleteVolunteer(club, membership, uid);

  if (!isV1Enabled) return null;
  if (!shelterClubId) return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando voluntários…</p>;

  const handleBgCheck = async (volunteerUid, newStatus) => {
    try {
      await updateMutation.mutateAsync({
        input: { background_check_status: newStatus },
        actor,
      });
      toast({ title: `Background check → ${BG_CHECK_LABELS[newStatus]}` });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleStatusChange = async (volunteerUid, newStatus) => {
    try {
      await updateMutation.mutateAsync({ input: { status: newStatus }, actor });
      toast({ title: `Status → ${SHELTER_STATUS_LABELS[newStatus]}` });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const handleRemove = async (volunteerUid) => {
    if (!(await confirmDialog({ title: 'Remover este voluntário da rostagem? (hard delete, use com cuidado)' }))) return;
    try {
      await deleteMutation.mutateAsync({ volunteerUid, actor });
      toast({ title: 'Voluntário removido.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Voluntários ({volunteers.length})</CardTitle>
        <div className="flex gap-2 flex-wrap pt-2">
          <Button
            size="sm"
            variant={statusFilter === null ? 'default' : 'outline'}
            onClick={() => setStatusFilter(null)}
          >
            Todos
          </Button>
          {VOLUNTEER_SHELTER_STATUS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)}
            >
              {SHELTER_STATUS_LABELS[s]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {volunteers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum voluntário na rostagem.</p>
        ) : (
          <ul className="space-y-3">
            {volunteers.map((v) => (
              <li key={v.id} className="border rounded p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <strong className="text-sm">{v.volunteer_name}</strong>
                    <Badge className={SHELTER_STATUS_TONES[v.status]}>
                      {SHELTER_STATUS_LABELS[v.status]}
                    </Badge>
                    <Badge className={BG_CHECK_TONES[v.background_check_status]}>
                      BG: {BG_CHECK_LABELS[v.background_check_status]}
                    </Badge>
                    {canVolunteerParticipate(v) ? (
                      <Badge className="bg-blue-100 text-blue-900">Pode participar</Badge>
                    ) : (
                      <Badge className="bg-zinc-100 text-zinc-700">Não pode participar</Badge>
                    )}
                  </div>
                  {v.volunteer_email && (
                    <p className="text-xs text-muted-foreground mt-1">{v.volunteer_email}</p>
                  )}
                  {v.background_check_notes && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📝 {v.background_check_notes}
                    </p>
                  )}
                </div>
                {perm && v.status !== 'left' && (
                  <div className="flex gap-1 flex-wrap">
                    {canManageBG && v.background_check_status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleBgCheck(v.id, 'approved')}>
                          Aprovar BG
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleBgCheck(v.id, 'rejected')}>
                          Rejeitar BG
                        </Button>
                      </>
                    )}
                    {canManageStatus && v.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(v.id, 'paused')}>
                        Pausar
                      </Button>
                    )}
                    {canManageStatus && v.status === 'paused' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(v.id, 'active')}>
                        Retomar
                      </Button>
                    )}
                    {canManageStatus && v.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => handleStatusChange(v.id, 'blocked')}>
                        Bloquear
                      </Button>
                    )}
                    {canManageStatus && (
                      <Button size="sm" variant="ghost" onClick={() => handleStatusChange(v.id, 'left')}>
                        Marcar saída
                      </Button>
                    )}
                    {canDeleteVol && (
                      <Button size="sm" variant="ghost" className="text-red-700" onClick={() => handleRemove(v.id)}>
                        Excluir
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
