/**
 * @fileoverview Tab "Indicadores" para o painel admin do abrigo (Fase 17).
 *
 * Renderiza indicadores de vitrines e voluntários com charts (recharts).
 *
 * Gated por feature flag `SHELTER_INDICATORS`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 17 (SHELTER_INDICATORS)
 */

import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, Users, Calendar, Activity, Truck, Clock, Star } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useIndicators } from '@/modules/shelter/hooks/useIndicators';
import { PERIOD_LABELS_IND, PERIOD_TYPES_IND } from '@/modules/shelter/domain/operational/indicators';

const CHART_COLORS = {
  exhibitions: '#f97316',
  participants: '#3b82f6',
  adoptions: '#22c55e',
  transports: '#a855f7',
  hours: '#06b6d4',
  participations: '#3b82f6',
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function StatCard({ label, value, icon: Icon, tone = 'default' }) {
  const toneClass = {
    default: 'border-border bg-card',
    success: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
    info: 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950',
  }[tone] || 'border-border bg-card';
  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <div className="flex items-center gap-2 mb-1">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-extrabold">{value ?? '—'}</div>
    </div>
  );
}

function Card({ children, className = '' }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 className="text-base font-semibold mb-3">{children}</h3>;
}

function BarChartComp({ data, bars, xKey = 'label', height = 280 }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>;
  }
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

function LineChartComp({ data, lines, xKey = 'label', height = 250 }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>;
  }
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

// ─── Exhibition Summary ────────────────────────────────────────────────
function ExhibitionSummary({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const {
    totalExhibitions = 0,
    scheduled = 0,
    completed = 0,
    cancelled = 0,
    adoptionRate = 0,
    totalAnimals = 0,
    totalParticipants = 0,
    avgParticipantsPerEvent = 0,
    byMonth = [],
  } = data;

  const statusData = [
    { name: 'Agendadas', value: scheduled, color: '#f97316' },
    { name: 'Realizadas', value: completed, color: '#22c55e' },
    { name: 'Canceladas', value: cancelled, color: '#ef4444' },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total de vitrines" value={totalExhibitions} icon={Calendar} />
        <StatCard label="Realizadas" value={completed} icon={Calendar} tone="success" />
        <StatCard label="Taxa de adoção" value={`${Math.round(adoptionRate * 100)}%`} icon={TrendingUp} />
        <StatCard label="Média participantes/evento" value={avgParticipantsPerEvent} icon={Users} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Agendadas" value={scheduled} icon={Calendar} />
        <StatCard label="Canceladas" value={cancelled} icon={Calendar} tone="info" />
        <StatCard label="Total participantes" value={totalParticipants} icon={Users} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <SectionTitle>Vitrines por mês</SectionTitle>
          <BarChartComp
            data={byMonth}
            bars={[
              { key: 'exhibitions', name: 'Vitrines', color: CHART_COLORS.exhibitions },
              { key: 'participants', name: 'Participantes', color: CHART_COLORS.participants },
            ]}
          />
        </Card>
        <Card>
          <SectionTitle>Status das vitrines</SectionTitle>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderCustomLabel}
                  outerRadius={80}
                  dataKey="value"
                  nameKey="name"
                >
                  {statusData.map((s, i) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sem vitrines no período.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── Exhibition Detail ─────────────────────────────────────────────────
function ExhibitionDetail({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { exhibitions = [] } = data;

  if (exhibitions.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma vitrine registrada ainda.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 text-left font-medium">Vitrine</th>
              <th className="py-2 pr-4 text-left font-medium">Data</th>
              <th className="py-2 pr-4 text-left font-medium">Status</th>
              <th className="py-2 pr-4 text-right font-medium">Participantes</th>
              <th className="py-2 pr-4 text-right font-medium">Animais</th>
              <th className="py-2 pr-4 text-right font-medium">Taxa adoção</th>
            </tr>
          </thead>
          <tbody>
            {exhibitions.map((ex) => (
              <tr key={ex.id} className="border-b border-border/50">
                <td className="py-2 pr-4 font-medium">{ex.title}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {ex.date ? new Date(ex.date).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="py-2 pr-4">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    ex.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    ex.status === 'scheduled' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  }`}>
                    {ex.status}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right">{ex.participants}</td>
                <td className="py-2 pr-4 text-right">{ex.animals}</td>
                <td className={`py-2 pr-4 text-right font-medium ${
                  ex.adoptionRate > 0.3 ? 'text-green-600' : ex.adoptionRate > 0 ? 'text-orange-600' : ''
                }`}>
                  {ex.adoptionRate > 0 ? `${Math.round(ex.adoptionRate * 100)}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Volunteer Summary ────────────────────────────────────────────────
function VolunteerSummary({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const {
    totalVolunteers = 0,
    activeVolunteers = 0,
    totalParticipations = 0,
    totalTransportsIda = 0,
    totalTransportsVolta = 0,
    totalHours = 0,
    avgHoursPerVolunteer = 0,
    avgParticipationsPerVolunteer = 0,
    byMonth = [],
  } = data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total voluntários" value={totalVolunteers} icon={Users} />
        <StatCard label="Participações totais" value={totalParticipations} icon={Activity} />
        <StatCard label="Horas totais" value={Math.round(totalHours)} icon={Clock} />
        <StatCard label="Média horas/voluntário" value={avgHoursPerVolunteer} icon={Clock} />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Transportes ida" value={totalTransportsIda} icon={Truck} />
        <StatCard label="Transportes volta" value={totalTransportsVolta} icon={Truck} />
        <StatCard label="Média participações" value={avgParticipationsPerVolunteer} icon={Activity} />
        <StatCard label="Voluntários únicos" value={totalVolunteers} icon={Users} />
      </div>
      <Card>
        <SectionTitle>Participações e horas por mês</SectionTitle>
        <LineChartComp
          data={byMonth}
          lines={[
            { key: 'participations', name: 'Participações', color: CHART_COLORS.participations },
            { key: 'hours', name: 'Horas', color: CHART_COLORS.hours },
          ]}
        />
      </Card>
      <Card>
        <SectionTitle>Transportes por mês</SectionTitle>
        <BarChartComp
          data={byMonth}
          bars={[{ key: 'transports', name: 'Transportes', color: CHART_COLORS.transports }]}
        />
      </Card>
    </div>
  );
}

// ─── Volunteer Detail ────────────────────────────────────────────────
function VolunteerDetail({ data }) {
  if (!data) return <Skeleton className="h-48 w-full" />;
  const { volunteers = [] } = data;

  if (volunteers.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground text-center py-8">
          Nenhuma participação registrada ainda.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 text-left font-medium">Voluntário</th>
              <th className="py-2 pr-4 text-right font-medium">Participações</th>
              <th className="py-2 pr-4 text-right font-medium">Horas</th>
              <th className="py-2 pr-4 text-right font-medium">Transportes</th>
              <th className="py-2 pr-4 text-left font-medium">Última participação</th>
            </tr>
          </thead>
          <tbody>
            {volunteers.slice(0, 20).map((v, i) => (
              <tr key={v.uid} className="border-b border-border/50">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                      {i + 1}
                    </span>
                    <span className="font-medium">{v.name}</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-right">{v.totalParticipations}</td>
                <td className="py-2 pr-4 text-right">{v.totalHours}h</td>
                <td className="py-2 pr-4 text-right">{v.transports}</td>
                <td className="py-2 pr-4 text-muted-foreground">
                  {v.lastParticipation
                    ? new Date(v.lastParticipation).toLocaleDateString('pt-BR')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Indicadores tab principal ────────────────────────────────────────
export default function IndicatorsTab({ clubId }) {
  const [periodType, setPeriodType] = useState('year');
  const { data, isLoading, isError, error } = useIndicators(clubId, { periodType });

  const tabs = [
    { value: 'exhibition_summary', label: 'Vitrines' },
    { value: 'exhibition_detail', label: 'Por Vitrine' },
    { value: 'volunteer_summary', label: 'Voluntários' },
    { value: 'volunteer_detail', label: 'Por Voluntário' },
  ];

  const renderContent = (type) => {
    if (isLoading) return <Skeleton className="h-48 w-full" />;
    if (isError) {
      return (
        <p className="text-sm text-red-500">
          Erro: {error?.message || 'Unknown error'}
        </p>
      );
    }
    const d = data?.[type];
    if (!d) return <Skeleton className="h-48 w-full" />;
    switch (type) {
      case 'exhibition_summary': return <ExhibitionSummary data={d} />;
      case 'exhibition_detail': return <ExhibitionDetail data={d} />;
      case 'volunteer_summary': return <VolunteerSummary data={d} />;
      case 'volunteer_detail': return <VolunteerDetail data={d} />;
      default: return <p className="text-sm text-muted-foreground">Tipo &ldquo;{type}&rdquo; não implementado.</p>;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Indicadores</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Métricas de vitrines e voluntários do abrigo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
          {PERIOD_TYPES_IND.map((p) => (
            <Button
              key={p}
              size="sm"
              variant={periodType === p ? 'default' : 'outline'}
              onClick={() => setPeriodType(p)}
              className="text-xs h-7 px-3"
            >
              {PERIOD_LABELS_IND[p]}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="exhibition_summary" className="w-full">
        <TabsList className="arena-tab-bar">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-5">
            {renderContent(tab.value)}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
