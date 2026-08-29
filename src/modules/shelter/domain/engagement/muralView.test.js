import { describe, it, expect } from 'vitest';
import { POST_STATUS } from './mural.js';
import {
  derivePostStatus,
  isPostPublic,
  isPostDraft,
  isPostScheduled,
  isPostArchived,
  sortMuralPosts,
  postMatchesSearch,
  filterMuralPosts,
  publicMuralPosts,
  collectTags,
  hiddenCommentIds,
  isCommentHidden,
  visiblePublicComments,
  computeMuralAnalytics,
} from './muralView.js';

const NOW = new Date('2026-08-28T12:00:00Z').getTime();
const DAY = 86400000;

function post(over = {}) {
  return {
    id: over.id || Math.random().toString(36).slice(2),
    title: '',
    content: '',
    created_at_ms: NOW,
    likes_count: 0,
    comments_count: 0,
    ...over,
  };
}

describe('shelter/muralView', () => {
  describe('derivePostStatus', () => {
    it('treats a post without status as published (legacy compat)', () => {
      expect(derivePostStatus(post(), NOW)).toBe(POST_STATUS.PUBLISHED);
    });
    it('keeps a future-scheduled post as scheduled', () => {
      const p = post({ status: POST_STATUS.SCHEDULED, scheduled_for: NOW + DAY });
      expect(derivePostStatus(p, NOW)).toBe(POST_STATUS.SCHEDULED);
      expect(isPostScheduled(p, NOW)).toBe(true);
    });
    it('promotes a due scheduled post to published', () => {
      const p = post({ status: POST_STATUS.SCHEDULED, scheduled_for: NOW - 1 });
      expect(derivePostStatus(p, NOW)).toBe(POST_STATUS.PUBLISHED);
      expect(isPostPublic(p, NOW)).toBe(true);
    });
    it('reflects draft and archived', () => {
      expect(isPostDraft(post({ status: POST_STATUS.DRAFT }), NOW)).toBe(true);
      expect(isPostArchived(post({ status: POST_STATUS.ARCHIVED }), NOW)).toBe(true);
      expect(isPostPublic(post({ status: POST_STATUS.DRAFT }), NOW)).toBe(false);
      expect(isPostPublic(post({ status: POST_STATUS.ARCHIVED }), NOW)).toBe(false);
    });
  });

  describe('sortMuralPosts', () => {
    it('pinned first (recent pin on top), then by date desc', () => {
      const a = post({ id: 'a', created_at_ms: NOW - 3 * DAY });
      const b = post({ id: 'b', created_at_ms: NOW - 1 * DAY });
      const c = post({ id: 'c', created_at_ms: NOW - 2 * DAY, pinned: true, pinned_at: NOW });
      const d = post({ id: 'd', created_at_ms: NOW, pinned: true, pinned_at: NOW - DAY });
      const sorted = sortMuralPosts([a, b, c, d], NOW).map((p) => p.id);
      expect(sorted).toEqual(['c', 'd', 'b', 'a']);
    });
    it('does not mutate the input array', () => {
      const arr = [post({ id: 'a' }), post({ id: 'b', pinned: true })];
      const copy = [...arr];
      sortMuralPosts(arr, NOW);
      expect(arr).toEqual(copy);
    });
  });

  describe('search & filter', () => {
    const posts = [
      post({ id: 'p1', title: 'Mutirão de adoção', tags: ['adoção'], status: POST_STATUS.PUBLISHED }),
      post({ id: 'p2', title: 'Rascunho vacina', tags: ['vacina'], status: POST_STATUS.DRAFT }),
      post({ id: 'p3', title: 'Evento', content: 'traga seu pet', tags: ['adoção', 'evento'], status: POST_STATUS.PUBLISHED }),
      post({ id: 'p4', title: 'Antigo', status: POST_STATUS.ARCHIVED }),
    ];

    it('postMatchesSearch matches title, content and tags', () => {
      expect(postMatchesSearch(posts[0], 'adoção')).toBe(true);
      expect(postMatchesSearch(posts[2], 'pet')).toBe(true);
      expect(postMatchesSearch(posts[0], '')).toBe(true);
      expect(postMatchesSearch(posts[0], 'zzz')).toBe(false);
    });

    it('filters by effective status', () => {
      expect(filterMuralPosts(posts, { status: POST_STATUS.DRAFT }, NOW).map((p) => p.id)).toEqual(['p2']);
      expect(filterMuralPosts(posts, { status: POST_STATUS.PUBLISHED }, NOW).map((p) => p.id)).toEqual(['p1', 'p3']);
    });

    it('filters by tags (AND) and search together', () => {
      expect(filterMuralPosts(posts, { tags: ['adoção'] }, NOW).map((p) => p.id)).toEqual(['p1', 'p3']);
      expect(filterMuralPosts(posts, { tags: ['adoção', 'evento'] }, NOW).map((p) => p.id)).toEqual(['p3']);
      expect(filterMuralPosts(posts, { search: 'mutirão', status: POST_STATUS.PUBLISHED }, NOW).map((p) => p.id)).toEqual(['p1']);
    });

    it('publicMuralPosts returns only public, sorted', () => {
      expect(publicMuralPosts(posts, NOW).map((p) => p.id)).toEqual(['p1', 'p3']);
    });

    it('collectTags returns sorted unique tags', () => {
      expect(collectTags(posts)).toEqual(['adoção', 'evento', 'vacina']);
    });
  });

  describe('moderation', () => {
    const p = post({ id: 'x', moderation: { hidden_comment_ids: ['c2'] } });
    const comments = [{ id: 'c1', text: 'oi' }, { id: 'c2', text: 'spam' }, { id: 'c3', text: 'legal' }];

    it('reads hidden ids safely', () => {
      expect(hiddenCommentIds(p)).toEqual(['c2']);
      expect(hiddenCommentIds(post())).toEqual([]);
    });
    it('isCommentHidden reflects the list', () => {
      expect(isCommentHidden(p, 'c2')).toBe(true);
      expect(isCommentHidden(p, 'c1')).toBe(false);
    });
    it('visiblePublicComments removes hidden', () => {
      expect(visiblePublicComments(comments, p).map((c) => c.id)).toEqual(['c1', 'c3']);
    });
  });

  describe('computeMuralAnalytics', () => {
    const posts = [
      post({ id: 'p1', status: POST_STATUS.PUBLISHED, likes_count: 5, comments_count: 2, pinned: true }),
      post({ id: 'p2', status: POST_STATUS.PUBLISHED, likes_count: 1, comments_count: 0 }),
      post({ id: 'p3', status: POST_STATUS.DRAFT, likes_count: 9, comments_count: 9 }),
      post({ id: 'p4', status: POST_STATUS.SCHEDULED, scheduled_for: NOW + DAY }),
      post({ id: 'p5', status: POST_STATUS.ARCHIVED }),
    ];
    const a = computeMuralAnalytics(posts, NOW);

    it('counts statuses correctly', () => {
      expect(a.total).toBe(5);
      expect(a.published).toBe(2);
      expect(a.drafts).toBe(1);
      expect(a.scheduled).toBe(1);
      expect(a.archived).toBe(1);
      expect(a.pinned).toBe(1);
    });

    it('sums likes/comments only for published', () => {
      expect(a.likes).toBe(6);
      expect(a.comments).toBe(2);
      expect(a.engagement).toBe(8);
      expect(a.avgEngagement).toBe(4);
    });

    it('ranks top posts by engagement (published only)', () => {
      expect(a.topPosts.map((p) => p.id)).toEqual(['p1', 'p2']);
      expect(a.topPosts[0]).toMatchObject({ id: 'p1', engagement: 7 });
    });
  });
});
