/**
 * @fileoverview BalancedTabs — Tabs com altura balanceada entre
 * painéis (TASK-402).
 *
 * **Problema**: o card que envolve as abas (em Organizacao e
 * Comunidade) tinha altura fixa ou crescia apenas com o conteúdo
 * da aba ativa. Trocar de aba causava "pulo" e desbalanceamento.
 *
 * **Solução**: usa CSS Grid Stacking Pattern + `forceMount` no
 * TabsContent. Todos os painéis ficam mountados e ocupam a mesma
 * célula do grid (`gridArea: '1 / 1'`). O navegador empilha
 * todos e o card usa a altura do mais alto. Sem JS, sem CLS.
 *
 * **Comportamento**:
 * - Altura do card = altura do painel mais alto
 * - Trocar de aba: sem mudança de altura
 * - Hidden (data-state=inactive): visibility: hidden + pointer-events: none
 *   (mantém espaço, evita reflow)
 *
 * **Compatibilidade**: 100% compatível com a API do Tabs Radix.
 */
import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/core/lib/utils';

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground',
      className,
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = 'TabsTrigger';

/**
 * TabsContent que:
 * - forceMount (sempre renderizado)
 * - data-state=inactive: visibility hidden (mantém espaço)
 * - Inclui wrapper div que ocupa mesma célula do grid (stacking)
 */
const BalancedTabsContent = React.forwardRef(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    forceMount
    className={cn(
      'w-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none',
      className,
    )}
    {...props}
  />
));
BalancedTabsContent.displayName = 'BalancedTabsContent';

/**
 * Wrapper que envolve múltiplos BalancedTabsContent com Grid Stacking.
 * Todos os children (TabsContent) ficam na mesma célula do grid.
 */
const TabsContentStack = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('grid grid-cols-1 [grid-template-areas:"stack"]', className)}
    data-testid="tabs-content-stack"
    {...props}
  >
    {React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      return (
        <div
          key={child.key}
          className="[grid-area:stack] min-w-0"
        >
          {child}
        </div>
      );
    })}
  </div>
));
TabsContentStack.displayName = 'TabsContentStack';

export { Tabs, TabsList, TabsTrigger, BalancedTabsContent, TabsContentStack };
