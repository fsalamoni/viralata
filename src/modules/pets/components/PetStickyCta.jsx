/**
 * @fileoverview PetStickyCta — CTA fixo no bottom em mobile (V3).
 *
 * TASK-V3-PET-DETAIL-15: bottom CTA sticky em mobile quando há ação
 * disponível (curtir / adotar / conversar). Não renderiza se já
 * logado + ação disponível já está inline.
 *
 * Tokens: `bg-card`, `border-border`, `bg-primary`. Sem cores hard-coded.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Sticky CTA"
 */
import { Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';

export function PetStickyCta({
  primaryAction, // { label, onClick, icon, disabled, ariaBusy }
  secondaryAction, // { label, onClick, icon, ... } (opcional)
  className,
}) {
  if (!primaryAction && !secondaryAction) return null;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden',
        className,
      )}
      role="region"
      aria-label="Ações do pet"
      data-testid="pet-sticky-cta"
    >
      <div className="flex items-center gap-2">
        {secondaryAction && (
          <Button
            variant="outline"
            onClick={secondaryAction.onClick}
            disabled={secondaryAction.disabled}
            aria-busy={secondaryAction.ariaBusy}
            aria-label={secondaryAction.ariaLabel || secondaryAction.label}
            className="h-[52px] w-[52px] shrink-0 p-0"
          >
            {secondaryAction.icon && <secondaryAction.icon className="h-5 w-5" />}
          </Button>
        )}
        {primaryAction && (
          <Button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            aria-busy={primaryAction.ariaBusy}
            aria-label={primaryAction.ariaLabel || primaryAction.label}
            className="h-[52px] flex-1 gap-2 text-[15px]"
          >
            {primaryAction.icon && <primaryAction.icon className="h-[19px] w-[19px]" />}
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

PetStickyCta.defaultProps = {
  // Atalhos para uso comum
  interestAction: (props) => ({
    label: 'Tenho Interesse',
    icon: Heart,
    ...props,
  }),
  chatAction: (props) => ({
    label: 'Conversar',
    icon: MessageCircle,
    variant: 'outline',
    ...props,
  }),
};
