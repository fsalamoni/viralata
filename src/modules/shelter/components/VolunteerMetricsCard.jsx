/**
 * @fileoverview VolunteerMetricsCard — exibe métricas globais do voluntário
 * no Profile (TASK-126).
 *
 * **Dados**:
 * - # participações
 * - # horas totais
 * - # transporte_ida / transporte_volta
 * - frequência (%)
 * - abrigo favorito
 * - abrigos atendidos
 *
 * **Acessibilidade**:
 * - Tabela semântica com scope
 * - ARIA labels descritivos
 * - Ícones + texto para clareza
 */

import React, { useMemo } from 'react';
import {
  Activity, Clock, Car, TrendingUp, Building2, Heart, Calendar,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useVolunteerMetrics } from '../hooks/useVolunteerMetrics';
import { formatRelativeTime } from '@/core/utils/time';

const METRIC_COLORS = {
  primary: 'text-primary',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-destructive',
};

/**
 * @param {object} props
 * @param {string} props.uid — uid do voluntário
 * @param {object} [props.shelterNames] — mapa de abrigo id → nome
 */
export function VolunteerMetricsCard({ uid, shelterNames: _shelterNames }) {
  const { data, isLoading, isError } = useVolunteerMetrics(uid);

  const metrics = useMemo(() => {
    if (!data?.participations) return null;
    return data.metrics;
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Métricas de Voluntariado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-12 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Métricas de Voluntariado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Activity}
            title="Não foi possível carregar as métricas"
            description="Tente recarregar a página."
          />
        </CardContent>
      </Card>
    );
  }

  if (metrics.totalParticipations === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Métricas de Voluntariado
          </CardTitle>
          <CardDescription>
            Suas estatísticas aparecerão aqui após sua primeira participação.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Heart}
            title="Nenhuma participação ainda"
            description="Participe de uma ação em um abrigo para começar a acumular métricas."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Métricas de Voluntariado
        </CardTitle>
        <CardDescription>
          Estatísticas agregadas de todas as suas participações em abrigos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl
          className="grid grid-cols-2 sm:grid-cols-3 gap-4"
          aria-label="Métricas globais de voluntariado"
        >
          <MetricItem
            icon={Activity}
            label="Participações"
            value={metrics.totalParticipations}
            color="primary"
          />
          <MetricItem
            icon={Clock}
            label="Horas totais"
            value={metrics.totalHours}
            color="primary"
            suffix="h"
          />
          <MetricItem
            icon={TrendingUp}
            label="Frequência"
            value={metrics.frequencia}
            color={metrics.frequencia >= 80 ? 'success' : metrics.frequencia >= 50 ? 'warning' : 'danger'}
            suffix="%"
          />
          <MetricItem
            icon={Car}
            label="Ofereceu carona (ida)"
            value={metrics.transporteIda}
            color="primary"
          />
          <MetricItem
            icon={Car}
            label="Ofereceu carona (volta)"
            value={metrics.transporteVolta}
            color="primary"
            className="[&_svg]:-scale-x-100"
          />
          <MetricItem
            icon={Building2}
            label="Abrigos atendidos"
            value={metrics.abrigosAtendidos}
            color="primary"
          />
        </dl>

        {metrics.abrigoFavoritoId && (
          <div className="mt-4 rounded-lg border border-border/60 bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground mb-1">Abrigo favorito</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-600" />
                <span className="font-medium">
                  {metrics.abrigoFavoritoNome || metrics.abrigoFavoritoId}
                </span>
              </div>
              <Badge variant="secondary">
                {metrics.abrigoFavoritoParticipacoes} participa{metrics.abrigoFavoritoParticipacoes === 1 ? 'ção' : 'ções'}
              </Badge>
            </div>
          </div>
        )}

        {metrics.periodoInicio && metrics.periodoFim && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              Ativo de {formatRelativeTime(metrics.periodoInicio)} até {formatRelativeTime(metrics.periodoFim)}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricItem({ icon: Icon, label, value, color = 'primary', suffix = '', className = '' }) {
  return (
    <div
      className={`rounded-lg border border-border/60 p-3 ${className}`}
      role="group"
      aria-label={`${label}: ${value}${suffix}`}
    >
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </dt>
      <dd className={`mt-1 text-2xl font-semibold ${METRIC_COLORS[color]}`}>
        {value}{suffix && <span className="text-base text-muted-foreground ml-0.5">{suffix}</span>}
      </dd>
    </div>
  );
}

export default VolunteerMetricsCard;
