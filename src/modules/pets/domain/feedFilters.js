/**
 * Filtros do Feed de pets — lógica pura, aplicada client-side.
 *
 * O serviço (`petService.getAvailablePets`) busca os pets disponíveis com
 * UMA única forma de query no Firestore (status + created_at, coberta por
 * índice existente); espécie, porte, cidade e raio são aplicados aqui. Isso
 * elimina a matriz de índices compostos por combinação de filtro (que já
 * derrubou o feed com `failed-precondition`) e torna os filtros instantâneos.
 */
import {
  lookupCityCoordsByName,
  resolvePetCoords,
  haversineKm,
  normalizePlaceText,
} from './geoDistance';

/**
 * Aplica os filtros do Feed sobre a lista completa de pets disponíveis.
 *
 * Regra de localização:
 * - cidade com coordenadas conhecidas + raio ativo → mantém pets com
 *   coordenadas resolvíveis dentro do raio E pets sem coordenadas cuja
 *   cidade normalizada é a própria cidade buscada (nunca descarta às cegas
 *   um pet cadastrado na cidade em que se busca);
 * - cidade sem coordenadas conhecidas (ou raio desligado) → comparação de
 *   texto normalizada (caixa/acentos/espaços não importam).
 *
 * Fallback de localização: se o filtro de cidade/raio zerar a lista mas
 * ainda existirem pets que passam nos demais filtros, retorna esses pets
 * com `locationFallback: true` — o feed nunca fica vazio por causa de
 * localização enquanto houver pets cadastrados.
 *
 * @param {Array<object>} pets
 * @param {{ species?: string, size?: string, cityText?: string,
 *           radiusKm?: number|null, hideOwnerId?: string|null }} options
 * @returns {{ pets: Array<object>, locationFallback: boolean }}
 */
export function applyFeedFilters(pets, {
  species,
  size,
  cityText = '',
  radiusKm = null,
  hideOwnerId = null,
} = {}) {
  const list = Array.isArray(pets) ? pets : [];

  const base = list.filter((pet) => {
    if (hideOwnerId && pet.owner_id === hideOwnerId) return false;
    if (species && pet.species !== species) return false;
    if (size && pet.size !== size) return false;
    return true;
  });

  const originName = normalizePlaceText(cityText);
  if (!originName) return { pets: base, locationFallback: false };

  const originCoords = lookupCityCoordsByName(cityText);
  const radiusActive = Boolean(radiusKm && originCoords);

  const localized = base.filter((pet) => {
    if (normalizePlaceText(pet.city) === originName) return true;
    if (!radiusActive) return false;
    const petCoords = resolvePetCoords(pet);
    if (!petCoords) return false;
    return haversineKm(originCoords, petCoords) <= radiusKm;
  });

  if (localized.length > 0) return { pets: localized, locationFallback: false };
  if (base.length > 0) return { pets: base, locationFallback: true };
  return { pets: [], locationFallback: false };
}
