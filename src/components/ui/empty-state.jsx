/**
 * @fileoverview EmptyState — placeholder para listas vazias (DS_V2 + V3).
 *
 * @see docs/REGENCY_FEED_V3.md §3 (componentes) + §6 (estados)
 */
import { cn } from '@/core/lib/utils';
import { PawPrint } from 'lucide-react';

/**
 * @param {object} props
 * @param {React.ComponentType} [props.icon] - lucide-react icon. Default: PawPrint
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {React.ReactNode} [props.action] - botão primário (legado)
 * @param {Array<{label: string, onClick: () => void, variant?: 'default'|'outline'|'link'}>} [props.buttons]
 *   Lista de botões (1 ou 2). Usado quando há 2 ações (ex: "Limpar filtros" + "Ampliar raio").
 * @param {string} [props.className]
 * @param {string} [props.testId]
 */
export function EmptyState({ icon: Icon = PawPrint, title, description, action, buttons, className, testId }) {
  return (
    <div
      className={cn('arena-empty-state', className)}
      data-testid={testId}
      role="status"
      aria-live="polite"
    >
      <div className="arena-empty-state-icon">
        <Icon className="w-7 h-7" aria-hidden="true" />
      </div>
      {title && <h3 className="arena-empty-state-title">{title}</h3>}
      {description && <p className="arena-empty-state-description">{description}</p>}
      {buttons && buttons.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {buttons.map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={b.onClick}
              className={cn(
                'inline-flex h-10 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold transition-colors',
                b.variant === 'outline'
                  ? 'border border-border bg-card text-foreground hover:bg-muted'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
              data-testid={b.testId}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}
      {action && !buttons && <div className="mt-1">{action}</div>}
    </div>
  );
}
