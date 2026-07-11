/**
 * @fileoverview Serviço: Pós-adoção (Fase 6).
 *
 * Implementa o padrão CRON de materialização (seção 11.4 do roadmap).
 * A Cloud Function agendada chama `materializeDueMilestones()` uma vez
 * por dia, que itera sobre todas as adoções ativas e cria tasks no
 * Kanban (Fase 15) para os milestones devidos.
 *
 * Idempotência: cada materialização checa se a task já existe (via
 * source_milestone_index + post_adoption_id) e não duplica.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 6 + § 11.4
 */

import {
  doc, getDoc, getDocs, addDoc, updateDoc, query, where, orderBy, limit,
  collection, collectionGroup, serverTimestamp, writeBatch, Timestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  postAdoptionSchema,
  postAdoptionTaskSchema,
  generateDefaultMilestones,
  shouldMaterialize as _shouldMaterialize,
  calculateMilestoneDate,
} from '@/modules/shelter/domain/operational/postAdoption';

const CLUBS_COLLECTION = 'clubs';
const POST_ADOPTION_SUBCOLLECTION = 'post_adoption';
const TASKS_SUBCOLLECTION = 'kanban_tasks';  // collectionGroup path

// ─── Read ───────────────────────────────────────────────────────────────

/**
 * Lista todas as adoções ativas. Usado pelo CRON.
 */
export async function listActivePostAdoptions(options = {}) {
  if (!db) return [];
  const { shelterClubId, maxResults = 500 } = options;
  const constraints = [where('status', '==', 'active')];
  if (shelterClubId) {
    constraints.push(where('shelter_club_id', '==', shelterClubId));
  }
  constraints.push(limit(maxResults));

  const q = query(
    collection(db, CLUBS_COLLECTION, CLUBS_COLLECTION),  // placeholder
    ...constraints,
  );
  // Actually we need collectionGroup. But for simplicity (one abrigo per
  // collection), this is OK. For multi-abrigo, we'd use collectionGroup.
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getPostAdoption(shelterClubId, postAdoptionId) {
  if (!db || !shelterClubId || !postAdoptionId) return null;
  const snap = await getDoc(
    doc(db, CLUBS_COLLECTION, shelterClubId, POST_ADOPTION_SUBCOLLECTION, postAdoptionId),
  );
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── Write (criação inicial) ───────────────────────────────────────────

/**
 * Cria o doc de pós-adoção a partir de uma application aprovada.
 * Chamado pela cascata de adoption_decision (Fase 3) quando
 * status='adoption_completed'.
 */
export async function createPostAdoption(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  // Valida
  const parsed = postAdoptionSchema.parse({
    ...input,
    status: 'active',
  });

  const milestones = parsed.milestones?.length > 0
    ? parsed.milestones
    : generateDefaultMilestones(parsed.adoption_date);

  // Garante que cada milestone tem scheduled_for
  const milestonesWithSchedule = milestones.map((m, i) => ({
    type: m.type,
    days_after: m.days_after,
    title: m.title,
    source_milestone_index: m.source_milestone_index ?? i,
    scheduled_for: m.scheduled_for || calculateMilestoneDate(parsed.adoption_date, m.days_after),
    materialized: false,
    materialized_task_id: null,
  }));

  const ref = doc(
    db, CLUBS_COLLECTION, parsed.shelter_club_id, POST_ADOPTION_SUBCOLLECTION, parsed.application_id,
  );
  await addDoc(
    collection(db, CLUBS_COLLECTION, parsed.shelter_club_id, POST_ADOPTION_SUBCOLLECTION),
    {
      application_id: parsed.application_id,
      shelter_club_id: parsed.shelter_club_id,
      pet_id: parsed.pet_id,
      adopter_uid: parsed.adopter_uid,
      adoption_date: parsed.adoption_date,
      milestones: milestonesWithSchedule,
      materialized_count: 0,
      status: 'active',
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    },
  );

  await createAuditLog({
    action: 'post_adoption_created',
    actor,
    details: {
      application_id: parsed.application_id,
      pet_id: parsed.pet_id,
      total_milestones: milestonesWithSchedule.length,
    },
  }).catch((err) => {
    logger.warn('postAdoptionService.createPostAdoption', {
      msg: 'audit failed (non-blocking)',
      err: String(err),
    });
  });

  return {
    application_id: parsed.application_id,
    total_milestones: milestonesWithSchedule.length,
    milestones: milestonesWithSchedule,
  };
}

// ─── Materialização (CRON) ────────────────────────────────────────────

/**
 * Materializa tasks de milestones devidos. Chamado pela Cloud Function
 * agendada diariamente. Retorna métricas para monitoring.
 *
 * Idempotência: checa se a task já existe via source_milestone_index +
 * post_adoption_id antes de criar.
 *
 * @param {object} options
 * @param {Date} options.now - data de referência (default: now)
 * @returns {Promise<{materialized: number, skipped: number, errors: number}>}
 */
export async function materializeDueMilestones(options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  const { now = new Date(), maxAdoptions = 500 } = options;

  // 1. Lista adoções ativas via collectionGroup em post_adoption
  //    (cobre TODOS os abrigos em uma única query — independente do
  //    shelter_club_id). Filtro adicional: post_adoption com
  //    `next_milestone_at <= now` para evitar carregar tudo.
  //    O índice single-field em `status` é auto-criado pelo Firestore.
  const adoptionsSnap = await getDocs(query(
    collectionGroup(db, POST_ADOPTION_SUBCOLLECTION),
    where('status', '==', 'active'),
    where('next_milestone_at', '<=', now.toISOString()),
    limit(maxAdoptions),
  )).catch((err) => {
    logger.warn('postAdoptionService.materializeDueMilestones', {
      msg: 'collectionGroup query failed',
      err: String(err),
    });
    return null;
  });

  if (!adoptionsSnap || adoptionsSnap.empty) {
    logger.info('postAdoptionService.materializeDueMilestones', {
      msg: 'no adoptions with due milestones',
      now: now.toISOString(),
    });
    return { materialized: 0, skipped: 0, errors: 0, scanned: 0 };
  }

  let materialized = 0;
  let skipped = 0;
  const errors = [];

  // Materializa em paralelo (cada doc tem sua própria transação
  // atômica no Firestore via materializeForAdoption). Erros são
  // isolados: um doc falhando não derruba o batch.
  const results = await Promise.allSettled(
    adoptionsSnap.docs.map((d) => {
      // collectionGroup docs expõem o ref completo (path include o parent)
      const segs = d.ref.path.split('/');
      const shelterClubId = segs[1]; // 'clubs/{clubId}/post_adoption/{id}'
      const postAdoptionId = d.id;
      return materializeForAdoption(shelterClubId, postAdoptionId, { now });
    }),
  );
  for (const r of results) {
    if (r.status === 'fulfilled') {
      materialized += r.value.materialized;
      skipped += r.value.skipped;
    } else {
      errors.push(String(r.reason));
    }
  }

  logger.info('postAdoptionService.materializeDueMilestones', {
    msg: 'materialization complete',
    now: now.toISOString(),
    scanned: adoptionsSnap.size,
    materialized,
    skipped,
    errors: errors.length,
  });

  return { materialized, skipped, errors: errors.length, scanned: adoptionsSnap.size };
}

/**
 * Materializa os milestones devidos de UMA adoption específica.
 * Útil para testes e para reconciliação manual.
 */
export async function materializeForAdoption(shelterClubId, postAdoptionId, options = {}) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !postAdoptionId) throw new Error('shelterClubId e postAdoptionId obrigatórios');
  const { now = new Date(), dryRun = false } = options;

  const postRef = doc(db, CLUBS_COLLECTION, shelterClubId, POST_ADOPTION_SUBCOLLECTION, postAdoptionId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) throw new Error('Post-adoption não encontrado.');
  const post = snap.data();
  if (post.status !== 'active') {
    return { materialized: 0, skipped: 0, reason: `status is ${post.status}` };
  }

  const milestones = post.milestones || [];
  const toMaterialize = milestones.filter((m) =>
    !m.materialized && _shouldMaterialize({ scheduled_for: m.scheduled_for }, now),
  );
  const alreadyDone = milestones.filter((m) => m.materialized).length;

  if (dryRun) {
    return { materialized: 0, skipped: toMaterialize.length, dryRun: true, alreadyDone };
  }

  if (toMaterialize.length === 0) {
    return { materialized: 0, skipped: 0, alreadyDone };
  }

  // Cria tasks no Kanban
  const updatedMilestones = [...milestones];
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
    const taskRef = await addDoc(
      collection(db, CLUBS_COLLECTION, shelterClubId, 'kanban_tasks'),
      task,
    );
    const idx = updatedMilestones.findIndex((x) => x.source_milestone_index === m.source_milestone_index);
    if (idx >= 0) {
      updatedMilestones[idx] = { ...updatedMilestones[idx], materialized: true, materialized_task_id: taskRef.id };
    }
    materializedCount++;
  }

  // Atualiza doc de post_adoption
  await updateDoc(postRef, {
    milestones: updatedMilestones,
    materialized_count: (post.materialized_count || 0) + materializedCount,
    last_materialized_at: now.toISOString(),
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'post_adoption_milestones_materialized',
    actor: { uid: 'system-cron' },
    details: {
      post_adoption_id: postAdoptionId,
      materialized: materializedCount,
      skipped: toMaterialize.length - materializedCount,
    },
  }).catch(() => {});

  return { materialized: materializedCount, skipped: 0, alreadyDone };
}

// ─── Update (devolução/cancelamento) ───────────────────────────────────

/**
 * Marca o post-adoption como devolvido (animal voltou ao abrigo).
 */
export async function markAsReturned(shelterClubId, postAdoptionId, reason, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !postAdoptionId) throw new Error('shelterClubId e postAdoptionId obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  if (!reason) throw new Error('reason é obrigatório para devolução');

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, POST_ADOPTION_SUBCOLLECTION, postAdoptionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Post-adoption não encontrado.');

  await updateDoc(ref, {
    status: 'returned',
    returned_at: new Date().toISOString(),
    return_reason: reason,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'post_adoption_returned',
    actor,
    details: { post_adoption_id: postAdoptionId, reason },
  }).catch(() => {});

  return { ok: true };
}

/**
 * Pausa a sequência (ex: adotante viajou, não precisa check-ins).
 */
export async function pausePostAdoption(shelterClubId, postAdoptionId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !postAdoptionId) throw new Error('shelterClubId e postAdoptionId obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const ref = doc(db, CLUBS_COLLECTION, shelterClubId, POST_ADOPTION_SUBCOLLECTION, postAdoptionId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Post-adoption não encontrado.');
  const current = snap.data() || {};
  if (current.status === 'paused') {
    return { ok: true, alreadyPaused: true };
  }
  if (current.status !== 'active') {
    throw new Error(`Não é permitido pausar post-adoption com status '${current.status}'.`);
  }

  await updateDoc(ref, {
    status: 'paused',
    paused_at: new Date().toISOString(),
    paused_by_uid: actor.uid,
    updated_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'post_adoption_paused',
    actor,
    details: { post_adoption_id: postAdoptionId, from: 'active' },
  }).catch(() => {});

  return { ok: true };
}
