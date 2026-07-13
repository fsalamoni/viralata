/**
 * @fileoverview AdminMockData — painel para carregar e limpar dados de demo.
 *
 * Restrito ao platform_admin (gate via `AdminRoute`) e gated pela flag
 * `MOCK_DATA_PANEL` (página some do menu quando desligada).
 *
 * Comportamento:
 *  - "Carregar dados demo" chama `mockDataService.loadAll()` (idempotente).
 *  - "Limpar dados demo" chama `mockDataService.clearAll()` (só remove docs
 *    marcados com `_mock: true`).
 *  - Status exibe contagem por coleção, atualizado após cada operação.
 *  - Confirmação via dialog antes de qualquer ação destrutiva.
 *  - Erros de coleções imutáveis (audit_logs) são reportados, não derrubam
 *    o restante da limpeza.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';
import { logger } from '@/core/lib/logger';
import {
  loadAll, clearAll, getStatus, getMockSummary, getMockVersion,
} from '@/mocks/mockDataService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import {
  Database, Trash2, RefreshCw, Shield, Sparkles, ArrowLeft,
  CheckCircle2, AlertTriangle, DatabaseZap, BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

const FLAG_KEY = FEATURE_FLAG.MOCK_DATA_PANEL;

const CONFIRM_PHRASE = 'APAGAR DADOS DEMO';

function StatTile({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'bg-secondary/40 text-foreground',
    success: 'bg-emerald-500/10 text-emerald-700',
    warn: 'bg-amber-500/10 text-amber-700',
    danger: 'bg-rose-500/10 text-rose-700',
  }[tone] || 'bg-secondary/40 text-foreground';
  return (
    <div className={`rounded-2xl border border-border px-4 py-3 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wider opacity-70">{label}</div>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function AdminMockData() {
  const { isPlatformAdmin, user } = useAuth();
  const flagEnabled = useFeatureFlag(FLAG_KEY);
  const wrapperClass = useArenaPageClasses('arena-page mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6');

  const [summary] = useState(() => getMockSummary());
  const [version] = useState(() => getMockVersion());
  const [status, setStatus] = useState({ byCollection: {}, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // 'load' | 'clear' | null
  const [phase, setPhase] = useState(null); // current collection being written
  const [confirmText, setConfirmText] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(null); // 'load' | 'clear' | null
  const [lastResult, setLastResult] = useState(null);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getStatus();
      setStatus(s);
    } catch (err) {
      logger.error('AdminMockData.getStatus failed:', err);
      toast.error('Não foi possível consultar o status dos dados demo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPlatformAdmin) refreshStatus();
  }, [isPlatformAdmin, refreshStatus]);

  const totalDocs = useMemo(
    () => summary.reduce((acc, s) => acc + s.count, 0),
    [summary]
  );

  async function performLoad() {
    setBusy('load');
    setPhase('Iniciando...');
    try {
      const result = await loadAll({
        realUid: user?.uid,
        realUserName: user?.displayName || user?.email || 'Admin',
        onProgress: (name, current, total) => setPhase(`${name} (${current}/${total})`),
      });
      setLastResult({ op: 'load', at: new Date(), ...result });
      toast.success(
        result.errors.length
          ? `Dados carregados com ${result.errors.length} aviso(s).`
          : `Dados demo carregados — ${result.total} documentos.`
      );
      await refreshStatus();
    } catch (err) {
      toast.error(err?.message || 'Falha ao carregar dados demo.');
    } finally {
      setBusy(null);
      setPhase(null);
      setConfirmOpen(null);
      setConfirmText('');
    }
  }

  async function performClear() {
    setBusy('clear');
    setPhase('Iniciando...');
    try {
      const result = await clearAll({
        realUid: user?.uid,
        realUserName: user?.displayName || user?.email || 'Admin',
        onProgress: (name, current, total) => setPhase(`${name} (${current}/${total})`),
      });
      setLastResult({ op: 'clear', at: new Date(), ...result });
      toast.success(
        result.errors.length
          ? `Limpeza concluída com ${result.errors.length} aviso(s).`
          : `Dados demo removidos — ${result.total} documentos apagados.`
      );
      await refreshStatus();
    } catch (err) {
      toast.error(err?.message || 'Falha ao limpar dados demo.');
    } finally {
      setBusy(null);
      setPhase(null);
      setConfirmOpen(null);
      setConfirmText('');
    }
  }

  // Gating
  if (!isPlatformAdmin) {
    return (
      <div className="arena-page mx-auto max-w-3xl py-16 text-center">
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

  if (!flagEnabled) {
    return (
      <div className="arena-page mx-auto max-w-3xl py-16 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">Feature flag desligada</p>
        <p className="mt-1 text-sm text-muted-foreground">
          A flag <code className="rounded bg-secondary px-1.5 py-0.5">{FLAG_KEY}</code> está desligada. Ligue-a em
          <Link to="/admin/flags" className="ml-1 underline">/admin/flags</Link> para usar este painel.
        </p>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <PageHero
        eyebrow="Admin · dados demo"
        title="Dados mocados (mock data)"
        description="Painel para materializar e remover o conjunto de dados de demonstração que vive em src/mocks/. Os documentos são marcados com _mock: true — a limpeza é precisa e não toca em nada criado por usuários reais."
        actions={(
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-orange-50/85">
            <DatabaseZap className="h-3.5 w-3.5" /> v{version}
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
          <Link to="/admin/flags" className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Configurar flag
          </Link>
        </Button>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Coleções" value={summary.length} />
        <StatTile label="Docs no pacote" value={totalDocs} tone="default" />
        <StatTile
          label="Em produção agora"
          value={loading ? '…' : status.total}
          tone={status.total > 0 ? 'success' : 'default'}
        />
        <StatTile
          label="Flag MOCK_DATA_PANEL"
          value={flagEnabled ? 'ON' : 'OFF'}
          tone={flagEnabled ? 'success' : 'warn'}
        />
      </div>

      {/* Banner de Cloud Function indisponível (CORS/403/deploy pendente).
          Mostra a dica de troubleshooting ao dono da plataforma sem
          ficar preso no toast efêmero. */}
      {status._error === 'MOCK_FN_UNREACHABLE' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">Cloud Function de mock indisponível</p>
            <p className="text-amber-900/80">
              <code className="rounded bg-white/60 px-1.5 py-0.5 text-[12px]">getMockStatus</code> /
              <code className="ml-1 rounded bg-white/60 px-1.5 py-0.5 text-[12px]">loadMockData</code> /
              <code className="ml-1 rounded bg-white/60 px-1.5 py-0.5 text-[12px]">clearMockData</code> não responderam.
              Quase sempre significa que o último deploy falhou (CI em vermelho) ou a função foi
              removida. Verifique{' '}
              <a
                className="underline"
                href="https://github.com/fsalamoni/viralata/actions/workflows/deploy.yml"
                target="_blank"
                rel="noreferrer"
              >
                o workflow Deploy Viralata → Firebase Hosting
              </a>{' '}
              e, se preciso, rode o deploy manualmente com{' '}
              <code className="rounded bg-white/60 px-1.5 py-0.5 text-[12px]">firebase deploy --only functions --project viralata-4cf0b</code>.
            </p>
          </div>
        </div>
      )}

      {/* Action cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border-emerald-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-emerald-600" />
              Carregar dados demo
            </CardTitle>
            <CardDescription>
              Cria/atualiza {totalDocs} documentos em {summary.length} coleções. Idempotente —
              rodar novamente apenas sobrescreve os mesmos IDs determinísticos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• 10 perfis de usuários (com perfis públicos e diretório)</li>
              <li>• 3 ONGs e 2 comunidades editoriais com membros, eventos, mural, fórum, doações, prestação de contas</li>
              <li>• 12 pets (cães, gatos, coelho) com interesses, adoções concluídas e avaliações</li>
              <li>• Chat (2 conversas + 11 mensagens), notificações, audit log, denúncias</li>
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => setConfirmOpen('load')}
                disabled={busy !== null}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {busy === 'load' ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Carregando…</>
                ) : (
                  <><Database className="mr-2 h-4 w-4" /> Carregar dados demo</>
                )}
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/feed">Ver feed</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-rose-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trash2 className="h-4 w-4 text-rose-600" />
              Limpar dados demo
            </CardTitle>
            <CardDescription>
              Remove apenas documentos com <code className="rounded bg-secondary px-1.5 py-0.5">_mock: true</code>.
              Coleções imutáveis (audit_logs) podem falhar — o relatório mostra o que ficou.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Segurança: usuários reais não são afetados (filtro por tag)</li>
              <li>• Relatório por coleção: {`{ coleção: docs removidos }`}</li>
              <li>• Audit log do admin recebe a ação <code className="rounded bg-secondary px-1.5 py-0.5">platform_settings_updated</code> com tag <code className="rounded bg-secondary px-1.5 py-0.5">_mock</code></li>
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmOpen('clear')}
                disabled={busy !== null}
              >
                {busy === 'clear' ? (
                  <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Limpando…</>
                ) : (
                  <><Trash2 className="mr-2 h-4 w-4" /> Limpar dados demo</>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={refreshStatus}
                disabled={busy !== null || loading}
              >
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status por coleção */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-primary" />
            Status por coleção
          </CardTitle>
          <CardDescription>
            Documentos com <code className="rounded bg-secondary px-1.5 py-0.5">_mock: true</code> atualmente
            no Firestore. <strong>{status.total}</strong> no total, de <strong>{totalDocs}</strong> possíveis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((s) => {
              const loaded = status.byCollection[s.collection] ?? 0;
              const expected = s.count;
              const ratio = expected ? loaded / expected : 0;
              const tone =
                loaded === expected ? 'success'
                : loaded === 0 ? 'default'
                : 'warn';
              return (
                <div key={s.collection} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-foreground">{s.label}</span>
                      {s.isSubcollection && (
                        <Badge variant="outline" className="text-[10px]">sub</Badge>
                      )}
                    </div>
                    <code className="mt-0.5 text-[10px] text-muted-foreground">{s.collection}</code>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1.5 text-sm tabular-nums">
                      {loaded === -1 ? (
                        <span className="text-rose-600">erro</span>
                      ) : (
                        <>
                          <span className={ratio === 1 ? 'text-emerald-600' : ratio === 0 ? 'text-muted-foreground' : 'text-amber-600'}>
                            {loaded}
                          </span>
                          <span className="text-muted-foreground">/{expected}</span>
                        </>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {ratio === 1 ? 'completo' : ratio === 0 ? 'vazio' : 'parcial'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resultado da última operação */}
      {lastResult && (
        <Card className={lastResult.ok ? 'border-emerald-500/30' : 'border-amber-500/30'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {lastResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              )}
              Última operação: {lastResult.op === 'load' ? 'carga' : 'limpeza'} · {lastResult.at?.toLocaleString?.('pt-BR') || ''}
            </CardTitle>
            <CardDescription>
              {lastResult.errors.length === 0
                ? `Concluído sem erros — ${lastResult.total} documentos processados.`
                : `Concluído com ${lastResult.errors.length} aviso(s) — verifique abaixo.`}
            </CardDescription>
          </CardHeader>
          {lastResult.errors.length > 0 && (
            <CardContent>
              <ul className="space-y-1 text-xs">
                {lastResult.errors.map((e, idx) => (
                  <li key={idx} className="rounded-lg bg-rose-500/5 px-2.5 py-1.5 text-rose-700">
                    <code className="font-semibold">{e.collection}</code>: {e.error}
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Phase indicator (enquanto busy) */}
      {busy && phase && (
        <div className="rounded-2xl border border-border bg-secondary/30 px-4 py-2.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {busy === 'load' ? 'Carregando' : 'Limpando'}: {phase}
          </span>
        </div>
      )}

      {/* Dialog de confirmação para LIMPAR (palavra-chave) */}
      {confirmOpen === 'clear' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Apagar dados demo?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta ação remove todos os documentos marcados com <code className="rounded bg-secondary px-1.5 py-0.5">_mock: true</code>.
              Usuários reais não são afetados. Para confirmar, digite a frase abaixo:
            </p>
            <p className="mt-3 rounded-lg border border-border bg-secondary/30 px-2.5 py-1.5 text-center font-mono text-xs text-foreground">
              {CONFIRM_PHRASE}
            </p>
            <Input
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Digite a frase de confirmação"
              className="mt-2"
            />
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => { setConfirmOpen(null); setConfirmText(''); }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={performClear}
                disabled={confirmText !== CONFIRM_PHRASE || busy !== null}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Confirmar limpeza
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog de confirmação simples para CARREGAR */}
      {confirmOpen === 'load' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/30 bg-white p-6 shadow-2xl">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Carregar dados demo?</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Vai criar ou atualizar <strong>{totalDocs}</strong> documentos em <strong>{summary.length}</strong> coleções.
              Operação idempotente (re-rodar sobrescreve).
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirmOpen(null)}>Cancelar</Button>
              <Button onClick={performLoad} disabled={busy !== null} className="bg-emerald-600 hover:bg-emerald-700">
                <Database className="mr-2 h-4 w-4" /> Confirmar carga
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
