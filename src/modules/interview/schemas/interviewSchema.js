/**
 * @fileoverview Schema Zod para interviews (TASK-290).
 *
 * Coleção: `clubs/{clubId}/interviews/{interviewId}`
 *
 * Status flow:
 *   proposed → scheduled → completed → evaluated
 *                     ↘ cancelled
 *
 * Status também é refletido na application (VALID_TRANSITIONS já tem
 * `interview_scheduled` e `interview_done` — esta materialização
 * popula o documento interview).
 */
import { z } from 'zod';

/** Status possíveis. */
export const INTERVIEW_STATUS = Object.freeze({
  PROPOSED: 'proposed',
  SCHEDULED: 'scheduled',
  COMPLETED: 'completed',
  EVALUATED: 'evaluated',
  CANCELLED: 'cancelled',
});

/** Modos de entrevista suportados. */
export const INTERVIEW_MODE = Object.freeze({
  IN_PERSON: 'in_person',
  VIDEO: 'video',
  PHONE: 'phone',
});

const iso8601 = z.string().datetime({ offset: true });

/** Item de checklist — tópico + flag de concluído. */
const checklistItemSchema = z.object({
  topic: z.string().min(1).max(200),
  done: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
});

const baseInterview = z.object({
  application_id: z.string().min(1).max(200),
  applicant_uid: z.string().min(1).max(200),
  applicant_name: z.string().min(1).max(200),
  shelter_club_id: z.string().min(1).max(200),
  status: z.enum(Object.values(INTERVIEW_STATUS)),
  mode: z.enum(Object.values(INTERVIEW_MODE)),
  scheduled_at: iso8601.nullable().optional(),
  checklist: z.array(checklistItemSchema).max(50).default([]),
  notes: z.string().max(5000).optional().nullable(),
  created_at: iso8601,
  updated_at: iso8601,
});

/** Schema do create (proposto). */
export const createInterviewSchema = baseInterview.omit({
  scheduled_at: true,
  notes: true,
}).extend({
  status: z.literal(INTERVIEW_STATUS.PROPOSED),
}).strict();

/** Schema do schedule (proposto → scheduled). */
export const scheduleInterviewSchema = z.object({
  scheduled_at: iso8601,
  mode: z.enum(Object.values(INTERVIEW_MODE)),
  status: z.literal(INTERVIEW_STATUS.SCHEDULED),
  updated_at: iso8601,
}).strict();

/** Schema do complete (scheduled → completed). */
export const completeInterviewSchema = z.object({
  checklist: z.array(checklistItemSchema).max(50),
  notes: z.string().max(5000).optional().nullable(),
  status: z.literal(INTERVIEW_STATUS.COMPLETED),
  completed_at: iso8601,
  completed_by_uid: z.string().min(1).max(200),
  updated_at: iso8601,
}).strict();

/** Schema do evaluate (completed → evaluated). */
export const evaluateInterviewSchema = z.object({
  evaluation_stars: z.number().int().min(1).max(5),
  evaluation_notes: z.string().max(2000).optional().nullable(),
  status: z.literal(INTERVIEW_STATUS.EVALUATED),
  updated_at: iso8601,
}).strict();

/** Schema do cancel. */
export const cancelInterviewSchema = z.object({
  status: z.literal(INTERVIEW_STATUS.CANCELLED),
  cancel_reason: z.string().min(1).max(500),
  updated_at: iso8601,
}).strict();

/** Helper para parse com erro. */
export function parseInterviewOrThrow(data) {
  const result = createInterviewSchema.safeParse(data);
  if (!result.success) {
    const err = new Error('Interview validation failed');
    err.code = 'interview/validation';
    err.issues = result.error.issues;
    throw err;
  }
  return result.data;
}

/** Transições válidas (mirror do adoption.js VALID_TRANSITIONS). */
export const VALID_TRANSITIONS = Object.freeze({
  proposed: ['scheduled', 'cancelled'],
  scheduled: ['completed', 'cancelled'],
  completed: ['evaluated'],
  evaluated: [],
  cancelled: [],
});
