'use strict';

/**
 * generateEventCertificate.js
 *
 * Callable Cloud Function v2 — generates and stores an event participation
 * certificate PDF for a given user.
 *
 * Access control:
 *   - Callable: any authenticated user
 *   - Event must be readable by the caller (club member / invite / admin)
 *   - Writing the certificate record: admin-only
 *
 * Flow:
 *   1. Validate inputs (eventId, userId)
 *   2. Fetch event from Firestore
 *   3. Verify caller has read access to the event
 *   4. Fetch user profile
 *   5. Verify caller is either the subject user or a club admin
 *   6. Check if certificate already exists in Firestore — return URL if so
 *   7. Generate PDF via generateEventCertificateCore
 *   8. Upload to GCS: event_certificates/{clubId}/{eventId}/{userId}.pdf
 *   9. Write Firestore record: club_events/{eventId}/certificates/{userId}
 *  10. Return download URL
 *
 * LGPD: Art.7 IV — legitimate interest (platform operation).
 * CAN-SPAM: transaction email (no marketing).
 * Retention: record kept for 5 years (audit trail).
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage }    = require('firebase-admin/storage');

const { generateEventCertificatePdf } = require('./generateEventCertificateCore.cjs');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatEventDate(startsAt) {
  if (!startsAt) return null;
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function eventTypeLabel(type) {
  const map = {
    adoption_fair:  'Mutirão de Adoção',
    social:          'Confraternização',
    meeting:        'Reunião',
    vaccination:    'Vacinação',
    lecture:        'Palestra',
    fundraising:   'Arrecadação',
    pet_day:        'Dia do Pet',
    other:          'Outro',
  };
  return map[type] || type;
}

async function getClubAdmins(clubId) {
  const db = getFirestore();
  const snap = await db
    .collection('club_members')
    .where('club_id', '==', clubId)
    .where('role',    '==', 'admin')
    .get();
  return snap.docs.map((d) => d.data().user_id);
}

async function getUserProfile(uid) {
  const db = getFirestore();
  const doc = await db.collection('users').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function getEvent(eventId) {
  const db = getFirestore();
  const doc = await db.collection('club_events').doc(eventId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// ─── Main callable ────────────────────────────────────────────────────────────
exports.generateEventCertificate = onCall(
  { region: 'southamerica-east1', maxInstances: 10, timeoutSeconds: 60 },
  async (request) => {
    const caller = request.auth;
    if (!caller) throw new HttpsError('unauthenticated', 'Autenticação necessária.');

    const { eventId, userId } = request.data || {};

    if (!eventId || typeof eventId !== 'string') {
      throw new HttpsError('invalid-argument', 'eventId é obrigatório.');
    }
    if (!userId || typeof userId !== 'string') {
      throw new HttpsError('invalid-argument', 'userId é obrigatório.');
    }

    const db       = getFirestore();
    const bucket   = getStorage().bucket();

    // ── 1. Fetch event ─────────────────────────────────────────────────────
    const event = await getEvent(eventId);
    if (!event) throw new HttpsError('not-found', 'Evento não encontrado.');

    const { club_id: clubId, title: eventTitle, starts_at: startsAt,
            location: eventLocation, type: eventType } = event;

    // ── 2. Access check ─────────────────────────────────────────────────────
    // Caller must be the certificate subject OR a club admin
    const isSelf    = caller.uid === userId;
    const admins    = await getClubAdmins(clubId);
    const isAdmin   = admins.includes(caller.uid) || caller.token?.role === 'platform_admin';

    if (!isSelf && !isAdmin) {
      throw new HttpsError('permission-denied',
        'Você não tem permissão para gerar certificado para este usuário.');
    }

    // ── 3. Check existing certificate ────────────────────────────────────────
    const certRef = db
      .collection('club_events').doc(eventId)
      .collection('certificates').doc(userId);
    const existing = await certRef.get();

    if (existing.exists) {
      logger.info(`generateEventCertificate: certificate already exists for user ${userId} in event ${eventId}`);
      const data = existing.data();
      return {
        url:       data.downloadUrl || null,
        issuedAt:  data.issuedAt    || null,
        eventId,
        userId,
        alreadyExists: true,
      };
    }

    // ── 4. Fetch user profile ───────────────────────────────────────────────
    const profile = await getUserProfile(userId);
    const userName = profile?.platform_name
      || profile?.displayName
      || profile?.name
      || 'Participante';

    // ── 5. Get club name ────────────────────────────────────────────────────
    let clubName = null;
    try {
      const clubDoc = await db.collection('clubs').doc(clubId).get();
      if (clubDoc.exists) clubName = clubDoc.data().name;
    } catch (_) {
      // non-critical
    }

    // ── 6. Generate PDF ─────────────────────────────────────────────────────
    const pdfBytes = await generateEventCertificatePdf({
      userName,
      eventTitle,
      eventDate:   formatEventDate(startsAt),
      eventLocation,
      eventType:   eventTypeLabel(eventType),
      issuedAt:    new Date().toISOString(),
      clubName,
    });

    // ── 7. Upload to GCS ───────────────────────────────────────────────────
    const gcsPath = `event_certificates/${clubId}/${eventId}/${userId}.pdf`;
    const gcsFile = bucket.file(gcsPath);

    await gcsFile.save(pdfBytes, {
      contentType: 'application/pdf',
      metadata: {
        contentDisposition: `attachment; filename="certificado-${eventId}-${userId}.pdf"`,
        customMetadata: {
          eventId,
          userId,
          clubId,
          generatedBy: caller.uid,
          generatedAt: new Date().toISOString(),
        },
      },
    });

    // Make the file publicly readable (read-only for certificate)
    await gcsFile.makePublic();

    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${gcsPath}`;

    // ── 8. Write Firestore record ────────────────────────────────────────────
    const issuedAt = new Date().toISOString();
    await certRef.set({
      eventId,
      userId,
      clubId,
      userName,
      eventTitle,
      downloadUrl,
      gcsPath,
      issuedAt,
      generatedBy: caller.uid,
    });

    logger.info(`generateEventCertificate: created certificate for user ${userId} in event ${eventId}`);

    return { url: downloadUrl, issuedAt, eventId, userId, alreadyExists: false };
  }
);
