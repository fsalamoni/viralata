/**
 * Mock · Índice de payloads e helpers compartilhados.
 *
 * Cada entrada segue o shape `{ id, data, [path?] }` que o `mockDataService`
 * consome:
 *   - `id`    — id determinístico do documento (usado como `setDoc`).
 *   - `data`  — payload completo (com `mockMeta` aplicado).
 *   - `path`  — sub-coleção path (opcional) para o caso de subcoleções
 *               (`forum_threads/{id}/comments/{id}`). Default: raiz.
 *
 * Para criar uma nova leva de mocks:
 *   1) adicione o array em `users.js`, `clubs.js`, `pets.js`, `organizations.js`
 *      ou `social.js`;
 *   2) exporte-o aqui como uma entrada nova;
 *   3) o `mockDataService` cuida do resto (load/clear/status).
 */

import { mockUsers, mockAthleteProfiles } from './users.js';
import { mockClubRecords, mockCommunityRecords } from './clubs.js';
import { mockPets, mockAdoptionInterests, mockAdoptionRatings } from './pets.js';
import {
  mockClubMembers, mockCommunityMembers, mockClubEvents,
  mockClubPosts, mockClubPostLikes, mockClubPostComments,
  mockForumThreads, mockForumComments,
  mockCampaigns, mockDonations, mockLedger, mockLedgerCategories,
  mockCommunityPosts, mockCommunityPostLikes, mockCommunityPostComments,
  mockCommunityEvents,
} from './organizations.js';
import {
  mockConversations, mockMessages, mockNotifications,
  mockAuditLogs, mockAbuseReports,
} from './social.js';

/**
 * Coleção raíz do Firestore. Cada item pode ter `path` (subcoleção) opcional.
 *  - top-level: write em `collection(db, name, id)`
 *  - sub:       write em `collection(db, parent, parentId, name, id)`
 */
export const mockPayloads = [
  // Usuários (raiz)
  { name: 'users', items: mockUsers, label: 'Usuários' },
  { name: 'athlete_profiles', items: mockAthleteProfiles, label: 'Perfis públicos' },

  // Comunidades e ONGs (raiz)
  { name: 'communities', items: mockCommunityRecords, label: 'Comunidades' },
  { name: 'clubs', items: mockClubRecords, label: 'Organizações (ONGs)' },

  // Membros
  { name: 'club_members', items: mockClubMembers, label: 'Membros de ONG' },
  { name: 'community_members', items: mockCommunityMembers, label: 'Membros de comunidade' },

  // Pets
  { name: 'pets', items: mockPets, label: 'Pets' },
  { name: 'adoption_interests', items: mockAdoptionInterests, label: 'Interesses de adoção' },
  { name: 'adoption_ratings', items: mockAdoptionRatings, label: 'Avaliações pós-adoção' },

  // Mural e fórum de ONG
  { name: 'club_events', items: mockClubEvents, label: 'Eventos de ONG' },
  { name: 'club_posts', items: mockClubPosts, label: 'Mural da ONG' },
  { name: 'club_post_likes', items: mockClubPostLikes, label: 'Curtidas no mural' },
  { name: 'club_post_comments', items: mockClubPostComments, label: 'Comentários no mural' },
  { name: 'club_forum_threads', items: mockForumThreads, label: 'Tópicos de fórum' },
  // Subcoleção de comentários do fórum
  { name: 'comments', parent: 'club_forum_threads', items: mockForumComments, label: 'Comentários de fórum',
    resolveParent: (item) => item.threadId },

  // Financeiro / doação
  { name: 'club_campaigns', items: mockCampaigns, label: 'Campanhas de doação (legado)' },
  { name: 'club_donations', items: mockDonations, label: 'Chamados de doação (v2)' },
  { name: 'club_ledger', items: mockLedger, label: 'Lançamentos contábeis' },
  { name: 'club_ledger_categories', items: mockLedgerCategories, label: 'Categorias de lançamento' },

  // Comunidade (entidade editorial)
  { name: 'community_posts', items: mockCommunityPosts, label: 'Posts de comunidade' },
  { name: 'community_post_likes', items: mockCommunityPostLikes, label: 'Curtidas em post de comunidade' },
  { name: 'community_post_comments', items: mockCommunityPostComments, label: 'Comentários em post de comunidade' },
  { name: 'community_events', items: mockCommunityEvents, label: 'Eventos de comunidade' },

  // Chat
  { name: 'conversations', items: mockConversations, label: 'Conversas' },
  // Subcoleção de mensagens
  { name: 'messages', parent: 'conversations', items: mockMessages, label: 'Mensagens',
    resolveParent: (item) => item.conversationId },

  // Transversal
  { name: 'notifications', items: mockNotifications, label: 'Notificações' },
  { name: 'audit_logs', items: mockAuditLogs, label: 'Logs de auditoria' },
  { name: 'abuse_reports', items: mockAbuseReports, label: 'Denúncias de maus-tratos' },
];

/** Soma total de documentos para dashboards e sanity-check. */
export const MOCK_TOTAL_DOCS = mockPayloads.reduce((acc, p) => acc + p.items.length, 0);

/** Versão do esquema — exibida no painel. */
export { MOCK_DATA_VERSION } from './constants.js';
