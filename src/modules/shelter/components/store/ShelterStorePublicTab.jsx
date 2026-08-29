/**
 * @fileoverview ShelterStorePublicTab — vitrine pública da loja de um abrigo.
 * Grade de produtos ativos + busca/categoria; clique abre o detalhe (comprar,
 * perguntar, avaliar). SEM controles de gestão. Aparece só quando a loja está
 * ativa e pública (self-gate).
 */
import React, { useMemo, useState } from 'react';
import { Store, Search, PackageOpen, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { cn } from '@/core/lib/utils';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  PRODUCT_CATEGORY_LABEL, formatBRL, isInStock,
} from '@/modules/shelter/domain/store/products';
import { useStoreSettings, usePublicStoreProducts } from '@/modules/shelter/hooks/useShelterStore';
import PublicProductDialog from './PublicProductDialog';
import CartButton from './CartButton';

export function ProductGridCard({ product, onOpen }) {
  const cover = product.images?.[0]?.url;
  const stock = isInStock(product);
  return (
    <button
      type="button"
      onClick={() => onOpen(product)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card text-left transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {cover ? (
          <img src={cover} alt={product.name} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground"><PackageOpen className="h-8 w-8" /></div>
        )}
        {!stock && <span className="absolute right-2 top-2 rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-bold text-white">Esgotado</span>}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold text-foreground">{product.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-base font-extrabold text-foreground">{formatBRL(product.price_cents)}</span>
          {typeof product.rating_avg === 'number' && product.rating_avg > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground"><Star className="h-3 w-3 text-amber-500" />{product.rating_avg}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function ShelterStorePublicTab({ clubId, clubName }) {
  const { user } = useAuth();
  const storeV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_STORE_V2);
  const { data: settings, isLoading: loadingSettings } = useStoreSettings(clubId);
  const isPublic = settings?.enabled && settings?.public_visible;
  const { data: products = [], isLoading } = usePublicStoreProducts(clubId, Boolean(isPublic));

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [selected, setSelected] = useState(null);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (needle && !`${p.name} ${(p.tags || []).join(' ')}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [products, q, cat]);

  if (loadingSettings) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  if (!isPublic) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
        <Store className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Este abrigo ainda não tem uma loja pública.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {(settings.headline || settings.about) && (
        <div className="rounded-2xl border border-border bg-card p-4">
          {settings.headline && <p className="flex items-center gap-2 text-sm font-bold text-foreground"><Store className="h-4 w-4 text-primary" /> {settings.headline}</p>}
          {settings.about && <p className="mt-1 text-sm text-muted-foreground">{settings.about}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[180px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar na loja…" className="pl-8" />
        </div>
        {categories.length > 0 && (
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{PRODUCT_CATEGORY_LABEL[c] || 'Outros'}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {storeV2 && <CartButton />}
      </div>

      {isLoading ? (
        <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4')}>
          {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-muted" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <PackageOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {products.length === 0 ? 'A loja ainda não tem produtos à venda.' : 'Nenhum produto encontrado.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => <ProductGridCard key={p.id} product={p} onOpen={setSelected} />)}
        </div>
      )}

      <PublicProductDialog
        open={Boolean(selected)}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        clubId={clubId}
        product={selected}
        settings={settings}
        actor={{ uid: user?.uid, name: user?.displayName }}
        clubName={clubName}
      />
    </div>
  );
}
