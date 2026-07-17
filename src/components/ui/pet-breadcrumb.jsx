/**
 * @fileoverview PetBreadcrumb — breadcrumb semântico para PetDetail.
 *
 * V3 (TASK-V3-PET-DETAIL-1): substitui o simples "Voltar" do V1.
 * Estrutura: Início > Feed > {Nome do pet}
 * - Cada item é clicável (exceto o último, que é o atual)
 * - Schema.org BreadcrumbList para SEO
 * - Compact, mobile-first
 *
 * Tokens: `text-muted-foreground` (path), `text-foreground` (atual),
 * `hover:text-primary` (links). Sem cores hard-coded.
 *
 * @see docs/REGENCY_PET_DETAIL_V3.md §"Breadcrumb"
 */
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/core/lib/utils';

export function PetBreadcrumb({ petTitle, ownerName, className }) {
  const items = [
    { label: 'Início', to: '/', icon: Home },
    { label: 'Feed', to: '/feed' },
    { label: petTitle, current: true },
  ];

  // JSON-LD para SEO
  const ldJson = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.to ? { item: `${window.location.origin}${it.to}` } : {}),
    })),
  };

  return (
    <>
      <nav
        aria-label="Trilha de navegação"
        className={cn(
          'flex flex-wrap items-center gap-1 text-[12.5px] text-muted-foreground',
          className,
        )}
      >
        {items.map((it, i) => {
          const Icon = it.icon;
          const isLast = i === items.length - 1;
          const content = (
            <span className="flex items-center gap-1">
              {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
              <span className="truncate max-w-[180px]">{it.label}</span>
            </span>
          );

          return (
            <span key={i} className="flex items-center gap-1">
              {it.current ? (
                <span aria-current="page" className="font-bold text-foreground">
                  {content}
                </span>
              ) : (
                <Link
                  to={it.to}
                  className="rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {content}
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
