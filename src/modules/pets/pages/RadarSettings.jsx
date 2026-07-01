import React from 'react';
import { Link } from 'react-router-dom';
import { Radar as RadarIcon, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/core/lib/FirebaseAuthContext';
import { useMyRadar, useSetRadarActive } from '../hooks/usePets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

export default function RadarSettings() {
  const { user, userProfile } = useAuth();
  const { data: radar, isLoading } = useMyRadar(user?.uid);
  const setActive = useSetRadarActive();

  const active = radar?.active === true;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <Link to="/perfil" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="w-4 h-4" /> Voltar ao perfil
      </Link>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
          <RadarIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Radar de Pets</h1>
          <p className="text-sm text-gray-500">Seja avisado assim que um pet compatível com você for cadastrado.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como funciona</CardTitle>
          <CardDescription>
            O Radar usa o seu perfil de adotante (moradia, rotina, família e orçamento) — o mesmo
            usado no feed — para avisar você em tempo real. Mantenha seu{' '}
            <Link to="/perfil" className="text-orange-600 underline">perfil</Link> atualizado para
            receber alertas mais precisos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-14 w-full rounded-lg" />
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Radar ativado</p>
                <p className="text-xs text-gray-500">
                  {active
                    ? 'Você receberá uma notificação quando um pet compatível surgir.'
                    : 'Ligue para começar a receber alertas.'}
                </p>
              </div>
              <Switch
                checked={active}
                disabled={setActive.isPending || !userProfile?.profile_completed}
                onCheckedChange={(v) => setActive.mutate(v)}
              />
            </div>
          )}
          {!userProfile?.profile_completed && (
            <p className="text-xs text-amber-600 mt-3">
              Complete seu perfil de adotante antes de ativar o radar.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
