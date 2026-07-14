/**
 * @fileoverview FosterCtaCard — bloco "Quero ser Lar Temporário" no
 * perfil público do abrigo (TASK-132).
 *
 * Renderizado na aba Geral do ClubDetail, gated pela flag
 * `shelter_foster_program_v1` (default OFF). CTA leva ao fluxo de
 * cadastro de LT com o abrigo pré-selecionado.
 */

import { Link } from 'react-router-dom';
import { Home as HomeIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

export function FosterCtaCard({ clubId, clubName }) {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOSTER);
  if (!enabled || !clubId) return null;

  return (
    <Card className="rounded-[24px] border-emerald-200 bg-emerald-50" data-testid="foster-cta-card">
      <CardContent className="flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100">
          <HomeIcon className="h-6 w-6 text-emerald-700" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-foreground">Quero ser Lar Temporário</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acolha temporariamente pets de {clubName || 'este abrigo'} enquanto eles esperam por um lar definitivo.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/lares-temporarios">Saiba mais</Link>
          </Button>
          <Button asChild size="sm">
            <Link to={`/lares-temporarios/novo?abrigo=${clubId}`}>Quero ser LT</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default FosterCtaCard;
