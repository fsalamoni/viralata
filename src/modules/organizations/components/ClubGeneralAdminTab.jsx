import React, { useState } from 'react';
import { toast } from 'sonner';
import { Save, MessageCircle, Building2, MapPin, Phone, Mail, Link2, Instagram, FileText, ImageIcon, History, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { useUpdateClub } from '../hooks/useClubs';
import { normalizeClubInput } from '../domain/validators';

/**
 * Aba "Geral" do painel admin da ONG.
 *
 * Layout:
 *  - Identidade (logo + nome + descrição)
 *  - Localização (cidade, UF, sede)
 *  - Contatos (e-mail, telefone, WhatsApp, Instagram, link doação)
 *  - Institucional (história, CNPJ)
 *  - Chat (toggle global)
 *
 * Sub-áreas usam `arena-section-card` (consistente com o resto do admin).
 */
export default function ClubGeneralAdminTab({ club }) {
  const updateClub = useUpdateClub(club.id);

  const [form, setForm] = useState({
    name: club.name || '',
    description: club.description || '',
    history: club.history || '',
    city: club.city || '',
    state: club.state || '',
    home_venue: club.home_venue || '',
    contact_email: club.contact_email || '',
    contact_phone: club.contact_phone || '',
    whatsapp_number: club.whatsapp_number || '',
    instagram: club.instagram || '',
    logo_url: club.logo_url || '',
    cnpj: club.cnpj || '',
    donation_link: club.donation_link || '',
    chat_enabled: club.chat_enabled !== false,
  });

  const setField = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const setBool = (key) => (v) => setForm((prev) => ({ ...prev, [key]: v }));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const sanitized = normalizeClubInput(form);
      await updateClub.mutateAsync(sanitized);
      toast.success('Informações da ONG atualizadas.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar as alterações.');
    }
  };

  return (
    <form onSubmit={handleSave} className="arena-admin-section">
      {/* Identidade */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="arena-section-card-title">Identidade</h3>
              <p className="arena-section-card-description">Como a ONG aparece no diretório e para o público.</p>
            </div>
          </div>
        </header>
        <div className="arena-section-card-body space-y-5">
          <Field label="Logo / imagem da organização" hint="Foto exibida no diretório e na página da ONG.">
            <ImageUpload
              value={form.logo_url}
              onChange={(url) => setField('logo_url')({ target: { value: url } })}
              folder="clubs"
              shape="square"
              label="Enviar logo"
              hint="Logo ou foto da organização"
            />
          </Field>
          <Field label="Nome da organização" required>
            <Input value={form.name} onChange={setField('name')} placeholder="Ex: Associação Patinhas Felizes" required />
          </Field>
          <Field label="Descrição (missão)" hint="Texto curto exibido na home da ONG.">
            <textarea
              value={form.description}
              onChange={setField('description')}
              rows={3}
              placeholder="Missão da ONG em poucas palavras."
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>
        </div>
      </section>

      {/* Localização */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <h3 className="arena-section-card-title">Localização</h3>
              <p className="arena-section-card-description">Onde a ONG atua e recebe visitas.</p>
            </div>
          </div>
        </header>
        <div className="arena-section-card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Cidade">
            <Input value={form.city} onChange={setField('city')} placeholder="São Paulo" />
          </Field>
          <Field label="UF">
            <Input value={form.state} onChange={setField('state')} maxLength={2} placeholder="SP" className="uppercase" />
          </Field>
          <Field label="Sede / endereço principal" full>
            <Input value={form.home_venue} onChange={setField('home_venue')} placeholder="Rua, número, bairro" />
          </Field>
        </div>
      </section>

      {/* Contatos */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Phone className="h-4 w-4" />
            </span>
            <div>
              <h3 className="arena-section-card-title">Contatos</h3>
              <p className="arena-section-card-description">Como o público entra em contato.</p>
            </div>
          </div>
        </header>
        <div className="arena-section-card-body grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="E-mail" icon={Mail}>
            <Input type="email" value={form.contact_email} onChange={setField('contact_email')} placeholder="contato@ong.org.br" />
          </Field>
          <Field label="Telefone" icon={Phone}>
            <Input value={form.contact_phone} onChange={setField('contact_phone')} placeholder="(11) 1234-5678" />
          </Field>
          <Field label="WhatsApp" icon={MessageCircle}>
            <Input value={form.whatsapp_number} onChange={setField('whatsapp_number')} placeholder="5511987654321" />
          </Field>
          <Field label="Instagram" icon={Instagram}>
            <Input value={form.instagram} onChange={setField('instagram')} placeholder="@patinhas" />
          </Field>
          <Field label="Link de doação" full icon={Link2}>
            <Input value={form.donation_link} onChange={setField('donation_link')} placeholder="https://..." />
          </Field>
        </div>
      </section>

      {/* Institucional */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <History className="h-4 w-4" />
            </span>
            <div>
              <h3 className="arena-section-card-title">Institucional</h3>
              <p className="arena-section-card-description">História e dados oficiais.</p>
            </div>
          </div>
        </header>
        <div className="arena-section-card-body space-y-4">
          <Field label="História" hint="Texto longo exibido na aba Sobre." icon={FileText}>
            <textarea
              value={form.history}
              onChange={setField('history')}
              rows={5}
              placeholder="Conte a história da ONG, marco de fundação, missão."
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </Field>
          <Field label="CNPJ" hint="Opcional — exibido na página institucional." icon={Building2}>
            <Input value={form.cnpj} onChange={setField('cnpj')} placeholder="00.000.000/0000-00" />
          </Field>
        </div>
      </section>

      {/* Chat */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageCircle className="h-4 w-4" />
            </span>
            <div>
              <h3 className="arena-section-card-title">Chat com visitantes</h3>
              <p className="arena-section-card-description">Permitir que visitantes abram conversa com a ONG.</p>
            </div>
          </div>
        </header>
        <div className="arena-section-card-body flex items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <ToggleRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="chat_enabled" className="text-[13px] font-semibold">Chat habilitado</Label>
              <p className="text-[12px] text-muted-foreground">Quando ativo, visitantes podem abrir uma thread de chat com a ONG.</p>
            </div>
          </div>
          <Switch id="chat_enabled" checked={form.chat_enabled} onCheckedChange={setBool('chat_enabled')} />
        </div>
      </section>

      {/* Botão salvar (sticky no fim) */}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={updateClub.isPending} size="lg" className="min-w-[180px] gap-2">
          <Save className="h-4 w-4" />
          {updateClub.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}

/** Sub-componente de field com label + helper + children (input/textarea/switch). */
function Field({ label, hint, required, full, icon: Icon, children }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <div className="mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <Label className="text-[12.5px] font-semibold text-foreground/90">
          {label}
          {required && <span className="ml-0.5 text-rose-600">*</span>}
        </Label>
      </div>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
