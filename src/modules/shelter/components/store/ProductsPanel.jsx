/**
 * @fileoverview ProductsPanel — lista e gestão dos produtos da loja: criar,
 * editar, mudar situação (à venda/pausar/esgotado/arquivar) e excluir.
 */
import React, { useMemo, useState } from 'react';
import {
  Plus, Search, Pencil, Trash2, MoreVertical, PackageOpen, Star,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/core/lib/utils';
import {
  PRODUCT_STATUS, PRODUCT_STATUS_LABEL, PRODUCT_STATUS_COLOR,
  PRODUCT_CATEGORY_LABEL, formatBRL, isInStock,
} from '@/modules/shelter/domain/store/products';
import { useStoreProducts, useProductForEdit, useStoreMutations } from '@/modules/shelter/hooks/useShelterStore';
import ProductFormDialog from './ProductFormDialog';

const STATUS_ACTIONS = [
  { status: PRODUCT_STATUS.ACTIVE, label: 'Colocar à venda' },
  { status: PRODUCT_STATUS.PAUSED, label: 'Pausar' },
  { status: PRODUCT_STATUS.SOLD_OUT, label: 'Marcar esgotado' },
  { status: PRODUCT_STATUS.ARCHIVED, label: 'Arquivar' },
];

function ProductRow({ product, onEdit, onStatus, onDelete }) {
  const [menu, setMenu] = useState(false);
  const cover = product.images?.[0]?.url;
  const stock = isInStock(product);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
        {cover ? <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
          : <div className="flex h-full w-full items-center justify-center text-muted-foreground"><PackageOpen className="h-5 w-5" /></div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{product.name}</p>
          <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold', PRODUCT_STATUS_COLOR[product.status])}>
            {PRODUCT_STATUS_LABEL[product.status]}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">{formatBRL(product.price_cents)}</span>
          <span>{PRODUCT_CATEGORY_LABEL[product.category] || 'Outros'}</span>
          {product.track_stock
            ? <span className={cn(!stock && 'text-rose-600')}>{product.stock_quantity ?? 0} em estoque</span>
            : <span>estoque livre</span>}
          {typeof product.rating_avg === 'number' && product.rating_avg > 0 && (
            <span className="inline-flex items-center gap-0.5"><Star className="h-3 w-3 text-amber-500" />{product.rating_avg}</span>
          )}
        </div>
      </div>
      <div className="relative shrink-0">
        <Button variant="ghost" size="icon" onClick={() => setMenu((v) => !v)} aria-label="Ações do produto">
          <MoreVertical className="h-4 w-4" />
        </Button>
        {menu && (
          <>
            <button type="button" className="fixed inset-0 z-10 cursor-default" aria-hidden onClick={() => setMenu(false)} />
            <div className="absolute right-0 z-20 mt-1 w-48 rounded-xl border border-border bg-popover p-1 shadow-lg">
              <button type="button" onClick={() => { setMenu(false); onEdit(product); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
              {STATUS_ACTIONS.filter((a) => a.status !== product.status).map((a) => (
                <button key={a.status} type="button" onClick={() => { setMenu(false); onStatus(product, a.status); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-muted">
                  {a.label}
                </button>
              ))}
              <button type="button" onClick={() => { setMenu(false); onDelete(product); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function ProductsPanel({ clubId, actor }) {
  const { data: products = [], isLoading } = useStoreProducts(clubId);
  const { createProduct, updateProduct, setProductStatus, deleteProduct } = useStoreMutations(clubId);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: editing } = useProductForEdit(clubId, editingId, Boolean(editingId) && formOpen);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (needle && !`${p.name} ${p.sku || ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [products, q, statusFilter]);

  function openNew() { setEditingId(null); setFormOpen(true); }
  function openEdit(p) { setEditingId(p.id); setFormOpen(true); }

  async function handleSave(payload) {
    try {
      if (editingId) {
        await updateProduct.mutateAsync({ productId: editingId, actor, updates: payload });
        toast.success('Produto atualizado');
      } else {
        await createProduct.mutateAsync({ actor, payload });
        toast.success('Produto criado');
      }
      setFormOpen(false);
      setEditingId(null);
    } catch (err) {
      toast.error(err?.errors?.[0]?.message || err?.message || 'Não foi possível salvar o produto');
    }
  }

  async function handleStatus(p, status) {
    try {
      await setProductStatus.mutateAsync({ productId: p.id, actor, status });
      toast.success(`Situação: ${PRODUCT_STATUS_LABEL[status]}`);
    } catch (err) { toast.error(err?.message || 'Erro ao mudar situação'); }
  }

  async function handleDelete() {
    if (!confirmDel) return;
    try {
      await deleteProduct.mutateAsync({ productId: confirmDel.id, actor });
      toast.success('Produto excluído');
      setConfirmDel(null);
    } catch (err) { toast.error(err?.message || 'Erro ao excluir'); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produto…" className="pl-8" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            {Object.values(PRODUCT_STATUS).map((s) => <SelectItem key={s} value={s}>{PRODUCT_STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Novo produto</Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length === 0 ? 'Nenhum produto ainda. Crie o primeiro para começar a vender.' : 'Nenhum produto encontrado com esses filtros.'}
          </p>
          {products.length === 0 && <Button className="mt-3" onClick={openNew}><Plus className="mr-1.5 h-4 w-4" /> Novo produto</Button>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <ProductRow key={p.id} product={p} onEdit={openEdit} onStatus={handleStatus} onDelete={setConfirmDel} />
          ))}
        </div>
      )}

      <ProductFormDialog
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingId(null); }}
        onSave={handleSave}
        product={editingId ? editing : null}
        uid={actor?.uid}
        saving={createProduct.isPending || updateProduct.isPending}
      />

      <ConfirmDialog
        open={Boolean(confirmDel)}
        onOpenChange={(o) => { if (!o) setConfirmDel(null); }}
        title="Excluir produto?"
        description={`"${confirmDel?.name || ''}" e suas fotos, avaliações e perguntas serão removidos. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
