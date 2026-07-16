import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/core/lib/utils';

/**
 * DS_V2_COMPONENTS — Button (spec v1.0 §3.1)
 *
 * 7 variantes oficiais (sempre formato pílula 999px):
 *  - default      → gradiente de marca, texto branco, sombra forte
 *  - secondary    → branco 90%, borda 2px primary 30%, hover mais saturado
 *  - tertiary     → secondary (areia), 36px de altura (dentro de cards)
 *  - admin        → escuro (hsl 20,15%,20%), texto branco (contexto restrito)
 *  - destructive  → vermelho, texto branco (denúncias, exclusões — moderação)
 *  - ghost        → transparente, hover bg claro (ação terciária inline)
 *  - link         → texto puro primary com underline no hover
 *  - iconCircle   → círculo perfeito 46-52px, gradiente marca (swipe descoberta)
 *
 * Compat: shadcn variants (default, outline, secondary, destructive, ghost, link)
 * continuam funcionando — 'default' mapeia para a variante oficial 'primary'.
 */

const buttonVariants = cva(
  // Base — todas as variantes
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-full text-sm font-semibold tracking-[-0.01em]',
    'ring-offset-background transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none',
  ].join(' '),
  {
    variants: {
      variant: {
        // DS_V2: primário (uma por tela) — gradiente terracota→mostarda
        default:
          'bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-primary-foreground shadow-[0_18px_38px_-22px_rgba(64,34,18,0.7)] hover:-translate-y-0.5 hover:brightness-105',
        // DS_V2: secundário — branco translúcido + borda primária
        outline:
          'border-2 border-primary/35 bg-white/75 text-stone-900 shadow-[0_12px_28px_-22px_rgba(64,34,18,0.5)] hover:-translate-y-0.5 hover:border-primary/60 hover:bg-white',
        // DS_V2: terciário — areia, dentro de cards
        secondary:
          'bg-secondary text-secondary-foreground shadow-[0_14px_28px_-24px_rgba(64,34,18,0.35)] hover:-translate-y-0.5 hover:bg-secondary/80',
        // DS_V2: administrativo — contexto restrito, painel admin
        admin:
          'bg-[hsl(20,15%,20%)] text-white shadow-[0_18px_38px_-22px_rgba(0,0,0,0.6)] hover:-translate-y-0.5 hover:bg-[hsl(20,15%,15%)]',
        // DS_V2: destrutivo (usar com moderação — denúncias, exclusões)
        destructive:
          'bg-destructive text-destructive-foreground shadow-[0_16px_32px_-20px_rgba(185,28,28,0.55)] hover:-translate-y-0.5 hover:bg-destructive/95',
        // DS_V2: ghost (ação terciária inline — texto + leve hover)
        ghost:
          'text-stone-700 hover:bg-white/70 hover:text-stone-950',
        // DS_V2: link (texto puro)
        link:
          'text-primary underline-offset-4 hover:underline rounded-none',
      },
      size: {
        // DS_V2: padrão — 46px (spec)
        default: 'h-[46px] px-6 text-sm',
        // DS_V2: pequeno — 36px (dentro de cards)
        sm: 'h-9 px-4 text-[13px]',
        // DS_V2: terciário — 36px (sanduíche em card)
        tertiary: 'h-9 px-4 text-[12.5px]',
        // DS_V2: grande — 52px (CTA final, hero)
        lg: 'h-[52px] px-7 text-[15px]',
        // DS_V2: ícone circular — 46px (padrão)
        icon: 'h-11 w-11',
        // DS_V2: ícone circular — 52px (swipe descoberta)
        iconCircle: 'h-[52px] w-[52px] p-0 rounded-full',
        // Compat: alias para icon
        md: 'h-11 w-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };
