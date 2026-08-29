/**
 * @fileoverview MyOrdersPage (/meus-pedidos) — acompanhamento dos pedidos do
 * comprador na Loja v2 (SHELTER_STORE_V2). Lista pedidos de todas as lojas com
 * status, itens, total e rastreio de envio. Self-gate: retorna null com a flag
 * OFF (nav também é condicionada).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, PackageOpen, Store, Truck, ExternalLink, Clock, CheckCircle2, XCircle,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { formatBRL, ORDER_STATUS } from '@/modules/shelter/domain/store/products';
import { useMyOrders } from '@/modules/shelter/hooks/useShelterStoreV2';

const STATUS_ICON = {
  [ORDER_STATUS.PENDING]: Clock,
  [ORDER_STATUS.CONFIRMED]: Clock,
  [ORDER_STATUS.PAID]: CheckCircle2,
  [ORDER_STATUS.SHIPPED]: Truck,
  [ORDER_STATUS.DELIVERED]: CheckCircle2,
  [ORDER_STATUS.CANCELLED]: XCircle,
};

const STATUS_CLASS = {
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  gray: 'bg-muted text-muted-foreground',
};

function fmtDate(d) {
  if (!d) return '';
  try { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return ''; }
}

function OrderCard({ order }) {
  const Icon = STATUS_ICON[order.status] || Clock;
  const f = order.fulfillment;
  return (
    <article className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Store className="h-4 w-4 text-primary" /> {order.club_name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pedido #{String(order.id).slice(0, 8)}{order.created_at ? ` · ${fmtDate(order.created_at)}` : ''}
          </p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CLASS[order.status_color] || STATUS_CLASS.gray}`}>
          <Icon className="h-3.5 w-3.5" /> {order.status_label}
        </span>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((it, i) => (
          <li key={`${it.product_id}-${i}`} className="flex justify-between gap-2">
            <span className="min-w-0 truncate text-muted-foreground">
              {it.qty}× {it.name}{it.variant_label ? ` — ${it.variant_label}` : ''}
            </span>
            <span className="shrink-0 text-foreground">{formatBRL((it.price_cents || 0) * (it.qty || 0))}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
        <span className="text-xs text-muted-foreground">{order.units} item(ns)</span>
        <span className="text-base font-extrabold text-foreground">{order.total_label}</span>
      </div>

      {f?.hasAny && (
        <div className="mt-2 rounded-lg bg-muted/50 p-2.5 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-foreground"><Truck className="h-3.5 w-3.5" /> Envio</p>
          {f.carrier && <p className="mt-0.5 text-muted-foreground">Transportadora: {f.carrier}</p>}
          {f.trackingCode && <p className="text-muted-foreground">Código: {f.trackingCode}</p>}
          {f.trackingUrl && (
            <a href={f.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-primary">
              <ExternalLink className="h-3 w-3" /> Rastrear
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export default function MyOrdersPage() {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_STORE_V2);
  const { user } = useAuth();
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-4xl px-5 py-6 pb-12 space-y-6');
  const { data: view, isLoading } = useMyOrders(user?.uid, enabled);

  if (!enabled) return null;

  return (
    <div className={wrapperClass}>
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground">
          <ShoppingBag className="h-6 w-6 text-primary" /> Meus pedidos
        </h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe suas compras nas lojas dos abrigos. O pagamento é combinado com cada abrigo.
        </p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : !view || view.isEmpty ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Você ainda não fez pedidos.</p>
          <Link to="/mercado" className="mt-3 inline-flex text-sm font-medium text-primary hover:underline">
            <Store className="mr-1 h-4 w-4" /> Ir ao mercado
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {view.open.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Em andamento ({view.open.length})</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {view.open.map((o) => <OrderCard key={`${o.club_id}-${o.id}`} order={o} />)}
              </div>
            </section>
          )}
          {view.closed.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Concluídos ({view.closed.length})</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {view.closed.map((o) => <OrderCard key={`${o.club_id}-${o.id}`} order={o} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
