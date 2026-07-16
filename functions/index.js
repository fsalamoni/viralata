/**
 * Cloud Functions — Viralata.
 *
 * Único gatilho de servidor da plataforma: o "Radar de Pets". Tudo o mais
 * roda no client (ver docs/AI_CONTEXT.md / README). Este trigger reage à
 * criação de QUALQUER pet — algo que o client não pode fazer de forma
 * confiável para outros usuários, já que cada navegador só "escuta" o que o
 * próprio usuário está olhando.
 *
 * Funções administrativas:
 *  - `loadMockData` / `clearMockData` / `getMockStatus` (callable) — materializa
 *    e remove o pacote de dados de demo (`src/mocks/`). Rodam com Admin SDK
 *    e bypassam as Firestore rules — caminho canônico para trabalho
 *    administrativo em lote.
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { isCompatible } = require('./matching');
const {
  onPetWrite,
  onClubWrite,
  onFosterWrite,
  onVolunteerWrite,
} = require('./searchSync');
const {
  runPropagateVolunteerProfileSnapshotSafe,
  runNotifyAdminOnNewVolunteerSafe,
  runNotifyVolunteerOnStatusChangeSafe,
  runNotifyAdminOnNewParticipationSafe,
  runNotifyOnCheckInOutSafe,
} = require('./volunteerTriggers');
const {
  runOnCommunityPostCreatedSafe,
  runOnCommunityPostLikedSafe,
  runOnCommunityPostCommentedSafe,
  runOnCommunityEventCreatedSafe,
} = require('./communityNotifications');
const {
  aggregateVolunteerHours,
  sendShiftReminders,
} = require('./volunteerHoursCron');
const mockData = require('./mockData');
const vt = require('./volunteerTriggers');

const DATABASE_ID = 'viralata';
const REGION = 'southamerica-east1';

initializeApp();
const db = getFirestore(DATABASE_ID);

const NOTIFICATION_TYPE_PET_RADAR_MATCH = 'pet_radar_match';

async function notifyRadarMatches(pet, petId) {
  const radarsSnap = await db.collection('pet_radars').where('active', '==', true).get();
  if (radarsSnap.empty) return;

  const matchedUids = [];
  for (const radarDoc of radarsSnap.docs) {
    const uid = radarDoc.data().user_id;
    if (!uid || uid === pet.owner_id) continue;
    const profileSnap = await db.collection('users').doc(uid).get();
    if (!profileSnap.exists) continue;
    const profile = profileSnap.data();
    if (isCompatible(profile, pet)) matchedUids.push(uid);
  }
  if (matchedUids.length === 0) return;
  const title = `Novo pet no seu Radar: ${pet.title || pet.name || 'um animal'}`;
  const message = 'Um pet compatível com o seu perfil acabou de ser cadastrado. Toque para conhecer.';
  const CHUNK = 400;
  for (let i = 0; i < matchedUids.length; i += CHUNK) {
    const batch = db.batch();
    matchedUids.slice(i, i + CHUNK).forEach((uid) => {
      const ref = db.collection('notifications').doc();
      batch.set(ref, {
        user_id: uid,
        title: title.slice(0, 140),
        message: message.slice(0, 300),
        type: NOTIFICATION_TYPE_PET_RADAR_MATCH,
        link: `/pets/${petId}`,
        actor_id: null,
        actor_name: null,
        read: false,
        read_at: null,
        created_at: FieldValue.serverTimestamp(),
        created_at_ms: Date.now(),
      });
    });
    await batch.commit();
  }
  logger.info(`pet_radar_match: ${matchedUids.length} notificações para o pet ${petId}`);
}

exports.onPetCreatedNotifyRadar = onDocumentCreated(
  { document: 'pets/{petId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    const pet = event.data?.data();
    if (!pet) return;
    try {
      await notifyRadarMatches(pet, event.params.petId);
    } catch (err) {
      logger.error('Falha ao processar radar de pets:', err);
    }
  },
);

// Trigger 6: onCreate volunteer_participations → notifica voluntário
// (FCM + calendar + email + audit) — TASK-269
exports.onVolunteerParticipationCreated = onDocumentCreated(
  {
    document: 'clubs/{clubId}/volunteer_participations/{participationId}',
    database: DATABASE_ID,
    region: REGION,
  },
  async (event) => {
    try {
      await vt.runNotifyVolunteerOnParticipationCreatedSafe(event);
    } catch (err) {
      logger.error('onVolunteerParticipationCreated failed:', err);
    }
  },
);

// Mock data (admin SDK, bypassa Firestore rules)
exports.loadMockData = mockData.loadMockData;
exports.clearMockData = mockData.clearMockData;
exports.getMockStatus = mockData.getMockStatus;

// Search sync (TASK-312)
exports.onPetWrite = onPetWrite;
exports.onClubWrite = onClubWrite;
exports.onFosterWrite = onFosterWrite;
exports.onVolunteerWrite = onVolunteerWrite;

// ─── Volunteer triggers (TASK-220) ────────────────────────────────────────
const { onDocumentCreated: _onDocCreated, onDocumentUpdated: _onDocUpdated } = require('firebase-functions/v2/firestore');

// onUpdate users/{uid}/volunteer_profile/main → propagate to rosters
exports.runPropagateVolunteerProfileSnapshot = (event) =>
  runPropagateVolunteerProfileSnapshotSafe(event);

// onCreate clubs/{clubId}/volunteers/{uid} → notify admin
exports.onVolunteerCreatedNotifyAdmin = _onDocCreated(
  { document: 'clubs/{clubId}/volunteers/{volunteerUid}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runNotifyAdminOnNewVolunteerSafe(event); } catch (e) { logger.error(e); }
  },
);

// onUpdate clubs/{clubId}/volunteers/{uid} → notify volunteer on status change
exports.onVolunteerUpdatedNotifyStatus = _onDocUpdated(
  { document: 'clubs/{clubId}/volunteers/{volunteerUid}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runNotifyVolunteerOnStatusChangeSafe(event); } catch (e) { logger.error(e); }
  },
);

// onCreate clubs/{clubId}/volunteer_participations/{pid} → notify admin
exports.onParticipationCreatedNotifyAdmin = _onDocCreated(
  { document: 'clubs/{clubId}/volunteer_participations/{participationId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runNotifyAdminOnNewParticipationSafe(event); } catch (e) { logger.error(e); }
  },
);

// onUpdate clubs/{clubId}/volunteer_participations/{pid} → notify on check_in/check_out
exports.onParticipationUpdatedCheckInOut = _onDocUpdated(
  { document: 'clubs/{clubId}/volunteer_participations/{participationId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runNotifyOnCheckInOutSafe(event); } catch (e) { logger.error(e); }
  },
);

// Scheduled crons (TASK-220)
exports.aggregateVolunteerHours = aggregateVolunteerHours;
exports.sendShiftReminders = sendShiftReminders;

// ─── Fase 22 / TASK-272: LGPD volunteer privacy (soft-delete + erase) ────────
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const {
  runSoftDeleteVolunteer,
  runEraseMyVolunteerData,
  runHardDeleteVolunteerDocument,
  isPlatformAdmin,
  hasShelterPermission,
} = require('./volunteerPrivacyCore');

/**
 * softDeleteVolunteer — Admin ou shelter owner/admin llama.
 * @throws HttpsError 'permission-denied' se caller não tem acesso.
 */
exports.softDeleteVolunteer = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;
    const { clubId, volunteerUid } = request.data || {};

    if (!callerUid) throw new HttpsError('unauthenticated', 'Callable requer autenticação.');
    if (!clubId || !volunteerUid) {
      throw new HttpsError('invalid-argument', 'clubId e volunteerUid são obrigatórios.');
    }

    const admin = await isPlatformAdmin(callerUid);
    const shelterOk = await hasShelterPermission(callerUid, clubId);
    if (!admin && !shelterOk) {
      throw new HttpsError('permission-denied', 'Sem permissão para excluir voluntário neste abrigo.');
    }

    const result = await runSoftDeleteVolunteer({
      clubId, volunteerUid, actorUid: callerUid, logger,
    });
    return result;
  },
);

/**
 * eraseMyVolunteerData — voluntário logado pede erasure dos próprios dados.
 * @throws HttpsError 'permission-denied' se caller.uid !== volunteerUid.
 */
exports.eraseMyVolunteerData = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError('unauthenticated', 'Callable requer autenticação.');

    const result = await runEraseMyVolunteerData({
      uid: callerUid, actorUid: callerUid, logger,
    });
    return result;
  },
);

/**
 * hardDeleteVolunteerDocument — platform_admin apaga um doc específico.
 */
exports.hardDeleteVolunteerDocument = onCall(
  { region: REGION, cors: true },
  async (request) => {
    const callerUid = request.auth?.uid;
    const { clubId, collectionPath, docId } = request.data || {};

    if (!callerUid) throw new HttpsError('unauthenticated', 'Callable requer autenticação.');
    const admin = await isPlatformAdmin(callerUid);
    if (!admin) throw new HttpsError('permission-denied', 'Apenas platform_admin.');
    if (!clubId || !collectionPath || !docId) {
      throw new HttpsError('invalid-argument', 'clubId, collectionPath e docId são obrigatórios.');
    }

    const result = await runHardDeleteVolunteerDocument({
      clubId, collectionPath, docId, actorUid: callerUid, logger,
    });
    return result;
  },
);

// ─── TASK-298: createContract callable (IP + user-agent, Lei 14.063/2020) ─
const { createContract } = require('./createContract.cjs');
exports.createContract = createContract;

// ─── TASK-336: Community notifications ──────────────────────────────────

// onCreate community_posts/{postId} → notify community admins
exports.onCommunityPostCreated = onDocumentCreated(
  { document: 'community_posts/{postId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityPostCreatedSafe(event); } catch (e) { logger.error(e); }
  },
);

// onCreate community_post_likes/{likeId} → notify post author
exports.onCommunityPostLiked = onDocumentCreated(
  { document: 'community_post_likes/{likeId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityPostLikedSafe(event); } catch (e) { logger.error(e); }
  },
);

// onCreate community_post_comments/{commentId} → notify post author + commenters
exports.onCommunityPostCommented = onDocumentCreated(
  { document: 'community_post_comments/{commentId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityPostCommentedSafe(event); } catch (e) { logger.error(e); }
  },
);

// onCreate community_events/{eventId} → notify community admins
exports.onCommunityEventCreated = onDocumentCreated(
  { document: 'community_events/{eventId}', database: DATABASE_ID, region: REGION },
  async (event) => {
    try { await runOnCommunityEventCreatedSafe(event); } catch (e) { logger.error(e); }
  },
);

// ─── TASK-248: Volunteer certificate PDF ─────────────────────────────────────────
const { generateVolunteerCertificate } = require('./generateVolunteerCertificate');
exports.generateVolunteerCertificate = generateVolunteerCertificate;

// ─── TASK-292: FCM push notifications ──────────────────────────────────────────
const { sendPushNotification } = require('./sendPushNotification');
const {
  onAdoptionWorkflowCreated,
  onAdoptionWorkflowStatusUpdated,
  onKanbanTaskCreated,
} = require('./pushNotificationTriggers');

exports.sendPushNotification = sendPushNotification;
exports.onAdoptionWorkflowCreated = onAdoptionWorkflowCreated;
exports.onAdoptionWorkflowStatusUpdated = onAdoptionWorkflowStatusUpdated;
exports.onKanbanTaskCreated = onKanbanTaskCreated;
