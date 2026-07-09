import React from 'react';
import { cn } from '@/core/lib/utils';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

/**
 * Cabeçalho-padrão das páginas da plataforma — o "card gradiente com título
 * dentro" que aparece em todas as páginas (perfil, feed, hub, admin…).
 *
 * Renderização controlada pela flag `PAGE_HERO_ENABLED`
 * (`src/core/featureFlags.js`):
 *
 * - **Flag OFF (default)**: degrade seguro para um `<header>` simples
 *   (mesmo `eyebrow/title/description/actions/children`, mas sem o
 *   card gradiente). Garante que páginas já migradas não fiquem diferentes
 *   até o admin ligar a flag — puramente aditivo.
 * - **Flag ON**: renderiza o card `arena-panel-strong` (gradiente
 *   laranja→rosa padrão da plataforma, controlado por `--cover-from`/
 *   `--cover-to`/`--cover-gradient` em `src/index.css`).
 *
 * A capa da ONG (`ClubCover`), a landing `Home`, a capa da comunidade
 * e o `ChatPage` (full-bleed) têm padrões visuais próprios e não usam
 * este componente.
 */
export default function PageHero({
  eyebrow,
  title,
  description,
  actions = null,
  children = null,
  className = '',
}) {
  const gradientEnabled = useFeatureFlag(FEATURE_FLAG.PAGE_HERO_ENABLED);

  // Fallback legacy — sem gradiente, mesmo conteúdo. Mantém semântica e
  // acessibilidade do cabeçalho. Mantém um respiro generoso (mt-2 / mb-4
  // no level de Section) para casar com a estética geral.
  if (!gradientEnabled) {
    return (
      <header className={cn('space-y-2', className)}>
        {eyebrow && (
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h1>
            {description && (
              <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2.5">{actions}</div> : null}
        </div>
        {children ? <div className="pt-2">{children}</div> : null}
      </header>
    );
  }

  // Gradiente ligado — card laranja→rosa padrão da plataforma, com o título
  // DENTRO do card. `arena-panel-strong` traz o gradiente via CSS vars.
  return (
    <section className={cn('arena-panel-strong overflow-hidden rounded-[1.25rem] p-6 sm:rounded-[2rem] sm:p-10', className)}>
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
