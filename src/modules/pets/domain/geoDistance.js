/**
 * Filtro de raio aproximado para o Feed — sem geocoding real (nenhuma API
 * paga/chave necessária). `pets` só guarda `city`/`state` como texto, então
 * usamos uma tabela estática das capitais + principais regiões
 * metropolitanas do Brasil (coordenadas aproximadas do centro da cidade,
 * não endereço exato) e a fórmula de haversine.
 *
 * Limitação conhecida (documentada em `docs/ROADMAP.md`): cidades fora
 * desta tabela não entram no cálculo de distância. Com um raio ativo, pets
 * dessas cidades só aparecem quando estão na própria cidade de origem da
 * busca (comparação de texto normalizada — ver `filterPetsByRadius`);
 * cobertura completa exigiria geocoding real (API ou base completa de
 * municípios) + geohash no Firestore.
 */

// [latitude, longitude] aproximados do centro da cidade.
const BR_CITY_COORDS = {
  'rio branco|ac': [-9.97, -67.81],
  'maceio|al': [-9.65, -35.71],
  'macapa|ap': [0.03, -51.05],
  'manaus|am': [-3.10, -60.02],
  'salvador|ba': [-12.97, -38.51],
  'feira de santana|ba': [-12.27, -38.97],
  'vitoria da conquista|ba': [-14.86, -40.84],
  'fortaleza|ce': [-3.72, -38.54],
  'caucaia|ce': [-3.74, -38.65],
  'brasilia|df': [-15.78, -47.93],
  'vitoria|es': [-20.32, -40.34],
  'vila velha|es': [-20.33, -40.29],
  'serra|es': [-20.13, -40.31],
  'goiania|go': [-16.68, -49.25],
  'aparecida de goiania|go': [-16.82, -49.24],
  'sao luis|ma': [-2.53, -44.30],
  'cuiaba|mt': [-15.60, -56.10],
  'campo grande|ms': [-20.44, -54.65],
  'belo horizonte|mg': [-19.92, -43.94],
  'uberlandia|mg': [-18.92, -48.28],
  'contagem|mg': [-19.93, -44.05],
  'juiz de fora|mg': [-21.76, -43.35],
  'betim|mg': [-19.97, -44.20],
  'uberaba|mg': [-19.75, -47.93],
  'belem|pa': [-1.46, -48.50],
  'ananindeua|pa': [-1.37, -48.37],
  'joao pessoa|pb': [-7.12, -34.86],
  'curitiba|pr': [-25.43, -49.27],
  'londrina|pr': [-23.31, -51.16],
  'maringa|pr': [-23.42, -51.94],
  'ponta grossa|pr': [-25.10, -50.16],
  'cascavel|pr': [-24.96, -53.46],
  'recife|pe': [-8.05, -34.90],
  'jaboatao dos guararapes|pe': [-8.11, -35.01],
  'olinda|pe': [-8.01, -34.86],
  'caruaru|pe': [-8.28, -35.98],
  'teresina|pi': [-5.09, -42.80],
  'rio de janeiro|rj': [-22.91, -43.17],
  'niteroi|rj': [-22.88, -43.10],
  'duque de caxias|rj': [-22.79, -43.31],
  'nova iguacu|rj': [-22.76, -43.45],
  'sao goncalo|rj': [-22.83, -43.05],
  'campos dos goytacazes|rj': [-21.75, -41.33],
  'natal|rn': [-5.79, -35.21],
  'porto alegre|rs': [-30.03, -51.23],
  'caxias do sul|rs': [-29.17, -51.18],
  'pelotas|rs': [-31.77, -52.34],
  'canoas|rs': [-29.92, -51.18],
  'porto velho|ro': [-8.76, -63.90],
  'boa vista|rr': [2.82, -60.67],
  'florianopolis|sc': [-27.60, -48.55],
  'joinville|sc': [-26.30, -48.85],
  'blumenau|sc': [-26.92, -49.07],
  'sao jose|sc': [-27.61, -48.64],
  'sao paulo|sp': [-23.55, -46.63],
  'guarulhos|sp': [-23.46, -46.53],
  'campinas|sp': [-22.91, -47.06],
  'sao bernardo do campo|sp': [-23.69, -46.56],
  'santo andre|sp': [-23.66, -46.53],
  'osasco|sp': [-23.53, -46.79],
  'sao jose dos campos|sp': [-23.18, -45.88],
  'sorocaba|sp': [-23.50, -47.46],
  'ribeirao preto|sp': [-21.18, -47.81],
  'santos|sp': [-23.96, -46.33],
  'maua|sp': [-23.67, -46.46],
  'sao jose do rio preto|sp': [-20.82, -49.38],
  'diadema|sp': [-23.69, -46.62],
  'jundiai|sp': [-23.19, -46.89],
  'aracaju|se': [-10.91, -37.07],
  'palmas|to': [-10.18, -48.33],
};

/**
 * Normaliza texto de cidade para comparação: trim, minúsculas e sem acentos.
 * Exportado para o filtro do Feed comparar cidades digitadas livremente com
 * as gravadas nos pets ("São Paulo" ≡ "sao paulo " ≡ "SAO PAULO").
 */
export function normalizePlaceText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const norm = normalizePlaceText;

function normalizeKey(city, state) {
  return `${norm(city)}|${norm(state)}`;
}

// Índice só por nome de cidade (sem estado) — nenhum nome se repete na
// tabela acima, então é seguro usar quando só se tem o texto livre digitado
// pelo usuário no Feed (um único campo, sem UF separada).
const BY_NAME_ONLY = Object.fromEntries(
  Object.entries(BR_CITY_COORDS).map(([key, coords]) => [key.split('|')[0], coords]),
);

/** Retorna `[lat, lng]` da cidade conhecida (cidade + UF exatos), ou `null` se fora da tabela. */
export function lookupCityCoords(city, state) {
  return BR_CITY_COORDS[normalizeKey(city, state)] || null;
}

/**
 * Coordenadas de um pet, com tolerância a dados incompletos: tenta
 * cidade+UF e, se a UF estiver vazia/errada, cai para a busca só por nome
 * (segura porque nenhum nome se repete na tabela).
 */
export function resolvePetCoords(pet) {
  return lookupCityCoords(pet?.city, pet?.state) || lookupCityCoordsByName(pet?.city);
}

/**
 * Mesma busca, mas só pelo nome da cidade (sem UF) — para o campo de texto
 * livre do Feed, que não tem um seletor de estado separado.
 */
export function lookupCityCoordsByName(cityText) {
  return BY_NAME_ONLY[norm(cityText)] || null;
}

/** Distância aproximada em km entre duas coordenadas (fórmula de haversine). */
export function haversineKm([lat1, lng1], [lat2, lng2]) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** true se a cidade informada (só nome, texto livre) tem coordenadas conhecidas. */
export function hasKnownCoords(cityText) {
  return lookupCityCoordsByName(cityText) !== null;
}
