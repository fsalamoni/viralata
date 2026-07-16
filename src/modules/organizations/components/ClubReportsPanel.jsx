import React from 'react';
import { PawPrint, Heart, Clock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyPets } from '@/modules/pets/hooks/usePets';

/**
 * Relatório simples da organização: contagem de pets por status. Visível a
 * quem tem a permissão `view_reports` (ou é admin), sem exigir acesso ao
 * painel completo de administração.
 */
export default function ClubReportsPanel({ clubId }) {
  const { data: pets = [], isLoading } = useMyPets(clubId);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  const counts = pets.reduce((acc, pet) => {
    acc[pet.status] = (acc[pet.status] || 0) + 1;
    return acc;
  }, {});

  const stats = [
    { label: 'Pets cadastrados', value: pets.length, icon: PawPrint },
    { label: 'Disponíveis', value: counts.available || 0, icon: Heart },
    { label: 'Em processo', value: counts.in_process || 0, icon: Clock },
    { label: 'Adotados', value: counts.adopted || 0, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="rounded-xl">
            <CardContent className="space-y-1 p-4 text-center">
              <Icon className="mx-auto h-5 w-5 text-primary" />
              <div className="text-2xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      {pets.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum pet cadastrado pela organização ainda.</p>
      )}
    </div>
  );
}
