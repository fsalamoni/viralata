/**
 * @fileoverview LegalLayoutV3 — layout unificado para todas as páginas legais V3.
 *
 * V3 (TASK-V3-LEGAL-4): renderiza conteúdo Markdown + TOC + meta + actions
 * floating. Mobile-first, com TOC sticky em desktop e colapsável em mobile.
 *
 * Props:
 *  - title: string — título principal do documento
 *  - description: string — descrição (SEO + open graph)
 *  - markdown: string — conteúdo Markdown (com h2/h3)
 *  - fallback: ReactNode — fallback se markdown vazio
 *  - version, author, effectiveAt, source — meta do documento
 *  - relatedLinks: [{ to, label }] — links no rodapé
 *  - breadcrumb: [{ to, label }] — trilha
 *
 * @see docs/REGENCY_LEGAL_V3.md
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ChevronRight, Home } from 'lucide-react';
import Seo from '@/components/Seo';
import { LegalMeta, readingTime } from './LegalMeta';
import { LegalToc, extractHeadings, slugifyHeading } from './LegalToc';
import { LegalFloatingActions } from './LegalFloatingActions';
import { MarkdownContent } from '@/components/ui/markdown-content';
import { cn } from '@/core/lib/utils';
import { useUiPreferences } from '@/core/hooks/useUiPreferences';
import { useReducedMotionSafe } from '@/core/hooks/useReducedMotionSafe';

function LegalBreadcrumb({ items = [] }) {
  const ldJson = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.to ? { item: `${window.location.origin}${it.to}` } : {}),
    })),
  }), [items]);

  return (
    <>
      <nav
        aria-label="Trilha de navegação"
        className="flex flex-wrap items-center gap-1 text-[12.5px] text-muted-foreground"
      >
        {items.map((it, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-1">
              {it.current ? (
                <span aria-current="page" className="font-bold text-foreground">
                  {it.label}
                </span>
              ) : (
                <Link
                  to={it.to}
                  className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {it.label}
                </Link>
              )}
              {!isLast && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
              )}
            </span>
          );
        })}
      </nav>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />
    </>
  );
}

export function LegalLayoutV3({
  title,
  description,
  markdown,
  fallback,
  version,
  author,
  effectiveAt,
  source,
  relatedLinks = [],
  breadcrumbItems,
  className,
}) {
  const [uiPrefs] = useUiPreferences();
  const reduceMotion = useReducedMotionSafe();
  const compact = Boolean(uiPrefs?.compactMode);

  // Auto-gera TOC dos headings
  const headings = useMemo(() => extractHeadings(markdown), [markdown]);

  // Estima tempo de leitura
  const readTime = useMemo(() => readingTime(markdown), [markdown]);

  // Schema.org JSON-LD para o documento
  const ldJson = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    ...(version && { version }),
    ...(effectiveAt && { datePublished: effectiveAt.toDate ? effectiveAt.toDate().toISOString() : effectiveAt }),
  }), [title, description, version, effectiveAt]);

  // Breadcrumb default
  const items = breadcrumbItems || [
    { label: 'Início', to: '/' },
    { label: 'Documentos legais', to: '/termos' },
    { label: title, current: true },
  ];

  return (
    <>
      <Seo
        title={title ? `${title} — Viralata` : 'Documento legal'}
        description={description || title || 'Documento legal do Viralata.'}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }}
      />

      <div
        className={cn(
          'arena-page mx-auto max-w-6xl px-4 py-5 pb-16',
          compact && 'py-3 pb-12',
          className,
        )}
        data-testid="legal-page"
      >
        {/* Breadcrumb */}
        <LegalBreadcrumb items={items} />

        {/* Banner jurídico */}
        <div
          className={cn(
            'mt-3 flex items-start gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4',
            compact && 'p-3',
          )}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20">
            <Scale className="h-5 w-5 text-accent" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[22px] font-extrabold leading-tight text-foreground">
              {title}
            </h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Conteúdo jurídico oficial · {readTime} {readTime === 1 ? 'minuto' : 'minutos'} de leitura
            </p>
            <div className="mt-2">
              <LegalMeta
                version={version}
                author={author}
                effectiveAt={effectiveAt}
                source={source}
              />
            </div>
          </div>
        </div>

        {/* Grid: conteúdo + TOC */}
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-[1fr_256px]">
          {/* Conteúdo */}
          <article
            className={cn(
              'arena-section-card',
              'prose prose-sm max-w-none text-foreground',
              compact && 'p-4',
            )}
          >
            <div className="arena-section-card-body">
              {markdown && markdown.trim() ? (
                <MarkdownContent>{markdown}</MarkdownContent>
              ) : (
                fallback
              )}
            </div>
          </article>

          {/* TOC (sticky lateral em md+) */}
          {headings.length > 0 && (
            <aside className="md:relative">
              <LegalToc headings={headings} stickyTop={96} />
            </aside>
          )}
        </div>

        {/* Mobile TOC colapsável (renderizado dentro do fluxo em mobile) */}
        {headings.length > 0 && (
          <div className="mt-6 md:hidden">
            <LegalToc headings={headings} />
          </div>
        )}

        {/* Cross-links (Documentos relacionados) */}
        {relatedLinks.length > 0 && (
          <section
            className="mt-8 rounded-2xl border border-border bg-card p-5"
            aria-labelledby="legal-related-title"
          >
            <h2 id="legal-related-title" className="mb-3 text-[14px] font-bold text-foreground">
              Documentos relacionados
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {relatedLinks.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="flex items-center gap-2 rounded-xl border border-border bg-background p-3 text-[13px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
                  >
                    <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
                    {l.label}
                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Ações flutuantes (voltar ao topo, imprimir, copiar) */}
        <LegalFloatingActions title={title} />
      </div>
    </>
  );
}
