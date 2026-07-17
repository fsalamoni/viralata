import { cn } from '@/core/lib/utils';

/**
 * StatusDot — indicador visual de status (bolinha colorida).
 *
 * @param {Object} props
 * @param {'online'|'offline'|'busy'|'away'|'success'|'warning'|'error'|string} props.type
 * @param {'sm'|'md'|'lg'} [props.size='md']
 * @param {string} [props.label] - texto acessível (aria-label)
 * @param {string} [props.className]
 *
 * Uso:
 *   <StatusDot type="online" label="Online" />
 *   <div className="flex items-center gap-2">
 *     <StatusDot type="success" size="sm" />
 *     <span>Disponível</span>
 *   </div>
 */
export function StatusDot({ type, size = 'md', label, className }) {
  const sizeClass = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3.5 w-3.5',
  }[size];

  const dotClass = DOT_STYLES[type] || DOT_STYLES.default;

  return (
    <span
      role="img"
      aria-label={label || type}
      className={cn('inline-block rounded-full flex-shrink-0', sizeClass, dotClass, className)}
    />
  );
}

/** Mapeamento de tipo → classes de cor do dot. */
export const DOT_STYLES = {
  // Online/offline
  online:  'bg-emerald-500 dark:bg-emerald-400',
  offline: 'bg-slate-400 dark:bg-slate-500',

  // Availability
  busy:    'bg-red-500 dark:bg-red-400',
  away:    'bg-amber-400 dark:bg-amber-400',
  success: 'bg-emerald-500 dark:bg-emerald-400',
  warning: 'bg-amber-500 dark:bg-amber-400',
  error:   'bg-red-500 dark:bg-red-400',

  // Pulse variant (animated)
  'online-pulse':  'bg-emerald-500 dark:bg-emerald-400 animate-pulse',
  'busy-pulse':   'bg-red-500 dark:bg-red-400 animate-pulse',

  default: 'bg-slate-400 dark:bg-slate-500',
};

/**
 * StatusDotGroup — dot + label lado a lado.
 */
export function StatusDotGroup({ type, label, size = 'md' }) {
  return (
    <div className="flex items-center gap-2">
      <StatusDot type={type} size={size} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
