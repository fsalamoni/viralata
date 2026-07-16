/**
 * @fileoverview DashboardWidgetManager — modal para adicionar/editar/remover
 * widgets customizados do dashboard.
 *
 * Usa o shadcn `Dialog` e `useCreateWidget / useUpdateWidget /
 * useDeleteWidget` do hook. Validação client-side via Zod (re-aproveita o
 * `createWidgetSchema` / `updateWidgetSchema`).
 *
 * O modal lista os widgets existentes (com botão de editar/excluir) e tem
 * um botão "Adicionar widget" que abre o form em modo de criação.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 14.1
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, Settings2, Bug, Stethoscope, List, BarChart3 } from 'lucide-react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  useDashboardWidgets,
  useCreateWidget,
  useUpdateWidget,
  useDeleteWidget,
} from '@/modules/shelter/hooks/useDashboard';
import { DASHBOARD_COLLECTIONS, WIDGET_TYPES } from '@/modules/shelter/domain/operational/dashboard';
import { confirmDialog } from '@/components/ui/confirm-provider';

const COLLECTION_OPTIONS = Object.values(DASHBOARD_COLLECTIONS);
const TYPE_OPTIONS = WIDGET_TYPES;

const ICON_OPTIONS = [
  { value: 'Bug', label: 'Pulgas / parasitas' },
  { value: 'Stethoscope', label: 'Saúde' },
  { value: 'Syringe', label: 'Vacinas' },
  { value: 'Pill', label: 'Medicamentos' },
  { value: 'List', label: 'Lista' },
  { value: 'BarChart3', label: 'Gráfico' },
];

const TONE_OPTIONS = [
  { value: 'default', label: 'Padrão' },
  { value: 'info', label: 'Informação' },
  { value: 'success', label: 'Sucesso' },
  { value: 'warning', label: 'Atenção' },
  { value: 'danger', label: 'Alerta' },
];

const SIZE_OPTIONS = [
  { value: 'sm', label: 'Pequeno' },
  { value: 'md', label: 'Médio' },
  { value: 'lg', label: 'Grande' },
];

function emptyForm() {
  return {
    type: 'count',
    title: '',
    description: '',
    collection: 'pets',
    filters_field: '',
    filters_value: '',
    icon: 'Bug',
    tone: 'default',
    order: 100,
    size: 'md',
  };
}

export function DashboardWidgetManager({ clubId, trigger }) {
  const { user } = useAuth();
  const widgetsQuery = useDashboardWidgets(clubId);
  const createMut = useCreateWidget(clubId);
  const updateMut = useUpdateWidget(clubId);
  const deleteMut = useDeleteWidget(clubId);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState(null);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setMode('list');
      setEditingId(null);
      setForm(emptyForm());
      setError(null);
    }
  }, [open]);

  function startCreate() {
    setForm(emptyForm());
    setError(null);
    setMode('create');
  }

  function startEdit(w) {
    setEditingId(w.id);
    setForm({
      type: w.type || 'count',
      title: w.title || '',
      description: w.description || '',
      collection: w.query?.collection || 'pets',
      filters_field: w.query?.filters?.[0]?.field || '',
      filters_value: w.query?.filters?.[0]?.value ?? '',
      icon: w.icon || 'Bug',
      tone: w.tone || 'default',
      order: typeof w.order === 'number' ? w.order : 100,
      size: w.size || 'md',
    });
    setError(null);
    setMode('edit');
  }

  function parseValue(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    const n = Number(v);
    if (!Number.isNaN(n) && v.trim() !== '') return n;
    return v;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) {
      setError('Título é obrigatório.');
      return;
    }
    const filters = [];
    if (form.filters_field.trim() && form.filters_value !== '') {
      filters.push({
        field: form.filters_field.trim(),
        op: '==',
        value: parseValue(form.filters_value),
      });
    }
    const payload = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      query: { collection: form.collection, filters },
      icon: form.icon,
      tone: form.tone,
      order: Number(form.order) || 100,
      size: form.size,
    };

    const actor = { uid: user?.uid, displayName: user?.displayName };
    try {
      if (mode === 'create') {
        await createMut.mutateAsync({ input: payload, actor });
      } else if (mode === 'edit' && editingId) {
        await updateMut.mutateAsync({ widgetId: editingId, updates: payload, actor });
      }
      setMode('list');
    } catch (err) {
      setError(err?.message || 'Erro ao salvar widget.');
    }
  }

  async function handleDelete(widgetId) {
    if (!(await confirmDialog({ title: 'Excluir este widget?' }))) return;
    try {
      await deleteMut.mutateAsync({ widgetId, actor: { uid: user?.uid } });
    } catch (err) {
      setError(err?.message || 'Erro ao excluir widget.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings2 className="h-4 w-4" />
            Personalizar dashboard
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'list' && 'Widgets do dashboard'}
            {mode === 'create' && 'Novo widget'}
            {mode === 'edit' && 'Editar widget'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'list' && 'Adicione métricas customizadas (contagens) ao seu dashboard.'}
            {mode !== 'list' && 'Configure a collection, filtros e aparência do widget.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'list' && (
          <div className="space-y-3">
            {widgetsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            )}
            {widgetsQuery.data?.length === 0 && !widgetsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                Nenhum widget customizado. Crie um para começar.
              </p>
            )}
            {widgetsQuery.data?.map((w) => (
              <section key={w.id} className="border">
                <div className="arena-section-card-body p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{w.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.type} • {w.query?.collection} • ordem {w.order ?? 100}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(w)} aria-label="Editar">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(w.id)}
                      aria-label="Excluir"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </section>
            ))}
            <Button onClick={startCreate} className="w-full gap-1.5">
              <Plus className="h-4 w-4" />
              Adicionar widget
            </Button>
          </div>
        )}

        {mode !== 'list' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-title">Título *</Label>
                <Input
                  id="w-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Pets com pulga"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-type">Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
                >
                  <SelectTrigger id="w-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="w-desc">Descrição</Label>
              <Textarea
                id="w-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="(opcional)"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-collection">Collection</Label>
                <Select
                  value={form.collection}
                  onValueChange={(v) => setForm((f) => ({ ...f, collection: v }))}
                >
                  <SelectTrigger id="w-collection">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLECTION_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-icon">Ícone</Label>
                <Select
                  value={form.icon}
                  onValueChange={(v) => setForm((f) => ({ ...f, icon: v }))}
                >
                  <SelectTrigger id="w-icon">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-fld">Filtro: campo</Label>
                <Input
                  id="w-fld"
                  value={form.filters_field}
                  onChange={(e) => setForm((f) => ({ ...f, filters_field: e.target.value }))}
                  placeholder="ex: has_fleas (opcional)"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-val">Filtro: valor</Label>
                <Input
                  id="w-val"
                  value={form.filters_value}
                  onChange={(e) => setForm((f) => ({ ...f, filters_value: e.target.value }))}
                  placeholder="ex: true (opcional)"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="w-tone">Tom</Label>
                <Select
                  value={form.tone}
                  onValueChange={(v) => setForm((f) => ({ ...f, tone: v }))}
                >
                  <SelectTrigger id="w-tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-size">Tamanho</Label>
                <Select
                  value={form.size}
                  onValueChange={(v) => setForm((f) => ({ ...f, size: v }))}
                >
                  <SelectTrigger id="w-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SIZE_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="w-order">Ordem</Label>
                <Input
                  id="w-order"
                  type="number"
                  min={0}
                  max={1000}
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600" role="alert">{error}</p>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMode('list')}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {mode === 'create' ? 'Criar widget' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {mode === 'list' && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default DashboardWidgetManager;
