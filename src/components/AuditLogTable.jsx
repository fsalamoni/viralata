import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { db } from '@/core/config/firebase';
import { AUDIT_ACTION_LABELS, formatAuditDate } from '@/core/services/auditService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const PAGE_SIZES = [10, 50, 100];
const DATE_BOUNDARY = Object.freeze({
  START: 'start',
  END: 'end',
});

export function AuditLogTable({ title, description, userId, className = '' }) {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({
    actor: '',
    target: '',
    action: 'all',
    startDate: '',
    endDate: '',
    search: '',
  });
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    const constraints = [];
    if (userId) constraints.push(where('user_id', '==', userId));
    const q = query(collection(db, 'audit_logs'), ...constraints);

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setLogs(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.created_at_ms || 0) - (a.created_at_ms || 0)),
        );
        setError(null);
      },
      (err) => setError(err.message),
    );

    return () => unsubscribe();
  }, [userId]);

  const filteredLogs = useMemo(() => {
    const startMs = toDateBoundaryMs(filters.startDate, DATE_BOUNDARY.START);
    const endMs = toDateBoundaryMs(filters.endDate, DATE_BOUNDARY.END);
    const term = filters.search.trim().toLowerCase();
    const actorTerm = filters.actor.trim().toLowerCase();
    const targetTerm = filters.target.trim().toLowerCase();
    return logs.filter((log) => {
      const createdAtMs = Number(log.created_at_ms || 0);
      const action = log.action || '';
      const actorText = [
        log.actor_name,
        log.actor_email,
        log.actor_id,
      ].filter(Boolean).join(' ').toLowerCase();
      const targetText = [
        log.user_name,
        log.user_email,
        log.user_id,
      ].filter(Boolean).join(' ').toLowerCase();
      const genericText = [
        log.log_number,
        log.action_label,
        AUDIT_ACTION_LABELS[action],
        action,
        stringifyDetails(log.details),
      ].filter(Boolean).join(' ').toLowerCase();

      const matchesActor = !actorTerm || actorText.includes(actorTerm);
      const matchesTarget = !targetTerm || targetText.includes(targetTerm);
      const matchesAction = filters.action === 'all' || action === filters.action;
      const matchesStart = startMs === null || createdAtMs >= startMs;
      const matchesEnd = endMs === null || createdAtMs <= endMs;
      const matchesSearch = !term || genericText.includes(term);

      return matchesActor && matchesTarget && matchesAction && matchesStart && matchesEnd && matchesSearch;
    });
  }, [logs, filters]);

  const actionOptions = useMemo(() => {
    const seen = new Set();
    return logs
      .map((log) => log.action)
      .filter(Boolean)
      .filter((action) => {
        if (seen.has(action)) return false;
        seen.add(action);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [logs]);

  const pageCount = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleLogs = filteredLogs.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters, pageSize]);

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardHeader className="border-b border-border bg-card p-6 sm:p-7">
        <CardTitle className="text-base text-foreground">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4 p-6 sm:p-7">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <FilterInput label="Ator" value={filters.actor} onChange={(value) => updateFilter(setFilters, 'actor', value)} placeholder="Nome, e-mail ou UID" />
          <FilterInput label="Alvo" value={filters.target} onChange={(value) => updateFilter(setFilters, 'target', value)} placeholder="Usuário afetado" />
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            <span>Tipo de ação</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={filters.action}
              onChange={(e) => updateFilter(setFilters, 'action', e.target.value)}
            >
              <option value="all">Todas</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {AUDIT_ACTION_LABELS[action] || action}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            <span>Período inicial</span>
            <Input type="date" value={filters.startDate} onChange={(e) => updateFilter(setFilters, 'startDate', e.target.value)} />
          </label>
          <label className="space-y-1 text-xs font-medium text-muted-foreground">
            <span>Período final</span>
            <Input type="date" value={filters.endDate} onChange={(e) => updateFilter(setFilters, 'endDate', e.target.value)} />
          </label>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]">
          <FilterInput label="Busca geral" value={filters.search} onChange={(value) => updateFilter(setFilters, 'search', value)} placeholder="Nº do log, ação ou detalhes" />
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              className="w-full md:w-auto"
              onClick={() => setFilters({
                actor: '',
                target: '',
                action: 'all',
                startDate: '',
                endDate: '',
                search: '',
              })}
            >
              Limpar filtros
            </Button>
          </div>
        </div>

        <div className="arena-table-wrap">
          <table className="min-w-[980px] w-full text-sm">
            <caption className="sr-only">Lista de registros de auditoria da plataforma</caption>
            <thead>
              <tr className="border-b border-border bg-secondary text-left text-secondary-foreground">
                <th className="py-3 pl-4 pr-3 font-semibold">Nº</th>
                <th className="py-3 px-3 font-semibold">Usuário</th>
                <th className="py-3 px-3 font-semibold">Data e horário</th>
                <th className="py-3 px-3 font-semibold">Ação realizada</th>
                <th className="py-3 px-3 font-semibold">Informações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {visibleLogs.map((log) => (
                <tr key={log.id} className="transition-colors hover:bg-secondary/50">
                  <td className="py-3 pl-4 pr-3 font-mono text-xs text-muted-foreground">{log.log_number || '—'}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-foreground">{log.user_name || log.actor_name || '—'}</div>
                    <div className="text-xs text-muted-foreground">{log.user_email || log.actor_email || ''}</div>
                  </td>
                  <td className="py-3 px-3 text-foreground/80">{formatAuditDate(log.created_at, log.created_at_ms)}</td>
                  <td className="py-3 px-3 font-medium text-foreground">
                    {log.action_label || AUDIT_ACTION_LABELS[log.action] || log.action}
                  </td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{stringifyDetails(log.details)}</td>
                </tr>
              ))}
              {!visibleLogs.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum log encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Registros por página</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              aria-label="Registros por página"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
            <span>{filteredLogs.length} registro(s)</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">Página</span>
            <Input
              type="number"
              min="1"
              max={pageCount}
              aria-label="Número da página"
              value={safePage}
              onChange={(e) => setPage(Math.max(1, Math.min(pageCount, Number(e.target.value) || 1)))}
              className="h-9 w-20"
            />
            <span className="text-sm text-muted-foreground">de {pageCount}</span>
            <Button type="button" variant="outline" size="sm" disabled={safePage >= pageCount} onClick={() => setPage((p) => p + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterInput({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-muted-foreground/80" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="pl-8" placeholder={placeholder} />
      </div>
    </label>
  );
}

function updateFilter(setFilters, key, value) {
  setFilters((prev) => ({ ...prev, [key]: value }));
}

function stringifyDetails(details) {
  if (!details) return '';
  if (typeof details === 'string') return details;
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${formatDetailValue(value)}`)
    .join(' · ');
}

function formatDetailValue(value) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function toDateBoundaryMs(raw, boundary) {
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  if (boundary === DATE_BOUNDARY.START) date.setHours(0, 0, 0, 0);
  else date.setHours(23, 59, 59, 999);
  return date.getTime();
}
