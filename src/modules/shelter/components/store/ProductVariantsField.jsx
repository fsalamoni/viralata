/**
 * @fileoverview ProductVariantsField — editor de variações do produto (Loja v2,
 * SHELTER_STORE_V2). Cada variação tem rótulo, preço opcional (sobrepõe o preço
 * base), estoque e SKU. Componente controlado (value/onChange) no padrão de
 * SuppliersField; a conversão para cents ocorre no submit do ProductFormDialog.
 * Renderizado só com a flag ligada.
 */
import React from 'react';
import { Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

let seq = 0;
function genId() { seq += 1; return `var_${Date.now().toString(36)}_${seq}`; }

export default function ProductVariantsField({ variants = [], onChange }) {
  function add() {
    onChange([...variants, { id: genId(), label: '', price: '', stock: '', sku: '' }]);
  }
  function patch(id, key, value) {
    onChange(variants.map((v) => (v.id === id ? { ...v, [key]: value } : v)));
  }
  function remove(id) {
    onChange(variants.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Use variações para vender o mesmo produto em opções (tamanho, cor…). O preço da variação, quando informado, substitui o preço base.
      </p>
      {variants.length > 0 && (
        <ul className="space-y-2">
          {variants.map((v) => (
            <li key={v.id} className="grid grid-cols-1 gap-2 rounded-lg border border-border p-2 sm:grid-cols-[1.4fr_1fr_0.8fr_1fr_auto]">
              <Input placeholder="Rótulo * (ex.: Tamanho M)" value={v.label} onChange={(e) => patch(v.id, 'label', e.target.value)} />
              <Input placeholder="Preço (R$)" inputMode="decimal" value={v.price} onChange={(e) => patch(v.id, 'price', e.target.value)} />
              <Input placeholder="Estoque" inputMode="numeric" value={v.stock} onChange={(e) => patch(v.id, 'stock', e.target.value)} />
              <Input placeholder="SKU" value={v.sku} onChange={(e) => patch(v.id, 'sku', e.target.value)} />
              <Button type="button" variant="ghost" size="icon" onClick={() => remove(v.id)} aria-label="Remover variação">
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-1 h-3.5 w-3.5" /> {variants.length === 0 ? 'Adicionar variação' : 'Mais uma variação'}
        <Layers className="ml-1 h-3.5 w-3.5 opacity-60" />
      </Button>
    </div>
  );
}
