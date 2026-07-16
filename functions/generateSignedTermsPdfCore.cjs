const crypto = require('node:crypto');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function sha256(text) { return crypto.createHash('sha256').update(String(text || ''), 'utf8').digest('hex'); }
function formatDate(iso) { return iso ? new Date(iso).toLocaleString('pt-BR') : '—'; }
function wrapText(text, maxChars = 90) {
  if (!text) return [];
  const words = String(text).split(/\s+/);
  const lines = []; let current = '';
  for (const w of words) {
    if ((current + ' ' + w).trim().length > maxChars) { lines.push(current); current = w; }
    else { current = (current + ' ' + w).trim(); }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateSignedTermsPdf(input) {
  const { title = 'Termo', version = '1.0', body = '', acceptedAt, signatureText = '', uid = '', ip = '', userAgent = '' } = input || {};
  const signatureHash = sha256(signatureText);
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText(title, { x: 50, y: height - 60, size: 18, font: fontBold });
  page.drawText(`Versão ${version} — Lei 14.063/2020`, { x: 50, y: height - 80, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  let y = height - 130;
  for (const line of wrapText(body, 90)) {
    if (y < 220) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 60; }
    page.drawText(line, { x: 50, y, size: 10, font });
    y -= 14;
  }
  y = Math.max(80, y - 30);
  page.drawRectangle({ x: 45, y: y - 130, width: 505, height: 130, borderColor: rgb(0.6, 0.6, 0.6), borderWidth: 1 });
  page.drawText('ASSINATURA ELETRÔNICA', { x: 55, y: y - 18, size: 11, font: fontBold });
  page.drawText(`Aceito em: ${formatDate(acceptedAt)}`, { x: 55, y: y - 36, size: 9, font });
  page.drawText(`UID: ${uid} | IP: ${ip || 'N/A'}`, { x: 55, y: y - 50, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(`Hash SHA-256: ${signatureHash.slice(0, 32)}…`, { x: 55, y: y - 64, size: 8, font });
  page.drawText(`Assinatura: ${(signatureText || '').slice(0, 60)}`, { x: 55, y: y - 80, size: 9, font: fontBold });
  return await pdfDoc.save();
}

module.exports = { generateSignedTermsPdf, sha256, wrapText, formatDate };
