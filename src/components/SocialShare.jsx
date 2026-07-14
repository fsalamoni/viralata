/**
 * @fileoverview SocialShare — componente para compartilhar pets em redes sociais
 * (TASK-143).
 *
 * **Estratégia**:
 * 1. Web Share API (mobile) — abre sheet nativo do SO
 * 2. Fallback desktop — modal com botões (WhatsApp, Facebook, Twitter, copiar link)
 *
 * **Open Graph**: o `Seo` da página já injeta og:title/og:image/og:url. Quando
 * alguém compartilha o link, o preview do WhatsApp/Twitter/Slack já mostra
 * a imagem + título automaticamente (via Open Graph do nosso HTML).
 *
 * **LGPD**: só compartilha info pública. O botão "Copiar link" copia a URL
 * canônica, sem expor tokens ou auth.
 */

import React, { useState } from 'react';
import {
  Share2, Copy, Check, MessageCircle, ExternalLink, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

/** Gera a URL canônica do pet (sempre pública). */
function canonicalPetUrl(petId) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/pet/${petId}`;
}

/** Gera a URL canônica do abrigo. */
function canonicalShelterUrl(shelterId) {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/abrigos/${shelterId}`;
}

/**
 * @param {object} props
 * @param {string} props.kind — 'pet' | 'shelter' | 'community'
 * @param {string} props.id
 * @param {string} props.title
 * @param {string} [props.description]
 * @param {string} [props.variant] — 'default' | 'icon'
 */
export function SocialShare({ kind, id, title, description, variant = 'default' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = (() => {
    if (kind === 'pet') return canonicalPetUrl(id);
    if (kind === 'shelter') return canonicalShelterUrl(id);
    return `${typeof window !== 'undefined' ? window.location.origin : ''}/${kind}/${id}`;
  })();

  const shareText = description
    ? `${title} — ${description}\n\nDisponível no Viralata!`
    : `${title} — disponível no Viralata!`;

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text: shareText, url });
        return true;
      } catch (err) {
        // user cancelou
        return true;
      }
    }
    return false;
  };

  const handleClick = async () => {
    // Tenta Web Share API primeiro
    if (await handleNativeShare()) return;
    // Fallback modal
    setOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  const targets = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodeURIComponent(shareText + '\n' + url)}`,
      color: 'text-emerald-600',
    },
    {
      key: 'twitter',
      label: 'X / Twitter',
      icon: X,
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
      color: 'text-sky-600',
    },
    {
      key: 'facebook',
      label: 'Facebook',
      icon: ExternalLink,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      color: 'text-blue-700',
    },
  ];

  if (variant === 'icon') {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClick}
          aria-label={`Compartilhar ${title}`}
        >
          <Share2 className="h-4 w-4" />
        </Button>
        <ShareDialog
          open={open}
          onOpenChange={setOpen}
          title={title}
          url={url}
          targets={targets}
          copied={copied}
          onCopy={handleCopy}
        />
      </>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        aria-label={`Compartilhar ${title}`}
      >
        <Share2 className="mr-2 h-4 w-4" />
        Compartilhar
      </Button>
      <ShareDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        url={url}
        targets={targets}
        copied={copied}
        onCopy={handleCopy}
      />
    </>
  );
}

function ShareDialog({ open, onOpenChange, title, url, targets, copied, onCopy }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar {title}</DialogTitle>
          <DialogDescription>
            Escolha como compartilhar. O link inclui preview automático
            (imagem + descrição via Open Graph).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3">
          {targets.map((t) => (
            <a
              key={t.key}
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-1 rounded-lg border border-border p-4 transition hover:border-primary/40 ${t.color}`}
              aria-label={`Compartilhar no ${t.label}`}
            >
              <t.icon className="h-6 w-6" />
              <span className="text-xs font-medium text-foreground">{t.label}</span>
            </a>
          ))}
        </div>

        <div className="space-y-2">
          <label htmlFor="share-url" className="text-sm font-medium">
            Ou copie o link
          </label>
          <div className="flex gap-2">
            <input
              id="share-url"
              value={url}
              readOnly
              className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm"
            />
            <Button onClick={onCopy} variant="outline" className="shrink-0">
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </>
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SocialShare;
