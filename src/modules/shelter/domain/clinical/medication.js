/**
 * @fileoverview Domínio: Medicação (Fase 9).
 *
 * Subcoleção `pets/{petId}/medications/{medId}`. Multi-tenant via
 * `shelter_club_id`. Cada prescrição tem um plano de doses (frequency +
 * times) e o sistema materializa as doses pendentes em runtime.
 *
 * Decisão arquitetural: doses são **calculadas em runtime**, não
 * pré-criadas. Isso evita o problema de "1M de docs de doses vazias"
 * que o §11.4 do roadmap resolveu para pós-adoção. A materialização
 * aqui é determinística (não precisa de CRON) — basta pegar o
 * prescription e calcular o array de doses até `now + horizon`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 9
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────

export const MEDICATION_FREQUENCIES = Object.freeze([
  'every_4h',     // 6x/dia
  'every_6h',     // 4x/dia
  'every_8h',     // 3x/dia
  'every_12h',    // 2x/dia
  'every_24h',    // 1x/dia
  'twice_daily',  // 2x/dia (8h/8h comum)
  'three_times_daily', // 3x/dia (8h/8h/8h)
  'weekly',       // 1x/semana
  'monthly',      // 1x/mês
  'as_needed',    // "se necessário" (sem doses agendadas)
  'custom',       // intervalo customizado em horas
]);

const FREQUENCY_HOURS = Object.freeze({
  every_4h: 4,
  every_6h: 6,
  every_8h: 8,
  every_12h: 12,
  every_24h: 24,
  twice_daily: 12,
  three_times_daily: 8,
  weekly: 168,
  monthly: 720,
  as_needed: null,
  custom: null,
});

export const MEDICATION_STATUS = Object.freeze([
  'active',     // em uso
  'paused',     // temporariamente parada (viagem, etc)
  'completed',  // terminou o ciclo (terminal)
  'cancelled',  // cancelada pelo abrigo (terminal)
]);

export const DOSE_STATUS = Object.freeze([
  'pending',        // ainda não chegou a hora
  'due',            // hora de administrar (janela [-15min, +1h])
  'overdue',        // passou da janela sem ser administrada
  'administered',   // foi dada
  'skipped',        // pulada intencionalmente
]);

// ─── Helpers de cálculo ─────────────────────────────────────────────────

/**
 * Retorna o intervalo em horas de uma frequência, ou null se aplicável
 * apenas "conforme necessário".
 */
export function frequencyHours(frequency, customHours) {
  if (frequency === 'custom') {
    if (customHours == null || customHours < 1 || customHours > 168) {
      throw new Error('custom_frequency_hours deve estar entre 1 e 168');
    }
    return customHours;
  }
  return FREQUENCY_HOURS[frequency] ?? null;
}

/**
 * Calcula a próxima dose após `fromDate`, baseado no intervalo e nos
 * times especificados. Retorna ISO string ou null se as_needed.
 */
export function nextDoseAt(medication, fromDate) {
  const intervalH = frequencyHours(medication.frequency, medication.custom_frequency_hours);
  if (intervalH == null) return null;

  const from = new Date(fromDate).getTime();
  const next = new Date(from + intervalH * 3600 * 1000);
  return next.toISOString();
}

/**
 * Verifica se uma dose está dentro da janela "due" (15min antes a 1h
 * depois do horário agendado).
 */
export function isDoseDue(scheduledAt, nowMs) {
  const scheduled = new Date(scheduledAt).getTime();
  const window = 15 * 60 * 1000;  // 15 min antes
  const grace = 60 * 60 * 1000;   // 1h depois
  return nowMs >= scheduled - window && nowMs <= scheduled + grace;
}

export function isDoseOverdue(scheduledAt, nowMs) {
  return nowMs > new Date(scheduledAt).getTime() + 60 * 60 * 1000;
}

// ─── Schemas ────────────────────────────────────────────────────────────

const timeOfDaySchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Formato HH:MM');

/**
 * Schema do doc de medicação.
 */
export const medicationSchema = z.object({
  pet_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),     // multi-tenant
  medication: z.string().min(1).max(200),         // "Dipirona 500mg"
  dosage: z.string().min(1).max(80).optional(),   // "1 comprimido", "0.5ml"
  start_date: z.string().datetime(),
  end_date: z.string().datetime().optional().nullable(),
  frequency: z.enum(MEDICATION_FREQUENCIES),
  custom_frequency_hours: z.number().int().min(1).max(168).optional().nullable(),
  times: z.array(timeOfDaySchema).max(20).optional(),   // ['08:00','16:00','00:00']
  duration_days: z.number().int().min(1).max(365).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  status: z.enum(MEDICATION_STATUS),
  responsible_uid: z.string().min(1).max(128),
  administered_count: z.number().int().min(0).optional().nullable(),
  skipped_count: z.number().int().min(0).optional().nullable(),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema para criar uma nova medicação. Não exige todos os campos.
 */
export const createMedicationSchema = z.object({
  medication: z.string().min(1).max(200),
  dosage: z.string().min(1).max(80).optional(),
  start_date: z.string().datetime().optional(),       // default: now
  end_date: z.string().datetime().optional().nullable(),
  frequency: z.enum(MEDICATION_FREQUENCIES),
  custom_frequency_hours: z.number().int().min(1).max(168).optional(),
  times: z.array(timeOfDaySchema).max(20).optional(),
  duration_days: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

/**
 * Schema para atualizar medicação. Não permite mudar pet_id, shelter_club_id.
 */
export const updateMedicationSchema = createMedicationSchema.partial().extend({
  status: z.enum(MEDICATION_STATUS).optional(),
}).strict();

/**
 * Schema para registrar uma dose administrada.
 */
export const recordDoseSchema = z.object({
  scheduled_at: z.string().datetime(),
  administered_at: z.string().datetime().optional(),    // default: now
  by_uid: z.string().min(1).max(128),
  by_name: z.string().max(120).optional(),
  skipped: z.boolean().default(false),
  notes: z.string().max(500).optional(),
}).strict();

// ─── Labels (pt-BR) ────────────────────────────────────────────────────

export const MEDICATION_FREQUENCY_LABELS = Object.freeze({
  every_4h: 'A cada 4h',
  every_6h: 'A cada 6h',
  every_8h: 'A cada 8h',
  every_12h: 'A cada 12h',
  every_24h: 'A cada 24h',
  twice_daily: '2x ao dia',
  three_times_daily: '3x ao dia',
  weekly: 'Semanal',
  monthly: 'Mensal',
  as_needed: 'Conforme necessário',
  custom: 'Customizado',
});

export const MEDICATION_STATUS_LABELS = Object.freeze({
  active: 'Ativa',
  paused: 'Pausada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
});

export const DOSE_STATUS_LABELS = Object.freeze({
  pending: 'Pendente',
  due: 'Hora de administrar',
  overdue: 'Atrasada',
  administered: 'Administr. ✓',
  skipped: 'Pulada',
});

/**
 * Formata dose em pt-BR.
 */
export function describeMedication(med) {
  const freq = MEDICATION_FREQUENCY_LABELS[med.frequency] || med.frequency;
  const times = med.times?.length ? ` às ${med.times.join(', ')}` : '';
  return `${med.medication}${med.dosage ? ` (${med.dosage})` : ''} — ${freq}${times}`;
}
