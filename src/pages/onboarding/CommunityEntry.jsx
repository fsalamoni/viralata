/**
 * @fileoverview CommunityEntry — entrada do acesso de Comunidade (V4).
 *
 * Página gateway (`/entrar/comunidade`). Três caminhos, análogos ao abrigo:
 *  - **Suas comunidades**: se o usuário já é membro/equipe, elas aparecem
 *    como primeiras opções → entra direto no painel da comunidade.
 *  - **Código**: `joinCommunityByCode` → vincula à equipe → painel.
 *  - **Criar nova**: `CreateCommunity`.
 *
 * Nesta página o usuário ainda NÃO entrou em uma comunidade: a topbar não
 * mostra a navegação escopada nem a indicação da comunidade (ver
 * personaGatewayRoutes).
 *
 * @see docs/PLAN_PERSONAS_V4.md v1.1
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Key, Users, ArrowRight, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
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
import { useMyCommunities } from '@/modules/communities/hooks/useCommunities';
import { joinCommunityByCode } from '@/modules/communities/services/communityService';
import { logger } from '@/core/lib/logger';

export function CommunityEntry() {
  const enabled = useFeatureFlag(FEATURE_FLAG.V4_PERSONA_COMMUNITY_STAFF);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setActive: setActiveHook } = useActivePersona();
  // Comunidades em que o usuário já é membro/equipe — primeiras opções.
  const { data: myCommunities = [], isLoading: loadingCommunities } = useMyCommunities({
    enabled: Boolean(enabled && user?.uid),
  });
  const [mode, setMode] = useState(null); // null | 'code'
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!enabled) {
    navigate('/feed', { replace: true });
    return null;
  }

  if (!user) {
    navigate('/login', { replace: true, state: { from: '/entrar/comunidade' } });
    return null;
  }

  const enterCommunity = async (communityId) => {
    const personaKey = buildPersonaKey(PERSONA_TYPE.COMMUNITY_STAFF, communityId);
    await enablePersona(user.uid, personaKey);
    await setActiveHook(personaKey);
    navigate(`/comunidade/${communityId}/admin`, { replace: true });
  };

  const handleEnterCommunity = async (community) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await enterCommunity(community.id);
    } catch (err) {
      logger.error('[CommunityEntry] enter community failed:', err);
      setError('Não foi possível abrir o painel desta comunidade. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Digite o código de convite da comunidade.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const community = await joinCommunityByCode(code.trim(), user);
      await enterCommunity(community.id);
    } catch (err) {
      logger.error('[CommunityEntry] joinByCode failed:', err);
      setError(err?.message || 'Código inválido ou expirado. Verifique com o admin da comunidade.');
      setIsSubmitting(false);
    }
  };

  const handleCreate = () => {
    // Abre o formulário de criação. A persona escopada (community_staff:id) é
    // ativada após a criação, quando já existe o communityId.
    setError(null);
    navigate('/comunidade/criar', { state: { from: 'v4-persona' } });
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8 sm:py-12" data-testid="community-entry">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
          Entrar na comunidade
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          {myCommunities.length > 0
            ? 'Escolha uma das suas comunidades para abrir o painel — ou vincule-se a outra por código, ou crie uma nova.'
            : 'Já faz parte de uma comunidade? Informe o código. Ou crie uma nova.'}
        </p>
      </header>

      {error && (
        <div className="mb-6 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {/* Suas comunidades — primeiras opções de ingresso. */}
      {!mode && myCommunities.length > 0 && (
        <section className="mb-8" data-testid="community-entry-my-communities">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Suas comunidades
          </h2>
          <ul className="space-y-3">
            {myCommunities.map((community) => (
              <li key={community.id}>
                <button
                  type="button"
                  onClick={() => handleEnterCommunity(community)}
                  disabled={isSubmitting}
                  className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 text-left transition hover:border-primary disabled:opacity-50"
                  data-testid={`community-entry-item-${community.id}`}
                >
                  {community.cover_url ? (
                    <img src={community.cover_url} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-primary/10 object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white" aria-hidden="true">
                      <Users className="h-5 w-5" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-foreground">
                      {community.name || 'Comunidade'}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
                      {[community.city, community.state].filter(Boolean).join(' / ') || 'Abrir painel'}
                      {community.my_role && (
                        <Badge variant={community.my_role === 'admin' ? 'warning' : 'success'} className="rounded-full uppercase tracking-[0.1em]">
                          {community.my_role === 'admin' ? 'Admin' : 'Membro'}
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
            <span className="text-xs font-medium text-muted-foreground">ou vincule-se a outra comunidade</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </section>
      )}

      {!mode && loadingCommunities && myCommunities.length === 0 && (
        <div className="mb-8 flex justify-center" data-testid="community-entry-loading">
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
            data-testid="community-entry-code"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white" aria-hidden="true">
              <Key className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Inserir código</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Recebeu um código de convite? Cole aqui para se vincular a uma comunidade.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isSubmitting}
            className="flex flex-col items-start gap-3 rounded-2xl border-2 border-border bg-card p-6 text-left transition hover:border-primary disabled:opacity-50"
            data-testid="community-entry-create"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white" aria-hidden="true">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Criar nova comunidade</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Quer reunir pessoas em torno de um tema? Crie uma comunidade.
              </p>
            </div>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          </button>
        </div>
      )}

      {mode === 'code' && (
        <form onSubmit={handleJoinByCode} className="space-y-4" data-testid="community-entry-code-form">
          <div>
            <Label htmlFor="community-code">Código de convite</Label>
            <Input
              id="community-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex.: COM-ABC123"
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
                  Entrar na comunidade
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

export default CommunityEntry;
