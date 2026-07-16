import { describe, it, expect } from 'vitest';
import { buildIcsFallback, GOOGLE_CALENDAR_SCOPES } from './googleCalendarService';
describe('googleCalendarService (TASK-317)', () => {
  it('tem scope correto', () => { expect(GOOGLE_CALENDAR_SCOPES).toContain('https://www.googleapis.com/auth/calendar.events'); });
  it('gera ICS RFC 5545', () => {
    const ics = buildIcsFallback({ uid: 'e1', summary: 'Test', startIso: '2026-07-20T14:00:00Z', endIso: '2026-07-20T15:00:00Z', organizerEmail: 'a@b.c' });
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
  });
  it('lida com campos opcionais', () => {
    const ics = buildIcsFallback({ summary: 'X', startIso: '2026-01-01T00:00:00Z', endIso: '2026-01-01T01:00:00Z' });
    expect(ics).toContain('SUMMARY:X');
  });
});
