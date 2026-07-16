/**
 * @fileoverview AppearanceSettings — card de preferências visuais do usuário
 * (TASK-401).
 *
 * Permite ao usuário escolher:
 *  - Modo do rodapé (legal): fixed / autohide / hidden
 *  - Modo da tab bar inferior (mobile): fixed / autohide / hidden
 *  - Modo compacto (reduz paddings em listas/cards)
 *  - Reduzir movimento (sobrescreve prefers-reduced-motion)
 *
 * Mudanças são aplicadas IMEDIATAMENTE e persistidas debounced no Firestore.
 *
 * Gated pela flag `shelter_ui_preferences_v1` (default OFF).
 */

import { useState } from 'react';
import { Monitor, Eye, EyeOff, MousePointer, Smartphone, Minimize2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useUiPreferences, FOOTER_MODES, BOTTOM_TAB_MODES } from '@/core/hooks/useUiPreferences';
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
  const setCompactMode = (value) => setPrefs({ compactMode: value });
  const setReduceMotion = (value) => setPrefs({ reduceMotion: value });

  return (
    <section data-testid="appearance-settings">
      <div className="arena-section-card-header">
        <h3 className="arena-section-card-title" className="flex items-center gap-2 text-base font-bold">
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
