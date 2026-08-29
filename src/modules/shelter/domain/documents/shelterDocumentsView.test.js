import { describe, it, expect } from 'vitest';
import {
  getRegistry,
  sortDocuments,
  documentsForAudience,
  resolveLinkedLegal,
  buildCentralView,
  summarizeRegistry,
  computeAcceptanceAnalytics,
} from './shelterDocumentsView.js';
import { DOC_CATEGORY, DOC_STATUS, DOC_AUDIENCE } from './shelterDocuments.js';

describe('shelter/shelterDocumentsView', () => {
  describe('getRegistry (tolerant)', () => {
    it('returns empty registry for missing/legacy docs', () => {
      expect(getRegistry(null)).toEqual({ items: [], updated_at: null, updated_by_uid: '' });
      expect(getRegistry({})).toEqual({ items: [], updated_at: null, updated_by_uid: '' });
      expect(getRegistry({ documents: 'nope' })).toEqual({ items: [], updated_at: null, updated_by_uid: '' });
    });

    it('normalizes items and metadata', () => {
      const reg = getRegistry({
        documents: {
          items: [{ id: 'd1', category: 'terms', title: '<b>T</b>' }],
          updated_at: '2026-08-28T00:00:00.000Z',
          updated_by_uid: 'admin1',
        },
      });
      expect(reg.items).toHaveLength(1);
      expect(reg.items[0].title).toBe('T');
      expect(reg.updated_at).toBe('2026-08-28T00:00:00.000Z');
      expect(reg.updated_by_uid).toBe('admin1');
    });
  });

  describe('sortDocuments', () => {
    it('orders published first then by title', () => {
      const sorted = sortDocuments([
        { status: DOC_STATUS.ARCHIVED, title: 'Zeta' },
        { status: DOC_STATUS.DRAFT, title: 'Beta' },
        { status: DOC_STATUS.PUBLISHED, title: 'Gamma' },
        { status: DOC_STATUS.PUBLISHED, title: 'Alpha' },
      ]);
      expect(sorted.map((d) => d.title)).toEqual(['Alpha', 'Gamma', 'Beta', 'Zeta']);
    });
  });

  describe('documentsForAudience', () => {
    it('filters by audience membership', () => {
      const registry = {
        items: [
          { id: 'a', audience: [DOC_AUDIENCE.ADOPTER] },
          { id: 'b', audience: [DOC_AUDIENCE.VOLUNTEER, DOC_AUDIENCE.ADOPTER] },
          { id: 'c', audience: [DOC_AUDIENCE.FOSTER] },
        ],
      };
      expect(documentsForAudience(registry, DOC_AUDIENCE.ADOPTER).map((d) => d.id)).toEqual(['a', 'b']);
      expect(documentsForAudience(registry, DOC_AUDIENCE.FOSTER).map((d) => d.id)).toEqual(['c']);
      expect(documentsForAudience({}, DOC_AUDIENCE.ADOPTER)).toEqual([]);
    });
  });

  describe('resolveLinkedLegal', () => {
    it('resolves valid slugs and ignores unknown', () => {
      const linked = resolveLinkedLegal({ legal_slugs: ['termo-de-adocao', 'does-not-exist'] });
      expect(linked).toHaveLength(1);
      expect(linked[0].slug).toBe('termo-de-adocao');
    });

    it('returns empty when no links', () => {
      expect(resolveLinkedLegal({})).toEqual([]);
      expect(resolveLinkedLegal({ legal_slugs: [] })).toEqual([]);
    });
  });

  describe('buildCentralView', () => {
    it('returns shelter docs (with linked legal) and platform catalog', () => {
      const registry = {
        items: [
          { id: 'd1', category: DOC_CATEGORY.TERMS, status: DOC_STATUS.PUBLISHED, title: 'Termo do abrigo', legal_slugs: ['termo-de-adocao'] },
        ],
      };
      const view = buildCentralView({ registry });
      expect(view.shelter).toHaveLength(1);
      expect(view.shelter[0].source).toBe('shelter');
      expect(view.shelter[0].linked_legal[0].slug).toBe('termo-de-adocao');
      expect(view.platform.length).toBeGreaterThan(0);
      expect(view.platform.every((p) => p.source === 'platform')).toBe(true);
    });

    it('tolerates empty/absent registry', () => {
      const view = buildCentralView({});
      expect(view.shelter).toEqual([]);
      expect(view.platform.length).toBeGreaterThan(0);
    });
  });

  describe('summarizeRegistry', () => {
    it('counts by category, status, acceptance', () => {
      const registry = {
        items: [
          { category: DOC_CATEGORY.FORM, status: DOC_STATUS.PUBLISHED, acceptance_required: false },
          { category: DOC_CATEGORY.TERMS, status: DOC_STATUS.PUBLISHED, acceptance_required: true },
          { category: DOC_CATEGORY.TERMS, status: DOC_STATUS.DRAFT, acceptance_required: true },
          { category: DOC_CATEGORY.CONTRACT, status: DOC_STATUS.ARCHIVED, acceptance_required: false },
        ],
      };
      const s = summarizeRegistry(registry);
      expect(s.total).toBe(4);
      expect(s.byCategory[DOC_CATEGORY.TERMS]).toBe(2);
      expect(s.byCategory[DOC_CATEGORY.FORM]).toBe(1);
      expect(s.byStatus[DOC_STATUS.PUBLISHED]).toBe(2);
      expect(s.byStatus[DOC_STATUS.DRAFT]).toBe(1);
      expect(s.acceptanceRequired).toBe(2);
      expect(s.platformLegalTotal).toBeGreaterThan(0);
    });

    it('tolerates empty', () => {
      const s = summarizeRegistry({});
      expect(s.total).toBe(0);
    });
  });

  describe('computeAcceptanceAnalytics', () => {
    it('aggregates adoption terms, contracts, interviews', () => {
      const out = computeAcceptanceAnalytics({
        adoptionApplications: [
          { terms_accepted_at: '2026-08-01T10:00:00.000Z' },
          { terms_accepted_at: '2026-08-10T10:00:00.000Z' },
          { }, // sem aceite
        ],
        contracts: [
          { status: 'fully_signed', adopter_signature: { signed_at: '2026-08-20T10:00:00.000Z' } },
          { status: 'pending_shelter_signature' },
          { status: 'cancelled' },
        ],
        interviews: [
          { status: 'completed' },
          { status: 'evaluated' },
          { status: 'proposed' },
        ],
      });
      expect(out.adoption.totalApplications).toBe(3);
      expect(out.adoption.termsAccepted).toBe(2);
      expect(out.adoption.acceptanceRate).toBeCloseTo(0.67, 2);
      expect(out.contracts.total).toBe(3);
      expect(out.contracts.fullySigned).toBe(1);
      expect(out.contracts.cancelled).toBe(1);
      expect(out.interviews.completed).toBe(1);
      expect(out.interviews.evaluated).toBe(1);
      expect(out.totalAcceptances).toBe(3);
      expect(out.lastAcceptanceAt).toBe('2026-08-20T10:00:00.000Z');
    });

    it('handles empty input', () => {
      const out = computeAcceptanceAnalytics();
      expect(out.adoption.termsAccepted).toBe(0);
      expect(out.adoption.acceptanceRate).toBe(0);
      expect(out.totalAcceptances).toBe(0);
      expect(out.lastAcceptanceAt).toBeNull();
    });
  });
});
