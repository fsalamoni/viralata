import { RefreshCw } from 'lucide-react';
import { useServiceWorkerUpdate } from '@/core/pwa/useServiceWorkerUpdate';
import { Button } from '@/components/ui/button';

/**
 * Banner flutuante que aparece quando o Service Worker detecta uma nova
 * versão do app. Mostra um botão "Recarregar agora" para o usuário
 * atualizar imediatamente (sem precisar fechar/abrir o app).
 *
 * Posicionamento: canto inferior direito (mobile-first), acima do safe-area.
 * Auto-hide: o banner some sozinho depois que `hasUpdate` volta a false
 * (após o reload).
 *
 * @param {object} props
 * @param {boolean} [props.autoReload]  Se true, recarrega a página direto
 *   sem mostrar o banner (modo silencioso). Default false — UX explícita.
 */
export default function SwUpdateBanner({ autoReload = false } = {}) {
  const { hasUpdate, update } = useServiceWorkerUpdate({ autoReload });

  if (!hasUpdate) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="sw-update-banner"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border border-primary/30 bg-card shadow-2xl sm:left-auto sm:right-6"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RefreshCw className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">Nova versão disponível</p>
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            Atualizamos o app com correções e melhorias. Recarregue para ver as mudanças.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="default" onClick={update} className="h-9 sm:h-11">
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Recarregar agora
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}