/**
 * @fileoverview FilterChipsRow — linha de chips toggleáveis (V3).
 *
 * Substitui o `FilterChip` inline do Feed V1. Usado em todas as listas
 * filtradas (Feed, ClubDetail, EventsUnified, etc).
 *
 * Props:
 *  - `field`: string identificador do filtro (vai pro `useUrlFilters`)
 *  - `value`: valor atual selecionado (controlled)
 *  - `onChange(newValue)`
 *  - `options`: [{value, label, icon?}]
 *  - `multiple`: false (default — radio) | true (checkbox)
 *  - `aria-label`: rótulo do nav
 *
 * Tokens: `bg-card`/`border-border` (estado neutro), `bg-primary`/`text-primary-foreground`
 * (estado ativo). Sem cores hard-coded. Dark mode propaga.
 *
 * A11y: `role="group"`, `aria-pressed` em cada chip, `aria-label` no nav.
 *
 * @see docs/REGENCY_FEED_V3.md §F6-F12
 */
import { cn } from '@/core/lib/utils';

export function FilterChipsRow({
  field,
  value,
  onChange,
  options = [],
  multiple = false,
  ariaLabel,
  className,
  testId = `filter-chips-${field}`,
}) {
  const isActive = (opt) => {
    if (multiple) {
      return Array.isArray(value) && value.map((v) => String(v)).includes(String(opt.value));
    }
    // V3 (TASK-V3-FEED-FIX-02): comparação robusta via String().
    // O useUrlFilters pode devolver número (parse de '50' → 50) enquanto
    // as options normalmente têm strings. Sem normalização, '50' === 50
    // dá false e o chip não fica ativo mesmo quando o user clicou.
    return String(value) === String(opt.value);
  };

  const handleClick = (opt) => {
    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      const next = current.includes(opt.value)
        ? current.filter((v) => v !== opt.value)
        : [...current, opt.value];
      onChange?.(next);
    } else {
      onChange?.(opt.value);
    }
  };

  return (
    <nav
      className={cn(
        'flex flex-wrap items-center gap-2 overflow-x-auto pb-1.5',
        '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        className,
      )}
      role="group"
      aria-label={ariaLabel || `Filtro ${field}`}
      data-testid={testId}
    >
      {options.map((opt) => {
        const active = isActive(opt);
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleClick(opt)}
            aria-pressed={active}
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 text-[13px] font-bold transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-foreground/75 hover:border-primary/40 hover:text-foreground',
            )}
            data-testid={`${testId}-${opt.value}`}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </nav>
  );
}
