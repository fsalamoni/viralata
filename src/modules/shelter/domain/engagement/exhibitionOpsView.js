/**
 * Derivações (puras) das Operações de Vitrine V1 (ROADMAP · Fase 5 ·
 * SHELTER_EXHIBITION_OPS_V1).
 *
 * Extrai as listas do campo `ops` de um doc de vitrine e calcula os resumos
 * usados na UI do gerenciador integral de evento (progresso do planejamento,
 * custo total da logística, contagem por status do mutirão e funil de
 * adoção). Tolera vitrines legadas (sem `ops`) devolvendo estruturas vazias —
 * garante que, com a flag OFF ou em docs antigos, nada quebra.
 */

import {
  ADOPTION_STAGE,
  ADOPTION_STAGE_ORDER,
  HEALTH_TASK_STATUS,
  LOGISTICS_STATUS,
  emptyOps,
} from './exhibitionOps.js';

/** Retorna `ops` normalizado (com as chaves esperadas) para um doc de vitrine. */
export function getOps(exhibition) {
  const base = emptyOps();
  const ops = exhibition && typeof exhibition.ops === 'object' && exhibition.ops ? exhibition.ops : {};
  const planning = ops.planning && typeof ops.planning === 'object' ? ops.planning : {};
  return {
    planning: {
      checklist: Array.isArray(planning.checklist) ? planning.checklist : [],
      venue_notes: planning.venue_notes || '',
      structure_notes: planning.structure_notes || '',
      budget_total: typeof planning.budget_total === 'number' ? planning.budget_total : 0,
      budget_notes: planning.budget_notes || '',
    },
    logistics: Array.isArray(ops.logistics) ? ops.logistics : base.logistics,
    health: Array.isArray(ops.health) ? ops.health : base.health,
    adoption: Array.isArray(ops.adoption) ? ops.adoption : base.adoption,
  };
}

/** Lista da checklist de planejamento. */
export function planningChecklist(exhibition) {
  return getOps(exhibition).planning.checklist;
}

/** Progresso da checklist: { total, done, pct } (pct 0..100, inteiro). */
export function checklistProgress(exhibition) {
  const list = planningChecklist(exhibition);
  const total = list.length;
  const done = list.filter((c) => c && c.done === true).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { total, done, pct };
}

/** Itens de logística. */
export function logisticsItems(exhibition) {
  return getOps(exhibition).logistics;
}

/** Custo total planejado da logística (soma dos `cost`). */
export function logisticsCostTotal(exhibition) {
  return logisticsItems(exhibition).reduce((sum, it) => {
    const c = it && typeof it.cost === 'number' ? it.cost : 0;
    return sum + (c > 0 ? c : 0);
  }, 0);
}

/** Contagem de logística por status. */
export function logisticsStatusCounts(exhibition) {
  const counts = { [LOGISTICS_STATUS.PENDING]: 0, [LOGISTICS_STATUS.ARRANGED]: 0, [LOGISTICS_STATUS.DONE]: 0 };
  for (const it of logisticsItems(exhibition)) {
    if (it && counts[it.status] != null) counts[it.status] += 1;
  }
  return counts;
}

/** Tarefas do mutirão de saúde. */
export function healthTasks(exhibition) {
  return getOps(exhibition).health;
}

/** Contagem do mutirão por status. */
export function healthStatusCounts(exhibition) {
  const counts = {
    [HEALTH_TASK_STATUS.PENDING]: 0,
    [HEALTH_TASK_STATUS.SCHEDULED]: 0,
    [HEALTH_TASK_STATUS.DONE]: 0,
    [HEALTH_TASK_STATUS.CANCELLED]: 0,
  };
  for (const t of healthTasks(exhibition)) {
    if (t && counts[t.status] != null) counts[t.status] += 1;
  }
  return counts;
}

/** Entradas da fila de tratativas de adoção/doação. */
export function adoptionEntries(exhibition) {
  return getOps(exhibition).adoption;
}

/** Contagem da fila de adoção por etapa (todas as etapas presentes). */
export function adoptionStageCounts(exhibition) {
  const counts = {};
  for (const stage of ADOPTION_STAGE_ORDER) counts[stage] = 0;
  for (const e of adoptionEntries(exhibition)) {
    if (e && counts[e.stage] != null) counts[e.stage] += 1;
  }
  return counts;
}

/**
 * Ordena a fila de adoção pela ordem canônica das etapas e, dentro da etapa,
 * pelo `created_at` (mais antigo primeiro). Não muta o array original.
 */
export function sortAdoptionEntries(exhibition) {
  const rank = new Map(ADOPTION_STAGE_ORDER.map((s, i) => [s, i]));
  return adoptionEntries(exhibition).slice().sort((a, b) => {
    const ra = rank.has(a?.stage) ? rank.get(a.stage) : ADOPTION_STAGE_ORDER.length;
    const rb = rank.has(b?.stage) ? rank.get(b.stage) : ADOPTION_STAGE_ORDER.length;
    if (ra !== rb) return ra - rb;
    return String(a?.created_at || '').localeCompare(String(b?.created_at || ''));
  });
}

/**
 * Resumo geral das operações do evento (para o cabeçalho/analytics).
 * Tudo derivado; seguro para vitrines legadas (sem `ops`).
 */
export function computeExhibitionOpsSummary(exhibition) {
  const checklist = checklistProgress(exhibition);
  const health = healthStatusCounts(exhibition);
  const adoption = adoptionStageCounts(exhibition);
  const logistics = logisticsItems(exhibition);
  return {
    checklist,
    logistics: {
      count: logistics.length,
      cost_total: logisticsCostTotal(exhibition),
      status: logisticsStatusCounts(exhibition),
    },
    health: {
      count: healthTasks(exhibition).length,
      status: health,
      done: health[HEALTH_TASK_STATUS.DONE],
    },
    adoption: {
      count: adoptionEntries(exhibition).length,
      status: adoption,
      completed: adoption[ADOPTION_STAGE.COMPLETED],
      active: adoption[ADOPTION_STAGE.INTERESTED]
        + adoption[ADOPTION_STAGE.MEETING]
        + adoption[ADOPTION_STAGE.NEGOTIATING]
        + adoption[ADOPTION_STAGE.APPROVED],
    },
  };
}
