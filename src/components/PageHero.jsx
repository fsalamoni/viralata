import React from 'react';
import { cn } from '@/core/lib/utils';

export default function PageHero({
  eyebrow,
  title,
  description,
  actions = null,
  children = null,
  className = '',
}) {
  return (
    <section className={cn('arena-panel-strong overflow-hidden rounded-[1.25rem] p-5 sm:rounded-[2rem] sm:p-8', className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          {eyebrow && (
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-orange-100/70">
              {eyebrow}
            </div>
          )}
          <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-orange-50/82">
              {description}
            </p>
          )}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}
