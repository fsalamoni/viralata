import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/core/lib/utils';
import { useClubLedger, useCreateLedgerEntry, useDeleteLedgerEntry } from '@/modules/organizations/hooks/useClubs';
import { LEDGER_TYPE, LEDGER_CATEGORY_PRESETS, FINANCE_PERIOD, FINANCE_PERIOD_LABELS } from '@/modules/organizations/domain/constants';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Data local (não UTC) no formato YYYY-MM-DD, para comparar com `entry.date`. */
function toLocalISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const MONTH_LABELS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

/**
 * Intervalo [início, fim) de datas locais (YYYY-MM-DD) para o período
 * selecionado. `end` é exclusivo (primeiro dia após o período).
 */
function periodRange(period, { year, month, semester }) {
  let start;
  let end;
  if (period === FINANCE_PERIOD.MONTHLY) {
    start = new Date(year, month, 1);
    end = new Date(year, month + 1, 1);
  } else if (period === FINANCE_PERIOD.SEMIANNUAL) {
    const startMonth = semester === 2 ? 6 : 0;
    start = new Date(year, startMonth, 1);
    end = new Date(year, startMonth + 6, 1);
  } else {
    start = new Date(year, 0, 1);
    end = new Date(year + 1, 0, 1);
  }
  return { since: toLocalISODate(start), until: toLocalISODate(end) };
}

function periodLabel(period, { year, month, semester }) {
  if (period === FINANCE_PERIOD.MONTHLY) return `${MONTH_LABELS[month]} de ${year}`;
  if (period === FINANCE_PERIOD.SEMIANNUAL) return `${semester}º semestre de ${year}`;
  return `Ano de ${year}`;
}

function categoryBreakdown(entries, total) {
  const byCategory = new Map();
  entries.forEach((entry) => {
    byCategory.set(entry.category, (byCategory.get(entry.category) || 0) + Number(entry.value || 0));
  });
  return Array.from(byCategory.entries())
    .map(([label, value]) => ({ label, value, pct: total > 0 ? Math.round((value / total) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);
}

const EMPTY_FORM = { type: LEDGER_TYPE.REVENUE, category: '', value: '', date: toLocalISODate(new Date()), note: '' };

export default function ClubFinanceTab({ clubId }) {
  const { data: entries = [], isLoading } = useClubLedger(clubId);
  const createEntry = useCreateLedgerEntry(clubId);
  const deleteEntry = useDeleteLedgerEntry(clubId);
  const now = new Date();
  const currentYear = now.getFullYear();
  const [period, setPeriod] = useState(FINANCE_PERIOD.MONTHLY);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(now.getMonth());
  const [semester, setSemester] = useState(now.getMonth() < 6 ? 1 : 2);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  // Histórico desde a criação da organização: as opções de ano vão do ano do
  // lançamento mais antigo (ou do ano atual, se ainda não houver nada) até hoje.
  const yearOptions = useMemo(() => {
    let earliest = currentYear;
    entries.forEach((entry) => {
      const y = Number(String(entry.date || '').slice(0, 4));
      if (y && y < earliest) earliest = y;
    });
    const list = [];
    for (let y = currentYear; y >= earliest; y -= 1) list.push(y);
    return list;
  }, [entries, currentYear]);

  const { since, until } = useMemo(
    () => periodRange(period, { year, month, semester }),
    [period, year, month, semester],
  );

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      const d = String(entry.date || '');
      return d >= since && d < until;
    });
  }, [entries, since, until]);

  const revenueEntries = filtered.filter((e) => e.type === LEDGER_TYPE.REVENUE);
  const expenseEntries = filtered.filter((e) => e.type === LEDGER_TYPE.EXPENSE);
  const revenueTotal = revenueEntries.reduce((sum, e) => sum + Number(e.value || 0), 0);
  const expenseTotal = expenseEntries.reduce((sum, e) => sum + Number(e.value || 0), 0);
  const balance = revenueTotal - expenseTotal;
  const revenueByCategory = categoryBreakdown(revenueEntries, revenueTotal);
  const expenseByCategory = categoryBreakdown(expenseEntries, expenseTotal);

  const categoryOptions = LEDGER_CATEGORY_PRESETS[form.type] || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createEntry.mutateAsync(form);
      toast.success('Lançamento registrado.');
      setForm({ ...EMPTY_FORM, type: form.type });
      setCreateOpen(false);
    } catch (err) {
      toast.error(err.message || 'Não foi possível registrar o lançamento.');
    }
  };

  const handleDelete = async (entryId) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success('Lançamento removido.');
    } catch (err) {
      toast.error(err.message || 'Não foi possível remover o lançamento.');
    }
  };

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {Object.values(FINANCE_PERIOD).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
                period === p ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground hover:bg-secondary/60',
              )}
            >
              {FINANCE_PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> Novo lançamento
        </Button>
      </div>

      {/* Seleção de mês/semestre/ano — histórico desde a criação da organização */}
      <div className="flex flex-wrap items-center gap-2">
        {period === FINANCE_PERIOD.MONTHLY && (
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((label, i) => <SelectItem key={label} value={String(i)}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {period === FINANCE_PERIOD.SEMIANNUAL && (
          <Select value={String(semester)} onValueChange={(v) => setSemester(Number(v))}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1º semestre</SelectItem>
              <SelectItem value="2">2º semestre</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs font-medium text-muted-foreground">
          {periodLabel(period, { year, month, semester })}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-2xl border-[hsl(150_38%_36%/0.25)] bg-[hsl(150_38%_36%/0.08)]">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-[hsl(150_38%_26%)]">Receitas</div>
            <div className="mt-1 text-xl font-bold text-[hsl(150_38%_24%)]">{brl(revenueTotal)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-[hsl(9_62%_46%/0.22)] bg-[hsl(9_62%_46%/0.07)]">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-[hsl(9_62%_38%)]">Despesas</div>
            <div className="mt-1 text-xl font-bold text-[hsl(9_62%_36%)]">{brl(expenseTotal)}</div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div className="text-xs font-semibold text-muted-foreground">Saldo</div>
            <div className={cn('mt-1 text-xl font-bold', balance >= 0 ? 'text-[hsl(150_38%_24%)]' : 'text-[hsl(9_62%_36%)]')}>
              {brl(balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CategoryList title="Receitas por categoria" rows={revenueByCategory} barClassName="bg-[hsl(150_38%_40%)]" />
        <CategoryList title="Despesas por categoria" rows={expenseByCategory} barClassName="bg-[hsl(9_62%_50%)]" />
      </div>

      {filtered.length > 0 && (
        <Card className="rounded-2xl">
          <CardContent className="divide-y p-0">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', entry.type === LEDGER_TYPE.REVENUE ? 'bg-[hsl(150_38%_40%)]' : 'bg-[hsl(9_62%_50%)]')} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{entry.category}{entry.note ? ` — ${entry.note}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{entry.date}</div>
                </div>
                <span className={cn('shrink-0 text-sm font-semibold', entry.type === LEDGER_TYPE.REVENUE ? 'text-[hsl(150_38%_24%)]' : 'text-[hsl(9_62%_36%)]')}>
                  {entry.type === LEDGER_TYPE.REVENUE ? '+' : '-'}{brl(entry.value)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  title="Remover lançamento"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo lançamento</DialogTitle>
            <DialogDescription>Registre uma receita ou despesa da organização.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((prev) => ({ ...prev, type: v, category: '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LEDGER_TYPE.REVENUE}>Receita</SelectItem>
                    <SelectItem value={LEDGER_TYPE.EXPENSE}>Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((prev) => ({ ...prev, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ledger_value">Valor (R$) *</Label>
                <Input id="ledger_value" type="number" min="0.01" step="0.01" value={form.value} onChange={setField('value')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ledger_date">Data *</Label>
                <Input id="ledger_date" type="date" value={form.date} onChange={setField('date')} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger_note">Observação</Label>
              <Input id="ledger_note" value={form.note} onChange={setField('note')} maxLength={200} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createEntry.isPending || !form.category}>
                {createEntry.isPending ? 'Salvando…' : 'Registrar lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryList({ title, rows, barClassName }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 sm:p-5">
        <h3 className="mb-3 text-sm font-semibold">{title}</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{row.label}</span>
                  <strong>{brl(row.value)}</strong>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className={cn('h-full rounded-full', barClassName)} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
