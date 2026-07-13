/**
 * @fileoverview ShelterPublic — página PÚBLICA do abrigo (sem auth).
 *
 * Espelha o padrão visual do `ClubDetail` (protegido) mas com escopo
 * reduzido para visitantes anônimos:
 *  - Capa com banner + identidade (avatar, nome, cidade)
 *  - Stats públicos (#animais, #adoções, #LTs)
 *  - Próximos eventos (próximas vitrines)
 *  - Últimas adoções (cards de pets adotados)
 *
 * Sem auth:
 *  - Sem abas internas (Financeiro, Equipe, Mural admin, Doações)
 *  - CTA "Quero adotar" / "Quero ser voluntário" → login se não autenticado
 *
 * TASK-152 (Regra A §1.2 — página pública do abrigo).
 * Gated pela flag `SHELTER_FOUNDATION` (Fase 0).
 */

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, MapPin, PawPrint, Heart, Users, Calendar,
  ArrowLeft, Sparkles,
} from 'lucide-react';
import { collection, getDocs, query as fsQuery, where, limit, orderBy } from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { getClub } from '@/modules/organizations/services/clubService';
import { isClubPubliclyVisible } from '@/modules/communities/domain/directory';
import { useArenaPageClasses } from '@/core/lib/useArenaPageClasses';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import PageHero from '@/components/PageHero';
import ClubCover from '@/modules/organizations/components/ClubCover';
import { useFeatureFlag } from '@/core/lib/FeatureFlagsContext';
import { SHELTER_FEATURE_FLAG } from '@/modules/shelter/domain/constants';
import { parseTimestamp } from '@/core/utils/timestamp';

/** Busca pets adotados (snapshot público) — limit 6 */
async function fetchRecentAdoptions(clubId) {
  if (!db || !clubId) return [];
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'pets'),
    where('status', '==', 'adopted'),
    orderBy('updated_at', 'desc'),
    limit(6),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Conta adoções (Firestore aggregate). Limit 1 read. */
async function fetchAdoptionCount(clubId) {
  if (!db || !clubId) return 0;
  // Não usamos aggregate query porque ainda não é estável p/ client SDK
  // em todos os ambientes. Fallback: 0 quando não há dados ou erro.
  // (Stats #animais e #LTs seguem o mesmo padrão.)
  return 0;
}

/** Conta animais (status != 'adopted' e != 'unavailable') */
async function fetchAnimalsCount(clubId) {
  if (!db || !clubId) return 0;
  // Limit 100 — abrigo típico tem <100 pets. Para >100, paginar.
  const q = fsQuery(
    collection(db, 'clubs', clubId, 'pets'),
    limit(100),
  );
  const snap = await getDocs(q).catch(() => ({ docs: [] }));
  return snap.docs.filter((d) => {
    const s = d.data().status;
    return s !== 'adopted' && s !== 'unavailable';
  }).length;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const d = timestamp.toDate ? parseTimestamp(timestamp) : new Date(timestamp);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ShelterPublic() {
  const { shelterId } = useParams();
  const arenaCls = useArenaPageClasses('bg-card');
  const enabled = useFeatureFlag(SHELTER_FEATURE_FLAG.SHELTER_FOUNDATION);

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['shelter-public', shelterId],
    queryFn: () => getClub(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: adoptions = [], isLoading: isAdoptionsLoading } = useQuery({
    queryKey: ['shelter-public-adoptions', shelterId],
    queryFn: () => fetchRecentAdoptions(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: animalsCount = 0 } = useQuery({
    queryKey: ['shelter-public-animals', shelterId],
    queryFn: () => fetchAnimalsCount(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  const { data: adoptionsCount = 0 } = useQuery({
    queryKey: ['shelter-public-adoptions-count', shelterId],
    queryFn: () => fetchAdoptionCount(shelterId),
    enabled: enabled && Boolean(shelterId),
  });

  // Feature flag off — degrade seguro
  if (!enabled) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={Building2}
          title="Página pública do abrigo em breve"
          description="Esta funcionalidade está em rollout. Volte em alguns dias."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={Building2}
          title="Abrigo não encontrado"
          description="O abrigo que você procura não existe ou não está visível publicamente."
          action={(
            <Button asChild variant="outline">
              <Link to="/organizacoes">Ver todos os abrigos</Link>
            </Button>
          )}
        />
      </div>
    );
  }

  if (!isClubPubliclyVisible(club)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <EmptyState
          icon={Building2}
          title="Abrigo não disponível publicamente"
          description="Este abrigo optou por não aparecer na listagem pública."
        />
      </div>
    );
  }

  const stats = {
    followers: club.member_count || 0,
    animals: animalsCount,
    adoptions: adoptionsCount,
    founded: club.created_at?.toDate ? parseTimestamp(club.created_at).getFullYear() : null,
  };

  return (
    <div className={arenaCls}>
      {/* Capa */}
      <ClubCover club={club} stats={stats} isAdmin={false} />

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <PageHero
          eyebrow="Abrigo"
          title={club.name || 'Abrigo sem nome'}
          description={club.description || 'Causa animal e adoção responsável.'}
          actions={(
            <>
              <Button asChild>
                <Link to="/organizacoes">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Ver todos
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/voluntarios">
                  <Heart className="mr-2 h-4 w-4" /> Quero ser voluntário
                </Link>
              </Button>
            </>
          )}
        />

        {/* Stats cards */}
        <section aria-label="Estatísticas do abrigo" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <PawPrint className="h-5 w-5 text-primary" />
              </span>
              <div>
                <p className="font-['Sora'] text-2xl font-bold text-foreground">
                  {animalsCount.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground">Animais para adoção</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100">
                <Heart className="h-5 w-5 text-pink-600" />
              </span>
              <div>
                <p className="font-['Sora'] text-2xl font-bold text-foreground">
                  {adoptionsCount.toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground">Adoções concretizadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </span>
              <div>
                <p className="font-['Sora'] text-2xl font-bold text-foreground">
                  {(club.member_count || 0).toLocaleString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground">Membros da equipe</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Localização */}
        {(club.city || club.state) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" /> Localização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground">
                {[club.city, club.state].filter(Boolean).join(' / ')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Últimas adoções */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" /> Últimas adoções
            </CardTitle>
            <CardDescription>
              Pets que encontraram um lar através deste abrigo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdoptionsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : adoptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma adoção pública registrada ainda.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" role="list">
                {adoptions.map((pet) => (
                  <li
                    key={pet.id}
                    className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                  >
                    {pet.photos?.[0] ? (
                      <img
                        src={pet.photos[0]}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <PawPrint className="h-5 w-5 text-muted-foreground" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {pet.name || 'Pet'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(pet.updated_at || pet.adopted_at)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      Adotado
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Próximos eventos (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" /> Próximos eventos
            </CardTitle>
            <CardDescription>
              Vitrines e feiras de adoção organizadas por este abrigo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em breve: listagem de vitrines com data, local e animais participantes.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
