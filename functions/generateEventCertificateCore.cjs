'use strict';

/**
 * generateEventCertificateCore.cjs
 * Pure-logic certificate PDF generator (no Firebase SDK).
 * Uses pdf-lib — runs in any Node.js environment (local test, CF, emulator).
 *
 * @module generateEventCertificateCore
 */

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// ─── Brand colours (match Viralata design system) ─────────────────────────────
const VIRALATA_ORANGE  = rgb(0.98, 0.52, 0.12);   // #FA851F
const VIRALATA_BROWN   = rgb(0.55, 0.27, 0.10);   // #8C451A
const DARK             = rgb(0.12, 0.10, 0.09);   // near-black
const MID_GRAY         = rgb(0.55, 0.52, 0.50);
const LIGHT_BG         = rgb(1.0,  0.97, 0.93);   // warm cream

// ─── Certificate dimensions (A4 landscape = 842 × 595 points) ───────────────
const W = 842;
const H = 595;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function centerX(textWidth, pageWidth) {
  return (pageWidth - textWidth) / 2;
}

function rgbHex(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

/**
 * Sanitize a string so it can be safely encoded with StandardFonts (Latin-1).
 * Replaces emoji and other non-Latin-1 chars with '?'. Keeps common accented
 * chars (áéíóúàèìòùâêîôûãõäëïöüçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÄËÏÖÜÇ).
 */
function sanitizeForStandardFont(str) {
  if (!str) return str;
  // eslint-disable-next-line no-control-regex
  return str.replace(/[^\x00-\xFF]/g, '?').replace(/\?+/g, '?').trim() || str;
}

/**
 * Draw the Viralata decorative top border.
 */
function drawTopBar(page, boldFont, regularFont) {
  const barH = 6;
  // Solid orange band
  page.drawRectangle({ x: 0, y: H - barH, width: W, height: barH, color: VIRALATA_ORANGE });
  // Thin brown line below
  page.drawRectangle({ x: 0, y: H - barH - 2, width: W, height: 2, color: VIRALATA_BROWN });
}

/**
 * Draw the bottom bar.
 */
function drawBottomBar(page) {
  page.drawRectangle({ x: 0, y: 0, width: W, height: 6, color: VIRALATA_ORANGE });
  page.drawRectangle({ x: 0, y: 6, width: W, height: 2, color: VIRALATA_BROWN });
}

/**
 * Draw a centred horizontal rule with a small icon gap.
 */
function drawDivider(page, boldFont, y) {
  const lineW = (W / 2) - 80;
  const midX  = W / 2;
  page.drawLine({
    start: { x: midX - lineW, y },
    end:   { x: midX + lineW, y },
    thickness: 1,
    color: rgbHex('#FA851F'),
    opacity: 0.5,
  });
}

/**
 * Main certificate builder.
 *
 * @param {object} params
 * @param {string} params.userName       — participant full name
 * @param {string} params.eventTitle    — event title
 * @param {string} params.eventDate     — formatted date string (e.g. "15 de novembro de 2026")
 * @param {string} params.eventLocation — event location
 * @param {string} params.eventType     — human-readable event type
 * @param {string} params.issuedAt      — ISO date string of issue
 * @param {string} [params.clubName]    — optional club / community name
 * @param {string} [params.hours]       — optional volunteer hours
 * @returns {Promise<Uint8Array>} PDF bytes
 */
async function generateEventCertificatePdf({
  userName,
  eventTitle,
  eventDate,
  eventLocation,
  eventType,
  issuedAt,
  clubName,
  hours,
} = {}) {
  if (!userName)           throw new Error('userName is required');
  if (!eventTitle)         throw new Error('eventTitle is required');
  if (!eventDate)          throw new Error('eventDate is required');

  // Sanitize all strings for StandardFont compatibility (Latin-1 only)
  userName      = sanitizeForStandardFont(userName);
  eventTitle    = sanitizeForStandardFont(eventTitle);
  eventLocation = sanitizeForStandardFont(eventLocation);
  eventType     = sanitizeForStandardFont(eventType);
  clubName      = clubName   ? sanitizeForStandardFont(clubName) : null;
  hours         = hours      ? sanitizeForStandardFont(hours)  : null;

  const doc = await PDFDocument.create();
  doc.setTitle(`Certificado — ${eventTitle} — ${userName}`);
  doc.setAuthor('Viralata — Sistema de Gestão do Abrigo');
  doc.setSubject(`Certificado de participação — ${eventTitle}`);

  const page = doc.addPage([W, H]);

  // Background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: LIGHT_BG });

  // Decorative bars
  drawTopBar(page, null, null);
  drawBottomBar(page);

  // Fonts
  const regularFont = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont   = await doc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await doc.embedFont(StandardFonts.HelveticaOblique);

  // ── Header ────────────────────────────────────────────────────────────────
  const logoY = H - 58;
  // "Viralata" wordmark (no emoji — StandardFonts can't encode Unicode > U+00FF)
  const logoText  = 'Viralata';
  const logoSize  = 20;
  const logoWidth = boldFont.widthOfTextAtSize(logoText, logoSize);
  page.drawText(logoText, {
    x: centerX(logoWidth, W),
    y: logoY,
    size: logoSize,
    font: boldFont,
    color: VIRALATA_ORANGE,
  });

  // "Sistema de Gestão do Abrigo"
  const subtitle = 'Sistema de Gestão do Abrigo';
  const subSize  = 9;
  const subWidth = regularFont.widthOfTextAtSize(subtitle, subSize);
  page.drawText(subtitle, {
    x: centerX(subWidth, W),
    y: logoY - 16,
    size: subSize,
    font: regularFont,
    color: MID_GRAY,
  });

  // ── Title block ──────────────────────────────────────────────────────────
  const titleMain = 'CERTIFICADO';
  const titleSize = 36;
  const titleW    = boldFont.widthOfTextAtSize(titleMain, titleSize);
  const titleY    = H - 145;
  page.drawText(titleMain, {
    x: centerX(titleW, W),
    y: titleY,
    size: titleSize,
    font: boldFont,
    color: DARK,
  });

  // "de participação"
  const subTitle = 'de Participação em Evento';
  const subTitleSize = 14;
  const subTitleW    = italicFont.widthOfTextAtSize(subTitle, subTitleSize);
  page.drawText(subTitle, {
    x: centerX(subTitleW, W),
    y: titleY - 22,
    size: subTitleSize,
    font: italicFont,
    color: MID_GRAY,
  });

  // Divider
  drawDivider(page, boldFont, titleY - 38);

  // ── "Conferimos a" ────────────────────────────────────────────────────────
  const introText = 'Conferimos a';
  const introSize  = 12;
  const introW     = regularFont.widthOfTextAtSize(introText, introSize);
  page.drawText(introText, {
    x: centerX(introW, W),
    y: titleY - 65,
    size: introSize,
    font: regularFont,
    color: MID_GRAY,
  });

  // ── Participant name (large) ──────────────────────────────────────────────
  const nameSize = 28;
  const nameW    = boldFont.widthOfTextAtSize(userName, nameSize);
  page.drawText(userName, {
    x: centerX(nameW, W),
    y: titleY - 100,
    size: nameSize,
    font: boldFont,
    color: rgbHex('#8C451A'),
  });

  // "por ter participado de"
  const participationText = 'por ter participado de';
  const partSize  = 12;
  const partW     = regularFont.widthOfTextAtSize(participationText, partSize);
  page.drawText(participationText, {
    x: centerX(partW, W),
    y: titleY - 125,
    size: partSize,
    font: regularFont,
    color: MID_GRAY,
  });

  // ── Event title ───────────────────────────────────────────────────────────
  const evtTitleSize = 18;
  const evtTitleW   = boldFont.widthOfTextAtSize(eventTitle, evtTitleSize);
  page.drawText(eventTitle, {
    x: centerX(evtTitleW, W),
    y: titleY - 155,
    size: evtTitleSize,
    font: boldFont,
    color: VIRALATA_ORANGE,
  });

  // ── Event details ────────────────────────────────────────────────────────
  const detailY   = titleY - 188;
  const detailSize = 11;
  const lines = [
    eventDate     ? `Data: ${eventDate}`              : null,
    eventLocation ? `Local: ${eventLocation}`         : null,
    eventType     ? `Tipo: ${eventType}`             : null,
    clubName      ? `Organizacao: ${clubName}`        : null,
    hours         ? `Horas registradas: ${hours}`    : null,
  ].filter(Boolean);

  lines.forEach((line, i) => {
    const lw = regularFont.widthOfTextAtSize(line, detailSize);
    page.drawText(line, {
      x: centerX(lw, W),
      y: detailY - i * 20,
      size: detailSize,
      font: regularFont,
      color: MID_GRAY,
    });
  });

  // ── Issue date ────────────────────────────────────────────────────────────
  const issueY = 62;
  const issued = issuedAt
    ? new Date(issuedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const issueText = `Emitido em ${issued}`;
  const issueW    = regularFont.widthOfTextAtSize(issueText, 9);
  page.drawText(issueText, {
    x: centerX(issueW, W),
    y: issueY,
    size: 9,
    font: regularFont,
    color: MID_GRAY,
  });

  // ── QR code / verification stub ──────────────────────────────────────────
  // We don't embed a QR (no library), but we leave a visual placeholder box.
  const stubY = issueY - 5;
  const stubText = `Documento emitido pelo Viralata — Sistema de Gestão do Abrigo`;
  const stubSize = 7;
  const stubW    = regularFont.widthOfTextAtSize(stubText, stubSize);
  page.drawText(stubText, {
    x: centerX(stubW, W),
    y: stubY - 14,
    size: stubSize,
    font: regularFont,
    color: rgbHex('#AAAAAA'),
  });

  return doc.save();
}

module.exports = { generateEventCertificatePdf };
