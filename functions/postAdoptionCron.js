/**
 * @fileoverview Cloud Function scheduled: materialização de milestones
 * de pós-adoção.
 *
 * Roda diariamente (CRON `0 3 * * *` = 03:00 BRT). Itera sobre todas as
 * adoções ativas e materializa tasks no Kanban para milestones devidos.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 6 + § 11.4
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const { logger } = require('firebase-functions');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

if (!global.__viralataInitialized) {
  initializeApp();
  global.__viralataInitialized = true;
}
const db = getFirestore();

/**
 * Cloud Function agendada. Roda todo dia às 03:00 (BRT = UTC-3, então
 * 06:00 UTC).
 */
exports.materializePostAdoptionTasks = onSchedule(
  {
    schedule: '0 6 * * *',  // 06:00 UTC = 03:00 BRT
    timeZone: 'UTC',
    region: 'southamerica-east1',
    maxInstances: 1,
  },
  async (event) => {
    logger.info('materializePostAdoptionTasks: starting daily run');
    const now = new Date();

    // Itera sobre todos os abrigos que têm post_adoption
    // (collectionGroup query — single-field index auto-criado)
    const adoptionsSnap = await db.collectionGroup('post_adoption')
      .where('status', '==', 'active')
      .limit(500)
      .get();

    let totalMaterialized = 0;
    let totalSkipped = 0;
    let errors = 0;

    for (const doc of adoptionsSnap.docs) {
      const post = doc.data();
      const milestones = post.milestones || [];
      const toMaterialize = milestones.filter((m) =>
        !m.materialized && _shouldMaterialize({ scheduled_for: m.scheduled_for }, now),
      );
      if (toMaterialize.length === 0) {
        totalSkipped += toMaterialize.length;
        continue;
      }

      // shelter_club_id vem do path: clubs/{clubId}/post_adoption/{id}
      const pathSegments = doc.ref.path.split('/');
      const shelterClubId = pathSegments[1];

      try {
        const result = await _materializeForAdoption(shelterClubId, doc.id, post, toMaterialize, now);
        totalMaterialized += result.materialized;
        logger.info('materializePostAdoptionTasks: adoption processed', {
          post_adoption_id: doc.id,
          shelter_club_id: shelterClubId,
          materialized: result.materialized,
        });
      } catch (err) {
        errors++;
        logger.error('materializePostAdoptionTasks: failed for adoption', {
          post_adoption_id: doc.id,
          error: String(err),
        });
      }
    }

    logger.info('materializePostAdoptionTasks: done', {
      total_processed: adoptionsSnap.size,
      total_materialized: totalMaterialized,
      total_skipped: totalSkipped,
      errors,
    });

    return null;
  },
);

// ─── Helpers ────────────────────────────────────────────────────────────

function _shouldMaterialize(milestone, now = new Date()) {
  const scheduled = new Date(milestone.scheduled_for);
  if (scheduled > now) return false;
  // Buffer de 90 dias para garantir resiliência
  const bufferMs = 90 * 24 * 60 * 60 * 1000;
  return scheduled.getTime() <= now.getTime() + bufferMs;
}

async function _materializeForAdoption(shelterClubId, postAdoptionId, post, toMaterialize, now) {
  const updatedMilestones = [...(post.milestones || [])];
  let materializedCount = 0;

  for (const m of toMaterialize) {
    const task = {
      post_adoption_id: postAdoptionId,
      application_id: post.application_id,
      shelter_club_id: shelterClubId,
      pet_id: post.pet_id,
      adopter_uid: post.adopter_uid,
      type: m.type,
      title: m.title,
      scheduled_for: m.scheduled_for,
      materialized_at: now.toISOString(),
      source_milestone_index: m.source_milestone_index,
      status: 'pending',
    };
    const taskRef = await db
      .collection('clubs').doc(shelterClubId)
      .collection('kanban_tasks').add(task);
    const idx = updatedMilestones.findIndex(
      (x) => x.source_milestone_index === m.source_milestone_index,
    );
    if (idx >= 0) {
      updatedMilestones[idx] = {
        ...updatedMilestones[idx],
        materialized: true,
        materialized_task_id: taskRef.id,
      };
    }
    materializedCount++;
  }

  // Atualiza o post_adoption
  await db.collection('clubs').doc(shelterClubId)
    .collection('post_adoption').doc(postAdoptionId)
    .update({
      milestones: updatedMilestones,
      materialized_count: (post.materialized_count || 0) + materializedCount,
      last_materialized_at: now.toISOString(),
      updated_at: new Date().toISOString(),
    });

  return { materialized: materializedCount };
}
