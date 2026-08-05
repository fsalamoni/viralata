/**
 * @fileoverview ShelterEntry — entrada de Membro de Abrigo (V4).
 *
 * Página gateway do acesso de abrigo (`/entrar/abrigo`). Três caminhos:
 *  - **Seus abrigos**: se o usuário já é membro/equipe de abrigos, eles
 *    aparecem como PRIMEIRAS opções de ingresso → entra direto no painel.
 *  - **Código**: `joinClubByCode` → vincula à equipe → painel.
 *  - **Criar novo**: `CreateOrganization` → `ShelterOnboardingWizard`.
 *
 * Nesta página o usuário ainda NÃO entrou em um abrigo: a topbar não mostra
 * Painel/Pets/Mural nem a indicação de abrigo (ver personaGatewayRoutes).
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 * @see docs/AI_GUIDE/13-DECISIONS.md §16
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Building2, ArrowRight, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useActivePersona } from '@/core/hooks/useActivePersona';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { PERSONA_TYPE, buildPersonaKey } from '@/core/domain/personas';
import { enablePersona } from '@/core/services/personaService';
import { useJoinClub, useMyClubs } from '@/modules/organizations/hooks/useClubs';
import { logger } from '@/core/lib/logger';

export function ShelterEntry() {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_SHELTER_STAFF);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActive: setActiveHook } = useActivePersona();
  const joinClub = useJoinClub();
  // Abrigos em que o usuário já é membro/equipe — primeiras opções de ingresso.
  const { data: myClubs = [], isLoading: loadingClubs } = useMyClubs({
    enabled: Boolean(enabled && user?.uid),
  });
  const [mode, setMode] = useState(null); // null | 'code' | 'create'
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!enabled) {
    navigate('/feed', { replace: true });
    return null;
  }

  if (!user) {
    navigate('/login', { replace: true, state: { from: '/entrar/abrigo' } });
    return null;
  }

  const handleEnterShelter = async (club) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      // Entra direto no painel do abrigo escolhido, ativando a persona
      // escopada àquele abrigo (item 7).
      const personaKey = buildPersonaKey(PERSONA_TYPE.SHELTER_STAFF, club.id);
      await enablePersona(user.uid, personaKey);
      await setActiveHook(personaKey);
      navigate(`/organizacoes/${club.id}/admin`, { replace: true });
    } catch (err) {
      logger.error('[ShelterEntry] enter shelter failed:', err);
      setError('Não foi possível abrir o painel deste abrigo. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Digite o código de convite do abrigo.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // Vincula o usuário à equipe do abrigo pelo código de convite e, em
      // seguida, ativa a persona escopada ao abrigo — caindo direto no painel
      // admin daquele abrigo (item 7: acesso de abrigo → painel privado).
      const club = await joinClub.mutateAsync(code.trim());
      const personaKey = buildPersonaKey(PERSONA_TYPE.SHELTER_STAFF, club.id);
      await enablePersona(user.uid, personaKey);
      await setActiveHook(personaKey);
      navigate(`/organizacoes/${club.id}/admin`, { replace: true });
    } catch (err) {
      logger.error('[ShelterEntry] joinByCode failed:', err);
      setError(err?.message || 'Código inválido ou expirado. Verifique com o admin do abrigo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      // Garante que a persona está habilitada antes de criar
      await enablePersona(user.uid, PERSONA_TYPE.SHELTER_STAFF);
      await setActiveHook(PERSONA_TYPE.SHELTER_STAFF);
      navigate('/organizacoes/criar', { state: { from: 'v4-persona' } });
    } catch (err) {
      logger.error('[ShelterEntry] create flow failed:', err);
      setError('Não foi possível iniciar o fluxo de criação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12" data-testid="shelter-entry">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Entrar no abrigo
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          {myClubs.length > 0
            ? 'Escolha um dos seus abrigos para abrir o painel — ou vincule-se a outro por código, ou crie um novo.'
            : 'Você já faz parte de um abrigo? Informe o código de convite. Ou crie um novo.'}
        </p>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Seus abrigos — primeiras opções de ingresso (item 1). */}
      {!mode && myClubs.length > 0 && (
        <section className="mb-8" data-testid="shelter-entry-my-clubs">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Seus abrigos
          </h2>
          <ul className="space-y-3">
            {myClubs.map((club) => (
              <li key={club.id}>
                <button
                  type="button"
                  onClick={() => handleEnterShelter(club)}
                  disabled={isSubmitting}
                  className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 text-left transition hover:border-primary disabled:opacity-50"
                  data-testid={`shelter-entry-club-${club.id}`}
                >
                  {club.logo_url ? (
                    <img src={club.logo_url} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-primary/10 object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" aria-hidden="true">
                      <Building2 className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-foreground">
                      {club.name || club.title || 'Abrigo'}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                      {[club.city, club.state].filter(Boolean).join(' / ') || 'Abrir painel'}
                      {club.my_role && (
                        <Badge variant={club.my_role === 'admin' ? 'warning' : 'success'} className="rounded-full uppercase tracking-[0.1em]">
                          {club.my_role === 'admin' ? 'Admin' : 'Membro'}
                        </Badge>
                      )}
                    </span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">ou vincule-se a outro abrigo</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </section>
      )}

      {!mode && loadingClubs && myClubs.length === 0 && (
        <div className="mb-8 flex justify-center" data-testid="shelter-entry-loading">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
        </div>
      )}

      {!mode && (
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode('code')}
            disabled={isSubmitting}
            className="flex flex-col items-start gap-3 rounded-2xl border-2 border-border bg-card p-6 text-left transition hover:border-primary"
            data-testid="shelter-entry-code"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white" aria-hidden="true">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Inserir código</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recebeu um código de convite? Cole aqui para se vincular a um abrigo existente.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="flex flex-col items-start gap-3 rounded-2xl border-2 border-border bg-card p-6 text-left transition hover:border-primary disabled:opacity-50"
            data-testid="shelter-entry-create"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white" aria-hidden="true">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Criar novo abrigo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Vai representar uma ONG ou loja? Configure um abrigo do zero.
              </p>
            </div>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        </div>
      )}

      {mode === 'code' && (
        <form onSubmit={handleJoinByCode} className="space-y-4" data-testid="shelter-entry-code-form">
          <div>
            <Label htmlFor="shelter-code">Código de convite</Label>
            <Input
              id="shelter-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex.: ABC123"
              autoComplete="off"
              className="mt-1"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(null);
                setError(null);
                setCode('');
              }}
              disabled={isSubmitting}
            >
              Voltar
            </Button>
            <Button type="submit" disabled={isSubmitting || !code.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  Entrar no abrigo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default ShelterEntry;
