import React from 'react';
import { Link } from 'react-router-dom';
import { Radar as RadarIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useMyRadar, useSetRadarActive } from '../hooks/usePets';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PageContainer from '@/components/PageContainer';

export default function RadarSettings() {
  const { user, isProfileComplete } = useAuth();
  const { data: radar, isLoading } = useMyRadar(user?.uid);
  const setActive = useSetRadarActive();

  const active = radar?.active === true;

  return (
    <PageContainer>
      <div className="mx-auto w-full max-w-2xl space-y-6">
      <Link to="/perfil" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Voltar ao perfil
      </Link>

      <section className="arena-section-card">
        <div className="arena-section-card-header">
          <h3 className="arena-section-card-title">Como funciona</h3>
          <p className="arena-section-card-description">
            O Radar usa o seu perfil de adotante (moradia, rotina, família e orçamento) — o mesmo
            usado no feed — para avisar você em tempo real. Mantenha seu{' '}
            <Link to="/perfil" className="text-primary underline">perfil</Link> atualizado para
            receber alertas mais precisos.
          </p>
        </div>
        <div className="arena-section-card-body">
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
        </div>
      </section>
    </div>
    </PageContainer>
  );
}
