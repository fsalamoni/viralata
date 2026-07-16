import * as React from 'react';
import { cn } from '@/core/lib/utils';

/**
 * DS_V2_TOKENS — Icon wrapper component (Material Symbols path)
 *
 * Para a spec v1.0, o caminho canônico é Material Symbols Outlined.
 * A coexistência com lucide-react é gerenciada via esta simples regra:
 *
 *   1. Componentes NOVOS (Bloco C em diante) usam <Icon kind="material" name="pets" />
 *   2. Componentes EXISTENTES (204 arquivos com lucide) seguem com import direto:
 *      `import { Home } from 'lucide-react'` — sem migração em massa.
 *
 * Este componente encapsula APENAS o caminho Material Symbols. Para lucide,
 * importe direto (já é o padrão shadcn/Tailwind).
 *
 * @example
 * // Material Symbols (spec v1.0 — caminho oficial)
 * <Icon name="pets" size="lg" filled />
 * <Icon name="favorite" size="md" className="text-primary" />
 *
 * // Variações tipográficas
 * <Icon name="pets" size="sm" />   // 16px
 * <Icon name="pets" size="md" />   // 20px
 * <Icon name="pets" size="lg" />   // 24px
 * <Icon name="pets" size="xl" />   // 32px
 * <Icon name="pets" size="2xl" />  // 44px
 * <Icon name="pets" size={28} />   // custom px
 *
 * // Lucide (continua igual)
 * import { Home } from 'lucide-react';
 * <Home size={24} className="text-primary" />
 */
export const Icon = React.forwardRef(function Icon(
  {
    name,
    size = 'md', // 'sm' | 'md' | 'lg' | 'xl' | '2xl' ou número em px
    filled = false,
    className,
    title,
    style,
    ...rest
  },
  ref
) {
  if (!name) return null;

  const sizePx = typeof size === 'number' ? size : null;
  const sizeClass = sizePx ? null : `icon-${size}`;
  const baseClass = filled ? 'material-symbols-filled' : 'material-symbols-outlined';

  return (
    <span
      ref={ref}
      className={cn(baseClass, sizeClass, className)}
      style={{
        ...(sizePx ? { fontSize: `${sizePx}px` } : null),
        ...style,
      }}
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
      role={title ? 'img' : undefined}
      {...rest}
    >
      {name}
    </span>
  );
});

Icon.displayName = 'Icon';
