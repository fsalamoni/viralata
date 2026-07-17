import { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield } from 'lucide-react';
import { fetchMetricsData, groupByMonth, groupByDay, groupByField } from '../services/metricsService';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

/**
 * AdminMetrics — painel de métricas da plataforma (TASK-172).
 * Ver TASK-858: auditoria DS_V2, loading state, access denied.
 */
export default function AdminMetrics() {
  const { isPlatformAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ pets: [], users: [], reports: [] });
  // TASK-172: janela temporal dos gráficos (30/90/365 dias).
  const [rangeDays, setRangeDays] = useState(365);

  // Hooks de classe dos wrappers. Devem ficar ANTES dos early-returns.
  const deniedClass = useArenaPageClasses('arena-page mx-auto max-w-3xl py-16 text-center');
  const successClass = useArenaPageClasses('arena-page mx-auto max-w-5xl space-y-6 px-4 py-6');
  const loadingClass = useArenaPageClasses('arena-page max-w-5xl mx-auto px-4 py-16');

  useEffect(() => {
    if (!isPlatformAdmin) return;
    fetchMetricsData().then(setData).finally(() => setLoading(false));
  }, [isPlatformAdmin]);

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

  if (loading) {
    return (
      <div className={loadingClass}>
        <Skeleton className="h-8 w-64 rounded-lg mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // 30/90 dias → agregação diária; 365 dias → mensal (12 buckets).
  const groupSeries = (docs, field) => (rangeDays === 365
    ? groupByMonth(docs, field, 12)
    : groupByDay(docs, field, rangeDays));
  const adoptionsByMonth = groupSeries(data.pets.filter((p) => p.status === 'adopted'), 'adopted_at');
  const usersByMonth = groupSeries(data.users, 'created_at');
  const reportsByMonth = groupSeries(data.reports, 'created_at');
  const petsByState = groupByField(data.pets, 'state');

  return (
    <div className={successClass}>
      <PageHero
        eyebrow="Admin · Métricas"
        title="Métricas da Plataforma"
        description="Visão geral do crescimento: pets cadastrados, adoções concluídas, usuários e denúncias. Cada card abre o detalhe."
      />

      {/* TASK-172: seletor de janela temporal */}
      <div className="flex justify-end gap-2" role="group" aria-label="Janela temporal dos gráficos">
        {[[30, '30 dias'], [90, '90 dias'], [365, '12 meses']].map(([days, label]) => (
          <Button
            key={days}
            size="sm"
            variant={rangeDays === days ? 'default' : 'outline'}
            onClick={() => setRangeDays(days)}
            aria-pressed={rangeDays === days}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Pets cadastrados" value={data.pets.length} />
        <SummaryCard label="Adoções concluídas" value={data.pets.filter((p) => p.status === 'adopted').length} />
        <SummaryCard label="Usuários" value={data.users.length} />
        <SummaryCard label="Denúncias" value={data.reports.length} />
      </div>

      <section className="arena-section-card">
        <div className="arena-section-card-header"><h3 className="arena-section-card-title">Adoções por mês</h3></div>
        <div className="arena-section-card-body h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={adoptionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Adoções" fill="#c55026" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="arena-section-card">
        <div className="arena-section-card-header"><h3 className="arena-section-card-title">Crescimento de usuários</h3></div>
        <div className="arena-section-card-body h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usersByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Novos usuários" stroke="#607246" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="arena-section-card">
        <div className="arena-section-card-header"><h3 className="arena-section-card-title">Pets por estado</h3></div>
        <div className="arena-section-card-body h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={petsByState} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
              <Tooltip />
              <Bar dataKey="count" name="Pets" fill="#f1b527" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="arena-section-card">
        <div className="arena-section-card-header"><h3 className="arena-section-card-title">Denúncias por mês</h3></div>
        <div className="arena-section-card-body h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportsByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Denúncias" fill="#dd382c" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <section className="arena-section-card">
      <div className="arena-section-card-body pt-6 text-center">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{label}</p>
      </div>
    </section>
  );
}
