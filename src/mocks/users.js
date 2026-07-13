/**
 * Mock · Usuários (perfis em `users/{uid}` e `athlete_profiles/{uid}`).
 *
 * Os IDs são prefixados com `mock_usr_` (constante) e referenciados de forma
 * cruzada por `club_members`, `adoption_interests`, `notifications` etc.
 *
 * O campo `email` é determinístico (`mock_usr_001@viralata.demo` etc.) para que
 * a página de admin possa listar os usuários de demo sem ambiguidade.
 *
 * Importante: a aplicação real exige Firebase Auth; o login de cada mock user
 * NÃO é provisionado aqui. Os uids servem apenas para referenciar quem fez o
 * quê dentro de outros documentos. O usuário "real" (você, o admin da
 * plataforma) é o ator das escritas — ver `src/mocks/mockDataService.js` para
 * o mapeamento uid real → uid mock.
 */

import { MOCK_USER_PREFIX, MOCK_ID_PREFIX, mockMeta, daysAgoMs, daysAgoIso } from './constants.js';

const _id = (n) => `${MOCK_USER_PREFIX}${String(n).padStart(3, '0')}`;

const baseProfile = {
  profile_completed: true,
  role: 'user',
  phone_public: false,
  email_public: false,
  directory_listed: true,
  housing_type: 'house_with_yard',
  has_yard: true,
  daily_walks: 'long',
  has_children: false,
  has_elderly: false,
  other_pets: [],
  budget_level: 'moderate',
};

const profiles = [
  {
    n: 1,
    name: 'Marina Castro',
    city: 'São Paulo',
    state: 'SP',
    housing: 'house_with_yard',
    walks: 'long',
    budget: 'moderate',
    bio: 'Apartamento amplo com quintal seguro. Trabalho home office, tenho muito tempo para o animal.',
    children: true,
    childrenAges: '4, 7',
  },
  {
    n: 2,
    name: 'Rafael Monteiro',
    city: 'Rio de Janeiro',
    state: 'RJ',
    housing: 'apartment_screened',
    walks: 'moderate',
    budget: 'basic',
    bio: 'Casal jovem, primeira adoção. Estamos lendo tudo sobre adaptação.',
  },
  {
    n: 3,
    name: 'Camila Ferreira',
    city: 'Belo Horizonte',
    state: 'MG',
    housing: 'house_no_yard',
    walks: 'long',
    budget: 'high',
    bio: 'Tenho uma cadela idosa (12 anos) que precisa de companhia calma. Procuro animal tranquilo.',
    pets: ['cachorro idoso'],
  },
  {
    n: 4,
    name: 'Lucas Almeida',
    city: 'Curitiba',
    state: 'PR',
    housing: 'farm',
    walks: 'long',
    budget: 'high',
    bio: 'Sítio de 5 alqueires. Posso oferecer espaço, mas preciso de animal sociável com crianças.',
    children: true,
    childrenAges: '2, 5, 9',
    pets: ['2 cachorros', 'galinhas'],
  },
  {
    n: 5,
    name: 'Beatriz Souza',
    city: 'Porto Alegre',
    state: 'RS',
    housing: 'apartment_unscreened',
    walks: 'short',
    budget: 'basic',
    bio: 'Apegada, paciente. Tenho experiência com gatos especiais (FIV+).',
    pets: ['1 gato FIV+'],
  },
  {
    n: 6,
    name: 'André Nakamura',
    city: 'Florianópolis',
    state: 'SC',
    housing: 'apartment_screened',
    walks: 'moderate',
    budget: 'moderate',
    bio: 'Voluntário há 3 anos. Adotante de 2 gatos resgatados.',
    pets: ['2 gatos'],
  },
  {
    n: 7,
    name: 'Patrícia Lima',
    city: 'Salvador',
    state: 'BA',
    housing: 'house_with_yard',
    walks: 'long',
    budget: 'high',
    bio: 'Veterinária, especialista em felinos. Posso dar suporte clínico a animais com necessidades especiais.',
  },
  {
    n: 8,
    name: 'Diego Oliveira',
    city: 'Recife',
    state: 'PE',
    housing: 'house_with_yard',
    walks: 'long',
    budget: 'moderate',
    bio: 'Família com 3 crianças. Procuramos cachorro dócil e brincalhão.',
    children: true,
    childrenAges: '3, 6, 10',
  },
  {
    n: 9,
    name: 'Fernanda Rocha',
    city: 'Brasília',
    state: 'DF',
    housing: 'apartment_screened',
    walks: 'moderate',
    budget: 'moderate',
    bio: 'Trabalho fora, mas com rotina estável. Procuro gato independente.',
  },
  {
    n: 10,
    name: 'Gustavo Pereira',
    city: 'Fortaleza',
    state: 'CE',
    housing: 'house_with_yard',
    walks: 'long',
    budget: 'high',
    bio: 'Engajado em causas animais, faço doações regulares a abrigos.',
  },
];

/** Gera a coleção `users/{uid}` no shape do `DATA_MODEL.md`. */
export const mockUsers = profiles.map((p, idx) => {
  const uid = _id(p.n);
  const days = 30 + idx * 4;
  return {
    id: uid,
    data: {
      email: `${MOCK_ID_PREFIX}${uid}@viralata.demo`,
      platform_name: p.name,
      full_name: p.name,
      phone: `119${String(900000000 + idx * 137).slice(-8)}`,
      photo_url: '',
      city: p.city,
      state: p.state,
      profile_completed: true,
      role: 'user',
      housing_type: p.housing,
      has_yard: p.housing === 'house_with_yard' || p.housing === 'farm',
      daily_walks: p.walks,
      has_children: Boolean(p.children),
      children_ages: p.childrenAges || '',
      has_elderly: false,
      other_pets: p.pets || [],
      budget_level: p.budget,
      phone_public: idx % 3 === 0,
      email_public: false,
      bio: p.bio,
      directory_listed: true,
      created_at: daysAgoIso(days),
      created_at_ms: daysAgoMs(days),
      updated_at: daysAgoIso(Math.max(1, days - 7)),
      ...mockMeta({ kind: 'user', name: p.name }),
    },
  };
});

/** Projeção pública (`athlete_profiles/{uid}`) — apenas o que o diretório
 *  mostra (telefone/e-mail só se marcados como públicos). */
export const mockAthleteProfiles = mockUsers.map(({ id, data }) => ({
  id,
  data: {
    uid: id,
    full_name: data.full_name,
    platform_name: data.platform_name,
    city: data.city,
    state: data.state,
    photo_url: data.photo_url,
    bio: data.bio,
    directory_listed: data.directory_listed,
    phone: data.phone_public ? data.phone : '',
    email: data.email_public ? data.email : '',
    housing_type: data.housing_type,
    has_yard: data.has_yard,
    daily_walks: data.daily_walks,
    has_children: data.has_children,
    children_ages: data.children_ages,
    other_pets: data.other_pets,
    budget_level: data.budget_level,
    created_at: data.created_at,
    created_at_ms: data.created_at_ms,
    updated_at: data.updated_at,
    ...mockMeta({ kind: 'athlete_profile' }),
  },
}));

/** Lookup auxiliar — útil em outros arquivos de mock para referenciar. */
export const MOCK_USER_IDS = Object.freeze(
  mockUsers.reduce((acc, { id, data }) => {
    acc[data.platform_name] = id;
    return acc;
  }, {})
);

export default mockUsers;
