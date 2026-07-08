import React from 'react';
import { cn } from '@/core/lib/utils';

/**
 * Container canônico de página (documentado em docs/DESIGN_SYSTEM.md):
 * todas as páginas internas compartilham a MESMA largura máxima e os MESMOS
 * paddings, para os cards não mudarem de posição entre uma página e outra.
 * A largura (max-w-5xl) é a mesma do trilho do header — conteúdo e navegação
 * alinham na mesma coluna. Conteúdo que pede leitura estreita (formulários,
 * wizards) restringe um miolo interno (`mx-auto max-w-2xl/3xl`), nunca o
 * container. Páginas standalone (Home, Login, Onboarding) ficam fora deste
 * padrão por desenho (full-bleed).
 */
export default function PageContainer({ className, children }) {
  return (
    <div className={cn('arena-page mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
