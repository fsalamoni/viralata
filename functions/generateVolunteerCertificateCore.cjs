/**
 * @fileoverview Core puro de `generateVolunteerCertificate.js` (TASK-248).
 *
 * Gera um PDF de certificado de horas de voluntariado conforme
 * Lei 9.608/1998 (Lei do Voluntariado) e o termo v2 §6.1(e).
 *
 * Recebe `{ db, storage, logger }` injetados para permitir mocking
 * completo em testes sem dependência do firebase-functions runtime.
 *
 * Fluxo:
 *  1. Busca perfil do voluntário (users/{uid}/volunteer_profile/main)
 *  2. Busca abrigos onde atua (clubs/{clubId}/volunteers/{uid})
 *  3. Busca participações no período (collectionGroup volunteer_participations)
 *  4. Soma horas + conta participações
 *  5. Gera PDF com pdfkit
 *  6. Faz upload para GCS (volunteer_certificates/{uid}/{date}.pdf)
 *  7. Retorna { downloadUrl }
 *
 * @see generateVolunteerCertificate.js (callable CF wrapper)
 * @see volunteerHoursCronCore.js (padrão de horas compatível)
 */

'use strict';

const PDFDocument = require('pdfkit');

// ─── Dependência injetável ──────────────────────────────────────────────

let _db = null;
let _storage = null;

function getDb() {
  if (_db) return _db;
  try {
    const { getFirestore } = require('firebase-admin/firestore');
    _db = getFirestore('viralata');
  } catch {
    _db = null;
  }
  return _db;
}

function getStorage() {
  if (_storage) return _storage;
  try {
    const { getStorage } = require('firebase-admin/storage');
    _storage = getStorage();
  } catch {
    _storage = null;
  }
  return _storage;
}

// ─── Helpers ────────────────────────────────────────────────────────────

const BUCKET_NAME = process.env.CERTIFICATE_BUCKET || 'viralata-assets';

/**
 * Mascara CPF: 123.456.789-00 → ***.456.***-00
 * @param {string|null} cpfRaw
 * @returns {string|null}
 */
function maskCpf(cpfRaw) {
  if (!cpfRaw) return null;
  const digits = cpfRaw.replace(/\D/g, '');
  if (digits.length !== 11) return cpfRaw;
  // LGPD: mascara todos os 9 dígitos, expõe só os 2 últimos
  return `***.***.***-${digits.slice(-2)}`;
}

/**
 * Formata data para exibição brasileira: DD de Mês de AAAA
 * @param {string|Date} date
 * @returns {string}
 */
function formatDateBr(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  return `${String(d.getDate()).padStart(2, '0')} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Formata data para range ISO: YYYY-MM-DD
 * @param {string|Date} date
 * @returns {string}
 */
function formatDateIso(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Calcula horas entre check_in e check_out.
 * @param {string|Date} checkIn
 * @param {string|Date} checkOut
 * @returns {number}
 */
function hoursBetween(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const t1 = checkIn instanceof Date ? checkIn.getTime() : new Date(checkIn).getTime();
  const t2 = checkOut instanceof Date ? checkOut.getTime() : new Date(checkOut).getTime();
  if (isNaN(t1) || isNaN(t2) || t2 <= t1) return 0;
  return Math.round(((t2 - t1) / (1000 * 60 * 60)) * 100) / 100;
}

// ─── Core ──────────────────────────────────────────────────────────────

/**
 * @typedef {object} CertificateInput
 * @property {string} uid
 * @property {string} [fromDate]  - YYYY-MM-DD, default 1 year ago
 * @property {string} [toDate]    - YYYY-MM-DD, default today
 * @property {string} [cpf]       - CPF raw do voluntário (opcional)
 */

/**
 * @typedef {object} CertificateResult
 * @property {string} downloadUrl
 * @property {string} storagePath
 * @property {number} totalHours
 * @property {number} totalParticipations
 * @property {string} periodFrom
 * @property {string} periodTo
 */

/**
 * Gera o certificado de horas do voluntário.
 *
 * @param {CertificateInput} input
 * @param {object} opts
 * @param {object} opts.db       - Firestore db injetado
 * @param {object} opts.storage  - Firebase Storage ref
 * @param {object} opts.logger  - { info, error }
 * @returns {Promise<CertificateResult>}
 */
async function generateVolunteerCertificate(input, opts = {}) {
  const db = opts.db || getDb();
  const storage = opts.storage || getStorage();
  const logger = opts.logger || { info: () => {}, error: () => {} };

  const { uid, fromDate, toDate, cpf } = input;

  if (!uid) throw new Error('uid é obrigatório');

  // ── 1. Período ──────────────────────────────────────────────────────
  const to = toDate ? new Date(toDate) : new Date();
  const from = fromDate
    ? new Date(fromDate)
    : new Date(to.getFullYear() - 1, to.getMonth(), to.getDate());

  const periodFromStr = formatDateBr(from);
  const periodToStr = formatDateBr(to);
  const storageDateStr = formatDateIso(to);

  // ── 2. Perfil do voluntário ─────────────────────────────────────────
  const profileSnap = await db.collection('users').doc(uid)
    .collection('volunteer_profile').doc('main').get();

  const profile = profileSnap.data() || {};
  const volunteerName = profile.display_name || profile.name || 'Voluntário';
  const maskedCpf = cpf ? maskCpf(cpf) : null;

  // ── 3. Abrigos onde atua ─────────────────────────────────────────────
  const rostersSnap = await db.collectionGroup('volunteers')
    .where('uid', '==', uid)
    .where('__active__', '==', true)
    .get();

  const shelters = [];
  for (const rosterDoc of rostersSnap.docs) {
    const parts = rosterDoc.ref.path.split('/');
    const clubId = parts[1];
    shelters.push({
      clubId,
      name: rosterDoc.data().shelter_name || clubId,
      role: rosterDoc.data().role || 'Voluntário',
    });
  }

  const shelterNames = shelters.length > 0
    ? shelters.map(s => s.name).join(', ')
    : 'Não especificado';

  // ── 4. Participações no período ──────────────────────────────────────
  const fromIso = formatDateIso(from);
  const toIso = formatDateIso(to);

  const participationsSnap = await db.collectionGroup('volunteer_participations')
    .where('volunteer_uid', '==', uid)
    .where('status', 'in', ['completed', 'checked_in'])
    .get();

  let totalHours = 0;
  const participations = [];
  for (const doc of participationsSnap.docs) {
    const data = doc.data();
    const eventDate = data.event_date;
    if (!eventDate) continue;
    const d = new Date(eventDate);
    if (isNaN(d.getTime())) continue;
    if (d < from || d > to) continue;

    const hours = hoursBetween(data.check_in, data.check_out);
    if (hours <= 0) continue;

    totalHours += hours;
    participations.push({
      eventLabel: data.event_label || data.event_type || 'Atividade',
      eventDate: formatDateBr(eventDate),
      hours: Math.round(hours * 100) / 100,
      shelter: data.shelter_name || data.club_id || '',
    });
  }

  totalHours = Math.round(totalHours * 100) / 100;

  logger.info('generateVolunteerCertificate', {
    uid, totalHours, participations: participations.length,
    shelters: shelters.length, periodFrom: fromIso, periodTo: toIso,
  });

  // ── 5. Gera PDF ─────────────────────────────────────────────────────
  const pdfBuffer = await buildPdfBuffer({
    volunteerName,
    maskedCpf,
    shelterNames,
    totalHours,
    participations,
    periodFrom: periodFromStr,
    periodTo: periodToStr,
    generatedAt: new Date(),
    uid,
  });

  // ── 6. Upload para GCS ──────────────────────────────────────────────
  const storagePath = `volunteer_certificates/${uid}/${storageDateStr}.pdf`;

  if (storage) {
    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          uid,
          periodFrom: fromIso,
          periodTo: toIso,
          totalHours,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    await file.makePublic();

    const [downloadUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000, // 1 ano
    });

    return {
      downloadUrl,
      storagePath,
      totalHours,
      totalParticipations: participations.length,
      periodFrom: fromIso,
      periodTo: toIso,
    };
  }

  // Fallback: retorna base64 se storage não disponível (dev/local)
  return {
    downloadUrl: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
    storagePath,
    totalHours,
    totalParticipations: participations.length,
    periodFrom: fromIso,
    periodTo: toIso,
  };
}

// ─── PDF Builder ────────────────────────────────────────────────────────

/**
 * Monta o buffer PDF do certificado.
 * @param {object} data
 * @returns {Promise<Buffer>}
 */
async function buildPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { volunteerName, maskedCpf, shelterNames, totalHours,
      participations, periodFrom, periodTo, generatedAt, uid } = data;

    const pageW = doc.page.width;
    const centerX = pageW / 2;

    // ── Background decorativo (borda) ──────────────────────────────────
    doc.rect(30, 30, pageW - 60, doc.page.height - 60)
      .lineWidth(2)
      .stroke('#2D7D46');

    // ── Header ─────────────────────────────────────────────────────────
    doc.rect(40, 40, pageW - 80, 80)
      .fill('#2D7D46');

    doc.fillColor('#FFFFFF')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('VIRALATA', 0, 55, { align: 'center', width: pageW })
      .fontSize(8)
      .font('Helvetica')
      .text('Plataforma de Gestão de Abrigos', 0, 72, { align: 'center', width: pageW })
      .text('viralata.app  ·  voluntarios@viralata.org', 0, 83, { align: 'center', width: pageW });

    doc.fillColor('#000000');

    let y = 145;

    // ── Título ────────────────────────────────────────────────────────
    doc.fontSize(22)
      .font('Helvetica-Bold')
      .fillColor('#1A5C34')
      .text('CERTIFICADO DE VOLUNTARIADO', 0, y, { align: 'center', width: pageW });

    y += 38;

    doc.fontSize(10)
      .fillColor('#555555')
      .font('Helvetica')
      .text('Certificamos que', 0, y, { align: 'center', width: pageW });

    y += 22;

    // ── Nome do voluntário ─────────────────────────────────────────────
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(volunteerName, 0, y, { align: 'center', width: pageW });

    y += 30;

    if (maskedCpf) {
      doc.fontSize(9)
        .fillColor('#888888')
        .font('Helvetica')
        .text(`CPF: ${maskedCpf}`, 0, y, { align: 'center', width: pageW });
      y += 18;
    }

    doc.fontSize(10)
      .fillColor('#555555')
      .font('Helvetica')
      .text('prestou serviços de voluntariado no âmbito da', 0, y, { align: 'center', width: pageW });

    y += 18;

    // ── Abrigo(s) ──────────────────────────────────────────────────────
    doc.fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#2D7D46')
      .text(shelterNames, 0, y, { align: 'center', width: pageW });

    y += 26;

    doc.fontSize(10)
      .fillColor('#555555')
      .font('Helvetica')
      .text(`no período de ${periodFrom} a ${periodTo}`, 0, y, { align: 'center', width: pageW });

    y += 26;

    // ── Total de horas ─────────────────────────────────────────────────
    doc.fontSize(36)
      .font('Helvetica-Bold')
      .fillColor('#1A5C34')
      .text(`${totalHours.toFixed(2).replace('.', ',')} horas`, 0, y, { align: 'center', width: pageW });

    y += 45;

    doc.fontSize(10)
      .fillColor('#555555')
      .font('Helvetica')
      .text(`${participations.length} atividade${participations.length !== 1 ? 's' : ''} registrada${participations.length !== 1 ? 's' : ''}`, 0, y, { align: 'center', width: pageW });

    y += 30;

    // ── Detalhamento (se couber) ───────────────────────────────────────
    if (participations.length > 0 && participations.length <= 8) {
      doc.fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#333333')
        .text('ATIVIDADES', 60, y, { width: pageW - 120 });
      y += 18;

      doc.font('Helvetica').fontSize(8).fillColor('#555555');
      for (const p of participations.slice(0, 8)) {
        doc.text(
          `${p.eventDate}  ·  ${p.eventLabel}  ·  ${p.hours.toFixed(2).replace('.', ',')}h  ·  ${p.shelter}`,
          60, y, { width: pageW - 120 },
        );
        y += 14;
      }
      y += 6;
    }

    // ── Lei 9.608/1998 ─────────────────────────────────────────────────
    doc.rect(40, y, pageW - 80, 40)
      .fill('#F0F7F2');

    y += 8;

    doc.fontSize(7.5)
      .fillColor('#666666')
      .font('Helvetica')
      .text(
        'CERTIFICADO EMITIDO CONFORME LEI 9.608/1998 (Lei do Voluntariado, de 18/02/1998, DOU 19/02/1998). ' +
        'A presente certificação não gera vínculo empregatício, nem obrigação de natureza trabalhista, ' +
        'previdenciária ou afim, nos termos do Art. 1º, §2º da referida lei.',
        50, y, { width: pageW - 100, align: 'justify' },
      );

    y += 28;

    // ── Footer ─────────────────────────────────────────────────────────
    const footerY = doc.page.height - 90;

    doc.moveTo(80, footerY)
      .lineTo(centerX - 20, footerY)
      .stroke('#CCCCCC');

    doc.fillColor('#888888')
      .fontSize(8)
      .font('Helvetica-Bold')
      .text('Viralata.org', 0, footerY + 6, { align: 'center', width: pageW })
      .font('Helvetica')
      .fontSize(7)
      .text(
        `Emitido em ${formatDateBr(generatedAt)}  ·  UID: ${uid.substring(0, 8)}***  ·  viralata.app/certificado`,
        0, footerY + 18, { align: 'center', width: pageW },
      )
      .text(
        'shelter_volunteer_certificate_v1  ·  compliance: LGPD + Lei 14.063/2020',
        0, footerY + 28, { align: 'center', width: pageW },
      );

    doc.moveTo(centerX + 20, footerY)
      .lineTo(pageW - 80, footerY)
      .stroke('#CCCCCC');

    doc.fillColor('#000000');

    doc.end();
  });
}

// ─── Exports ────────────────────────────────────────────────────────────

function _setOverrides({ db, storage } = {}) {
  if (db !== undefined) _db = db;
  if (storage !== undefined) _storage = storage;
}
function _resetOverrides() {
  _db = null;
  _storage = null;
}

module.exports = {
  generateVolunteerCertificate,
  buildPdfBuffer,
  maskCpf,
  formatDateBr,
  formatDateIso,
  hoursBetween,
  _setOverrides,
  _resetOverrides,
  BUCKET_NAME,
};
