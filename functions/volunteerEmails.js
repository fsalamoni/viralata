/**
 * @fileoverview volunteerEmails — templates transactional + promotional.
 *
 * Cada função checa `email_consent_promotional` do recipient para emails
 * promocionais (milestone, welcome). Emails transactionais (shift
 * reminder, BG check status) são sempre enviados.
 *
 * Tipos:
 *   - Transactional: shift reminder, BG check status, application update.
 *     Sem opt-in (consentimento implícito pela participação no programa).
 *   - Promotional: welcome, milestone 100h, newsletter.
 *     Exige `email_consent_promotional=true`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22
 * @see TASK-229
 */

const { getEmailProvider } = require('./emailProviderAdapter');
const admin = require('firebase-admin');

let _db = null;
function getDb() {
  if (_db) return _db;
  _db = admin.firestore();
  return _db;
}

async function getUserEmailPrefs(uid, db = getDb()) {
  const userDoc = await db.collection('users').doc(uid).get();
  const data = userDoc.data() || {};
  return {
    email: data.email || null,
    email_consent_promotional: Boolean(data.volunteer_profile?.email_consent_promotional),
    fcm_tokens: Array.isArray(data.fcm_tokens) ? data.fcm_tokens : [],
  };
}

/**
 * Envia email de boas-vindas quando voluntário entra na roster do abrigo.
 * Tipo: promotional (consentimento explícito necessário).
 */
async function sendVolunteerWelcomeEmail(uid, shelterName) {
  const prefs = await getUserEmailPrefs(uid);
  if (!prefs.email) return { ok: false, reason: 'no_email' };
  if (!prefs.email_consent_promotional) return { ok: false, reason: 'no_consent' };

  const provider = getEmailProvider();
  return provider.send({
    to: prefs.email,
    subject: `Bem-vindo ao ${shelterName}!`,
    text: `Você entrou na roster de voluntários do ${shelterName}. Acesse /perfil#voluntariadas para ver mais.`,
    html: `<h1>Bem-vindo!</h1><p>Você entrou na roster de voluntários do <strong>${shelterName}</strong>.</p><p><a href="https://viralata.app/perfil#voluntariadas">Ver perfil</a></p>`,
  });
}

/**
 * Envia lembrete de turno (24h antes). Tipo: transactional.
 */
async function sendShiftReminderEmail(uid, eventDate, eventType) {
  const prefs = await getUserEmailPrefs(uid);
  if (!prefs.email) return { ok: false, reason: 'no_email' };

  const provider = getEmailProvider();
  return provider.send({
    to: prefs.email,
    subject: `Lembrete: turno ${eventType} amanhã`,
    text: `Você tem um turno ${eventType} em ${eventDate}. Não esqueça!`,
    html: `<h2>Lembrete de turno</h2><p>Você tem um turno <strong>${eventType}</strong> em <strong>${eventDate}</strong>.</p>`,
  });
}

/**
 * Envia email de milestone (ex: 100h, 500h de voluntariado).
 * Tipo: promotional (consentimento explícito necessário).
 */
async function sendMilestoneEmail(uid, totalHours) {
  const prefs = await getUserEmailPrefs(uid);
  if (!prefs.email) return { ok: false, reason: 'no_email' };
  if (!prefs.email_consent_promotional) return { ok: false, reason: 'no_consent' };

  const provider = getEmailProvider();
  return provider.send({
    to: prefs.email,
    subject: `Parabéns! ${totalHours} horas de voluntariado`,
    text: `Você completou ${totalHours} horas de voluntariado! Continue assim!`,
    html: `<h1>Parabéns!</h1><p>Você completou <strong>${totalHours} horas</strong> de voluntariado.</p>`,
  });
}

/**
 * Envia notificação de status do background check. Tipo: transactional.
 */
async function sendBackgroundCheckStatusEmail(uid, status) {
  const prefs = await getUserEmailPrefs(uid);
  if (!prefs.email) return { ok: false, reason: 'no_email' };

  const provider = getEmailProvider();
  return provider.send({
    to: prefs.email,
    subject: `Background check: ${status}`,
    text: `Seu background check foi atualizado para: ${status}.`,
    html: `<h2>Background check atualizado</h2><p>Status atual: <strong>${status}</strong>.</p>`,
  });
}

/**
 * Envia email de confirmação de turno (template volunteer-shift-confirmed-v1).
 * Tipo: transactional — enviado sem necessidade de consentimento explícito,
 * pois faz parte da operação normal do programa de voluntariado.
 *
 * @param {string} uid - uid do voluntário
 * @param {{ eventLabel: string, eventDate: string|null, role: string|null, clubId: string }} opts
 * @returns {Promise<{ok: boolean, reason?: string, messageId?: string}>}
 */
async function sendShiftConfirmationEmail(uid, { eventLabel, eventDate, role, clubId }) {
  const prefs = await getUserEmailPrefs(uid);
  if (!prefs.email) return { ok: false, reason: 'no_email' };

  const roleText = role ? ` na função <strong>${role}</strong>` : '';
  const dateText = eventDate
    ? `<p style="font-size:18px; font-weight:bold; margin: 16px 0; color:#2c3e50;">📅 Data: ${eventDate}</p>`
    : '';
  const shiftLink = `https://viralata.app/abrigo/${clubId}/voluntarios/participacoes`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Turno confirmado</title>
</head>
<body style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px; background:#f9f9f9;">
  <div style="background:#fff; border-radius:8px; padding:32px; border-top:4px solid #27ae60;">
    <h2 style="color:#27ae60; margin-top:0;">✅ Turno confirmado!</h2>
    <p style="font-size:16px; color:#555;">
      Você foi confirmado para o turno <strong>${eventLabel || 'de voluntariado'}</strong>${roleText}.
    </p>
    ${dateText}
    <p style="font-size:16px; color:#555;">
      Acesse o Viralata para ver os detalhes e confirmar presença.
    </p>
    <div style="text-align:center; margin:28px 0;">
      <a href="${shiftLink}"
         style="background:#27ae60; color:#fff; padding:14px 28px; border-radius:6px;
                text-decoration:none; font-weight:bold; font-size:16px;">
        Ver detalhes do turno
      </a>
    </div>
    <p style="font-size:13px; color:#aaa;">
      Se não conseguir visualizar este e-mail, copie e cole este link no navegador:
      <br><a href="${shiftLink}" style="color:#27ae60;">${shiftLink}</a>
    </p>
  </div>
</body>
</html>`;

  const text = `Turno confirmado!

Você foi confirmado para o turno ${eventLabel || 'de voluntariado'}${role ? ' na função ' + role : ''}.
${eventDate ? 'Data: ' + eventDate + '\n' : ''}
Acesse ${shiftLink} para ver os detalhes.`;

  const provider = getEmailProvider();
  return provider.send({
    to: prefs.email,
    subject: `✅ Turno confirmado: ${eventLabel || 'voluntariado'}${role ? ' — ' + role : ''}`,
    text,
    html,
  });
}

module.exports = {
  sendVolunteerWelcomeEmail,
  sendShiftReminderEmail,
  sendMilestoneEmail,
  sendBackgroundCheckStatusEmail,
  sendShiftConfirmationEmail,
  getUserEmailPrefs,
};
