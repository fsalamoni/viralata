import { describe, it, expect } from 'vitest';
import {
  DOC_CATEGORY,
  DOC_STATUS,
  FIELD_TYPE,
  DOC_AUDIENCE,
  DOC_LIMITS,
  isValidCategory,
  isValidStatus,
  isValidFieldType,
  isValidAudience,
  isBodyCategory,
  isAcceptanceCategory,
  fieldTypeHasOptions,
  stripHtmlTags,
  sanitizeText,
  normalizeIsoOrNull,
  clampVersionInt,
  hasId,
  normalizeStringList,
  normalizeAudienceList,
  normalizeFormField,
  normalizeFormSchema,
  normalizeVersion,
  maxVersion,
  nextVersionNumber,
  appendVersion,
  normalizeDocument,
  upsertById,
  removeById,
  findById,
  emptyRegistry,
} from './shelterDocuments.js';

describe('shelter/shelterDocuments domain', () => {
  describe('enum predicates', () => {
    it('validates known enum values', () => {
      expect(isValidCategory(DOC_CATEGORY.FORM)).toBe(true);
      expect(isValidCategory('nope')).toBe(false);
      expect(isValidStatus(DOC_STATUS.PUBLISHED)).toBe(true);
      expect(isValidStatus('x')).toBe(false);
      expect(isValidFieldType(FIELD_TYPE.SELECT)).toBe(true);
      expect(isValidFieldType('blob')).toBe(false);
      expect(isValidAudience(DOC_AUDIENCE.ADOPTER)).toBe(true);
      expect(isValidAudience('alien')).toBe(false);
    });

    it('classifies categories', () => {
      expect(isBodyCategory(DOC_CATEGORY.TERMS)).toBe(true);
      expect(isBodyCategory(DOC_CATEGORY.CONTRACT)).toBe(true);
      expect(isBodyCategory(DOC_CATEGORY.POLICY)).toBe(true);
      expect(isBodyCategory(DOC_CATEGORY.FORM)).toBe(false);
      expect(isAcceptanceCategory(DOC_CATEGORY.TERMS)).toBe(true);
      expect(isAcceptanceCategory(DOC_CATEGORY.CONTRACT)).toBe(true);
      expect(isAcceptanceCategory(DOC_CATEGORY.POLICY)).toBe(false);
      expect(isAcceptanceCategory(DOC_CATEGORY.FORM)).toBe(false);
    });

    it('detects option-bearing field types', () => {
      expect(fieldTypeHasOptions(FIELD_TYPE.SELECT)).toBe(true);
      expect(fieldTypeHasOptions(FIELD_TYPE.RADIO)).toBe(true);
      expect(fieldTypeHasOptions(FIELD_TYPE.CHECKBOX)).toBe(true);
      expect(fieldTypeHasOptions(FIELD_TYPE.TEXT)).toBe(false);
    });
  });

  describe('stripHtmlTags / sanitizeText (anti-XSS)', () => {
    it('removes script and html tags but keeps text', () => {
      expect(stripHtmlTags('<script>alert(1)</script>hello')).toBe('alert(1)hello');
      expect(stripHtmlTags('<b>bold</b> text')).toBe('bold text');
      expect(stripHtmlTags('<img src=x onerror=alert(1)>abc')).toBe('abc');
      expect(stripHtmlTags('<!-- comment -->keep')).toBe('keep');
      expect(stripHtmlTags('<!DOCTYPE html>ok')).toBe('ok');
    });

    it('preserves markdown and non-tag angle brackets', () => {
      expect(stripHtmlTags('a < b and c > d')).toBe('a < b and c > d');
      expect(stripHtmlTags('I <3 dogs')).toBe('I <3 dogs');
      expect(stripHtmlTags('# Título\n\n- item 1\n- item 2')).toBe('# Título\n\n- item 1\n- item 2');
    });

    it('trims and clamps', () => {
      expect(sanitizeText('  <b>hi</b>  ', 100)).toBe('hi');
      expect(sanitizeText('abcdef', 3)).toBe('abc');
      expect(sanitizeText(null, 10)).toBe('');
      expect(sanitizeText(undefined, 10)).toBe('');
      expect(sanitizeText(42, 10)).toBe('42');
    });
  });

  describe('primitive coercion', () => {
    it('normalizeIsoOrNull', () => {
      expect(normalizeIsoOrNull('2026-08-28T00:00:00.000Z')).toBe('2026-08-28T00:00:00.000Z');
      expect(normalizeIsoOrNull('')).toBeNull();
      expect(normalizeIsoOrNull(null)).toBeNull();
      expect(normalizeIsoOrNull('not-a-date')).toBeNull();
      expect(typeof normalizeIsoOrNull(new Date())).toBe('string');
    });

    it('clampVersionInt', () => {
      expect(clampVersionInt(1)).toBe(1);
      expect(clampVersionInt('5')).toBe(5);
      expect(clampVersionInt(0)).toBe(0);
      expect(clampVersionInt(-3)).toBe(0);
      expect(clampVersionInt('x')).toBe(0);
      expect(clampVersionInt(1.5)).toBe(0);
    });

    it('hasId', () => {
      expect(hasId({ id: 'a' })).toBe(true);
      expect(hasId({ id: '' })).toBe(false);
      expect(hasId({})).toBe(false);
      expect(hasId(null)).toBe(false);
    });

    it('normalizeStringList dedupes, sanitizes, caps', () => {
      expect(normalizeStringList(['a', 'a', '<b>c</b>', ''], 10, 5)).toEqual(['a', 'c']);
      expect(normalizeStringList(['1', '2', '3'], 10, 2)).toEqual(['1', '2']);
      expect(normalizeStringList('nope', 10, 5)).toEqual([]);
    });

    it('normalizeAudienceList keeps only valid audiences', () => {
      expect(normalizeAudienceList([DOC_AUDIENCE.ADOPTER, 'bogus', DOC_AUDIENCE.ADOPTER, DOC_AUDIENCE.VOLUNTEER]))
        .toEqual([DOC_AUDIENCE.ADOPTER, DOC_AUDIENCE.VOLUNTEER]);
      expect(normalizeAudienceList(null)).toEqual([]);
    });
  });

  describe('form schema', () => {
    it('normalizes a text field and drops options', () => {
      const f = normalizeFormField({ id: 'name', type: 'text', label: '<b>Nome</b>', required: true, options: ['x'] });
      expect(f).toEqual({ id: 'name', type: 'text', label: 'Nome', help: '', required: true, options: [] });
    });

    it('keeps options for select-like fields', () => {
      const f = normalizeFormField({ id: 'size', type: 'select', label: 'Porte', options: ['P', 'M', 'G', 'P'] });
      expect(f.options).toEqual(['P', 'M', 'G']);
    });

    it('defaults invalid type to text', () => {
      expect(normalizeFormField({ id: 'a', type: 'zzz', label: 'A' }).type).toBe('text');
    });

    it('normalizeFormSchema filters invalid fields and caps count', () => {
      const many = Array.from({ length: DOC_LIMITS.FIELDS_MAX + 5 }, (_, i) => ({ id: `f${i}`, type: 'text', label: `L${i}` }));
      const schema = normalizeFormSchema({ fields: [...many, { id: '', label: 'no-id' }, { id: 'x', label: '' }] });
      expect(schema.fields.length).toBe(DOC_LIMITS.FIELDS_MAX);
      expect(schema.fields.every((f) => f.id && f.label)).toBe(true);
    });

    it('tolerates non-array fields', () => {
      expect(normalizeFormSchema({ fields: 'nope' })).toEqual({ fields: [] });
      expect(normalizeFormSchema(null)).toEqual({ fields: [] });
    });
  });

  describe('versioning (append-only, immutable)', () => {
    it('normalizeVersion clamps and defaults', () => {
      const v = normalizeVersion({ version: '2', content_hash: 'sha256:abc', change_summary: '<b>fix</b>', published_by_uid: 'u1' });
      expect(v.version).toBe(2);
      expect(v.content_hash).toBe('sha256:abc');
      expect(v.change_summary).toBe('fix');
      expect(v.published_by_uid).toBe('u1');
      expect(typeof v.published_at).toBe('string');
    });

    it('maxVersion / nextVersionNumber', () => {
      const list = [{ version: 1 }, { version: 3 }, { version: 2 }];
      expect(maxVersion(list)).toBe(3);
      expect(nextVersionNumber(list)).toBe(4);
      expect(maxVersion([])).toBe(0);
      expect(nextVersionNumber([])).toBe(1);
    });

    it('appendVersion appends and sorts', () => {
      let list = [];
      list = appendVersion(list, { version: 1, content_hash: 'h1' });
      list = appendVersion(list, { version: 2, content_hash: 'h2' });
      expect(list.map((v) => v.version)).toEqual([1, 2]);
    });

    it('appendVersion never overwrites an existing version (immutability)', () => {
      const list = appendVersion([{ version: 1, content_hash: 'orig' }], { version: 1, content_hash: 'tampered' });
      expect(list).toHaveLength(1);
      expect(list[0].content_hash).toBe('orig');
    });

    it('appendVersion ignores invalid version numbers', () => {
      expect(appendVersion([], { version: 0 })).toEqual([]);
      expect(appendVersion([], { version: -1 })).toEqual([]);
    });

    it('appendVersion caps to the most recent max entries', () => {
      let list = [];
      for (let i = 1; i <= DOC_LIMITS.VERSIONS_MAX + 3; i += 1) {
        list = appendVersion(list, { version: i, content_hash: `h${i}` });
      }
      expect(list.length).toBe(DOC_LIMITS.VERSIONS_MAX);
      expect(list[0].version).toBe(4);
      expect(list[list.length - 1].version).toBe(DOC_LIMITS.VERSIONS_MAX + 3);
    });

    it('does not mutate the original list', () => {
      const orig = [{ version: 1, content_hash: 'h1' }];
      const copy = JSON.parse(JSON.stringify(orig));
      appendVersion(orig, { version: 2, content_hash: 'h2' });
      expect(orig).toEqual(copy);
    });
  });

  describe('normalizeDocument', () => {
    it('normalizes a terms document with body and strips html', () => {
      const doc = normalizeDocument({
        id: 'd1',
        category: 'terms',
        status: 'published',
        title: '<h1>Termo</h1>',
        description: 'desc',
        audience: ['adopter', 'bogus'],
        acceptance_required: true,
        legal_slugs: ['termo-de-adocao'],
        body: '<script>evil()</script># Termo\n\nTexto',
        form_schema: { fields: [{ id: 'x', type: 'text', label: 'X' }] },
        current_version: 1,
        versions: [{ version: 1, content_hash: 'sha256:aa' }],
      });
      expect(doc.category).toBe('terms');
      expect(doc.title).toBe('Termo');
      expect(doc.body).toBe('evil()# Termo\n\nTexto');
      expect(doc.body).not.toContain('<script>');
      expect(doc.audience).toEqual(['adopter']);
      expect(doc.acceptance_required).toBe(true);
      expect(doc.form_schema).toEqual({ fields: [] }); // não é formulário
      expect(doc.current_version).toBe(1);
      expect(doc.versions).toHaveLength(1);
    });

    it('normalizes a form document with schema and no body', () => {
      const doc = normalizeDocument({
        id: 'f1',
        category: 'form',
        title: 'Ficha de adoção',
        body: 'ignored',
        acceptance_required: true,
        form_schema: { fields: [{ id: 'nome', type: 'text', label: 'Nome' }] },
      });
      expect(doc.body).toBe('');
      expect(doc.form_schema.fields).toHaveLength(1);
      expect(doc.acceptance_required).toBe(false); // form não é categoria de aceite
    });

    it('defaults unknown category/status', () => {
      const doc = normalizeDocument({ id: 'x', category: 'zzz', status: 'zzz' });
      expect(doc.category).toBe('policy');
      expect(doc.status).toBe('draft');
    });

    it('derives current_version from versions when absent', () => {
      const doc = normalizeDocument({ id: 'x', category: 'terms', versions: [{ version: 1 }, { version: 2 }] });
      expect(doc.current_version).toBe(2);
    });
  });

  describe('list operations', () => {
    it('upsertById inserts, updates, and caps', () => {
      let list = [];
      list = upsertById(list, { id: 'a', title: 'A' });
      list = upsertById(list, { id: 'b', title: 'B' });
      expect(list).toHaveLength(2);
      list = upsertById(list, { id: 'a', title: 'A2' });
      expect(list).toHaveLength(2);
      expect(findById(list, 'a').title).toBe('A2');
    });

    it('upsertById respects max and ignores id-less items', () => {
      let list = [{ id: 'a' }, { id: 'b' }];
      list = upsertById(list, { id: 'c' }, 2);
      expect(list).toHaveLength(2);
      expect(upsertById(list, { title: 'no id' })).toEqual(list);
    });

    it('removeById removes and never mutates', () => {
      const orig = [{ id: 'a' }, { id: 'b' }];
      const out = removeById(orig, 'a');
      expect(out).toEqual([{ id: 'b' }]);
      expect(orig).toHaveLength(2);
    });

    it('findById returns null when missing', () => {
      expect(findById([{ id: 'a' }], 'z')).toBeNull();
      expect(findById(null, 'a')).toBeNull();
    });

    it('emptyRegistry shape', () => {
      expect(emptyRegistry()).toEqual({ items: [], updated_at: null, updated_by_uid: '' });
    });
  });
});
