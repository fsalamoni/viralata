/**
 * @fileoverview Painel admin master: configuração de alertas
 * (Fase 21).
 *
 * - Lista configs existentes em `platform_alert_config/`.
 * - Permite criar / editar / ligar-desligar / deletar.
 * - Mostra histórico de eventos em `platform_alert_events/`.
 *
 * Rota: /admin/alertas
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import {
  ALERT_TYPES,
  ALERT_CHANNELS,
  configureAlert,
  updateAlert,
  setAlertEnabled,
  deleteAlert,
  getAlertConfigs,
  getAlertEvents,
  normalizeAlertConfig,
} from '../services/adminAlertsService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Bell, Trash2, Power, PowerOff, Pencil, Plus, AlertTriangle } from 'lucide-react';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { confirmDialog } from '@/components/ui/confirm-provider';

const TYPE_LABELS = {
  error_rate: 'Error rate (Firestore)',
  latency_p99: 'Latência p99',
  billing: 'Custo estimado (USD)',
  uptime: 'Uptime',
  slow_query: 'Query lenta',
};

const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-900',
  warning: 'bg-amber-100 text-amber-900',
  critical: 'bg-red-100 text-red-900',
};

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-900',
  sent: 'bg-green-100 text-green-900',
  partial: 'bg-amber-100 text-amber-900',
  no_config: 'bg-secondary text-secondary-foreground',
};

const EMPTY_DRAFT = {
  type: 'error_rate',
  channels: ['slack'],
  threshold: 0.05,
  destination: { slack_webhook_url: '', email_to: '' },
  enabled: true,
  description: '',
};

export default function AlertConfigs() {
  const { isPlatformAdmin, user } = useAuth();
  const [configs, setConfigs] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // config existente ou null
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [showForm, setShowForm] = useState(false);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-6 px-4 py-6');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    void loadAll();
  }, [isPlatformAdmin]);

  async function loadAll() {
    setLoading(true);
    try {
      const [cfgs, evs] = await Promise.all([
        getAlertConfigs(),
        getAlertEvents({ limit: 30 }),
      ]);
      setConfigs(cfgs);
      setEvents(evs);
    } catch (err) {
      toast.error('Erro ao carregar: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  function startNew() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
    setShowForm(true);
  }

  function startEdit(cfg) {
    setEditing(cfg);
    setDraft({
      type: cfg.type,
      channels: cfg.channels || ['slack'],
      threshold: cfg.threshold ?? 0,
      destination: cfg.destination || { slack_webhook_url: '', email_to: '' },
      enabled: cfg.enabled !== false,
      description: cfg.description || '',
    });
    setShowForm(true);
  }

  async function handleSave() {
    try {
      normalizeAlertConfig(draft); // throws se inválido
    } catch (err) {
      toast.error(err.message || 'Config inválida.');
      return;
    }
    try {
      if (editing) {
        await updateAlert(editing.id, draft, user);
        toast.success('Configuração atualizada.');
      } else {
        await configureAlert(draft, user);
        toast.success('Configuração criada.');
      }
      setShowForm(false);
      setEditing(null);
      setDraft(EMPTY_DRAFT);
      await loadAll();
    } catch (err) {
      toast.error('Erro: ' + (err?.message || err));
    }
  }

  async function handleToggle(cfg) {
    try {
      await setAlertEnabled(cfg.id, !cfg.enabled);
      await loadAll();
    } catch (err) {
      toast.error('Erro: ' + (err?.message || err));
    }
  }

  async function handleDelete(cfg) {
    if (!(await confirmDialog({ title: `Excluir a configuração de ${TYPE_LABELS[cfg.type] || cfg.type}?` }))) return;
    try {
      await deleteAlert(cfg.id, user);
      toast.success('Configuração excluída.');
      await loadAll();
    } catch (err) {
      toast.error('Erro: ' + (err?.message || err));
    }
  }

  if (!isPlatformAdmin) return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · Alertas"
        title="Configuração de Alertas"
        description="Define thresholds para error rate, latência, billing, uptime, queries lentas. A Cloud Function `adminAlerts` dispara Slack/Email automaticamente."
        actions={(
          <Button
            type="button"
            onClick={startNew}
            className="bg-white/10 text-white border border-white/20 hover:bg-white/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova config
          </Button>
        )}
      />

      {showForm && (
        <section className="arena-section-card">
          <div className="arena-section-card-header">
            <h3 className="arena-section-card-title">
              {editing ? 'Editar configuração' : 'Nova configuração'}
            </h3>
            <p className="arena-section-card-description">
              Threshold e canais. A Cloud Function `adminAlerts` envia via Slack/Email quando o limite é ultrapassado.
            </p>
          </div>
          <div className="arena-section-card-body space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Tipo de alerta</span>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={draft.type}
                  onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                >
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-xs font-medium text-muted-foreground">
                <span>Threshold</span>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.threshold}
                  onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="space-y-1 text-xs font-medium text-muted-foreground">
              <span>Canais</span>
              <div className="flex gap-2 flex-wrap">
                {Object.values(ALERT_CHANNELS).map((c) => (
                  <label
                    key={c}
                    className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={draft.channels.includes(c)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...draft.channels, c]
                          : draft.channels.filter((x) => x !== c);
                        setDraft({ ...draft, channels: next });
                      }}
                    />
                    {c}
                  </label>
                ))}
              </div>
            </div>
            {draft.channels.includes('slack') && (
              <label className="space-y-1 text-xs font-medium text-muted-foreground block">
                <span>Slack webhook URL</span>
                <Input
                  type="url"
                  value={draft.destination.slack_webhook_url}
                  onChange={(e) => setDraft({
                    ...draft,
                    destination: { ...draft.destination, slack_webhook_url: e.target.value },
                  })}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </label>
            )}
            {draft.channels.includes('email') && (
              <label className="space-y-1 text-xs font-medium text-muted-foreground block">
                <span>E-mail(s) destino (separados por vírgula)</span>
                <Input
                  type="text"
                  value={draft.destination.email_to}
                  onChange={(e) => setDraft({
                    ...draft,
                    destination: { ...draft.destination, email_to: e.target.value },
                  })}
                  placeholder="admin@example.com, oncall@example.com"
                />
              </label>
            )}
            <label className="space-y-1 text-xs font-medium text-muted-foreground block">
              <span>Descrição (opcional)</span>
              <Input
                type="text"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                placeholder="Ex.: PagerDuty quando error_rate > 5%"
              />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />
              Ativo
            </label>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setEditing(null); }}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave}>
                {editing ? 'Salvar alterações' : 'Criar config'}
              </Button>
            </div>
          </div>
        </section>
      )}

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Configurações ativas ({configs.length})</h3>
          <p className="arena-section-card-description">
            Cada config dispara quando a métrica ultrapassa o threshold. Auditoria no `audit_logs`.
          </p>
        </div>
        <div className="arena-section-card-body space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : configs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma config ainda. Crie a primeira acima.
            </p>
          ) : (
            configs.map((cfg) => (
              <div
                key={cfg.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
              >
                <Bell className={`h-4 w-4 flex-shrink-0 ${cfg.enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">
                    {TYPE_LABELS[cfg.type] || cfg.type}
                    {cfg.description && (
                      <span className="text-xs text-muted-foreground ml-2">— {cfg.description}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Threshold: <span className="font-mono">{cfg.threshold}</span> ·{' '}
                    Canais: {cfg.channels?.join(', ') || '—'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(cfg)}
                    title={cfg.enabled ? 'Desligar' : 'Ligar'}
                  >
                    {cfg.enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => startEdit(cfg)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(cfg)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Eventos recentes ({events.length})</h3>
          <p className="arena-section-card-description">
            Cada disparo de alerta. Use para auditar e depurar.
          </p>
        </div>
        <div className="arena-section-card-body">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6 flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Nenhum evento registrado. Seria estranho ter configs sem disparos.
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {events.map((evt) => (
                <li
                  key={evt.id}
                  className="flex flex-wrap items-center gap-2 border-b border-border/40 pb-1"
                >
                  <Badge className={SEVERITY_COLORS[evt.severity] || 'bg-secondary text-secondary-foreground'}>
                    {evt.severity || 'warning'}
                  </Badge>
                  <span className="font-mono">{evt.type}</span>
                  <span className="text-muted-foreground">
                    valor: <span className="font-mono">{evt.current_value}</span> · threshold:{' '}
                    <span className="font-mono">{evt.threshold}</span>
                  </span>
                  <Badge className={STATUS_COLORS[evt.status] || 'bg-secondary'}>
                    {evt.status || 'pending'}
                  </Badge>
                  {evt.created_at_ms && (
                    <span className="text-muted-foreground ml-auto">
                      {new Date(evt.created_at_ms).toLocaleString('pt-BR')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
