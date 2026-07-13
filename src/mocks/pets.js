/**
 * Mock · Pets e adoções.
 *
 * 12 pets variados (cães e gatos, portes, idades, cidades), com 4 adotados
 * (`adopted`) e 8 disponíveis (`available`). Vínculo com 2 ONGs (mock_org_001
 * e mock_org_002) e 1 usuário-pessoa (mock_usr_001).
 *
 * O `owner_id` pode ser:
 *  - o uid de um usuário pessoa-física (mock_usr_001);
 *  - o id de uma organização (mock_org_001/002), com `owner_type: 'organization'`.
 *
 * As `adoption_interests` partem de `mock_usr_002`–`mock_usr_010` (ou do
 * `REAL_USER_UID` para o usuário real da plataforma), sempre com
 * `user_id === auth.uid` (regra do Firestore). Para o seed funcionar com
 * o usuário real como ator, as interests do usuário real são as únicas
 * escritas pelo próprio ator — as outras são registradas com
 * `user_id === REAL_USER_UID` em nome dos "outros adotantes" (regra
 * do Firestore exige isso). O mockDataService ajusta isso em runtime.
 */

import { MOCK_PET_PREFIX, MOCK_INTEREST_PREFIX, MOCK_RATING_PREFIX, mockMeta, daysAgoMs, daysAgoIso } from './constants.js';
import { MOCK_USER_IDS } from './users.js';
import { MOCK_CLUB_IDS } from './clubs.js';

const _id = (n) => `${MOCK_PET_PREFIX}${String(n).padStart(3, '0')}`;
const _intId = (petN, userN) => `${MOCK_INTEREST_PREFIX}${String(petN).padStart(3, '0')}_${String(userN).padStart(3, '0')}`;
const _ratId = (n) => `${MOCK_RATING_PREFIX}${String(n).padStart(3, '0')}`;

const pets = [
  // ── mock_org_001 (Patinhas do Bem) ──
  {
    n: 1, title: 'Bolinha', species: 'dog', size: 'medium', age_group: 'adult', gender: 'male',
    city: 'São Paulo', state: 'SP', owner: 'club:mock_org_001', status: 'available',
    description: 'Cachorro dócil, castrado, vacinado. Convive bem com crianças e outros cães. Foi resgatado das ruas em 2023.',
    health_notes: 'Castrado, vacinado, vermifugado. Pequena sequela em pata traseira direita (não limita).',
    needs_yard: false, needs_screened_apt: false, good_with_kids: true, good_with_dogs: true, good_with_cats: false,
    days: 75,
  },
  {
    n: 2, title: 'Luna', species: 'dog', size: 'small', age_group: 'puppy', gender: 'female',
    city: 'São Paulo', state: 'SP', owner: 'club:mock_org_001', status: 'available',
    description: 'Filhote de 4 meses, extremamente carinhosa. Aprende rápido, ideal para família com crianças.',
    health_notes: 'Primeira dose de vacina V10 tomada. Vermifugada.',
    needs_yard: false, needs_screened_apt: true, good_with_kids: true, good_with_dogs: true, good_with_cats: true,
    days: 18,
  },
  {
    n: 3, title: 'Thor', species: 'dog', size: 'large', age_group: 'senior', gender: 'male',
    city: 'São Paulo', state: 'SP', owner: 'club:mock_org_001', status: 'in_process',
    description: 'Sênior de 11 anos, calmo, companheiro. Precisa de pessoa com rotina tranquila.',
    health_notes: 'Cardiopatia leve controlada com medicação diária. Exames recentes em ordem.',
    needs_yard: false, needs_screened_apt: true, good_with_kids: true, good_with_dogs: true, good_with_cats: true,
    days: 220,
  },
  {
    n: 4, title: 'Mia', species: 'cat', size: 'small', age_group: 'adult', gender: 'female',
    city: 'São Paulo', state: 'SP', owner: 'club:mock_org_001', status: 'available',
    description: 'Gata independente, ideal para apartamento. Não gosta de colo, mas adora ficar perto.',
    health_notes: 'Castrada, vacinada, testada negativa para FIV/FeLV.',
    needs_yard: false, needs_screened_apt: false, good_with_kids: false, good_with_dogs: false, good_with_cats: true,
    days: 45,
  },
  {
    n: 5, title: 'Pipoca', species: 'dog', size: 'mini', age_group: 'puppy', gender: 'male',
    city: 'São Paulo', state: 'SP', owner: 'club:mock_org_001', status: 'adopted',
    description: 'Filhote de 3 meses (SRD), pelagem clara. Adotado pela Marina (mock_usr_001).',
    health_notes: 'Vacinas em dia.',
    needs_yard: false, needs_screened_apt: false, good_with_kids: true, good_with_dogs: true, good_with_cats: true,
    days: 380,
    adopted_by: 'mock_usr_001',
    adopted_at_days: 12,
  },

  // ── mock_org_002 (Bigodes do Rio) ──
  {
    n: 6, title: 'Fumaça', species: 'cat', size: 'small', age_group: 'senior', gender: 'male',
    city: 'Rio de Janeiro', state: 'RJ', owner: 'club:mock_org_002', status: 'available',
    description: 'Gato FIV+ de 9 anos. Precisa de lar com outro gato FIV+ ou sem outros gatos.',
    health_notes: 'FIV+, estável. Medicação preventiva trimestral.',
    needs_yard: false, needs_screened_apt: true, good_with_kids: false, good_with_dogs: false, good_with_cats: true,
    days: 160,
  },
  {
    n: 7, title: 'Belinha', species: 'cat', size: 'small', age_group: 'adult', gender: 'female',
    city: 'Rio de Janeiro', state: 'RJ', owner: 'club:mock_org_002', status: 'available',
    description: 'Gata de 3 anos, muito carinhosa, FIV+ e FeLV+. Precisa de lar preparado.',
    health_notes: 'FIV+ e FeLV+. Hemograma recente estável.',
    needs_yard: false, needs_screened_apt: true, good_with_kids: false, good_with_dogs: false, good_with_cats: true,
    days: 95,
  },
  {
    n: 8, title: 'Simba', species: 'cat', size: 'small', age_group: 'puppy', gender: 'male',
    city: 'Rio de Janeiro', state: 'RJ', owner: 'club:mock_org_002', status: 'available',
    description: 'Filhote de 5 meses, brincalhão, saudável. Testado negativo para FIV/FeLV.',
    health_notes: 'Castrado, vacinado, vermifugado.',
    needs_yard: false, needs_screened_apt: false, good_with_kids: true, good_with_dogs: true, good_with_cats: true,
    days: 28,
  },

  // ── mock_org_003 (Caramelo BH) ──
  {
    n: 9, title: 'Rex', species: 'dog', size: 'giant', age_group: 'senior', gender: 'male',
    city: 'Belo Horizonte', state: 'MG', owner: 'club:mock_org_003', status: 'available',
    description: 'Fila brasileiro, 8 anos, extremamente dócil. Resgatado de situação de maus-tratos.',
    health_notes: 'Castrado, vacinado. Artrose leve em quadril — controle com condroitina.',
    needs_yard: true, needs_screened_apt: false, good_with_kids: true, good_with_dogs: true, good_with_cats: false,
    days: 130,
  },
  {
    n: 10, title: 'Nina', species: 'dog', size: 'large', age_group: 'adult', gender: 'female',
    city: 'Belo Horizonte', state: 'MG', owner: 'club:mock_org_003', status: 'available',
    description: 'Cadela de 5 anos, ativa, ideal para casa com quintal grande. Adora correr.',
    health_notes: 'Castrada, vacinada. Sem restrições.',
    needs_yard: true, needs_screened_apt: false, good_with_kids: true, good_with_dogs: true, good_with_cats: false,
    days: 60,
  },
  {
    n: 11, title: 'Caramelo', species: 'dog', size: 'medium', age_group: 'puppy', gender: 'male',
    city: 'Belo Horizonte', state: 'MG', owner: 'club:mock_org_003', status: 'adopted',
    description: 'Filhote que deu nome ao abrigo. Adotado há 6 meses.',
    health_notes: 'Vacinas em dia.',
    needs_yard: false, needs_screened_apt: false, good_with_kids: true, good_with_dogs: true, good_with_cats: true,
    days: 200,
    adopted_by: 'mock_usr_004',
    adopted_at_days: 180,
  },

  // ── mock_usr_001 (pessoa física — Marina) ──
  {
    n: 12, title: 'Spike', species: 'rabbit', size: 'small', age_group: 'adult', gender: 'male',
    city: 'São Paulo', state: 'SP', owner: 'user:mock_usr_001', status: 'available',
    description: 'Coelho anão, 2 anos, castrado. Doe-me motivo de mudança para apartamento menor.',
    health_notes: 'Castrado, vacinado.',
    needs_yard: false, needs_screened_apt: true, good_with_kids: true, good_with_dogs: false, good_with_cats: true,
    days: 30,
  },
];

const ownerResolve = (owner) => {
  if (owner.startsWith('club:')) {
    return { owner_id: owner.slice(5), owner_type: 'organization' };
  }
  return { owner_id: owner.slice(5), owner_type: 'user' };
};

export const mockPets = pets.map((p) => {
  const id = _id(p.n);
  const own = ownerResolve(p.owner);
  const baseDays = p.days;
  return {
    id,
    data: {
      title: p.title,
      species: p.species,
      size: p.size,
      age_group: p.age_group,
      gender: p.gender,
      city: p.city,
      state: p.state,
      status: p.status,
      description: p.description,
      health_notes: p.health_notes,
      needs_yard: p.needs_yard,
      needs_screened_apt: p.needs_screened_apt,
      good_with_kids: p.good_with_kids,
      good_with_dogs: p.good_with_dogs,
      good_with_cats: p.good_with_cats,
      photos: [],
      adoption_form_url: '',
      owner_id: own.owner_id,
      owner_type: own.owner_type,
      ...(p.status === 'adopted' && p.adopted_by
        ? { adopted_by: p.adopted_by, adopted_at: daysAgoIso(p.adopted_at_days), adopted_at_ms: daysAgoMs(p.adopted_at_days) }
        : {}),
      priority_score: Math.min(3, Math.floor(baseDays / 90)),
      created_at: daysAgoIso(baseDays),
      created_at_ms: daysAgoMs(baseDays),
      updated_at: daysAgoIso(Math.max(1, baseDays - 3)),
      ...mockMeta({ kind: 'pet', name: p.title }),
    },
  };
});

/* ============================================================== *
 * Adoption interests — 6 applications distribuídas em pets.       *
 * O `user_id` aqui é SEMPRE o `REAL_USER_UID` (regra Firestore).   *
 * ============================================================== */
const interests = [
  { petN: 1, userN: 1, status: 'pending', days: 2, note: 'Marina quer adotar Bolinha, conhece o abrigo.' },
  { petN: 2, userN: 2, status: 'pending', days: 1, note: 'Rafael e esposa, primeiro contato com a Luna.' },
  { petN: 4, userN: 5, status: 'pending', days: 4, note: 'Beatriz tem experiência com gatos independentes.' },
  { petN: 6, userN: 7, status: 'pending', days: 1, note: 'Patrícia (veterinária) pode dar suporte clínico a Fumaça.' },
  { petN: 8, userN: 9, status: 'pending', days: 3, note: 'Fernanda quer companhia pro apartamento.' },
  { petN: 10, userN: 8, status: 'pending', days: 2, note: 'Família do Diego tem quintal grande e 3 crianças.' },
];

export const mockAdoptionInterests = interests.map((i, idx) => {
  const id = _intId(i.petN, i.userN);
  const pet = pets.find((p) => p.n === i.petN);
  const userKey = Object.keys(MOCK_USER_IDS)[i.userN - 1];
  const userId = MOCK_USER_IDS[userKey];
  return {
    id,
    data: {
      pet_id: _id(i.petN),
      user_id: 'REAL_USER_UID', // será substituído em runtime
      user_name: 'REAL_USER_NAME',
      user_photo: '',
      status: i.status,
      form_answers: {
        motivation: i.note,
        experience: i.userN === 7 ? 'Tenho experiência clínica com FIV+' : 'Primeira adoção',
      },
      created_at: daysAgoIso(i.days),
      created_at_ms: daysAgoMs(i.days),
      updated_at: daysAgoIso(i.days),
      pet_title: pet.title,
      pet_species: pet.species,
      pet_city: pet.city,
      pet_state: pet.state,
      ...mockMeta({ kind: 'adoption_interest', pet_id: _id(i.petN), user_id_mock: userId }),
    },
  };
});

/* ============================================================== *
 * Avaliações pós-adoção — 2 ratings, ambos pelo "adotante"        *
 * (que é o user_id real no Firestore).                            *
 * ============================================================== */
const ratings = [
  { n: 1, ratedUid: MOCK_USER_IDS['Marina Castro'], raterUid: MOCK_CLUB_IDS['Instituto Patinhas do Bem'], rating: 5, comment: 'Adoção responsável, follow-ups em dia. Excelente adotante.' },
  { n: 2, ratedUid: MOCK_USER_IDS['Lucas Almeida'], raterUid: MOCK_CLUB_IDS['Casa do cão Caramelo'], rating: 5, comment: 'Família engajada. Enviou fotos e vídeos no primeiro mês.' },
];

export const mockAdoptionRatings = ratings.map((r) => ({
  id: _ratId(r.n),
  data: {
    rated_uid: r.ratedUid,
    rater_uid: r.raterUid, // será substituído para REAL_USER_UID (o admin age em nome da ONG) — ver service
    rating: r.rating,
    comment: r.comment,
    created_at: daysAgoIso(45),
    created_at_ms: daysAgoMs(45),
    ...mockMeta({ kind: 'adoption_rating' }),
  },
}));

export const MOCK_PET_IDS = Object.freeze(
  pets.reduce((acc, p) => {
    acc[p.title] = _id(p.n);
    return acc;
  }, {})
);

export default mockPets;
