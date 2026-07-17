/**
 * @fileoverview PrivacyPolicy — wrapper que escolhe V3 ou V1.
 *
 * Flag `V3_PAGE_LEGAL` (default OFF) → PrivacyPolicyV3 (TASK-V3-LEGAL-5).
 * Senão → PrivacyPolicyV1.
 *
 * IMPORTANTE: React.lazy com dynamic import para V3 (D-VITE-LAZY-01).
 */
import { lazy, Suspense } from 'react';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import PrivacyPolicyV1 from './PrivacyPolicy.v1';

const PrivacyPolicyV3 = lazy(() => import(/* webpackChunkName: "PrivacyPolicyV3" */ './PrivacyPolicy.v3'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="h-6 w-1/2 rounded-md bg-muted" />
      <div className="mt-4 h-32 w-full rounded-md bg-muted" />
    </div>
  );
}

export default function PrivacyPolicyWrapper() {
  const useV3 = useFeatureFlag(FEATURE_FLAG.V3_PAGE_LEGAL);
  if (useV3) {
    return (
      <Suspense fallback={<PageFallback />}>
        <PrivacyPolicyV3 />
      </Suspense>
    );
  }
  return <PrivacyPolicyV1 />;
}
