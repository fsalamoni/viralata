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
const mockData = require('./mockData');

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

// Mock data (admin SDK, bypassa Firestore rules)
exports.loadMockData = mockData.loadMockData;
exports.clearMockData = mockData.clearMockData;
exports.getMockStatus = mockData.getMockStatus;
