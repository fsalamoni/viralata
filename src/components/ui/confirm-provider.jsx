import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Provider imperativo de confirmação (TASK-213).
 *
 * Substitui `window.confirm()` (bloqueante, sem estilo, invisível a
 * screen readers custom) por um `ConfirmDialog` shadcn acessível:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: 'Excluir pet?', destructive: true }))) return;
 *
 * A promise resolve `true` no confirmar e `false` no cancelar/fechar.
 * Fora do provider (ex.: teste unitário sem wrapper), cai no fallback
 * `window.confirm` para nunca quebrar o fluxo.
 */
const ConfirmContext = createContext(null);

// Registro module-level para a API imperativa `confirmDialog()` —
// permite usar o diálogo em handlers sem plumbing de hook por
// componente. O provider registra sua função no mount.
let globalConfirm = null;

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null); // { title, description, confirmLabel, destructive }
  const resolverRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      // Se já existe um diálogo pendente, resolve-o como cancelado.
      resolverRef.current?.(false);
      resolverRef.current = resolve;
      setState({ destructive: true, ...options });
    });
  }, []);

  const settle = useCallback((value) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setState(null);
  }, []);

  React.useEffect(() => {
    globalConfirm = confirm;
    return () => { if (globalConfirm === confirm) globalConfirm = null; };
  }, [confirm]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={Boolean(state)}
        onOpenChange={(open) => { if (!open) settle(false); }}
        title={state?.title || 'Confirmar ação'}
        description={state?.description}
        confirmLabel={state?.confirmLabel || 'Confirmar'}
        cancelLabel={state?.cancelLabel || 'Cancelar'}
        destructive={state?.destructive ?? true}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  );
}

/**
 * API imperativa: `await confirmDialog({ title, description, ... })`.
 * Usável em qualquer handler (sem hook). Fallback para `window.confirm`
 * quando o provider não está montado (ex.: testes unitários).
 */
export function confirmDialog(options = {}) {
  if (globalConfirm) return globalConfirm(options);
  return Promise.resolve(
    window.confirm([options.title, options.description].filter(Boolean).join('\n')),
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (ctx) return ctx;
  // Fallback: mantém comportamento antigo se o provider não estiver montado.
  return async ({ title, description } = {}) =>
    window.confirm([title, description].filter(Boolean).join('\n'));
}
