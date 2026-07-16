import * as React from 'react';
import { cn } from '@/core/lib/utils';

/**
 * DS_V2_COMPONENTS — Input + Textarea (spec v1.0 §3.4)
 *
 *  - Altura 46px (spec)
 *  - Raio 12px
 *  - Borda hsl(var(--input))
 *  - Focus: borda primary + ring 3px hsla(primary, 0.1)
 *  - Font Manrope, 14px, line-height 1.6
 *  - Padding 0 14px
 *  - Disabled: opacity 50, cursor not-allowed
 *  - File input: borda 0, bg transparente
 *
 * Compat: API shadcn mantida (forwardRef, className, type, ...props).
 */

export const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      // DS_V2 spec §3.4 — Input
      'flex h-[46px] w-full rounded-[12px] border border-input bg-background px-[14px] py-2',
      'text-sm font-medium leading-relaxed',
      'placeholder:text-muted-foreground placeholder:font-normal',
      'ring-offset-background',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      // Focus
      'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10',
      // Disabled
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Transition
      'transition-colors duration-200',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      // DS_V2 spec §3.4 — Textarea
      'flex min-h-[80px] w-full rounded-[12px] border border-input bg-background px-[14px] py-3',
      'text-sm leading-relaxed',
      'placeholder:text-muted-foreground',
      'ring-offset-background',
      // Focus
      'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/10',
      // Disabled
      'disabled:cursor-not-allowed disabled:opacity-50',
      // Resize vertical
      'resize-y',
      // Transition
      'transition-colors duration-200',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
