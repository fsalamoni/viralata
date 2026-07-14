/**
 * @fileoverview VolunteerCtaCard — bloco "Seja voluntário" no perfil
 * público do abrigo (TASK-205 / Regra A §A.3).
 *
 * Renderizado na aba Geral do ClubDetail, gated pela flag
 * `shelter_volunteer_profile_v1` (default OFF). CTA leva ao fluxo de
 * inscrição com o abrigo pré-selecionado (`/voluntarios/seja?abrigo=id`).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { JoinVolunteerModal } from '@/modules/shelter/components/JoinVolunteerModal';

export function VolunteerCtaCard({ clubId, clubName }) {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEER_PROFILE_V1);
  const [modalOpen, setModalOpen] = useState(false);
  if (!enabled || !clubId) return null;

  return (
    <>
    <Card className="rounded-[24px] border-primary/20 bg-primary/5">
      <CardContent className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          <HeartHandshake className="h-6 w-6 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">Seja voluntário</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Ajude {clubName || 'este abrigo'} com passeios, transporte, eventos e cuidados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/voluntarios">Saiba mais</Link>
          </Button>
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            data-testid="open-join-volunteer-modal"
          >
            Inscrever-se
          </Button>
        </div>
      </CardContent>
    </Card>
      <JoinVolunteerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        clubId={clubId}
        clubName={clubName}
        onSuccess={() => setModalOpen(false)}
      />
    </>  
);
}

export default VolunteerCtaCard;
