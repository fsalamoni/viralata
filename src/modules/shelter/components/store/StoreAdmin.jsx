/**
 * @fileoverview StoreAdmin — container do painel admin da Loja do Abrigo.
 * Sub-abas internas: Painel (números), Produtos, Pedidos e Configurações.
 * Se a loja ainda não foi ativada, mostra um convite para ligá-la.
 */
import React, { useMemo, useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Settings2, Store,
  Boxes, DollarSign, TrendingUp, AlertTriangle, Eye, EyeOff, BarChart3,
} from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { Button } from '@/components/ui/button';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { computeStoreStats, formatBRL } from '@/modules/shelter/domain/store/products';
import { useStoreSettings, useStoreProducts } from '@/modules/shelter/hooks/useShelterStore';
import ProductsPanel from './ProductsPanel';
import StoreOrdersPanel from './StoreOrdersPanel';
import StoreSettingsPanel from './StoreSettingsPanel';
import StoreAnalyticsPanel from './StoreAnalyticsPanel';

const SUBTABS = [
  { key: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { key: 'products', label: 'Produtos', icon: Package },
  { key: 'orders', label: 'Pedidos', icon: ShoppingBag },
  { key: 'settings', label: 'Configurações', icon: Settings2 },
];

function Kpi({ icon: Icon, label, value, hint, accent = 'primary' }) {
  const accents = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', accents[accent])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-xl font-extrabold leading-tight text-foreground">{value}</p>
        {hint && <p className="text-[10.5px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function StoreDashboard({ products, settings }) {
  const s = useMemo(() => computeStoreStats(products), [products]);
  const isPublic = settings?.enabled && settings?.public_visible;
  return (
    <div className="space-y-4">
      <div className={cn(
        'flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm',
        isPublic ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
      )}>
        {isPublic ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        {isPublic
          ? 'Sua loja está pública — aparece na página do abrigo e no marketplace da plataforma.'
          : 'Sua loja não está pública. Ative a visibilidade pública em Configurações para vender.'}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Package} label="Produtos" value={s.total} hint={`${s.active} à venda`} accent="primary" />
        <Kpi icon={Boxes} label="Unidades em estoque" value={s.inventoryUnits} accent="sky" />
        <Kpi icon={DollarSign} label="Valor do estoque" value={formatBRL(s.inventoryValueCents)} hint="a preço de venda" accent="emerald" />
        <Kpi icon={TrendingUp} label="Lucro potencial" value={formatBRL(s.potentialProfitCents)} hint="estoque × margem" accent="amber" />
      </div>
      {s.outOfStock > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertTriangle className="h-4 w-4" /> {s.outOfStock} produto(s) sem estoque.
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'À venda', value: s.active },
          { label: 'Pausados', value: s.paused },
          { label: 'Esgotados', value: s.soldOut },
          { label: 'Rascunhos', value: s.draft },
          { label: 'Arquivados', value: s.archived },
        ].map((x) => (
          <div key={x.label} className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-extrabold text-foreground">{x.value}</p>
            <p className="text-[11px] text-muted-foreground">{x.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StoreAdmin({ clubId, actor }) {
  const [sub, setSub] = useState('dashboard');
  const storeV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_STORE_V2);
  const { data: settings } = useStoreSettings(clubId);
  const { data: products = [] } = useStoreProducts(clubId);

  const enabled = settings?.enabled;

  const subtabs = useMemo(() => {
    if (!storeV2) return SUBTABS;
    const list = [...SUBTABS];
    list.splice(1, 0, { key: 'analytics', label: 'Analytics', icon: BarChart3 });
    return list;
  }, [storeV2]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Store className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-bold text-foreground">Loja do Abrigo</h2>
          <p className="text-xs text-muted-foreground">Gerencie produtos, estoque, pedidos e a vitrine pública.</p>
        </div>
      </div>

      {!enabled && sub !== 'settings' ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            A loja deste abrigo ainda não foi ativada. Ative-a nas configurações para
            cadastrar produtos e, quando quiser, torná-la pública. O abrigo também pode
            optar por não ter loja.
          </p>
          <Button className="mt-4" onClick={() => setSub('settings')}>
            <Settings2 className="mr-1.5 h-4 w-4" /> Ir para configurações
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {subtabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSub(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  sub === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {sub === 'dashboard' && <StoreDashboard products={products} settings={settings} />}
          {storeV2 && sub === 'analytics' && <StoreAnalyticsPanel clubId={clubId} />}
          {sub === 'products' && <ProductsPanel clubId={clubId} actor={actor} />}
          {sub === 'orders' && <StoreOrdersPanel clubId={clubId} actor={actor} />}
          {sub === 'settings' && <StoreSettingsPanel clubId={clubId} actor={actor} />}
        </>
      )}
    </div>
  );
}
