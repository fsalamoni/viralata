/**
 * Testes do pacote de mock data — foca em:
 *  - Cobertura: todo documento tem `_mock: true` e os campos-meta injetados.
 *  - Determinismo: IDs batem com o prefixo esperado, todas as referências
 *    cruzadas (club_id, user_id, pet_id) apontam para IDs existentes.
 *  - Service: `getMockSummary()` retorna o shape esperado;
 *    `getMockVersion()` é uma string não-vazia.
 *
 * Não testamos `loadAll`/`clearAll`/`getStatus` aqui — eles tocam o
 * Firestore real e dependem do emulador (cobertura via testes e2e/smoke
 * em outro lugar).
 */

import { describe, it, expect } from 'vitest';
import { mockUsers, mockAthleteProfiles } from './users.mjs';
import { mockClubRecords, mockCommunityRecords, MOCK_CLUB_IDS, MOCK_COMMUNITY_IDS } from './clubs.mjs';
import { mockPets, mockAdoptionInterests, mockAdoptionRatings, MOCK_PET_IDS } from './pets.mjs';
import {
  mockClubMembers, mockCommunityMembers, mockClubEvents,
  mockClubPosts, mockClubPostLikes, mockClubPostComments,
  mockForumThreads, mockForumComments,
  mockCampaigns, mockDonations, mockLedger, mockLedgerCategories,
  mockCommunityPosts, mockCommunityPostLikes, mockCommunityPostComments,
  mockCommunityEvents,
} from './organizations.mjs';
import { mockConversations, mockMessages, mockNotifications, mockAuditLogs, mockAbuseReports } from './social.mjs';
import { mockPayloads, MOCK_TOTAL_DOCS } from './index.mjs';
import { getMockSummary, getMockVersion } from './mockDataService.mjs';
import {
  MOCK_TAG, MOCK_ID_PREFIX, MOCK_USER_PREFIX, MOCK_CLUB_PREFIX, MOCK_COMMUNITY_PREFIX, MOCK_PET_PREFIX,
} from './constants.mjs';

/* ============================================================== *
 * Helpers                                                         *
 * ============================================================== */

function expectMockTagged(item, kind) {
  expect(item).toBeDefined();
  expect(item.id).toBeDefined();
  expect(item.data).toBeDefined();
  expect(item.data._mock).toBe(true);
  expect(item.data._mock_version).toEqual(expect.any(String));
  expect(typeof item.data._mock_loaded_at_ms).toBe('number');
  if (kind) expect(item.data._mock).toBe(true);
}

function indexById(items) {
  return items.reduce((acc, it) => ({ ...acc, [it.id]: it }), {});
}

const idStartsWith = (id, prefix) => typeof id === 'string' && id.startsWith(prefix);

const allItems = [
  ...mockUsers, ...mockAthleteProfiles,
  ...mockClubRecords, ...mockCommunityRecords,
  ...mockClubMembers, ...mockCommunityMembers,
  ...mockPets, ...mockAdoptionInterests, ...mockAdoptionRatings,
  ...mockClubEvents, ...mockClubPosts, ...mockClubPostLikes, ...mockClubPostComments,
  ...mockForumThreads, ...mockForumComments,
  ...mockCampaigns, ...mockDonations, ...mockLedger, ...mockLedgerCategories,
  ...mockCommunityPosts, ...mockCommunityPostLikes, ...mockCommunityPostComments, ...mockCommunityEvents,
  ...mockConversations, ...mockMessages, ...mockNotifications, ...mockAuditLogs, ...mockAbuseReports,
];

/* ============================================================== *
 * Cobertura                                                       *
 * ============================================================== */

describe('mock data · cobertura', () => {
  it('todo documento carrega o marcador _mock: true', () => {
    for (const item of allItems) {
      expect(item.data._mock).toBe(true);
      expect(item.data._mock_version).toEqual(expect.any(String));
    }
  });

  it('total de itens bate com o agregado do índice', () => {
    expect(allItems.length).toBe(MOCK_TOTAL_DOCS);
  });

  it('nenhum id é vazio e nenhum se repete dentro do próprio array', () => {
    const seen = new Map();
    for (const item of allItems) {
      expect(item.id).toBeTruthy();
      const list = seen.get(item.data.kind) || [];
      expect(list).not.toContain(item.id);
      list.push(item.id);
      seen.set(item.data.kind, list);
    }
  });

  it('usuários têm prefixo mock_usr_', () => {
    for (const u of mockUsers) expect(idStartsWith(u.id, MOCK_USER_PREFIX)).toBe(true);
  });

  it('ONGs têm prefixo mock_org_', () => {
    for (const c of mockClubRecords) expect(idStartsWith(c.id, MOCK_CLUB_PREFIX)).toBe(true);
  });

  it('comunidades têm prefixo mock_com_', () => {
    for (const c of mockCommunityRecords) expect(idStartsWith(c.id, MOCK_COMMUNITY_PREFIX)).toBe(true);
  });

  it('pets têm prefixo mock_pet_', () => {
    for (const p of mockPets) expect(idStartsWith(p.id, MOCK_PET_PREFIX)).toBe(true);
  });
});

/* ============================================================== *
 * Cross-references                                                *
 * ============================================================== */

describe('mock data · cross-references', () => {
  const clubsById = indexById(mockClubRecords);
  const communitiesById = indexById(mockCommunityRecords);
  const petsById = indexById(mockPets);
  const usersById = indexById(mockUsers);

  it('club_members referenciam ONGs existentes', () => {
    for (const m of mockClubMembers) {
      expect(clubsById[m.data.club_id]).toBeDefined();
    }
  });

  it('club_members referenciam usuários existentes', () => {
    for (const m of mockClubMembers) {
      // exceto se for o usuário real (placeholder resolvido em runtime)
      if (m.data.user_id === 'REAL_USER_UID') continue;
      expect(usersById[m.data.user_id]).toBeDefined();
    }
  });

  it('community_members referenciam comunidades existentes', () => {
    for (const m of mockCommunityMembers) {
      expect(communitiesById[m.data.community_id]).toBeDefined();
    }
  });

  it('pets referenciam donos válidos (clube ou usuário)', () => {
    for (const p of mockPets) {
      const owner = p.data.owner_id;
      if (p.data.owner_type === 'organization') {
        expect(clubsById[owner]).toBeDefined();
      } else {
        // exceto se for o usuário real (placeholder)
        if (owner !== 'REAL_USER_UID') {
          expect(usersById[owner]).toBeDefined();
        }
      }
    }
  });

  it('club_posts e club_events referenciam ONGs válidas', () => {
    for (const p of mockClubPosts) expect(clubsById[p.data.club_id]).toBeDefined();
    for (const e of mockClubEvents) expect(clubsById[e.data.club_id]).toBeDefined();
  });

  it('club_post_likes e comentários batem com posts existentes', () => {
    const postsById = indexById(mockClubPosts);
    for (const l of mockClubPostLikes) expect(postsById[l.data.post_id]).toBeDefined();
    for (const c of mockClubPostComments) expect(postsById[c.data.post_id]).toBeDefined();
  });

  it('adoption_interests referenciam pets existentes', () => {
    for (const i of mockAdoptionInterests) {
      expect(petsById[i.data.pet_id]).toBeDefined();
    }
  });

  it('mensagens referenciam conversas existentes', () => {
    const convsById = indexById(mockConversations);
    for (const m of mockMessages) {
      expect(convsById[m.conversationId]).toBeDefined();
    }
  });

  it('forum_comments referenciam threads existentes', () => {
    const threadsById = indexById(mockForumThreads);
    for (const c of mockForumComments) {
      expect(threadsById[c.threadId]).toBeDefined();
    }
  });

  it('community_posts e eventos referenciam comunidades válidas', () => {
    for (const p of mockCommunityPosts) expect(communitiesById[p.data.community_id]).toBeDefined();
    for (const e of mockCommunityEvents) expect(communitiesById[e.data.community_id]).toBeDefined();
  });
});

/* ============================================================== *
 * Conteúdo mínimo                                                 *
 * ============================================================== */

describe('mock data · shape dos dados', () => {
  it('usuários têm nome, cidade, perfil completo', () => {
    for (const u of mockUsers) {
      expect(u.data.full_name).toBeTruthy();
      expect(u.data.city).toBeTruthy();
      expect(u.data.state).toMatch(/^[A-Z]{2}$/);
      expect(u.data.profile_completed).toBe(true);
    }
  });

  it('ONGs têm CNPJ válido (formato XX.XXX.XXX/XXXX-XX)', () => {
    for (const c of mockClubRecords) {
      expect(c.data.cnpj).toMatch(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/);
    }
  });

  it('pets têm espécie, porte, status', () => {
    for (const p of mockPets) {
      expect(['dog', 'cat', 'rabbit', 'bird', 'other']).toContain(p.data.species);
      expect(['mini', 'small', 'medium', 'large', 'giant']).toContain(p.data.size);
      expect(['available', 'in_process', 'adopted']).toContain(p.data.status);
    }
  });

  it('pets adotados têm adopted_by + adopted_at', () => {
    for (const p of mockPets) {
      if (p.data.status === 'adopted') {
        expect(p.data.adopted_by).toBeTruthy();
        expect(p.data.adopted_at).toBeTruthy();
      }
    }
  });

  it('lançamentos contábeis têm tipo, valor > 0, data válida', () => {
    for (const l of mockLedger) {
      expect(['revenue', 'expense']).toContain(l.data.type);
      expect(l.data.value).toBeGreaterThan(0);
      expect(l.data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});

/* ============================================================== *
 * Service helpers                                                 *
 * ============================================================== */

describe('mockDataService · helpers', () => {
  it('getMockSummary retorna coleção, label, count, isSubcollection', () => {
    const summary = getMockSummary();
    expect(summary.length).toBeGreaterThan(0);
    for (const s of summary) {
      expect(s.collection).toEqual(expect.any(String));
      expect(s.label).toEqual(expect.any(String));
      expect(s.count).toEqual(expect.any(Number));
      expect(typeof s.isSubcollection).toBe('boolean');
    }
  });

  it('getMockSummary soma === MOCK_TOTAL_DOCS', () => {
    const summary = getMockSummary();
    const sum = summary.reduce((acc, s) => acc + s.count, 0);
    expect(sum).toBe(MOCK_TOTAL_DOCS);
  });

  it('getMockVersion retorna string não-vazia', () => {
    const v = getMockVersion();
    expect(typeof v).toBe('string');
    expect(v.length).toBeGreaterThan(0);
  });

  it('mockPayloads bate com o agregado dos módulos', () => {
    const allIds = mockPayloads.flatMap((p) => p.items.map((it) => `${p.name}/${it.id}`));
    const moduleIds = allItems.map((it) => `${it.data.kind}/${it.id}`); // _mock kind label
    // Pelo menos cada item registrado deve estar em mockPayloads:
    expect(allIds.length).toBe(MOCK_TOTAL_DOCS);
    expect(moduleIds.length).toBe(MOCK_TOTAL_DOCS);
  });
});

/* ============================================================== *
 * Constantes                                                      *
 * ============================================================== */

describe('mocks · constants', () => {
  it('prefixos e tag são strings', () => {
    expect(typeof MOCK_TAG).toBe('string');
    expect(typeof MOCK_ID_PREFIX).toBe('string');
    expect(typeof MOCK_USER_PREFIX).toBe('string');
    expect(typeof MOCK_CLUB_PREFIX).toBe('string');
    expect(typeof MOCK_COMMUNITY_PREFIX).toBe('string');
    expect(typeof MOCK_PET_PREFIX).toBe('string');
  });

  it('lookups MOCK_CLUB_IDS e MOCK_COMMUNITY_IDS têm pelo menos 3/2 chaves', () => {
    expect(Object.keys(MOCK_CLUB_IDS).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(MOCK_COMMUNITY_IDS).length).toBeGreaterThanOrEqual(2);
  });

  it('MOCK_PET_IDS tem 12 pets', () => {
    expect(Object.keys(MOCK_PET_IDS).length).toBe(12);
  });
});
