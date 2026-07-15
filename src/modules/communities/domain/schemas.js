/**
 * @fileoverview Domínio: schemas Zod para serviços de comunidade (TASK-333).
 *
 * Centraliza todos os schemas Zod usados pelo communityService.
 * Defense-in-depth: cada write passa por safeParse antes de tocar Firestore.
 */

import { z } from 'zod';

// ── Conteúdo (re-exportado de contentSchemas para co-localização) ─────────────
export {
  postInputSchema,
  commentInputSchema,
  threadInputSchema,
  threadMessageInputSchema,
  contentTextSchema,
  threadTitleSchema,
  attachmentSchema,
  attachmentsSchema,
  pollSchema,
  parseOrThrow,
} from './contentSchemas';

// ── Evento da comunidade ───────────────────────────────────────────────────────

/** Título do evento: 3–200 chars, obrigatório. */
const eventTitleSchema = z
  .string({ required_error: 'Informe o título do evento.' })
  .trim()
  .min(3, 'Título do evento muito curto (mínimo 3 caracteres).')
  .max(200, 'Título do evento muito longo (máximo 200 caracteres).');

/** Descrição opcional do evento. */
const eventDescriptionSchema = z
  .string()
  .trim()
  .max(4000, 'Descrição do evento muito longa (máximo 4.000 caracteres).')
  .default('');

/** Local opcional do evento. */
const eventLocationSchema = z
  .string()
  .trim()
  .max(500, 'Local do evento muito longo (máximo 500 caracteres).')
  .default('');

/**
 * Data de início opcional.
 * Aceita string ISO 8601, Date, ou null.
 * O Firestore stores como Timestamp — conversão fica a cargo do caller.
 */
const eventStartsAtSchema = z
  .union([z.string().datetime({ message: 'Data de início inválida.' }), z.date(), z.null()])
  .nullable()
  .optional()
  .default(null);

/** Schema completo para criar um CommunityEvent. */
export const communityEventInputSchema = z.object({
  title: eventTitleSchema,
  description: eventDescriptionSchema,
  location: eventLocationSchema,
  starts_at: eventStartsAtSchema,
});
