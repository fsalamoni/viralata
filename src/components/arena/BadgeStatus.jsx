import { cn } from '@/core/lib/utils';

/**
 * BadgeStatus — badge de status reutilizável com dark mode.
 *
 * @param {Object} props
 * @param {'available'|'pending'|'adopted'|'cancelled'|'active'|'inactive'|'draft'|'review'|'approved'|'rejected'|string} props.status - status key
 * @param {string} [props.className] - classes extras
 * @param {'sm'|'md'|'lg'} [props.size='md'] - tamanho
 *
 * Uso:
 *   <BadgeStatus status="available">Disponível</BadgeStatus>
 *   <BadgeStatus status="pending" size="sm" />
 *
 * ⚠️ Para novos statuses, adicionar ao STATUS_STYLES abaixo.
 */
export function BadgeStatus({ status, className, size = 'md', children }) {
  const sizeClass = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  }[size];

  const style = STATUS_STYLES[status] || STATUS_STYLES.default;

  return (
    <span className={cn('inline-flex items-center rounded-full font-medium', style, sizeClass, className)}>
      {children ?? STATUS_LABELS[status] ?? status}
    </span>
  );
}

/** Mapeamento de status → classes Tailwind com dark mode. */
export const STATUS_STYLES = {
  // Pet status
  available:   'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  pending:      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  adopted:      'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  cancelled:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',

  // Process status
  active:      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  inactive:    'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  draft:       'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  review:      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  approved:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',

  // Default fallback
  default:     'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

/** Labels padrão por status (para quando children não é fornecido). */
export const STATUS_LABELS = {
  available: 'Disponível',
  pending:   'Em processo',
  adopted:  'Adotado',
  cancelled: 'Cancelado',
  active:   'Ativo',
  inactive: 'Inativo',
  draft:    'Rascunho',
  review:   'Em revisão',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};
