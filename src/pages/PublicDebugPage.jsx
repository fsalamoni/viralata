/**
 * @fileoverview PublicDebugPage — renderiza o OrganizationAdminPanel
 * SEM auth, para debug. Protegido por flag de URL `?debug=1`.
 *
 * ATENÇÃO: Esta página é temporária e será removida após debugging.
 */

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

// Componentes lazy diretamente
import { DashboardPage } from '@/modules/shelter/components/DashboardPage';
import { KanbanPage } from '@/modules/shelter/components/KanbanPage';
import { ExhibitionsList } from '@/modules/shelter/components/ExhibitionsList';
import { VolunteersRoster } from '@/modules/shelter/components/VolunteersRoster';
import { FostersList } from '@/modules/shelter/components/FostersList';
import { ShelterPetScopedTab } from '@/modules/organizations/components/ShelterPetScopedTab';
import ReportsTab from '@/modules/shelter/components/ReportsTab';
import IndicatorsTab from '@/modules/shelter/components/IndicatorsTab';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', render: (c) => <DashboardPage clubId={c} /> },
  { key: 'kanban', label: 'Kanban', render: (c) => <KanbanPage clubId={c} /> },
  { key: 'exhibitions', label: 'Vitrines', render: (c) => <ExhibitionsList shelterClubId={c} /> },
  { key: 'volunteers', label: 'Voluntários', render: (c) => <VolunteersRoster shelterClubId={c} /> },
  { key: 'foster', label: 'Lares', render: (c) => <FostersList shelterClubId={c} canAbriho /> },
  { key: 'medical', label: 'Prontuário', render: (c) => <ShelterPetScopedTab clubId={c} kind="medical" /> },
  { key: 'medications', label: 'Medicação', render: (c) => <ShelterPetScopedTab clubId={c} kind="medications" /> },
  { key: 'timeline', label: 'Timeline', render: (c) => <ShelterPetScopedTab clubId={c} kind="timeline" /> },
  { key: 'reports', label: 'Relatórios', render: (c) => <ReportsTab clubId={c} /> },
  { key: 'indicators', label: 'Indicadores', render: (c) => <IndicatorsTab clubId={c} /> },
];

export default function PublicDebugPage() {
  const [params] = useSearchParams();
  const enabled = params.get('debug') === '1';
  const clubId = params.get('clubId') || 'TM9MBn5aFXgObfRZ39m9';

  if (!enabled) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🐛 PublicDebug</h1>
        <p className="text-sm text-muted-foreground mb-2">
          Adicione <code className="bg-muted px-1 rounded">?debug=1</code> na URL para ativar.
        </p>
        <p className="text-xs text-muted-foreground">
          Renderiza o OrganizationAdminPanel SEM auth. Use para debugar problemas de render.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 p-4">
      <div className="bg-orange-100 border-2 border-orange-400 rounded p-3 text-xs text-orange-900 mb-4 font-mono">
        🐛 PUBLIC DEBUG MODE — sem auth, todas as flags ativas. NÃO USAR EM PRODUÇÃO.
        <br />clubId: <strong>{clubId}</strong>
      </div>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="arena-admin-tabs flex flex-wrap gap-1 mb-4">
          {TABS.map(({ key, label }) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>
        {TABS.map(({ key, render }) => (
          <TabsContent key={key} value={key} className="mt-4">
            <section className="arena-section-card">
              <div className="arena-section-card-header">
                <h3 className="arena-section-card-title">Render: {key}</h3>
              </div>
              <div className="arena-section-card-body">
                <Suspense fallback={<Skeleton className="h-40" />}>
                  <ErrorBoundary>
                    {render(clubId)}
                  </ErrorBoundary>
                </Suspense>
              </div>
            </section>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
