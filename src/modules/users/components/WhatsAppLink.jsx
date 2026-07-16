import { MessageCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/core/lib/utils';

export function normalizePhoneToWhatsApp(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) return null;
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`;
  if (!/^55\d{2}\d{8,9}$/.test(withCountry)) return null;
  return withCountry;
}

export function buildWhatsAppUrl(phone, message = null) {
  const normalized = normalizePhoneToWhatsApp(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  if (message) return `${base}?text=${encodeURIComponent(message)}`;
  return base;
}

export function WhatsAppLink({ phone, displayName = null, message = null, phonePublic = true, consent = true, variant = 'button', className, testId = 'whatsapp-link' }) {
  if (!phonePublic || !consent) {
    return <span className={cn('inline-flex items-center gap-1 text-[12px] text-muted-foreground', className)} data-testid={`${testId}-blocked`} title="Telefone não é público (LGPD)"><ShieldCheck className="h-3.5 w-3.5" />Telefone privado</span>;
  }
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return <span className={cn('inline-flex items-center gap-1 text-[12px] text-muted-foreground', className)}>Telefone inválido</span>;
  const label = displayName ? `Falar com ${displayName} no WhatsApp` : 'Abrir no WhatsApp';
  if (variant === 'icon') {
    return <a href={url} target="_blank" rel="noopener noreferrer" className={cn('inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100', className)} aria-label={label} data-testid={testId}><MessageCircle className="h-4 w-4" /></a>;
  }
  if (variant === 'inline') {
    return <a href={url} target="_blank" rel="noopener noreferrer" className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-700 hover:underline', className)} data-testid={testId}><MessageCircle className="h-3.5 w-3.5" />WhatsApp</a>;
  }
  return <a href={url} target="_blank" rel="noopener noreferrer" className={cn('inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3.5 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-emerald-700', className)} data-testid={testId}><MessageCircle className="h-3.5 w-3.5" />{label}</a>;
}

export default WhatsAppLink;
