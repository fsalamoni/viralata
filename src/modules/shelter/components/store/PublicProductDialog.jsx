/**
 * @fileoverview PublicProductDialog — detalhe público de um produto: galeria
 * (fotos/vídeos), preço, entrega, disponibilidade, comprar (gera pedido),
 * perguntas ao abrigo e avaliações. SEM qualquer controle de gestão.
 */
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Loader2, Star, MessageCircleQuestion, ShoppingCart, Truck, Package, Store, Copy, Check,
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
import { cn } from '@/core/lib/utils';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import {
  DELIVERY_METHOD_LABEL, PAYMENT_METHOD, PAYMENT_METHOD_LABEL,
  formatBRL, isInStock, ratingSummary,
} from '@/modules/shelter/domain/store/products';
import {
  useProductReviews, useProductQuestions, useProductInteractions,
} from '@/modules/shelter/hooks/useShelterStore';
import * as storeSvc from '@/modules/shelter/services/shelterStoreService';
import { ProductMediaGallery } from './ProductMediaField';
import AddToCartButton from './AddToCartButton';

/** Hook local para createOrder (a família principal é keyed por produto). */
function useCreateOrder(clubId) {
  const qc = useQueryClient();
  const createOrder = useMutation({
    mutationFn: ({ actor, payload }) => storeSvc.createOrder(clubId, actor, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-orders', clubId] }),
  });
  return { createOrder };
}

function fmtDate(v) {
  if (!v) return '';
  try {
    const d = v?.seconds ? new Date(v.seconds * 1000) : new Date(v);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
  } catch { return ''; }
}

function Stars({ value = 0, onChange, size = 'h-4 w-4' }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={cn(onChange && 'cursor-pointer')}
          aria-label={`${n} estrela(s)`}
        >
          <Star className={cn(size, n <= value ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground')} />
        </button>
      ))}
    </div>
  );
}

function buildPaymentOptions(settings) {
  const opts = [];
  if (settings?.accepts_pix) opts.push(PAYMENT_METHOD.PIX);
  if (settings?.accepts_to_arrange) opts.push(PAYMENT_METHOD.TO_ARRANGE);
  if (settings?.external_checkout_url) opts.push(PAYMENT_METHOD.EXTERNAL_LINK);
  if (settings?.accepts_cash_on_pickup) opts.push(PAYMENT_METHOD.CASH_ON_PICKUP);
  return opts.length ? opts : [PAYMENT_METHOD.TO_ARRANGE];
}

export default function PublicProductDialog({ open, onOpenChange, clubId, product, settings, actor, clubName }) {
  const storeV2 = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_STORE_V2);
  const productId = product?.id;
  const { data: reviews = [] } = useProductReviews(clubId, productId, Boolean(open && productId));
  const { data: questions = [] } = useProductQuestions(clubId, productId, Boolean(open && productId));
  const { addReview, askQuestion } = useProductInteractions(clubId, productId);

  const [mode, setMode] = useState('detail'); // detail | buy | done
  const [order, setOrder] = useState({ name: actor?.name || '', contact: '', message: '', payment: '', shipping: '' });
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [question, setQuestion] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const { createOrder } = useCreateOrder(clubId);

  React.useEffect(() => {
    if (open) {
      setMode('detail');
      setOrder({ name: actor?.name || '', contact: '', message: '', payment: '', shipping: '' });
      setReviewForm({ rating: 0, comment: '' });
      setQuestion('');
    }
  }, [open, actor?.name]);

  if (!product) return null;
  const rating = ratingSummary(reviews);
  const stock = isInStock(product);
  const payOpts = buildPaymentOptions(settings);

  async function submitOrder(e) {
    e?.preventDefault();
    if (!actor?.uid) { toast.error('Faça login para comprar.'); return; }
    if (order.name.trim().length < 2) { toast.error('Informe seu nome.'); return; }
    if (order.contact.trim().length < 3) { toast.error('Informe um contato (WhatsApp/e-mail).'); return; }
    setBusy(true);
    try {
      await createOrder.mutateAsync({
        actor,
        payload: {
          items: [{ product_id: product.id, name: product.name, price_cents: product.price_cents, qty: 1, image_url: product.images?.[0]?.url }],
          buyer_name: order.name.trim(),
          contact: order.contact.trim(),
          message: order.message.trim(),
          payment_method: order.payment || payOpts[0],
          shipping_address: order.shipping.trim(),
        },
      });
      setMode('done');
    } catch (err) {
      toast.error(err?.errors?.[0]?.message || err?.message || 'Não foi possível registrar o pedido.');
    } finally { setBusy(false); }
  }

  async function submitReview() {
    if (!actor?.uid) { toast.error('Faça login para avaliar.'); return; }
    if (reviewForm.rating < 1) { toast.error('Escolha de 1 a 5 estrelas.'); return; }
    try {
      await addReview.mutateAsync({ actor, payload: { rating: reviewForm.rating, comment: reviewForm.comment.trim() } });
      setReviewForm({ rating: 0, comment: '' });
      toast.success('Avaliação enviada. Obrigado!');
    } catch (err) { toast.error(err?.message || 'Erro ao enviar avaliação'); }
  }

  async function submitQuestion() {
    if (!actor?.uid) { toast.error('Faça login para perguntar.'); return; }
    if (question.trim().length < 3) { toast.error('Escreva sua pergunta.'); return; }
    try {
      await askQuestion.mutateAsync({ actor, payload: { question: question.trim() } });
      setQuestion('');
      toast.success('Pergunta enviada ao abrigo.');
    } catch (err) { toast.error(err?.message || 'Erro ao enviar pergunta'); }
  }

  function copyPix() {
    if (!settings?.pix_key) return;
    navigator.clipboard?.writeText(settings.pix_key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        {mode === 'done' ? (
          <div className="space-y-4 py-2 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40">
              <Check className="h-7 w-7" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-center">Pedido registrado!</DialogTitle>
              <DialogDescription className="text-center">
                O abrigo receberá seu pedido de <strong>{product.name}</strong> e entrará em contato.
                Combine o pagamento e a entrega diretamente com o abrigo.
              </DialogDescription>
            </DialogHeader>
            {(order.payment === PAYMENT_METHOD.PIX || (payOpts.includes(PAYMENT_METHOD.PIX) && !order.payment)) && settings?.pix_key && (
              <div className="rounded-xl border border-border bg-muted/40 p-3 text-left text-sm">
                <p className="font-semibold text-foreground">PIX{settings.pix_name ? ` — ${settings.pix_name}` : ''}</p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 text-xs">{settings.pix_key}</code>
                  <Button type="button" size="sm" variant="outline" onClick={copyPix}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            {order.payment === PAYMENT_METHOD.EXTERNAL_LINK && settings?.external_checkout_url && (
              <Button asChild className="w-full"><a href={settings.external_checkout_url} target="_blank" rel="noopener noreferrer">Ir para o pagamento</a></Button>
            )}
            <DialogFooter><Button onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
          </div>
        ) : mode === 'buy' ? (
          <form onSubmit={submitOrder} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Comprar · {product.name}</DialogTitle>
              <DialogDescription>{formatBRL(product.price_cents)} — o pagamento é combinado direto com o abrigo.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <Label htmlFor="o-name">Seu nome *</Label>
              <Input id="o-name" value={order.name} onChange={(e) => setOrder((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-contact">Contato (WhatsApp/e-mail) *</Label>
              <Input id="o-contact" value={order.contact} onChange={(e) => setOrder((p) => ({ ...p, contact: e.target.value }))} placeholder="(11) 90000-0000" />
            </div>
            {payOpts.length > 1 && (
              <div className="space-y-1.5">
                <Label>Forma de pagamento</Label>
                <Select value={order.payment || payOpts[0]} onValueChange={(v) => setOrder((p) => ({ ...p, payment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {payOpts.map((m) => <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="o-ship">Endereço/observação de entrega (opcional)</Label>
              <Input id="o-ship" value={order.shipping} onChange={(e) => setOrder((p) => ({ ...p, shipping: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-msg">Mensagem ao abrigo (opcional)</Label>
              <Textarea id="o-msg" rows={2} value={order.message} onChange={(e) => setOrder((p) => ({ ...p, message: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMode('detail')} disabled={busy}>Voltar</Button>
              <Button type="submit" disabled={busy}>{busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null} Enviar pedido</Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{product.name}</DialogTitle>
              {product.description && <DialogDescription>{product.description}</DialogDescription>}
            </DialogHeader>

            <ProductMediaGallery images={product.images} videos={product.videos} />

            <div className="flex items-end justify-between gap-3">
              <div>
                {product.compare_at_price_cents > product.price_cents && (
                  <span className="mr-1.5 text-sm text-muted-foreground line-through">{formatBRL(product.compare_at_price_cents)}</span>
                )}
                <span className="text-2xl font-extrabold text-foreground">{formatBRL(product.price_cents)}</span>
              </div>
              {rating.count > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  <Stars value={Math.round(rating.average)} />
                  <span className="text-muted-foreground">{rating.average} ({rating.count})</span>
                </div>
              )}
            </div>

            {(product.details || product.material) && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {product.material && <p><span className="font-medium text-foreground">Material:</span> {product.material}</p>}
                {product.details && <p>{product.details}</p>}
              </div>
            )}

            {product.delivery_methods?.length > 0 && (
              <div className="flex flex-wrap gap-2 text-xs">
                {product.delivery_methods.map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                    <Truck className="h-3 w-3" /> {DELIVERY_METHOD_LABEL[m]}
                  </span>
                ))}
                {product.shipping_cost_cents > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                    Frete {formatBRL(product.shipping_cost_cents)}
                  </span>
                )}
                {product.lead_time_days != null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                    <Package className="h-3 w-3" /> {product.lead_time_days} dia(s)
                  </span>
                )}
              </div>
            )}

            <Button className="w-full" disabled={!stock} onClick={() => setMode('buy')}>
              <ShoppingCart className="mr-1.5 h-4 w-4" /> {stock ? 'Comprar' : 'Esgotado'}
            </Button>

            {storeV2 && (
              <AddToCartButton
                product={product}
                clubId={clubId}
                clubName={clubName}
                className="w-full"
                variant="outline"
              />
            )}

            {/* Perguntas */}
            <section className="space-y-2 border-t border-border pt-3">
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><MessageCircleQuestion className="h-4 w-4 text-primary" /> Perguntas</h4>
              <div className="flex gap-2">
                <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Pergunte ao abrigo sobre este produto" />
                <Button type="button" variant="outline" onClick={submitQuestion} disabled={askQuestion.isPending}>Perguntar</Button>
              </div>
              <ul className="space-y-2">
                {questions.slice(0, 8).map((q) => (
                  <li key={q.id} className="rounded-lg bg-muted/40 p-2.5 text-sm">
                    <p className="text-foreground"><span className="font-semibold">{q.author_name || 'Usuário'}:</span> {q.question}</p>
                    {q.answer && <p className="mt-1 text-muted-foreground"><span className="font-semibold text-primary">Abrigo:</span> {q.answer}</p>}
                  </li>
                ))}
                {questions.length === 0 && <li className="text-xs text-muted-foreground">Nenhuma pergunta ainda. Seja o primeiro.</li>}
              </ul>
            </section>

            {/* Avaliações */}
            <section className="space-y-2 border-t border-border pt-3">
              <h4 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Star className="h-4 w-4 text-amber-500" /> Avaliações</h4>
              <div className="rounded-lg border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <Stars value={reviewForm.rating} onChange={(n) => setReviewForm((p) => ({ ...p, rating: n }))} size="h-5 w-5" />
                  <span className="text-xs text-muted-foreground">Toque para avaliar</span>
                </div>
                <Textarea className="mt-2" rows={2} value={reviewForm.comment} onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))} placeholder="Conte como foi sua experiência (opcional)" />
                <Button type="button" size="sm" className="mt-2" onClick={submitReview} disabled={addReview.isPending}>Enviar avaliação</Button>
              </div>
              <ul className="space-y-2">
                {reviews.slice(0, 10).map((r) => (
                  <li key={r.id} className="rounded-lg bg-muted/40 p-2.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{r.author_name || 'Usuário'}</span>
                      <Stars value={r.rating} size="h-3.5 w-3.5" />
                    </div>
                    {r.comment && <p className="mt-0.5 text-muted-foreground">{r.comment}</p>}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDate(r.created_at)}</p>
                  </li>
                ))}
                {reviews.length === 0 && <li className="text-xs text-muted-foreground">Ainda sem avaliações.</li>}
              </ul>
            </section>

            {(settings?.shipping_policy || settings?.return_policy || settings?.contact_whatsapp || settings?.contact_email) && (
              <section className="space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                <h4 className="flex items-center gap-1.5 text-sm font-bold text-foreground"><Store className="h-4 w-4 text-primary" /> Sobre a loja</h4>
                {settings.shipping_policy && <p><span className="font-medium text-foreground">Envio:</span> {settings.shipping_policy}</p>}
                {settings.return_policy && <p><span className="font-medium text-foreground">Trocas:</span> {settings.return_policy}</p>}
                {settings.contact_whatsapp && <p><span className="font-medium text-foreground">WhatsApp:</span> {settings.contact_whatsapp}</p>}
                {settings.contact_email && <p><span className="font-medium text-foreground">E-mail:</span> {settings.contact_email}</p>}
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
