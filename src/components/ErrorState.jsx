/**
 * @fileoverview ErrorState — placeholder para estados de erro (V3).
 *
 * @see docs/REGENCY_FEED_V3.md §6 (estados)
 */
import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { Button } from '@/components/ui/button';

export function ErrorState({
  title = 'Algo deu errado',
  description,
  onRetry,
  className,
  testId = 'error-state',
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center',
        className,
      )}
      role="alert"
      data-testid={testId}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-6 w-6 text-destructive" aria-hidden="true" />
      </div>
      {title && <h3 className="text-base font-bold text-foreground">{title}</h3>}
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="mt-2"
          data-testid={`${testId}-retry`}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
