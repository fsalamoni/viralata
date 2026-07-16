const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function diffHours(from, to) {
  if (!from || !to) return 0;
  return Math.max(0, (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60));
}
function formatDate(iso) { return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'; }
function formatDateTime(iso) { return iso ? new Date(iso).toLocaleString('pt-BR') : '—'; }

function sumParticipationHours(participations) {
  if (!Array.isArray(participations)) return 0;
  return participations.reduce((acc, p) => acc + diffHours(p.started_at, p.ended_at), 0);
}

async function generateVolunteerCertificatePdf(input) {
  const { volunteerName = 'Voluntário', volunteerUid = '', periodFrom, periodTo, participations = [], termsHash = '', issuerName = 'Viralata' } = input || {};
  const totalHours = sumParticipationHours(participations);
  const issuedAt = new Date().toISOString();
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('Certificado de Horas Voluntárias — Viralata');
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  page.drawText('CERTIFICADO DE HORAS VOLUNTÁRIAS', { x: 50, y: height - 80, size: 20, font: fontBold, color: rgb(0.1, 0.4, 0.2) });
  page.drawText('Lei 9.608/1998, art. 1º + Lei 14.063/2020', { x: 50, y: height - 105, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  let y = height - 160;
  page.drawText('Certificamos que', { x: 50, y, size: 12, font });
  y -= 18;
  page.drawText(volunteerName, { x: 50, y, size: 18, font: fontBold });
  y -= 18;
  page.drawText(`UID: ${volunteerUid}`, { x: 50, y, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
  y -= 28;
  page.drawText('atuou como voluntário(a) na plataforma Viralata,', { x: 50, y, size: 12, font });
  y -= 18;
  page.drawText(`no período de ${formatDate(periodFrom)} a ${formatDate(periodTo)},`, { x: 50, y, size: 12, font });
  y -= 18;
  page.drawText(`totalizando ${totalHours.toFixed(1)} horas de serviço voluntário.`, { x: 50, y, size: 12, font: fontBold });
  y -= 36;
  page.drawText('Atividades realizadas:', { x: 50, y, size: 11, font: fontBold });
  for (const p of participations.slice(0, 15)) {
    y -= 14;
    const h = diffHours(p.started_at, p.ended_at).toFixed(1);
    page.drawText(`• ${formatDate(p.started_at)} — ${p.title || 'Atividade'} (${h}h)`.slice(0, 90), { x: 60, y, size: 9, font });
    if (y < 100) break;
  }
  y = 100;
  page.drawText(`Emitido em: ${formatDateTime(issuedAt)}`, { x: 50, y, size: 9, font });
  y -= 14;
  page.drawText(`Hash do termo v2: ${(termsHash || '').slice(0, 32)}…`, { x: 50, y, size: 8, font, color: rgb(0.5, 0.5, 0.5) });
  return await pdfDoc.save();
}

module.exports = { generateVolunteerCertificatePdf, sumParticipationHours, diffHours, formatDate, formatDateTime };
