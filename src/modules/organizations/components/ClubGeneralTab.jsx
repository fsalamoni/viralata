import React, { useState } from 'react';
import { Mail, Phone, MessageCircle, Instagram, MapPin, Building2, Heart, Globe, Clock, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import ClubPublicChatDialog from './ClubPublicChatDialog';

/**
 * Aba pública "Geral" da ONG. Mostra:
 *  - Identidade da ONG (logo, nome, localização)
 *  - Missão / descrição curta
 *  - História (texto longo, se houver)
 *  - Contatos (e-mail, telefone, WhatsApp, Instagram, site)
 *  - Botões de ação para o público:
 *      * E-mail (mailto)
 *      * WhatsApp (link wa.me)
 *      * Iniciar chat com a ONG (abre ClubPublicChatDialog)
 *  - Botão "Ajudar" (link de doação) se houver
 *
 * Não é editável — para editar, a equipe usa a aba "Geral" do painel admin.
 */
export default function ClubGeneralTab({ club }) {
  const { isAuthenticated } = useAuth();
  const [chatOpen, setChatOpen] = useState(false);

  if (!club) return null;

  const location = [club.city, club.state].filter(Boolean).join(' / ');
  const whatsappClean = String(club.whatsapp_number || '').replace(/\D/g, '');
  const phoneClean = String(club.contact_phone || '').replace(/\D/g, '');
  const hasHistory = !!String(club.history || '').trim();
  const hasDescription = !!String(club.description || '').trim();
  const hasContactEmail = !!club.contact_email;
  const hasContactPhone = !!club.contact_phone;
  const hasWhatsapp = !!whatsappClean;
  const hasInstagram = !!club.instagram;

  return (
    <div className="space-y-5">
      {/* Identidade */}
      <div className="arena-panel-strong rounded-2xl p-5 sm:p-7">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {club.logo_url ? (
            <img src={club.logo_url} alt="" className="h-20 w-20 shrink-0 rounded-2xl border border-white/15 object-cover" />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-orange-50">
              <Building2 className="h-9 w-9" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white sm:text-2xl">{club.name}</h2>
            {location && (
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-orange-50/80">
                <MapPin className="h-3.5 w-3.5" /> {location}
              </p>
            )}
            {club.cnpj && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-orange-50/70">
                <Info className="h-3 w-3" /> CNPJ {club.cnpj}
              </p>
            )}
          </div>
          {club.donation_link && (
            <Button asChild className="bg-[linear-gradient(135deg,hsl(var(--primary))_0%,hsl(var(--highlight))_100%)] text-white hover:opacity-90">
              <a href={club.donation_link} target="_blank" rel="noreferrer">
                <Heart className="mr-1.5 h-4 w-4" /> Ajudar (Doar)
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Botões de contato rápido (CTA principal) */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {hasContactEmail && (
          <Button asChild variant="outline" className="justify-start">
            <a href={`mailto:${club.contact_email}`}>
              <Mail className="mr-2 h-4 w-4" /> E-mail
            </a>
          </Button>
        )}
        {hasWhatsapp && (
          <Button asChild variant="outline" className="justify-start">
            <a
              href={`https://wa.me/55${whatsappClean}?text=${encodeURIComponent(
                `Olá, vim pelo Viralata e gostaria de falar com a ${club.name}.`,
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <Phone className="mr-2 h-4 w-4 text-emerald-600" /> Abrir no WhatsApp
            </a>
          </Button>
        )}
        {club.chat_enabled !== false && (
          <Button
            type="button"
            variant="outline"
            className="justify-start"
            onClick={() => {
              if (!isAuthenticated) {
                // leva ao login
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                return;
              }
              setChatOpen(true);
            }}
          >
            <MessageCircle className="mr-2 h-4 w-4 text-primary" /> Iniciar chat com a ONG
          </Button>
        )}
      </div>

      {/* Missão / Descrição */}
      {hasDescription && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-2 text-base font-semibold text-foreground">Nossa missão</h3>
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {club.description}
          </p>
        </section>
      )}

      {/* História */}
      {hasHistory && (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="mb-2 inline-flex items-center gap-2 text-base font-semibold text-foreground">
            <Clock className="h-4 w-4 text-primary" /> Nossa história
          </h3>
          <p className="whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
            {club.history}
          </p>
        </section>
      )}

      {/* Contatos detalhados */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h3 className="mb-3 text-base font-semibold text-foreground">Contatos</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {hasContactEmail && (
            <ContactRow icon={Mail} label="E-mail">
              <a href={`mailto:${club.contact_email}`} className="text-sm font-medium text-highlight hover:underline">
                {club.contact_email}
              </a>
            </ContactRow>
          )}
          {hasContactPhone && (
            <ContactRow icon={Phone} label="Telefone">
              <a
                href={`tel:${phoneClean}`}
                className="text-sm font-medium text-highlight hover:underline"
              >
                {club.contact_phone}
              </a>
            </ContactRow>
          )}
          {hasWhatsapp && (
            <ContactRow icon={Phone} label="WhatsApp">
              <a
                href={`https://wa.me/55${whatsappClean}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-highlight hover:underline"
              >
                {club.whatsapp_number} <ExternalLink className="ml-0.5 inline h-3 w-3" />
              </a>
            </ContactRow>
          )}
          {hasInstagram && (
            <ContactRow icon={Instagram} label="Instagram">
              <a
                href={`https://instagram.com/${String(club.instagram).replace('@', '')}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-highlight hover:underline"
              >
                {club.instagram} <ExternalLink className="ml-0.5 inline h-3 w-3" />
              </a>
            </ContactRow>
          )}
          {club.home_venue && (
            <ContactRow icon={MapPin} label="Endereço / Sede">
              <span className="text-sm font-medium">{club.home_venue}</span>
            </ContactRow>
          )}
          {club.donation_link && (
            <ContactRow icon={Heart} label="Como doar">
              <a href={club.donation_link} target="_blank" rel="noreferrer" className="text-sm font-medium text-highlight hover:underline break-all">
                {club.donation_link}
              </a>
            </ContactRow>
          )}
        </div>
      </section>

      <ClubPublicChatDialog club={club} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words">{children}</div>
      </div>
    </div>
  );
}
