import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/core/lib/utils';

/**
 * DS_V2_COMPONENTS — Avatar (spec v1.0 §3.9)
 *
 *  - Iniciais: bg gradiente Avatar (oliva→terracota), texto branco bold
 *  - Imagem: borda 2px branca/cinza, object-fit cover
 *  - Status: bolinha 12px canto inferior direito com borda branca
 *    (Verde=online, Cinza=offline, Mostarda=away)
 *  - Tamanhos: 28/36/44/56px (a maior com anel branco no header)
 *
 * Compat: API shadcn/Radix mantida. Tamanhos via className ou size prop.
 * Use o sub-componente <AvatarStatus> para indicador online/offline.
 */

const sizeMap = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
};

const gradientClass = 'bg-[linear-gradient(135deg,hsl(86,30%,32%)_0%,hsl(17,72%,43%)_100%)]';

export const Avatar = React.forwardRef(({ className, size = 'md', ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex shrink-0 overflow-hidden rounded-full',
      sizeMap[size] || sizeMap.md,
      className,
    )}
    {...props}
  />
));
Avatar.displayName = 'Avatar';

export const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = 'AvatarImage';

/**
 * AvatarFallback — quando não há imagem, mostra iniciais com o gradiente oficial.
 * Aceita string "VC" (iniciais) ou children.
 */
export const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-full text-white font-bold',
      gradientClass,
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = 'AvatarFallback';

/**
 * DS_V2: indicador de status (online/offline/away) — bolinha 12px canto
 * inferior direito com borda branca 2px. Usar dentro de <Avatar> posicionado
 * absolutamente. A `status` aceita "online" | "offline" | "away".
 */
const statusColor = {
  online: 'bg-success',
  offline: 'bg-muted-foreground',
  away: 'bg-highlight',
};

export const AvatarStatus = ({ status = 'offline', className, ...props }) => (
  <span
    aria-label={status}
    className={cn(
      'absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-white',
      statusColor[status] || statusColor.offline,
      className,
    )}
    {...props}
  />
);
AvatarStatus.displayName = 'AvatarStatus';
