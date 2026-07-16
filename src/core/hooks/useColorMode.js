/**
 * useColorMode — gerencia dark/light mode com localStorage + prefers-color-scheme.
 * TASK-618
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'viralata-color-mode';

/**
 * @returns {{ mode: 'dark'|'light'|'system', setMode: (m:'dark'|'light'|'system')=>void, isDark: boolean }}
 */
export function useColorMode() {
  const [mode, setModeState] = useState(() => {
    // Inicialização: localStorage > system preference
    if (typeof window === 'undefined') return 'system';
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isDark, setIsDark] = useState(() => {
    if (mode === 'dark') return true;
    if (mode === 'light') return false;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_KEY, 'dark');
      setIsDark(true);
    } else if (mode === 'light') {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY, 'light');
      setIsDark(false);
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      localStorage.removeItem(STORAGE_KEY);
      setIsDark(prefersDark);
    }
  }, [mode]);

  // Escuta mudanças de prefers-color-scheme só no modo "system"
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        setIsDark(true);
      } else {
        root.classList.remove('dark');
        setIsDark(false);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  // Aplica modo inicial na carga da página (evita FOUC)
  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark');
      }
    }
  }, []); // só roda uma vez na montagem

  const setMode = (m) => setModeState(m);

  return { mode, setMode, isDark };
}
