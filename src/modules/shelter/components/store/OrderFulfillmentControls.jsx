/**
 * @fileoverview OrderFulfillmentControls — controles de envio/rastreio de um
 * pedido (Loja v2, SHELTER_STORE_V2). Transportadora, código e URL de rastreio,
 * previsão e observações; opção de marcar como enviado. Persiste no campo aditivo
 * `fulfillment` do pedido via useStoreOpsMutations. Montado só com a flag.
 */
import React, { useState } from 'react';
import { Truck, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ORDER_STATUS } from '@/modules/shelter/domain/store/products';
import { useStoreOpsMutations } from '@/modules/shelter/hooks/useShelterStoreV2';

export default function OrderFulfillmentControls({ clubId, order, actor }) {
  const f = order?.fulfillment || {};
  const [carrier, setCarrier] = useState(f.carrier || '');
  const [trackingCode, setTrackingCode] = useState(f.tracking_code || '');
  const [trackingUrl, setTrackingUrl] = useState(f.tracking_url || '');
  const [estimated, setEstimated] = useState(f.estimated_delivery || '');
  const [notes, setNotes] = useState(f.notes || '');
  const { setFulfillment } = useStoreOpsMutations(clubId);

  const notShipped = order?.status !== ORDER_STATUS.SHIPPED
    && order?.status !== ORDER_STATUS.DELIVERED
    && order?.status !== ORDER_STATUS.CANCELLED;

  async function save(markShipped) {
    try {
      await setFulfillment.mutateAsync({
        orderId: order.id,
        actor,
        fulfillment: {
          carrier, tracking_code: trackingCode, tracking_url: trackingUrl,
          estimated_delivery: estimated, notes,
        },
        markShipped,
      });
      toast.success(markShipped ? 'Pedido marcado como enviado' : 'Envio atualizado');
    } catch (err) {
      toast.error(err?.message || 'Erro ao salvar envio');
    }
  }

  const busy = setFulfillment.isPending;
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Truck className="h-3.5 w-3.5" /> Envio e rastreio
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`carrier-${order.id}`} className="text-[11px]">Transportadora</Label>
          <Input id={`carrier-${order.id}`} value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Correios, motoboy…" className="h-8" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`tcode-${order.id}`} className="text-[11px]">Código de rastreio</Label>
          <Input id={`tcode-${order.id}`} value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} className="h-8" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`turl-${order.id}`} className="text-[11px]">URL de rastreio</Label>
          <Input id={`turl-${order.id}`} value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://…" className="h-8" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`eta-${order.id}`} className="text-[11px]">Previsão de entrega</Label>
          <Input id={`eta-${order.id}`} value={estimated} onChange={(e) => setEstimated(e.target.value)} placeholder="ex.: 3–5 dias úteis" className="h-8" />
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <Label htmlFor={`fnotes-${order.id}`} className="text-[11px]">Observações do envio</Label>
        <Textarea id={`fnotes-${order.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="text-sm" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => save(false)}>
          <Save className="mr-1 h-3.5 w-3.5" /> Salvar
        </Button>
        {notShipped && (
          <Button type="button" size="sm" disabled={busy} onClick={() => save(true)}>
            <Truck className="mr-1 h-3.5 w-3.5" /> Salvar e marcar enviado
          </Button>
        )}
      </div>
    </div>
  );
}
