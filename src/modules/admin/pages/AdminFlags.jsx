import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { FEATURE_FLAG_META, FEATURE_FLAG } from '@/core/featureFlags';
import { usePlatformSettings, migratedFlagsRef } from '@/core/lib/FeatureFlagsContext';
import { setFeatureFlag, listFeatureFlagHistory, markFlagsMigrationApplied } from '@/core/services/platformSettingsService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { Flag, Shield, Sparkles, ArrowLeft, Users } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Página dedicada às feature flags da plataforma.
 * Restrita ao admin master via `AdminRoute` + checagem extra de email
 * em `useAuth().isPlatformAdmin` (apenas `fsalamoni@gmail.com` + role
 * `platform_admin`).
 */
export default function AdminFlags() {
  const { isPlatformAdmin, user } = useAuth();
  const { settings, isLoading: settingsLoading } = usePlatformSettings();
  const [savingFlag, setSavingFlag] = useState('');
  const qc = useQueryClient();
  // TASK-167: histórico de mudanças de flags (audit_logs).
  const { data: flagHistory = [] } = useQuery({
    queryKey: ['admin', 'flag-history'],
    queryFn: () => listFeatureFlagHistory(20),
    staleTime: 30_000,
  });

  // Hooks de classe dos wrappers. Devem ficar ANTES dos early-returns.
  const deniedClass = useArenaPageClasses('arena-page mx-auto max-w-3xl py-16 text-center');
  const successClass = useArenaPageClasses('arena-page mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6');

  // Auto-marca a migração de flags como aplicada (idempotente, fire-and-forget).
  // TASK-815 FIX: também persiste os flags migrados no Firestore para que
  // sobrevivam à limpeza de cache. Sem isto, os valores migrados ficavam
  // apenas em memória e eram sobrepostos pelos valores estocados do Firestore
  // a cada reload (após cache clear).
  useEffect(() => {
    if (isPlatformAdmin) {
      markFlagsMigrationApplied(user, migratedFlagsRef.current);
    }
  }, [isPlatformAdmin, user]);

  if (!isPlatformAdmin) {
    return (
      <div className={deniedClass}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Shield className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">Acesso restrito</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta página é exclusiva do administrador da plataforma.
        </p>
      </div>
    );
  }

  // Loading skeleton para quando settings ainda estão carregando do Firestore.
  if (settingsLoading) {
    return (
      <div className={successClass}>
        <PageHero eyebrow="Admin" title="Flags de atualizações" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const flags = Object.entries(FEATURE_FLAG_META);
  const onCount = flags.filter(([key]) => Boolean(settings.feature_flags[key])).length;

  // V4 PERSONAS (D-PERSONA-FLAG-GRADUAL, Q30) — agrupado em seção
  // dedicada no painel, com banner de aviso de rollout gradual. Ver
  // docs/PLAN_PERSONAS_V4.md v1.1 e docs/AI_GUIDE/19-V4-PERSONAS-INDEX.md.
  const v4FlagKeys = [
    FEATURE_FLAG.V4_PERSONA_ENABLED,
    FEATURE_FLAG.V4_PERSONA_ADOPTER,
    FEATURE_FLAG.V4_PERSONA_DONOR,
    FEATURE_FLAG.V4_PERSONA_SHELTER_STAFF,
    FEATURE_FLAG.V4_PERSONA_COMMUNITY_STAFF,
    FEATURE_FLAG.V4_PERSONA_VOLUNTEER,
    FEATURE_FLAG.V4_PERSONA_PLATFORM_ADMIN,
    FEATURE_FLAG.V4_PERSONA_SWITCHER,
    FEATURE_FLAG.V4_PERSONA_SELECTION,
    FEATURE_FLAG.V4_PERSONA_VOLUNTEER_POOL,
    FEATURE_FLAG.V4_PERSONA_PET_TRANSFER,
  ];
  const v4Flags = flags.filter(([key]) => v4FlagKeys.includes(key));
  const v4OnCount = v4Flags.filter(([key]) => Boolean(settings.feature_flags[key])).length;
  const v4MasterOn = Boolean(settings.feature_flags[FEATURE_FLAG.V4_PERSONA_ENABLED]);

  async function handleToggle(flagKey, enabled) {
    setSavingFlag(flagKey);
    try {
      // D-PERSONA-FLAG-GRADUAL (Q30): se ligando o master V4 pela
      // primeira vez, avisar sobre rollout gradual.
      const isV4Master = flagKey === FEATURE_FLAG.V4_PERSONA_ENABLED;
      const isV4SubFlag = v4FlagKeys.includes(flagKey) && flagKey !== FEATURE_FLAG.V4_PERSONA_ENABLED;
      if (isV4SubFlag && !v4MasterOn && enabled) {
        toast.error('Ligue V4_PERSONA_ENABLED antes das sub-flags.');
        setSavingFlag('');
        return;
      }
      if (isV4Master && enabled) {
        toast.info('Master V4 ligado. Rollout gradual Q30: 1% → 5% → 25% → 50% → 100%.', {
          duration: 8000,
        });
      }
      await setFeatureFlag(flagKey, enabled, user);
      toast.success(`Flag ${enabled ? 'ativada' : 'desativada'}.`);
      qc.invalidateQueries({ queryKey: ['admin', 'flag-history'] });
    } catch (err) {
      toast.error(err.message || 'Não foi possível atualizar a flag.');
    } finally {
      setSavingFlag('');
    }
  }

  function renderFlagRow([flagKey, meta]) {
    const isOn = Boolean(settings.feature_flags[flagKey]);
    const isSaving = savingFlag === flagKey;
    const switchLabel = isSaving
      ? `Salvando ${meta.label}…`
      : isOn
        ? `Desativar ${meta.label}`
        : `Ativar ${meta.label}`;
    return (
      <div
        key={flagKey}
        className="flex items-start justify-between gap-4 rounded-2xl border border-border p-4 transition-colors hover:bg-secondary/30"
      >
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            {meta.label}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
              isOn
                ? 'bg-primary/15 text-primary'
                : 'bg-muted text-muted-foreground'
            }`}>
              {isOn ? 'On' : 'Off'}
            </span>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{meta.description}</p>
          <code className="mt-1 inline-block rounded bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {flagKey}
          </code>
        </div>
        <Switch
          checked={isOn}
          disabled={isSaving}
          onCheckedChange={(checked) => handleToggle(flagKey, checked === true)}
          aria-label={switchLabel}
        />
      </div>
    );
  }

  return (
    <div className={successClass}>
      <PageHero
        eyebrow="Admin"
        title="Flags de atualizações"
        description="Recursos aditivos da plataforma. Todas as flags nascem desligadas — desligar devolve o comportamento padrão sem migração de dados."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <Sparkles className="h-3.5 w-3.5" /> {onCount} ativa{onCount === 1 ? '' : 's'} de {flags.length}
          </span>
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin" className="inline-flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao painel
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/configuracoes" className="inline-flex items-center gap-2">
            <Flag className="h-4 w-4" /> Outras configurações
          </Link>
        </Button>
      </div>

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" /> Feature flags
          </h3>
          <p className="arena-section-card-description">
            Cada flag é um interruptor isolado — ative apenas quando a feature
            estiver pronta para todos os usuários. Nenhuma alteração no banco é
            necessária para ligar ou desligar.
          </p>
        </div>
        <div className="arena-section-card-body space-y-3">
          {flags
            .filter(([key]) => !v4FlagKeys.includes(key))
            .map(renderFlagRow)}
        </div>
      </section>

      {/* ─── V4 PERSONAS (D-PERSONA-FLAG-GRADUAL, Q30) ──────────────────────
          Seção dedicada com banner de rollout gradual. Ver
          docs/PLAN_PERSONAS_V4.md v1.1 e
          docs/AI_GUIDE/19-V4-PERSONAS-INDEX.md.
      ──────────────────────────────────────────────────────────────────── */}
      <section className="arena-section-card" data-testid="v4-personas-section">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> V4 Personas
            <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {v4OnCount}/{v4Flags.length} ativas
            </span>
          </h3>
          <p className="arena-section-card-description">
            Sistema de 6 personas dedicadas (Adotante, Doador, Membro de
            Abrigo, Membro de Comunidade, Voluntário, Platform Admin).
            Master switch + 6 personas + 4 features. Ver
            {' '}<code className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">docs/AI_GUIDE/19-V4-PERSONAS-INDEX.md</code>.
          </p>
        </div>
        <div className="arena-section-card-body space-y-3">
          {/* Banner de rollout (Q30) — sempre visível */}
          <div
            className="flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4"
            role="note"
            aria-label="Aviso de rollout gradual V4 Personas"
          >
            <Sparkles className="h-5 w-5 shrink-0 text-violet-700" aria-hidden="true" />
            <div className="space-y-1 text-sm text-violet-900">
              <p className="font-bold">Rollout gradual — D-PERSONA-FLAG-GRADUAL (Q30)</p>
              <p className="text-xs leading-5 text-violet-800">
                Ative <strong>V4_PERSONA_ENABLED</strong> em
                <strong> 1%</strong> dos usuários (canary) e monitore
                1-2 dias antes de subir para
                {' '}<strong>5% → 25% → 50% → 100%</strong>.
                Use o <em>Rollout Conditions</em> no Firebase Remote Config
                para limitar por email/UID.
                As sub-flags só funcionam se o master estiver ON.
              </p>
            </div>
          </div>

          {v4Flags.map(renderFlagRow)}
        </div>
      </section>

      {/* TASK-167: histórico de mudanças (quem ligou, quando, de→para, motivo) */}
      <section className="arena-section-card">
        <div className="arena-section-card-body p-5">
          <h3 className="mb-3 text-sm font-bold">Histórico de mudanças</h3>
          {flagHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mudança registrada ainda.</p>
          ) : (
            <ol className="space-y-2" aria-label="Histórico de mudanças de feature flags">
              {flagHistory.map((h) => {
                const date = h.created_at_ms ? new Date(h.created_at_ms) : null;
                const dateISO = date ? date.toISOString() : '';
                return (
                  <li key={h.id} className="rounded-lg border border-border p-2.5 text-xs">
                    <span className="font-semibold">{h.details?.flag}</span>{' '}
                    <span className="text-muted-foreground">
                      {String(h.details?.from_value ?? '—')} → {String(h.details?.to_value ?? h.details?.enabled)}
                    </span>
                    {' · '}
                    <span className="text-muted-foreground">{h.actor_name || h.actor_id}</span>
                    {' · '}
                    {date && (
                      <time dateTime={dateISO} className="text-muted-foreground">
                        {date.toLocaleString('pt-BR')}
                      </time>
                    )}
                    {h.details?.reason && (
                      <p className="mt-1 text-muted-foreground">Motivo: {h.details.reason}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Flag nova? Cadastre em <code className="rounded bg-secondary px-1.5 py-0.5">src/core/featureFlags.js</code>{' '}
        (enum + <code className="rounded bg-secondary px-1.5 py-0.5">FEATURE_FLAG_META</code>) e ela aparece aqui
        automaticamente, desligada por padrão. V4 Personas: 11 flags agrupadas
        em seção dedicada, com aviso de rollout gradual (Q30).
      </p>
    </div>
  );
}
