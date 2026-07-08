/**
 * @fileoverview Filtros do Feed de pets — lógica pura, aplicada client-side.
 *
 * O serviço `petService.getAvailablePets` busca os pets disponíveis com UMA
 * única forma de query no Firestore (status + created_at, coberta por índice
 * existente); espécie, porte, cidade e raio são aplicados aqui. Isso elimina
 * a matriz de índices compostos por combinação de filtro (que já derrubou o
 * feed com `failed-precondition`) e torna os filtros instantâneos.
 *
 * Toda a função é pura — recebe a lista e retorna `{ pets, locationFallback }`,
 * sem efeitos colaterais, sem estado, sem rede. Coberta por testes em
 * `feedFilters.test.js`.
 */

import {
  lookupCityCoordsByName,
  filterByRadius,
  normalizePlaceText,
} from './geoDistance';

/**
 * Aplica os filtros do Feed sobre a lista completa de pets disponíveis.
 *
 * Regra de localização:
 *  - cidade com coordenadas conhecidas + raio ativo → mantém pets com
 *    coordenadas resolvíveis dentro do raio E pets sem coordenadas cuja
 *    cidade normalizada é a própria cidade buscada (nunca descarta às cegas
 *    um pet cadastrado na cidade em que se busca);
 *  - cidade sem coordenadas conhecidas (ou raio desligado) → comparação de
 *    texto normalizada (caixa/acentos/espaços não importam).
 *
 * Fallback de localização: se o filtro de cidade/raio zerar a lista mas
 * ainda existirem pets que passam nos demais filtros (espécie/porte/dono),
 * retorna esses pets com `locationFallback: true`. O feed nunca fica vazio
 * por causa de localização enquanto houver pets cadastrados.
 *
 * @param {Array<object>} pets                    Lista de pets disponíveis (já carregada).
 * @param {object} [options]
 * @param {string} [options.species]              'dog' | 'cat' | 'rabbit' | etc. Vazio = qualquer.
 * @param {string} [options.size]                 'mini' | 'small' | 'medium' | 'large' | 'giant'. Vazio = qualquer.
 * @param {string} [options.cityText]             Texto livre digitado pelo usuário.
 * @param {number|null} [options.radiusKm]        Raio em km. `null`/vazio = sem filtro de raio.
 * @param {string|null} [options.hideOwnerId]     UID a ser ocultado (pets do próprio usuário).
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

  // 1) Filtros estruturais (sempre ativos quando preenchidos).
  const base = list.filter((pet) => {
    if (hideOwnerId && pet.owner_id === hideOwnerId) return false;
    if (species && pet.species !== species) return false;
    if (size && pet.size !== size) return false;
    return true;
  });

  // 2) Filtro de localização (só faz sentido se o usuário digitou uma cidade).
  const originName = normalizePlaceText(cityText);
  if (!originName) return { pets: base, locationFallback: false };

  const originCoords = lookupCityCoordsByName(cityText);
  const radiusActive = Boolean(radiusKm && originCoords);

  const localized = radiusActive
    ? (filterByRadius(base, originCoords, radiusKm, cityText) ?? [])
    : base.filter((pet) => normalizePlaceText(pet.city) === originName);

  if (localized.length > 0) return { pets: localized, locationFallback: false };

  // 3) Fallback: localização zerou a lista, mas há pets compatíveis nos
  //    demais filtros — devolve esses para o feed não ficar vazio.
  if (base.length > 0) return { pets: base, locationFallback: true };
  return { pets: [], locationFallback: false };
}