/**
 * @fileoverview PetOpsTable — tabela operacional agregada e reutilizável do
 * abrigo (SHELTER_PET_OPS_TABLES_V1).
 *
 * Config-driven: recebe os registros já agregados (via useShelterPetRecords),
 * o campo de data nativo e a definição de colunas. Renderiza:
 *  - Banner de alertas (agendamentos próximos + atrasados).
 *  - Filtros: busca por pet, filtro de status (Todas/Realizadas/Agendadas/
 *    Atrasadas) e filtro por pet.
 *  - Colunas ordenáveis (Pet, Data efetiva, + colunas do config).
 *  - Badge de status + rótulo de proximidade em cada linha.
 *  - Ações (marcar realizada / editar / excluir) para gestores.
 *
 * Não faz fetch nem conhece a subcoleção — 100% apresentação.
 */
import { useMemo, useState } from 'react';
import { Search, ChevronUp, ChevronDown, AlertTriangle, CalendarClock, RefreshCw, Check, Pencil, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/core/lib/utils';
import {
  PET_OPS_RECORD_STATUS,
  PET_OPS_STATUS_LABELS,
  effectiveDate,
  recordStatus,
  proximityLabel,
  isUpcoming,
  summarizeAlerts,
} from '@/modules/shelter/domain/operational/petOpsScheduling';

const STATUS_TONES = {
  done: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  overdue: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
};

const STATUS_FILTERS = [
  { key: 'all', label: 'Todas' },
  { key: PET_OPS_RECORD_STATUS.DONE, label: 'Realizadas' },
  { key: PET_OPS_RECORD_STATUS.SCHEDULED, label: 'Agendadas' },
  { key: PET_OPS_RECORD_STATUS.OVERDUE, label: 'Atrasadas' },
];

function fmtDate(d) {
  if (!d) return '—';
  try {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function PetOpsTable({
  title,
  records = [],
  isLoading = false,
  isError = false,
  refetch,
  dateField,
  dateLabel = 'Data',
  columns = [],
  canManage = false,
  onAdd,
  onEdit,
  onDelete,
  onComplete,
  emptyIcon,
  emptyHint = 'Nenhum registro ainda.',
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState('_date');
  const [sortDir, setSortDir] = useState('desc');

  const alerts = useMemo(() => summarizeAlerts(records, new Date(), undefined, dateField), [records, dateField]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = records.map((r) => ({
      ...r,
      _effDate: effectiveDate(r, dateField),
      _status: recordStatus(r, new Date(), dateField),
      _proximity: proximityLabel(r, new Date(), dateField),
    }));
    if (q) {
      list = list.filter((r) => `${r._petName || ''} ${r._petSeqLabel || ''}`.toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => r._status === statusFilter);
    }
    list.sort((a, b) => {
      let av;
      let bv;
      if (sortKey === '_date') {
        av = a._effDate ? a._effDate.getTime() : 0;
        bv = b._effDate ? b._effDate.getTime() : 0;
      } else if (sortKey === '_pet') {
        av = String(a._petName || '').toLowerCase();
        bv = String(b._petName || '').toLowerCase();
      } else if (sortKey === '_status') {
        av = a._status;
        bv = b._status;
      } else {
        const col = columns.find((c) => c.key === sortKey);
        av = col?.sortValue ? col.sortValue(a) : String(a[sortKey] ?? '').toLowerCase();
        bv = col?.sortValue ? col.sortValue(b) : String(b[sortKey] ?? '').toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [records, search, statusFilter, sortKey, sortDir, dateField, columns]);

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === '_date' ? 'desc' : 'asc');
    }
  }

  function SortHeader({ k, children, className }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => handleSort(k)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors',
          active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
          className,
        )}
      >
        {children}
        {active ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : null}
      </button>
    );
  }

  return (
    <section className="space-y-4" aria-label={title}>
      {/* Header + ação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {canManage && onAdd && (
          <Button size="sm" onClick={onAdd}>Novo registro</Button>
        )}
      </div>

      {/* Banner de alertas */}
      {(alerts.upcoming > 0 || alerts.overdue > 0) && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm dark:border-amber-900/40 dark:bg-amber-900/20">
          {alerts.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              {alerts.overdue} {alerts.overdue === 1 ? 'atrasada' : 'atrasadas'}
            </span>
          )}
          {alerts.upcoming > 0 && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
              <CalendarClock className="h-4 w-4" aria-hidden="true" />
              {alerts.upcoming} {alerts.upcoming === 1 ? 'próxima' : 'próximas'} (7 dias)
            </span>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por pet…"
            className="pl-9"
            aria-label="Buscar por pet"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.key}
              size="sm"
              variant={statusFilter === f.key ? 'default' : 'outline'}
              onClick={() => setStatusFilter(f.key)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      {isError ? (
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os registros.{' '}
          {refetch && (
            <button type="button" className="underline" onClick={() => refetch()}>Tentar de novo</button>
          )}
        </p>
      ) : isLoading ? (
        <div className="space-y-2" aria-busy="true">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={emptyIcon} title="Nenhum registro" description={search || statusFilter !== 'all' ? 'Nenhum registro para o filtro atual.' : emptyHint} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white bg-card shadow-sm dark:border-white/10">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/60">
                <TableHead className="px-3 py-3"><SortHeader k="_pet">Pet</SortHeader></TableHead>
                <TableHead className="px-3 py-3"><SortHeader k="_date">{dateLabel}</SortHeader></TableHead>
                {columns.map((c) => (
                  <TableHead key={c.key} className="px-3 py-3">
                    {c.sortable === false ? (
                      <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{c.label}</span>
                    ) : (
                      <SortHeader k={c.key}>{c.label}</SortHeader>
                    )}
                  </TableHead>
                ))}
                <TableHead className="px-3 py-3"><SortHeader k="_status">Status</SortHeader></TableHead>
                {canManage && (onEdit || onDelete || onComplete) && (
                  <TableHead className="px-3 py-3 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Ações</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const upcoming = isUpcoming(r, new Date(), undefined, dateField);
                return (
                  <TableRow key={`${r._petId}:${r.id}`} className="transition-colors hover:bg-secondary/40">
                    <TableCell className="px-3 py-2.5">
                      <span className="font-medium">{r._petName}</span>
                      {r._petSeqLabel && (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">{r._petSeqLabel}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 whitespace-nowrap">
                      <span>{fmtDate(r._effDate)}</span>
                      {r._proximity && (
                        <span className={cn(
                          'ml-2 text-xs font-semibold',
                          r._status === PET_OPS_RECORD_STATUS.OVERDUE ? 'text-red-700 dark:text-red-300'
                            : upcoming ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground',
                        )}>
                          {r._proximity}
                        </span>
                      )}
                    </TableCell>
                    {columns.map((c) => (
                      <TableCell key={c.key} className="px-3 py-2.5">
                        {c.render ? c.render(r) : (r[c.key] ?? '—')}
                      </TableCell>
                    ))}
                    <TableCell className="px-3 py-2.5">
                      <Badge className={STATUS_TONES[r._status]}>{PET_OPS_STATUS_LABELS[r._status]}</Badge>
                    </TableCell>
                    {canManage && (onEdit || onDelete || onComplete) && (
                      <TableCell className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          {onComplete && r._status !== PET_OPS_RECORD_STATUS.DONE && (
                            <Button size="icon" variant="ghost" title="Marcar como realizada" aria-label="Marcar como realizada" onClick={() => onComplete(r)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          {onEdit && (
                            <Button size="icon" variant="ghost" title="Editar" aria-label="Editar" onClick={() => onEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {onDelete && (
                            <Button size="icon" variant="ghost" className="text-red-700" title="Excluir" aria-label="Excluir" onClick={() => onDelete(r)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {refetch && !isLoading && !isError && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="text-muted-foreground">
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Atualizar
          </Button>
        </div>
      )}
    </section>
  );
}
