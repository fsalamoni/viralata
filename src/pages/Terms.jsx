/**
 * @fileoverview Terms — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_LEGAL` (default OFF) → TermsV3 (TASK-V3-LEGAL-5).
 * Senão → TermsV1.
 *
 * IMPORTANTE: React.lazy com dynamic import para V3 (D-VITE-LAZY-01).
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import TermsV1 from './Terms.v1';

const TermsV3 = lazy(() => import(/* webpackChunkName: "TermsV3" */ './Terms.v3'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="h-6 w-1/2 rounded-md bg-muted" />
      <div className="mt-4 h-32 w-full rounded-md bg-muted" />
      <div className="mt-2 h-32 w-full rounded-md bg-muted" />
    </div>
  );
}

export default function TermsWrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_LEGAL);
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <TermsV3 />
      </Suspense>
    );
  }
  return <TermsV1 />;
}
