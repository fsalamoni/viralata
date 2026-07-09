import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/core/lib/utils';
import PageHero from './PageHero';

/**
 * Páginas legais (Política de Privacidade, Termos, Legislação). O cabeçalho
 * usa o `<PageHero>` padrão da plataforma para ganhar o gradiente quando a
 * flag `PAGE_HERO_ENABLED` está ligada; com a flag desligada, degrada para
 * o mesmo painel sem gradiente (puramente aditivo, idêntico ao que já existia).
 */
export function LegalPage({ eyebrow, title, description, meta, children }) {
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
      >
        {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
      </PageHero>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  );
}

export function LegalSection({ icon: Icon, title, description, children, className }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="border-b border-primary/10 bg-white/45 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
          )}
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-base text-foreground">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4 text-sm leading-6 text-foreground/80 sm:p-5">
        {children}
      </CardContent>
    </Card>
  );
}

export function LegalList({ children }) {
  return <ul className="space-y-2 text-sm text-foreground/80">{children}</ul>;
}

export function LegalListItem({ children }) {
  return (
    <li className="flex gap-2">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
      <span>{children}</span>
    </li>
  );
}

export function LegalStat({ label, value }) {
  return (
    <div className="rounded-md border border-primary/10 bg-white/65 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold text-primary">{value}</div>
    </div>
  );
}
