import React from 'react';
import { Link } from 'react-router-dom';
import { Radar as RadarIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useMyRadar, useSetRadarActive } from '../hooks/usePets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PageHero from '@/components/PageHero';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';

export default function RadarSettings() {
  const { user, isProfileComplete } = useAuth();
  const { data: radar, isLoading } = useMyRadar(user?.uid);
  const setActive = useSetRadarActive();

  const active = radar?.active === true;

  return (
    <div className={useArenaPageClasses('arena-page mx-auto max-w-2xl space-y-6 px-4 py-6')}>
      <PageHero
        eyebrow="Pets"
        title="Radar de Pets"
        description="Seja avisado assim que um pet compatível com você for cadastrado."
        actions={
          <Link to="/perfil" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar ao perfil
          </Link>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como funciona</CardTitle>
          <CardDescription>
            O Radar usa o seu perfil de adotante (moradia, rotina, família e orçamento) — o mesmo
            usado no feed — para avisar você em tempo real. Mantenha seu{' '}
            <Link to="/perfil" className="text-primary underline">perfil</Link> atualizado para
            receber alertas mais precisos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-14 w-full rounded-lg" />
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="text-sm font-medium">Radar ativado</p>
                <p className="text-xs text-muted-foreground">
                  {active
                    ? 'Você receberá uma notificação quando um pet compatível surgir.'
                    : 'Ligue para começar a receber alertas.'}
                </p>
              </div>
              <Switch
                checked={active}
                disabled={setActive.isPending || !isProfileComplete}
                onCheckedChange={(v) => setActive.mutate(v)}
              />
            </div>
          )}
          {!isProfileComplete && (
            <p className="text-xs text-highlight-foreground bg-highlight/15 border border-highlight/40 rounded-lg px-3 py-2 mt-3">
              Complete seu perfil de adotante antes de ativar o radar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
