import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit2, Settings, X, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/core/lib/utils';
import { useClubLedger, useCreateLedgerEntry, useDeleteLedgerEntry } from '../hooks/useClubs';
import {
  useClubLedgerCategories,
  useCreateLedgerCategory,
  useUpdateLedgerCategory,
  useDeleteLedgerCategory,
} from '../hooks/useClubLedgerCategories';
import {
  LEDGER_TYPE,
  LEDGER_CATEGORY_PRESETS,
  FINANCE_PERIOD,
  FINANCE_PERIOD_LABELS,
  FINANCE_LIMITS,
} from '../domain/constants';

const brl = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

/** Para `FINANCE_PERIOD.FULL`, retorna o range "tudo". */
function periodRange(period, { year, month, semester }) {
  if (period === FINANCE_PERIOD.FULL) {
    return { since: '0000-00-00', until: '9999-12-31' };
  }
  let start; let end;
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
  if (period === FINANCE_PERIOD.FULL) return 'Todo o histórico';
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

/**
 * Aba "Prestação de Contas" da ONG.
 *
 * Funcionalidades:
 *  - 4 janelas de agregação: Integral, Mensal, Semestral, Anual
 *  - Cards de totais: receitas, despesas, saldo
 *  - Gráfico de evolução temporal (mensal) — receitas e despesas
 *  - Quebra por categoria (receitas e despesas)
 *  - Lista de lançamentos do período
 *  - Categorias customizáveis (apenas para a equipe com permissão `finance`)
 *  - Modo somente leitura para quem não tem a permissão `finance` (sem
 *    botões de criar/excluir; os lançamentos já cadastrados seguem visíveis).
 */
export default function ClubFinanceTab({ clubId, canManage = false }) {
  const { data: entries = [], isLoading } = useClubLedger(clubId);
  const createEntry = useCreateLedgerEntry(clubId);
  const deleteEntry = useDeleteLedgerEntry(clubId);
  const { data: customCategories = [] } = useClubLedgerCategories(clubId);
  const now = new Date();
  const currentYear = now.getFullYear();
  const [period, setPeriod] = useState(FINANCE_PERIOD.MONTHLY);
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(now.getMonth());
  const [semester, setSemester] = useState(now.getMonth() < 6 ? 1 : 2);
  const [createOpen, setCreateOpen] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

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

  const filtered = useMemo(() => entries.filter((entry) => {
    const d = String(entry.date || '');
    return d >= since && d < until;
  }), [entries, since, until]);

  const revenueEntries = filtered.filter((e) => e.type === LEDGER_TYPE.REVENUE);
  const expenseEntries = filtered.filter((e) => e.type === LEDGER_TYPE.EXPENSE);
  const revenueTotal = revenueEntries.reduce((sum, e) => sum + Number(e.value || 0), 0);
  const expenseTotal = expenseEntries.reduce((sum, e) => sum + Number(e.value || 0), 0);
  const balance = revenueTotal - expenseTotal;
  const revenueByCategory = categoryBreakdown(revenueEntries, revenueTotal);
  const expenseByCategory = categoryBreakdown(expenseEntries, expenseTotal);

  // Categorias disponíveis = presets + customizadas, deduplicadas.
  const availableCategories = useMemo(() => {
    const map = new Map();
    Object.values(LEDGER_TYPE).forEach((type) => {
      (LEDGER_CATEGORY_PRESETS[type] || []).forEach((label) => {
        if (!map.has(`${type}::${label}`)) map.set(`${type}::${label}`, { type, label, is_preset: true });
      });
    });
    customCategories.forEach((c) => {
      if (!c.type || !c.label) return;
      map.set(`${c.type}::${c.label}`, { type: c.type, label: c.label, is_preset: false, id: c.id });
    });
    return Array.from(map.values());
  }, [customCategories]);

  const categoryOptions = useMemo(
    () => availableCategories.filter((c) => c.type === form.type).map((c) => c.label),
    [availableCategories, form.type],
  );

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
    // space-y-7 entre as seções principais: dá respiração
    // adequada entre o topo (período + cards de totais),
    // o gráfico, e as listas por categoria.
    <div className="space-y-7">
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
        {canManage && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowCategories(true)}>
              <Settings className="mr-1.5 h-4 w-4" /> Categorias
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Novo lançamento
            </Button>
          </div>
        )}
      </div>

      {period !== FINANCE_PERIOD.FULL && (
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
      )}

      {/* Cards de totais (Receitas/Despesas/Saldo): pt-6 sm:pt-7 garante
          que o label "Receitas"/"Despesas"/"Saldo" NÃO encoste no
          topo do card (a correção do problema reportado pelo usuário).
          CardContent com p-6 e space-y-2 para valor generoso. */}
      <div className="pt-4 sm:pt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <section className="arena-section-card rounded-2xl border-primary/25 bg-primary/8">
          <div className="arena-section-card-body space-y-2 p-6 sm:p-7">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary/70">Receitas</div>
            <div className="text-2xl font-extrabold text-primary sm:text-3xl">{brl(revenueTotal)}</div>
          </div>
        </section>
        <section className="arena-section-card rounded-2xl border-destructive/20 bg-destructive/5">
          <div className="arena-section-card-body space-y-2 p-6 sm:p-7">
            <div className="text-xs font-semibold uppercase tracking-wider text-destructive/80">Despesas</div>
            <div className="text-2xl font-extrabold text-destructive sm:text-3xl">{brl(expenseTotal)}</div>
          </div>
        </section>
        <section className="arena-section-card rounded-2xl">
          <div className="arena-section-card-body space-y-2 p-6 sm:p-7">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saldo</div>
            <div className={cn('text-2xl font-extrabold sm:text-3xl', balance >= 0 ? 'text-primary' : 'text-destructive')}>
              {brl(balance)}
            </div>
          </div>
        </section>
      </div>

      <TimelineChart entries={entries} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CategoryList title="Receitas por categoria" rows={revenueByCategory} barClassName="bg-primary" />
        <CategoryList title="Despesas por categoria" rows={expenseByCategory} barClassName="bg-destructive" />
      </div>

      {filtered.length > 0 && (
        <section className="arena-section-card rounded-2xl">
          <div className="arena-section-card-body divide-y p-0">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', entry.type === LEDGER_TYPE.REVENUE ? 'bg-primary' : 'bg-destructive')} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{entry.category}{entry.note ? ` — ${entry.note}` : ''}</div>
                  <div className="text-xs text-muted-foreground">{entry.date}</div>
                </div>
                <span className={cn('shrink-0 text-sm font-semibold', entry.type === LEDGER_TYPE.REVENUE ? 'text-primary' : 'text-destructive')}>
                  {entry.type === LEDGER_TYPE.REVENUE ? '+' : '-'}{brl(entry.value)}
                </span>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                    title="Remover lançamento"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
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
                <Input id="ledger_value" type="number" min={FINANCE_LIMITS.VALUE_MIN} step="0.01" value={form.value} onChange={setField('value')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ledger_date">Data *</Label>
                <Input id="ledger_date" type="date" value={form.date} onChange={setField('date')} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ledger_note">Observação</Label>
              <Input id="ledger_note" value={form.note} onChange={setField('note')} maxLength={FINANCE_LIMITS.NOTE_MAX} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createEntry.isPending || !form.category}>
                {createEntry.isPending ? 'Salvando…' : 'Registrar lançamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showCategories && (
        <CategoriesDialog
          clubId={clubId}
          customCategories={customCategories}
          onClose={() => setShowCategories(false)}
        />
      )}
    </div>
  );
}

function CategoryList({ title, rows, barClassName }) {
  return (
    <section className="arena-section-card rounded-2xl">
      {/* p-6 sm:p-7 com pt-6 garante que o título "Receitas por
          categoria" não encoste no topo do card. Lista interna
          com space-y-3.5 pra dar respiração entre as linhas. */}
      <div className="arena-section-card-body space-y-4 p-6 pt-6 sm:p-7 sm:pt-7">
        <h3 className="text-sm font-semibold">{title}</h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>
        ) : (
          <div className="space-y-3.5">
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
      </div>
    </section>
  );
}

/* ============================== Gráfico de evolução temporal ============================== */

function buildMonthlySeries(entries) {
  const map = new Map();
  entries.forEach((e) => {
    const ym = String(e.date || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) return;
    if (!map.has(ym)) map.set(ym, { ym, revenue: 0, expense: 0, balance: 0 });
    const bucket = map.get(ym);
    if (e.type === LEDGER_TYPE.REVENUE) bucket.revenue += Number(e.value || 0);
    else if (e.type === LEDGER_TYPE.EXPENSE) bucket.expense += Number(e.value || 0);
    bucket.balance = bucket.revenue - bucket.expense;
  });
  return Array.from(map.values()).sort((a, b) => a.ym.localeCompare(b.ym));
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function TimelineChart({ entries }) {
  const series = useMemo(() => buildMonthlySeries(entries), [entries]);
  if (series.length < 2) {
    // Empty state maior e centralizado vertical/horizontal — fica
    // visualmente claro como "aguarde mais dados" sem encostar nas
    // bordas do card de saldo acima.
    return (
      <section className="arena-section-card rounded-2xl">
        <div className="arena-section-card-body flex min-h-[160px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
          <p className="max-w-xs">
            {series.length === 0
              ? 'Sem dados ainda para gerar o gráfico de evolução. Conforme você registrar lançamentos, a linha aparece aqui.'
              : 'É preciso pelo menos 2 meses de dados para mostrar a evolução.'}
          </p>
        </div>
      </section>
    );
  }

  const W = 600; const H = 200;
  const PAD_X = 32; const PAD_Y = 24;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const maxY = Math.max(1, ...series.flatMap((d) => [d.revenue, d.expense]));
  const xFor = (i) => series.length === 1 ? PAD_X : PAD_X + (i / (series.length - 1)) * innerW;
  const yFor = (v) => PAD_Y + innerH - (v / maxY) * innerH;
  const path = (key) => series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`).join(' ');
  const area = (key) => {
    const top = series.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`).join(' ');
    const bottom = ` L ${xFor(series.length - 1).toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(PAD_Y + innerH).toFixed(1)} Z`;
    return top + bottom;
  };

  return (
    <section className="arena-section-card rounded-2xl">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title">Evolução mensal</h3>
        <p className="arena-section-card-description">Receitas e despesas ao longo dos meses</p>
      </div>
      <div className="arena-section-card-body p-6 pt-0 sm:p-7 sm:pt-0">
        <div className="overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-48 w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label="Gráfico de evolução mensal"
          >
            <line
              x1={PAD_X}
              y1={PAD_Y + innerH}
              x2={W - PAD_X}
              y2={PAD_Y + innerH}
              stroke="currentColor"
              strokeWidth="1"
              className="text-border"
            />
            <path d={area('revenue')} fill="hsl(150 38% 50% / 0.18)" />
            <path d={path('revenue')} fill="none" stroke="hsl(150 38% 36%)" strokeWidth="2" />
            <path d={path('expense')} fill="none" stroke="hsl(9 62% 46%)" strokeWidth="2" strokeDasharray="4 3" />
            {series.map((d, i) => (
              <circle key={`r-${i}`} cx={xFor(i)} cy={yFor(d.revenue)} r="3" fill="hsl(150 38% 36%)" />
            ))}
            {series.map((d, i) => (
              <circle key={`e-${i}`} cx={xFor(i)} cy={yFor(d.expense)} r="3" fill="hsl(9 62% 46%)" />
            ))}
            {series.map((d, i) => {
              const [, mm] = d.ym.split('-');
              return (
                <text
                  key={`x-${i}`}
                  x={xFor(i)}
                  y={H - 6}
                  fontSize="9"
                  textAnchor="middle"
                  className="fill-muted-foreground"
                >
                  {MONTH_SHORT[Number(mm) - 1]}/{d.ym.slice(2, 4)}
                </text>
              );
            })}
            <text x={PAD_X - 4} y={PAD_Y + 4} fontSize="9" textAnchor="end" className="fill-muted-foreground">
              {brl(maxY).replace('R$', '')}
            </text>
            <text x={PAD_X - 4} y={PAD_Y + innerH} fontSize="9" textAnchor="end" className="fill-muted-foreground">
              0
            </text>
          </svg>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm" style={{ background: 'hsl(150 38% 36%)' }} /> Receitas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3" style={{ background: 'hsl(9 62% 46%)', borderTop: '2px dashed hsl(9 62% 46%)' }} /> Despesas
          </span>
        </div>
      </div>
    </section>
  );
}

/* ============================== Gestão de categorias customizadas ============================== */

function CategoriesDialog({ clubId, customCategories, onClose }) {
  const createCategory = useCreateLedgerCategory(clubId);
  const updateCategory = useUpdateLedgerCategory(clubId);
  const deleteCategory = useDeleteLedgerCategory(clubId);
  const [newCat, setNewCat] = useState({ type: LEDGER_TYPE.REVENUE, label: '' });
  const [editing, setEditing] = useState(null);
  const setNewField = (key) => (e) => setNewCat((p) => ({ ...p, [key]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await createCategory.mutateAsync(newCat);
      setNewCat({ type: LEDGER_TYPE.REVENUE, label: '' });
      toast.success('Categoria criada.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível criar a categoria.');
    }
  };

  const handleUpdate = async (category) => {
    try {
      await updateCategory.mutateAsync({ categoryId: category.id, updates: { label: category.label } });
      toast.success('Categoria atualizada.');
      setEditing(null);
    } catch (err) {
      toast.error(err?.message || 'Não foi possível atualizar.');
    }
  };

  const handleDelete = async (category) => {
    try {
      await deleteCategory.mutateAsync(category.id);
      toast.success('Categoria excluída.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível excluir.');
    }
  };

  const byType = (type) => customCategories.filter((c) => c.type === type);

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Categorias customizadas</DialogTitle>
          <DialogDescription>
            Categorias predefinidas (Doações, Alimentação etc.) já estão sempre disponíveis. Adicione categorias extras que a ONG utiliza.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px] space-y-1.5">
            <Label>Tipo</Label>
            <Select value={newCat.type} onValueChange={(v) => setNewCat((p) => ({ ...p, type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={LEDGER_TYPE.REVENUE}>Receita</SelectItem>
                <SelectItem value={LEDGER_TYPE.EXPENSE}>Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-[2] min-w-[180px] space-y-1.5">
            <Label htmlFor="new_cat_label">Rótulo</Label>
            <Input
              id="new_cat_label"
              value={newCat.label}
              onChange={setNewField('label')}
              maxLength={FINANCE_LIMITS.CATEGORY_MAX}
              placeholder="Ex.: Ração, Castração, Patrocínio"
              required
            />
          </div>
          <Button type="submit" disabled={createCategory.isPending}>
            <Plus className="mr-1.5 h-4 w-4" /> Adicionar
          </Button>
        </form>
        <div className="mt-2 space-y-4">
          {([LEDGER_TYPE.REVENUE, LEDGER_TYPE.EXPENSE]).map((type) => (
            <div key={type}>
              <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {type === LEDGER_TYPE.REVENUE ? 'Receitas' : 'Despesas'} — customizadas
              </h4>
              {byType(type).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma categoria customizada.</p>
              ) : (
                <ul className="space-y-1.5">
                  {byType(type).map((c) => (
                    <li key={c.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-2 py-1.5 text-xs">
                      {editing?.id === c.id ? (
                        <>
                          <Input
                            value={editing.label}
                            onChange={(e) => setEditing((p) => ({ ...p, label: e.target.value }))}
                            maxLength={FINANCE_LIMITS.CATEGORY_MAX}
                            className="h-7 flex-1"
                          />
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleUpdate(editing)} aria-label="Salvar">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(null)} aria-label="Cancelar">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="rounded-full">{c.label}</Badge>
                          <span className="ml-auto flex">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(c)} aria-label="Editar">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(c)} aria-label="Excluir">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
