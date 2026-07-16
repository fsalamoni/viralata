/**
 * @fileoverview DashboardCard — card genérico clicável usado em
 * `DashboardPage` para renderizar os 12 cards padrão e os widgets
 * customizados.
 *
 * Variantes:
 *  - `count` (default) — número grande + label
 *  - `list` — só label (lista resumida fica para Fase 14.1+)
 *  - `trend` — placeholder (gráficos entram na Fase 16)
 *
 * Tones alteram a cor de borda / fundo:
 *  - default / success / warning / danger / info
 *
 * O card inteiro é clicável se receber `href` (navegação interna via
 * react-router). Caso contrário, vira um `<div>` não-clicável.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 14
 */

import * as React from 'react';
import { Link } from 'react-router-dom';
import {
  Dog, Cat, PawPrint, Home, HeartHandshake, BadgeCheck, Undo2,
  Scissors, Pill, Clock, ClipboardList, Calendar, BarChart3, List,
  Bug, Syringe, Stethoscope, MoreHorizontal,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DASHBOARD_TONE_CLASSES } from '@/modules/shelter/domain/operational/dashboard';
import { cn } from '@/core/lib/utils';

// Mapa de ícones (string -> componente). Usado pelos widgets customizados
// que armazenam apenas o nome. Cards padrão passam o componente direto.
const ICON_MAP = {
  Dog, Cat, PawPrint, Home, HeartHandshake, BadgeCheck, Undo2,
  Scissors, Pill, Clock, ClipboardList, Calendar, BarChart3, List,
  Bug, Syringe, Stethoscope, MoreHorizontal,
};

/**
 * Resolve o componente de ícone. Aceita string (lookup) ou componente.
 */
function resolveIcon(icon, fallback = MoreHorizontal) {
  if (!icon) return fallback;
  if (typeof icon === 'string') return ICON_MAP[icon] || fallback;
  return icon;
}

export function DashboardCard({
  title,
  subtitle,
  count,
  href,
  variant = 'count',
  tone = 'default',
  icon,
  isLoading = false,
  size = 'md',
  onClick,
  className,
  testId,
}) {
  const Icon = resolveIcon(icon);

  // Skeleton
  if (isLoading) {
    return (
      <section
        data-testid={testId || `dashboard-card-skeleton`}
        className={cn('arena-section-card arena-panel border-2', className)}
      >
        <div className="arena-section-card-body p-4 sm:p-6 space-y-3">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      </section>
    );
  }

  const toneClass = DASHBOARD_TONE_CLASSES[tone] || DASHBOARD_TONE_CLASSES.default;

  // Tamanho do número principal
  const numberSize = size === 'sm' ? 'text-3xl' : size === 'lg' ? 'text-5xl' : 'text-4xl';

  const content = (
    <section
      data-testid={testId || `dashboard-card-${title}`}
      className={cn(
        'arena-section-card arena-panel border-2 transition-all',
        toneClass,
        (href || onClick) && 'hover:shadow-md hover:border-primary/40 cursor-pointer',
        className,
      )}
      onClick={onClick}
      role={href || onClick ? 'button' : undefined}
      tabIndex={href || onClick ? 0 : -1}
      onKeyDown={(e) => {
        if (!href && !onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.(e);
        }
      }}
    >
      <div className="arena-section-card-body p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium opacity-80 line-clamp-1">{title}</p>
            {variant === 'count' && typeof count === 'number' && (
              <p
                data-testid={`${testId || 'dashboard-card'}-count`}
                className={cn('font-bold tracking-tight mt-1', numberSize)}
              >
                {count.toLocaleString('pt-BR')}
              </p>
            )}
            {variant === 'list' && (
              <p className="text-sm mt-1 opacity-70">
                Lista (em breve)
              </p>
            )}
            {variant === 'trend' && (
              <p className="text-sm mt-1 opacity-70">
                Tendência (em breve)
              </p>
            )}
            {subtitle && (
              <p className="text-xs mt-1 opacity-70 line-clamp-1">{subtitle}</p>
            )}
          </div>
          {Icon && (
            <div className="shrink-0 rounded-lg bg-background/60 p-2">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>
    </section>
  );

  if (href) {
    return (
      <Link to={href} className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-lg">
        {content}
      </Link>
    );
  }
  return content;
}

export default DashboardCard;
