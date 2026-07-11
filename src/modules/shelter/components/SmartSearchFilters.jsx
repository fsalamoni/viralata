/**
 * @fileoverview SmartSearchFilters — painel de filtros da busca (Fase 18).
 *
 * Componente controlado. Recebe `filters` + `onChange(filters)`.
 * Renderiza:
 *  - Seletor de entity (se habilitado)
 *  - Input de status (free text)
 *  - Seletor de species (apenas se entity=pet ou sem entity)
 *  - Date range (from/to)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 18
 */

import * as React from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/core/lib/utils';
import { getSearchableEntities } from '@/modules/shelter/domain/search';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Cão' },
  { value: 'cat', label: 'Gato' },
  { value: 'bird', label: 'Ave' },
  { value: 'other', label: 'Outro' },
];

const ENTITY_NONE_VALUE = '__all__';
const SPECIES_NONE_VALUE = '__any__';

/**
 * @param {object} props
 * @param {object} props.filters filtros atuais
 * @param {(next: object) => void} props.onChange
 * @param {boolean} [props.allowEntitySelector] se false, esconde o seletor
 * @param {boolean} [props.compact] modo compacto
 * @param {string} [props.className]
 * @returns {JSX.Element}
 */
export function SmartSearchFilters({
  filters = {},
  onChange,
  allowEntitySelector = true,
  compact = false,
  className,
}) {
  const entities = getSearchableEntities();

  const update = React.useCallback(
    (patch) => {
      onChange({ ...filters, ...patch });
    },
    [filters, onChange],
  );

  const clear = React.useCallback(() => {
    onChange({});
  }, [onChange]);

  const hasFilters = Boolean(
    filters.entity
    || filters.status
    || filters.species
    || filters.dateRange
    || filters.petId
    || filters.adopterUid,
  );

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className={compact ? 'p-3' : undefined}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Filter className="h-4 w-4" />
          Filtros
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clear}
              className="ml-auto h-6 px-2 text-xs"
              type="button"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-3', compact && 'p-3 pt-0')}>
        {allowEntitySelector && (
          <div className="space-y-1.5">
            <Label htmlFor="filter-entity" className="text-xs">Entidade</Label>
            <Select
              value={filters.entity || ENTITY_NONE_VALUE}
              onValueChange={(v) => update({ entity: v === ENTITY_NONE_VALUE ? undefined : v })}
            >
              <SelectTrigger id="filter-entity">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ENTITY_NONE_VALUE}>Todas</SelectItem>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.label}
                    {e.isPublic ? ' · público' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="filter-status" className="text-xs">Status</Label>
          <Input
            id="filter-status"
            value={filters.status || ''}
            onChange={(e) => update({ status: e.target.value || undefined })}
            placeholder="ex: available, active..."
            className="h-9"
          />
        </div>

        {(!filters.entity || filters.entity === 'pet') && (
          <div className="space-y-1.5">
            <Label htmlFor="filter-species" className="text-xs">Espécie</Label>
            <Select
              value={filters.species || SPECIES_NONE_VALUE}
              onValueChange={(v) => update({ species: v === SPECIES_NONE_VALUE ? undefined : v })}
            >
              <SelectTrigger id="filter-species">
                <SelectValue placeholder="Qualquer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SPECIES_NONE_VALUE}>Qualquer</SelectItem>
                {SPECIES_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="filter-date-from" className="text-xs">De</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={filters.dateRange?.from || ''}
              onChange={(e) => {
                const from = e.target.value;
                const to = filters.dateRange?.to || '';
                if (from || to) {
                  update({ dateRange: { from, to } });
                } else {
                  update({ dateRange: undefined });
                }
              }}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="filter-date-to" className="text-xs">Até</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={filters.dateRange?.to || ''}
              onChange={(e) => {
                const to = e.target.value;
                const from = filters.dateRange?.from || '';
                if (from || to) {
                  update({ dateRange: { from, to } });
                } else {
                  update({ dateRange: undefined });
                }
              }}
              className="h-9"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SmartSearchFilters;
