/**
 * @fileoverview Serviço: Atribuições Finas de Voluntários (TASK-274).
 *
 * Coleção: `clubs/{clubId}/volunteer_assignments/{assignmentId}`.
 * Multi-tenant: cada abrigo opera apenas nos seus próprios documentos.
 *
 * Regra A §2.1: only_shelter_with(volunteers:manage) cria/remove;
 * voluntário dono pode ler os seus próprios registros.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § TASK-274
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { safeCreateAuditLog } from '@/core/services/auditService';
import {
  createVolunteerAssignmentSchema,
  updateVolunteerAssignmentSchema,
  listAssignmentsOptionsSchema,
  isAssignmentActive,
} from '@/modules/shelter/domain/operational/volunteerAssignment';

const CLUBS_COLLECTION = 'clubs';
const ASSIGNMENTS_SUBCOLLECTION = 'volunteer_assignments';

function assignmentsCollection(shelterClubId) {
  return collection(db, CLUBS_COLLECTION, shelterClubId, ASSIGNMENTS_SUBCOLLECTION);
}

function assignmentDoc(shelterClubId, assignmentId) {
  return doc(db, CLUBS_COLLECTION, shelterClubId, ASSIGNMENTS_SUBCOLLECTION, assignmentId);
}

// ─── READ ────────────────────────────────────────────────────────────────────

/**
 * Lista atribuições de um abrigo.
 *
 * @param {string} shelterClubId
 * @param {object} options
 * @param {string}   [options.volunteerUid]
 * @param {string}   [options.capability]
 * @param {string}   [options.scope]
 * @param {boolean}  [options.includeExpired=false]
 * @param {number}   [options.maxResults=200]
 * @returns {Promise<Assignment[]>}
 */
export async function listAssignments(shelterClubId, options = {}) {
  if (!db) return [];
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório (multi-tenant)');

  const parsed = listAssignmentsOptionsSchema.safeParse(options);
  if (!parsed.success) throw new Error(parsed.error.message);

  const { volunteerUid, capability, scope, includeExpired = false, maxResults = 200 } = parsed.data;

  const constraints = [];
  if (volunteerUid) constraints.push(where('volunteer_uid', '==', volunteerUid));
  if (capability) constraints.push(where('capability', '==', capability));
  if (scope) constraints.push(where('scope', '==', scope));
  constraints.push(orderBy('assigned_at', 'desc'));
  constraints.push(limit(maxResults));

  const q = query(assignmentsCollection(shelterClubId), ...constraints);
  const snap = await getDocs(q);
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  return includeExpired ? all : all.filter((a) => isAssignmentActive(a));
}

/**
 * Lista atribuições ATIVAS de um voluntário (próprio voluntário lê).
 */
export async function listMyAssignments(shelterClubId, volunteerUid) {
  if (!db || !shelterClubId || !volunteerUid) return [];
  return listAssignments(shelterClubId, { volunteerUid, includeExpired: false });
}

/**
 * Lista todas as atribuições ativas agrupadas por voluntário.
 * Útil para alimentar a matriz de atribuições no admin.
 *
 * @returns {Promise<Record<string, Assignment[]>>}  key = volunteerUid
 */
export async function listAssignmentsByVolunteer(shelterClubId) {
  const assignments = await listAssignments(shelterClubId, { includeExpired: false });
  return assignments.reduce((acc, a) => {
    if (!acc[a.volunteer_uid]) acc[a.volunteer_uid] = [];
    acc[a.volunteer_uid].push(a);
    return acc;
  }, {});
}

export async function getAssignment(shelterClubId, assignmentId) {
  if (!db || !shelterClubId || !assignmentId) return null;
  const snap = await getDoc(assignmentDoc(shelterClubId, assignmentId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

/**
 * Cria uma atribuição de capability para um voluntário.
 *
 * @param {string} shelterClubId
 * @param {object} input     - validado por createVolunteerAssignmentSchema
 * @param {object} actor     - {uid} do admin do abrigo
 * @returns {Promise<Assignment>}
 */
export async function createAssignment(shelterClubId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = createVolunteerAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn('[AssignmentService] createAssignment: schema rejected', {
      errors: parsed.error.flatten(),
    });
    throw new Error(parsed.error.errors[0]?.message ?? 'Dados inválidos');
  }

  const data = {
    ...parsed.data,
    assigned_by_uid: actor.uid,
    assigned_at: new Date().toISOString(),
  };

  const ref = await addDoc(assignmentsCollection(shelterClubId), data);

  await safeCreateAuditLog({
    action: 'volunteer_assignment.created',
    uid: actor.uid,
    metadata: { assignmentId: ref.id, volunteerUid: data.volunteer_uid, capability: data.capability },
  });

  logger.info('[AssignmentService] Assignment created', { id: ref.id, ...data });
  const snap = await getDoc(ref);
  return { id: snap.id, ...snap.data() };
}

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * Atualiza uma atribuição existente.
 *
 * @param {string} shelterClubId
 * @param {string} assignmentId
 * @param {object} input     - validado por updateVolunteerAssignmentSchema
 * @param {object} actor     - {uid}
 */
export async function updateAssignment(shelterClubId, assignmentId, input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !assignmentId) throw new Error('shelterClubId + assignmentId são obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = updateVolunteerAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    logger.warn('[AssignmentService] updateAssignment: schema rejected', {
      errors: parsed.error.flatten(),
    });
    throw new Error(parsed.error.errors[0]?.message ?? 'Dados inválidos');
  }

  const cleanData = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined)
  );

  await updateDoc(assignmentDoc(shelterClubId, assignmentId), cleanData);

  await safeCreateAuditLog({
    action: 'volunteer_assignment.updated',
    uid: actor.uid,
    metadata: { assignmentId, changes: Object.keys(cleanData) },
  });

  logger.info('[AssignmentService] Assignment updated', { assignmentId, ...cleanData });
  const snap = await getDoc(assignmentDoc(shelterClubId, assignmentId));
  return { id: snap.id, ...snap.data() };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * Remove uma atribuição.
 *
 * @param {string} shelterClubId
 * @param {string} assignmentId
 * @param {object} actor - {uid} do admin
 */
export async function deleteAssignment(shelterClubId, assignmentId, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!shelterClubId || !assignmentId) throw new Error('shelterClubId + assignmentId são obrigatórios');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const existing = await getAssignment(shelterClubId, assignmentId);
  if (!existing) throw new Error('Atribuição não encontrada');

  await deleteDoc(assignmentDoc(shelterClubId, assignmentId));

  await safeCreateAuditLog({
    action: 'volunteer_assignment.deleted',
    uid: actor.uid,
    metadata: {
      assignmentId,
      volunteerUid: existing.volunteer_uid,
      capability: existing.capability,
    },
  });

  logger.info('[AssignmentService] Assignment deleted', { assignmentId });
}

// ─── TOGGLE convenience ───────────────────────────────────────────────────────

/**
 * Ativa ou desativa (remove) uma atribuição.
 * Se já existir (ativa), remove. Se não existir, cria.
 *
 * @param {string} shelterClubId
 * @param {string} volunteerUid
 * @param {string} capability
 * @param {string} scope
 * @param {object} actor
 * @returns {{action: 'created'|'deleted', assignment?: object}}
 */
export async function toggleAssignment(shelterClubId, volunteerUid, capability, scope, actor) {
  if (!shelterClubId || !volunteerUid || !capability) {
    throw new Error('shelterClubId, volunteerUid e capability são obrigatórios');
  }

  const existing = await listAssignments(shelterClubId, {
    volunteerUid,
    capability,
    scope: scope || 'shelter',
    includeExpired: false,
  });

  const current = existing.find((a) => a.scope === (scope || 'shelter'));
  if (current) {
    await deleteAssignment(shelterClubId, current.id, actor);
    return { action: 'deleted', assignmentId: current.id };
  }

  const created = await createAssignment(shelterClubId, {
    volunteer_uid: volunteerUid,
    capability,
    scope: scope || 'shelter',
  }, actor);
  return { action: 'created', assignment: created };
}
