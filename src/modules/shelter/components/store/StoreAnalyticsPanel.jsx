/**
 * @fileoverview StoreAnalyticsPanel — painel de analytics de vendas da Loja v2
 * (SHELTER_STORE_V2). Receita realizada vs. pipeline, ticket médio, conversão,
 * distribuição por status, top produtos e receita por dia (mini-gráfico). Deriva
 * tudo dos pedidos+produtos já carregados (sem I/O novo). Montado só com a flag.
 */
import React from 'react';
import {
  TrendingUp, Hourglass, Receipt, ShoppingBag, Package, BarChart3, Trophy,
} from 'lucide-react';
import { cn } from '@/core/lib/utils';
import { useStoreOrders, useStoreProducts } from '@/modules/shelter/hooks/useShelterStore';
import { useStoreAnalytics } from '@/modules/shelter/hooks/useShelterStoreV2';

function Kpi({ icon: Icon, label, value, hint, accent = 'primary' }) {
  const accents = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
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

export default function StoreAnalyticsPanel({ clubId }) {
  const { data: orders = [], isLoading: loadingOrders } = useStoreOrders(clubId);
  const { data: products = [] } = useStoreProducts(clubId);
  const view = useStoreAnalytics(orders, products);

  if (loadingOrders) {
    return <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />)}</div>;
  }

  if (view.isEmpty) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
        <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Sem vendas ainda. As métricas aparecem quando os pedidos começarem a chegar.</p>
      </div>
    );
  }

  const c = view.cards;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={TrendingUp} label="Receita realizada" value={c.revenueRealized} hint={`${c.realizedOrders} pedido(s) pagos`} accent="emerald" />
        <Kpi icon={Hourglass} label="Em aberto (pipeline)" value={c.revenuePipeline} hint="pendente/confirmado" accent="amber" />
        <Kpi icon={Receipt} label="Ticket médio" value={c.avgOrderValue} accent="sky" />
        <Kpi icon={ShoppingBag} label="Conversão" value={`${c.conversionPct}%`} hint={`${c.totalOrders} pedido(s) no total`} accent="primary" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Distribuição por status */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground"><BarChart3 className="h-4 w-4 text-primary" /> Pedidos por situação</h4>
          <ul className="space-y-1.5">
            {view.statusBreakdown.map((row) => (
              <li key={row.status} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-semibold text-foreground">{row.count}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground"><Package className="h-3.5 w-3.5" /> Unidades vendidas</span>
            <span className="font-bold text-foreground">{c.unitsSold}</span>
          </div>
        </div>

        {/* Top produtos */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-foreground"><Trophy className="h-4 w-4 text-amber-500" /> Produtos mais vendidos</h4>
          {view.topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ainda sem vendas concluídas.</p>
          ) : (
            <ol className="space-y-1.5">
              {view.topProducts.map((p, i) => (
                <li key={p.product_id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-foreground"><span className="text-muted-foreground">{i + 1}.</span> {p.name}</span>
                  <span className="shrink-0 text-muted-foreground">{p.units}× · {p.revenue_label}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>

      {/* Receita por dia (mini-gráfico de barras) */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h4 className="mb-3 flex items-center gap-1.5 text-sm font-bold text-foreground"><TrendingUp className="h-4 w-4 text-emerald-500" /> Receita realizada (últimos 30 dias)</h4>
        <div className="flex h-24 items-end gap-0.5">
          {view.revenueByDay.map((d) => (
            <div
              key={d.date}
              className="flex-1 rounded-t bg-emerald-400/70 dark:bg-emerald-500/60"
              style={{ height: `${Math.max(2, d.pct)}%` }}
              title={`${d.date}: ${d.label}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
