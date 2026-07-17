/**
 * @fileoverview PaginationControls — paginação com primeira/última/próxima/anterior
 * (V3).
 *
 * Usado em "Todos os pets disponíveis" (Feed) e em qualquer lista paginada.
 *
 * Props:
 *  - `page`: 1-indexed
 *  - `totalItems`
 *  - `perPage`
 *  - `onPageChange(newPage)`
 *
 * Comportamento:
 *  - Mostra "Página X de Y" + 4 botões: primeira (|←), anterior (←), próxima (→), última (→|)
 *  - Desabilita extremos (primeira/última) quando aplicável
 *  - A11y: `aria-current="page"` no label, `aria-label` em cada botão
 *  - Mobile: oculta labels, mostra só ícones
 *
 * @see docs/REGENCY_FEED_V3.md §F14, §2 (funcionalidades)
 */
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { Button } from '@/components/ui/button';

export function PaginationControls({
  page = 1,
  totalItems = 0,
  perPage = 12,
  onPageChange,
  className,
  testId = 'pagination-controls',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const isFirst = currentPage <= 1;
  const isLast = currentPage >= totalPages;

  if (totalPages <= 1) return null;

  const go = (next) => {
    const target = Math.min(Math.max(1, next), totalPages);
    if (target === currentPage) return;
    onPageChange?.(target);
  };

  return (
    <nav
      className={cn('flex flex-wrap items-center justify-between gap-3', className)}
      data-testid={testId}
      aria-label="Paginação"
    >
      <p className="text-sm text-muted-foreground" aria-current="page">
        Página <span className="font-semibold text-foreground">{currentPage}</span> de{' '}
        <span className="font-semibold text-foreground">{totalPages}</span>
        {totalItems > 0 && (
          <>
            {' '}
            <span className="text-xs">({totalItems} pets)</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => go(1)}
          disabled={isFirst}
          aria-label="Primeira página"
          data-testid="pagination-first"
          className="h-9 w-9"
        >
          <ChevronFirst className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => go(currentPage - 1)}
          disabled={isFirst}
          aria-label="Página anterior"
          data-testid="pagination-prev"
          className="h-9 w-9"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => go(currentPage + 1)}
          disabled={isLast}
          aria-label="Próxima página"
          data-testid="pagination-next"
          className="h-9 w-9"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => go(totalPages)}
          disabled={isLast}
          aria-label="Última página"
          data-testid="pagination-last"
          className="h-9 w-9"
        >
          <ChevronLast className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
