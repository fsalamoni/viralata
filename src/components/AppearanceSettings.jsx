/**
 * @fileoverview AppearanceSettings — card de preferências visuais do usuário
 * (TASK-401 + TASK-V3-UI-1/2/3).
 *
 * Permite ao usuário escolher:
 *  - Modo do rodapé (legal): fixed / autohide / hidden
 *  - Modo da tab bar inferior (mobile): fixed / autohide / hidden
 *  - Modo da barra superior (header desktop): fixed / autohide / hidden (V3)
 *  - Cards por página do feed, por viewport: mobile/tablet/desktop (V3)
 *  - Colunas do grid de pets, por viewport: auto/1/2/3/4/5 (V3)
 *  - Modo compacto (reduz paddings em listas/cards)
 *  - Reduzir movimento (sobrescreve prefers-reduced-motion)
 *
 * Mudanças são aplicadas IMEDIATAMENTE e persistidas debounced no Firestore.
 *
 * Gated pela flag `shelter_ui_preferences_v1` (default OFF).
 */

import { useState } from 'react';
import {
  Monitor, Eye, EyeOff, MousePointer, Smartphone, Minimize2, Sparkles,
  PanelTop, LayoutGrid, Rows3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  useUiPreferences, FOOTER_MODES, BOTTOM_TAB_MODES, TOPBAR_MODES,
  CARDS_PER_PAGE_OPTIONS, GRID_COLUMNS_OPTIONS,
} from '@/core/hooks/useUiPreferences';
import { cn } from '@/core/lib/utils';

const FOOTER_OPTIONS = [
  {
    value: FOOTER_MODES.FIXED,
    label: 'Sempre visível',
    description: 'Rodapé com termos, privacidade e contato jurídico fica fixo no final do conteúdo.',
    icon: Monitor,
  },
  {
    value: FOOTER_MODES.AUTOHIDE,
    label: 'Aparece com o mouse',
    description: 'Fica oculto. Aparece automaticamente quando o mouse se aproxima da base da tela.',
    icon: MousePointer,
  },
  {
    value: FOOTER_MODES.HIDDEN,
    label: 'Esconder',
    description: 'Não exibe. Você ainda pode acessar via menu de Ajuda.',
    icon: EyeOff,
  },
];

const BOTTOM_TAB_OPTIONS = [
  {
    value: BOTTOM_TAB_MODES.FIXED,
    label: 'Sempre visível',
    description: 'Tab bar inferior fixa em todas as páginas.',
    icon: Monitor,
  },
  {
    value: BOTTOM_TAB_MODES.AUTOHIDE,
    label: 'Aparece com scroll',
    description: 'Some quando você rola para baixo, aparece ao rolar para cima.',
    icon: MousePointer,
  },
  {
    value: BOTTOM_TAB_MODES.HIDDEN,
    label: 'Esconder',
    description: 'Use o menu de navegação pelo avatar.',
    icon: EyeOff,
  },
];

// V3 (TASK-V3-UI-1): barra superior (header) do site
const TOPBAR_OPTIONS = [
  {
    value: TOPBAR_MODES.FIXED,
    label: 'Sempre visível',
    description: 'Header com logo e navegação principal fica fixo no topo.',
    icon: PanelTop,
  },
  {
    value: TOPBAR_MODES.AUTOHIDE,
    label: 'Aparece com scroll',
    description: 'Some quando você rola para baixo, aparece ao rolar para cima.',
    icon: MousePointer,
  },
  {
    value: TOPBAR_MODES.HIDDEN,
    label: 'Esconder',
    description: 'Mais espaço para o conteúdo. Acesse a navegação pelo menu da página.',
    icon: EyeOff,
  },
];

function Option({ option, selected, onSelect, Icon }) {
  return (
    <label
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
          : 'border-border hover:bg-muted/30',
      )}
    >
      <input
        type="radio"
        name={option.value}
        checked={selected}
        onChange={() => onSelect(option.value)}
        className="sr-only"
        data-testid={`option-${option.value}`}
      />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{option.label}</p>
        <p className="text-xs text-muted-foreground">{option.description}</p>
      </div>
    </label>
  );
}

export function AppearanceSettings() {
  const [prefs, setPrefs, status] = useUiPreferences();
  const [openSection, setOpenSection] = useState(null);

  const setFooterMode = (value) => setPrefs({ footerMode: value });
  const setBottomTabMode = (value) => setPrefs({ bottomTabBarMode: value });
  const setTopBarMode = (value) => setPrefs({ topBarMode: value });
  const setCardsPerPage = (viewport, value) =>
    setPrefs((p) => ({ ...p, feedCardsPerPage: { ...p.feedCardsPerPage, [viewport]: value } }));
  const setGridColumns = (viewport, value) =>
    setPrefs((p) => ({ ...p, feedGridColumns: { ...p.feedGridColumns, [viewport]: value } }));
  const setCompactMode = (value) => setPrefs({ compactMode: value });
  const setReduceMotion = (value) => setPrefs({ reduceMotion: value });

  return (
    <section data-testid="appearance-settings">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title flex items-center gap-2 text-base font-bold">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
          Aparência
        </h3>
        <p className="arena-section-card-description">
          Personalize como os elementos do site aparecem. Mudanças são aplicadas imediatamente
          e salvas automaticamente.
        </p>
      </div>
      <div className="arena-section-card-body p-6 pt-2 space-y-5">
        {/* Footer */}
        <div>
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'footer' ? null : 'footer')}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={openSection === 'footer'}
          >
            <div className="flex items-center gap-2">
              <Monitor className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Rodapé (termos, privacidade…)</span>
              <Badge variant="secondary" className="text-[10px]">
                {FOOTER_OPTIONS.find((o) => o.value === prefs.footerMode)?.label || 'Sempre visível'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {openSection === 'footer' ? 'Ocultar' : 'Configurar'}
            </span>
          </button>
          {openSection === 'footer' && (
            <div className="mt-3 space-y-2">
              {FOOTER_OPTIONS.map((opt) => (
                <Option
                  key={opt.value}
                  option={opt}
                  selected={prefs.footerMode === opt.value}
                  onSelect={setFooterMode}
                  Icon={opt.icon}
                />
              ))}
            </div>
          )}
        </div>

        {/* Bottom tab bar (mobile) */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'tabbar' ? null : 'tabbar')}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={openSection === 'tabbar'}
          >
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Tab bar inferior (mobile)</span>
              <Badge variant="secondary" className="text-[10px]">
                {BOTTOM_TAB_OPTIONS.find((o) => o.value === prefs.bottomTabBarMode)?.label || 'Sempre visível'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {openSection === 'tabbar' ? 'Ocultar' : 'Configurar'}
            </span>
          </button>
          {openSection === 'tabbar' && (
            <div className="mt-3 space-y-2">
              {BOTTOM_TAB_OPTIONS.map((opt) => (
                <Option
                  key={opt.value}
                  option={opt}
                  selected={prefs.bottomTabBarMode === opt.value}
                  onSelect={setBottomTabMode}
                  Icon={opt.icon}
                />
              ))}
            </div>
          )}
        </div>

        {/* V3 (TASK-V3-UI-1): Top bar (desktop) */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'topbar' ? null : 'topbar')}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={openSection === 'topbar'}
          >
            <div className="flex items-center gap-2">
              <PanelTop className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Barra superior (desktop)</span>
              <Badge variant="secondary" className="text-[10px]">
                {TOPBAR_OPTIONS.find((o) => o.value === prefs.topBarMode)?.label || 'Sempre visível'}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {openSection === 'topbar' ? 'Ocultar' : 'Configurar'}
            </span>
          </button>
          {openSection === 'topbar' && (
            <div className="mt-3 space-y-2">
              {TOPBAR_OPTIONS.map((opt) => (
                <Option
                  key={opt.value}
                  option={opt}
                  selected={prefs.topBarMode === opt.value}
                  onSelect={setTopBarMode}
                  Icon={opt.icon}
                />
              ))}
            </div>
          )}
        </div>

        {/* V3 (TASK-V3-UI-2): Cards por página, por viewport */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'cards' ? null : 'cards')}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={openSection === 'cards'}
          >
            <div className="flex items-center gap-2">
              <Rows3 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Cards por página (feed)</span>
              <Badge variant="secondary" className="text-[10px]">
                {prefs.feedCardsPerPage?.desktop || 12} desktop · {prefs.feedCardsPerPage?.tablet || 12} tablet · {prefs.feedCardsPerPage?.mobile || 8} mobile
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {openSection === 'cards' ? 'Ocultar' : 'Configurar'}
            </span>
          </button>
          {openSection === 'cards' && (
            <div className="mt-3 space-y-3">
              {[
                { key: 'mobile', label: 'Mobile (até 640px)', icon: Smartphone },
                { key: 'tablet', label: 'Tablet (640px-1024px)', icon: Rows3 },
                { key: 'desktop', label: 'Desktop (acima de 1024px)', icon: Monitor },
              ].map(({ key, label, icon: VIcon }) => (
                <div key={key}>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <VIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {CARDS_PER_PAGE_OPTIONS[key].map((n) => (
                      <Button
                        key={n}
                        type="button"
                        variant={prefs.feedCardsPerPage?.[key] === n ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCardsPerPage(key, n)}
                        className="h-8 min-w-[48px]"
                        data-testid={`cards-per-page-${key}-${n}`}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* V3 (TASK-V3-UI-3): Colunas do grid, por viewport */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setOpenSection(openSection === 'columns' ? null : 'columns')}
            className="flex w-full items-center justify-between text-left"
            aria-expanded={openSection === 'columns'}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Colunas do grid (feed)</span>
              <Badge variant="secondary" className="text-[10px]">
                {prefs.feedGridColumns?.desktop || 'auto'} desktop · {prefs.feedGridColumns?.tablet || 'auto'} tablet · {prefs.feedGridColumns?.mobile || 'auto'} mobile
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              {openSection === 'columns' ? 'Ocultar' : 'Configurar'}
            </span>
          </button>
          {openSection === 'columns' && (
            <div className="mt-3 space-y-3">
              {[
                { key: 'mobile', label: 'Mobile (até 640px)' },
                { key: 'tablet', label: 'Tablet (640px-1024px)' },
                { key: 'desktop', label: 'Desktop (acima de 1024px)' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(GRID_COLUMNS_OPTIONS).map(([k, v]) => {
                      const allowed =
                        key === 'mobile' ? ['auto', 1, 2] :
                        key === 'tablet' ? ['auto', 1, 2, 3] :
                        ['auto', 2, 3, 4, 5];
                      if (!allowed.includes(v)) return null;
                      return (
                        <Button
                          key={k}
                          type="button"
                          variant={prefs.feedGridColumns?.[key] === v ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setGridColumns(key, v)}
                          className="h-8 min-w-[48px]"
                          data-testid={`grid-cols-${key}-${k}`}
                        >
                          {k === 'auto' ? 'Auto' : `${v} col`}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compact mode */}
        <div className="border-t pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Minimize2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <Label htmlFor="compact-mode" className="text-sm font-semibold">
                Modo compacto
              </Label>
              <p className="text-xs text-muted-foreground">Reduz paddings em listas e cards</p>
            </div>
          </div>
          <Switch
            id="compact-mode"
            checked={prefs.compactMode === true}
            onCheckedChange={setCompactMode}
            data-testid="toggle-compact"
          />
        </div>

        {/* Reduce motion */}
        <div className="border-t pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <Label htmlFor="reduce-motion" className="text-sm font-semibold">
                Reduzir movimento
              </Label>
              <p className="text-xs text-muted-foreground">Desabilita transições e animações</p>
            </div>
          </div>
          <Switch
            id="reduce-motion"
            checked={prefs.reduceMotion === true}
            onCheckedChange={setReduceMotion}
            data-testid="toggle-motion"
          />
        </div>

        {/* Status indicator */}
        {status.saving && (
          <p className="text-xs text-muted-foreground" role="status" aria-live="polite">
            Salvando…
          </p>
        )}
        {status.error && (
          <p className="text-xs text-destructive" role="alert">
            Erro ao salvar: {status.error}
          </p>
        )}
        {!status.saving && status.syncedAt && (
          <p className="text-xs text-muted-foreground" role="status">
            Salvo às {status.syncedAt.toLocaleTimeString('pt-BR')}
          </p>
        )}
      </div>
    </section>
  );
}

export default AppearanceSettings;
