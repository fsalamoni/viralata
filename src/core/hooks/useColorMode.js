/**
 * useColorMode — gerencia dark/light mode com localStorage + prefers-color-scheme.
 * TASK-618
 */
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'viralata-color-mode';

function getSystemPrefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredMode() {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored;
  } catch (_) {
    // localStorage indisponível (modo privado) — segue system.
  }
  return 'system';
}

/**
 * @returns {{ mode: 'dark'|'light'|'system', setMode: (m:'dark'|'light'|'system')=>void, isDark: boolean }}
 */
export function useColorMode() {
  const [mode, setModeState] = useState(readStoredMode);
  // isDark é derivado de `mode` + sistema; nunca armazenado em state
  // para evitar dessincronia entre a classe do <html> e o valor reportado.
  const isDark =
    mode === 'dark' || (mode === 'system' && getSystemPrefersDark());

  const applyMode = useCallback((next) => {
    const root = document.documentElement;
    let isDarkNow;
    if (next === 'dark') {
      root.classList.add('dark');
      isDarkNow = true;
    } else if (next === 'light') {
      root.classList.remove('dark');
      isDarkNow = false;
    } else {
      // system
      isDarkNow = getSystemPrefersDark();
      if (isDarkNow) root.classList.add('dark');
      else root.classList.remove('dark');
    }
    try {
      if (next === 'system') {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch (_) {
      // localStorage indisponível — modo só dura a sessão.
    }
    return isDarkNow;
  }, []);

  useEffect(() => {
    applyMode(mode);
  }, [mode, applyMode]);

  // Escuta mudanças do sistema quando mode === 'system'
  useEffect(() => {
    if (mode !== 'system' || typeof window === 'undefined') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const root = document.documentElement;
      if (mq.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((m) => {
    if (m !== 'dark' && m !== 'light' && m !== 'system') return;
    setModeState(m);
  }, []);

  return { mode, setMode, isDark };
}
