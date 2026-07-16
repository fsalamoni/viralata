/**
 * @fileoverview TASK-343: Pure logic for event certificate PDF generation.
 *
 * Uses pdf-lib (pure JS, no native deps — works in Cloud Functions).
 * Generates a landscape A4 certificate of participation.
 *
 * Public API:
 *   generateCertificateBuffer({ participantName, eventTitle, eventDate,
 *                               eventLocation, eventType, orgName, issuedAt })
 *   → Promise<Buffer>
 *
 * @see TASK-343
 */

'use strict';

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// ─── Color palette (Viralata brand) ─────────────────────────────────────
const BRAND_ORANGE = rgb(0.96, 0.45, 0.0);   // #F57300
const BRAND_DARK   = rgb(0.12, 0.10, 0.08);  // #1F1A14
const BRAND_LIGHT  = rgb(0.97, 0.91, 0.85);  // #F7E8D9
const GRAY_TEXT    = rgb(0.35, 0.30, 0.25);  // #594C40
const DIVIDER_GRAY = rgb(0.80, 0.73, 0.65);  // #CCBAA6

// A4 landscape dimensions in PDF points (1 pt = 1/72 inch)
const PAGE_W = 841.89;
const PAGE_H = 595.28;

// ─── Helpers ────────────────────────────────────────────────────────────

function pt(x, y) { return { x, y }; }

/** Format a Date or ISO string to Brazilian locale. */
function formatDateBR(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Main export ────────────────────────────────────────────────────────

/**
 * Generate a certificate PDF buffer.
 *
 * @param {object} opts
 * @param {string} opts.participantName  - Full name of the participant
 * @param {string} opts.eventTitle       - Title of the event
 * @param {string} opts.eventDate        - ISO date string or Date of the event
 * @param {string} opts.eventLocation    - Location of the event
 * @param {string} opts.eventType        - Event type label (e.g. "Mutirão de Adoção")
 * @param {string} opts.orgName          - Organization (shelter) name
 * @param {string} [opts.issuedAt]       - ISO date string of issuance (default: now)
 * @returns {Promise<Buffer>} PDF as a Buffer
 */
async function generateCertificateBuffer({
  participantName,
  eventTitle,
  eventDate,
  eventLocation,
  eventType,
  orgName,
  issuedAt,
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);

  const helveticaBold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const helvetica      = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaItalic = await doc.embedFont(StandardFonts.HelveticaOblique);

  // ── Background ────────────────────────────────────────────────────────
  page.drawRectangle({
    x: 0, y: 0, width: PAGE_W, height: PAGE_H,
    color: BRAND_LIGHT,
  });

  // ── Outer border ─────────────────────────────────────────────────────
  const BORDER_MARGIN = 30;
  page.drawRectangle({
    x: BORDER_MARGIN, y: BORDER_MARGIN,
    width: PAGE_W - 2 * BORDER_MARGIN, height: PAGE_H - 2 * BORDER_MARGIN,
    borderColor: BRAND_ORANGE,
    borderWidth: 3,
    color: BRAND_LIGHT,
  });

  // ── Inner border ─────────────────────────────────────────────────────
  const INNER_MARGIN = 40;
  page.drawRectangle({
    x: INNER_MARGIN, y: INNER_MARGIN,
    width: PAGE_W - 2 * INNER_MARGIN, height: PAGE_H - 2 * INNER_MARGIN,
    borderColor: DIVIDER_GRAY,
    borderWidth: 1,
    color: BRAND_LIGHT,
  });

  const cx = PAGE_W / 2;

  // ── "Viralata" brand header ─────────────────────────────────────────
  page.drawText('Viralata', {
    x: cx - helveticaBold.widthOfTextAtSize('Viralata', 16) / 2,
    y: PAGE_H - 80,
    size: 16,
    font: helveticaBold,
    color: BRAND_ORANGE,
  });

  // ── Decorative top bar ───────────────────────────────────────────────
  page.drawRectangle({
    x: 60, y: PAGE_H - 100, width: PAGE_W - 120, height: 3,
    color: BRAND_ORANGE,
  });

  // ── Title: "Certificado de Participação" ────────────────────────────
  const titleText = 'Certificado de Participação';
  page.drawText(titleText, {
    x: cx - helveticaBold.widthOfTextAtSize(titleText, 28) / 2,
    y: PAGE_H - 150,
    size: 28,
    font: helveticaBold,
    color: BRAND_DARK,
  });

  // ── "Certificamos que" ───────────────────────────────────────────────
  const certifyText = 'Certificamos que';
  page.drawText(certifyText, {
    x: cx - helvetica.widthOfTextAtSize(certifyText, 13) / 2,
    y: PAGE_H - 200,
    size: 13,
    font: helvetica,
    color: GRAY_TEXT,
  });

  // ── Participant name ─────────────────────────────────────────────────
  const name = (participantName || '').trim() || 'Participante';
  const nameSize = Math.min(32, 600 / helveticaBold.widthOfTextAtSize(name, 32) * 32);
  page.drawText(name, {
    x: cx - helveticaBold.widthOfTextAtSize(name, nameSize) / 2,
    y: PAGE_H - 240,
    size: nameSize,
    font: helveticaBold,
    color: BRAND_ORANGE,
  });

  // ── "participou do evento" ───────────────────────────────────────────
  const participatedText = 'participou do evento';
  page.drawText(participatedText, {
    x: cx - helvetica.widthOfTextAtSize(participatedText, 13) / 2,
    y: PAGE_H - 278,
    size: 13,
    font: helvetica,
    color: GRAY_TEXT,
  });

  // ── Event title ──────────────────────────────────────────────────────
  const evtTitle = (eventTitle || '').trim() || 'Evento';
  const evtTitleSize = Math.min(24, 700 / helveticaBold.widthOfTextAtSize(evtTitle, 24) * 24);
  page.drawText(evtTitle, {
    x: cx - helveticaBold.widthOfTextAtSize(evtTitle, evtTitleSize) / 2,
    y: PAGE_H - 318,
    size: evtTitleSize,
    font: helveticaBold,
    color: BRAND_DARK,
  });

  // ── Event type badge ─────────────────────────────────────────────────
  if (eventType) {
    const typeText = eventType;
    const typeW = helvetica.widthOfTextAtSize(typeText, 11);
    const typeX = cx - typeW / 2;
    page.drawRectangle({
      x: typeX - 12, y: PAGE_H - 346, width: typeW + 24, height: 20,
      borderColor: BRAND_ORANGE, borderWidth: 1,
      color: rgb(1, 0.97, 0.93),
    });
    page.drawText(typeText, {
      x: typeX, y: PAGE_H - 343,
      size: 11,
      font: helvetica,
      color: BRAND_ORANGE,
    });
  }

  // ── Date + Location ──────────────────────────────────────────────────
  const dateStr = eventDate ? formatDateBR(eventDate) : '';
  const locStr  = (eventLocation || '').trim();

  if (dateStr || locStr) {
    const details = [dateStr, locStr].filter(Boolean).join('  •  ');
    page.drawText(details, {
      x: cx - helvetica.widthOfTextAtSize(details, 11) / 2,
      y: PAGE_H - 380,
      size: 11,
      font: helvetica,
      color: GRAY_TEXT,
    });
  }

  // ── Divider line ─────────────────────────────────────────────────────
  page.drawLine({
    start: pt(120, PAGE_H - 415), end: pt(PAGE_W - 120, PAGE_H - 415),
    thickness: 1, color: DIVIDER_GRAY,
  });

  // ── Organization ─────────────────────────────────────────────────────
  if (orgName) {
    const orgText = `Realizado por: ${orgName}`;
    page.drawText(orgText, {
      x: cx - helvetica.widthOfTextAtSize(orgText, 10) / 2,
      y: PAGE_H - 435,
      size: 10,
      font: helvetica,
      color: GRAY_TEXT,
    });
  }

  // ── "Plataforma Viralata" ────────────────────────────────────────────
  const platformText = 'Plataforma Viralata — Sistema de Gestão de Abrigo';
  page.drawText(platformText, {
    x: cx - helveticaItalic.widthOfTextAtSize(platformText, 9) / 2,
    y: PAGE_H - 455,
    size: 9,
    font: helveticaItalic,
    color: DIVIDER_GRAY,
  });

  // ── Issue date (bottom left) ─────────────────────────────────────────
  const issued = issuedAt ? formatDateBR(issuedAt) : formatDateBR(new Date());
  const issueText = `Emitido em: ${issued}`;
  page.drawText(issueText, {
    x: 70,
    y: 60,
    size: 9,
    font: helvetica,
    color: GRAY_TEXT,
  });

  // ── Bottom decorative bar ────────────────────────────────────────────
  page.drawRectangle({
    x: 60, y: 48, width: PAGE_W - 120, height: 3,
    color: BRAND_ORANGE,
  });

  // ── Bottom right corner decoration ────────────────────────────────────
  const cornerSize = 20;
  page.drawRectangle({
    x: PAGE_W - 70, y: 50, width: cornerSize, height: cornerSize,
    color: BRAND_ORANGE,
  });
  page.drawRectangle({
    x: PAGE_W - 70 - cornerSize - 4, y: 50, width: cornerSize, height: cornerSize,
    color: rgb(1, 0.85, 0.7),
  });

  const pdfBytes = await doc.save();
  return Buffer.from(pdfBytes);
}

// ─── Validation ─────────────────────────────────────────────────────────

const VALID_EVENT_TYPES = new Set([
  'SOCIAL', 'ADOPTION_DRIVE', 'MEETING', 'TRAINING', 'VACCINATION',
  'LECTURE', 'FUNDRAISING', 'PET_DAY',
]);

/**
 * Validate input options. Returns an array of error messages (empty = valid).
 *
 * @param {object} opts
 * @returns {string[]}
 */
function validateInput(opts) {
  const errors = [];
  if (!opts || typeof opts !== 'object') return ['opts must be a non-null object'];
  if (!opts.participantName || typeof opts.participantName !== 'string' || !opts.participantName.trim()) {
    errors.push('participantName is required and must be a non-empty string');
  }
  if (!opts.eventTitle || typeof opts.eventTitle !== 'string' || !opts.eventTitle.trim()) {
    errors.push('eventTitle is required and must be a non-empty string');
  }
  if (opts.eventType && !VALID_EVENT_TYPES.has(opts.eventType)) {
    errors.push(`eventType must be one of: ${[...VALID_EVENT_TYPES].join(', ')}`);
  }
  if (opts.eventDate) {
    const d = new Date(opts.eventDate);
    if (Number.isNaN(d.getTime())) errors.push('eventDate must be a valid ISO date string');
  }
  return errors;
}

module.exports = { generateCertificateBuffer, validateInput };
