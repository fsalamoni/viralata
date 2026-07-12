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

module.exports = {
  sendVolunteerWelcomeEmail,
  sendShiftReminderEmail,
  sendMilestoneEmail,
  sendBackgroundCheckStatusEmail,
  getUserEmailPrefs,
};
