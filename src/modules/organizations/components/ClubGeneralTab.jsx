import React, { useState } from 'react';
import {
  Mail, MessageCircle, MapPin, Instagram, Globe,
  Heart, Phone, Clock, ArrowUpRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import ClubPublicChatDialog from './ClubPublicChatDialog';

/**
 * Aba pública "Geral" da ONG. Layout editorial:
 *
 *  1. Hero       — Logo + nome + localização (visual limpo, sem card pesado).
 *  2. CTA Doar   — Botão grande se houver donation_link.
 *  3. Missão     — Texto grande, respirando.
 *  4. História   — Texto longo, separado.
 *  5. Contato    — Botões grandes (E-mail / WhatsApp / Chat) com cor escura.
 *  6. Detalhes   — Lista limpa de contatos (sem molduras repetidas).
 *
 * A IDENTIDADE (logo + nome) é responsabilidade do header da página
 * (ClubDetail). Aqui ela aparece UMA vez, no hero, sem repetir.
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
    <div className="space-y-12 sm:space-y-16">
      {/* HERO — identidade visual sem moldura */}
      <header className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
        {club.logo_url ? (
          <img
            src={club.logo_url}
            alt=""
            className="h-24 w-24 shrink-0 rounded-2xl object-cover shadow-sm sm:h-28 sm:w-28"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary sm:h-28 sm:w-28">
            <Heart className="h-10 w-10" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {club.name}
          </h1>
          {location && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {location}
            </p>
          )}
        </div>
      </header>

      {/* CTA DOAÇÃO — destaque quando há link */}
      {club.donation_link && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-card/50 p-6 text-center sm:flex-row sm:gap-4 sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Heart className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-foreground">Ajude esta causa</h2>
            <p className="text-sm text-muted-foreground">
              Sua contribuição ajuda a ONG a manter e ampliar o cuidado com os animais.
            </p>
          </div>
          <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
            <a href={club.donation_link} target="_blank" rel="noreferrer">
              Doar agora <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </a>
          </Button>
        </div>
      )}

      {/* MISSÃO — tipografia editorial, respiro */}
      {hasDescription && (
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Missão
          </h2>
          <p className="text-lg leading-relaxed text-foreground/90 sm:text-xl sm:leading-relaxed">
            {club.description}
          </p>
        </section>
      )}

      {/* HISTÓRIA — texto longo, mas com respiro */}
      {hasHistory && (
        <section>
          <h2 className="mb-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Nossa história
          </h2>
          <p className="whitespace-pre-line text-base leading-loose text-foreground/85">
            {club.history}
          </p>
        </section>
      )}

      {/* CONTATOS — botões grandes, cor escura, letra branca */}
      {(hasContactEmail || hasWhatsapp || club.chat_enabled !== false) && (
        <section>
          <h2 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Falar com a ONG
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {hasContactEmail && (
              <Button
                asChild
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <a href={`mailto:${club.contact_email}`}>
                  <Mail className="mr-2 h-4 w-4" /> Enviar e-mail
                </a>
              </Button>
            )}
            {hasWhatsapp && (
              <Button
                asChild
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <a
                  href={`https://wa.me/55${whatsappClean}?text=${encodeURIComponent(
                    `Olá, vim pelo Viralata e gostaria de falar com a ${club.name}.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="mr-2 h-4 w-4" /> Abrir WhatsApp
                </a>
              </Button>
            )}
            {club.chat_enabled !== false && (
              <Button
                type="button"
                size="lg"
                className="bg-foreground text-background hover:bg-foreground/90"
                onClick={() => {
                  if (!isAuthenticated) {
                    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                  }
                  setChatOpen(true);
                }}
              >
                <MessageCircle className="mr-2 h-4 w-4" /> Iniciar chat
              </Button>
            )}
          </div>
        </section>
      )}

      {/* DETALHES — grid limpo, sem repetir info do header */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {hasContactEmail && (
          <DetailRow icon={Mail} label="E-mail" value={club.contact_email} href={`mailto:${club.contact_email}`} />
        )}
        {hasContactPhone && (
          <DetailRow icon={Phone} label="Telefone" value={club.contact_phone} href={`tel:${phoneClean}`} />
        )}
        {hasWhatsapp && (
          <DetailRow
            icon={Phone}
            label="WhatsApp"
            value={club.whatsapp_number}
            href={`https://wa.me/55${whatsappClean}`}
            external
          />
        )}
        {hasInstagram && (
          <DetailRow
            icon={Instagram}
            label="Instagram"
            value={club.instagram}
            href={`https://instagram.com/${String(club.instagram).replace('@', '')}`}
            external
          />
        )}
        {club.home_venue && (
          <DetailRow icon={MapPin} label="Endereço / sede" value={club.home_venue} />
        )}
        {club.cnpj && (
          <DetailRow icon={Globe} label="CNPJ" value={club.cnpj} />
        )}
        {club.donation_link && (
          <DetailRow
            icon={Heart}
            label="Como doar"
            value={club.donation_link}
            href={club.donation_link}
            external
          />
        )}
      </section>

      <ClubPublicChatDialog club={club} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

/** Linha de detalhe — label discreta + valor com link opcional. */
function DetailRow({ icon: Icon, label, value, href, external }) {
  const content = (
    <>
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-words text-sm text-foreground">{value}</p>
      </div>
      {external && href && (
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
    </>
  );
  if (href) {
    return (
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
        className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/40"
      >
        {content}
      </a>
    );
  }
  return <div className="flex items-start gap-3 rounded-xl p-2">{content}</div>;
}
