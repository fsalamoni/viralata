/**
 * @fileoverview CommandPalette — paleta global Cmd+K / Ctrl+K
 * (TASK-083, Fase 18 Smart Search).
 *
 * Implementação leve sem dependência nova (sem cmdk): Dialog +
 * input com filtro de comandos de navegação + atalho "Buscar em
 * /busca". Gated pela flag `shelter_smart_search` (default OFF —
 * aditivo, o listener nem é registrado com a flag desligada).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PawPrint, Building2, Users, Heart, User, LayoutDashboard } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { normalizeText } from '@/modules/shelter/domain/search';

const COMMANDS = [
  { id: 'busca', label: 'Ir para a Busca', keywords: 'buscar procurar search', to: '/busca', icon: Search },
  { id: 'feed', label: 'Pets para adoção', keywords: 'pets feed animais adotar', to: '/feed', icon: PawPrint },
  { id: 'orgs', label: 'ONGs e abrigos', keywords: 'organizacoes ongs abrigos', to: '/organizacoes', icon: Building2 },
  { id: 'comunidades', label: 'Comunidades', keywords: 'comunidades forum mural', to: '/comunidades', icon: Users },
  { id: 'voluntarios', label: 'Seja voluntário', keywords: 'voluntarios voluntariado ajudar', to: '/voluntarios', icon: Heart },
  { id: 'perfil', label: 'Meu perfil', keywords: 'perfil conta adocoes voluntariadas', to: '/perfil', icon: User },
  { id: 'admin', label: 'Painel admin', keywords: 'admin dashboard flags', to: '/admin', icon: LayoutDashboard },
];

export function CommandPalette() {
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_SMART_SEARCH);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
    }
  }, [open]);

  const items = useMemo(() => {
    const q = normalizeText(query);
    const nav = COMMANDS.filter((c) => !q || normalizeText(`${c.label} ${c.keywords}`).includes(q));
    if (q.length >= 2) {
      return [
        { id: '_search', label: `Buscar “${query.trim()}”`, to: `/busca`, icon: Search, isSearch: true },
        ...nav,
      ];
    }
    return nav;
  }, [query]);

  const run = (item) => {
    setOpen(false);
    navigate(item.to, item.isSearch ? { state: { q: query.trim() } } : undefined);
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && items[activeIndex]) {
      e.preventDefault();
      run(items[activeIndex]);
    }
  };

  if (!enabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[20%] max-w-lg translate-y-0 p-0" aria-label="Paleta de comandos">
        <DialogTitle className="sr-only">Paleta de comandos</DialogTitle>
        <div className="border-b border-border p-3">
          <Input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            onKeyDown={onInputKeyDown}
            placeholder="Digite para buscar ou navegar…"
            aria-label="Comando ou busca"
            role="combobox"
            aria-expanded="true"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-2" role="listbox" aria-label="Resultados">
          {items.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nada encontrado.</li>
          )}
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => run(item)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                    i === activeIndex ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-secondary/40'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
          ↑↓ navega · Enter abre · Esc fecha · Ctrl+K / ⌘K alterna
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default CommandPalette;
