/**
 * @fileoverview AdminDebugPage — renderiza o OrganizationAdminPanel
 * dentro de um ErrorBoundary isolado, com auth mockada. Use para
 * debugar problemas de render.
 *
 * Acesso: /admin-debug?debug=1
 *
 * IMPORTANTE: protegido por flag de URL — só renderiza se `?debug=1`.
 */

import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bug } from 'lucide-react';

// Mock do useAuth e useFeatureFlag
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';

const TARGET_TABS = [
  { key: 'dashboard', flag: SHELTER_FEATURE_FLAG.SHELTER_DASHBOARD, label: 'Dashboard' },
  { key: 'kanban', flag: SHELTER_FEATURE_FLAG.SHELTER_KANBAN, label: 'Kanban' },
  { key: 'exhibitions', flag: SHELTER_FEATURE_FLAG.SHELTER_EXHIBITIONS, label: 'Vitrines' },
  { key: 'volunteers', flag: SHELTER_FEATURE_FLAG.SHELTER_VOLUNTEERS, label: 'Voluntários' },
  { key: 'reports', flag: SHELTER_FEATURE_FLAG.SHELTER_REPORTS, label: 'Relatórios' },
  { key: 'indicators', flag: SHELTER_FEATURE_FLAG.SHELTER_INDICATORS, label: 'Indicadores' },
  { key: 'foster', flag: SHELTER_FEATURE_FLAG.SHELTER_FOSTER, label: 'Lares Temporários' },
];

// Componentes lazy com ErrorBoundary isolado por aba
import { DashboardPage } from '@/modules/shelter/components/DashboardPage';
import { KanbanPage } from '@/modules/shelter/components/KanbanPage';
import { ExhibitionsList } from '@/modules/shelter/components/ExhibitionsList';
import { VolunteersRoster } from '@/modules/shelter/components/VolunteersRoster';
import { FostersList } from '@/modules/shelter/components/FostersList';
import { ShelterPetScopedTab } from '@/modules/organizations/components/ShelterPetScopedTab';
import ReportsTab from '@/modules/shelter/components/ReportsTab';
import IndicatorsTab from '@/modules/shelter/components/IndicatorsTab';

export default function AdminDebugPage() {
  const [searchParams] = useSearchParams();
  const enabled = searchParams.get('debug') === '1';
  const clubId = searchParams.get('clubId') || 'TM9MBn5aFXgObfRZ39m9';
  const { isAuthenticated, user } = useAuth();

  if (!enabled) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Bug className="h-6 w-6" /> AdminDebug
        </h1>
        <p className="text-sm text-muted-foreground mb-2">
          Adicione <code className="bg-muted px-1 rounded">?debug=1</code> na URL para ativar.
        </p>
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <p>isAuthenticated: <strong>{String(isAuthenticated)}</strong></p>
            <p>user: <strong>{user?.email || 'null'}</strong></p>
            <p>clubId (param): <strong>{clubId}</strong></p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 p-4">
      <div className="bg-yellow-100 border border-yellow-400 rounded p-3 text-xs text-yellow-900 mb-4">
        🐛 DEBUG MODE — todas as shelter flags ativas via query. Cada aba tem ErrorBoundary isolado.
      </div>
      <DebugTabs clubId={clubId} />
    </div>
  );
}

function DebugTabs({ clubId }) {
  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <TabsList className="flex flex-wrap gap-1">
        {TARGET_TABS.map(({ key, label }) => (
          <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
        ))}
      </TabsList>
      {TARGET_TABS.map(({ key }) => (
        <TabsContent key={key} value={key} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Render: {key}</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-40" />}>
                <ErrorBoundary>
                  <DebugRender kind={key} clubId={clubId} />
                </ErrorBoundary>
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

function DebugRender({ kind, clubId }) {
  switch (kind) {
    case 'dashboard':
      return <DashboardPage clubId={clubId} />;
    case 'kanban':
      return <KanbanPage clubId={clubId} />;
    case 'exhibitions':
      return <ExhibitionsList shelterClubId={clubId} />;
    case 'volunteers':
      return <VolunteersRoster shelterClubId={clubId} />;
    case 'foster':
      return <FostersList shelterClubId={clubId} canAbriho />;
    case 'medical':
      return <ShelterPetScopedTab clubId={clubId} kind="medical" />;
    case 'medications':
      return <ShelterPetScopedTab clubId={clubId} kind="medications" />;
    case 'timeline':
      return <ShelterPetScopedTab clubId={clubId} kind="timeline" />;
    case 'reports':
      return <ReportsTab clubId={clubId} />;
    case 'indicators':
      return <IndicatorsTab clubId={clubId} />;
    default:
      return <p>Unknown kind: {kind}</p>;
  }
}
