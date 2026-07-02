import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'viralata-theme';

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // localStorage indisponível (modo privado, etc.) — segue para a preferência do sistema.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage indisponível (modo privado, etc.) — tema só dura a sessão.
    }
  }, [theme]);

  const setTheme = useCallback((next) => setThemeState(next === 'dark' ? 'dark' : 'light'), []);
  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  return ctx;
}
