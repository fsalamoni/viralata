/**
 * Cloud Functions — Viralata.
 *
 * Único gatilho de servidor da plataforma: o "Radar de Pets". Tudo o mais
 * roda no client (ver docs/AI_CONTEXT.md / README). Este trigger reage à
 * criação de QUALQUER pet — algo que o client não pode fazer de forma
 * confiável para outros usuários, já que cada navegador só "escuta" o que o
 * próprio usuário está olhando.
 */

const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { logger } = require('firebase-functions');
const { isCompatible } = require('./matching');

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

// ─── Fase 5: Google Forms webhook (Fase 5) ──────────────────────────────
//
// Endpoint HTTP que recebe o webhook do Google Apps Script quando alguém
// submete uma resposta ao Form do abrigo. Cria um application na
// subcoleção `adoption_workflow` do abrigo correspondente.
//
// Segurança (Fase 20 — Segurança Avançada):
// - O abrigo configura um `secret_token` na config
// - O Apps Script envia esse secret no payload
// - Se não bater, rejeitamos (401)
// - Rate limit em memória (functions/middleware/rateLimit) — Fase 20
//   — configurável via RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX
//
// Habilitar no abrigo: criar doc em
// `clubs/{clubId}/integrations/google_forms` com `enabled=true` e
// `form_id`. Cloud Function encontra o abrigo pelo `form_id` no payload.

const { onRequest } = require('firebase-functions/v2/https');
const { getGoogleFormsConfigByFormId, processFormsWebhook } = require('./googleFormsWebhook');
const { withRateLimit, applyRateLimit } = require('./middleware/rateLimit');

exports.googleFormsWebhook = onRequest(
  {
    region: REGION,
    cors: false, // chamado só pelo Apps Script (server-to-server)
    maxInstances: 10,
  },
  withRateLimit(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    try {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        res.status(400).send('Invalid payload');
        return;
      }

      // 1. Encontra config pelo form_id
      const config = await getGoogleFormsConfigByFormId(db, payload.form_id);
      if (!config) {
        logger.warn('googleFormsWebhook: form_id não configurado', { form_id: payload.form_id });
        res.status(404).send('Form not configured');
        return;
      }
      if (!config.enabled) {
        res.status(403).send('Integration disabled');
        return;
      }

      // 2. Valida secret
      if (payload.secret !== config.secret_token) {
        logger.warn('googleFormsWebhook: invalid secret', { form_id: payload.form_id });
        res.status(401).send('Invalid secret');
        return;
      }

      // 3. Processa (cria application)
      const result = await processFormsWebhook(
        db,
        { ...payload, shelter_club_id: config.shelter_club_id },
        config,
      );

      logger.info('googleFormsWebhook: created application', {
        application_id: result.application_id,
        shelter_club_id: config.shelter_club_id,
      });

      res.status(200).json(result);
    } catch (err) {
      logger.error('googleFormsWebhook failed', { error: String(err) });
      res.status(500).send(String(err?.message || err));
    }
  }),
);

// ─── Fase 6: Pós-adoção com CRON de materialização ──────────────────────
//
// Cloud Function scheduled que roda diariamente para materializar
// milestones de pós-adoção. Ver functions/postAdoptionCron.js para
// detalhes da implementação.
const { materializePostAdoptionTasks } = require('./postAdoptionCron');
exports.materializePostAdoptionTasks = materializePostAdoptionTasks;

<<<<<<< HEAD
// ─── Fase 21: Painel de Saúde da Plataforma ─────────────────────────────
//
// Duas Cloud Functions:
//
// 1. `snapshotPlatformHealth` (scheduled, every 1h): coleta métricas
//    materializadas em `platform_health_snapshots/`.
//
// 2. `onPlatformAlertEvent` (firestore trigger): quando um doc novo
//    aparece em `platform_alert_events/`, dispara Slack/Email conforme
//    as configs ativas em `platform_alert_config/`.
//
// Os handlers de lógica são testáveis em isolation (ver
// platformHealthCron.test.js e adminAlerts.test.js). Aqui só fazemos
// a amarração com os triggers do Firebase.
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated: onDocCreated } = require('firebase-functions/v2/firestore');
const { runSnapshotPlatformHealth, setLogger: setHealthLogger } = require('./platformHealthCron');
const { runOnPlatformAlertEvent, setLogger: setAlertsLogger } = require('./adminAlerts');

// Injeta o logger real do Cloud Functions nos módulos de lógica.
setHealthLogger(logger);
setAlertsLogger(logger);

exports.snapshotPlatformHealth = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'UTC',
    region: 'southamerica-east1',
    maxInstances: 1,
  },
  async () => {
    await runSnapshotPlatformHealth();
  },
);

exports.onPlatformAlertEvent = onDocCreated(
  { document: 'platform_alert_events/{eventId}', region: 'southamerica-east1' },
  async (event) => {
    await runOnPlatformAlertEvent(event);
  },
);
=======
// ─── Fase 20: Alertas de segurança (Security Alerts) ────────────────────
//
// Cloud Function onCall `triggerSecurityAlert` — chamada por
// platform_admin (e, no futuro, por outros triggers automatizados) para
// registrar eventos de segurança em `platform_security_alerts/{alertId}`.
// O Firestore rules dessa coleção só permite leitura para platform_admin
// e escrita apenas pelo Admin SDK (esta Cloud Function). Ver
// firestore.rules (match /platform_security_alerts) e
// src/core/services/securityAlertsService.js para o painel admin.
const { triggerSecurityAlert } = require('./securityAlerts');
exports.triggerSecurityAlert = triggerSecurityAlert;

// Re-export do applyRateLimit para facilitar testes / composição.
exports.__applyRateLimit = applyRateLimit;
>>>>>>> 3469fcf (feat(shelter): Fase 20 — Segurança Avançada (SHELTER_SECURITY_HARDENING))
