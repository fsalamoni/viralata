/**
 * @fileoverview PersonaSelection — tela de primeira escolha / troca explícita de persona.
 *
 * Mostra cards com as personas PÚBLICAS (sem platform_admin).
 *
 * D-PERSONA-FIRST-ACCESS-FORCED (Q16): no primeiro acesso (sem persona
 * definida), user é direcionado para cá após login.
 *
 * D-PERSONA-ONE-AT-A-TIME (Q11): user escolhe UMA persona por vez.
 * Pode adicionar outras depois via "Adicionar outro acesso" no switcher.
 *
 * D-PERSONA-PERSONAS-PUBLICAS (específico): APENAS 5 personas visíveis
 * (adopter, donor, shelter_staff, community_staff, volunteer).
 * platform_admin é oculto.
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Heart, User, Home, Users, MessageSquare, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE, PERSONA_LABEL, PERSONA_TAGLINE } from '@/core/domain/personas';
import { canUsePlatformAdminPersona, detectAvailablePersonas, enablePersona, setActivePersona } from '@/core/services/personaService';
import { cn } from '@/core/lib/utils';

const PERSONA_ICON = {
  [PERSONA_TYPE.ADOPTER]: Heart,
  [PERSONA_TYPE.DONOR]: User,
  [PERSONA_TYPE.SHELTER_STAFF]: Home,
  [PERSONA_TYPE.COMMUNITY_STAFF]: Users,
  [PERSONA_TYPE.VOLUNTEER]: MessageSquare,
};

const PERSONAS_VISIVEIS = [
  {
    type: PERSONA_TYPE.ADOPTER,
    color: 'rose',
  },
  {
    type: PERSONA_TYPE.DONOR,
    color: 'amber',
  },
  {
    type: PERSONA_TYPE.SHELTER_STAFF,
    color: 'emerald',
  },
  {
    type: PERSONA_TYPE.COMMUNITY_STAFF,
    color: 'sky',
  },
  {
    type: PERSONA_TYPE.VOLUNTEER,
    color: 'violet',
  },
];

const COLOR_CLASSES = {
  rose: 'from-rose-500 to-rose-600 text-white',
  amber: 'from-amber-500 to-amber-600 text-white',
  emerald: 'from-emerald-500 to-emerald-600 text-white',
  sky: 'from-sky-500 to-sky-600 text-white',
  violet: 'from-violet-500 to-violet-600 text-white',
};

export function PersonaSelection() {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_SELECTION);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, isLoadingAuth } = useAuth();
  const { setActive: setActivePersonaHook, isLoading: isLoadingPersona } = useActivePersona();
  const [selected, setSelected] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reason from redirect (D-PERSONA-FIRST-ACCESS-FORCED)
  const reason = location.state?.reason;
  const fromPath = location.state?.from;

  // Se não tiver user, redireciona para login
  useEffect(() => {
    if (!isLoadingAuth && !user) {
      navigate('/login', { replace: true, state: { from: '/acesso' } });
    }
  }, [user, isLoadingAuth, navigate]);

  // Loading state
  if (isLoadingAuth || isLoadingPersona || !userProfile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!enabled) {
    // Flag desabilitada: redireciona para feed (comportamento legacy)
    navigate('/feed', { replace: true });
    return null;
  }

  const isAdmin = canUsePlatformAdminPersona(userProfile);

  const handleSelect = async (personaType) => {
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      // 1. Habilita a persona para o user
      await enablePersona(user.uid, personaType);
      // 2. Define como ativa
      await setActivePersonaHook(personaType);
      // 3. Redireciona para a home da persona OU para o onboarding dela
      const home = getPersonaHome(personaType);
      navigate(home, { replace: true });
    } catch (err) {
      logger.error('[PersonaSelection] select failed:', err);
      setError('Não foi possível selecionar essa persona. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12" data-testid="persona-selection">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Como você quer entrar?
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Escolha um acesso para começar. Você poderá adicionar outros depois.
        </p>
        {reason === 'persona_mismatch' && fromPath && (
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            Sua persona atual não tem acesso a essa página.
          </p>
        )}
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {PERSONAS_VISIVEIS.map((p) => {
          const Icon = PERSONA_ICON[p.type];
          const label = PERSONA_LABEL[p.type];
          const tagline = PERSONA_TAGLINE[p.type];
          const isSelected = selected === p.type;
          return (
            <button
              key={p.type}
              type="button"
              onClick={() => setSelected(p.type)}
              disabled={isSubmitting}
              className={cn(
                'group relative flex flex-col items-start gap-3 rounded-2xl border-2 bg-card p-5 text-left transition',
                isSelected
                  ? 'border-primary shadow-lg'
                  : 'border-border hover:border-primary/50',
                isSubmitting && 'cursor-not-allowed opacity-50',
              )}
              data-testid={`persona-card-${p.type}`}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br shadow-sm',
                  COLOR_CLASSES[p.color],
                )}
                aria-hidden="true"
              >
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{label}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>
              </div>
              {isSelected && (
                <ArrowRight
                  className="absolute right-4 top-4 h-5 w-5 text-primary transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex flex-col items-center gap-3">
        <Button
          onClick={() => selected && handleSelect(selected)}
          disabled={!selected || isSubmitting}
          size="lg"
          className="w-full sm:w-auto"
          data-testid="persona-confirm-button"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Selecionando...
            </>
          ) : (
            <>
              Continuar
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-muted-foreground transition hover:text-foreground"
        >
          Voltar
        </button>
      </div>

      {isAdmin && (
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Você tem acesso de admin master — ele aparecerá automaticamente no switcher.
        </p>
      )}
    </div>
  );
}

/**
 * Retorna a rota "home" da persona (para onde redirecionar após seleção).
 */
function getPersonaHome(personaType) {
  switch (personaType) {
    case PERSONA_TYPE.ADOPTER:
      return '/feed';
    case PERSONA_TYPE.DONOR:
      return '/meus-pets';
    case PERSONA_TYPE.SHELTER_STAFF:
      return '/entrar/abrigo';
    case PERSONA_TYPE.COMMUNITY_STAFF:
      return '/entrar/comunidade';
    case PERSONA_TYPE.VOLUNTEER:
      return '/voluntarios/seja';
    default:
      return '/feed';
  }
}

export default PersonaSelection;
