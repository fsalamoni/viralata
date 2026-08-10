/**
 * @fileoverview ProductFormDialog — cadastro/edição completo de um produto da
 * loja: mídias (fotos/vídeos), preço, custo, fornecedores, estoque, entrega/
 * frete, descrição, material e situação. Mostra a margem de lucro ao vivo.
 * Custo/fornecedores/notas são gravados no doc PRIVADO (só gestão).
 */
import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/core/lib/utils';
import {
  PRODUCT_STATUS, PRODUCT_STATUS_LABEL, PRODUCT_STATUS_ORDER,
  PRODUCT_CATEGORY_LABEL, PRODUCT_CATEGORY_ORDER,
  DELIVERY_METHOD_LABEL, DELIVERY_METHOD_ORDER,
  toCents, centsToInput, formatBRL, unitProfitCents, profitMarginPct, genId,
} from '@/modules/shelter/domain/store/products';
import ProductMediaField from './ProductMediaField';

function num(v) { const n = Number.parseInt(v, 10); return Number.isFinite(n) ? n : undefined; }

const emptyForm = {
  name: '', category: 'other', price: '', compare_at_price: '', status: PRODUCT_STATUS.DRAFT,
  description: '', details: '', material: '', tags: '',
  track_stock: true, stock_quantity: '0', sku: '',
  cost: '', internal_notes: '',
  delivery_methods: [], shipping_cost: '', lead_time_days: '', ship_from_city: '', ship_from_state: '',
  weight_grams: '', dimensions_cm: '',
  images: [], videos: [], suppliers: [],
};

function fromProduct(p) {
  if (!p) return { ...emptyForm };
  return {
    name: p.name || '',
    category: p.category || 'other',
    price: p.price_cents != null ? centsToInput(p.price_cents) : '',
    compare_at_price: p.compare_at_price_cents != null ? centsToInput(p.compare_at_price_cents) : '',
    status: p.status || PRODUCT_STATUS.DRAFT,
    description: p.description || '',
    details: p.details || '',
    material: p.material || '',
    tags: (p.tags || []).join(', '),
    track_stock: p.track_stock !== false,
    stock_quantity: String(p.stock_quantity ?? 0),
    sku: p.sku || '',
    cost: p.cost_cents != null ? centsToInput(p.cost_cents) : '',
    internal_notes: p.internal_notes || '',
    delivery_methods: p.delivery_methods || [],
    shipping_cost: p.shipping_cost_cents != null ? centsToInput(p.shipping_cost_cents) : '',
    lead_time_days: p.lead_time_days != null ? String(p.lead_time_days) : '',
    ship_from_city: p.ship_from_city || '',
    ship_from_state: p.ship_from_state || '',
    weight_grams: p.weight_grams != null ? String(p.weight_grams) : '',
    dimensions_cm: p.dimensions_cm || '',
    images: p.images || [],
    videos: p.videos || [],
    suppliers: (p.suppliers || []).map((s) => ({ ...s, id: s.id || genId('sup') })),
  };
}

function SuppliersField({ suppliers, onChange }) {
  function add() {
    onChange([...suppliers, { id: genId('sup'), name: '', contact: '', lead_time_days: '', unit_cost: '' }]);
  }
  function patch(id, key, value) {
    onChange(suppliers.map((s) => (s.id === id ? { ...s, [key]: value } : s)));
  }
  function remove(id) { onChange(suppliers.filter((s) => s.id !== id)); }

  return (
    <div className="space-y-2">
      {suppliers.map((s) => (
        <div key={s.id} className="rounded-xl border border-border bg-muted/30 p-2.5">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Nome do fornecedor *" value={s.name} onChange={(e) => patch(s.id, 'name', e.target.value)} />
            <Input placeholder="Contato (tel/e-mail)" value={s.contact} onChange={(e) => patch(s.id, 'contact', e.target.value)} />
            <Input placeholder="Prazo de entrega (dias)" inputMode="numeric" value={s.lead_time_days} onChange={(e) => patch(s.id, 'lead_time_days', e.target.value)} />
            <Input placeholder="Custo unitário (R$)" inputMode="decimal" value={s.unit_cost} onChange={(e) => patch(s.id, 'unit_cost', e.target.value)} />
          </div>
          <button type="button" onClick={() => remove(s.id)} className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-destructive hover:underline">
            <Trash2 className="h-3 w-3" /> Remover fornecedor
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1.5 h-4 w-4" /> Adicionar fornecedor
      </Button>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h4 className="border-b border-border pb-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</h4>;
}

export default function ProductFormDialog({ open, onOpenChange, onSave, product, uid, saving }) {
  const [f, setF] = useState(emptyForm);
  const [err, setErr] = useState('');
  const isEdit = Boolean(product?.id);

  useEffect(() => {
    if (open) { setF(fromProduct(product)); setErr(''); }
  }, [open, product]);

  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e?.target ? e.target.value : e }));
  const priceCents = toCents(f.price);
  const costCents = toCents(f.cost);
  const profit = unitProfitCents(priceCents, costCents);
  const margin = profitMarginPct(priceCents, costCents);

  function toggleDelivery(method) {
    setF((prev) => ({
      ...prev,
      delivery_methods: prev.delivery_methods.includes(method)
        ? prev.delivery_methods.filter((m) => m !== method)
        : [...prev.delivery_methods, method],
    }));
  }

  function submit(e) {
    e?.preventDefault();
    if (f.name.trim().length < 2) { setErr('Informe o nome do produto (mín. 2 caracteres).'); return; }
    if (priceCents <= 0) { setErr('Informe um preço de venda válido.'); return; }
    const payload = {
      name: f.name.trim(),
      category: f.category,
      price_cents: priceCents,
      compare_at_price_cents: f.compare_at_price ? toCents(f.compare_at_price) : undefined,
      status: f.status,
      description: f.description.trim(),
      details: f.details.trim(),
      material: f.material.trim(),
      tags: f.tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 20),
      track_stock: f.track_stock,
      stock_quantity: f.track_stock ? (num(f.stock_quantity) ?? 0) : 0,
      sku: f.sku.trim(),
      // privados:
      cost_cents: f.cost ? costCents : undefined,
      internal_notes: f.internal_notes.trim(),
      suppliers: f.suppliers
        .filter((s) => s.name.trim())
        .map((s) => ({
          id: s.id,
          name: s.name.trim(),
          contact: s.contact?.trim() || undefined,
          lead_time_days: s.lead_time_days ? num(s.lead_time_days) : undefined,
          unit_cost_cents: s.unit_cost ? toCents(s.unit_cost) : undefined,
        })),
      // entrega:
      delivery_methods: f.delivery_methods,
      shipping_cost_cents: f.shipping_cost ? toCents(f.shipping_cost) : undefined,
      lead_time_days: f.lead_time_days ? num(f.lead_time_days) : undefined,
      ship_from_city: f.ship_from_city.trim(),
      ship_from_state: f.ship_from_state.trim().toUpperCase().slice(0, 2),
      weight_grams: f.weight_grams ? num(f.weight_grams) : undefined,
      dimensions_cm: f.dimensions_cm.trim(),
      images: f.images,
      videos: f.videos,
    };
    onSave(payload);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar produto' : 'Novo produto'}</DialogTitle>
          <DialogDescription>
            Preencha as informações do produto. Custo, fornecedores e notas são
            <strong> internos</strong> — nunca aparecem para o público.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          {err && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{err}</p>}

          {/* Mídia */}
          <div className="space-y-1.5">
            <Label>Fotos e vídeos</Label>
            <ProductMediaField
              images={f.images}
              videos={f.videos}
              uid={uid}
              onChange={({ images, videos }) => setF((prev) => ({ ...prev, images, videos }))}
            />
          </div>

          {/* Básico */}
          <SectionTitle>Informações básicas</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">Nome do produto *</Label>
              <Input id="p-name" value={f.name} onChange={set('name')} placeholder="Ex.: Coleira artesanal M" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={f.category} onValueChange={(v) => setF((p) => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORY_ORDER.map((c) => <SelectItem key={c} value={c}>{PRODUCT_CATEGORY_LABEL[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Situação</Label>
              <Select value={f.status} onValueChange={(v) => setF((p) => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{PRODUCT_STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-price">Preço de venda (R$) *</Label>
              <Input id="p-price" inputMode="decimal" value={f.price} onChange={set('price')} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-compare">Preço &quot;de&quot; (opcional)</Label>
              <Input id="p-compare" inputMode="decimal" value={f.compare_at_price} onChange={set('compare_at_price')} placeholder="0,00" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-desc">Descrição</Label>
              <Textarea id="p-desc" rows={3} value={f.description} onChange={set('description')} placeholder="Descreva o produto para os compradores" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-details">Detalhes adicionais</Label>
              <Textarea id="p-details" rows={2} value={f.details} onChange={set('details')} placeholder="Medidas, cuidados, observações…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-material">Material</Label>
              <Input id="p-material" value={f.material} onChange={set('material')} placeholder="Ex.: Algodão, couro sintético" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-tags">Tags (vírgula)</Label>
              <Input id="p-tags" value={f.tags} onChange={set('tags')} placeholder="cachorro, verão, artesanal" />
            </div>
          </div>

          {/* Estoque */}
          <SectionTitle>Estoque</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-xl border border-border p-3 sm:col-span-1">
              <Label htmlFor="p-track" className="cursor-pointer">Controlar estoque</Label>
              <Switch id="p-track" checked={f.track_stock} onCheckedChange={(v) => setF((p) => ({ ...p, track_stock: v }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-stock">Quantidade em estoque</Label>
              <Input id="p-stock" inputMode="numeric" disabled={!f.track_stock} value={f.stock_quantity} onChange={set('stock_quantity')} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU / código</Label>
              <Input id="p-sku" value={f.sku} onChange={set('sku')} placeholder="Opcional" />
            </div>
          </div>

          {/* Custos e fornecedores (privado) */}
          <SectionTitle>Custos e fornecedores · interno</SectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-cost">Custo do produto (R$)</Label>
              <Input id="p-cost" inputMode="decimal" value={f.cost} onChange={set('cost')} placeholder="0,00" />
            </div>
            <div className="flex items-end">
              {profit != null ? (
                <p className={cn('text-sm font-semibold', profit >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  Lucro un.: {formatBRL(profit)}{margin != null ? ` · margem ${margin}%` : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Informe o custo para ver a margem de lucro.</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Fornecedores</Label>
            <SuppliersField suppliers={f.suppliers} onChange={(s) => setF((p) => ({ ...p, suppliers: s }))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-notes">Notas internas</Label>
            <Textarea id="p-notes" rows={2} value={f.internal_notes} onChange={set('internal_notes')} placeholder="Só a equipe do abrigo vê" />
          </div>

          {/* Entrega e frete */}
          <SectionTitle>Entrega e frete</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {DELIVERY_METHOD_ORDER.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => toggleDelivery(m)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                  f.delivery_methods.includes(m)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground/70 hover:border-primary/50',
                )}
              >
                {DELIVERY_METHOD_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-ship">Frete (R$)</Label>
              <Input id="p-ship" inputMode="decimal" value={f.shipping_cost} onChange={set('shipping_cost')} placeholder="0,00" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-lead">Prazo de entrega (dias)</Label>
              <Input id="p-lead" inputMode="numeric" value={f.lead_time_days} onChange={set('lead_time_days')} placeholder="Ex.: 7" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-weight">Peso (g)</Label>
              <Input id="p-weight" inputMode="numeric" value={f.weight_grams} onChange={set('weight_grams')} placeholder="Ex.: 300" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-city">Envia de (cidade)</Label>
              <Input id="p-city" value={f.ship_from_city} onChange={set('ship_from_city')} placeholder="Cidade" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-uf">UF</Label>
              <Input id="p-uf" maxLength={2} value={f.ship_from_state} onChange={set('ship_from_state')} placeholder="SP" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-dim">Dimensões (cm)</Label>
              <Input id="p-dim" value={f.dimensions_cm} onChange={set('dimensions_cm')} placeholder="Ex.: 20×15×5" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              {isEdit ? 'Salvar alterações' : 'Criar produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
