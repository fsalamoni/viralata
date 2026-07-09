import React, { useState } from 'react';
import { toast } from 'sonner';
import { Save, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ImageUpload } from '@/components/ui/image-upload';
import { useUpdateClub } from '../hooks/useClubs';
import { normalizeClubInput } from '../domain/validators';

/**
 * Aba "Geral" do painel admin da ONG — onde a equipe edita as informações
 * visíveis ao público na aba "Geral" do perfil da ONG:
 *  - Nome
 *  - Descrição (missão)
 *  - História (texto longo)
 *  - Localização (cidade/UF/endereço)
 *  - Contatos (e-mail, telefone, WhatsApp, Instagram)
 *  - Logo
 *  - CNPJ
 *  - Link de doação
 *  - Chat habilitado (flag global para o público poder abrir conversa)
 *
 * Membros com permissão 'team' (ou superior) podem editar.
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
    <form onSubmit={handleSave} className="space-y-6">
      <Card className="rounded-xl">
        <CardHeader className="p-6 sm:p-7">
          <CardTitle className="text-base">Identidade</CardTitle>
          <CardDescription>Como a ONG aparece para o público.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0 sm:p-7 sm:pt-0">
          <div className="space-y-2">
            <Label>Logo / imagem da organização</Label>
            <ImageUpload
              value={form.logo_url}
              onChange={(url) => setField('logo_url')({ target: { value: url } })}
              folder="clubs"
              shape="square"
              label="Enviar logo"
              hint="Logo ou foto da organização exibida no diretório e na página da ONG."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g_name">Nome *</Label>
            <Input id="g_name" value={form.name} onChange={setField('name')} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g_description">Missão / Descrição</Label>
            <textarea
              id="g_description"
              value={form.description}
              onChange={setField('description')}
              rows={3}
              maxLength={2000}
              placeholder="Descreva em poucas linhas o que a ONG faz e qual é o seu objetivo."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="g_history">História da ONG</Label>
            <textarea
              id="g_history"
              value={form.history}
              onChange={setField('history')}
              rows={6}
              maxLength={8000}
              placeholder="Conte a história da ONG: quando foi fundada, marcos importantes, motivação, etc."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">Até 8.000 caracteres. Texto longo, aparece na aba &ldquo;Geral&rdquo; do público.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="p-6 sm:p-7">
          <CardTitle className="text-base">Localização</CardTitle>
          <CardDescription>Cidade, estado e endereço principal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0 sm:p-7 sm:pt-0">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="g_city">Cidade</Label>
              <Input id="g_city" value={form.city} onChange={setField('city')} maxLength={60} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g_state">UF</Label>
              <Input id="g_state" value={form.state} onChange={setField('state')} maxLength={2} placeholder="MG" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="g_venue">Endereço / sede</Label>
            <Input id="g_venue" value={form.home_venue} onChange={setField('home_venue')} maxLength={200} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="p-6 sm:p-7">
          <CardTitle className="text-base">Contatos</CardTitle>
          <CardDescription>Aparecem na aba &ldquo;Geral&rdquo; pública e nos botões de ação (e-mail, WhatsApp, chat).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-6 pt-0 sm:p-7 sm:pt-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="g_email">E-mail</Label>
              <Input id="g_email" type="email" value={form.contact_email} onChange={setField('contact_email')} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g_phone">Telefone</Label>
              <Input id="g_phone" type="tel" value={form.contact_phone} onChange={setField('contact_phone')} maxLength={30} placeholder="(31) 3333-4444" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="g_whatsapp">WhatsApp (com DDD)</Label>
              <Input id="g_whatsapp" type="tel" value={form.whatsapp_number} onChange={setField('whatsapp_number')} maxLength={30} placeholder="31999990000" />
              <p className="text-[11px] text-muted-foreground">Abre conversa no WhatsApp com mensagem pré-pronta.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g_instagram">Instagram</Label>
              <Input id="g_instagram" value={form.instagram} onChange={setField('instagram')} maxLength={60} placeholder="@ong" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="g_cnpj">CNPJ (se ONG formalizada)</Label>
              <Input id="g_cnpj" value={form.cnpj} onChange={setField('cnpj')} maxLength={20} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="g_donation_link">Link principal de doação</Label>
              <Input id="g_donation_link" value={form.donation_link} onChange={setField('donation_link')} maxLength={400} placeholder="https://..." />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl">
        <CardHeader className="p-6 sm:p-7">
          <CardTitle className="text-base">Atendimento por chat</CardTitle>
          <CardDescription>Permite que usuários da plataforma abram uma conversa direta com a ONG.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3 p-6 pt-0 sm:p-7 sm:pt-0">
          <div className="flex items-center gap-2 text-sm">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span>Chat com a ONG habilitado</span>
          </div>
          <Switch
            checked={form.chat_enabled}
            onCheckedChange={setBool('chat_enabled')}
            aria-label="Habilitar chat com a ONG"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={updateClub.isPending}>
          <Save className="mr-1.5 h-4 w-4" />
          {updateClub.isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}
