/**
 * @fileoverview Helpers puros para interviewService (TASK-290).
 */

/**
 * Gera interviewId determinístico a partir de applicationId + applicantUid.
 * Idempotente — re-tentar não duplica.
 */
export function buildInterviewDocId({ applicationId, applicantUid }) {
  if (!applicationId || !applicantUid) {
    throw new Error('buildInterviewDocId: applicationId + applicantUid required');
  }
  return `${applicationId.slice(0, 32)}_${applicantUid.slice(0, 12)}`;
}

/**
 * Transição válida de status. Retorna boolean.
 */
export function isValidTransition(from, to) {
  // Lazy require para evitar circular (o service importa de schemas)
  const transitions = {
    proposed: ['scheduled', 'cancelled'],
    scheduled: ['completed', 'cancelled'],
    completed: ['evaluated'],
    evaluated: [],
    cancelled: [],
  };
  return (transitions[from] || []).includes(to);
}

/**
 * Calcula progresso de checklist (0-100).
 */
export function checklistProgress(checklist = []) {
  if (!Array.isArray(checklist) || checklist.length === 0) return 0;
  const done = checklist.filter((c) => c && c.done).length;
  return Math.round((done / checklist.length) * 100);
}

/**
 * Default checklist sugerido para entrevista de adoção.
 */
export function defaultChecklist() {
  return [
    { topic: 'Confirmação de identidade e residência', done: false },
    { topic: 'Composição familiar e concordância', done: false },
    { topic: 'Experiência prévia com pets', done: false },
    { topic: 'Rotina diária (horários, ausências)', done: false },
    { topic: 'Espaço disponível e segurança', done: false },
    { topic: 'Plano veterinário e orçamento', done: false },
    { topic: 'Plano de viagem e contingência', done: false },
    { topic: 'Compromisso de castração/vermifugação', done: false },
  ];
}
