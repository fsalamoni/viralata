/**
 * @fileoverview LegalMeta — versão, autor, data efetiva do documento legal.
 *
 * V3 (TASK-V3-LEGAL-1): sempre visível no header do documento,
 * com formatação pt-BR e "vigente desde {data}".
 *
 * Tokens: `text-muted-foreground`, `bg-card`, `border-border`.
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import { Calendar, User, FileText } from 'lucide-react';
import { cn } from '@/core/lib/utils';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    let d;
    if (iso.toDate) d = iso.toDate();
    else if (iso.seconds) d = new Date(iso.seconds * 1000);
    else d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    }).format(d);
  } catch {
    return '—';
  }
}

export function LegalMeta({ version, author, effectiveAt, source, className }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground',
        className,
      )}
      data-testid="legal-meta"
    >
      {version && (
        <span className="inline-flex items-center gap-1.5 font-mono">
          <FileText className="h-3 w-3" aria-hidden="true" />
          <span className="font-semibold text-foreground">v{version}</span>
        </span>
      )}
      {author && (
        <span className="inline-flex items-center gap-1.5">
          <User className="h-3 w-3" aria-hidden="true" />
          {author}
        </span>
      )}
      {effectiveAt && (
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="h-3 w-3" aria-hidden="true" />
          Vigente desde <strong className="font-semibold text-foreground">{formatDate(effectiveAt)}</strong>
        </span>
      )}
      {source && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-accent-foreground">
          Fonte: {source}
        </span>
      )}
    </div>
  );
}

/** Calcula estimativa de leitura (palavras / 200 wpm). */
export function readingTime(text) {
  if (!text) return 1;
  const words = String(text).trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
