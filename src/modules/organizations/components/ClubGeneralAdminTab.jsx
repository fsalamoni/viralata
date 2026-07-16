import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Save, MessageCircle, Building2, MapPin, Phone, Mail, Link2, Instagram,
  FileText, ImageIcon, History, ToggleRight, RotateCcw, AlertCircle, CheckCircle2, Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ImageUpload } from '@/components/ui/image-upload';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/core/lib/utils';
import { useUpdateClub } from '../hooks/useClubs';
import { normalizeClubInput } from '../domain/validators';

/**
 * Aba "Geral" do painel admin da ONG.
 *
 * Layout (4 seções + sticky save bar):
 *  - Identidade (logo + nome + descrição) — com preview da logo
 *  - Localização (cidade, UF, sede)
 *  - Contatos (e-mail, telefone, WhatsApp, Instagram, link doação)
 *  - Institucional (história, CNPJ)
 *  - Chat (toggle global)
 *
 * Mudanças TASK-787 (DS_V2 polish):
 *  - Dirty state indicator ("Alterações não salvas")
 *  - Botão Cancelar que reseta o form
 *  - Sticky save bar no fim do form
 *  - Preview da logo no card Identidade
 *  - <textarea inline> substituído por <Textarea> do UI
 *  - Validação visual do CNPJ (placeholder formatado)
 *  - Empty state quando ONG não tem logo
 */
const EMPTY_FORM = {
  name: '',
  description: '',
  history: '',
  city: '',
  state: '',
  home_venue: '',
  contact_email: '',
  contact_phone: '',
  whatsapp_number: '',
  instagram: '',
  logo_url: '',
  cnpj: '',
  donation_link: '',
  chat_enabled: true,
};

function buildForm(club) {
  return {
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
  };
}

function isDirty(initial, current) {
  return Object.keys(EMPTY_FORM).some((k) => initial[k] !== current[k]);
}

function formatCNPJ(v) {
  // Strip non-digits, then apply mask 00.000.000/0000-00
  const digits = String(v || '').replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export default function ClubGeneralAdminTab({ club }) {
  const updateClub = useUpdateClub(club.id);

  const initialRef = useRef(buildForm(club));
  const [form, setForm] = useState(initialRef.current);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const dirty = isDirty(initialRef.current, form);

  // Reset form if club prop changes (e.g., navigation between abrigos)
  useEffect(() => {
    initialRef.current = buildForm(club);
    setForm(initialRef.current);
  }, [club?.id]);

  const setField = (key) => (e) =>
    setForm((prev) => ({ ...prev, [key]: e.target?.value ?? e }));
  const setBool = (key) => (v) => setForm((prev) => ({ ...prev, [key]: v }));

  const handleReset = () => {
    setForm(initialRef.current);
    toast.info('Alterações descartadas.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dirty || saving) return;
    setSaving(true);
    try {
      const sanitized = normalizeClubInput(form);
      await updateClub.mutateAsync(sanitized);
      // Atualiza baseline para que dirty=false após salvar
      initialRef.current = { ...form };
      setLastSavedAt(new Date());
      toast.success('Informações da ONG atualizadas.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="arena-admin-section">
      {/* Identidade */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h3 className="arena-section-card-title">Identidade</h3>
              <p className="arena-section-card-description">Como a ONG aparece no diretório e para o público.</p>
            </div>
          </div>
        </header>
        <div className="arena-section-card-body space-y-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* Preview da logo */}
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border/70 bg-white/60">
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt={`Logo de ${form.name || 'organização'}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/70">
                    <ImageIcon className="h-7 w-7" />
                    <span className="text-[10.5px] font-medium">Sem logo</span>
                  </div>
                )}
              </div>
              <span className="text-[10.5px] text-muted-foreground">Preview</span>
            </div>
            {/* Upload + nome + descrição */}
            <div className="flex-1 space-y-4">
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
                <Input
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="Ex: Associação Patinhas Felizes"
                  required
                />
              </Field>
              <Field label="Descrição (missão)" hint="Texto curto exibido na home da ONG.">
                <Textarea
                  value={form.description}
                  onChange={setField('description')}
                  rows={3}
                  placeholder="Missão da ONG em poucas palavras."
                  className="resize-none"
                />
              </Field>
            </div>
          </div>
        </div>
      </section>

      {/* Localização */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            <Input
              value={form.state}
              onChange={(e) => setField('state')({ target: { value: e.target.value.toUpperCase().slice(0, 2) } })}
              maxLength={2}
              placeholder="SP"
              className="uppercase"
            />
          </Field>
          <Field label="Sede / endereço principal" full>
            <Input
              value={form.home_venue}
              onChange={setField('home_venue')}
              placeholder="Rua, número, bairro"
            />
          </Field>
        </div>
      </section>

      {/* Contatos */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            <Input
              type="email"
              value={form.contact_email}
              onChange={setField('contact_email')}
              placeholder="contato@ong.org.br"
            />
          </Field>
          <Field label="Telefone" icon={Phone}>
            <Input
              value={form.contact_phone}
              onChange={setField('contact_phone')}
              placeholder="(11) 1234-5678"
            />
          </Field>
          <Field label="WhatsApp" icon={MessageCircle} hint="Apenas números com DDI. Ex: 5511987654321">
            <Input
              value={form.whatsapp_number}
              onChange={setField('whatsapp_number')}
              placeholder="5511987654321"
            />
          </Field>
          <Field label="Instagram" icon={Instagram}>
            <Input
              value={form.instagram}
              onChange={setField('instagram')}
              placeholder="@patinhas"
            />
          </Field>
          <Field label="Link de doação" full icon={Link2}>
            <Input
              type="url"
              value={form.donation_link}
              onChange={setField('donation_link')}
              placeholder="https://..."
            />
          </Field>
        </div>
      </section>

      {/* Institucional */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            <Textarea
              value={form.history}
              onChange={setField('history')}
              rows={5}
              placeholder="Conte a história da ONG, marco de fundação, missão."
              className="resize-none"
            />
          </Field>
          <Field label="CNPJ" hint="Opcional — exibido na página institucional." icon={Building2}>
            <Input
              value={form.cnpj}
              onChange={(e) => setField('cnpj')({ target: { value: formatCNPJ(e.target.value) } })}
              placeholder="00.000.000/0000-00"
              maxLength={18}
            />
          </Field>
        </div>
      </section>

      {/* Chat */}
      <section className="arena-section-card">
        <header className="arena-section-card-header">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
              <Label htmlFor="chat_enabled" className="text-[13px] font-semibold">
                Chat habilitado
              </Label>
              <p className="text-[12px] text-muted-foreground">
                Quando ativo, visitantes podem abrir uma thread de chat com a ONG.
              </p>
            </div>
          </div>
          <Switch
            id="chat_enabled"
            checked={form.chat_enabled}
            onCheckedChange={setBool('chat_enabled')}
          />
        </div>
      </section>

      {/* Sticky save bar com dirty indicator + Cancelar + Salvar */}
      <div className="sticky bottom-4 z-20 mt-2">
        <div
          className={cn(
            'flex flex-col items-stretch gap-2 rounded-2xl border bg-white/95 p-3 shadow-[0_18px_42px_-12px_rgba(64,34,18,0.28)] backdrop-blur-xl transition-colors sm:flex-row sm:items-center sm:justify-between',
            dirty
              ? 'border-amber-300/70 ring-2 ring-amber-100'
              : lastSavedAt
                ? 'border-emerald-300/60'
                : 'border-border/70'
          )}
        >
          <div className="flex items-center gap-2 text-[12.5px]">
            {saving ? (
              <>
                <Skeleton className="h-3.5 w-3.5 rounded-full" />
                <span className="text-muted-foreground">Salvando…</span>
              </>
            ) : dirty ? (
              <>
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <span className="font-semibold text-amber-800">Alterações não salvas</span>
              </>
            ) : lastSavedAt ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-800">Salvo às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <>
                <Info className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tudo em dia</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!dirty || saving}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!dirty || saving}
              className="min-w-[140px] gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando…' : 'Salvar alterações'}
            </Button>
          </div>
        </div>
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

// cn importado no topo
