import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/core/lib/utils';
import PageContainer from '@/components/PageContainer';

export function LegalPage({ eyebrow, title, description, meta, children }) {
  return (
    <PageContainer className="space-y-5">
      <section className="arena-panel-strong rounded-lg p-5 sm:p-6">
        <div className="max-w-3xl space-y-3">
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-highlight">{eyebrow}</p>}
          <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          {description && <p className="text-sm leading-6 text-orange-50/90 sm:text-base">{description}</p>}
          {meta && <p className="text-xs text-orange-50/75">{meta}</p>}
        </div>
      </section>
      <div className="min-w-0 space-y-4">{children}</div>
    </PageContainer>
  );
}
