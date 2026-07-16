/**
 * Breadcrumb component — navegação hierárquica com níveis clicáveis.
 * TASK-616
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/core/lib/utils';

/**
 * @param {object} props
 * @param {Array<{label: string, href?: string, icon?: React.ComponentType}>} props.items
 * @param {string} [props.className]
 */
export function Breadcrumb({ items, className }) {
  if (!items || items.length === 0) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm flex-wrap', className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;
        return (
          <React.Fragment key={index}>
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden="true" />
            )}
            {isLast || !item.href ? (
              <span
                className={cn(
                  'flex items-center gap-1 text-muted-foreground',
                  isLast && 'font-medium text-foreground',
                  isFirst && 'sr-only'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.icon && <item.icon className="h-3.5 w-3.5" />}
                {item.label}
              </span>
            ) : (
              <Link
                to={item.href}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.icon && <item.icon className="h-3.5 w-3.5" />}
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
