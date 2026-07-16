import { Toaster as Sonner } from 'sonner';

export function Toaster(props) {
  return (
    <Sonner
      position="top-right"
      richColors
      closeButton
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
