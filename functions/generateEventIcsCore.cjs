/**
 * @fileoverview Pure-logic ICS generator for club events.
 *
 * Generates RFC 5545-compliant .ics content for a club event,
 * optionally including all dates from the event_dates subcollection.
 *
 * @module generateEventIcsCore
 */

'use strict';

/**
 * Escape special characters per RFC 5545 §3.3 (folding, colons, semicolons, backslashes).
 * @param {string} str
 * @returns {string}
 */
function escapeIcsText(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Fold long lines per RFC 5545 §3.1 (lines MUST NOT exceed 75 octets).
 * @param {string} line
 * @returns {string}
 */
function foldLine(line) {
  if (line.length <= 75) return line;
  const chunks = [];
  let i = 0;
  chunks.push(line.slice(0, 75));
  i = 75;
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join('\r\n');
}

/**
 * Convert a JS Date (or Firestore Timestamp) to UTC ICS DATE-TIME (YYYYMMDDTHHmmssZ).
 * @param {Date|{toDate:()=>Date}|null} value
 * @returns {string}
 */
function toIcsDateTime(value) {
  if (!value) return '';
  const d = value.toDate ? value.toDate() : new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

/**
 * Generate a UID for the event or a specific date instance.
 * @param {string} eventId
 * @param {string} [dateId]
 * @returns {string}
 */
function buildUid(eventId, dateId) {
  if (dateId) return `${dateId}@viralata.app`;
  return `${eventId}@viralata.app`;
}

/**
 * Build a single VEVENT block.
 * @param {object} opts
 * @param {string} opts.uid
 * @param {string} opts.summary
 * @param {string} opts.description
 * @param {string} opts.location
 * @param {string} opts.startIso  — UTC ISO string YYYYMMDDTHHmmssZ
 * @param {string} opts.endIso    — UTC ISO string YYYYMMDDTHHmmssZ
 * @param {string} [opts.url]     — event detail URL
 * @param {string} [opts.categories] — comma-separated event type
 * @returns {string}
 */
function buildVEvent({ uid, summary, description, location, startIso, endIso, url, categories }) {
  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    foldLine(`DTSTAMP:${toIcsDateTime(new Date())}`),
    foldLine(`DTSTART:${startIso}`),
    foldLine(`DTEND:${endIso}`),
    foldLine(`SUMMARY:${escapeIcsText(summary)}`),
  ];
  if (description) lines.push(foldLine(`DESCRIPTION:${escapeIcsText(description)}`));
  if (location)    lines.push(foldLine(`LOCATION:${escapeIcsText(location)}`));
  if (categories)  lines.push(foldLine(`CATEGORIES:${escapeIcsText(categories)}`));
  if (url)         lines.push(foldLine(`URL:${url}`));
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

/**
 * Generate the full VCALENDAR string for a club event.
 *
 * @param {object} event        — club_events Firestore document
 * @param {Array}  [dates=[]]   — club_event_dates subcollection (optional)
 * @param {object} [opts]
 * @param {string} [opts.appUrl] — base URL for event detail links (e.g. https://viralata.app)
 * @returns {{ ics: string, filename: string }}
 */
function generateEventIcs(event, dates = [], opts = {}) {
  const { appUrl = 'https://viralata.app' } = opts;
  const uid       = buildUid(event.id);
  const summary   = escapeIcsText(event.title || 'Evento');
  const descRaw   = event.description || '';
  const location  = event.location || '';
  const categories = event.type || '';
  const eventUrl  = `${appUrl}/comunidade/${event.club_id}?tab=events&eventId=${event.id}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Viralata//Sistema de Gestao do Abrigo//PT-BR',
    foldLine(`X-WR-CALNAME:${escapeIcsText(event.title || 'Evento')}`),
    foldLine(`X-WR-TIMEZONE:America/Sao_Paulo`),
  ];

  // Use individual dates if present; otherwise fall back to main starts_at/ends_at.
  if (dates && dates.length > 0) {
    // Sort by date_time ascending
    const sorted = [...dates].sort((a, b) => {
      const ta = a.date_time ? new Date(a.date_time) : new Date(0);
      const tb = b.date_time ? new Date(b.date_time) : new Date(0);
      return ta - tb;
    });
    for (const d of sorted) {
      const startIso = toIcsDateTime(d.date_time);
      // Default end = start + 2 hours
      const endDate = d.date_time
        ? new Date(d.date_time.toDate ? d.date_time.toDate() : new Date(d.date_time))
        : new Date();
      endDate.setHours(endDate.getHours() + 2);
      const endIso = toIcsDateTime(endDate);

      const dateUid = d.id ? `${d.id}@viralata.app` : uid;
      const dateSummary = d.note
        ? `${event.title || 'Evento'} — ${d.note}`
        : (event.title || 'Evento');
      const dateLocation = d.location || location;

      lines.push(buildVEvent({
        uid: dateUid,
        summary: dateSummary,
        description: descRaw,
        location: dateLocation,
        startIso,
        endIso,
        url: eventUrl,
        categories,
      }));
    }
  } else if (event.starts_at) {
    const startIso = toIcsDateTime(event.starts_at);
    let endIso;
    if (event.ends_at) {
      endIso = toIcsDateTime(event.ends_at);
    } else {
      // Default: 2 hours after start
      const endDate = event.starts_at.toDate
        ? event.starts_at.toDate()
        : new Date(event.starts_at);
      endDate.setHours(endDate.getHours() + 2);
      endIso = toIcsDateTime(endDate);
    }
    lines.push(buildVEvent({
      uid,
      summary,
      description: descRaw,
      location,
      startIso,
      endIso,
      url: eventUrl,
      categories,
    }));
  } else {
    // No dates at all — skip VEVENT, return empty-ish calendar
    lines.push('END:VCALENDAR');
    return { ics: lines.join('\r\n'), filename: `${(event.title || 'evento').replace(/\s+/g, '-')}.ics` };
  }

  lines.push('END:VCALENDAR');
  return { ics: lines.join('\r\n'), filename: `${(event.title || 'evento').replace(/\s+/g, '-')}.ics` };
}

module.exports = { generateEventIcs, toIcsDateTime, escapeIcsText };
