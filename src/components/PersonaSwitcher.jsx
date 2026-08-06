/**
 * @fileoverview PersonaSwitcher — botão dropdown no TopBar para trocar persona.
 *
 * Aparece no TopBar **APENAS** quando o user tem 2+ personas
 * visíveis (D-PERSONA-SWITCHER-VISIBILITY). A troca é instantânea,
 * sem confirmação (D-PERSONA-SWITCH-NO-CONFIRM).
 *
 * Personas incompletas têm badge "Incompleto" (D-PERSONA-SWITCHER-INCOMPLETE-BADGE).
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, Users, Heart, Home, MessageSquare, Shield, Check, Plus, AlertCircle } from 'lucide-react';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE, PERSONA_LABEL } from '@/core/domain/personas';
import { canUsePlatformAdminPersona } from '@/core/services/personaService';
import { cn } from '@/core/lib/utils';

const PERSONA_ICON = {
  [PERSONA_TYPE.ADOPTER]: Heart,
  [PERSONA_TYPE.DONOR]: User,
  [PERSONA_TYPE.SHELTER_STAFF]: Home,
  [PERSONA_TYPE.COMMUNITY_STAFF]: Users,
  [PERSONA_TYPE.VOLUNTEER]: MessageSquare,
  [PERSONA_TYPE.PLATFORM_ADMIN]: Shield,
};

export function PersonaSwitcher({ onSelectPersona, onAddPersona }) {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_SWITCHER);
  const { user, userProfile } = useAuth();
  const {
    active,
    visibleForSwitcher,
    setActive,
    canSwitch,
    isLoading,
  } = useActivePersona();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Se V4 não estiver habilitada OU user não tem 2+ personas, não renderiza
  if (!enabled) return null;
  if (!user) return null;
  if (!canSwitch) return null;
  if (isLoading) return null;
  // D-SHELTER-SWITCH-ADMIN-ONLY: dentro do acesso de abrigo, o switch de
  // acessos fica disponível APENAS para o admin master. Os demais usuários
  // não trocam de acesso pelo topbar aqui — reingressam pela landing page.
  if (active?.type === PERSONA_TYPE.SHELTER_STAFF && !canUsePlatformAdminPersona(userProfile)) {
    return null;
  }

  const ActiveIcon = PERSONA_ICON[active.type] || User;
  const activeLabel = PERSONA_LABEL[active.type] || 'Acesso';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Trocar persona (atual: ${activeLabel})`}
        className={cn(
          'flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-card',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        )}
        data-testid="persona-switcher-button"
      >
        <ActiveIcon className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">{activeLabel}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Trocar persona"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl"
          data-testid="persona-switcher-dropdown"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            Trocar acesso
          </div>
          <ul className="space-y-0.5">
            {visibleForSwitcher.map((p) => {
              const Icon = PERSONA_ICON[p.type] || User;
              const baseLabel = PERSONA_LABEL[p.type] || p.type;
              // Distingue acessos escopados pelo nome da entidade
              // (ex.: "Meu abrigo — Cão do Bem").
              const label = p.scopeName ? `${baseLabel} — ${p.scopeName}` : baseLabel;
              const isActive = p.key === active.key;
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async () => {
                      await setActive(p.key);
                      setOpen(false);
                      onSelectPersona?.(p);
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted',
                    )}
                    data-testid={`persona-option-${p.type}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 truncate">{label}</span>
                    {!p.hasOnboarding && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                        title="Persona sem onboarding completo"
                      >
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        Incompleto
                      </span>
                    )}
                    {isActive && (
                      <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-border pt-2">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAddPersona?.();
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-primary transition hover:bg-primary/5"
              data-testid="persona-add-new"
            >
              <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Adicionar outro acesso</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PersonaSwitcher;
