import { useState, useEffect, useRef } from 'react';

/**
 * useDirtyState — detecta se um form foi modificado desde o último "saved".
 *
 * @param {Object} options
 * @param {*} options.initialValue - valor inicial (ou referência estável)
 * @param {Function} [options.onDirtyChange] - callback optional (dirty → true)
 * @returns {{ isDirty, markClean, markDirty, dirtyRef }}
 *
 * Uso típico:
 *   const { isDirty, markClean } = useDirtyState({ initialValue: formValues });
 *   // formValues muda → isDirty=true automaticamente
 *   // Ao salvar: markClean() → isDirty=false
 *
 * ⚠️ Se initialValue for um objeto novo em cada render, isDirty vai pipocar.
 * Passar sempre a mesma referência (useState ou useMemo).
 */
export function useDirtyState({ initialValue, onDirtyChange } = {}) {
  const [isDirty, setIsDirty] = useState(false);
  const prevValueRef = useRef(initialValue);
  const onDirtyChangeRef = useRef(onDirtyChange);

  // Manter callback ref atualizada sem re-render
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  // Detectar mudanças
  useEffect(() => {
    const prev = prevValueRef.current;
    const next = initialValue;

    if (prev === next) return; // mesma referência, não mudou
    if (typeof prev === 'object' && typeof next === 'object') {
      // Comparação rasa para objetos/arrays
      const prevKeys = prev ? Object.keys(prev) : [];
      const nextKeys = next ? Object.keys(next) : [];
      if (prevKeys.length !== nextKeys.length) {
        setIsDirty(true);
        onDirtyChangeRef.current?.(true);
        return;
      }
      const changed = prevKeys.some(k => prev[k] !== next[k]);
      if (changed) {
        setIsDirty(true);
        onDirtyChangeRef.current?.(true);
      }
    } else if (prev !== next) {
      setIsDirty(true);
      onDirtyChangeRef.current?.(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  function markClean() {
    prevValueRef.current = initialValue;
    setIsDirty(false);
    onDirtyChangeRef.current?.(false);
  }

  function markDirty() {
    prevValueRef.current = initialValue;
    setIsDirty(true);
    onDirtyChangeRef.current?.(true);
  }

  return { isDirty, markClean, markDirty, dirtyRef: prevValueRef };
}
