import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { FEATURE_FLAG_META } from '@/core/featureFlags';
import { usePlatformSettings } from '@/core/lib/FeatureFlagsContext';
import { setFeatureFlag, listFeatureFlagHistory, markFlagsMigrationApplied } from '@/core/services/platformSettingsService';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { Flag, Shield, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Página dedicada às feature flags da plataforma.
 * Restrita ao admin master via `AdminRoute` + checagem extra de email
 * em `useAuth().isPlatformAdmin` (apenas `fsalamoni@gmail.com` + role
 * `platform_admin`).
 */
export default function AdminFlags() {
  const { isPlatformAdmin, user } = useAuth();
  const { settings } = usePlatformSettings();
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
  // Evita que o FeatureFlagsProvider rode a migração legado a cada load e
  // documenta que o admin já está gerenciando flags manualmente.
  React.useEffect(() => {
    if (isPlatformAdmin) {
      markFlagsMigrationApplied(user);
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

  const flags = Object.entries(FEATURE_FLAG_META);
  const onCount = flags.filter(([key]) => Boolean(settings.feature_flags[key])).length;

  async function handleToggle(flagKey, enabled) {
    setSavingFlag(flagKey);
    try {
      await setFeatureFlag(flagKey, enabled, user);
      toast.success(`Flag ${enabled ? 'ativada' : 'desativada'}.`);
      qc.invalidateQueries({ queryKey: ['admin', 'flag-history'] });
    } catch (err) {
      toast.error(err.message || 'Não foi possível atualizar a flag.');
    } finally {
      setSavingFlag('');
    }
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Flag className="h-4 w-4 text-primary" /> Feature flags
          </CardTitle>
          <CardDescription>
            Cada flag é um interruptor isolado — ative apenas quando a feature
            estiver pronta para todos os usuários. Nenhuma alteração no banco é
            necessária para ligar ou desligar.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {flags.map(([flagKey, meta]) => {
            const isOn = Boolean(settings.feature_flags[flagKey]);
            const isSaving = savingFlag === flagKey;
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
                  aria-label={`Ativar ou desativar ${meta.label}`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* TASK-167: histórico de mudanças (quem ligou, quando, de→para, motivo) */}
      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-bold">Histórico de mudanças</h3>
          {flagHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mudança registrada ainda.</p>
          ) : (
            <ol className="space-y-2">
              {flagHistory.map((h) => (
                <li key={h.id} className="rounded-lg border border-border p-2.5 text-xs">
                  <span className="font-semibold">{h.details?.flag}</span>{' '}
                  <span className="text-muted-foreground">
                    {String(h.details?.from_value ?? '—')} → {String(h.details?.to_value ?? h.details?.enabled)}
                  </span>
                  {' · '}
                  <span className="text-muted-foreground">{h.actor_name || h.actor_id}</span>
                  {' · '}
                  <span className="text-muted-foreground">
                    {h.created_at_ms ? new Date(h.created_at_ms).toLocaleString('pt-BR') : ''}
                  </span>
                  {h.details?.reason && (
                    <p className="mt-1 text-muted-foreground">Motivo: {h.details.reason}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Flag nova? Cadastre em <code className="rounded bg-secondary px-1.5 py-0.5">src/core/featureFlags.js</code>{' '}
        (enum + <code className="rounded bg-secondary px-1.5 py-0.5">FEATURE_FLAG_META</code>) e ela aparece aqui
        automaticamente, desligada por padrão.
      </p>
    </div>
  );
}
