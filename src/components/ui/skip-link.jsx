/**
 * SkipLink — WCAG 2.4.1: Bypass Blocks.
 *
 * Renderiza um link "Ir para o conteúdo principal" que fica invisível até
 * ser focado com Tab. Usar no topo de cada página autenticada (via Layout)
 * e nas páginas standalone (Home, Login, etc.).
 *
 * Uso:
 *   <SkipLink targetId="main-content" />
 */
import React from 'react';
import { cn } from '@/core/lib/utils';

export function SkipLink({ targetId = 'main-content', label = 'Ir para o conteúdo principal' }) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        'fixed left-4 top-4 z-[9999]',
        'rounded-full border-2 border-primary bg-primary px-4 py-2',
        'text-sm font-semibold text-primary-foreground',
        'shadow-lg',
        'opacity-0 -translate-y-16 focus:opacity-100 focus:translate-y-0',
        'transition-all duration-200',
        'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      )}
    >
      {label}
    </a>
  );
}
