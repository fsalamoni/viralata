import React, { useState } from 'react';
import {
  Mail, MessageCircle, MapPin, Instagram, Globe,
  Heart, Phone, Clock, ArrowUpRight, PawPrint, Users, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import ClubPublicChatDialog from './ClubPublicChatDialog';

/**
 * Aba pública "Geral" da ONG — segue o padrão visual da imagem de
 * referência: stats cards com gradiente + seções editoriais com
 * tipografia limpa.
 *
 * Estrutura:
 *  1. Stats cards (3 colunas) — Animais cadastrados, Seguidores, Fundação
 *  2. Sobre a organização — descrição/missão
 *  3. Nossa história — texto longo
 *  4. Falar com a ONG — botões grandes (E-mail / WhatsApp / Chat)
 *  5. Contatos detalhados — grid 2-col limpo
 */
export default function ClubGeneralTab({ club, stats }) {
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
  const founded = stats?.founded || (club.created_at?.toDate
    ? club.created_at.toDate().getFullYear()
    : null);
  const followers = stats?.followers ?? club.member_count ?? 0;
  const animals = stats?.animals ?? 0;

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* STATS CARDS — 3 colunas com gradiente personalizado */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={PawPrint}
          value={animals}
          label={animals === 1 ? 'Animal cadastrado' : 'Animais cadastrados'}
        />
        <StatCard
          icon={Users}
          value={followers}
          label="Seguidores"
        />
        <StatCard
          icon={Calendar}
          value={founded || '—'}
          label="Fundação"
        />
      </section>

      {/* SOBRE A ORGANIZAÇÃO — adiciona mais padding-top no card genérico
          para que o texto respire do card vizinho acima. */}
      {hasDescription && (
        <section className="pt-2 sm:pt-3">
          <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">
            Sobre a organização
          </h2>
          <p className="text-base leading-relaxed text-foreground/85">
            {club.description}
          </p>
        </section>
      )}

      {/* CTA DOAÇÃO — bg sutil derivado das cores personalizadas
          (cover_from/cover_to com opacidade) + ícone com o gradiente
          completo. Mantém o brand consistente com o card da ONG. */}
      {club.donation_link && (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl border border-border/60 p-6 text-center sm:flex-row sm:gap-4 sm:text-left"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--cover-from) / 0.07) 0%, hsl(var(--cover-to) / 0.07) 100%)',
          }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
            style={{ background: 'var(--cover-gradient)' }}
          >
            <Heart className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">Ajude esta causa</h3>
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

      {/* HISTÓRIA */}
      {hasHistory && (
        <section className="pt-2 sm:pt-3">
          <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
            <Clock className="h-5 w-5 text-primary" /> Nossa história
          </h2>
          <p className="whitespace-pre-line text-base leading-loose text-foreground/85">
            {club.history}
          </p>
        </section>
      )}

      {/* FALAR COM A ONG — CTAs grandes em cor sólida (alto contraste). */}
      {(hasContactEmail || hasWhatsapp || club.chat_enabled !== false) && (
        <section className="pt-2 sm:pt-3">
          <h2 className="mb-5 text-lg font-bold text-foreground sm:text-xl">
            Falar com a ONG
          </h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {hasContactEmail && (
              <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
                <a href={`mailto:${club.contact_email}`}>
                  <Mail className="mr-2 h-4 w-4" /> Enviar e-mail
                </a>
              </Button>
            )}
            {hasWhatsapp && (
              <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90">
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

      {/* CONTATOS DETALHADOS */}
      <section className="pt-2 sm:pt-3">
        <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">Contatos</h2>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
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
          {location && (
            <DetailRow icon={MapPin} label="Localização" value={location} />
          )}
        </div>
      </section>

      <ClubPublicChatDialog club={club} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

/** Card de estatística com gradiente personalizado (cover). */
function StatCard({ icon: Icon, value, label }) {
  return (
    <div
      className="rounded-2xl border border-border/40 p-6 shadow-sm sm:p-7"
      style={{
        background: 'linear-gradient(135deg, hsl(var(--cover-from) / 0.07) 0%, hsl(var(--cover-to) / 0.07) 100%)',
      }}
    >
      <div
        className="flex h-11 w-11 items-center justify-center rounded-xl text-white"
        style={{ background: 'var(--cover-gradient)' }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
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
