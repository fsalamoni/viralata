/**
 * @fileoverview CheckoutDialog — finalização de compra (Loja v2 ·
 * SHELTER_STORE_V2). Agrupa o carrinho por abrigo, coleta dados do comprador e
 * o método de pagamento por abrigo, e cria UM pedido por abrigo reusando o
 * `createOrder` da v1. Pagamento é off-platform (com ponto de extensão): a tela
 * de sucesso mostra as instruções e o número do pedido para acompanhamento.
 */
import React, { useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import {
  Loader2, ShoppingBag, Copy, Check, ExternalLink, PartyPopper,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { formatBRL } from '@/modules/shelter/domain/store/products';
import { buildCheckoutView } from '@/modules/shelter/domain/store/storeOpsView';
import { resolvePaymentInstructions } from '@/modules/shelter/domain/store/storeCart';
import { getStoreSettings } from '@/modules/shelter/services/shelterStoreService';
import { useCart, useCheckoutMutation } from '@/modules/shelter/hooks/useShelterStoreV2';

function PaymentInstructions({ settings, methodId }) {
  const [copied, setCopied] = useState(false);
  const ins = resolvePaymentInstructions(settings, methodId);
  function copy() {
    if (!ins.copyable) return;
    navigator.clipboard?.writeText(ins.copyable).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }
  return (
    <div className="rounded-lg bg-muted/50 p-2.5 text-xs">
      <p className="font-semibold text-foreground">{ins.title}</p>
      {ins.pix_key && (
        <div className="mt-1 flex items-center gap-2">
          <code className="truncate rounded bg-background px-1.5 py-0.5">{ins.pix_key}</code>
          <button type="button" onClick={copy} className="inline-flex items-center gap-1 text-primary">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
      {ins.url && (
        <a href={ins.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-primary">
          <ExternalLink className="h-3 w-3" /> Abrir link de pagamento
        </a>
      )}
      {ins.note && <p className="mt-1 text-muted-foreground">{ins.note}</p>}
    </div>
  );
}

export default function CheckoutDialog({ open, onOpenChange, actor }) {
  const { cart, groups, clearShelter, isEmpty } = useCart();
  const clubIds = useMemo(() => groups.map((g) => g.club_id), [groups]);

  // Busca as settings de cada abrigo do carrinho (para opções de pagamento).
  const settingsQueries = useQueries({
    queries: clubIds.map((clubId) => ({
      queryKey: ['store-settings', clubId],
      queryFn: () => getStoreSettings(clubId),
      enabled: Boolean(open && clubId),
      staleTime: 30_000,
    })),
  });
  const settingsByClub = useMemo(() => {
    const map = {};
    clubIds.forEach((clubId, i) => { map[clubId] = settingsQueries[i]?.data || null; });
    return map;
  }, [clubIds, settingsQueries]);

  const view = useMemo(() => buildCheckoutView(cart, settingsByClub), [cart, settingsByClub]);
  const checkout = useCheckoutMutation();

  const [buyer, setBuyer] = useState({ name: actor?.name || '', contact: '', message: '' });
  const [payByClub, setPayByClub] = useState({});
  const [results, setResults] = useState(null);

  React.useEffect(() => {
    if (open) {
      setBuyer({ name: actor?.name || '', contact: '', message: '' });
      setPayByClub({});
      setResults(null);
    }
  }, [open, actor?.name]);

  function payFor(group) {
    return payByClub[group.club_id] || group.paymentOptions[0]?.id;
  }

  async function submit(e) {
    e?.preventDefault();
    if (!actor?.uid) { toast.error('Faça login para finalizar a compra.'); return; }
    if (buyer.name.trim().length < 2) { toast.error('Informe seu nome.'); return; }
    if (buyer.contact.trim().length < 3) { toast.error('Informe um contato (WhatsApp/e-mail).'); return; }
    const perShelter = {};
    for (const g of view.groups) perShelter[g.club_id] = { payment_method: payFor(g) };
    try {
      const res = await checkout.mutateAsync({
        actor,
        cart,
        meta: { buyer: { buyer_name: buyer.name.trim(), contact: buyer.contact.trim(), message: buyer.message.trim() }, perShelter },
      });
      // Limpa do carrinho os abrigos cujo pedido foi criado.
      res.filter((r) => r.ok).forEach((r) => clearShelter(r.club_id));
      setResults(res);
      const okCount = res.filter((r) => r.ok).length;
      if (okCount > 0) toast.success(`${okCount} pedido(s) enviados ao(s) abrigo(s).`);
      if (res.some((r) => !r.ok)) toast.error('Alguns pedidos falharam. Tente novamente.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível finalizar a compra.');
    }
  }

  const busy = checkout.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        {results ? (
          <div className="space-y-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><PartyPopper className="h-5 w-5 text-emerald-600" /> Pedido(s) registrado(s)</DialogTitle>
              <DialogDescription>Acompanhe o andamento em “Meus pedidos”. O pagamento é combinado diretamente com cada abrigo.</DialogDescription>
            </DialogHeader>
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={r.club_id} className="rounded-lg border border-border p-2.5 text-sm">
                  <p className="font-semibold text-foreground">{r.club_name || 'Abrigo'}</p>
                  {r.ok ? (
                    <>
                      <p className="text-xs text-muted-foreground">Pedido #{String(r.order_id).slice(0, 8)} enviado.</p>
                      <div className="mt-1.5">
                        <PaymentInstructions settings={settingsByClub[r.club_id]} methodId={payByClub[r.club_id]} />
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-rose-600">Falhou: {r.error || 'tente novamente'}</p>
                  )}
                </li>
              ))}
            </ul>
            <DialogFooter>
              <Button onClick={() => onOpenChange?.(false)}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-primary" /> Finalizar compra</DialogTitle>
              <DialogDescription>
                {view.shelter_count > 1
                  ? `Seu carrinho tem itens de ${view.shelter_count} abrigos — será criado um pedido para cada um.`
                  : 'Confirme seus dados e o método de pagamento (combinado com o abrigo).'}
              </DialogDescription>
            </DialogHeader>

            {isEmpty ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Seu carrinho está vazio.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="ck-name">Seu nome</Label>
                    <Input id="ck-name" value={buyer.name} onChange={(e) => setBuyer((b) => ({ ...b, name: e.target.value }))} placeholder="Nome completo" />
                  </div>
                  <div>
                    <Label htmlFor="ck-contact">Contato (WhatsApp/e-mail)</Label>
                    <Input id="ck-contact" value={buyer.contact} onChange={(e) => setBuyer((b) => ({ ...b, contact: e.target.value }))} placeholder="(00) 90000-0000 ou email@exemplo.com" />
                  </div>
                  <div>
                    <Label htmlFor="ck-msg">Mensagem (opcional)</Label>
                    <Textarea id="ck-msg" rows={2} value={buyer.message} onChange={(e) => setBuyer((b) => ({ ...b, message: e.target.value }))} placeholder="Alguma observação para o abrigo?" />
                  </div>
                </div>

                <ul className="space-y-2">
                  {view.groups.map((g) => (
                    <li key={g.club_id} className="rounded-lg border border-border p-2.5">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground">{g.club_name}</p>
                        <span className="text-sm font-bold text-foreground">{g.subtotal_label}</span>
                      </div>
                      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                        {g.items.map((it) => (
                          <li key={it.key} className="flex justify-between">
                            <span>{it.qty}× {it.name}{it.variant_label ? ` — ${it.variant_label}` : ''}</span>
                            <span>{formatBRL(it.price_cents * it.qty)}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2">
                        <Label className="text-xs">Pagamento</Label>
                        <Select value={payFor(g)} onValueChange={(v) => setPayByClub((p) => ({ ...p, [g.club_id]: v }))}>
                          <SelectTrigger className="mt-0.5 h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {g.paymentOptions.map((opt) => (
                              <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">Total ({view.count} item(ns))</span>
                  <span className="text-lg font-extrabold text-foreground">{view.subtotal_label}</span>
                </div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)} disabled={busy}>Cancelar</Button>
              <Button type="submit" disabled={busy || isEmpty}>
                {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-1.5 h-4 w-4" />}
                Enviar pedido(s)
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
