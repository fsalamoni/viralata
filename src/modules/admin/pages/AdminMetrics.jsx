import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchMetricsData, groupByMonth, groupByField } from '../services/metricsService';

export default function AdminMetrics() {
  const { isPlatformAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ pets: [], users: [], reports: [] });

  useEffect(() => {
    if (!isPlatformAdmin) return;
    fetchMetricsData().then(setData).finally(() => setLoading(false));
  }, [isPlatformAdmin]);

  if (!isPlatformAdmin) return null;
  if (loading) return <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-400">Carregando métricas...</div>;

  const adoptionsByMonth = groupByMonth(data.pets.filter((p) => p.status === 'adopted'), 'adopted_at');
  const usersByMonth = groupByMonth(data.users, 'created_at');
  const reportsByMonth = groupByMonth(data.reports, 'created_at');
  const petsByState = groupByField(data.pets, 'state');

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Métricas da Plataforma</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Pets cadastrados" value={data.pets.length} />
        <SummaryCard label="Adoções concluídas" value={data.pets.filter((p) => p.status === 'adopted').length} />
        <SummaryCard label="Usuários" value={data.users.length} />
        <SummaryCard label="Denúncias" value={data.reports.length} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Adoções por mês</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={adoptionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Adoções" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Crescimento de usuários</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={usersByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="Novos usuários" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Pets por estado</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={petsByState} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={60} />
              <Tooltip />
              <Bar dataKey="count" name="Pets" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Denúncias por mês</CardTitle></CardHeader>
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={reportsByMonth}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" name="Denúncias" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}
