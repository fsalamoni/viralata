/**
 * @fileoverview Componente: ExhibitionOpsPanel (Fase 5 — SHELTER_EXHIBITION_OPS_V1).
 *
 * Gestor integral do evento (vitrine). Renderizado dentro do detalhe da vitrine
 * quando a flag `SHELTER_EXHIBITION_OPS_V1` está ligada — grava tudo de forma
 * ADITIVA no campo `ops` do próprio doc da vitrine (planejamento, logística,
 * mutirão de saúde e fila de tratativas de adoção/doação). Com a flag OFF este
 * componente não é montado e a vitrine atual permanece idêntica.
 *
 * A escala de voluntários (shifts) e o log pós-evento continuam sendo geridos
 * pelo `ExhibitionDetails` — aqui apenas os complementamos.
 */

import { useMemo, useState } from 'react';
import {
  ClipboardList, Truck, Stethoscope, HeartHandshake, Plus, Trash2, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { confirmDialog } from '@/components/ui/confirm-provider';
import { useToast } from '@/components/ui/use-toast';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useExhibition } from '@/modules/shelter/hooks/useExhibitions';
import { useExhibitionOps } from '@/modules/shelter/hooks/useExhibitionOps';
import {
  LOGISTICS_CATEGORY_LABELS,
  LOGISTICS_STATUS,
  LOGISTICS_STATUS_LABELS,
  HEALTH_TASK_TYPE_LABELS,
  HEALTH_TASK_STATUS,
  HEALTH_TASK_STATUS_LABELS,
  ADOPTION_STAGE_LABELS,
  ADOPTION_STAGE_ORDER,
} from '@/modules/shelter/domain/engagement/exhibitionOps';
import {
  computeExhibitionOpsSummary,
  planningChecklist,
  checklistProgress,
  logisticsItems,
  healthTasks,
  sortAdoptionEntries,
} from '@/modules/shelter/domain/engagement/exhibitionOpsView';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_TONE = {
  [LOGISTICS_STATUS.PENDING]: 'bg-amber-100 text-amber-900',
  [LOGISTICS_STATUS.ARRANGED]: 'bg-blue-100 text-blue-900',
  [LOGISTICS_STATUS.DONE]: 'bg-green-100 text-green-900',
  [HEALTH_TASK_STATUS.SCHEDULED]: 'bg-blue-100 text-blue-900',
  [HEALTH_TASK_STATUS.CANCELLED]: 'bg-zinc-200 text-zinc-500 line-through',
};

function toneFor(status) {
  return STATUS_TONE[status] || 'bg-zinc-100 text-zinc-700';
}

function petSuggestions(exhibition) {
  const out = [];
  for (const p of exhibition?.external_pets || []) if (p?.name) out.push(p.name);
  for (const id of exhibition?.pet_ids || []) out.push(`Pet ${id}`);
  return out;
}

// ─── Cabeçalho de resumo ────────────────────────────────────────────────

function OpsSummary({ summary }) {
  const stats = [
    { label: 'Planejamento', value: `${summary.checklist.done}/${summary.checklist.total}`, hint: `${summary.checklist.pct}%` },
    { label: 'Logística', value: summary.logistics.count, hint: BRL.format(summary.logistics.cost_total) },
    { label: 'Mutirão', value: `${summary.health.done}/${summary.health.count}`, hint: 'feitos' },
    { label: 'Tratativas', value: summary.adoption.count, hint: `${summary.adoption.completed} concluídas` },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-lg border bg-card p-3">
          <div className="text-xs text-muted-foreground">{s.label}</div>
          <div className="text-lg font-semibold leading-tight">{s.value}</div>
          <div className="text-xs text-muted-foreground">{s.hint}</div>
        </div>
      ))}
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, children }) {
  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-start gap-2 border-b p-3">
        <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <div>
          <h4 className="text-sm font-semibold">{title}</h4>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </header>
      <div className="space-y-3 p-3">{children}</div>
    </section>
  );
}

// ─── Planejamento ───────────────────────────────────────────────────────

function PlanningSection({ exhibition, ops, actor, disabled }) {
  const { toast } = useToast();
  const checklist = planningChecklist(exhibition);
  const progress = checklistProgress(exhibition);
  const planning = exhibition?.ops?.planning || {};

  const [venue, setVenue] = useState(planning.venue_notes || '');
  const [structure, setStructure] = useState(planning.structure_notes || '');
  const [budget, setBudget] = useState(planning.budget_total ? String(planning.budget_total) : '');
  const [budgetNotes, setBudgetNotes] = useState(planning.budget_notes || '');
  const [newItem, setNewItem] = useState('');

  const savePlanning = async () => {
    try {
      await ops.updatePlanning.mutateAsync({
        input: { venue_notes: venue, structure_notes: structure, budget_total: budget, budget_notes: budgetNotes },
        actor,
      });
      toast({ title: '✓ Planejamento salvo.' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const addItem = async () => {
    const label = newItem.trim();
    if (!label) return;
    try {
      await ops.addChecklistItem.mutateAsync({ label, actor });
      setNewItem('');
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const toggle = async (item) => {
    try {
      await ops.toggleChecklistItem.mutateAsync({ itemId: item.id, done: !item.done, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const remove = async (item) => {
    if (!(await confirmDialog({ title: `Remover "${item.label}"?` }))) return;
    try {
      await ops.removeChecklistItem.mutateAsync({ itemId: item.id, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <SectionCard
      icon={ClipboardList}
      title="Planejamento"
      description="Data, local, estrutura física e orçamento do evento."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ops-venue">Local / espaço</Label>
          <Textarea id="ops-venue" rows={2} value={venue} disabled={disabled}
            onChange={(e) => setVenue(e.target.value)} placeholder="Endereço, autorização de uso, contato do local…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ops-structure">Estrutura física</Label>
          <Textarea id="ops-structure" rows={2} value={structure} disabled={disabled}
            onChange={(e) => setStructure(e.target.value)} placeholder="Tendas, mesas, baias, cercadinhos, banheiros…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ops-budget">Orçamento previsto (R$)</Label>
          <Input id="ops-budget" type="number" min="0" step="0.01" inputMode="decimal" value={budget}
            disabled={disabled} onChange={(e) => setBudget(e.target.value)} placeholder="0,00" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ops-budget-notes">Notas de orçamento</Label>
          <Input id="ops-budget-notes" value={budgetNotes} disabled={disabled}
            onChange={(e) => setBudgetNotes(e.target.value)} placeholder="Patrocínios, rateio, doações…" />
        </div>
      </div>
      {!disabled && (
        <Button size="sm" onClick={savePlanning} disabled={ops.updatePlanning.isPending}>
          <Save className="mr-1.5 h-4 w-4" /> Salvar planejamento
        </Button>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Checklist ({progress.done}/{progress.total})
          </span>
          <span className="text-xs text-muted-foreground">{progress.pct}%</span>
        </div>
        <Progress value={progress.pct} aria-label={`Progresso da checklist: ${progress.pct}%`} />
        <ul className="space-y-1">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-2 rounded-md border p-2">
              <Checkbox
                id={`chk-${item.id}`}
                checked={item.done === true}
                disabled={disabled}
                onCheckedChange={() => toggle(item)}
                aria-label={item.done ? 'Marcar como pendente' : 'Marcar como feito'}
              />
              <label htmlFor={`chk-${item.id}`}
                className={`flex-1 text-sm ${item.done ? 'text-muted-foreground line-through' : ''}`}>
                {item.label}
              </label>
              {!disabled && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(item)}
                  aria-label="Remover item">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </li>
          ))}
          {checklist.length === 0 && (
            <li className="rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
              Nenhum item ainda. Adicione tarefas de preparação do evento.
            </li>
          )}
        </ul>
        {!disabled && (
          <div className="flex gap-2">
            <Input value={newItem} onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
              placeholder="Nova tarefa (ex.: reservar praça, montar tendas)…" aria-label="Nova tarefa da checklist" />
            <Button size="sm" variant="secondary" onClick={addItem} disabled={ops.addChecklistItem.isPending || !newItem.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Adicionar
            </Button>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ─── Logística ──────────────────────────────────────────────────────────

const LOGISTICS_OPTIONS = Object.entries(LOGISTICS_CATEGORY_LABELS);
const LOGISTICS_STATUS_OPTIONS = Object.entries(LOGISTICS_STATUS_LABELS);

function LogisticsSection({ exhibition, ops, actor, disabled }) {
  const { toast } = useToast();
  const items = logisticsItems(exhibition);
  const [form, setForm] = useState({ category: 'transport', label: '', cost: '' });

  const add = async () => {
    if (!form.label.trim()) return;
    try {
      await ops.addLogisticsItem.mutateAsync({ input: { ...form }, actor });
      setForm({ category: 'transport', label: '', cost: '' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const setStatus = async (item, status) => {
    try {
      await ops.updateLogisticsItem.mutateAsync({ itemId: item.id, patch: { status }, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const remove = async (item) => {
    if (!(await confirmDialog({ title: `Remover "${item.label}"?` }))) return;
    try {
      await ops.removeLogisticsItem.mutateAsync({ itemId: item.id, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <SectionCard
      icon={Truck}
      title="Logística"
      description="Transporte, alimentação, água, energia, internet e estrutura."
    >
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <Badge variant="outline" className="shrink-0">{LOGISTICS_CATEGORY_LABELS[item.category] || 'Outro'}</Badge>
            <span className="flex-1 text-sm">{item.label}</span>
            {item.cost > 0 && <span className="text-xs text-muted-foreground">{BRL.format(item.cost)}</span>}
            {disabled ? (
              <Badge className={toneFor(item.status)}>{LOGISTICS_STATUS_LABELS[item.status]}</Badge>
            ) : (
              <Select value={item.status} onValueChange={(v) => setStatus(item, v)}>
                <SelectTrigger className="h-8 w-36" aria-label="Situação do item"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LOGISTICS_STATUS_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {!disabled && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(item)} aria-label="Remover item">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
            Nenhum item de logística. Planeje transporte, alimentação, água, energia e internet.
          </li>
        )}
      </ul>
      {!disabled && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="log-cat" className="text-xs">Categoria</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger id="log-cat" className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOGISTICS_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="log-label" className="text-xs">Item</Label>
            <Input id="log-label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex.: van para 10 pets, 20 marmitas…" />
          </div>
          <div className="w-28 space-y-1">
            <Label htmlFor="log-cost" className="text-xs">Custo (R$)</Label>
            <Input id="log-cost" type="number" min="0" step="0.01" inputMode="decimal" value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0,00" />
          </div>
          <Button size="sm" variant="secondary" onClick={add} disabled={ops.addLogisticsItem.isPending || !form.label.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Mutirão de saúde ───────────────────────────────────────────────────

const HEALTH_TYPE_OPTIONS = Object.entries(HEALTH_TASK_TYPE_LABELS);
const HEALTH_STATUS_OPTIONS = Object.entries(HEALTH_TASK_STATUS_LABELS);

function HealthSection({ exhibition, ops, actor, disabled }) {
  const { toast } = useToast();
  const tasks = healthTasks(exhibition);
  const suggestions = useMemo(() => petSuggestions(exhibition), [exhibition]);
  const [form, setForm] = useState({ pet_name: '', type: 'vaccine' });

  const add = async () => {
    if (!form.pet_name.trim()) return;
    try {
      await ops.addHealthTask.mutateAsync({ input: { ...form }, actor });
      setForm({ pet_name: '', type: 'vaccine' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const setStatus = async (item, status) => {
    try {
      await ops.updateHealthTask.mutateAsync({ itemId: item.id, patch: { status }, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const remove = async (item) => {
    if (!(await confirmDialog({ title: `Remover ${HEALTH_TASK_TYPE_LABELS[item.type]} de ${item.pet_name}?` }))) return;
    try {
      await ops.removeHealthTask.mutateAsync({ itemId: item.id, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <SectionCard
      icon={Stethoscope}
      title="Mutirão de saúde"
      description="Vacinas, cirurgias, consultas e exames por pet antes/durante o evento."
    >
      <ul className="space-y-1">
        {tasks.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <Badge variant="outline" className="shrink-0">{HEALTH_TASK_TYPE_LABELS[item.type]}</Badge>
            <span className="flex-1 text-sm">{item.pet_name || '—'}</span>
            {disabled ? (
              <Badge className={toneFor(item.status)}>{HEALTH_TASK_STATUS_LABELS[item.status]}</Badge>
            ) : (
              <Select value={item.status} onValueChange={(v) => setStatus(item, v)}>
                <SelectTrigger className="h-8 w-36" aria-label="Situação da tarefa"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HEALTH_STATUS_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {!disabled && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(item)} aria-label="Remover tarefa">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
            Nenhuma tarefa de saúde. Organize vacinas, castrações e consultas dos pets do evento.
          </li>
        )}
      </ul>
      {!disabled && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="health-pet" className="text-xs">Pet</Label>
            <Input id="health-pet" list="ops-pet-suggest-health" value={form.pet_name}
              onChange={(e) => setForm((f) => ({ ...f, pet_name: e.target.value }))} placeholder="Nome do pet" />
            <datalist id="ops-pet-suggest-health">
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div className="space-y-1">
            <Label htmlFor="health-type" className="text-xs">Procedimento</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
              <SelectTrigger id="health-type" className="h-9 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HEALTH_TYPE_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" variant="secondary" onClick={add} disabled={ops.addHealthTask.isPending || !form.pet_name.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Fila de tratativas de adoção/doação ────────────────────────────────

const ADOPTION_STAGE_OPTIONS = ADOPTION_STAGE_ORDER.map((v) => [v, ADOPTION_STAGE_LABELS[v]]);

function AdoptionSection({ exhibition, ops, actor, disabled }) {
  const { toast } = useToast();
  const entries = sortAdoptionEntries(exhibition);
  const suggestions = useMemo(() => petSuggestions(exhibition), [exhibition]);
  const [form, setForm] = useState({ applicant_name: '', applicant_contact: '', pet_name: '' });

  const add = async () => {
    if (!form.applicant_name.trim()) return;
    try {
      await ops.addAdoptionEntry.mutateAsync({ input: { ...form }, actor });
      setForm({ applicant_name: '', applicant_contact: '', pet_name: '' });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const setStage = async (item, stage) => {
    try {
      await ops.updateAdoptionEntry.mutateAsync({ itemId: item.id, patch: { stage }, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  const remove = async (item) => {
    if (!(await confirmDialog({ title: `Remover tratativa de ${item.applicant_name}?` }))) return;
    try {
      await ops.removeAdoptionEntry.mutateAsync({ itemId: item.id, actor });
    } catch (err) {
      toast({ title: 'Erro', description: String(err?.message || err), variant: 'destructive' });
    }
  };

  return (
    <SectionCard
      icon={HeartHandshake}
      title="Fila de tratativas"
      description="Interessados, reuniões com adotantes e andamento das adoções/doações."
    >
      <ul className="space-y-1">
        {entries.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
            <div className="flex-1">
              <div className="text-sm font-medium">{item.applicant_name}</div>
              <div className="text-xs text-muted-foreground">
                {[item.pet_name && `Pet: ${item.pet_name}`, item.applicant_contact].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            {disabled ? (
              <Badge className={toneFor(item.stage)}>{ADOPTION_STAGE_LABELS[item.stage]}</Badge>
            ) : (
              <Select value={item.stage} onValueChange={(v) => setStage(item, v)}>
                <SelectTrigger className="h-8 w-36" aria-label="Etapa da tratativa"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ADOPTION_STAGE_OPTIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {!disabled && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(item)} aria-label="Remover tratativa">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
        {entries.length === 0 && (
          <li className="rounded-md border border-dashed p-2 text-center text-xs text-muted-foreground">
            Nenhuma tratativa registrada. Cadastre interessados e acompanhe o funil até a adoção.
          </li>
        )}
      </ul>
      {!disabled && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="adopt-name" className="text-xs">Interessado</Label>
            <Input id="adopt-name" value={form.applicant_name}
              onChange={(e) => setForm((f) => ({ ...f, applicant_name: e.target.value }))} placeholder="Nome" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adopt-contact" className="text-xs">Contato</Label>
            <Input id="adopt-contact" value={form.applicant_contact}
              onChange={(e) => setForm((f) => ({ ...f, applicant_contact: e.target.value }))} placeholder="Telefone / e-mail" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="adopt-pet" className="text-xs">Pet</Label>
            <Input id="adopt-pet" list="ops-pet-suggest-adopt" value={form.pet_name}
              onChange={(e) => setForm((f) => ({ ...f, pet_name: e.target.value }))} placeholder="Pet de interesse" />
            <datalist id="ops-pet-suggest-adopt">
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <Button size="sm" variant="secondary" onClick={add} disabled={ops.addAdoptionEntry.isPending || !form.applicant_name.trim()}>
            <Plus className="mr-1 h-4 w-4" /> Adicionar
          </Button>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Painel ─────────────────────────────────────────────────────────────

export function ExhibitionOpsPanel({ shelterClubId, exhibitionId, actor, disabled = false }) {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_EXHIBITION_OPS_V1);
  const { data: exhibition, isLoading } = useExhibition(shelterClubId, exhibitionId);
  const ops = useExhibitionOps(shelterClubId, exhibitionId);

  const summary = useMemo(
    () => computeExhibitionOpsSummary(exhibition || {}),
    [exhibition],
  );

  if (!enabled) return null;
  if (!shelterClubId || !exhibitionId) return null;
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando gestão do evento…</p>;
  }

  const canEdit = !disabled && Boolean(actor?.uid);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Gestão do evento</h3>
        <p className="text-sm text-muted-foreground">
          Planeje e acompanhe o evento por completo: preparação, logística, mutirão de saúde e tratativas de adoção.
          A escala de voluntários e o destino pós-evento continuam nas seções acima.
        </p>
      </div>
      <OpsSummary summary={summary} />
      <div className="grid gap-4 lg:grid-cols-2">
        <PlanningSection exhibition={exhibition} ops={ops} actor={actor} disabled={!canEdit} />
        <LogisticsSection exhibition={exhibition} ops={ops} actor={actor} disabled={!canEdit} />
        <HealthSection exhibition={exhibition} ops={ops} actor={actor} disabled={!canEdit} />
        <AdoptionSection exhibition={exhibition} ops={ops} actor={actor} disabled={!canEdit} />
      </div>
    </div>
  );
}

export default ExhibitionOpsPanel;
