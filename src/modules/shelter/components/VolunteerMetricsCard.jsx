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

import React, { useMemo, useState } from 'react';
import {
  Activity, Clock, Car, TrendingUp, Building2, Heart, Calendar, Download, Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useVolunteerMetrics } from '../hooks/useVolunteerMetrics';
import { useDownloadCertificate } from '../hooks/useVolunteerCertificate';
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
// ─── Certificate download (TASK-248) ──────────────────────────────────────

/**
 * CertDownload — botão "Baixar certificado de horas" integrado ao card
 * de métricas. Exibe loading state + toast de erro/ok.
 */
function CertificateDownload({ uid, totalHours }) {
  const [isLoading, setIsLoading] = useState(false);
  const downloadCert = useDownloadCertificate({
    uid,
    onLoading: setIsLoading,
    onError: (err) => {
      console.error('[CertificateDownload] erro ao gerar certificado', err);
    },
    onSuccess: () => {
      // Sucesso silencioso — o browser já disparou o download
    },
  });

  return (
    <div className="mt-4 pt-4 border-t border-border/60">
      <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-900">Certificado de voluntariado</p>
            <p className="text-[11px] text-amber-700">
              {totalHours.toFixed(2).replace('.', ',')}h registradas · Lei 9.608/1998
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-amber-300 text-amber-800 hover:bg-amber-100"
          onClick={() => downloadCert()}
          disabled={isLoading}
          aria-label="Baixar certificado de horas de voluntariado"
        >
          {isLoading ? (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border border-amber-600 border-t-transparent" />
              Gerando…
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5 mr-1" />
              Baixar PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

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

        {/* TASK-248: Certificado de horas */}
        {metrics.totalHours > 0 && (
          <CertificateDownload uid={uid} totalHours={metrics.totalHours} />
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
