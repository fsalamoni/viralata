/**
 * @fileoverview HomeStats — bloco "Viralata em números" na Home
 * (TASK-153). Contadores agregados públicos via getCountFromServer
 * (aggregate query — 1 read por contador, sem Cloud Function).
 *
 * Gated pela flag `home_stats_v1` (default OFF). Em erro (ex.: rules
 * bloqueando anônimo em alguma coleção), o bloco simplesmente não
 * renderiza — nunca quebra a Home.
 */

import { useQuery } from '@tanstack/react-query';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { PawPrint, Heart, Building2 } from 'lucide-react';
import { db } from '@/core/config/firebase';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { FEATURE_FLAG } from '@/core/featureFlags';

async function fetchCounts() {
  const [pets, adopted, clubs] = await Promise.all([
    getCountFromServer(collection(db, 'pets')),
    getCountFromServer(query(collection(db, 'pets'), where('status', '==', 'adopted'))),
    getCountFromServer(collection(db, 'clubs')),
  ]);
  return {
    pets: pets.data().count,
    adopted: adopted.data().count,
    clubs: clubs.data().count,
  };
}

const STATS = [
  { key: 'pets', label: 'Pets cadastrados', icon: PawPrint },
  { key: 'adopted', label: 'Adoções concretizadas', icon: Heart },
  { key: 'clubs', label: 'Organizações ativas', icon: Building2 },
];

export function HomeStats() {
  const enabled = useFeatureFlag(FEATURE_FLAG.HOME_STATS_V1);
  const { data, isError, isLoading } = useQuery({
    queryKey: ['home', 'stats'],
    queryFn: fetchCounts,
    enabled: Boolean(enabled && db),
    staleTime: 5 * 60_000,
  });

  if (!enabled || isError || isLoading || !data) return null;

  return (
    <section aria-label="Viralata em números" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STATS.map(({ key, label, icon: Icon }) => (
          <div key={key} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="font-['Sora'] text-2xl font-bold text-foreground">
                {Number(data[key] ?? 0).toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default HomeStats;
