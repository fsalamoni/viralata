/**
 * @fileoverview MarketplacePage — vitrine única (/mercado) que compila os
 * produtos públicos de TODAS as lojas de abrigos. Filtros e ordenação por
 * abrigo, cidade, estado, categoria e preço. Aparece na navegação de todas as
 * personas MENOS o acesso de abrigo. Gated por PLATFORM_MARKETPLACE_V1.
 */
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, Search, PackageOpen, ShoppingBag, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  PRODUCT_CATEGORY_LABEL, formatBRL, isInStock,
} from '@/modules/shelter/domain/store/products';
import { useMarketplaceEnriched } from '@/modules/shelter/hooks/useShelterStore';
import PublicProductDialog from '@/modules/shelter/components/store/PublicProductDialog';
import CartButton from '@/modules/shelter/components/store/CartButton';

function MarketProductCard({ product, onOpen }) {
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
        <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          <Store className="mr-0.5 inline h-3 w-3" />{product.shelter_name}
          {product.shelter_city ? ` · ${product.shelter_city}${product.shelter_state ? `/${product.shelter_state}` : ''}` : ''}
        </p>
        <span className="mt-1 text-base font-extrabold text-foreground">{formatBRL(product.price_cents)}</span>
      </div>
    </button>
  );
}

export default function MarketplacePage() {
  const enabled = useFeatureFlag(FEATURE_FLAG.PLATFORM_MARKETPLACE_V1);
  const storeV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_STORE_V2);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-6xl px-5 py-6 pb-12 space-y-6');
  const { user } = useAuth();
  const { data, isLoading } = useMarketplaceEnriched(enabled);
  const products = data?.products || [];
  const shelters = data?.shelters || {};

  const [q, setQ] = useState('');
  const [shelter, setShelter] = useState('all');
  const [state, setState] = useState('all');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('recent');
  const [selected, setSelected] = useState(null);

  const shelterList = useMemo(() => Object.values(shelters).sort((a, b) => a.name.localeCompare(b.name)), [shelters]);
  const states = useMemo(() => Array.from(new Set(products.map((p) => p.shelter_state).filter(Boolean))).sort(), [products]);
  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))), [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = products.filter((p) => {
      if (shelter !== 'all' && p.club_id !== shelter) return false;
      if (state !== 'all' && p.shelter_state !== state) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (needle && !`${p.name} ${p.shelter_name} ${(p.tags || []).join(' ')}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    list = [...list];
    if (sort === 'price_asc') list.sort((a, b) => (a.price_cents || 0) - (b.price_cents || 0));
    else if (sort === 'price_desc') list.sort((a, b) => (b.price_cents || 0) - (a.price_cents || 0));
    // 'recent' mantém a ordem da query (created_at desc)
    return list;
  }, [products, q, shelter, state, category, sort]);

  const selectedSettings = selected ? shelters[selected.club_id]?.settings : null;

  if (!enabled) return null;

  return (
    <div className={wrapperClass}>
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
            <ShoppingBag className="h-6 w-6 text-primary" /> Mercado
          </h1>
          <p className="text-sm text-muted-foreground">
            Produtos de todas as lojas dos abrigos. Cada compra ajuda os resgatados.
          </p>
        </div>
        {storeV2 && (
          <div className="flex items-center gap-2">
            <Link to="/meus-pedidos" className="hidden text-sm font-medium text-primary hover:underline sm:inline">Meus pedidos</Link>
            <CartButton />
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <div className="relative col-span-2 sm:col-span-3 lg:col-span-2">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar produtos…" className="pl-8" />
        </div>
        <Select value={shelter} onValueChange={setShelter}>
          <SelectTrigger><SelectValue placeholder="Abrigo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os abrigos</SelectItem>
            {shelterList.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={state} onValueChange={setState}>
          <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estados</SelectItem>
            {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{PRODUCT_CATEGORY_LABEL[c] || 'Outros'}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Mais recentes</SelectItem>
            <SelectItem value="price_asc">Menor preço</SelectItem>
            <SelectItem value="price_desc">Maior preço</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            {products.length === 0
              ? 'Ainda não há produtos no mercado. Assim que os abrigos publicarem suas lojas, eles aparecem aqui.'
              : 'Nenhum produto encontrado com esses filtros.'}
          </p>
          <Link to="/organizacoes" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
            <MapPin className="mr-1 h-4 w-4" /> Conhecer os abrigos
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{filtered.length} produto(s)</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => <MarketProductCard key={`${p.club_id}-${p.id}`} product={p} onOpen={setSelected} />)}
          </div>
        </>
      )}

      <PublicProductDialog
        open={Boolean(selected)}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
        clubId={selected?.club_id}
        product={selected}
        settings={selectedSettings}
        actor={{ uid: user?.uid, name: user?.displayName }}
        clubName={selected?.shelter_name}
      />
    </div>
  );
}
