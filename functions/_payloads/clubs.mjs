/**
 * Mock · Comunidades (entidade editorial/global) e ONGs (clubes).
 *
 * Três ONGs (clubes) em cidades diferentes, cada uma com descrição realista,
 * história, contatos e vínculo opcional a uma comunidade editorial.
 *
 * Duas comunidades editoriais (`communities/...`) — uma regional (Sudeste)
 * e uma temática (Cuidadores).
 *
 * O `created_by` da ONG e o `owner_id` da comunidade serão SEMPRE substituídos
 * pelo `auth.uid` real do admin no momento da escrita, porque as regras do
 * Firestore exigem `request.auth.uid` (ver firestore.rules §clubs e
 * §communities). Os valores aqui servem só para o shape do payload.
 */

import { MOCK_CLUB_PREFIX, MOCK_COMMUNITY_PREFIX, mockMeta, daysAgoMs, daysAgoIso } from './constants.mjs';

const _clubId = (n) => `${MOCK_CLUB_PREFIX}${String(n).padStart(3, '0')}`;
const _communityId = (n) => `${MOCK_COMMUNITY_PREFIX}${String(n).padStart(3, '0')}`;

export const mockClubs = [
  {
    n: 1,
    name: 'Instituto Patinhas do Bem',
    description: 'Resgatamos, tratamos e doamos cães e gatos em situação de rua na Zona Sul de São Paulo desde 2012.',
    history: 'Fundado em 2012 por um grupo de 5 protetores independentes, o Instituto Patinhas do Bem começou atendendo animais vítimas de maus-tratos na região do Campo Belo. Em 2015 inauguramos nossa primeira clínica veterinária própria. Hoje contamos com 32 lares temporários cadastrados, 4 funcionários CLT e uma rede de 200 voluntários ativos. Já viabilizamos mais de 2.800 adoções responsáveis.',
    city: 'São Paulo',
    state: 'SP',
    cnpj: '12.345.678/0001-90',
    contact_email: 'contato@patinhasdobem.org.br',
    contact_phone: '(11) 3456-7890',
    whatsapp_number: '(11) 98765-4321',
    instagram: '@patinhasdobem',
    home_venue: 'Rua das Acácias, 123 — Campo Belo',
    donation_link: 'https://patinhasdobem.org.br/doe',
    member_count: 28,
    invite_code: 'PATINHA',
    community_id: 'mock_com_001',
    community_name: 'Proteção Animal — Sudeste',
    directory_status: 'active',
    featured: true,
    created_by: 'REAL_USER_UID', // será substituído em runtime
  },
  {
    n: 2,
    name: 'Associação Bigodes do Rio',
    description: 'Especialistas em felinos: resgate, castração, tratamento de FIV+ e FeLV. Atendemos a cidade do Rio de Janeiro.',
    history: 'A Bigodes nasceu em 2018 focada em gatos de colônia, com ações de castração em massa na Zona Portuária. Em 2020 ampliamos para tratamento de gatos FIV+ e FeLV, área negligenciada por muitos abrigos. Somos o único abrigo do Rio a oferecer tratamento contínuo para esses felinos. Mantemos um programa de adoção especial com acompanhamento veterinário vitalício.',
    city: 'Rio de Janeiro',
    state: 'RJ',
    cnpj: '23.456.789/0001-01',
    contact_email: 'bigodes@bigodesdorio.org.br',
    contact_phone: '(21) 2233-4455',
    whatsapp_number: '(21) 99988-7766',
    instagram: '@bigodesdorio',
    home_venue: 'Rua do Catete, 456 — Catete',
    donation_link: 'https://bigodesdorio.org.br/doe',
    member_count: 14,
    invite_code: 'BIGODES',
    community_id: 'mock_com_001',
    community_name: 'Proteção Animal — Sudeste',
    directory_status: 'active',
    featured: true,
    created_by: 'REAL_USER_UID',
  },
  {
    n: 3,
    name: 'Casa do cão Caramelo',
    description: 'Pequeno abrigo no interior de Minas Gerais. Cães de grande porte e animais vítimas de violência doméstica.',
    history: 'Somos um abrigo familiar, com capacidade para 40 cães. Começamos em 2016 após a fundadora resgatar 8 animais de uma fábrica de cosméticos que fechava as portas. Desde então trabalhamos em rede com a Polícia Civil no acolhimento de animais vítimas de violência testemunhada. Atendemos a região metropolitana de BH e algumas cidades do interior.',
    city: 'Belo Horizonte',
    state: 'MG',
    cnpj: '34.567.890/0001-12',
    contact_email: 'contato@caramelo.org.br',
    contact_phone: '(31) 3344-5566',
    whatsapp_number: '(31) 98877-6655',
    instagram: '@casadocaramelo',
    home_venue: 'Av. das Palmeiras, 789 — Pampulha',
    donation_link: 'https://casadocaramelo.org.br/doe',
    member_count: 9,
    invite_code: 'CARAMELO',
    community_id: 'mock_com_001',
    community_name: 'Proteção Animal — Sudeste',
    directory_status: 'active',
    featured: false,
    created_by: 'REAL_USER_UID',
  },
];

/** Materializa os clubs no shape do `DATA_MODEL.md`. */
export const mockClubRecords = mockClubs.map((c, idx) => {
  const id = _clubId(c.n);
  const days = 180 + idx * 60;
  return {
    id,
    data: {
      name: c.name,
      description: c.description,
      history: c.history,
      city: c.city,
      state: c.state,
      cnpj: c.cnpj,
      contact_email: c.contact_email,
      contact_phone: c.contact_phone,
      whatsapp_number: c.whatsapp_number,
      instagram: c.instagram,
      home_venue: c.home_venue,
      donation_link: c.donation_link,
      logo_url: '',
      cover_url: '',
      member_count: c.member_count,
      invite_code: c.invite_code,
      chat_enabled: true,
      community_id: c.community_id,
      community_name: c.community_name,
      directory_status: c.directory_status,
      featured: c.featured,
      created_by: c.created_by, // será substituído em runtime
      creator_name: 'REAL_USER_NAME',
      created_at: daysAgoIso(days),
      created_at_ms: daysAgoMs(days),
      updated_at: daysAgoIso(Math.max(1, days - 30)),
      ...mockMeta({ kind: 'club', name: c.name }),
    },
  };
});

/** Duas comunidades editoriais. */
export const mockCommunities = [
  {
    n: 1,
    name: 'Proteção Animal — Sudeste',
    description: 'Comunidade regional que reúne ONGs e protetores independentes dos estados de SP, RJ, MG e ES.',
    city: 'São Paulo',
    state: 'SP',
    cover_url: '',
    priority: 10,
    visibility: 'public',
    owner_id: 'REAL_USER_UID', // será substituído em runtime
  },
  {
    n: 2,
    name: 'Cuidadores e Lares Temporários',
    description: 'Espaço para quem atua como lar temporário, cuidador, voluntário fixo ou transportador. Compartilhamento de experiências e suporte mútuo.',
    city: 'Belo Horizonte',
    state: 'MG',
    cover_url: '',
    priority: 5,
    visibility: 'public',
    owner_id: 'REAL_USER_UID', // será substituído em runtime
  },
];

export const mockCommunityRecords = mockCommunities.map((c, idx) => {
  const id = _communityId(c.n);
  const days = 200 + idx * 40;
  return {
    id,
    data: {
      name: c.name,
      description: c.description,
      city: c.city,
      state: c.state,
      cover_url: c.cover_url,
      featured: idx === 0,
      priority: c.priority,
      visibility: c.visibility,
      owner_id: c.owner_id, // será substituído em runtime
      created_at: daysAgoIso(days),
      created_at_ms: daysAgoMs(days),
      updated_at: daysAgoIso(Math.max(1, days - 60)),
      member_count: 0,
      ...mockMeta({ kind: 'community', name: c.name }),
    },
  };
});

/** IDs canônicos para usar em outros arquivos de mock. */
export const MOCK_CLUB_IDS = Object.freeze(
  mockClubs.reduce((acc, c) => {
    acc[c.name] = _clubId(c.n);
    return acc;
  }, {})
);

export const MOCK_COMMUNITY_IDS = Object.freeze(
  mockCommunities.reduce((acc, c) => {
    acc[c.name] = _communityId(c.n);
    return acc;
  }, {})
);

export default mockClubRecords;
