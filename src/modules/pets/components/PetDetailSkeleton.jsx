import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton do PetDetail — mantém o layout exato da página enquanto o pet
 * carrega do Firestore. Percebido como MUITO mais rápido que spinner
 * centralizado (e evita o "salto" de layout quando o conteúdo chega).
 *
 * Mobile + desktop no mesmo componente — usa w-full + max-w pra alinhar
 * com o grid real da página.
 */
export default function PetDetailSkeleton() {
  return (
    <div
      className="mx-auto max-w-4xl px-5 py-6 pb-12 space-y-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregando informações do pet"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-16" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Coluna da foto */}
        <div className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-[2rem]" />
          <div className="flex gap-2 justify-center">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2 w-2 rounded-full" />
          </div>
        </div>

        {/* Coluna de info */}
        <div className="space-y-4 pt-2">
          <div>
            <Skeleton className="h-9 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-16 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-14 rounded-full" />
          </div>
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1 rounded-md" />
            <Skeleton className="h-11 w-11 rounded-md" />
          </div>
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    </div>
  );
}