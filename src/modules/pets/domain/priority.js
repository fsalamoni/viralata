/**
 * @fileoverview Cálculo de prioridade (Super Like) — Viralata
 * Pets cadastrados há mais de 90 dias recebem bônus crescente.
 */

const DAYS_THRESHOLD_1 = 90;
const DAYS_THRESHOLD_2 = 180;
const DAYS_THRESHOLD_3 = 365;

/**
 * Calcula o priority_score de um pet com base no tempo de cadastro.
 * @param {{ created_at?: { seconds: number } }} pet
 * @returns {number} 0 | 1 | 2 | 3
 */
export function calculatePriorityScore(pet) {
  if (!pet?.created_at?.seconds) return 0;
  const now = Date.now() / 1000;
  const ageSeconds = now - pet.created_at.seconds;
  const ageDays = ageSeconds / 86400;
  if (ageDays >= DAYS_THRESHOLD_3) return 3;
  if (ageDays >= DAYS_THRESHOLD_2) return 2;
  if (ageDays >= DAYS_THRESHOLD_1) return 1;
  return 0;
}

/**
 * Retorna o label do nível de prioridade.
 * @param {number} score
 * @returns {string}
 */
export function getPriorityLabel(score) {
  const labels = { 0: '', 1: 'Esperando há 3 meses', 2: 'Super Like — 6 meses', 3: 'Urgente — 1 ano' };
  return labels[score] ?? '';
}
