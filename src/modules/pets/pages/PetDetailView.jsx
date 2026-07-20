/**
 * @fileoverview PetDetailView — wrapper com feature flag (TASK-V3-PET-DETAIL-VIEW).
 *
 * Resolve para a página V3 (PetDetailView.v3.jsx) quando `PET_DETAIL_VIEW_V1`
 * está ON, e mantém V1 (PublicPet.jsx) caso contrário.
 *
 * **Por que lazy + wrapper**: D-VITE-LAZY-01 — Vite faz constant folding em
 * if/else com feature flag estática e ELIMINA o branch da página desativada.
 * Para preservar ambas as versões no bundle e permitir toggle via
 * Firestore flags, é OBRIGATÓRIO usar React.lazy() com dynamic import.
 *
 * @see src/core/featureFlags.js
 * @see src/modules/pets/pages/PetDetailView.v3.jsx
 * @see src/modules/pets/pages/PetDetailView.v1.jsx
 */
import React, { Suspense, lazy } from 'react';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { Skeleton } from '@/components/ui/skeleton';

const PetDetailViewV3 = lazy(() => import('./PetDetailView.v3'));
const PetDetailViewV1 = lazy(() => import('./PetDetailView.v1'));

function PetDetailViewFallback() {
  return (
    <div className="min-h-screen bg-background" data-testid="pet-detail-view-fallback">
      <div className="bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 py-8 dark:from-rose-950/30 dark:via-amber-950/20 dark:to-orange-950/30">
        <div className="mx-auto max-w-6xl space-y-3 px-4 sm:px-6">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="aspect-[4/3] w-full rounded-3xl sm:aspect-[16/10]" />
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-48 rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PetDetailView() {
  const isV3 = useFeatureFlag(FEATURE_FLAG.PET_DETAIL_VIEW_V1);
  return (
    <Suspense fallback={<PetDetailViewFallback />}>
      {isV3 ? <PetDetailViewV3 /> : <PetDetailViewV1 />}
    </Suspense>
  );
}
