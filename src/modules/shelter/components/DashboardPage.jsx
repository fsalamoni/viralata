/**
 * @fileoverview DashboardPage — tela inicial do painel do abrigo
 * (`/abrigos/{id}/dashboard`).
 *
 * Grid responsivo (1 / 2 / 3 colunas) com cards clicáveis que mostram
 * as principais métricas do abrigo em tempo real. Botão "Personalizar
 * dashboard" abre o `DashboardWidgetManager` para CRUD de widgets
 * customizados.
 *
 * Real-time: usa `useDashboard` (onSnapshot via service, debounce 1s).
 * Skeleton enquanto carrega.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 14
 */

import { useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/modules/shelter/hooks/useDashboard';
import { DashboardCard } from './DashboardCard';
import { DashboardWidgetManager } from './DashboardWidgetManager';

export function DashboardPage() {
  const { clubId } = useParams();
  // Hook SEMPRE no topo (rules-of-hooks) — useDashboard tolera clubId falsy.
  const { data, isLoading, hasError, errors } = useDashboard(clubId);

  if (!clubId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p className="text-sm text-muted-foreground">Abrigo não especificado.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 space-y-6" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" aria-hidden="true" />
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão em tempo real do abrigo. Os números atualizam automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DashboardWidgetManager clubId={clubId} />
        </div>
      </div>

      {hasError && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-700 mt-0.5 shrink-0" aria-hidden="true" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Alguns dados não puderam ser carregados.</p>
              <p className="text-xs mt-1">
                {Object.entries(errors)
                  .filter(([k]) => k !== '_init')
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div
        data-testid="dashboard-grid"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
      >
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <DashboardCard
                key={`skeleton-${i}`}
                title="Carregando..."
                isLoading
                testId={`skeleton-${i}`}
              />
            ))
          : data.cards.map((card) => (
              <DashboardCard
                key={card.key}
                testId={`card-${card.key}`}
                title={card.title}
                subtitle={card.subtitle || card.description}
                count={card.count}
                href={card.href}
                variant={card.variant}
                tone={card.tone}
                icon={card.icon}
                size={card.size}
              />
            ))}
      </div>

      {data?.computedAt && (
        <p className="text-xs text-muted-foreground text-center pt-4">
          Atualizado em {new Date(data.computedAt).toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
          })}
        </p>
      )}
    </div>
  );
}

export default DashboardPage;
