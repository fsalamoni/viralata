/**
 * @fileoverview AdoptionWizard — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_ADOPTION` (default OFF) → V3.
 * Senão → V1.
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { Skeleton } from '@/components/ui/skeleton';
import AdoptionWizardV1 from './AdoptionWizard.v1';

const AdoptionWizardV3 = lazy(() => import(/* webpackChunkName: "AdoptionWizardV3" */ './AdoptionWizard.v3'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function AdoptionWizardWrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_ADOPTION);
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <AdoptionWizardV3 />
      </Suspense>
    );
  }
  return <AdoptionWizardV1 />;
}
