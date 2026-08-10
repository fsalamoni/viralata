/**
 * @fileoverview StoreSettingsPanel — configurações da loja do abrigo:
 * ligar/desligar a loja, visibilidade pública, formas de pagamento
 * (off-platform: PIX, a combinar, link externo, dinheiro na retirada),
 * políticas de envio/troca e contato.
 */
import React, { useState, useEffect } from 'react';
import { Loader2, Store, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/core/lib/utils';
import { storeSettingsSchema } from '@/modules/shelter/domain/store/products';
import { useStoreSettings, useStoreMutations } from '@/modules/shelter/hooks/useShelterStore';

const empty = {
  enabled: false, public_visible: false, headline: '', about: '',
  accepts_pix: false, pix_key: '', pix_name: '',
  accepts_to_arrange: true, external_checkout_url: '', accepts_cash_on_pickup: false,
  shipping_policy: '', return_policy: '', contact_whatsapp: '', contact_email: '',
};

function Row({ title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function StoreSettingsPanel({ clubId, actor }) {
  const { data: settings, isLoading } = useStoreSettings(clubId);
  const { saveSettings } = useStoreMutations(clubId);
  const [f, setF] = useState(empty);

  useEffect(() => {
    if (settings) setF({ ...empty, ...settings });
  }, [settings]);

  const set = (key) => (e) => setF((p) => ({ ...p, [key]: e?.target ? e.target.value : e }));

  async function save() {
    try {
      const payload = storeSettingsSchema.parse({ ...f, external_checkout_url: f.external_checkout_url || '' });
      await saveSettings.mutateAsync({ actor, payload });
      toast.success('Configurações da loja salvas');
    } catch (err) {
      toast.error(err?.errors?.[0]?.message || err?.message || 'Não foi possível salvar');
    }
  }

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground"><Store className="h-4 w-4 text-primary" /> Loja</h3>
        <Row title="Loja ativa" desc="Habilita a loja para a equipe cadastrar e gerenciar produtos.">
          <Switch checked={f.enabled} onCheckedChange={(v) => setF((p) => ({ ...p, enabled: v }))} />
        </Row>
        <Row
          title="Visível ao público"
          desc="Quando ligada, a vitrine aparece na página pública do abrigo e no marketplace da plataforma."
        >
          <div className="flex items-center gap-2">
            {f.public_visible ? <Eye className="h-4 w-4 text-emerald-600" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
            <Switch checked={f.public_visible} disabled={!f.enabled} onCheckedChange={(v) => setF((p) => ({ ...p, public_visible: v }))} />
          </div>
        </Row>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-headline">Chamada da loja</Label>
            <Input id="s-headline" value={f.headline} onChange={set('headline')} placeholder="Ex.: Produtos que ajudam nossos resgatados" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-about">Sobre a loja</Label>
            <Input id="s-about" value={f.about} onChange={set('about')} placeholder="Breve descrição" />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Pagamento</h3>
        <p className="text-xs text-muted-foreground">
          A plataforma não processa pagamentos — o combinado é direto entre comprador e abrigo.
          Configure abaixo as formas que o abrigo aceita.
        </p>
        <Row title="Aceita PIX" desc="A chave/QR é exibida ao comprador ao finalizar o pedido.">
          <Switch checked={f.accepts_pix} onCheckedChange={(v) => setF((p) => ({ ...p, accepts_pix: v }))} />
        </Row>
        {f.accepts_pix && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-pix">Chave PIX</Label>
              <Input id="s-pix" value={f.pix_key} onChange={set('pix_key')} placeholder="CPF/CNPJ, e-mail, telefone ou aleatória" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-pixname">Nome do recebedor</Label>
              <Input id="s-pixname" value={f.pix_name} onChange={set('pix_name')} placeholder="Nome que aparece no PIX" />
            </div>
          </div>
        )}
        <Row title="A combinar" desc="Comprador e abrigo combinam o pagamento pelo contato.">
          <Switch checked={f.accepts_to_arrange} onCheckedChange={(v) => setF((p) => ({ ...p, accepts_to_arrange: v }))} />
        </Row>
        <Row title="Dinheiro/cartão na retirada" desc="Pagamento presencial ao retirar o produto.">
          <Switch checked={f.accepts_cash_on_pickup} onCheckedChange={(v) => setF((p) => ({ ...p, accepts_cash_on_pickup: v }))} />
        </Row>
        <div className="space-y-1.5">
          <Label htmlFor="s-ext">Link de pagamento externo (opcional)</Label>
          <Input id="s-ext" value={f.external_checkout_url} onChange={set('external_checkout_url')} placeholder="https://mpago.la/... ou outro checkout do abrigo" />
          <p className="text-[10.5px] text-muted-foreground">Se preenchido, o comprador pode ser levado ao checkout do próprio abrigo (Mercado Pago, PagSeguro etc.).</p>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-bold text-foreground">Políticas e contato</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="s-ship">Política de envio</Label>
            <Textarea id="s-ship" rows={3} value={f.shipping_policy} onChange={set('shipping_policy')} placeholder="Como e em quanto tempo os produtos são enviados" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-ret">Política de trocas</Label>
            <Textarea id="s-ret" rows={3} value={f.return_policy} onChange={set('return_policy')} placeholder="Regras de troca e devolução" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-wa">WhatsApp de contato</Label>
            <Input id="s-wa" value={f.contact_whatsapp} onChange={set('contact_whatsapp')} placeholder="(11) 90000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-email">E-mail de contato</Label>
            <Input id="s-email" value={f.contact_email} onChange={set('contact_email')} placeholder="loja@abrigo.org" />
          </div>
        </div>
      </section>

      <div className={cn('sticky bottom-0 flex justify-end border-t border-border bg-background/90 py-3 backdrop-blur')}>
        <Button onClick={save} disabled={saveSettings.isPending}>
          {saveSettings.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          Salvar configurações
        </Button>
      </div>
    </div>
  );
}
