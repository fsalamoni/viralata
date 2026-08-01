/**
 * @fileoverview useShelterPetRecords — agrega uma subcoleção operacional
 * de TODOS os pets do abrigo (SHELTER_PET_OPS_TABLES_V1).
 *
 * As subcoleções operacionais do pet (vet_visits, treatments, care_log,
 * medications, health_records, adopters_history, devolutions) vivem em
 * `pets/{petId}/...` e NÃO carregam `shelter_club_id`. Por isso a agregação
 * é feita por-pet: pega os pets do abrigo (`useMyPets`) e consulta a
 * subcoleção de cada um, achatando o resultado e anexando os dados do pet
 * (`_petId`, `_petName`, ...). Casa exatamente com o pedido "de cada pet
 * vinculado ao abrigo".
 *
 * @param {string} orgId — clubId do abrigo.
 * @param {{ key: string, listFn: (petId: string) => Promise<object[]> }} config
 * @returns {{ records: object[], isLoading: boolean, isError: boolean, refetch: () => void }}
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyPets } from '@/modules/pets/hooks/usePets';
import { logger } from '@/core/lib/logger';

const STALE_TIME_MS = 30_000;

/**
 * Rótulo do ID imutável do pet (#000001), com o mesmo padrão do painel
 * admin (PetsOpsTable). Fallback: pet_code (VLT-000123) ou docId curto.
 */
function petSeqLabel(pet) {
  const seq = pet?.pet_seq;
  if (typeof seq === 'number' && Number.isFinite(seq) && seq > 0) {
    return `#${String(seq).padStart(6, '0')}`;
  }
  return pet?.pet_code || `#${(pet?.id || '').slice(0, 6)}`;
}

export function useShelterPetRecords(orgId, config) {
  const {
    data: pets = [],
    isLoading: petsLoading,
    isError: petsError,
  } = useMyPets(orgId);

  // Primitivos no queryKey (evita loop de referência — D-REACT-QUERY-KEY-PRIMITIVES).
  const petIds = useMemo(() => pets.map((p) => p.id).sort(), [pets]);
  const petsById = useMemo(() => {
    const m = {};
    for (const p of pets) m[p.id] = p;
    return m;
  }, [pets]);

  const query = useQuery({
    queryKey: ['shelter-pet-records', config.key, orgId, petIds.join(',')],
    enabled: Boolean(orgId) && !petsLoading,
    staleTime: STALE_TIME_MS,
    queryFn: async () => {
      const perPet = await Promise.all(
        pets.map(async (pet) => {
          try {
            const rows = await config.listFn(pet.id);
            return (rows || []).map((r) => ({
              ...r,
              _petId: pet.id,
              _petName: pet.name || pet.title || 'Sem nome',
              _petSeqLabel: petSeqLabel(pet),
              _petSpecies: pet.species || null,
              _petStatus: pet.status || null,
              _petPhoto: Array.isArray(pet.photos) ? pet.photos[0] : (pet.photo_url || null),
            }));
          } catch (err) {
            // Um pet com falha (permissão/índice) não deve derrubar a tabela toda.
            logger.warn('useShelterPetRecords', {
              msg: 'listFn falhou para um pet — ignorando',
              config: config.key,
              petId: pet.id,
              err: String(err?.message || err),
            });
            return [];
          }
        }),
      );
      return perPet.flat();
    },
  });

  return {
    records: query.data ?? [],
    isLoading: petsLoading || query.isLoading,
    isError: petsError || query.isError,
    refetch: query.refetch,
    petsById,
    petsCount: pets.length,
  };
}
