import React, { useState, cloneElement } from 'react';
import { ConfirmDialog as ControlledConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Açúcar sintático "trigger-based" sobre o ConfirmDialog canônico
 * (`@/components/ui/confirm-dialog`). Útil para botões de ação em listas, onde
 * manter estado controlado por item seria verboso.
 *
 * O `trigger` (um botão/elemento clicável) recebe um onClick que abre o diálogo;
 * `onConfirm` só roda após o usuário confirmar.
 *
 * @param {{
 *   trigger: React.ReactElement,
 *   title?: string,
 *   description?: string,
 *   confirmLabel?: string,
 *   cancelLabel?: string,
 *   destructive?: boolean,
 *   onConfirm: () => void,
 * }} props
 */
export default function ConfirmDialog({
  trigger,
  title = 'Tem certeza?',
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  onConfirm,
}) {
  const [open, setOpen] = useState(false);

  const triggerWithHandler = cloneElement(trigger, {
    onClick: (e) => {
      e?.stopPropagation?.();
      e?.preventDefault?.();
      setOpen(true);
      trigger.props?.onClick?.(e);
    },
  });

  return (
    <>
      {triggerWithHandler}
      <ControlledConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        destructive={destructive}
        onConfirm={() => {
          setOpen(false);
          onConfirm?.();
        }}
      />
    </>
  );
}
