/**
 * @fileoverview interviewService — CRUD de entrevistas (TASK-290).
 *
 * Coleção: `clubs/{clubId}/interviews/{interviewId}`.
 *
 * Fluxo:
 *  1. Abrigo propõe: `proposeInterview()` → status = PROPOSED
 *  2. Abrigo agenda: `scheduleInterview()` → status = SCHEDULED
 *  3. Abrigo conduz + finaliza: `completeInterview()` → status = COMPLETED
 *  4. Abrigo avalia: `evaluateInterview()` → status = EVALUATED
 *  5. Qualquer parte pode cancelar antes do COMPLETED
 *
 * Audit log: 'interview_proposed', 'interview_scheduled', 'interview_completed',
 * 'interview_evaluated', 'interview_cancelled'.
 */
import {
  doc, collection, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';

import { db } from '@/core/config/firebase';
import { createAuditLog } from '@/core/services/auditService';
import {
  createInterviewSchema, parseInterviewOrThrow, INTERVIEW_STATUS, VALID_TRANSITIONS,
} from '../schemas/interviewSchema';
import { buildInterviewDocId } from './interviewService.internal';

const COLLECTION = 'interviews';

/**
 * Propor uma entrevista para uma application.
 */
export async function proposeInterview(input, actor) {
  if (!actor?.uid) throw new Error('proposeInterview: actor required');
  const { clubId, applicationId, applicantUid, applicantName, checklist = [] } = input;
  if (!clubId || !applicationId || !applicantUid) {
    throw new Error('proposeInterview: clubId, applicationId, applicantUid required');
  }

  const interviewId = buildInterviewDocId({ applicationId, applicantUid });
  const now = new Date().toISOString();
  const payload = {
    application_id: applicationId,
    applicant_uid: applicantUid,
    applicant_name: applicantName,
    shelter_club_id: clubId,
    status: INTERVIEW_STATUS.PROPOSED,
    mode: 'in_person', // default — alterado no schedule
    scheduled_at: null,
    checklist,
    created_at: now,
    updated_at: now,
  };

  parseInterviewOrThrow(payload);

  const ref = doc(collection(db, 'clubs', clubId, COLLECTION), interviewId);
  await setDoc(ref, payload);

  await createAuditLog({
    action: 'interview_proposed',
    actor,
    details: { interview_id: interviewId, club_id: clubId, application_id: applicationId, applicant_uid: applicantUid },
  }).catch(() => {});

  return { id: interviewId, ...payload };
}

/**
 * Agendar a entrevista (data + modo).
 */
export async function scheduleInterview(input, actor) {
  if (!actor?.uid) throw new Error('scheduleInterview: actor required');
  const { clubId, interviewId, scheduledAt, mode } = input;
  if (!clubId || !interviewId || !scheduledAt || !mode) {
    throw new Error('scheduleInterview: clubId, interviewId, scheduledAt, mode required');
  }

  const ref = doc(db, 'clubs', clubId, COLLECTION, interviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('scheduleInterview: interview not found');
  const current = snap.data();
  if (!VALID_TRANSITIONS[current.status]?.includes(INTERVIEW_STATUS.SCHEDULED)) {
    throw new Error(`scheduleInterview: cannot transition from ${current.status} to scheduled`);
  }

  const update = {
    scheduled_at: scheduledAt,
    mode,
    status: INTERVIEW_STATUS.SCHEDULED,
    updated_at: new Date().toISOString(),
  };
  await setDoc(ref, update, { merge: true });

  await createAuditLog({
    action: 'interview_scheduled',
    actor,
    details: { interview_id: interviewId, club_id: clubId, scheduled_at: scheduledAt, mode },
  }).catch(() => {});

  return { id: interviewId, ...update };
}

/**
 * Concluir entrevista (preencher checklist + notas).
 */
export async function completeInterview(input, actor) {
  if (!actor?.uid) throw new Error('completeInterview: actor required');
  const { clubId, interviewId, checklist, notes } = input;
  if (!clubId || !interviewId) {
    throw new Error('completeInterview: clubId + interviewId required');
  }

  const ref = doc(db, 'clubs', clubId, COLLECTION, interviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('completeInterview: interview not found');
  const current = snap.data();
  if (!VALID_TRANSITIONS[current.status]?.includes(INTERVIEW_STATUS.COMPLETED)) {
    throw new Error(`completeInterview: cannot transition from ${current.status} to completed`);
  }

  const now = new Date().toISOString();
  const update = {
    checklist: checklist || [],
    notes: notes || null,
    status: INTERVIEW_STATUS.COMPLETED,
    completed_at: now,
    completed_by_uid: actor.uid,
    updated_at: now,
  };
  await setDoc(ref, update, { merge: true });

  await createAuditLog({
    action: 'interview_completed',
    actor,
    details: { interview_id: interviewId, club_id: clubId, items_completed: (checklist || []).filter((c) => c.done).length },
  }).catch(() => {});

  return { id: interviewId, ...update };
}

/**
 * Avaliar entrevista (estrelas 1-5 + notas).
 */
export async function evaluateInterview(input, actor) {
  if (!actor?.uid) throw new Error('evaluateInterview: actor required');
  const { clubId, interviewId, stars, notes } = input;
  if (!clubId || !interviewId) {
    throw new Error('evaluateInterview: clubId + interviewId required');
  }
  if (typeof stars !== 'number' || stars < 1 || stars > 5) {
    throw new Error('evaluateInterview: stars must be 1-5');
  }

  const ref = doc(db, 'clubs', clubId, COLLECTION, interviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('evaluateInterview: interview not found');
  const current = snap.data();
  if (!VALID_TRANSITIONS[current.status]?.includes(INTERVIEW_STATUS.EVALUATED)) {
    throw new Error(`evaluateInterview: cannot transition from ${current.status} to evaluated`);
  }

  const update = {
    evaluation_stars: stars,
    evaluation_notes: notes || null,
    status: INTERVIEW_STATUS.EVALUATED,
    updated_at: new Date().toISOString(),
  };
  await setDoc(ref, update, { merge: true });

  await createAuditLog({
    action: 'interview_evaluated',
    actor,
    details: { interview_id: interviewId, club_id: clubId, stars },
  }).catch(() => {});

  return { id: interviewId, ...update };
}

/**
 * Cancelar entrevista.
 */
export async function cancelInterview(input, actor) {
  if (!actor?.uid) throw new Error('cancelInterview: actor required');
  const { clubId, interviewId, reason } = input;
  if (!clubId || !interviewId || !reason) {
    throw new Error('cancelInterview: clubId, interviewId, reason required');
  }

  const ref = doc(db, 'clubs', clubId, COLLECTION, interviewId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('cancelInterview: interview not found');
  const current = snap.data();
  if (!VALID_TRANSITIONS[current.status]?.includes(INTERVIEW_STATUS.CANCELLED)) {
    throw new Error(`cancelInterview: cannot transition from ${current.status} to cancelled`);
  }

  const update = {
    status: INTERVIEW_STATUS.CANCELLED,
    cancel_reason: reason,
    updated_at: new Date().toISOString(),
  };
  await setDoc(ref, update, { merge: true });

  await createAuditLog({
    action: 'interview_cancelled',
    actor,
    details: { interview_id: interviewId, club_id: clubId, reason },
  }).catch(() => {});

  return { id: interviewId, ...update };
}

/**
 * Listar entrevistas de um abrigo.
 */
export async function listInterviewsByClub(clubId, { limit = 50 } = {}) {
  const q = query(
    collection(db, 'clubs', clubId, COLLECTION),
    orderBy('updated_at', 'desc'),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).slice(0, limit);
}

export { INTERVIEW_STATUS };
