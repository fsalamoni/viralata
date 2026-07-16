/**
 * @fileoverview TASK-343: Callable Cloud Function — generateEventCertificate.
 *
 * Gera certificados de participação em PDF para os participantes de um evento.
 * Workflow:
 *   1. Valida caller (auth + permission)
 *   2. Carrega dados do evento + participantes (status = GOING)
 *   3. Para cada participante, gera PDF via generateEventCertificateCore.cjs
 *   4. Faz upload para GCS: event_certificates/{clubId}/{eventId}/{userId}.pdf
 *   5. Atualiza Firestore: club_events/{eventId}/certificates/{userId}
 *   6. Retorna URLs dos certificados gerados
 *
 * Segurança:
 *   - Callable: exige auth token
 *   - Permission: shelter_admin, owner, ou platform_admin do clube
 *
 * @see TASK-343
 * @see generateEventCertificateCore.cjs
 */

'use strict';

const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const { Storage } = require('@google-cloud/storage');
const admin = require('firebase-admin');
const {
  generateCertificateBuffer,
  validateInput,
} = require('./generateEventCertificateCore.cjs');

const REGION       = 'southamerica-east1';
const BUCKET_NAME  = process.env.CERTIFICATE_BUCKET || 'viralata-certificates';
const DB_ID        = process.env.GCLOUD_PROJECT;

let _storage;
function getStorage() {
  if (!_storage) {
    _storage = new Storage({ projectId: process.env.GCLOUD_PROJECT });
  }
  return _storage;
}

if (!global.__viralataInitDone) {
  admin.initializeApp();
  global.__viralataInitDone = true;
}

// ─── Permission helpers ─────────────────────────────────────────────────

async function isClubAdminOrOwner(callerUid, clubId) {
  if (!callerUid || !clubId) return false;
  const db = admin.firestore();
  try {
    const memberId = `${clubId}_${callerUid}`;
    const snap = await db.collection('club_members').doc(memberId).get();
    if (!snap.exists) return false;
    const role = snap.data()?.role;
    return role === 'owner' || role === 'admin';
  } catch (_) {
    return false;
  }
}

async function isPlatformAdmin(callerUid) {
  if (!callerUid) return false;
  try {
    const token = await admin.auth().getUser(callerUid);
    return token.customClaims?.admin === true || token.customClaims?.role === 'platform_admin';
  } catch (_) {
    return false;
  }
}

// ─── Data fetchers ─────────────────────────────────────────────────────

async function getEventData(eventId) {
  const db = admin.firestore();
  const snap = await db.collection('club_events').doc(eventId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

async function getEventParticipants(eventId) {
  const db = admin.firestore();
  const snap = await db
    .collection('event_invites')
    .where('event_id', '==', eventId)
    .where('status', '==', 'going')
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getClubName(clubId) {
  if (!clubId) return 'Abrigo Viralata';
  const db = admin.firestore();
  try {
    const snap = await db.collection('clubs').doc(clubId).get();
    if (!snap.exists) return 'Abrigo Viralata';
    const d = snap.data();
    return d.name || d.display_name || 'Abrigo Viralata';
  } catch (_) {
    return 'Abrigo Viralata';
  }
}

// ─── Firestore upsert certificate record ────────────────────────────────

async function upsertCertificateRecord(eventId, userId, record) {
  const db = admin.firestore();
  await db
    .collection('club_events').doc(eventId)
    .collection('certificates').doc(userId)
    .set(record, { merge: true });
}

// ─── Main callable ─────────────────────────────────────────────────────

exports.generateEventCertificate = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) {
      throw new HttpsError('unauthenticated', 'Autenticação necessária.');
    }

    const { eventId } = request.data || {};

    if (!eventId || typeof eventId !== 'string') {
      throw new HttpsError('invalid-argument', 'Informe o ID do evento (eventId).');
    }

    // ── Authorization ──────────────────────────────────────────────────
    const event = await getEventData(eventId);
    if (!event) {
      throw new HttpsError('not-found', 'Evento não encontrado.');
    }

    const clubId = event.club_id;
    const isAdmin   = await isClubAdminOrOwner(callerUid, clubId);
    const isPlatAdm = await isPlatformAdmin(callerUid);

    if (!isAdmin && !isPlatAdm) {
      throw new HttpsError(
        'permission-denied',
        'Apenas administradores do clube ou platform admin podem gerar certificados.',
      );
    }

    // ── Fetch participants ──────────────────────────────────────────────
    const participants = await getEventParticipants(eventId);
    if (participants.length === 0) {
      return { generated: 0, results: [], message: 'Nenhum participante com status "Vou" encontrado.' };
    }

    const clubName = await getClubName(clubId);
    const storage  = getStorage();
    const bucket   = storage.bucket(BUCKET_NAME);
    const results  = [];
    let generated  = 0;

    // ── Generate certificate per participant ────────────────────────────
    for (const p of participants) {
      const userId   = p.user_id;
      const userName = p.user_name || p.user_name || 'Participante';

      const validationErrors = validateInput({
        participantName: userName,
        eventTitle:      event.title,
        eventDate:        event.starts_at,
        eventLocation:    event.location,
        eventType:        event.type,
        orgName:          clubName,
      });

      if (validationErrors.length > 0) {
        logger.warn('Certificate validation failed', { userId, errors: validationErrors });
        results.push({ userId, userName, status: 'skipped', reason: validationErrors.join('; ') });
        continue;
      }

      try {
        const pdfBuffer = await generateCertificateBuffer({
          participantName: userName,
          eventTitle:      event.title,
          eventDate:       event.starts_at,
          eventLocation:   event.location,
          eventType:       event.type,
          orgName:         clubName,
          issuedAt:        new Date().toISOString(),
        });

        const gcsPath = `event_certificates/${clubId}/${eventId}/${userId}.pdf`;
        const file    = bucket.file(gcsPath);

        await file.save(pdfBuffer, {
          metadata: {
            contentType: 'application/pdf',
            metadata: {
              eventId,
              userId,
              generatedBy: callerUid,
            },
          },
        });

        const [downloadUrl] = await file.getSignedUrl({
          action:    'read',
          expires:   '03-01-2035',
        });

        // Persist record in Firestore
        await upsertCertificateRecord(eventId, userId, {
          user_id:          userId,
          user_name:        userName,
          certificate_url:  downloadUrl,
          gcs_path:          gcsPath,
          event_id:         eventId,
          event_title:      event.title,
          event_date:       event.starts_at,
          event_location:   event.location,
          event_type:       event.type,
          org_name:         clubName,
          generated_by:     callerUid,
          generated_at:     admin.firestore.FieldValue.serverTimestamp(),
        });

        results.push({ userId, userName, status: 'generated', url: downloadUrl });
        generated++;
        logger.info('Certificate generated', { eventId, userId, gcsPath });
      } catch (err) {
        logger.error('Certificate generation failed', { eventId, userId, error: err.message });
        results.push({ userId, userName, status: 'error', reason: err.message });
      }
    }

    return { generated, total: participants.length, results };
  },
);
