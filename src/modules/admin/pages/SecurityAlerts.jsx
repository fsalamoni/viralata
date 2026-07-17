/**
 * @fileoverview Página admin: Alertas de Segurança (Fase 20).
 *
 * Lista em tempo real os documentos em `platform_security_alerts`.
 * Restrita a `platform_admin` (via AdminRoute + isPlatformAdmin).
 *
 * A coleção só permite leitura pelo platform_admin (Firestore rules)
 * e escrita apenas pela Cloud Function `triggerSecurityAlert` (Admin
 * SDK). Por isso a UI usa try/catch + degradação graciosa — se o
 * client não tiver permissão, a lista fica vazia com mensagem
 * explicativa, sem quebrar a página.
 *
 * @see src/core/services/securityAlertsService.js
 * @see functions/securityAlerts.js
 */

import { useEffect, useMemo, useState } from 'react';
import { Shield, AlertTriangle, Filter, RotateCw, CheckCircle2 } from 'lucide-react';
import PageHero from '@/components/PageHero';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import {
  ALERT_SEVERITY,
  ALERT_SEVERITY_BADGE_CLASS,
  ALERT_SEVERITY_LABELS,
  ALERT_SOURCE,
  ALERT_TYPE,
  ALERT_TYPE_LABELS,
  formatAlertDate,
  resolveAlert,
  reopenAlert,
  subscribeAlerts,
} from '@/core/services/securityAlertsService';
import { toast } from 'sonner';

const SEVERITY_OPTIONS = [
  { value: '', label: 'Todas as severidades' },
  { value: ALERT_SEVERITY.LOW, label: ALERT_SEVERITY_LABELS[ALERT_SEVERITY.LOW] },
  { value: ALERT_SEVERITY.MEDIUM, label: ALERT_SEVERITY_LABELS[ALERT_SEVERITY.MEDIUM] },
  { value: ALERT_SEVERITY.HIGH, label: ALERT_SEVERITY_LABELS[ALERT_SEVERITY.HIGH] },
  { value: ALERT_SEVERITY.CRITICAL, label: ALERT_SEVERITY_LABELS[ALERT_SEVERITY.CRITICAL] },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  ...Object.values(ALERT_TYPE).map((t) => ({ value: t, label: ALERT_TYPE_LABELS[t] || t })),
];

const SOURCE_LABELS = {
  [ALERT_SOURCE.AUTH]: 'Auth',
  [ALERT_SOURCE.FIRESTORE]: 'Firestore',
  [ALERT_SOURCE.STORAGE]: 'Storage',
  [ALERT_SOURCE.FUNCTIONS]: 'Cloud Functions',
  [ALERT_SOURCE.CLIENT]: 'Client',
};

function filterAlerts(alerts, { severity, type, onlyOpen }) {
  return alerts.filter((a) => {
    if (severity && a.severity !== severity) return false;
    if (type && a.type !== type) return false;
    if (onlyOpen && a.resolved) return false;
    return true;
  });
}

export default function SecurityAlerts() {
  const { isPlatformAdmin, user } = useAuth();
  const flagEnabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_SECURITY_HARDENING);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-6xl space-y-6 px-4 py-6');
  const deniedClass = useArenaPageClasses('arena-page mx-auto max-w-3xl py-16 text-center');

  const [alerts, setAlerts] = useState([]);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    if (!isPlatformAdmin) return undefined;
    const off = subscribeAlerts(
      { max: 100 },
      (next) => {
        setAlerts(next);
        setPermissionDenied(false);
      },
      (err) => {
        const msg = String(err?.message || err);
        if (msg.includes('permission') || msg.includes('permission-denied')) {
          setPermissionDenied(true);
        }
      },
    );
    return off;
  }, [isPlatformAdmin]);

  const visible = useMemo(
    () => filterAlerts(alerts, { severity: severityFilter, type: typeFilter, onlyOpen }),
    [alerts, severityFilter, typeFilter, onlyOpen],
  );

  const stats = useMemo(() => {
    const total = alerts.length;
    const open = alerts.filter((a) => !a.resolved).length;
    const critical = alerts.filter((a) => a.severity === ALERT_SEVERITY.CRITICAL && !a.resolved).length;
    const high = alerts.filter((a) => a.severity === ALERT_SEVERITY.HIGH && !a.resolved).length;
    return { total, open, critical, high };
  }, [alerts]);

  async function handleResolve(alertId) {
    if (!user?.uid) return;
    setBusyId(alertId);
    const ok = await resolveAlert(alertId, user.uid);
    setBusyId('');
    if (ok) toast.success('Alerta marcado como resolvido.');
    else toast.error('Não foi possível resolver — RLS bloqueou a escrita. Use a Cloud Function dedicada.');
  }

  async function handleReopen(alertId) {
    if (!user?.uid) return;
    setBusyId(alertId);
    const ok = await reopenAlert(alertId, user.uid);
    setBusyId('');
    if (ok) toast.success('Alerta reaberto.');
    else toast.error('Não foi possível reabrir — RLS bloqueou a escrita.');
  }

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

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · Segurança"
        title="Alertas de segurança"
        description="Eventos de segurança da plataforma: logins suspeitos, alterações de regras, picos de billing, rate limit atingido. A coleção é escrita apenas pela Cloud Function (Admin SDK) e lida pelo platform_admin."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <AlertTriangle className="h-3.5 w-3.5" /> {stats.open} em aberto · {stats.total} total
          </span>
        )}
      />

      {!flagEnabled && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong>Flag SHELTER_SECURITY_HARDENING desligada.</strong> A coleção
          <code className="mx-1 rounded bg-white/60 px-1">platform_security_alerts</code>
          existe, mas a UI/funcionalidade só é totalmente ativa quando a flag estiver
          ligada. Habilite em <code>/admin/flags</code> para o rollout completo.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} icon={Shield} />
        <StatCard label="Em aberto" value={stats.open} icon={AlertTriangle} accent="amber" />
        <StatCard label="Críticos" value={stats.critical} icon={AlertTriangle} accent="red" />
        <StatCard label="Altos" value={stats.high} icon={AlertTriangle} accent="orange" />
      </div>

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title flex items-center gap-2 text-lg">
            <Filter className="h-4 w-4" /> Filtros
          </h3>
          <p className="arena-section-card-description">
            Refine a lista por severidade, tipo ou status. A assinatura é em tempo real.
          </p>
        </div>
        <div className="arena-section-card-body flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Severidade
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
            Tipo
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={onlyOpen}
              onChange={(e) => setOnlyOpen(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            Somente em aberto
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setSeverityFilter(''); setTypeFilter(''); setOnlyOpen(true); }}
            className="ml-auto"
          >
            <RotateCw className="mr-2 h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </section>

      {permissionDenied && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Sem permissão para ler a coleção. Verifique se sua conta é
          <code className="mx-1 rounded bg-white/60 px-1">platform_admin</code>
          e se a flag <code>SHELTER_SECURITY_HARDENING</code> está ativa.
        </div>
      )}

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            {alerts.length === 0
              ? 'Nenhum alerta registrado até o momento.'
              : 'Nenhum alerta corresponde aos filtros atuais.'}
          </div>
        ) : (
          visible.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              busy={busyId === alert.id}
              onResolve={() => handleResolve(alert.id)}
              onReopen={() => handleReopen(alert.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  const colors = {
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    orange: 'text-orange-700 bg-orange-50 border-orange-200',
  }[accent] || 'text-foreground bg-card border-border';
  return (
    <div className={`rounded-lg border p-4 ${colors}`}>
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide opacity-80">
        <span>{label}</span>
        {Icon && <Icon className="h-4 w-4" />}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function AlertRow({ alert, busy, onResolve, onReopen }) {
  const sevClass = ALERT_SEVERITY_BADGE_CLASS[alert.severity] || ALERT_SEVERITY_BADGE_CLASS[ALERT_SEVERITY.LOW];
  return (
    <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${sevClass} border px-2 py-0.5 text-xs font-semibold`}>
              {(ALERT_SEVERITY_LABELS[alert.severity] || alert.severity).toUpperCase()}
            </Badge>
            <span className="text-sm font-semibold text-foreground">
              {ALERT_TYPE_LABELS[alert.type] || alert.type}
            </span>
            <span className="text-xs text-muted-foreground">
              · {SOURCE_LABELS[alert.source] || alert.source}
            </span>
            {alert.resolved && (
              <Badge className="border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800">
                <CheckCircle2 className="mr-1 inline h-3 w-3" /> Resolvido
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatAlertDate(alert.created_at, alert.created_at_ms)}
            {alert.created_by && ` · por ${alert.created_by}`}
          </p>
          {Object.keys(alert.context || {}).length > 0 && (
            <pre className="overflow-x-auto rounded bg-muted/50 p-2 text-xs leading-snug text-foreground/80">
              {JSON.stringify(alert.context, null, 2)}
            </pre>
          )}
          {alert.resolved && alert.resolved_by && (
            <p className="text-xs text-muted-foreground">
              Resolvido por <strong>{alert.resolved_by}</strong> em{' '}
              {formatAlertDate(alert.resolved_at)}.
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {alert.resolved ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={onReopen}
            >
              Reabrir
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={busy}
              onClick={onResolve}
            >
              {busy ? 'Salvando…' : 'Marcar resolvido'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
