/**
 * @fileoverview Unit tests for generateEventIcsCore.cjs
 * @see generateEventIcsCore.cjs
 */

'use strict';

const { generateEventIcs, toIcsDateTime, escapeIcsText } = require('./generateEventIcsCore.cjs');

describe('generateEventIcsCore', () => {
  describe('toIcsDateTime', () => {
    it('formats a JS Date in UTC', () => {
      const d = new Date('2026-07-20T14:30:00.000Z');
      expect(toIcsDateTime(d)).toBe('20260720T143000Z');
    });

    it('handles Firestore-like { toDate() } object', () => {
      const ts = { toDate: () => new Date('2026-07-20T14:30:00.000Z') };
      expect(toIcsDateTime(ts)).toBe('20260720T143000Z');
    });

    it('returns empty string for null/undefined', () => {
      expect(toIcsDateTime(null)).toBe('');
      expect(toIcsDateTime(undefined)).toBe('');
    });
  });

  describe('escapeIcsText', () => {
    it('escapes semicolons, commas, backslashes, and newlines', () => {
      expect(escapeIcsText('hello;world')).toBe('hello\\;world');
      expect(escapeIcsText('one,two')).toBe('one\\,two');
      expect(escapeIcsText('path\\to\\file')).toBe('path\\\\to\\\\file');
      expect(escapeIcsText('line1\\nline2')).toBe('line1\\nline2');
    });

    it('returns empty string for null/undefined', () => {
      expect(escapeIcsText(null)).toBe('');
      expect(escapeIcsText(undefined)).toBe('');
    });
  });

  describe('generateEventIcs', () => {
    const baseEvent = {
      id: 'evt-123',
      title: 'Feira de Adoção',
      description: 'Venha conhecer nossos pets!',
      location: 'Parque Central, São Paulo',
      type: 'ADOPTION_FAIR',
      club_id: 'club-abc',
      starts_at: { toDate: () => new Date('2026-07-20T10:00:00.000Z') },
      ends_at:   { toDate: () => new Date('2026-07-20T18:00:00.000Z') },
    };

    it('produces a valid VCALENDAR with one VEVENT', () => {
      const { ics, filename } = generateEventIcs(baseEvent);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('END:VEVENT');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('PRODID:-//Viralata//');
      expect(filename).toBe('Feira-de-Adocao.ics');
    });

    it('includes DTSTART and DTEND', () => {
      const { ics } = generateEventIcs(baseEvent);
      expect(ics).toContain('DTSTART:20260720T100000Z');
      expect(ics).toContain('DTEND:20260720T180000Z');
    });

    it('includes SUMMARY and LOCATION', () => {
      const { ics } = generateEventIcs(baseEvent);
      expect(ics).toContain('SUMMARY:Feira de Adoção');
      expect(ics).toContain('LOCATION:Parque Central, São Paulo');
    });

    it('includes CATEGORIES for event type', () => {
      const { ics } = generateEventIcs(baseEvent);
      expect(ics).toContain('CATEGORIES:ADOPTION_FAIR');
    });

    it('sets correct UID', () => {
      const { ics } = generateEventIcs(baseEvent);
      expect(ics).toContain('UID:evt-123@viralata.app'));
    });

    it('uses X-WR-CALNAME as event title', () => {
      const { ics } = generateEventIcs(baseEvent);
      expect(ics).toContain('X-WR-CALNAME:Feira de Adoção');
    });

    it('generates one VEVENT per date when dates subcollection provided', () => {
      const dates = [
        { id: 'd1', date_time: { toDate: () => new Date('2026-07-20T10:00:00.000Z') }, note: 'Manhã' },
        { id: 'd2', date_time: { toDate: () => new Date('2026-07-20T14:00:00.000Z') }, note: 'Tarde' },
      ];
      const { ics } = generateEventIcs(baseEvent, dates);
      const matches = ics.match(/BEGIN:VEVENT/g) || [];
      expect(matches.length).toBe(2);
      expect(ics).toContain('d1@viralata.app');
      expect(ics).toContain('d2@viralata.app');
    });

    it('sorts dates by date_time ascending', () => {
      const dates = [
        { id: 'd2', date_time: { toDate: () => new Date('2026-07-20T14:00:00.000Z') } },
        { id: 'd1', date_time: { toDate: () => new Date('2026-07-20T10:00:00.000Z') } },
      ];
      const { ics } = generateEventIcs(baseEvent, dates);
      const d1Pos = ics.indexOf('d1@viralata.app');
      const d2Pos = ics.indexOf('d2@viralata.app');
      expect(d1Pos).toBeLessThan(d2Pos);
    });

    it('falls back to starts_at/ends_at when no dates provided', () => {
      const { ics } = generateEventIcs(baseEvent, []);
      const matches = ics.match(/BEGIN:VEVENT/g) || [];
      expect(matches.length).toBe(1);
    });

    it('falls back to starts_at only when ends_at is missing', () => {
      const noEnd = { ...baseEvent };
      delete noEnd.ends_at;
      const { ics } = generateEventIcs(noEnd, []);
      expect(ics).toContain('DTSTART:20260720T100000Z');
      expect(ics).toContain('DTEND:20260720T120000Z'); // +2h fallback
    });

    it('escapes special chars in summary', () => {
      const special = { ...baseEvent, title: 'Feira: pets, cute\\dogs & more!' };
      const { ics } = generateEventIcs(special);
      expect(ics).toContain('SUMMARY:Feira\\: pets\\, cute\\\\dogs \\& more!');
    });

    it('handles missing event title gracefully', () => {
      const noTitle = { ...baseEvent, title: '' };
      const { ics } = generateEventIcs(noTitle);
      expect(ics).toContain('SUMMARY:Evento');
      expect(ics).toContain('X-WR-CALNAME:Evento');
    });

    it('handles event with no dates and no starts_at', () => {
      const empty = { id: 'evt-empty' };
      const { ics, filename } = generateEventIcs(empty, []);
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
      expect(filename).toBe('evento.ics');
    });
  });
});
