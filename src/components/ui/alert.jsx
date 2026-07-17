import React from 'react';
import { cn } from '@/core/lib/utils';

/**
 * Alert — bloco de destaque com ícone + título + descrição.
 *
 * Variantes:
 *  - default (azul/info)
 *  - warning (amarelo)
 *  - destructive (vermelho)
 *  - success (verde)
 */
const VARIANTS = {
  default: 'border-accent/30 bg-accent/10 text-foreground',
  warning: 'border-highlight/40 bg-highlight/15 text-foreground',
  destructive: 'border-destructive/30 bg-destructive/10 text-foreground',
  success: 'border-primary/30 bg-primary/10 text-foreground',
};

export function Alert({ className, variant = 'default', children, ...props }) {
  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-2xl border p-4 flex items-start gap-3', VARIANTS[variant] || VARIANTS.default, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ className, children, ...props }) {
  return (
    <h5 className={cn('mb-1 font-semibold leading-tight tracking-tight', className)} {...props}>
      {children}
    </h5>
  );
}

export function AlertDescription({ className, children, ...props }) {
  return (
    <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props}>
      {children}
    </div>
  );
}

export default Alert;
