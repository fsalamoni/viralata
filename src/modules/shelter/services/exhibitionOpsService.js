/**
 * Serviço das Operações de Vitrine V1 (ROADMAP · Fase 5 ·
 * SHELTER_EXHIBITION_OPS_V1).
 *
 * Grava de forma ADITIVA o campo `ops` no MESMO documento
 * `clubs/{clubId}/exhibitions/{exhibitionId}` — planejamento (checklist +
 * venue/estrutura/orçamento), logística, mutirão de saúde e fila de tratativas
 * de adoção/doação. Nenhuma subcoleção nova é criada e nenhuma regra do
 * Firestore precisa mudar: o ramo de `update` da vitrine não usa `hasOnly()`,
 * então campos extras passam desde que `shelter_club_id`/`organizer_uid`
 * permaneçam imutáveis e o `status` continue válido (o que aqui nunca tocamos).
 *
 * Escrita por caminho pontilhado (`ops.logistics`, `ops.planning.checklist`, …)
 * para nunca sobrescrever os demais ramos de `ops`. Com a flag OFF este serviço
 * não é chamado e a vitrine atual permanece byte-a-byte idêntica.
 *
 * A escala de voluntários (`shifts`) e o log pós-evento (`post_event_log`)
 * continuam sendo a fonte de verdade desses módulos — não são duplicados aqui.
 */

import {
  collection, doc, getDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import {
  normalizeChecklistItem,
  normalizeLogisticsItem,
  normalizeHealthTask,
  normalizeAdoptionEntry,
  normalizePlanning,
  upsertById,
  removeById,
  OPS_LIMITS,
} from '@/modules/shelter/domain/engagement/exhibitionOps';
import { getOps } from '@/modules/shelter/domain/engagement/exhibitionOpsView';

const CLUBS_COLLECTION = 'clubs';
const EXHIBITIONS_SUBCOLLECTION = 'exhibitions';

// ─── Helpers internos ──────────────────────────────────────────────────

function _assertActor(actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
}

function _exhibitionRef(shelterClubId, exhibitionId) {
  return doc(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION, exhibitionId);
}

function _exhibitionsCollection(shelterClubId) {
  return collection(db, CLUBS_COLLECTION, shelterClubId, EXHIBITIONS_SUBCOLLECTION);
}

/** Gera um id local para itens do `ops` (sem criar documento). */
function _mintId(shelterClubId) {
  return doc(_exhibitionsCollection(shelterClubId)).id;
}

/** Lê a vitrine e valida o tenant. Retorna os dados atuais do doc. */
async function _verifyExhibitionTenant(exhibitionId, shelterClubId) {
  if (!exhibitionId || !shelterClubId) {
    throw new Error('exhibitionId e shelterClubId são obrigatórios');
  }
  const snap = await getDoc(_exhibitionRef(shelterClubId, exhibitionId));
  if (!snap.exists()) throw new Error('Vitrine não encontrada.');
  const data = snap.data();
  if (data.shelter_club_id !== shelterClubId) {
    throw new Error('Cross-tenant access blocked.');
  }
  return { id: snap.id, ...data };
}

/** Aplica um patch de caminhos pontilhados + metadados e audita (best-effort). */
async function _writeOps(shelterClubId, exhibitionId, actor, patchPaths, audit) {
  await updateDoc(_exhibitionRef(shelterClubId, exhibitionId), {
    ...patchPaths,
    'ops.updated_at': serverTimestamp(),
    'ops.updated_by_uid': actor.uid,
  });
  await createAuditLog({
    action: audit.action,
    actor,
    details: { exhibition_id: exhibitionId, shelter_club_id: shelterClubId, ...(audit.details || {}) },
  }).catch((err) => {
    logger.warn('exhibitionOpsService', { msg: 'audit failed (non-blocking)', err: String(err) });
  });
}

// ─── Planejamento ──────────────────────────────────────────────────────

/** Atualiza venue/estrutura/orçamento do planejamento (não toca a checklist). */
export async function updatePlanning(shelterClubId, exhibitionId, input, actor) {
  _assertActor(actor);
  await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const planning = normalizePlanning(input);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.planning.venue_notes': planning.venue_notes,
    'ops.planning.structure_notes': planning.structure_notes,
    'ops.planning.budget_total': planning.budget_total,
    'ops.planning.budget_notes': planning.budget_notes,
  }, { action: 'exhibition_ops_planning_updated' });
  return planning;
}

/** Adiciona um item à checklist de planejamento. */
export async function addChecklistItem(shelterClubId, exhibitionId, label, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).planning.checklist;
  if (list.length >= OPS_LIMITS.CHECKLIST_MAX) throw new Error('Limite de itens da checklist atingido.');
  const item = normalizeChecklistItem({ id: _mintId(shelterClubId), label, done: false });
  if (!item.label) throw new Error('Descreva o item da checklist.');
  const next = upsertById(list, item, OPS_LIMITS.CHECKLIST_MAX);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.planning.checklist': next,
  }, { action: 'exhibition_ops_checklist_added', details: { item_id: item.id } });
  return item;
}

/** Marca/desmarca um item da checklist. */
export async function toggleChecklistItem(shelterClubId, exhibitionId, itemId, done, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).planning.checklist;
  const found = list.find((c) => c && c.id === itemId);
  if (!found) throw new Error('Item não encontrado.');
  const item = normalizeChecklistItem({ ...found, done: done === true });
  const next = upsertById(list, item);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.planning.checklist': next,
  }, { action: 'exhibition_ops_checklist_toggled', details: { item_id: itemId, done: item.done } });
  return item;
}

/** Remove um item da checklist. */
export async function removeChecklistItem(shelterClubId, exhibitionId, itemId, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).planning.checklist;
  const next = removeById(list, itemId);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.planning.checklist': next,
  }, { action: 'exhibition_ops_checklist_removed', details: { item_id: itemId } });
  return { id: itemId };
}

// ─── Logística ─────────────────────────────────────────────────────────

/** Adiciona um item de logística (transporte/alimentação/água/energia/…). */
export async function addLogisticsItem(shelterClubId, exhibitionId, input, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).logistics;
  if (list.length >= OPS_LIMITS.LOGISTICS_MAX) throw new Error('Limite de itens de logística atingido.');
  const item = normalizeLogisticsItem({ ...input, id: _mintId(shelterClubId) });
  if (!item.label) throw new Error('Descreva o item de logística.');
  const next = upsertById(list, item, OPS_LIMITS.LOGISTICS_MAX);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.logistics': next,
  }, { action: 'exhibition_ops_logistics_added', details: { item_id: item.id, category: item.category } });
  return item;
}

/** Atualiza um item de logística existente (status, custo, responsável…). */
export async function updateLogisticsItem(shelterClubId, exhibitionId, itemId, patch, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).logistics;
  const found = list.find((it) => it && it.id === itemId);
  if (!found) throw new Error('Item de logística não encontrado.');
  const item = normalizeLogisticsItem({ ...found, ...patch, id: itemId });
  const next = upsertById(list, item);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.logistics': next,
  }, { action: 'exhibition_ops_logistics_updated', details: { item_id: itemId, status: item.status } });
  return item;
}

/** Remove um item de logística. */
export async function removeLogisticsItem(shelterClubId, exhibitionId, itemId, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).logistics;
  const next = removeById(list, itemId);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.logistics': next,
  }, { action: 'exhibition_ops_logistics_removed', details: { item_id: itemId } });
  return { id: itemId };
}

// ─── Mutirão de saúde ──────────────────────────────────────────────────

/** Adiciona uma tarefa do mutirão (vacina/cirurgia/consulta/…) por pet. */
export async function addHealthTask(shelterClubId, exhibitionId, input, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).health;
  if (list.length >= OPS_LIMITS.HEALTH_MAX) throw new Error('Limite de tarefas do mutirão atingido.');
  const item = normalizeHealthTask({ ...input, id: _mintId(shelterClubId) });
  const next = upsertById(list, item, OPS_LIMITS.HEALTH_MAX);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.health': next,
  }, { action: 'exhibition_ops_health_added', details: { item_id: item.id, type: item.type } });
  return item;
}

/** Atualiza uma tarefa do mutirão (status, agendamento, notas…). */
export async function updateHealthTask(shelterClubId, exhibitionId, itemId, patch, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).health;
  const found = list.find((it) => it && it.id === itemId);
  if (!found) throw new Error('Tarefa do mutirão não encontrada.');
  const item = normalizeHealthTask({ ...found, ...patch, id: itemId });
  const next = upsertById(list, item);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.health': next,
  }, { action: 'exhibition_ops_health_updated', details: { item_id: itemId, status: item.status } });
  return item;
}

/** Remove uma tarefa do mutirão. */
export async function removeHealthTask(shelterClubId, exhibitionId, itemId, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).health;
  const next = removeById(list, itemId);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.health': next,
  }, { action: 'exhibition_ops_health_removed', details: { item_id: itemId } });
  return { id: itemId };
}

// ─── Fila de tratativas de adoção/doação ───────────────────────────────

/** Adiciona uma entrada à fila de tratativas (interessado por um pet). */
export async function addAdoptionEntry(shelterClubId, exhibitionId, input, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).adoption;
  if (list.length >= OPS_LIMITS.ADOPTION_MAX) throw new Error('Limite de tratativas atingido.');
  const item = normalizeAdoptionEntry({ ...input, id: _mintId(shelterClubId) });
  if (!item.applicant_name) throw new Error('Informe o nome do interessado.');
  const next = upsertById(list, item, OPS_LIMITS.ADOPTION_MAX);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.adoption': next,
  }, { action: 'exhibition_ops_adoption_added', details: { item_id: item.id, stage: item.stage } });
  return item;
}

/** Atualiza uma entrada da fila (mudar etapa, notas, contato, pet…). */
export async function updateAdoptionEntry(shelterClubId, exhibitionId, itemId, patch, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).adoption;
  const found = list.find((it) => it && it.id === itemId);
  if (!found) throw new Error('Tratativa não encontrada.');
  const item = normalizeAdoptionEntry({ ...found, ...patch, id: itemId, created_at: found.created_at });
  const next = upsertById(list, item);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.adoption': next,
  }, { action: 'exhibition_ops_adoption_updated', details: { item_id: itemId, stage: item.stage } });
  return item;
}

/** Remove uma entrada da fila de tratativas. */
export async function removeAdoptionEntry(shelterClubId, exhibitionId, itemId, actor) {
  _assertActor(actor);
  const current = await _verifyExhibitionTenant(exhibitionId, shelterClubId);
  const list = getOps(current).adoption;
  const next = removeById(list, itemId);
  await _writeOps(shelterClubId, exhibitionId, actor, {
    'ops.adoption': next,
  }, { action: 'exhibition_ops_adoption_removed', details: { item_id: itemId } });
  return { id: itemId };
}
