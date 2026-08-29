/**
 * @fileoverview CartButton + CartModal (Loja v2 · SHELTER_STORE_V2). Botão com
 * contador que abre o carrinho (modal): itens agrupados por abrigo, controles de
 * quantidade, remoção e subtotal; segue para o checkout. Estado do carrinho vem
 * do store local (localStorage). Montado só quando a flag está ligada.
 */
import React, { useState } from 'react';
import {
  ShoppingCart, Plus, Minus, Trash2, PackageOpen, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/core/lib/utils';
import { formatBRL } from '@/modules/shelter/domain/store/products';
import { maxQtyFor } from '@/modules/shelter/domain/store/storeCart';
import { useCart } from '@/modules/shelter/hooks/useShelterStoreV2';
import CheckoutDialog from './CheckoutDialog';

function QtyStepper({ item, onChange }) {
  const cap = maxQtyFor(item);
  return (
    <div className="inline-flex items-center rounded-lg border border-border">
      <button
        type="button"
        className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
        onClick={() => onChange(item.qty - 1)}
        aria-label="Diminuir"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[1.75rem] text-center text-sm font-semibold text-foreground">{item.qty}</span>
      <button
        type="button"
        className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
        onClick={() => onChange(item.qty + 1)}
        disabled={item.qty >= cap}
        aria-label="Aumentar"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function CartModal({ open, onOpenChange, actor }) {
  const {
    groups, count, subtotalCents, isEmpty, setQty, remove,
  } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Seu carrinho</DialogTitle>
            <DialogDescription>
              {isEmpty ? 'Adicione produtos das lojas dos abrigos.' : `${count} item(ns) de ${groups.length} abrigo(s).`}
            </DialogDescription>
          </DialogHeader>

          {isEmpty ? (
            <div className="py-10 text-center">
              <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((g) => (
                <div key={g.club_id} className="rounded-xl border border-border p-3">
                  <p className="mb-2 text-sm font-bold text-foreground">{g.club_name}</p>
                  <ul className="space-y-2">
                    {g.items.map((it) => (
                      <li key={it.key} className="flex items-center gap-2">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {it.image_url && <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" loading="lazy" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{it.name}</p>
                          {it.variant_label && <p className="text-xs text-muted-foreground">{it.variant_label}</p>}
                          <p className="text-xs text-muted-foreground">{formatBRL(it.price_cents)} un.</p>
                        </div>
                        <QtyStepper item={it} onChange={(q) => setQty(it.key, q)} />
                        <button type="button" onClick={() => remove(it.key)} className="p-1 text-muted-foreground hover:text-rose-600" aria-label="Remover">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-border pt-2 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-bold text-foreground">{formatBRL(g.subtotal_cents)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex w-full items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-extrabold text-foreground">{formatBRL(subtotalCents)}</span>
            </div>
            <Button
              className="w-full"
              disabled={isEmpty}
              onClick={() => { onOpenChange?.(false); setCheckoutOpen(true); }}
            >
              Finalizar compra <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} actor={actor} />
    </>
  );
}

export default function CartButton({ actor, className, variant = 'outline', size = 'icon' }) {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={cn('relative', className)}
        onClick={() => setOpen(true)}
        aria-label={`Carrinho (${count})`}
      >
        <ShoppingCart className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </Button>
      <CartModal open={open} onOpenChange={setOpen} actor={actor} />
    </>
  );
}
