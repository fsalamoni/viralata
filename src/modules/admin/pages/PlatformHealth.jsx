/**
 * @fileoverview Painel admin master: saúde da plataforma (Fase 21).
 *
 * Mostra:
 * - Saúde (latência Firestore, error rate, invocations de
 *   functions, uptime de hosting).
 * - Custos (billing manual ou Billing API no futuro).
 * - Capacidade (tamanho das collections, queries lentas, índices
 *   faltando).
 * - Movimentação (audit log centralizado — reusa AuditLogTable).
 *
 * Rota: /admin/saude
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Activity, DollarSign, Database, ScrollText, RefreshCw, Loader2 } from 'lucide-react';
import {
  getHealthSnapshot,
  getCollectionStats,
  getMissingIndexes,
  getSlowQueries,
  getBillingSummary,
  upsertBillingSummary,
} from '../services/platformHealthService';
import { AuditLogTable } from '@/components/AuditLogTable';
import { toast } from 'sonner';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

export default function PlatformHealth() {
  const { isPlatformAdmin, user } = useAuth();
  const [health, setHealth] = useState(null);
  const [collections, setCollections] = useState([]);
  const [missing, setMissing] = useState({ missing_count: 0, fingerprints: [] });
  const [slow, setSlow] = useState([]);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingDraft, setBillingDraft] = useState({});
  const wrapperClass = useArenaPageClasses('arena-page mx-auto max-w-6xl space-y-6 px-4 py-6');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    void loadAll();
  }, [isPlatformAdmin]);

  async function loadAll() {
    setLoading(true);
    try {
      const [h, c, m, s] = await Promise.all([
        getHealthSnapshot(),
        getCollectionStats({ limit: 20 }),
        getMissingIndexes(),
        getSlowQueries({ periodDays: 7, limit: 10 }),
      ]);
      setHealth(h);
      setCollections(c);
      setMissing(m);
      setSlow(s);
      const period = monthPeriod(new Date());
      const b = await getBillingSummary(period);
      setBilling(b);
      setBillingDraft({
        reads: b.reads,
        writes: b.writes,
        deletes: b.deletes,
        storage_gb: b.storage_gb,
        bandwidth_gb: b.bandwidth_gb,
        estimated_cost_usd: b.estimated_cost_usd,
      });
    } catch (err) {
      toast.error('Erro ao carregar painel: ' + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  if (!isPlatformAdmin) return <div className="text-center py-16 text-muted-foreground">Acesso restrito.</div>;

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · Plataforma"
        title="Saúde da Plataforma"
        description="Painel admin master: saúde, custos Firebase, capacidade, movimentação e alertas. Apenas o platform_admin master enxerga esta aba."
        actions={(
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadAll}
            disabled={loading}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
        )}
      />

      <Tabs defaultValue="health">
        <TabsList className="arena-admin-tabs grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="health"><Activity className="h-4 w-4 mr-1" /> Saúde</TabsTrigger>
          <TabsTrigger value="costs"><DollarSign className="h-4 w-4 mr-1" /> Custos</TabsTrigger>
          <TabsTrigger value="capacity"><Database className="h-4 w-4 mr-1" /> Capacidade</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="h-4 w-4 mr-1" /> Movimentação</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {health ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Latência p50" value={`${health.firestore.latency_p50}ms`} />
                <StatCard label="Latência p99" value={`${health.firestore.latency_p99}ms`} />
                <StatCard label="Error rate" value={`${(health.firestore.error_rate * 100).toFixed(2)}%`} />
                <StatCard label="Uptime 30d" value={`${health.hosting.uptime_30d}%`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="arena-section-card">
                  <div className="arena-section-card-header">
                    <h3 className="arena-section-card-title">Auth (24h)</h3>
                    <p className="arena-section-card-description">Usuários ativos e signups nas últimas 24h</p>
                  </div>
                  <div className="arena-section-card-body">
                    <p className="text-2xl font-semibold text-foreground">{health.auth.active_users_24h}</p>
                    <p className="text-xs text-muted-foreground">usuários ativos</p>
                    <p className="text-2xl font-semibold text-foreground mt-3">{health.auth.signups_24h}</p>
                    <p className="text-xs text-muted-foreground">novos signups</p>
                    <p className="text-xs text-muted-foreground mt-3">Total acumulado: {health.auth.total_users}</p>
                  </div>
                </section>
                <section className="arena-section-card">
                  <div className="arena-section-card-header">
                    <h3 className="arena-section-card-title">Functions (24h)</h3>
                    <p className="arena-section-card-description">Invocations e erros das Cloud Functions</p>
                  </div>
                  <div className="arena-section-card-body">
                    <p className="text-2xl font-semibold text-foreground">{health.functions.invocations_24h}</p>
                    <p className="text-xs text-muted-foreground">invocations</p>
                    <p className="text-2xl font-semibold text-foreground mt-3">{health.functions.errors_24h}</p>
                    <p className="text-xs text-muted-foreground">erros</p>
                    <p className="text-xs text-muted-foreground mt-3">
                      Última coleta: {new Date(health.generated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </section>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {loading ? 'Carregando...' : 'Sem dados ainda — a Cloud Function `platformHealthCron` roda a cada 1h.'}
            </p>
          )}
        </TabsContent>

        <TabsContent value="costs" className="space-y-4">
          <section className="arena-section-card">
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title">Billing do mês atual</h3>
              <p className="arena-section-card-description">
                Marque manualmente o uso (Fase 21 MVP). Integração com Firebase Billing API no roadmap.
              </p>
            </div>
            <div className="arena-section-card-body space-y-4">
              {billing ? (
                <>
                  <p className="text-xs text-muted-foreground">
                    Período: {new Date(billing.period.start).toLocaleDateString('pt-BR')} → {new Date(billing.period.end).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <NumberField label="Reads" value={billingDraft.reads} onChange={(v) => setBillingDraft({ ...billingDraft, reads: v })} />
                    <NumberField label="Writes" value={billingDraft.writes} onChange={(v) => setBillingDraft({ ...billingDraft, writes: v })} />
                    <NumberField label="Deletes" value={billingDraft.deletes} onChange={(v) => setBillingDraft({ ...billingDraft, deletes: v })} />
                    <NumberField label="Storage (GB)" step="0.01" value={billingDraft.storage_gb} onChange={(v) => setBillingDraft({ ...billingDraft, storage_gb: v })} />
                    <NumberField label="Bandwidth (GB)" step="0.01" value={billingDraft.bandwidth_gb} onChange={(v) => setBillingDraft({ ...billingDraft, bandwidth_gb: v })} />
                    <NumberField label="Custo estimado (USD)" step="0.01" value={billingDraft.estimated_cost_usd} onChange={(v) => setBillingDraft({ ...billingDraft, estimated_cost_usd: v })} />
                  </div>
                  <Button
                    type="button"
                    onClick={async () => {
                      try {
                        const period = monthPeriod(new Date());
                        await upsertBillingSummary(period, billingDraft, user);
                        toast.success('Resumo de billing atualizado.');
                        const b = await getBillingSummary(period);
                        setBilling(b);
                      } catch (err) {
                        toast.error('Erro ao salvar: ' + (err?.message || err));
                      }
                    }}
                  >
                    Salvar resumo do mês
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground py-4">Carregando billing...</p>
              )}
            </div>
          </section>
        </TabsContent>

        <TabsContent value="capacity" className="space-y-4">
          <section className="arena-section-card">
            <div className="arena-section-card-header">
              <h3 className="arena-section-card-title">Tamanho das collections</h3>
              <p className="arena-section-card-description">
                Contadores via <code>count()</code> do Firestore. Coleções com 0 docs aparecem mesmo assim.
              </p>
            </div>
            <div className="arena-section-card-body">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {collections.map((c) => (
                  <div key={c.name} className="rounded-md border border-border bg-secondary/40 p-2">
                    <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                    <p className="text-lg font-semibold text-foreground">{c.count.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
                {collections.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 col-span-full">Sem dados de contagem ainda.</p>
                )}
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <section className="arena-section-card">
              <div className="arena-section-card-header">
                <h3 className="arena-section-card-title">Queries lentas (7d)</h3>
                <p className="arena-section-card-description">Top 10 queries mais lentas registradas</p>
              </div>
              <div className="arena-section-card-body">
                {slow.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">Sem queries lentas registradas.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {slow.map((q, i) => (
                      <li key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                        <span className="font-mono truncate">{q.fingerprint}</span>
                        <Badge variant="secondary" className="text-[10px]">{q.latency_ms}ms</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <section className="arena-section-card">
              <div className="arena-section-card-header">
                <h3 className="arena-section-card-title">Heurística de índices faltando</h3>
                <p className="arena-section-card-description">
                  Fingerprints de queries lentas (heurística simples — Fase 21 MVP).
                </p>
              </div>
              <div className="arena-section-card-body">
                {missing.fingerprints.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    Sem fingerprints registrados. Integração completa com Firebase Console é roadmap.
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {missing.fingerprints.map((f, i) => (
                      <li key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                        <span className="font-mono truncate">{f.fingerprint}</span>
                        <Badge variant="secondary" className="text-[10px]">×{f.count}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable
            title="Movimentação da plataforma"
            description="Audit log centralizado: tudo que aconteceu na plataforma, em ordem cronológica."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-body pt-6 text-center">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange, step = '1' }) {
  return (
    <label className="space-y-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      <Input
        type="number"
        step={step}
        value={value ?? 0}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function monthPeriod(now) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}
