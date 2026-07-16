import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/core/config/firebase';

export const GOOGLE_CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

export async function authorizeGoogleCalendar() {
  const provider = new GoogleAuthProvider();
  GOOGLE_CALENDAR_SCOPES.forEach((s) => provider.addScope(s));
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) throw new Error('no accessToken');
  return { accessToken: credential.accessToken, uid: result.user?.uid };
}

export async function createCalendarEvent(input) {
  const { accessToken, summary, description, startIso, endIso, attendeeEmails = [], addMeetLink = true } = input;
  if (!accessToken) throw new Error('accessToken required');
  const body = { summary, description, start: { dateTime: startIso, timeZone: 'America/Sao_Paulo' }, end: { dateTime: endIso, timeZone: 'America/Sao_Paulo' }, attendees: attendeeEmails.map((email) => ({ email })) };
  if (addMeetLink) body.conferenceData = { createRequest: { requestId: `viralata-${Date.now()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } };
  const url = addMeetLink ? `${CALENDAR_API_BASE}/calendars/primary/events?conferenceDataVersion=1` : `${CALENDAR_API_BASE}/calendars/primary/events`;
  const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Calendar API ${res.status}`);
  return res.json();
}

export function buildIcsFallback(input) {
  const { uid, summary, description, startIso, endIso, location = '', organizerEmail = '' } = input;
  const dt = (iso) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Viralata//Calendar//PT-BR',
    'BEGIN:VEVENT',
    `UID:${uid || `viralata-${Date.now()}`}@viralata.app`,
    `DTSTAMP:${dt(new Date().toISOString())}`,
    `DTSTART:${dt(startIso)}`, `DTEND:${dt(endIso)}`,
    `SUMMARY:${(summary || '').replace(/\n/g, '\\n')}`,
    `DESCRIPTION:${(description || '').replace(/\n/g, '\\n')}`,
    location && `LOCATION:${location}`, organizerEmail && `ORGANIZER:mailto:${organizerEmail}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

export default { GOOGLE_CALENDAR_SCOPES, authorizeGoogleCalendar, createCalendarEvent, buildIcsFallback };
