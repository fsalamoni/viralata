/**
 * @fileoverview SmartSearchBar — input com debounce para Smart Search (Fase 18).
 *
 * Componente puro de UI. Consome o hook `useDebouncedQuery` (do
 * `@/modules/shelter/hooks/useSmartSearch`) e dispara
 * `onSearch(query)` quando o valor estabiliza.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 18
 */

import * as React from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/core/lib/utils';
import { useDebouncedQuery, DEBOUNCE_MS_FOR_QUERY } from '@/modules/shelter/hooks/useSmartSearch';

/**
 * @param {object} props
 * @param {string} [props.initialValue] valor inicial controlado
 * @param {(query: string) => void} props.onSearch callback debounced
 * @param {(query: string) => void} [props.onChange] callback imediato
 * @param {string} [props.placeholder] placeholder do input
 * @param {number} [props.debounceMs] delay do debounce
 * @param {string} [props.className] classes extras
 * @param {boolean} [props.autoFocus]
 * @param {boolean} [props.disabled]
 * @returns {JSX.Element}
 */
export function SmartSearchBar({
  initialValue = '',
  onSearch,
  onChange,
  placeholder = 'Buscar animais, adotantes, abrigos...',
  debounceMs = DEBOUNCE_MS_FOR_QUERY,
  className,
  autoFocus = false,
  disabled = false,
}) {
  const { value, setValue, isDebouncing } = useDebouncedQuery(initialValue, debounceMs);

  // Dispara onSearch quando o debounced value muda
  const onSearchRef = React.useRef(onSearch);
  React.useEffect(() => {
    onSearchRef.current = onSearch;
  }, [onSearch]);

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Dispara o search no debounced
  const [debouncedValue, setDebouncedValue] = React.useState(initialValue);
  React.useEffect(() => {
    // Ignora a primeira atualização (montagem)
    if (debouncedValue === value) {
      // Mas sempre chama o onChange para o pai saber
      onChangeRef.current?.(value);
      return;
    }
    setDebouncedValue(value);
    onChangeRef.current?.(value);
    onSearchRef.current?.(value);
  }, [value, debouncedValue]);

  const handleClear = React.useCallback(() => {
    setValue('');
  }, [setValue]);

  return (
    <div className={cn('relative w-full', className)}>
      <Search
        aria-hidden="true"
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
      />
      <Input
        type="search"
        role="searchbox"
        aria-label="Busca inteligente"
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-20"
      />
      <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {isDebouncing && (
          <Loader2
            className="h-4 w-4 animate-spin text-muted-foreground"
            aria-label="Buscando"
          />
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            aria-label="Limpar busca"
            className="h-7 w-7 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default SmartSearchBar;
