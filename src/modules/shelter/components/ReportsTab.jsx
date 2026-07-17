/**
 * @fileoverview Tab "Relatórios" para o painel admin do abrigo (Fase 16).
 *
 * Renderiza tabs de relatório (Resgates, Adoções, etc.) com charts
 * (recharts) e tabela de dados + botão de export CSV.
 *
 * Gated por feature flag `SHELTER_REPORTS`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 16 (SHELTER_REPORTS)
 */

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, Activity, PawPrint, Users, Scissors, Calendar, ArrowRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useReports } from '@/modules/shelter/hooks/useReports';
import {
  REPORT_TYPE_LABELS,
  PERIOD_LABELS,
  PERIOD_TYPES,
  REPORT_TYPES,
  exportToCSV,
  formatMonthLabel,
} from '@/modules/shelter/domain/operational/reports';
import { exportToPDF } from '@/modules/shelter/domain/operational/reportsPdf';
import { sanitizeRowForReport } from '@/core/services/reportSanitizer';
import { FileText } from 'lucide-react';

// ─── Paleta de cores para charts ──────────────────────────────────────
const CHART_COLORS = {
  rescues: '#f97316',    // orange-500
  adoptions: '#22c55e',  // green-500
  returns: '#ef4444',    // red-500
  fosters: '#3b82f6',    // blue-500
  neutered: '#22c55e',
  notNeutered: '#ef4444',
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Componentes de chart reutilizáveis ────────────────────────────────

function BarChartComponent({ data, bars, xKey = 'label', height = 300 }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {bars.map(({ key, name, color }) => (
          <Bar key={key} dataKey={key} name={name} fill={color} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function LineChartComponent({ data, lines, xKey = 'label', height = 250 }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {lines.map(({ key, name, color }) => (
          <Line key={key} type="monotone" dataKey={key} name={name} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function PieChartComponent({ data, nameKey = 'name', valueKey = 'value', colors, height = 250 }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Sem dados.</p>;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={80}
          dataKey={valueKey}
          nameKey={nameKey}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: '0.75rem',
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Sub-componentes de relatório ─────────────────────────────────────

function StatCard({ label, value, icon: Icon, tone = 'default' }) {
  const toneClass = {
    default: 'border-white/80 bg-white/80',
    success: 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/60',
    danger: 'border-red-200/80 bg-red-50/80 dark:border-red-900/60 dark:bg-red-950/60',
    info: 'border-blue-200/80 bg-blue-50/80 dark:border-blue-900/60 dark:bg-blue-950/60',
  }[tone] || 'border-white/80 bg-white/80';

  return (
    <div className={`arena-stat-card ${toneClass}`}>
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
        <span className="arena-stat-card-label">{label}</span>
      </div>
      <div className="arena-stat-card-value">{value ?? '—'}</div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="arena-section-card-title mb-4">{children}</h3>;
}

function Card({ children, className = '' }) {
  return (
    <div className={`arena-section-card ${className}`}>
      <div className="arena-section-card-body">
        {children}
      </div>
    </div>
  );
}

// ─── Report: Resgates ──────────────────────────────────────────────────
function RescuesReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { total, byMonth = [], bySpecies = {} } = data;
  const speciesData = [
    { name: 'Cães', value: bySpecies.dog || 0, color: CHART_COLORS.rescues },
    { name: 'Gatos', value: bySpecies.cat || 0, color: '#3b82f6' },
    { name: 'Outros', value: bySpecies.other || 0, color: '#a855f7' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total de resgates" value={total} icon={PawPrint} tone="default" />
        <StatCard label="Cães resgatados" value={bySpecies.dog || 0} icon={PawPrint} />
        <StatCard label="Gatos resgatados" value={bySpecies.cat || 0} icon={PawPrint} />
        <StatCard label="Outros" value={bySpecies.other || 0} icon={PawPrint} />
      </div>
      <section className="arena-section-card">
        <SectionTitle>Resgates por mês</SectionTitle>
        <BarChartComponent data={byMonth} bars={[{ key: 'rescues', name: 'Resgates', color: CHART_COLORS.rescues }]} />
      </section>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section className="arena-section-card">
          <SectionTitle>Por espécie</SectionTitle>
          <PieChartComponent
            data={speciesData.filter((s) => s.value > 0)}
            colors={[CHART_COLORS.rescues, '#3b82f6', '#a855f7']}
          />
        </section>
        <section className="arena-section-card">
          <SectionTitle>Resumo</SectionTitle>
          <p className="text-sm text-muted-foreground mb-3">
            No período analisado, foram registrados <strong>{total}</strong> resgates.
          </p>
          {byMonth.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Média mensal: <strong>{Math.round(total / byMonth.length)}</strong> resgates/mes.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Report: Adoções ───────────────────────────────────────────────────
function AdoptionsReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { total, byMonth = [], returnsCount = 0, byStatus = {} } = data;

  const statusData = Object.entries(byStatus).map(([k, v], i) => ({
    name: k.replace(/_/g, ' '),
    value: v,
    color: i === 0 ? CHART_COLORS.adoptions : ['#3b82f6', '#a855f7', '#f97316', '#06b6d4'][i % 4],
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total de adoções" value={total} icon={Activity} tone="success" />
        <StatCard label="Devoluções" value={returnsCount} icon={TrendingDown} tone="danger" />
        <StatCard label="Taxa de devolução" value={total > 0 ? `${Math.round((returnsCount / total) * 100)}%` : '0%'} icon={TrendingDown} />
        <StatCard label="Adoções líquidas" value={total - returnsCount} icon={Activity} />
      </div>
      <section className="arena-section-card">
        <SectionTitle>Adoções por mês</SectionTitle>
        <BarChartComponent
          data={byMonth}
          bars={[
            { key: 'adoptions', name: 'Adoções', color: CHART_COLORS.adoptions },
            { key: 'returns', name: 'Devoluções', color: CHART_COLORS.returns },
          ]}
        />
      </section>
      {statusData.length > 0 && (
        <section className="arena-section-card">
          <SectionTitle>Por status</SectionTitle>
          <PieChartComponent data={statusData} colors={statusData.map((s) => s.color)} />
        </section>
      )}
    </div>
  );
}

// ─── Report: Comparativo ───────────────────────────────────────────────
function ComparativeReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { years = [] } = data;

  return (
    <div className="space-y-6">
      <section className="arena-section-card">
        <SectionTitle>Comparativo anual (resgates vs adoções vs devoluções)</SectionTitle>
        <LineChartComponent
          data={years.map((y) => ({ ...y, label: String(y.year) }))}
          lines={[
            { key: 'rescues', name: 'Resgates', color: CHART_COLORS.rescues },
            { key: 'adoptions', name: 'Adoções', color: CHART_COLORS.adoptions },
            { key: 'returns', name: 'Devoluções', color: CHART_COLORS.returns },
          ]}
          xKey="label"
        />
      </section>
      <div className="overflow-x-auto">
        <div className="arena-table-wrap rounded-2xl border border-white/80 bg-white/80 shadow-[0_14px_34px_-28px_hsl(20_40%_20%/0.4)] backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/40">
                <th className="py-2.5 pr-4 text-left text-xs font-semibold text-muted-foreground">Ano</th>
                <th className="py-2.5 pr-4 text-right text-xs font-semibold text-muted-foreground">Resgates</th>
                <th className="py-2.5 pr-4 text-right text-xs font-semibold text-muted-foreground">Adoções</th>
                <th className="py-2.5 pr-4 text-right text-xs font-semibold text-muted-foreground">Devoluções</th>
                <th className="py-2.5 pr-4 text-right text-xs font-semibold text-muted-foreground">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                  <td className="py-2.5 pr-4 font-semibold">{y.year}</td>
                  <td className="py-2.5 pr-4 text-right">{y.rescues ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right text-emerald-600 dark:text-emerald-400">{y.adoptions ?? 0}</td>
                  <td className="py-2.5 pr-4 text-right text-red-500">{y.returns ?? 0}</td>
                  <td className={`py-2.5 pr-4 text-right font-bold ${y.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                    {y.balance >= 0 ? `+${y.balance}` : y.balance}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Report: Saldo Mensal ──────────────────────────────────────────────
function BalanceReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { months = [], totalIntake, totalAdoptions, totalReturns, netBalance } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total de entradas" value={totalIntake} icon={ArrowRight} tone="default" />
        <StatCard label="Adoções" value={totalAdoptions} icon={Activity} tone="success" />
        <StatCard label="Devoluções" value={totalReturns} icon={TrendingDown} tone="danger" />
        <StatCard
          label="Saldo líquido"
          value={netBalance >= 0 ? `+${netBalance}` : netBalance}
          icon={netBalance >= 0 ? TrendingUp : TrendingDown}
          tone={netBalance >= 0 ? 'success' : 'danger'}
        />
      </div>
      <section className="arena-section-card">
        <SectionTitle>Saldo mensal (entradas – saídas)</SectionTitle>
        <BarChartComponent
          data={months}
          bars={[
            { key: 'intake', name: 'Entradas', color: CHART_COLORS.rescues },
            { key: 'adoptions', name: 'Adoções', color: CHART_COLORS.adoptions },
            { key: 'returns', name: 'Devoluções', color: CHART_COLORS.returns },
          ]}
        />
      </section>
    </div>
  );
}

// ─── Report: Devoluções ───────────────────────────────────────────────
function ReturnsReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { total, byMonth = [], byReason = {}, rate } = data;

  const reasonData = Object.entries(byReason)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, value], i) => ({
      name,
      value,
      color: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'][i % 8],
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total de devoluções" value={total} icon={TrendingDown} tone="danger" />
        <StatCard label="Taxa de devolução" value={rate != null ? `${Math.round(rate * 100)}%` : '—'} icon={TrendingDown} />
        <StatCard label="Motivos registrados" value={Object.keys(byReason).length} icon={Activity} />
      </div>
      <section className="arena-section-card">
        <SectionTitle>Devoluções por mês</SectionTitle>
        <BarChartComponent data={byMonth} bars={[{ key: 'count', name: 'Devoluções', color: CHART_COLORS.returns }]} />
      </section>
      {reasonData.length > 0 && (
        <section className="arena-section-card">
          <SectionTitle>Por motivo</SectionTitle>
          <PieChartComponent data={reasonData} colors={reasonData.map((r) => r.color)} />
        </section>
      )}
    </div>
  );
}

// ─── Report: Tempo até adoção ─────────────────────────────────────────
function TimeToAdoptionReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { averageDays, medianDays, byMonth = [] } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Tempo médio" value={`${averageDays} dias`} icon={Calendar} />
        <StatCard label="Mediana" value={`${medianDays} dias`} icon={Calendar} />
        <StatCard
          label="Tempo médio"
          value={averageDays > 0 ? `${Math.round(averageDays / 30)} meses` : '—'}
          icon={Calendar}
        />
      </div>
      <section className="arena-section-card">
        <SectionTitle>Tempo médio até adoção por mês</SectionTitle>
        <LineChartComponent
          data={byMonth}
          lines={[{ key: 'averageDays', name: 'Dias até adoção', color: CHART_COLORS.adoptions }]}
        />
      </section>
      <section className="arena-section-card">
        <SectionTitle>Resumo</SectionTitle>
        <p className="text-sm text-muted-foreground">
          Animais levam em média <strong>{averageDays} dias</strong> entre o registro
          e a adoção finalizada. A mediana é de <strong>{medianDays} dias</strong>,
          indicando que metade dos animais é adotada antes desse prazo.
        </p>
      </section>
    </div>
  );
}

// ─── Report: Tempo no abrigo ──────────────────────────────────────────
function TimeInShelterReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { averageDays, medianDays, bySpecies = {} } = data;

  const speciesData = Object.entries(bySpecies).map(([sp, vals], i) => ({
    name: sp === 'dog' ? 'Cães' : sp === 'cat' ? 'Gatos' : 'Outros',
    value: vals.count || 0,
    avg: vals.averageDays || 0,
    color: [CHART_COLORS.rescues, '#3b82f6', '#a855f7'][i % 3],
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Média geral" value={`${averageDays} dias`} icon={Calendar} />
        <StatCard label="Mediana" value={`${medianDays} dias`} icon={Calendar} />
        {Object.entries(bySpecies).map(([sp, vals]) => (
          <StatCard
            key={sp}
            label={`Média ${sp === 'dog' ? 'cães' : sp === 'cat' ? 'gatos' : 'outros'}`}
            value={`${vals.averageDays || 0}d`}
            icon={PawPrint}
          />
        ))}
      </div>
      <section className="arena-section-card">
        <SectionTitle>Animais disponíveis por espécie</SectionTitle>
        <PieChartComponent data={speciesData.filter((s) => s.value > 0)} colors={speciesData.map((s) => s.color)} />
      </section>
    </div>
  );
}

// ─── Report: Lares Temporários ────────────────────────────────────────
function FostersReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { total, active, ended, byEnvironment = {} } = data;

  const envData = Object.entries(byEnvironment)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], i) => ({
      name,
      value,
      color: ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#06b6d4', '#ec4899'][i % 6],
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total de placements" value={total} icon={Users} />
        <StatCard label="Ativos" value={active} icon={Users} tone="success" />
        <StatCard label="Encerrados" value={ended} icon={Users} />
      </div>
      {envData.length > 0 && (
        <section className="arena-section-card">
          <SectionTitle>Por tipo de moradia</SectionTitle>
          <PieChartComponent data={envData} colors={envData.map((e) => e.color)} />
        </section>
      )}
    </div>
  );
}

// ─── Report: Castrações ────────────────────────────────────────────────
function SpayNeuterReport({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { totalPets, neutered, notNeutered, neuteredRate, bySpecies = {} } = data;

  const speciesData = Object.entries(bySpecies)
    .filter(([, vals]) => vals.total > 0)
    .map(([sp, vals], i) => ({
      name: `${sp === 'dog' ? 'Cães' : sp === 'cat' ? 'Gatos' : 'Outros'} (${vals.neutered}/${vals.total})`,
      value: vals.total,
      color: [CHART_COLORS.neutered, CHART_COLORS.notNeutered, '#a855f7'][i % 3],
    }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total de animais" value={totalPets} icon={PawPrint} />
        <StatCard label="Castrados" value={neutered} icon={Scissors} tone="success" />
        <StatCard label="Pendentes" value={notNeutered} icon={Scissors} tone="danger" />
        <StatCard label="Taxa de castração" value={`${Math.round(neuteredRate * 100)}%`} icon={Scissors} />
      </div>
      {speciesData.length > 0 && (
        <section className="arena-section-card">
          <SectionTitle>Por espécie (castrados / total)</SectionTitle>
          <PieChartComponent data={speciesData} colors={speciesData.map((s) => s.color)} />
        </section>
      )}
    </div>
  );
}

// ─── Período selector ──────────────────────────────────────────────────
function PeriodSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-medium text-muted-foreground">Período:</span>
      {PERIOD_TYPES.map((p) => (
        <Button
          key={p}
          size="sm"
          variant={value === p ? 'default' : 'outline'}
          onClick={() => onChange(p)}
          className="text-xs h-7 px-3"
        >
          {PERIOD_LABELS[p]}
        </Button>
      ))}
    </div>
  );
}

// ─── Relatório vazio / sem flag ────────────────────────────────────────
function ReportsDisabled() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Activity className="h-12 w-12 text-muted-foreground/40 mb-4" />
      <h3 className="text-lg font-semibold mb-2">Relatórios do Abrigo</h3>
      <p className="text-sm text-muted-foreground max-w-sm">
        A funcionalidade de relatórios está em desenvolvimento. Quando a flag{' '}
        <code className="text-xs bg-muted px-1 py-0.5 rounded">SHELTER_REPORTS</code>{' '}
        for ativada, você terá acesso a métricas detalhadas de resgates,
        adoções, devoluções e muito mais.
      </p>
    </div>
  );
}

// ─── Export button ─────────────────────────────────────────────────────
function ExportButton({ data, periodLabel }) {
  if (!data) return null;
  const rows = [];
  for (const [type, report] of Object.entries(data)) {
    if (!report || type.startsWith('_')) continue;
    if (report.byMonth) {
      for (const row of report.byMonth) {
        rows.push({ relatório: type, ...row });
      }
    }
  }
  if (rows.length === 0) return null;

  const handleExportCSV = () => {
    const periodStr = periodLabel || 'abrigo';
    exportToCSV(rows, 'relatorio-' + periodStr + '.csv');
  };

  const handleExportPDF = () => {
    if (!rows || rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const matrix = rows.map((row) => sanitizeRowForReport(columns, columns.map((c) => row[c])));
    const periodStr = periodLabel || new Date().toLocaleDateString('pt-BR');
    exportToPDF({
      title: 'Relatório do Abrigo',
      subtitle: 'Período: ' + periodStr,
      columns,
      rows: matrix,
      filename: 'relatorio-' + periodStr + '.pdf',
    });
  };

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={handleExportCSV}>
        <Download className="h-3.5 w-3.5 mr-1.5" />
        Exportar CSV
      </Button>
      <Button size="sm" variant="outline" onClick={handleExportPDF}>
        <FileText className="h-3.5 w-3.5 mr-1.5" />
        Exportar PDF
      </Button>
    </div>
  );
}

// ─── Tab principal ─────────────────────────────────────────────────────
export default function ReportsTab({ clubId }) {
  const [periodType, setPeriodType] = useState('year');
  const { data, isLoading, isError, error } = useReports(clubId, { periodType });

  const tabs = REPORT_TYPES.map((type) => ({
    value: type,
    label: REPORT_TYPE_LABELS[type] || type,
  }));

  const renderReport = (type) => {
    if (isLoading) return <Skeleton className="h-64 w-full" />;
    if (isError) {
      return (
        <p className="text-sm text-red-500">
          Erro ao carregar relatório: {error?.message || 'Unknown error'}
        </p>
      );
    }
    const reportData = data?.[type];
    if (!reportData) return <Skeleton className="h-48 w-full" />;

    switch (type) {
      case 'rescues': return <RescuesReport data={reportData} />;
      case 'adoptions': return <AdoptionsReport data={reportData} />;
      case 'comparative': return <ComparativeReport data={reportData} />;
      case 'balance': return <BalanceReport data={reportData} />;
      case 'returns': return <ReturnsReport data={reportData} />;
      case 'time_to_adoption': return <TimeToAdoptionReport data={reportData} />;
      case 'time_in_shelter': return <TimeInShelterReport data={reportData} />;
      case 'fosters': return <FostersReport data={reportData} />;
      case 'spay_neuter': return <SpayNeuterReport data={reportData} />;
      default: return <p className="text-sm text-muted-foreground">Relatório &ldquo;{type}&rdquo; não implementado.</p>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Relatórios do Abrigo</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas históricas de resgates, adoções, devoluções e mais.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          <ExportButton data={data} periodLabel={periodType} />
        </div>
      </div>

      {/* Relatórios */}
      <Tabs defaultValue="rescues" className="w-full">
        <TabsList className="arena-admin-tabs">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs px-2 py-1">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-5">
            {renderReport(tab.value)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
