/**
 * @fileoverview useHomeStats — busca estatísticas agregadas para a Home.
 *
 * Retorna contadores de pets disponíveis, ONGs parceiras e cidades atendidas.
 * Usa cache de 5min via React Query para evitar refetch em cada navegação.
 *
 * Fallback: se o Firestore falhar OU se o usuário estiver offline, retorna null
 * e a UI usa os valores estáticos (IMPACT_STATS em Home.v3.jsx).
 *
 * @see src/pages/Home.v3.jsx
 */
import { useQuery } from '@tanstack/react-query';
import { collection, getCountFromServer, query, where } from 'firebase/firestore';
import { db } from '@/core/config/firebase';

async function fetchHomeStats() {
  if (!db) return null;

  try {
    const petsCol = collection(db, 'pets');
    const petsAvailableQuery = query(petsCol, where('status', '==', 'available'));
    const petsSnapshot = await getCountFromServer(petsAvailableQuery);
    const petsCount = petsSnapshot.data().count;

    const orgsCol = collection(db, 'organizations');
    const orgsSnapshot = await getCountFromServer(orgsCol);
    const orgsCount = orgsSnapshot.data().count;

    const citiesCol = collection(db, 'cities');
    const citiesSnapshot = await getCountFromServer(citiesCol);
    const citiesCount = citiesSnapshot.data().count;

    return {
      petsCount,
      orgsCount,
      citiesCount,
      adoptedCount: 500, // TODO: buscar de `adoptions` collection
    };
  } catch (err) {
    console.warn('[useHomeStats] Firestore fetch falhou:', err);
    return null;
  }
}

export function useHomeStats() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['home-stats'],
    queryFn: fetchHomeStats,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const formatted = data
    ? [
        { value: `${data.adoptedCount}+`, label: 'Adoções responsáveis' },
        { value: `${data.petsCount}+`, label: 'Animais resgatados' },
        { value: `${data.orgsCount}`, label: 'ONGs parceiras' },
        { value: `${data.citiesCount}`, label: 'Cidades atendidas' },
      ]
    : null;

  return {
    data: formatted,
    isLoading,
    isError,
    refetch,
  };
}
