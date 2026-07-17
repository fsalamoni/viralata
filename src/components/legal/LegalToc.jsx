/**
 * @fileoverview LegalToc — índice de seções (Table of Contents).
 *
 * V3 (TASK-V3-LEGAL-2): auto-gerado de h2/h3 do Markdown.
 * Sticky lateral em md+, colapsável no topo em mobile.
 *
 * Cada heading recebe um id (slugify) automaticamente e o
 * `<MarkdownContent>` injeta esses ids. O TOC observa o scroll
 * e destaca a seção ativa.
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { ChevronRight, List } from 'lucide-react';
import { cn } from '@/core/lib/utils';

/** Converte heading em id único (slugify). */
export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/** Extrai headings de um conteúdo markdown (regex simples para h2/h3). */
export function extractHeadings(markdown) {
  if (!markdown) return [];
  const headings = [];
  const lines = String(markdown).split('\n');
  for (const line of lines) {
    const m2 = /^##\s+(.+)$/.exec(line);
    const m3 = /^###\s+(.+)$/.exec(line);
    if (m2) {
      const title = m2[1].trim();
      headings.push({ level: 2, title, id: slugifyHeading(title) });
    } else if (m3) {
      const title = m3[1].trim();
      headings.push({ level: 3, title, id: slugifyHeading(title) });
    }
  }
  return headings;
}

export function LegalToc({ headings = [], className, stickyTop = 96 }) {
  const [activeId, setActiveId] = useState(null);
  const [open, setOpen] = useState(false);
  const observerRef = useRef(null);

  // Observa qual heading está visível na viewport
  useEffect(() => {
    if (!headings.length) return undefined;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter(Boolean);
    if (!elements.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pega o entry mais visível
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: `-${stickyTop + 20}px 0px -60% 0px`, threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [headings, stickyTop]);

  const handleClick = useCallback((e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Adiciona #hash na URL sem rolar
      window.history.replaceState(null, '', `#${id}`);
    }
    setOpen(false);
  }, []);

  if (!headings.length) return null;

  return (
    <>
      {/* Mobile: colapsável no topo */}
      <details
        className={cn(
          'rounded-2xl border border-border bg-card md:hidden',
          className,
        )}
        open={open}
        onToggle={(e) => setOpen(e.currentTarget.open)}
      >
        <summary
          className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[13px] font-bold text-foreground"
        >
          <List className="h-4 w-4 text-primary" aria-hidden="true" />
          Índice ({headings.length} {headings.length === 1 ? 'seção' : 'seções'})
          <ChevronRight
            className={cn(
              'ml-auto h-4 w-4 transition-transform',
              open && 'rotate-90',
            )}
            aria-hidden="true"
          />
        </summary>
        <ul className="space-y-0.5 border-t border-border p-2">
          {headings.map((h) => (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => handleClick(e, h.id)}
                className={cn(
                  'block rounded-lg px-3 py-1.5 text-[12.5px] transition-colors',
                  h.level === 3 && 'pl-7',
                  activeId === h.id
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                )}
              >
                {h.title}
              </a>
            </li>
          ))}
        </ul>
      </details>

      {/* Desktop: sticky lateral */}
      <nav
        aria-label="Índice do documento"
        className={cn('hidden md:block', className)}
        data-testid="legal-toc"
      >
        <div
          className="rounded-2xl border border-border bg-card p-4"
          style={{ position: 'sticky', top: stickyTop }}
        >
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <List className="h-3 w-3" aria-hidden="true" />
            Índice
          </div>
          <ul className="max-h-[60vh] space-y-0.5 overflow-y-auto pr-1">
            {headings.map((h) => (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  onClick={(e) => handleClick(e, h.id)}
                  className={cn(
                    'flex items-start gap-1.5 rounded-md px-2 py-1 text-[12px] leading-[1.4] transition-colors',
                    h.level === 3 && 'pl-4',
                    activeId === h.id
                      ? 'bg-primary/10 font-semibold text-primary'
                      : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                  )}
                >
                  <ChevronRight
                    className={cn(
                      'mt-0.5 h-3 w-3 shrink-0 transition-opacity',
                      activeId === h.id ? 'opacity-100' : 'opacity-40',
                    )}
                    aria-hidden="true"
                  />
                  <span className="break-words">{h.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
