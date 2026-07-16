import { Toaster as Sonner } from 'sonner';

/**
 * Toaster padronizado para o app (TASK-617).
 *
 * Configurações:
 * - posição: top-right
 * - stacking: até 3 toasts visíveis simultaneamente
 * - durações: success 4s, error 6s, info 3s
 * - closeButton: sempre visível
 * - richColors: fundo colorido por tipo (verde/vermelho/azul)
 */
export function Toaster(props) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
      visibleToasts={3}
      toastOptions={{
        durations: {
          success: 4000,
          error: 6000,
          info: 3000,
        },
        classNames: {
          toast: 'group bg-background text-foreground border border-border shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
