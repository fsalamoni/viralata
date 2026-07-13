/**
 * Mock · Membros de ONG, de comunidade, eventos, mural, fórum, financeiro.
 *
 *  - `club_members`: owner + 1 admin + 1-2 membros por ONG
 *  - `community_members`: owner + 1-2 membros por comunidade
 *  - `club_events`: 1-2 eventos por ONG
 *  - `club_posts`: 1-2 posts por ONG
 *  - `club_post_likes` e `club_post_comments`: 1-2 interações
 *  - `club_forum_threads`: 1 thread por ONG + comentário + 1 poll vote
 *  - `club_donations` (v2): 1-2 campanhas por ONG
 *  - `club_campaigns` (legado): 1 campanha por ONG
 *  - `club_ledger`: 5-6 lançamentos por ONG
 *  - `club_ledger_categories`: 2-3 categorias customizadas
 *  - `community_posts`: 2 posts por comunidade + likes + comentários
 *  - `community_events`: 1 evento por comunidade
 *
 * O `author_id`/`created_by`/`user_id` em posts/eventos sempre será
 * `REAL_USER_UID` em runtime (regra do Firestore), mas o `user_name` aponta
 * para o nome do ator real (cache desnormalizado).
 */

import {
  MOCK_EVENT_PREFIX, MOCK_POST_PREFIX, MOCK_FORUM_PREFIX,
  MOCK_CAMPAIGN_PREFIX, MOCK_DONATION_PREFIX, MOCK_LEDGER_PREFIX,
  MOCK_COMMUNITY_POST_PREFIX,
  mockMeta, daysAgoMs, daysAgoIso,
} from './constants.js';
import { MOCK_USER_IDS } from './users.js';
import { MOCK_CLUB_IDS, MOCK_COMMUNITY_IDS } from './clubs.js';
import { MOCK_PET_IDS } from './pets.js';

const _eid = (n) => `${MOCK_EVENT_PREFIX}${String(n).padStart(3, '0')}`;
const _pid = (n) => `${MOCK_POST_PREFIX}${String(n).padStart(3, '0')}`;
const _fid = (n) => `${MOCK_FORUM_PREFIX}${String(n).padStart(3, '0')}`;
const _cid = (n) => `${MOCK_CAMPAIGN_PREFIX}${String(n).padStart(3, '0')}`;
const _did = (n) => `${MOCK_DONATION_PREFIX}${String(n).padStart(3, '0')}`;
const _lid = (n) => `${MOCK_LEDGER_PREFIX}${String(n).padStart(3, '0')}`;
const _cpid = (n) => `${MOCK_COMMUNITY_POST_PREFIX}${String(n).padStart(3, '0')}`;

const MARINA = MOCK_USER_IDS['Marina Castro'];
const RAFAEL = MOCK_USER_IDS['Rafael Monteiro'];
const CAMILA = MOCK_USER_IDS['Camila Ferreira'];
const LUCAS = MOCK_USER_IDS['Lucas Almeida'];
const BEATRIZ = MOCK_USER_IDS['Beatriz Souza'];
const ANDRE = MOCK_USER_IDS['André Nakamura'];
const PATRICIA = MOCK_USER_IDS['Patrícia Lima'];
const DIEGO = MOCK_USER_IDS['Diego Oliveira'];
const FERNANDA = MOCK_USER_IDS['Fernanda Rocha'];
const GUSTAVO = MOCK_USER_IDS['Gustavo Pereira'];

const CLB1 = MOCK_CLUB_IDS['Instituto Patinhas do Bem'];
const CLB2 = MOCK_CLUB_IDS['Associação Bigodes do Rio'];
const CLB3 = MOCK_CLUB_IDS['Casa do cão Caramelo'];
const COM1 = MOCK_COMMUNITY_IDS['Proteção Animal — Sudeste'];
const COM2 = MOCK_COMMUNITY_IDS['Cuidadores e Lares Temporários'];

/* ============================================================== *
 * 1. Club members (3 clubes × ~3 membros)                         *
 * ============================================================== */
const memberSpec = [
  // [clubId, userKey, role, daysAgo, permissions?]
  [CLB1, 'Camila Ferreira', 'admin', 200],
  [CLB1, 'Lucas Almeida', 'member', 150, ['feed']],
  [CLB1, 'Gustavo Pereira', 'member', 80, ['donations', 'feed']],
  [CLB2, 'Patrícia Lima', 'admin', 180],
  [CLB2, 'André Nakamura', 'member', 120, ['feed', 'team']],
  [CLB2, 'Beatriz Souza', 'member', 60, ['animals', 'feed']],
  [CLB3, 'Lucas Almeida', 'admin', 170],
  [CLB3, 'Diego Oliveira', 'member', 90, ['animals', 'finance']],
];

export const mockClubMembers = memberSpec.map((m, idx) => {
  const [clubId, userKey, role, days, permissions] = m;
  const userId = MOCK_USER_IDS[userKey];
  const data = {
    club_id: clubId,
    user_id: userId,
    user_name: userKey,
    user_email: `${userId}@viralata.demo`,
    photo_url: '',
    role,
    joined_at: daysAgoIso(days),
    joined_at_ms: daysAgoMs(days),
    ...(role === 'member' ? { title: userKey.includes('Camila') ? 'Coordenadora de adoções' : 'Voluntário(a)' } : {}),
    ...mockMeta({ kind: 'club_member', club_id: clubId, user_id: userId }),
  };
  if (Array.isArray(permissions) && permissions.length) {
    data.permissions = permissions.reduce((acc, k) => ({ ...acc, [k]: true }), {});
  }
  return {
    id: `${clubId}_${userId}`,
    data,
  };
});

/* ============================================================== *
 * 2. Community members (2 comunidades × ~3 membros)                *
 * ============================================================== */
const communityMemberSpec = [
  [COM1, 'André Nakamura', 'admin', 200],
  [COM1, 'Marina Castro', 'member', 100],
  [COM1, 'Rafael Monteiro', 'member', 80],
  [COM1, 'Gustavo Pereira', 'member', 40],
  [COM2, 'Camila Ferreira', 'admin', 150],
  [COM2, 'Patrícia Lima', 'member', 90],
  [COM2, 'Beatriz Souza', 'member', 60],
  [COM2, 'Fernanda Rocha', 'member', 30],
];

export const mockCommunityMembers = communityMemberSpec.map((m) => {
  const [communityId, userKey, role, days] = m;
  const userId = MOCK_USER_IDS[userKey];
  return {
    id: `${communityId}_${userId}`,
    data: {
      community_id: communityId,
      user_id: userId,
      user_name: userKey,
      role,
      joined_at: daysAgoIso(days),
      joined_at_ms: daysAgoMs(days),
      last_seen: daysAgoIso(Math.max(0, days - 30)),
      ...mockMeta({ kind: 'community_member', community_id: communityId, user_id: userId }),
    },
  };
});

/* ============================================================== *
 * 3. Club events (5 eventos distribuídos pelas 3 ONGs)            *
 * ============================================================== */
const eventSpec = [
  { n: 1, club: CLB1, title: 'Mutirão de Adoção — Parque Villa-Lobos', type: 'adoption_fair', days: 14, location: 'Parque Villa-Lobos, São Paulo', desc: 'Estaremos com 12 cães e 8 gatos para adoção. Vacinação e castração gratuitas na hora.' },
  { n: 2, club: CLB1, title: 'Reunião mensal de voluntários', type: 'meeting', days: 5, location: 'Sede do Instituto', desc: 'Pauta: novos resgates, situação financeira, programa de lar temporário.' },
  { n: 3, club: CLB2, title: 'Adoção de felinos especiais — FIV+', type: 'adoption_fair', days: 21, location: 'Praça do Catete', desc: 'Evento voltado para adoção de gatos FIV+ e FeLV+. Equipe veterinária de plantão.' },
  { n: 4, club: CLB3, title: 'Bazar beneficente', type: 'social', days: 30, location: 'Sede do abrigo — Pampulha', desc: 'Bazar com produtos doados, toda a renda revertida para o abrigo.' },
  { n: 5, club: CLB3, title: 'Feira de adoção mensal', type: 'adoption_fair', days: 7, location: 'Praça da Liberdade', desc: 'Adoção de 6 cães resgatados recentemente. Documentação na hora.' },
];

export const mockClubEvents = eventSpec.map((e) => ({
  id: _eid(e.n),
  data: {
    club_id: e.club,
    title: e.title,
    description: e.desc,
    type: e.type,
    location: e.location,
    starts_at: daysAgoIso(-e.days), // no futuro
    starts_at_ms: daysAgoMs(-e.days),
    recurring: false,
    visibility: 'public',
    created_by: 'REAL_USER_UID',
    created_by_name: 'REAL_USER_NAME',
    created_at: daysAgoIso(e.days + 30),
    created_at_ms: daysAgoMs(e.days + 30),
    updated_at: daysAgoIso(e.days + 30),
    ...mockMeta({ kind: 'club_event', club_id: e.club, title: e.title }),
  },
}));

/* ============================================================== *
 * 4. Club posts (mural — 6 posts distribuídos pelas 3 ONGs)       *
 * ============================================================== */
const postSpec = [
  { n: 1, club: CLB1, title: 'Bolinha procura lar', content: 'Já temos 75 dias com o Bolinha. É um doce de cachorro, mas ninguém se interessou ainda. Castrado, vacinado, dócil. Por favor, divulguem.', days: 4, author: 'Camila Ferreira', allow_likes: true, allow_comments: true },
  { n: 2, club: CLB1, title: 'Obrigado aos voluntários de julho!', content: 'Mais um mês incrível. 14 adoções, 23 castrações, 8 resgates. Tudo isso só foi possível por vocês. ❤️', days: 9, author: 'REAL_USER_NAME', allow_likes: true, allow_comments: true },
  { n: 3, club: CLB1, title: 'Precisamos de lar temporário', content: 'Recebemos 4 filhotes na semana passada. Precisamos de lares temporários até completarem o protocolo de vacinação. Se puder ajudar, entre em contato.', days: 12, author: 'Camila Ferreira', allow_likes: true, allow_comments: true },
  { n: 4, club: CLB2, title: 'Fumaça e Belinha — gêmeos FIV+', content: 'Esses dois estão juntos desde o resgate. Seria ideal adotá-los em conjunto. Ambos testados, estáveis, em tratamento preventivo.', days: 18, author: 'Patrícia Lima', allow_likes: true, allow_comments: true },
  { n: 5, club: CLB3, title: 'Rex está melhor!', content: 'Nosso Fila brasileiro de 8 anos passou por nova avaliação. A artrose segue controlada. Agradecemos a todos que enviaram mensagens de apoio.', days: 25, author: 'Lucas Almeida', allow_likes: true, allow_comments: true },
  { n: 6, club: CLB3, title: 'Mutirão de castração gratuito', content: 'Em parceria com a Prefeitura de BH, vamos castrar até 50 cães de famílias de baixa renda. Inscrições abertas.', days: 35, author: 'REAL_USER_NAME', allow_likes: true, allow_comments: true },
];

export const mockClubPosts = postSpec.map((p) => {
  const authorId = p.author === 'REAL_USER_NAME' ? 'REAL_USER_UID' : MOCK_USER_IDS[p.author];
  const isAdminPost = p.author === 'REAL_USER_NAME' || p.author === 'Camila Ferreira' || p.author === 'Patrícia Lima' || p.author === 'Lucas Almeida';
  return {
    id: _pid(p.n),
    data: {
      club_id: p.club,
      author_id: authorId,
      author_name: p.author,
      title: p.title,
      content: p.content,
      attachments: [],
      images: [],
      allow_likes: p.allow_likes,
      allow_comments: p.allow_comments,
      allow_interaction: 'both',
      likes_count: Math.floor(Math.random() * 12) + 3,
      comments_count: 0, // atualizado depois
      pinned: p.n === 1,
      created_at: daysAgoIso(p.days),
      created_at_ms: daysAgoMs(p.days),
      updated_at: daysAgoIso(p.days),
      ...mockMeta({ kind: 'club_post', club_id: p.club }),
    },
  };
});

/* ============================================================== *
 * 5. Club post likes + comments                                   *
 * ============================================================== */
export const mockClubPostLikes = mockClubPosts.flatMap((p, idx) => {
  const likers = [MARINA, RAFAEL, BEATRIZ, ANDRE, DIEGO, FERNANDA, GUSTAVO, PATRICIA, CAMILA, LUCAS];
  const postDays = p.data.created_at_ms ? Math.max(0, (Date.now() - p.data.created_at_ms) / 86_400_000) : 0;
  return likers.slice(0, 3 + (idx % 4)).map((uid, i) => ({
    id: `${p.id}_${uid}`,
    data: {
      post_id: p.id,
      club_id: p.data.club_id,
      user_id: uid,
      created_at: daysAgoIso(Math.max(0, postDays - 1 - i)),
      ...mockMeta({ kind: 'club_post_like', post_id: p.id, user_id: uid }),
    },
  }));
});

const postComments = [
  { postN: 1, userKey: 'Marina Castro', text: 'Vou compartilhar nos meus grupos!', days: 3 },
  { postN: 1, userKey: 'André Nakamura', text: 'Que bonito, ele merece muito. Vou indicar.', days: 2 },
  { postN: 2, userKey: 'Gustavo Pereira', text: 'Vocês são demais. Orgulho de participar!', days: 8 },
  { postN: 3, userKey: 'Patrícia Lima', text: 'Posso pegar um filhote por 15 dias, me chama no direct.', days: 11 },
  { postN: 4, userKey: 'Fernanda Rocha', text: 'Que história linda, tomara que consigam um lar juntos.', days: 16 },
  { postN: 5, userKey: 'Beatriz Souza', text: 'Rex é um guerreiro. Bora divulgar!', days: 24 },
];

export const mockClubPostComments = postComments.map((c, idx) => {
  const post = mockClubPosts[c.postN - 1];
  return {
    id: `mock_pco_${String(idx + 1).padStart(3, '0')}`,
    data: {
      post_id: post.id,
      club_id: post.data.club_id,
      author_id: MOCK_USER_IDS[c.userKey],
      author_name: c.userKey,
      text: c.text,
      created_at: daysAgoIso(c.days),
      created_at_ms: daysAgoMs(c.days),
      updated_at: daysAgoIso(c.days),
      ...mockMeta({ kind: 'club_post_comment', post_id: post.id }),
    },
  };
});

/* ============================================================== *
 * 6. Club forum threads (3 threads)                               *
 * ============================================================== */
const forumSpec = [
  { n: 1, club: CLB1, title: 'Como melhorar a divulgação dos pets mais antigos?', body: 'Temos 3 cães há mais de 6 meses no abrigo. Quais estratégias de comunicação a comunidade usa para dar visibilidade a esses casos?', days: 20, comments: 2 },
  { n: 2, club: CLB2, title: 'Enquete: melhor forma de arrecadar ração?', body: 'Temos 3 opções. Vote na sua favorita. Resultados na próxima reunião.', days: 15, comments: 1, poll: ['Compra coletiva mensal', 'Parceria com pet shops', 'Doação por PIX recorrente'] },
  { n: 3, club: CLB3, title: 'Família com criança pequena pode adotar Fila?', body: 'Estou em contato com uma família interessada no Rex. Eles têm 2 crianças (5 e 9 anos). Fila com criança é uma boa ideia?', days: 10, comments: 3 },
];

export const mockForumThreads = forumSpec.map((f) => {
  const data = {
    club_id: f.club,
    title: f.title,
    body: f.body,
    author_id: 'REAL_USER_UID',
    author_name: 'REAL_USER_NAME',
    pinned: f.n === 1,
    participant_ids: ['REAL_USER_UID', MARINA, ANDRE, PATRICIA].slice(0, 2 + (f.n % 3)),
    comment_count: f.comments,
    likes_count: Math.floor(Math.random() * 8) + 2,
    created_at: daysAgoIso(f.days),
    created_at_ms: daysAgoMs(f.days),
    updated_at: daysAgoIso(Math.max(0, f.days - 5)),
    ...mockMeta({ kind: 'forum_thread', club_id: f.club }),
  };
  if (f.poll) {
    data.poll = {
      question: f.title,
      options: f.poll.map((label) => ({ label, votes: Math.floor(Math.random() * 8) + 1 })),
      closes_at: daysAgoIso(-7),
    };
  }
  return { id: _fid(f.n), data };
});

const forumComments = [
  { threadN: 1, userKey: 'Camila Ferreira', text: 'A gente fez uma campanha no TikTok que rendeu 8 adoções no mês passado. Funciona!', days: 19 },
  { threadN: 1, userKey: 'Gustavo Pereira', text: 'Instagram Reels com carrossel de antes-e-depois também ajuda muito.', days: 18 },
  { threadN: 2, userKey: 'Patrícia Lima', text: 'Prefiro PIX recorrente, é o que dá mais previsibilidade.', days: 14 },
  { threadN: 3, userKey: 'André Nakamura', text: 'Fila com criança só funciona se o cão for socializado desde filhote. Rex tem 8 anos e nunca conviveu com criança pequena, então exige cuidado.', days: 9 },
  { threadN: 3, userKey: 'Beatriz Souza', text: 'Sugiro uma visita supervisionada antes de qualquer decisão.', days: 8 },
  { threadN: 3, userKey: 'Lucas Almeida', text: 'Vou marcar a visita. Obrigado pelos conselhos!', days: 7 },
];

export const mockForumComments = forumComments.map((c, idx) => {
  const thread = mockForumThreads[c.threadN - 1];
  return {
    id: `mock_fc_${String(idx + 1).padStart(3, '0')}`,
    data: {
      club_id: thread.data.club_id,
      author_id: MOCK_USER_IDS[c.userKey],
      author_name: c.userKey,
      body: c.text,
      likes_count: Math.floor(Math.random() * 5),
      created_at: daysAgoIso(c.days),
      created_at_ms: daysAgoMs(c.days),
      ...mockMeta({ kind: 'forum_comment', thread_id: thread.id }),
    },
    threadId: thread.id,
  };
});

/* ============================================================== *
 * 7. Club campaigns (legado) e donations (v2)                      *
 * ============================================================== */
const campaignSpec = [
  { n: 1, club: CLB1, title: 'Campanha de Vacinação V10 — Junho 2026', goal: 8000, raised: 6450, days: 25, status: 'active' },
  { n: 2, club: CLB2, title: 'Manutenção do gatil — telhado', goal: 12000, raised: 12000, days: 60, status: 'concluded' },
  { n: 3, club: CLB3, title: 'Compra de ração mensal', goal: 3000, raised: 1850, days: 12, status: 'active' },
];

export const mockCampaigns = campaignSpec.map((c) => ({
  id: _cid(c.n),
  data: {
    club_id: c.club,
    title: c.title,
    description: 'Chamado público para arrecadação. Transparência total — prestação de contas publicada no fim de cada mês.',
    goal: c.goal,
    raised: c.raised,
    deadline: daysAgoIso(-30).slice(0, 10),
    status: c.status,
    created_by: 'REAL_USER_UID',
    created_at: daysAgoIso(c.days),
    created_at_ms: daysAgoMs(c.days),
    updated_at: daysAgoIso(c.days - 2),
    ...mockMeta({ kind: 'club_campaign', club_id: c.club, title: c.title }),
  },
}));

const donationSpec = [
  { n: 1, club: CLB1, title: 'Ração para 30 dias', goal: 6000, raised: 4250, days: 20, status: 'active' },
  { n: 2, club: CLB1, title: 'Castração em massa', goal: 15000, raised: 9200, days: 8, status: 'active' },
  { n: 3, club: CLB2, title: 'Soro e medicamentos para FeLV+', goal: 4500, raised: 4500, days: 35, status: 'concluded' },
  { n: 4, club: CLB3, title: 'Reforma do canil', goal: 20000, raised: 5800, days: 5, status: 'active' },
];

export const mockDonations = donationSpec.map((d) => ({
  id: _did(d.n),
  data: {
    club_id: d.club,
    title: d.title,
    description: 'Toda contribuição é registrada na prestação de contas pública. PIX com confirmação instantânea.',
    goal: d.goal,
    raised: d.raised,
    deadline: daysAgoIso(-45).slice(0, 10),
    pix_key: `${d.club}.pix@viralata.demo`,
    pix_qr_url: '',
    bank_info: 'Banco Viralata (000) — Ag 0001 — CC 12345-6',
    enable_receipt_upload: true,
    status: d.status,
    created_by: 'REAL_USER_UID',
    created_at: daysAgoIso(d.days),
    created_at_ms: daysAgoMs(d.days),
    updated_at: daysAgoIso(d.days - 1),
    ...mockMeta({ kind: 'club_donation', club_id: d.club, title: d.title }),
  },
}));

/* ============================================================== *
 * 8. Club ledger entries                                          *
 * ============================================================== */
const ledgerSpec = [
  // Patinhas do Bem
  { club: CLB1, type: 'revenue', category: 'Doações', value: 1850, date: '2026-07-05', note: 'Doação anônima via PIX' },
  { club: CLB1, type: 'revenue', category: 'Doações', value: 425, date: '2026-07-02', note: 'Mesa de adoção Villa-Lobos' },
  { club: CLB1, type: 'expense', category: 'Veterinário e saúde', value: 890, date: '2026-07-01', note: 'Consulta + exames Bolinha' },
  { club: CLB1, type: 'expense', category: 'Alimentação', value: 1240, date: '2026-06-28', note: 'Ração 15kg — 4 pacotes' },
  { club: CLB1, type: 'revenue', category: 'Eventos', value: 2300, date: '2026-06-20', note: 'Bazar beneficente' },
  { club: CLB1, type: 'expense', category: 'Medicamentos', value: 320, date: '2026-06-15', note: 'Vermífugo + antipulgas' },
  // Bigodes do Rio
  { club: CLB2, type: 'revenue', category: 'Doações', value: 950, date: '2026-07-03', note: 'Live beneficente' },
  { club: CLB2, type: 'expense', category: 'Medicamentos', value: 1450, date: '2026-06-30', note: 'Medicação FIV+ mensal' },
  { club: CLB2, type: 'expense', category: 'Estrutura', value: 3200, date: '2026-06-25', note: 'Conserto do telhado' },
  { club: CLB2, type: 'revenue', category: 'Parcerias', value: 800, date: '2026-06-18', note: 'Pet shop parceiro' },
  // Caramelo
  { club: CLB3, type: 'revenue', category: 'Doações', value: 520, date: '2026-07-04', note: 'Doação recorrente mensal' },
  { club: CLB3, type: 'expense', category: 'Alimentação', value: 780, date: '2026-06-29', note: 'Ração para 12 cães' },
  { club: CLB3, type: 'expense', category: 'Veterinário e saúde', value: 1450, date: '2026-06-22', note: 'Cirurgia ortopédica Rex' },
  { club: CLB3, type: 'revenue', category: 'Eventos', value: 1100, date: '2026-06-12', note: 'Feira de adoção Praça da Liberdade' },
];

export const mockLedger = ledgerSpec.map((l, idx) => ({
  id: _lid(idx + 1),
  data: {
    club_id: l.club,
    type: l.type,
    category: l.category,
    value: l.value,
    date: l.date,
    note: l.note,
    created_by: 'REAL_USER_UID',
    created_at: daysAgoIso(15 - (idx % 10)),
    created_at_ms: daysAgoMs(15 - (idx % 10)),
    ...mockMeta({ kind: 'club_ledger', club_id: l.club, category: l.category }),
  },
}));

/* Categorias customizadas. */
export const mockLedgerCategories = [
  { id: `${CLB1}_cat_1`, data: { club_id: CLB1, type: 'expense', label: 'Castração', created_by: 'REAL_USER_UID', ...mockMeta({ kind: 'club_ledger_category' }) } },
  { id: `${CLB1}_cat_2`, data: { club_id: CLB1, type: 'revenue', label: 'Adoção', created_by: 'REAL_USER_UID', ...mockMeta({ kind: 'club_ledger_category' }) } },
  { id: `${CLB2}_cat_1`, data: { club_id: CLB2, type: 'expense', label: 'Exames FIV/FeLV', created_by: 'REAL_USER_UID', ...mockMeta({ kind: 'club_ledger_category' }) } },
];

/* ============================================================== *
 * 9. Community posts + likes + comments                           *
 * ============================================================== */
const communityPostSpec = [
  { n: 1, community: COM1, author: 'André Nakamura', title: 'Encontro regional Sudeste 2026', content: 'Confirmado: 15 de novembro, no Parque Ibirapuera. 14 ONGs já confirmaram presença. Trazem os adotáveis!', days: 8, allow: 'both' },
  { n: 2, community: COM1, author: 'Gustavo Pereira', title: 'Vaga para motorista — transporte SP → Rio', content: 'Estamos com 4 cães para transferir do Patinhas do Bem pro Bigodes. Motorista voluntário, sábado (amanhã)?', days: 3, allow: 'both' },
  { n: 3, community: COM1, author: 'REAL_USER_NAME', title: 'Nova política de transparência financeira', content: 'A partir de agosto, todas as ONGs parceiras passam a publicar prestação de contas mensal nesta comunidade.', days: 1, allow: 'both' },
  { n: 4, community: COM2, author: 'Camila Ferreira', title: 'Manual de lar temporário — v2', content: 'Atualizei o manual com a experiência de 2025. Compartilhem com os novos lares temporários. 22 páginas, cobre medicação, adaptação, devolução.', days: 12, allow: 'both' },
  { n: 5, community: COM2, author: 'Patrícia Lima', title: 'Grupo de apoio — cuidadores de FIV+', content: 'Criando um grupo mensal online (Google Meet) pra trocar experiências entre quem cuida de gatos FIV+. Primeiro encontro: 22/08.', days: 6, allow: 'both' },
];

export const mockCommunityPosts = communityPostSpec.map((p) => {
  const authorId = p.author === 'REAL_USER_NAME' ? 'REAL_USER_UID' : MOCK_USER_IDS[p.author];
  return {
    id: _cpid(p.n),
    data: {
      community_id: p.community,
      author_id: authorId,
      author_name: p.author,
      title: p.title,
      content: p.content,
      attachments: [],
      allow_likes: p.allow === 'both' || p.allow === 'likes',
      allow_comments: p.allow === 'both' || p.allow === 'comments',
      likes_count: Math.floor(Math.random() * 18) + 5,
      comments_count: 0,
      created_at: daysAgoIso(p.days),
      created_at_ms: daysAgoMs(p.days),
      updated_at: daysAgoIso(p.days),
      ...mockMeta({ kind: 'community_post', community_id: p.community }),
    },
  };
});

export const mockCommunityPostLikes = mockCommunityPosts.flatMap((p) => {
  const likers = [MARINA, RAFAEL, BEATRIZ, ANDRE, DIEGO, FERNANDA, GUSTAVO, PATRICIA, CAMILA, LUCAS];
  const postDays = p.data.created_at_ms ? Math.max(0, (Date.now() - p.data.created_at_ms) / 86_400_000) : 0;
  return likers.slice(0, 4 + (p.id.charCodeAt(p.id.length - 1) % 5)).map((uid, i) => ({
    id: `${p.id}_${uid}`,
    data: {
      community_id: p.data.community_id,
      post_id: p.id,
      user_id: uid,
      created_at: daysAgoIso(Math.max(0, postDays - 1 - i)),
      ...mockMeta({ kind: 'community_post_like', post_id: p.id, user_id: uid }),
    },
  }));
});

const communityComments = [
  { postN: 1, userKey: 'Gustavo Pereira', text: 'Confirmo presença do Caramelo com 4 cães!', days: 7 },
  { postN: 1, userKey: 'Patrícia Lima', text: 'Bigodes vai com 6 gatos. Já reservamos o transporte.', days: 7 },
  { postN: 2, userKey: 'André Nakamura', text: 'Posso dirigir. Tenho carro grande, mando DM.', days: 2 },
  { postN: 3, userKey: 'Camila Ferreira', text: 'Patinhas do Bem apoia a iniciativa. Vamos publicar mensalmente.', days: 1 },
  { postN: 4, userKey: 'Beatriz Souza', text: 'Material riquíssimo, já passei para 3 lares novos.', days: 11 },
  { postN: 5, userKey: 'Fernanda Rocha', text: 'Vou participar! Tenho um FIV+ de 7 anos.', days: 5 },
];

export const mockCommunityPostComments = communityComments.map((c, idx) => {
  const post = mockCommunityPosts[c.postN - 1];
  return {
    id: `mock_cpc_${String(idx + 1).padStart(3, '0')}`,
    data: {
      community_id: post.data.community_id,
      post_id: post.id,
      author_id: MOCK_USER_IDS[c.userKey],
      author_name: c.userKey,
      text: c.text,
      created_at: daysAgoIso(c.days),
      created_at_ms: daysAgoMs(c.days),
      ...mockMeta({ kind: 'community_post_comment', post_id: post.id }),
    },
  };
});

/* Community events (entidade editorial, regras mais abertas). */
export const mockCommunityEvents = [
  {
    id: 'mock_cevt_001',
    data: {
      community_id: COM1,
      title: 'Encontro regional Sudeste 2026',
      description: '14 ONGs reunidas para mutirão de adoção e troca de experiências.',
      date: daysAgoIso(-120).slice(0, 10),
      location: 'Parque Ibirapuera — São Paulo',
      created_by: 'REAL_USER_UID',
      created_at: daysAgoIso(8),
      ...mockMeta({ kind: 'community_event' }),
    },
  },
  {
    id: 'mock_cevt_002',
    data: {
      community_id: COM2,
      title: 'Encontro mensal de cuidadores',
      description: 'Roda de conversa online sobre lar temporário.',
      date: daysAgoIso(-15).slice(0, 10),
      location: 'Google Meet (link enviado no grupo)',
      created_by: 'REAL_USER_UID',
      created_at: daysAgoIso(6),
      ...mockMeta({ kind: 'community_event' }),
    },
  },
];

export default {
  mockClubMembers,
  mockCommunityMembers,
  mockClubEvents,
  mockClubPosts,
  mockClubPostLikes,
  mockClubPostComments,
  mockForumThreads,
  mockForumComments,
  mockCampaigns,
  mockDonations,
  mockLedger,
  mockLedgerCategories,
  mockCommunityPosts,
  mockCommunityPostLikes,
  mockCommunityPostComments,
  mockCommunityEvents,
};
