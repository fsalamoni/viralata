/**
 * Domínio das Operações de Vitrine V1 (ROADMAP · Fase 5 ·
 * SHELTER_EXHIBITION_OPS_V1).
 *
 * Camada PURA (sem Firestore): enums, limites, normalizadores e operações de
 * lista para o "gerenciador integral de evento" da vitrine. Todos os dados são
 * gravados de forma ADITIVA no MESMO documento
 * `clubs/{clubId}/exhibitions/{exhibitionId}`, sob o campo `ops`:
 *
 *   ops = {
 *     planning:  { checklist: ChecklistItem[], venue_notes, structure_notes,
 *                  budget_total, budget_notes },
 *     logistics: LogisticsItem[],   // transporte/alimentação/água/energia/internet
 *     health:    HealthTask[],      // mutirão: vacinas/cirurgias/consultas
 *     adoption:  AdoptionEntry[],   // fila de tratativas de adoção/doação
 *     updated_at, updated_by_uid,
 *   }
 *
 * Não altera nenhum campo existente da vitrine (title/datetime_start/status/
 * pet_ids/venue/…). Com a flag OFF este código não roda e a vitrine atual
 * permanece idêntica. A escala de voluntários (subcoleção `shifts`) e o log
 * pós-evento (subcoleção `post_event_log`) continuam sendo a fonte de verdade
 * desses módulos — aqui não são duplicados.
 */

// ─── Enums ──────────────────────────────────────────────────────────────

/** Categorias de item de logística. */
export const LOGISTICS_CATEGORY = Object.freeze({
  TRANSPORT: 'transport',
  FOOD: 'food',
  WATER: 'water',
  ENERGY: 'energy',
  INTERNET: 'internet',
  STRUCTURE: 'structure',
  OTHER: 'other',
});

export const LOGISTICS_CATEGORY_LABELS = Object.freeze({
  [LOGISTICS_CATEGORY.TRANSPORT]: 'Transporte',
  [LOGISTICS_CATEGORY.FOOD]: 'Alimentação',
  [LOGISTICS_CATEGORY.WATER]: 'Água',
  [LOGISTICS_CATEGORY.ENERGY]: 'Energia',
  [LOGISTICS_CATEGORY.INTERNET]: 'Internet',
  [LOGISTICS_CATEGORY.STRUCTURE]: 'Estrutura física',
  [LOGISTICS_CATEGORY.OTHER]: 'Outro',
});

/** Situação de um item de logística. */
export const LOGISTICS_STATUS = Object.freeze({
  PENDING: 'pending',
  ARRANGED: 'arranged',
  DONE: 'done',
});

export const LOGISTICS_STATUS_LABELS = Object.freeze({
  [LOGISTICS_STATUS.PENDING]: 'Pendente',
  [LOGISTICS_STATUS.ARRANGED]: 'Providenciado',
  [LOGISTICS_STATUS.DONE]: 'Concluído',
});

/** Tipos de procedimento do mutirão de saúde. */
export const HEALTH_TASK_TYPE = Object.freeze({
  VACCINE: 'vaccine',
  SURGERY: 'surgery',
  CONSULT: 'consult',
  DEWORMING: 'deworming',
  MICROCHIP: 'microchip',
  EXAM: 'exam',
  OTHER: 'other',
});

export const HEALTH_TASK_TYPE_LABELS = Object.freeze({
  [HEALTH_TASK_TYPE.VACCINE]: 'Vacina',
  [HEALTH_TASK_TYPE.SURGERY]: 'Cirurgia',
  [HEALTH_TASK_TYPE.CONSULT]: 'Consulta',
  [HEALTH_TASK_TYPE.DEWORMING]: 'Vermifugação',
  [HEALTH_TASK_TYPE.MICROCHIP]: 'Microchip',
  [HEALTH_TASK_TYPE.EXAM]: 'Exame',
  [HEALTH_TASK_TYPE.OTHER]: 'Outro',
});

/** Situação de uma tarefa do mutirão. */
export const HEALTH_TASK_STATUS = Object.freeze({
  PENDING: 'pending',
  SCHEDULED: 'scheduled',
  DONE: 'done',
  CANCELLED: 'cancelled',
});

export const HEALTH_TASK_STATUS_LABELS = Object.freeze({
  [HEALTH_TASK_STATUS.PENDING]: 'Pendente',
  [HEALTH_TASK_STATUS.SCHEDULED]: 'Agendado',
  [HEALTH_TASK_STATUS.DONE]: 'Feito',
  [HEALTH_TASK_STATUS.CANCELLED]: 'Cancelado',
});

/** Etapas do funil de tratativas de adoção/doação no evento. */
export const ADOPTION_STAGE = Object.freeze({
  INTERESTED: 'interested',
  MEETING: 'meeting',
  NEGOTIATING: 'negotiating',
  APPROVED: 'approved',
  COMPLETED: 'completed',
  DECLINED: 'declined',
});

export const ADOPTION_STAGE_LABELS = Object.freeze({
  [ADOPTION_STAGE.INTERESTED]: 'Interessado',
  [ADOPTION_STAGE.MEETING]: 'Reunião',
  [ADOPTION_STAGE.NEGOTIATING]: 'Em tratativa',
  [ADOPTION_STAGE.APPROVED]: 'Aprovado',
  [ADOPTION_STAGE.COMPLETED]: 'Concluído',
  [ADOPTION_STAGE.DECLINED]: 'Recusado',
});

/** Ordem canônica das etapas do funil (para relatórios/ordenação). */
export const ADOPTION_STAGE_ORDER = Object.freeze([
  ADOPTION_STAGE.INTERESTED,
  ADOPTION_STAGE.MEETING,
  ADOPTION_STAGE.NEGOTIATING,
  ADOPTION_STAGE.APPROVED,
  ADOPTION_STAGE.COMPLETED,
  ADOPTION_STAGE.DECLINED,
]);

// ─── Limites ────────────────────────────────────────────────────────────

export const OPS_LIMITS = Object.freeze({
  CHECKLIST_MAX: 80,
  LOGISTICS_MAX: 120,
  HEALTH_MAX: 300,
  ADOPTION_MAX: 300,
  LABEL_MAX: 200,
  NAME_MAX: 200,
  CONTACT_MAX: 200,
  NOTES_MAX: 1000,
  BUDGET_MAX: 1_000_000_000,
});

// ─── Predicados de enum ─────────────────────────────────────────────────

const LOGISTICS_CATEGORIES = Object.freeze(Object.values(LOGISTICS_CATEGORY));
const LOGISTICS_STATUSES = Object.freeze(Object.values(LOGISTICS_STATUS));
const HEALTH_TYPES = Object.freeze(Object.values(HEALTH_TASK_TYPE));
const HEALTH_STATUSES = Object.freeze(Object.values(HEALTH_TASK_STATUS));
const ADOPTION_STAGES = Object.freeze(Object.values(ADOPTION_STAGE));

export function isValidLogisticsCategory(v) { return LOGISTICS_CATEGORIES.includes(v); }
export function isValidLogisticsStatus(v) { return LOGISTICS_STATUSES.includes(v); }
export function isValidHealthType(v) { return HEALTH_TYPES.includes(v); }
export function isValidHealthStatus(v) { return HEALTH_STATUSES.includes(v); }
export function isValidAdoptionStage(v) { return ADOPTION_STAGES.includes(v); }

// ─── Coerção de primitivos ──────────────────────────────────────────────

/** Trim + clamp de string. Retorna '' para valores nulos. */
export function clampStr(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

/** Número finito ≥ 0, limitado por `max`. Retorna 0 para inválidos. */
export function clampNonNegative(value, max = OPS_LIMITS.BUDGET_MAX) {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}

/** ISO 8601 válido ou null. Aceita Date, number (ms) ou string. */
export function normalizeIsoOrNull(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  const ms = d.getTime();
  return Number.isFinite(ms) ? d.toISOString() : null;
}

/** true se a string é um id não-vazio. */
export function hasId(item) {
  return Boolean(item && typeof item.id === 'string' && item.id.length > 0);
}

// ─── Normalizadores de item ─────────────────────────────────────────────

/**
 * Normaliza um item da checklist de planejamento.
 * `done_at` só é preenchido quando `done === true`.
 */
export function normalizeChecklistItem(input = {}) {
  const done = input.done === true;
  return {
    id: clampStr(input.id, 64),
    label: clampStr(input.label, OPS_LIMITS.LABEL_MAX),
    done,
    done_at: done ? (normalizeIsoOrNull(input.done_at) || new Date().toISOString()) : null,
  };
}

/** Normaliza um item de logística. */
export function normalizeLogisticsItem(input = {}) {
  return {
    id: clampStr(input.id, 64),
    category: isValidLogisticsCategory(input.category) ? input.category : LOGISTICS_CATEGORY.OTHER,
    label: clampStr(input.label, OPS_LIMITS.LABEL_MAX),
    responsible_uid: clampStr(input.responsible_uid, 128),
    responsible_name: clampStr(input.responsible_name, OPS_LIMITS.NAME_MAX),
    cost: clampNonNegative(input.cost),
    status: isValidLogisticsStatus(input.status) ? input.status : LOGISTICS_STATUS.PENDING,
    notes: clampStr(input.notes, OPS_LIMITS.NOTES_MAX),
  };
}

/** Normaliza uma tarefa do mutirão de saúde. */
export function normalizeHealthTask(input = {}) {
  return {
    id: clampStr(input.id, 64),
    pet_id: clampStr(input.pet_id, 128),
    pet_name: clampStr(input.pet_name, OPS_LIMITS.NAME_MAX),
    type: isValidHealthType(input.type) ? input.type : HEALTH_TASK_TYPE.OTHER,
    scheduled_for: normalizeIsoOrNull(input.scheduled_for),
    status: isValidHealthStatus(input.status) ? input.status : HEALTH_TASK_STATUS.PENDING,
    notes: clampStr(input.notes, OPS_LIMITS.NOTES_MAX),
  };
}

/** Normaliza uma entrada da fila de tratativas de adoção/doação. */
export function normalizeAdoptionEntry(input = {}) {
  return {
    id: clampStr(input.id, 64),
    applicant_name: clampStr(input.applicant_name, OPS_LIMITS.NAME_MAX),
    applicant_contact: clampStr(input.applicant_contact, OPS_LIMITS.CONTACT_MAX),
    applicant_uid: clampStr(input.applicant_uid, 128),
    pet_id: clampStr(input.pet_id, 128),
    pet_name: clampStr(input.pet_name, OPS_LIMITS.NAME_MAX),
    stage: isValidAdoptionStage(input.stage) ? input.stage : ADOPTION_STAGE.INTERESTED,
    notes: clampStr(input.notes, OPS_LIMITS.NOTES_MAX),
    created_at: normalizeIsoOrNull(input.created_at) || new Date().toISOString(),
  };
}

/**
 * Normaliza os campos de planejamento (exceto a checklist, tratada à parte).
 * Retorna sempre as 4 chaves para gravação determinística.
 */
export function normalizePlanning(input = {}) {
  return {
    venue_notes: clampStr(input.venue_notes, OPS_LIMITS.NOTES_MAX),
    structure_notes: clampStr(input.structure_notes, OPS_LIMITS.NOTES_MAX),
    budget_total: clampNonNegative(input.budget_total),
    budget_notes: clampStr(input.budget_notes, OPS_LIMITS.NOTES_MAX),
  };
}

// ─── Operações de lista (puras) ─────────────────────────────────────────

/**
 * Insere ou atualiza `item` na lista por `id`. Se o id já existe, substitui
 * (merge posicional); senão, anexa ao fim respeitando `max`. Nunca muta a
 * lista original. Itens sem id são ignorados (o service deve gerar o id).
 */
export function upsertById(list, item, max = Infinity) {
  const arr = Array.isArray(list) ? list.slice() : [];
  if (!hasId(item)) return arr;
  const idx = arr.findIndex((it) => it && it.id === item.id);
  if (idx >= 0) {
    arr[idx] = item;
    return arr;
  }
  if (arr.length >= max) return arr;
  arr.push(item);
  return arr;
}

/** Remove o item de `id` da lista. Nunca muta a original. */
export function removeById(list, id) {
  if (!Array.isArray(list)) return [];
  return list.filter((it) => !(it && it.id === id));
}

/** Estrutura `ops` vazia/padrão. */
export function emptyOps() {
  return {
    planning: {
      checklist: [],
      venue_notes: '',
      structure_notes: '',
      budget_total: 0,
      budget_notes: '',
    },
    logistics: [],
    health: [],
    adoption: [],
  };
}
