/**
 * @fileoverview AddToCartButton — botão "Adicionar ao carrinho" (Loja v2 ·
 * SHELTER_STORE_V2) com seletor de variação opcional. Aparece ao lado do fluxo
 * "Comprar" da v1; quando a flag está OFF, este componente simplesmente não é
 * montado (o gate fica em quem importa). Usa o store de carrinho local.
 */
import React, { useMemo, useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { cn } from '@/core/lib/utils';
import { formatBRL, isInStock } from '@/modules/shelter/domain/store/products';
import {
  normalizeVariants, defaultVariant, variantPriceCents, variantInStock,
  productPriceRange,
} from '@/modules/shelter/domain/store/storeAnalytics';
import { useCart } from '@/modules/shelter/hooks/useShelterStoreV2';

export default function AddToCartButton({
  product, clubId, clubName, className, size, variant = 'outline', onAdded,
}) {
  const { add } = useCart();
  const variants = useMemo(() => normalizeVariants(product), [product]);
  const [variantId, setVariantId] = useState(() => defaultVariant(product)?.id || '');
  const [justAdded, setJustAdded] = useState(false);

  if (!product) return null;
  const selected = variants.find((v) => v.id === variantId) || null;
  const priceCents = variantPriceCents(product, selected);
  const inStock = variants.length > 0 ? variantInStock(product, selected) : isInStock(product);
  const range = productPriceRange(product);

  function handleAdd() {
    if (!clubId) { toast.error('Loja indisponível.'); return; }
    if (variants.length > 0 && !selected) { toast.error('Escolha uma variação.'); return; }
    if (!inStock) { toast.error('Item esgotado.'); return; }
    add({
      club_id: clubId,
      club_name: clubName,
      product_id: product.id,
      name: product.name,
      price_cents: priceCents,
      image_url: product.images?.[0]?.url || null,
      variant_id: selected?.id || null,
      variant_label: selected?.label || null,
      track_stock: Boolean(product.track_stock),
      stock_quantity: selected && Number.isFinite(selected.stock_quantity)
        ? selected.stock_quantity
        : product.stock_quantity,
    }, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    toast.success('Adicionado ao carrinho.');
    onAdded?.();
  }

  return (
    <div className={cn('space-y-2', className)}>
      {variants.length > 0 && (
        <div className="space-y-1">
          <Select value={variantId} onValueChange={setVariantId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolha a variação" />
            </SelectTrigger>
            <SelectContent>
              {variants.map((v) => {
                const vStock = variantInStock(product, v);
                return (
                  <SelectItem key={v.id} value={v.id} disabled={!vStock}>
                    {v.label} · {formatBRL(variantPriceCents(product, v))}{!vStock ? ' · esgotado' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {range.varies && (
            <p className="text-xs text-muted-foreground">
              De {formatBRL(range.min)} a {formatBRL(range.max)}
            </p>
          )}
        </div>
      )}
      <Button
        type="button"
        variant={justAdded ? 'default' : variant}
        size={size}
        className="w-full"
        disabled={!inStock}
        onClick={handleAdd}
      >
        {justAdded
          ? (<><Check className="mr-1.5 h-4 w-4" /> Adicionado</>)
          : (<><ShoppingCart className="mr-1.5 h-4 w-4" /> {inStock ? 'Adicionar ao carrinho' : 'Esgotado'}</>)}
      </Button>
    </div>
  );
}
