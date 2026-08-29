import { describe, it, expect } from 'vitest';
import {
  POST_STATUS,
  normalizeTagList,
  normalizeMentions,
  parseScheduledFor,
  normalizeMuralPostInput,
  isValidPostStatus,
} from './mural.js';

describe('shelter/mural domain', () => {
  describe('normalizeTagList', () => {
    it('trims, lowercases, strips #, dedups and caps count', () => {
      const tags = normalizeTagList(['  Adoção ', '#adoção', 'MUTIRÃO', 'vacina', 'vacina']);
      expect(tags).toEqual(['adoção', 'mutirão', 'vacina']);
    });

    it('accepts a comma-separated string', () => {
      expect(normalizeTagList('gato, cachorro , gato')).toEqual(['gato', 'cachorro']);
    });

    it('caps at TAGS_MAX (8)', () => {
      const many = normalizeTagList(Array.from({ length: 20 }, (_, i) => `t${i}`));
      expect(many).toHaveLength(8);
    });

    it('returns [] for junk input', () => {
      expect(normalizeTagList(null)).toEqual([]);
      expect(normalizeTagList(42)).toEqual([]);
    });
  });

  describe('normalizeMentions', () => {
    it('dedups by uid then name and keeps {uid,name}', () => {
      const m = normalizeMentions([
        { uid: 'u1', name: 'Ana' },
        { uid: 'u1', name: 'Ana repetida' },
        { name: 'Bruno' },
        { name: 'Bruno' },
        'Carla',
      ]);
      expect(m).toEqual([
        { uid: 'u1', name: 'Ana' },
        { uid: '', name: 'Bruno' },
        { uid: '', name: 'Carla' },
      ]);
    });

    it('drops empty entries and non-arrays', () => {
      expect(normalizeMentions('x')).toEqual([]);
      expect(normalizeMentions([{ uid: '', name: '' }, null])).toEqual([]);
    });
  });

  describe('parseScheduledFor', () => {
    it('passes through finite ms', () => {
      expect(parseScheduledFor(1000)).toBe(1000);
    });
    it('parses ISO strings and Date', () => {
      const iso = '2030-01-01T10:00:00.000Z';
      const ms = new Date(iso).getTime();
      expect(parseScheduledFor(iso)).toBe(ms);
      expect(parseScheduledFor(new Date(iso))).toBe(ms);
    });
    it('returns null for empty/invalid', () => {
      expect(parseScheduledFor('')).toBeNull();
      expect(parseScheduledFor(null)).toBeNull();
      expect(parseScheduledFor('not-a-date')).toBeNull();
    });
  });

  describe('isValidPostStatus', () => {
    it('accepts known and rejects unknown', () => {
      expect(isValidPostStatus('draft')).toBe(true);
      expect(isValidPostStatus('published')).toBe(true);
      expect(isValidPostStatus('nope')).toBe(false);
    });
  });

  describe('normalizeMuralPostInput', () => {
    const now = new Date('2026-08-28T12:00:00Z').getTime();

    it('defaults to published with additive fields empty', () => {
      const out = normalizeMuralPostInput({ title: 'Oi', content: 'texto' }, now);
      expect(out.status).toBe(POST_STATUS.PUBLISHED);
      expect(out.tags).toEqual([]);
      expect(out.mentions).toEqual([]);
      expect(out.pinned).toBe(false);
      expect(out.scheduled_for).toBeNull();
      // herda hasContent/allow_* de normalizePostInput
      expect(out.hasContent).toBe(true);
      expect(out.allow_interaction).toBeDefined();
    });

    it('keeps a draft as draft even with a future scheduled_for', () => {
      const future = now + 86400000;
      const out = normalizeMuralPostInput(
        { title: 'R', status: 'draft', scheduled_for: future }, now,
      );
      expect(out.status).toBe(POST_STATUS.DRAFT);
      expect(out.scheduled_for).toBeNull();
    });

    it('promotes to scheduled when a future date is given', () => {
      const future = now + 86400000;
      const out = normalizeMuralPostInput(
        { title: 'R', status: 'published', scheduled_for: future }, now,
      );
      expect(out.status).toBe(POST_STATUS.SCHEDULED);
      expect(out.scheduled_for).toBe(future);
    });

    it('publishes a scheduled post whose date is already in the past', () => {
      const past = now - 1000;
      const out = normalizeMuralPostInput(
        { title: 'R', status: 'scheduled', scheduled_for: past }, now,
      );
      expect(out.status).toBe(POST_STATUS.PUBLISHED);
      expect(out.scheduled_for).toBeNull();
    });

    it('falls back to published for an invalid status', () => {
      const out = normalizeMuralPostInput({ title: 'R', status: 'weird' }, now);
      expect(out.status).toBe(POST_STATUS.PUBLISHED);
    });

    it('normalizes tags/mentions/pinned', () => {
      const out = normalizeMuralPostInput({
        title: 'R',
        tags: ['#Adoção', 'adoção', 'Vacina'],
        mentions: [{ uid: 'u1', name: 'Ana' }],
        pinned: true,
      }, now);
      expect(out.tags).toEqual(['adoção', 'vacina']);
      expect(out.mentions).toEqual([{ uid: 'u1', name: 'Ana' }]);
      expect(out.pinned).toBe(true);
    });
  });
});
