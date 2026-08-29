/**
 * @fileoverview StoreOrdersPanel — pedidos (intenções de compra) recebidos pela
 * loja. Mostra comprador, itens, total, contato e permite avançar a situação.
 */
import React, { useState } from 'react';
import { ShoppingBag, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import { cn } from '@/core/lib/utils';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  ORDER_STATUS, ORDER_STATUS_LABEL, ORDER_STATUS_ORDER,
  PAYMENT_METHOD_LABEL, formatBRL,
} from '@/modules/shelter/domain/store/products';
import { useStoreOrders, useStoreMutations } from '@/modules/shelter/hooks/useShelterStore';
import OrderFulfillmentControls from './OrderFulfillmentControls';

function fmtDate(v) {
  if (!v) return '';
  try {
    const d = v?.seconds ? new Date(v.seconds * 1000) : new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('pt-BR');
  } catch { return ''; }
}

const STATUS_BADGE = {
  [ORDER_STATUS.PENDING]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  [ORDER_STATUS.CONFIRMED]: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  [ORDER_STATUS.PAID]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  [ORDER_STATUS.SHIPPED]: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  [ORDER_STATUS.DELIVERED]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  [ORDER_STATUS.CANCELLED]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

function OrderCard({ order, onStatus, clubId, actor, showFulfillment }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-foreground">{order.buyer_name || 'Comprador'}</p>
            <span className={cn('shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold', STATUS_BADGE[order.status])}>
              {ORDER_STATUS_LABEL[order.status]}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {(order.items?.length || 0)} {order.items?.length === 1 ? 'item' : 'itens'} · {formatBRL(order.total_cents)} · {fmtDate(order.created_at)}
          </p>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-3 text-sm">
          <ul className="space-y-1">
            {(order.items || []).map((it, i) => (
              <li key={it.product_id || i} className="flex justify-between gap-2">
                <span className="text-foreground">{it.qty}× {it.name}</span>
                <span className="tabular-nums text-muted-foreground">{formatBRL((it.price_cents || 0) * (it.qty || 1))}</span>
              </li>
            ))}
          </ul>
          <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p><span className="font-medium text-foreground">Contato:</span> {order.contact}</p>
            {order.payment_method && <p><span className="font-medium text-foreground">Pagamento:</span> {PAYMENT_METHOD_LABEL[order.payment_method] || order.payment_method}</p>}
            {order.shipping_address && <p className="sm:col-span-2"><span className="font-medium text-foreground">Entrega:</span> {order.shipping_address}</p>}
            {order.message && <p className="sm:col-span-2"><span className="font-medium text-foreground">Mensagem:</span> {order.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Atualizar situação:</span>
            <Select value={order.status} onValueChange={(v) => onStatus(order, v)}>
              <SelectTrigger className="h-8 w-[190px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ORDER_STATUS_ORDER.map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABEL[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {showFulfillment && <OrderFulfillmentControls clubId={clubId} order={order} actor={actor} />}
        </div>
      )}
    </div>
  );
}

export default function StoreOrdersPanel({ clubId, actor }) {
  const storeV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_STORE_V2);
  const { data: orders = [], isLoading } = useStoreOrders(clubId);
  const { setOrderStatus } = useStoreMutations(clubId);

  async function handleStatus(order, status) {
    try {
      await setOrderStatus.mutateAsync({ orderId: order.id, actor, status });
      toast.success(`Pedido: ${ORDER_STATUS_LABEL[status]}`);
    } catch (err) { toast.error(err?.message || 'Erro ao atualizar pedido'); }
  }

  if (isLoading) return <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>;

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-12 text-center">
        <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido ainda. Eles aparecem aqui quando alguém compra na sua loja.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} onStatus={handleStatus} clubId={clubId} actor={actor} showFulfillment={storeV2} />
      ))}
    </div>
  );
}
