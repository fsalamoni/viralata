/**
 * @fileoverview Serviço: Tarefas do abrigo (painel Kanban operacional).
 *
 * Coleção dedicada e exclusiva:
 *   clubs/{clubId}/tasks/{taskId}                 — a tarefa (todos os dados)
 *   clubs/{clubId}/tasks/{taskId}/task_logs/{id}  — log de auditoria completo
 *
 * A tarefa carrega um array `activity` (timeline amigável, visível a qualquer
 * membro). Cada mutação também grava uma entrada imutável em `task_logs`
 * (auditoria completa — leitura restrita a atribuição maior, ver rules).
 *
 * Multi-tenant: `shelter_club_id` duplicado no doc, validado contra o clubId
 * da path. Firestore sem ignoreUndefinedProperties → nunca persistir undefined.
 */
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, serverTimestamp, writeBatch,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  TASK_PHASE, TASK_ACTIVITY,
  createTaskSchema, editTaskSchema, thirdPartySchema, validateTransition,
  buildActivity, genId,
} from '@/modules/shelter/domain/operational/tasks';

const CLUBS = 'clubs';
const TASKS = 'tasks';
const LOGS = 'task_logs';

function tasksCol(clubId) { return collection(db, CLUBS, clubId, TASKS); }
function taskRef(clubId, taskId) { return doc(db, CLUBS, clubId, TASKS, taskId); }
function taskLogsCol(clubId, taskId) { return collection(db, CLUBS, clubId, TASKS, taskId, LOGS); }

/** Remove chaves com valor undefined (Firestore rejeita undefined). */
function stripUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function _verifyTenant(clubId, taskId) {
  if (!db) return null;
  if (!clubId || !taskId) throw new Error('clubId e taskId são obrigatórios');
  const snap = await getDoc(taskRef(clubId, taskId));
  if (!snap.exists()) throw new Error('Tarefa não encontrada neste abrigo');
  const data = snap.data();
  if (data.shelter_club_id && data.shelter_club_id !== clubId) {
    throw new Error('Acesso negado: tarefa pertence a outro abrigo');
  }
  return { id: snap.id, ...data };
}

/** Grava uma entrada imutável no log de auditoria da tarefa (best-effort). */
async function _appendLog(clubId, taskId, actor, action, details = {}) {
  if (!db) return;
  try {
    await addDoc(taskLogsCol(clubId, taskId), stripUndefined({
      action,
      at: serverTimestamp(),
      by_uid: actor?.uid || null,
      by_name: actor?.name || actor?.displayName || 'Membro',
      details,
    }));
  } catch (err) {
    logger.warn('[shelterTaskService] falha ao gravar task_log (não bloqueante)', err);
  }
  createAuditLog({
    action: `task_${action}`,
    clubId,
    uid: actor?.uid,
    metadata: { taskId, ...details },
  }).catch(() => {});
}

// ─── Leitura ────────────────────────────────────────────────────────────

export async function listTasks(clubId) {
  if (!db) return [];
  if (!clubId) throw new Error('clubId é obrigatório');
  const q = query(tasksCol(clubId), orderBy('created_at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getTask(clubId, taskId) {
  if (!db) return null;
  return _verifyTenant(clubId, taskId);
}

export async function getTaskLogs(clubId, taskId) {
  if (!db) return [];
  const q = query(taskLogsCol(clubId, taskId), orderBy('at', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── Criação / edição ───────────────────────────────────────────────────

export async function createTask(clubId, actor, payload) {
  if (!db) return { id: 'mock-task-id' };
  if (!clubId) throw new Error('clubId é obrigatório');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
  const parsed = createTaskSchema.parse(payload);
  const now = serverTimestamp();

  const activity = [buildActivity(TASK_ACTIVITY.CREATED, actor, 'Tarefa criada em Pendentes')];

  const data = stripUndefined({
    shelter_club_id: clubId,
    phase: TASK_PHASE.PENDING,
    title: parsed.title,
    description: parsed.description || '',
    due_at: parsed.due_at || null,
    attachments: parsed.attachments || [],
    created_by_uid: actor.uid,
    created_by_name: actor.name || actor.displayName || 'Membro',
    // Campos de fase (preenchidos nas transições)
    responsible_uid: null,
    responsible_name: null,
    in_development_at: null,
    third_parties: [],
    awaiting_since: null,
    completion_note: null,
    completion_attachments: [],
    done_at: null,
    archive_reason: null,
    archived_at: null,
    activity,
    created_at: now,
    updated_at: now,
  });

  const ref = await addDoc(tasksCol(clubId), data);
  await _appendLog(clubId, ref.id, actor, 'created', { title: parsed.title });
  logger.info('[shelterTaskService] tarefa criada', { taskId: ref.id, clubId });
  return { id: ref.id };
}

export async function editTask(clubId, taskId, actor, updates) {
  if (!db) return;
  const current = await _verifyTenant(clubId, taskId);
  const parsed = editTaskSchema.parse(updates);
  const patch = stripUndefined({
    title: parsed.title,
    description: parsed.description,
    due_at: parsed.due_at === undefined ? undefined : (parsed.due_at || null),
  });
  if (Object.keys(patch).length === 0) return;

  const activity = [
    ...(current.activity || []),
    buildActivity(TASK_ACTIVITY.EDITED, actor, 'Tarefa editada', { fields: Object.keys(patch) }),
  ];
  await updateDoc(taskRef(clubId, taskId), { ...patch, activity, updated_at: serverTimestamp() });
  await _appendLog(clubId, taskId, actor, 'edited', { fields: Object.keys(patch) });
}

// ─── Transições de fase ─────────────────────────────────────────────────

/**
 * Move a tarefa para `toPhase`, exigindo e gravando os dados da transição.
 * @param {object} args { toPhase, data }
 */
export async function moveTask(clubId, taskId, actor, { toPhase, data = {} }) {
  if (!db) return;
  const current = await _verifyTenant(clubId, taskId);
  const { kind, data: parsed } = validateTransition(toPhase, data);
  const now = serverTimestamp();
  const nowIso = new Date().toISOString();

  const patch = { phase: toPhase, updated_at: now };
  let activityEntry;

  if (kind === 'in_development') {
    patch.responsible_uid = parsed.responsible_uid || null;
    patch.responsible_name = parsed.responsible_name;
    patch.in_development_at = nowIso;
    activityEntry = buildActivity(
      TASK_ACTIVITY.RESPONSIBLE_SET, actor,
      `Em desenvolvimento — responsável: ${parsed.responsible_name}`,
      { responsible_name: parsed.responsible_name },
    );
  } else if (kind === 'awaiting_third_party') {
    const entry = stripUndefined({
      id: genId('tp'),
      name: parsed.name,
      delivery_method: parsed.delivery_method,
      expectation: parsed.expectation,
      expected_return_at: parsed.expected_return_at,
      created_at: nowIso,
    });
    patch.third_parties = [...(current.third_parties || []), entry];
    if (!current.awaiting_since) patch.awaiting_since = nowIso;
    activityEntry = buildActivity(
      TASK_ACTIVITY.THIRD_PARTY_ADDED, actor,
      `Aguardando terceiro: ${parsed.name}`,
      { third_party: parsed.name, expected_return_at: parsed.expected_return_at },
    );
  } else if (kind === 'done') {
    patch.completion_note = parsed.completion_note;
    patch.completion_attachments = parsed.attachments || [];
    patch.done_at = nowIso;
    activityEntry = buildActivity(TASK_ACTIVITY.COMPLETED, actor, 'Tarefa concluída');
  } else if (kind === 'archived') {
    patch.archive_reason = parsed.archive_reason;
    patch.archived_at = nowIso;
    activityEntry = buildActivity(TASK_ACTIVITY.ARCHIVED, actor, 'Tarefa arquivada');
  } else {
    activityEntry = buildActivity(TASK_ACTIVITY.MOVED, actor, `Movida para ${toPhase}`, { to: toPhase });
  }

  patch.activity = [...(current.activity || []), activityEntry];
  await updateDoc(taskRef(clubId, taskId), stripUndefined(patch));
  await _appendLog(clubId, taskId, actor, 'moved', { from: current.phase, to: toPhase });
  logger.info('[shelterTaskService] tarefa movida', { taskId, from: current.phase, to: toPhase });
}

/** Adiciona um terceiro a uma tarefa já em Aguardando Terceiros. */
export async function addThirdParty(clubId, taskId, actor, data) {
  if (!db) return;
  const current = await _verifyTenant(clubId, taskId);
  const parsed = thirdPartySchema.parse(data);
  const nowIso = new Date().toISOString();
  const entry = stripUndefined({
    id: genId('tp'),
    name: parsed.name,
    delivery_method: parsed.delivery_method,
    expectation: parsed.expectation,
    expected_return_at: parsed.expected_return_at,
    created_at: nowIso,
  });
  const activity = [
    ...(current.activity || []),
    buildActivity(TASK_ACTIVITY.THIRD_PARTY_ADDED, actor, `Novo terceiro: ${parsed.name}`, { third_party: parsed.name }),
  ];
  await updateDoc(taskRef(clubId, taskId), {
    third_parties: [...(current.third_parties || []), entry],
    awaiting_since: current.awaiting_since || nowIso,
    activity,
    updated_at: serverTimestamp(),
  });
  await _appendLog(clubId, taskId, actor, 'third_party_added', { third_party: parsed.name });
}

// ─── Exclusão ───────────────────────────────────────────────────────────

export async function deleteTask(clubId, taskId, actor) {
  if (!db) return;
  await _verifyTenant(clubId, taskId);
  // Log da exclusão ANTES de apagar (auditoria) — grava na coleção do abrigo.
  await _appendLog(clubId, taskId, actor, 'deleted', {});
  // Apaga logs + a tarefa em batch (best-effort).
  try {
    const logsSnap = await getDocs(taskLogsCol(clubId, taskId));
    const batch = writeBatch(db);
    logsSnap.docs.forEach((d) => batch.delete(d.ref));
    batch.delete(taskRef(clubId, taskId));
    await batch.commit();
  } catch (err) {
    logger.warn('[shelterTaskService] falha ao apagar logs em batch, apagando só a tarefa', err);
    await deleteDoc(taskRef(clubId, taskId));
  }
  logger.info('[shelterTaskService] tarefa excluída', { taskId, clubId });
}
