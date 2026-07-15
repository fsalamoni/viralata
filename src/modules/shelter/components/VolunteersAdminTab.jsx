/**
 * @fileoverview Componente: VolunteersAdminTab (TASK-237).
 *
 * Wrapper do painel de voluntários da ONG. Renderiza duas sub-abas:
 *  - "Roster": lista de voluntários (usa VolunteersRoster).
 *  - "Participações": lista + form (usa ParticipationsList + ParticipationForm).
 *
 * Feature flag: `shelter_volunteer_profile_v1` (default OFF).
 */

import { useState } from 'react';
import { Plus, Users, CalendarCheck, BadgeCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { canManageVolunteers } from '@/modules/organizations/domain/permissions';
import { VolunteersRoster } from '@/modules/shelter/components/VolunteersRoster';
import { ParticipationsList } from '@/modules/shelter/components/ParticipationsList';
import { ParticipationForm } from '@/modules/shelter/components/ParticipationForm';
import { AssignmentMatrix } from '@/modules/shelter/components/AssignmentMatrix';

export function VolunteersAdminTab({ shelterClubId, club, membership, currentUserUid }) {
  const isV1Enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const canManage = canManageVolunteers(club, membership, currentUserUid);
  const [formOpen, setFormOpen] = useState(false);

  if (!isV1Enabled) return null;
  if (!shelterClubId) {
    return <p className="text-sm text-muted-foreground">Selecione um abrigo.</p>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roster" className="w-full">
        <TabsList className="arena-tab-bar">
          <TabsTrigger value="roster" className="arena-tab-pill gap-1.5">
            <Users className="h-4 w-4" /> Roster
          </TabsTrigger>
          <TabsTrigger value="participations" className="arena-tab-pill gap-1.5">
            <CalendarCheck className="h-4 w-4" /> Participações
          </TabsTrigger>
          <TabsTrigger value="assignments" className="arena-tab-pill gap-1.5">
            <BadgeCheck className="h-4 w-4" /> Atribuições
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roster" className="mt-6 px-1">
          <VolunteersRoster shelterClubId={shelterClubId} canAbriho={canManage} />
        </TabsContent>

        <TabsContent value="assignments" className="mt-6 px-1 space-y-4">
          <AssignmentMatrix
            shelterClubId={shelterClubId}
            canManage={canManage}
            actor={{ uid: currentUserUid }}
          />
        </TabsContent>

        <TabsContent value="participations" className="mt-6 px-1 space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="mr-1.5 h-4 w-4" /> Nova participation
              </Button>
            </div>
          )}
          <ParticipationsList
            shelterClubId={shelterClubId}
            canAbriho={canManage}
          />

          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova participation</DialogTitle>
                <DialogDescription>
                  Registre a participação de um voluntário em um evento, feira ou transporte.
                </DialogDescription>
              </DialogHeader>
              <ParticipationForm
                shelterClubId={shelterClubId}
                actor={{ uid: currentUserUid }}
                onSaved={() => setFormOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}
