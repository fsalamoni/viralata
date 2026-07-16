import * as React from 'react';
import { cn } from '@/core/lib/utils';

/**
 * DS_V2_COMPONENTS — Table (spec v1.0 §3.7)
 *
 *  - Raio externo 18px (via wrapper .arena-table-wrap)
 *  - Header: bg Secondary (Areia), texto 12px uppercase (Eyebrow)
 *  - Linhas: padding 14px 16px, borda inferior fina
 *  - Linhas pares: bg Background Alt para zebragem (`:nth-child(even)`)
 *  - Hover com bg Areia claro
 *
 * Spec: "Sem grades tradicionais — listas de linhas com cantos arredondados,
 *  usadas em admin e financeiro." Aplicado com o wrapper que já vinha em uso
 *  (`.arena-table-wrap`).
 *
 * Compat: API shadcn mantida.
 */

const Table = React.forwardRef(({ className, ...props }, ref) => (
  // DS_V2: wrapper com raio 18px + borda + glass (arena-table-wrap)
  <div className="arena-table-wrap relative w-full overflow-auto">
    <table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} />
  </div>
));
Table.displayName = 'Table';

const TableHeader = React.forwardRef(({ className, ...props }, ref) => (
  // DS_V2 spec §3.7: header bg Secondary (Areia)
  <thead
    ref={ref}
    className={cn('bg-secondary/50 [&_tr]:border-b [&_tr]:border-border/60', className)}
    {...props}
  />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(
      // DS_V2 spec §3.7: linhas pares com bg Background Alt
      '[&_tr:nth-child(even)]:bg-background-alt/40',
      '[&_tr:last-child]:border-0',
      className,
    )}
    {...props}
  />
));
TableBody.displayName = 'TableBody';

const TableRow = React.forwardRef(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      // DS_V2 spec §3.7: padding 14px 16px (via TableCell), borda inferior fina
      'border-b border-border/60 transition-colors',
      // DS_V2 spec §3.7: hover com bg Areia claro
      'hover:bg-secondary/40',
      'data-[state=selected]:bg-secondary/60',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef(({ className, ...props }, ref) => (
  <th
    ref={ref}
    // DS_V2 spec §3.7: padding 14px 16px, 12px uppercase Eyebrow
    className={cn(
      'h-12 px-4 text-left align-middle font-bold uppercase tracking-[0.06em] text-[11px] text-muted-foreground whitespace-nowrap',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef(({ className, ...props }, ref) => (
  <td
    ref={ref}
    // DS_V2 spec §3.7: padding 14px 16px
    className={cn('px-4 py-3.5 align-middle text-sm', className)}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
