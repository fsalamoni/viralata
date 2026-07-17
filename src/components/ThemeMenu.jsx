import React, { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useColorMode } from '@/core/hooks/useColorMode';
import { cn } from '@/core/lib/utils';

/**
 * ThemeMenu — switch de tema com 3 opções (light/dark/system).
 * TASK-020: dark mode completo.
 *
 * Substitui o toggle binário do ColorModeToggle. Agora o user escolhe
 * explicitamente entre 3 modos:
 *  - light: sempre claro (override do sistema)
 *  - dark: sempre escuro (override do sistema)
 *  - system: segue o `prefers-color-scheme` do OS
 *
 * Persistência: localStorage chave `viralata-color-mode` ('light' | 'dark' | 'system').
 * Default: 'system' (se localStorage vazio, segue o OS).
 *
 * A11y: usa `<button>` com aria-expanded, aria-haspopup="menu",
 * role="menu" no dropdown, role="menuitemradio" nas opções, e fecha
 * com ESC ou click outside.
 */
const MODES = [
  { key: 'light', label: 'Modo claro', icon: Sun, hint: 'Sempre claro' },
  { key: 'dark', label: 'Modo escuro', icon: Moon, hint: 'Sempre escuro' },
  { key: 'system', label: 'Sistema', icon: Monitor, hint: 'Segue o seu dispositivo' },
];

export default function ThemeMenu({ className }) {
  const { mode, setMode, isDark } = useColorMode();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Fecha com ESC
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const current = MODES.find((m) => m.key === mode) || MODES[2];
  const CurrentIcon = current.icon;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={isDark ? 'Mudar tema (atualmente escuro)' : 'Mudar tema (atualmente claro)'}
        title="Tema"
        className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 hover:bg-secondary hover:text-foreground transition-colors"
      >
        <CurrentIcon className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-[0_18px_40px_-12px_rgba(64,34,18,0.25)]"
        >
          <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Aparência
          </p>
          {MODES.map((m) => {
            const Icon = m.icon;
            const isSelected = m.key === mode;
            return (
              <button
                key={m.key}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  setMode(m.key);
                  setOpen(false);
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                  isSelected
                    ? 'bg-primary/10 text-foreground'
                    : 'text-foreground/85 hover:bg-secondary'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium leading-tight">{m.label}</span>
                  <span className="block text-[11px] text-muted-foreground">{m.hint}</span>
                </span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
