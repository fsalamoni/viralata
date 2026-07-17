/**
 * @fileoverview InputCityAutocomplete — input de cidade com autocomplete (V3).
 *
 * Substitui o `<Input>` simples de cidade do Feed V1. Mostra um dropdown
 * com as cidades da tabela `BR_CITY_COORDS` (~200 cidades). A primeira
 * cidade da lista é a do usuário (se definida e diferente das conhecidas).
 *
 * Props:
 *  - `value`: string atual
 *  - `onChange(newValue)`
 *  - `userCity`: cidade do profile (default na lista)
 *  - `placeholder`
 *  - `aria-label`
 *
 * A11y:
 *  - `<input role="combobox" aria-expanded aria-controls aria-autocomplete="list">`
 *  - `<ul role="listbox">` com `<li role="option" aria-selected>`
 *  - Navegação por teclado: ↑↓ Enter Esc
 *  - Anúncio: `aria-live="polite"` no count de resultados
 *
 * Tokens: `bg-card`, `border-border`, `text-foreground`, `bg-primary/10` (highlight hover).
 *
 * @see docs/REGENCY_FEED_V3.md §F10
 */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MapPin, ChevronDown, X } from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { getCitySuggestions, normalizePlaceText } from '@/modules/pets/domain/geoDistance';
import { useReducedMotionSafe } from '@/core/hooks/useReducedMotionSafe';

const MAX_SUGGESTIONS = 50;

export function InputCityAutocomplete({
  value,
  onChange,
  userCity,
  placeholder = 'Filtrar por cidade',
  ariaLabel = 'Filtrar por cidade',
  className,
  testId = 'input-city-autocomplete',
}) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const reduceMotion = useReducedMotionSafe();

  // Sincroniza com `value` externo (controlled)
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const allSuggestions = useMemo(() => getCitySuggestions(userCity), [userCity]);

  const filtered = useMemo(() => {
    const q = normalizePlaceText(query);
    if (!q) return allSuggestions.slice(0, MAX_SUGGESTIONS);
    return allSuggestions
      .filter((c) => normalizePlaceText(c).includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [query, allSuggestions]);

  const handleSelect = useCallback((city) => {
    setQuery(city);
    onChange?.(city);
    setOpen(false);
    setActiveIdx(-1);
    inputRef.current?.focus();
  }, [onChange]);

  const handleClear = useCallback(() => {
    setQuery('');
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0 && filtered[activeIdx]) {
        e.preventDefault();
        handleSelect(filtered[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  return (
    <div className={cn('relative w-full', className)} data-testid={testId}>
      <div className="relative">
        <MapPin
          className="pointer-events-none absolute left-3.5 top-1/2 h-[17px] w-[17px] -translate-y-1/2 text-muted-foreground/70"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${testId}-listbox`}
          aria-autocomplete="list"
          aria-label={ariaLabel}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(-1);
            onChange?.(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Pequeno delay para permitir click no item
            setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={handleKeyDown}
          className="h-[38px] w-full rounded-full border border-border bg-card pl-[38px] pr-9 text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Limpar cidade"
            data-testid={`${testId}-clear`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown
          className={cn(
            'pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60 transition-transform',
            open && 'rotate-180',
            !reduceMotion && 'transition-transform',
          )}
          aria-hidden="true"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul
          ref={listRef}
          id={`${testId}-listbox`}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'absolute left-0 right-0 z-50 mt-1.5 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-lg',
            !reduceMotion && 'animate-in fade-in slide-in-from-top-2 duration-150',
          )}
        >
          {filtered.map((city, i) => {
            const isUser = userCity && normalizePlaceText(city) === normalizePlaceText(userCity);
            return (
              <li
                key={city}
                role="option"
                aria-selected={value === city}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(city);
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors',
                  i === activeIdx || value === city
                    ? 'bg-primary/10 text-foreground'
                    : 'text-foreground/85 hover:bg-muted',
                )}
                data-testid={`${testId}-option-${i}`}
              >
                <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden="true" />
                <span className="flex-1 truncate">{city}</span>
                {isUser && (
                  <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    Sua cidade
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <p
          className="absolute left-0 right-0 z-50 mt-1.5 rounded-2xl border border-border bg-card p-4 text-center text-xs text-muted-foreground shadow-lg"
          role="status"
        >
          Nenhuma cidade conhecida para "{query}". Limpe o filtro para ver todos os pets.
        </p>
      )}
    </div>
  );
}
