import * as React from 'react';
import { cn } from '@/core/lib/utils';

/**
 * DS_V2_COMPONENTS — Card (spec v1.0 §3.3)
 *
 * Especificação:
 *  - Cantos 20-24px (default 22px = `rounded-[22px]`)
 *  - Fundo quase-branco translúcido (arena-panel já dá isso)
 *  - Sombra difusa colorida (não cinza puro)
 *  - Hover: leve elevação (scale 1.01-1.02 + sombra crescente), nunca tilt 3D
 *  - Padding interno 16-22px dependendo do tipo
 *
 * Variantes (size prop):
 *  - default → 16px padding (cards de listagem, feed)
 *  - feature → 22px padding (feature cards na home, com ícone 44px)
 *  - testimonial → 22px padding (cards de depoimento, com avatar 40px)
 *  - pet → 16px padding, image aspect-ratio 1.3 (Card de Pet)
 *
 * Compat: API shadcn mantida (Card, CardHeader, CardTitle, CardDescription,
 * CardContent, CardFooter). Default size = "default".
 */

export const Card = React.forwardRef(({ className, size = 'default', interactive = false, ...props }, ref) => {
  const sizeClasses = {
    default: 'rounded-[22px]',
    feature: 'rounded-[22px]',
    testimonial: 'rounded-[22px]',
    pet: 'rounded-[22px] overflow-hidden',
  };
  const interactiveClasses = interactive
    ? 'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-26px_rgba(64,34,18,0.4)] cursor-pointer'
    : '';
  return (
    <div
      ref={ref}
      className={cn(
        'arena-panel text-card-foreground',
        sizeClasses[size] || sizeClasses.default,
        interactiveClasses,
        className
      )}
      {...props}
    />
  );
});
Card.displayName = 'Card';

export const CardHeader = React.forwardRef(({ className, size = 'default', ...props }, ref) => {
  const sizeClasses = {
    default: 'p-4 sm:p-5',
    feature: 'p-[22px]',
    testimonial: 'p-[22px]',
    pet: 'p-4',
  };
  return (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5', sizeClasses[size] || sizeClasses.default, className)}
      {...props}
    />
  );
});
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef(({ className, size = 'default', asChild, ...props }, ref) => {
  const Comp = asChild ? 'div' : 'h3';
  const sizeClasses = {
    default: 'text-base font-semibold leading-tight sm:text-lg',
    feature: 'text-[15.5px] font-bold leading-snug',
    testimonial: 'text-[12.5px] font-bold leading-tight',
    pet: 'text-base font-bold font-sora',
  };
  return (
    <Comp
      ref={ref}
      className={cn('tracking-tight', sizeClasses[size] || sizeClasses.default, className)}
      {...props}
    />
  );
});
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef(({ className, size = 'default', ...props }, ref) => {
  const sizeClasses = {
    default: 'text-sm text-muted-foreground',
    feature: 'text-[13px] leading-relaxed text-muted-foreground',
    testimonial: 'text-[12.5px] italic leading-relaxed',
    pet: 'text-xs text-muted-foreground',
  };
  return (
    <p
      ref={ref}
      className={cn(sizeClasses[size] || sizeClasses.default, className)}
      {...props}
    />
  );
});
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef(({ className, size = 'default', ...props }, ref) => {
  const sizeClasses = {
    default: 'p-4 pt-0 sm:p-5 sm:pt-0',
    feature: 'p-[22px] pt-0',
    testimonial: 'p-[22px] pt-0',
    pet: 'p-4 pt-0',
  };
  return (
    <div
      ref={ref}
      className={cn(sizeClasses[size] || sizeClasses.default, className)}
      {...props}
    />
  );
});
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef(({ className, size = 'default', ...props }, ref) => {
  const sizeClasses = {
    default: 'flex items-center p-4 pt-0 sm:p-5 sm:pt-0',
    feature: 'flex items-center p-[22px] pt-0',
    testimonial: 'flex items-center p-[22px] pt-0',
    pet: 'flex items-center p-4 pt-0',
  };
  return (
    <div
      ref={ref}
      className={cn(sizeClasses[size] || sizeClasses.default, className)}
      {...props}
    />
  );
});
CardFooter.displayName = 'CardFooter';
