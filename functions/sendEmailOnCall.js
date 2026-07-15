/**
 * @fileoverview TASK-291: Callable Cloud Function — sendEmail (adoption workflow).
 *
 * Cloud Function onCall que envia emails transacionais do workflow de adoção.
 * Templates versionados (v1). Integra com emailProviderAdapter
 * (Stub em dev, SendGrid em produção via EMAIL_PROVIDER=sendgrid).
 *
 * Templates (definições em sendEmailOnCallCore.cjs):
 *   - application_received   → notifica abrigo: nova aplicação received
 *   - interview_scheduled   → notifica adotante: entrevista agendada
 *   - match_approved        → notifica adotante: adoção aprovada
 *   - contract_ready        → notifica adotante: termo de adoção disponível
 *   - milestone_due         → notifica adotante: marco de adoção pendente
 *   - milestone_overdue     → notifica adotante: marco em atraso
 *   - post_adoption_returned → notifica abrigo: pet devolvido
 *
 * LGPD compliance:
 *   - Art. 7º IV: emails transacionais (workflow adoção) dispensam opt-in
 *   - CAN-SPAM: header List-Unsubscribe + From identificável
 *   - Auditoria: logs em email_delivery_log (imutável, retention 5 anos)
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 22
 * @see TASK-291
 * @see sendEmailOnCallCore.cjs
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getEmailProvider } = require('./emailProviderAdapter');
const {
  TEMPLATES,
  validateTemplateType,
  buildContext,
  renderEmail,
} = require('./sendEmailOnCallCore.cjs');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

// ─── Permission helpers ─────────────────────────────────────────────────

async function isShelterAdminOrOwner(callerUid, shelterClubId, db) {
  if (!callerUid || !shelterClubId) return false;
  try {
    const memberId = `${shelterClubId}_${callerUid}`;
    const memberSnap = await db.collection('club_members').doc(memberId).get();
    if (!memberSnap.exists()) return false;
    const role = memberSnap.data().role;
    return role === 'admin' || role === 'owner';
  } catch (_) {
    return false;
  }
}

// ─── Data fetchers ──────────────────────────────────────────────────────

async function getApplicationData(shelterClubId, applicationId, db) {
  if (!shelterClubId || !applicationId) return null;
  const snap = await db
    .collection('clubs').doc(shelterClubId)
    .collection('adoption_workflow').doc(applicationId)
    .get();
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function getPetData(petId, db) {
  if (!petId) return null;
  const snap = await db.collection('pets').doc(petId).get();
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function getUserEmail(uid, db) {
  if (!uid) return null;
  const snap = await db.collection('users').doc(uid).get();
  if (!snap.exists()) return null;
  return snap.data().email || null;
}

async function getAdopterProfile(uid, db) {
  if (!uid) return null;
  const snap = await db
    .collection('users').doc(uid).collection('adopter_profile').doc('main')
    .get();
  if (!snap.exists()) return null;
  return snap.data();
}

async function getClubName(clubId, db) {
  if (!clubId) return null;
  const snap = await db.collection('clubs').doc(clubId).get();
  if (!snap.exists()) return null;
  return snap.data().name || snap.data().display_name || 'Abrigo';
}

async function getAdopterName(uid, db) {
  if (!uid) return uid;
  const profile = await getAdopterProfile(uid, db);
  if (profile?.full_name) return profile.full_name;
  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists()) return uid;
  const d = userSnap.data();
  return d.display_name || d.email || uid;
}

// ─── Audit log ──────────────────────────────────────────────────────────

async function createEmailAuditLog(db, data) {
  try {
    await db.collection('email_delivery_log').add({
      ...data,
      created_at: new Date().toISOString(),
    });
  } catch (_) {
    // best-effort
  }
}

// ─── Send helper ────────────────────────────────────────────────────────

async function sendEmail({ to, subject, html, text, from = 'noreply@viralata.app' }) {
  if (!to) return { ok: false, error: 'no recipient' };
  const provider = getEmailProvider();
  return provider.send({ to, subject, html, text, from });
}

// ─── Main callable ─────────────────────────────────────────────────────

exports.sendEmailOnCall = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Autenticação necessária.');
    }

    const {
      templateType,
      applicationId,
      shelterClubId,
      petId,
      adopterUid,
      interviewDate,
      interviewTime,
      milestoneLabel,
      milestoneDueDate,
      daysOverdue,
      contractUrl,
      returnDate,
      returnReason,
    } = request.data || {};

    // Validate template type
    const validation = validateTemplateType(templateType);
    if (!validation.ok) {
      throw new HttpsError('invalid-argument', validation.error);
    }
    const template = validation.template;

    const db = require('firebase-admin/firestore').getFirestore(DATABASE_ID);

    // Permission check
    if (template.recipientRole === 'shelter' && shelterClubId) {
      const isAdmin = await isShelterAdminOrOwner(callerUid, shelterClubId, db);
      if (!isAdmin) {
        throw new HttpsError(
          'permission-denied',
          'Apenas admin/owner do abrigo pode enviar este tipo de email.',
        );
      }
    }

    // Load application data (enriches context)
    let appDoc = null;
    if (applicationId && shelterClubId) {
      appDoc = await getApplicationData(shelterClubId, applicationId, db);
    }

    const resolvedPetId = petId || appDoc?.pet_id || null;
    const resolvedAdopterUid = adopterUid || appDoc?.applicant_uid || null;
    const resolvedShelterId = shelterClubId || appDoc?.shelter_club_id || null;

    const [petDoc, adopterName, shelterName] = await Promise.all([
      resolvedPetId ? getPetData(resolvedPetId, db) : Promise.resolve(null),
      resolvedAdopterUid ? getAdopterName(resolvedAdopterUid, db) : Promise.resolve(''),
      resolvedShelterId ? getClubName(resolvedShelterId, db) : Promise.resolve(''),
    ]);

    const ctx = buildContext({
      applicationId,
      shelterClubId: resolvedShelterId,
      petId: resolvedPetId,
      adopterUid: resolvedAdopterUid,
      interviewDate,
      interviewTime,
      milestoneLabel,
      milestoneDueDate,
      daysOverdue,
      contractUrl,
      returnDate,
      returnReason,
      appDoc,
      petDoc,
      adopterName,
      shelterName,
    });

    // Render template
    const rendered = renderEmail(templateType, ctx);
    if (!rendered.ok) {
      throw new HttpsError('internal', 'Erro ao renderizar template.');
    }

    const { subject, html, text } = rendered;

    // Determine recipient email
    let recipientEmail = null;
    if (template.recipientRole === 'adopter' && resolvedAdopterUid) {
      recipientEmail = await getUserEmail(resolvedAdopterUid, db);
      if (!recipientEmail) {
        const profile = await getAdopterProfile(resolvedAdopterUid, db);
        recipientEmail = profile?.email || null;
      }
    }

    if (recipientEmail) {
      const result = await sendEmail({ to: recipientEmail, subject, html, text });

      await createEmailAuditLog(db, {
        template_type: templateType,
        template_version: 'v1',
        recipient_email: recipientEmail,
        recipient_uid: resolvedAdopterUid || null,
        shelter_club_id: resolvedShelterId || null,
        application_id: applicationId || null,
        pet_id: resolvedPetId || null,
        status: result.ok ? 'sent' : 'failed',
        message_id: result.messageId || null,
        error: result.error || null,
        sent_by_uid: callerUid,
        subject,
        context: ctx,
      });

      // Update workflow doc: record last milestone reminder sent
      if (applicationId && resolvedShelterId && templateType === 'milestone_due') {
        try {
          await db
            .collection('clubs').doc(resolvedShelterId)
            .collection('adoption_workflow').doc(applicationId)
            .update({
              last_milestone_reminder_sent_at: new Date().toISOString(),
              last_milestone_reminder_type: templateType,
            });
        } catch (_) {}
      }

      return {
        ok: result.ok,
        messageId: result.messageId,
        recipient: recipientEmail,
        subject,
        error: result.error || null,
      };
    } else {
      // Shelter notification: no direct email (in-app only)
      logger.info(`[sendEmailOnCall] ${templateType}: shelter notification (no email)`);
      await createEmailAuditLog(db, {
        template_type: templateType,
        recipient_role: 'shelter',
        shelter_club_id: resolvedShelterId || null,
        application_id: applicationId || null,
        pet_id: resolvedPetId || null,
        status: 'shelter_notification',
        sent_by_uid: callerUid,
        subject,
        context: ctx,
      });

      return {
        ok: true,
        messageId: null,
        recipient: 'in-app-notification',
        subject,
        note: 'Shelter notification — no email sent',
      };
    }
  },
);
