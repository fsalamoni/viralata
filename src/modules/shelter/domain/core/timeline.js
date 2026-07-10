/**
 * @fileoverview Domínio: Timeline do Animal (Fase 2)
 *
 * Define os eventos de vida do animal que vão popular a subcoleção
 * `pets/{petId}/timeline/{eventId}`. É a primeira subcoleção
 * tenant-specific com `club_id` — aqui começa o enforcement real de
 * multi-tenant (cada abrigo só vê sua própria timeline).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 2 + § 11.1 (multi-tenant)
 */

import { z } from 'zod';

// ─── Tipos de evento ────────────────────────────────────────────────────

/**
 * Categorias oficiais de eventos. Cada uma tem semântica diferente e gera
 * UI/labels distintos no timeline (ver `TIMELINE_EVENT_LABELS`).
 */
export const TIMELINE_EVENT_TYPES = Object.freeze([
  'intake',                  // Entrada no abrigo (automático, derivado do Cadastro Único)
  'weight_measurement',      // Pesagem (kg)
  'vaccine',                 // Vacina aplicada
  'deworming',               // Vermifugação
  'vet_visit',               // Consulta veterinária
  'medication',              // Medicação administrada
  'status_change',           // Mudança de status (available, adopted, fostered…)
  'transfer',                // Transferência entre abrigos
  'microchip_registered',    // Microchip implantado/registrado
  'photo_added',             // Foto adicionada à galeria
  'note',                    // Nota livre (cuidador)
  'asilomar_assessment',     // Reavaliação Asilomar
  'deceased',                // Óbito
  'returned',                // Devolvido pelo adotante
]);

// ─── Schemas por tipo (payload varia) ──────────────────────────────────

const vaccinePayloadSchema = z.object({
  vaccine_name: z.string().min(1).max(120),     // V10, antirrábica, giárdia
  manufacturer: z.string().max(80).optional(),
  batch_number: z.string().max(40).optional(),
  next_dose_date: z.string().datetime().optional(),
  administered_by: z.string().max(120).optional(), // Nome do veterinário
}).strict();

const dewormingPayloadSchema = z.object({
  product_name: z.string().min(1).max(120),
  dose_mg: z.number().positive().optional(),
  next_dose_date: z.string().datetime().optional(),
  administered_by: z.string().max(120).optional(),
}).strict();

const weightPayloadSchema = z.object({
  weight_kg: z.number().positive().max(500),     // cão mais pesado do mundo: ~110kg
  measured_by: z.string().max(120).optional(),
  notes: z.string().max(280).optional(),
}).strict();

const vetVisitPayloadSchema = z.object({
  clinic_name: z.string().max(120).optional(),
  reason: z.string().min(1).max(280),
  diagnosis: z.string().max(1000).optional(),
  treatment: z.string().max(1000).optional(),
  attended_by: z.string().max(120).optional(),
  cost_cents: z.number().int().nonnegative().optional(),
}).strict();

const statusChangePayloadSchema = z.object({
  from_status: z.string().max(40),
  to_status: z.string().max(40),
  reason: z.string().max(500).optional(),
}).strict();

const transferPayloadSchema = z.object({
  from_club_id: z.string().max(128),
  to_club_id: z.string().max(128),
  to_club_name: z.string().max(120).optional(),
  reason: z.string().max(500).optional(),
  documentation_url: z.string().url().optional(),
}).strict();

const microchipPayloadSchema = z.object({
  microchip_id: z.string().regex(/^[0-9]{15}$/, 'Microchip deve ter 15 dígitos'),
  implant_location: z.string().max(80).optional(),  // 'subcutânea, dorso cervical'
  implanted_by: z.string().max(120).optional(),
}).strict();

const notePayloadSchema = z.object({
  text: z.string().min(1).max(2000),
  visibility: z.enum(['public', 'internal']).default('internal'),
  // 'public' = visível na página do pet (timeline pública)
  // 'internal' = só abrigo (notas internas de manejo)
}).strict();

const asilomarPayloadSchema = z.object({
  from_status: z.enum([
    'healthy', 'treatable_rehabilitatable', 'treatable_manageable',
    'unhealthy_untreatable', 'undetermined',
  ]).optional(),
  to_status: z.enum([
    'healthy', 'treatable_rehabilitatable', 'treatable_manageable',
    'unhealthy_untreatable', 'undetermined',
  ]),
  reason: z.string().max(500).optional(),
}).strict();

const deceasedPayloadSchema = z.object({
  cause: z.string().min(1).max(280),
  necropsy: z.boolean().default(false),
  reported_by: z.string().max(120).optional(),
}).strict();

const returnedPayloadSchema = z.object({
  return_reason: z.string().min(1).max(500),
  custody_returned_at: z.string().datetime(),
  previous_adopter_uid: z.string().max(128).optional(),
}).strict();

const intakePayloadSchema = z.object({
  intake_type: z.enum(['rescue', 'born', 'transfer', 'surrender', 'purchase']),
  source: z.string().max(280).optional(),
}).strict();

const photoAddedPayloadSchema = z.object({
  photo_url: z.string().url(),
  caption: z.string().max(280).optional(),
}).strict();

const medicationPayloadSchema = z.object({
  medication_name: z.string().min(1).max(120),
  dose: z.string().max(80).optional(),
  administered_at: z.string().datetime(),
  notes: z.string().max(500).optional(),
}).strict();

// Discriminated union: payload depende do tipo
const eventPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('intake'), data: intakePayloadSchema }),
  z.object({ type: z.literal('weight_measurement'), data: weightPayloadSchema }),
  z.object({ type: z.literal('vaccine'), data: vaccinePayloadSchema }),
  z.object({ type: z.literal('deworming'), data: dewormingPayloadSchema }),
  z.object({ type: z.literal('vet_visit'), data: vetVisitPayloadSchema }),
  z.object({ type: z.literal('medication'), data: medicationPayloadSchema }),
  z.object({ type: z.literal('status_change'), data: statusChangePayloadSchema }),
  z.object({ type: z.literal('transfer'), data: transferPayloadSchema }),
  z.object({ type: z.literal('microchip_registered'), data: microchipPayloadSchema }),
  z.object({ type: z.literal('photo_added'), data: photoAddedPayloadSchema }),
  z.object({ type: z.literal('note'), data: notePayloadSchema }),
  z.object({ type: z.literal('asilomar_assessment'), data: asilomarPayloadSchema }),
  z.object({ type: z.literal('deceased'), data: deceasedPayloadSchema }),
  z.object({ type: z.literal('returned'), data: returnedPayloadSchema }),
]);

// Mapa direto: type → payload schema. Mais simples de usar que a union.
const PAYLOAD_SCHEMAS = Object.freeze({
  intake: intakePayloadSchema,
  weight_measurement: weightPayloadSchema,
  vaccine: vaccinePayloadSchema,
  deworming: dewormingPayloadSchema,
  vet_visit: vetVisitPayloadSchema,
  medication: medicationPayloadSchema,
  status_change: statusChangePayloadSchema,
  transfer: transferPayloadSchema,
  microchip_registered: microchipPayloadSchema,
  photo_added: photoAddedPayloadSchema,
  note: notePayloadSchema,
  asilomar_assessment: asilomarPayloadSchema,
  deceased: deceasedPayloadSchema,
  returned: returnedPayloadSchema,
});

// ─── Schema principal do evento ────────────────────────────────────────

/**
 * Schema completo do evento. `pet_id` e `event_date` são obrigatórios.
 * `data` (payload) é discriminated union — depende do `type`.
 *
 * Multi-tenant: `shelter_club_id` é o clube-dono do evento. Sem ele,
 * o Firestore rule rejeita.
 */
export const timelineEventSchema = z.object({
  pet_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128), // obrigatório
  type: z.enum(TIMELINE_EVENT_TYPES),
  event_date: z.string().datetime(),            // ISO 8601
  recorded_by_uid: z.string().min(1).max(128),
  recorded_by_name: z.string().max(120).optional(),
}).strict();

/**
 * Versão "create" — campos gerados pelo sistema omitidos.
 */
export const timelineEventCreateSchema = z.object({
  type: z.enum(TIMELINE_EVENT_TYPES),
  event_date: z.string().datetime().optional(),  // default: now()
  data: z.unknown(),                              // validado por tipo
  recorded_by_name: z.string().max(120).optional(),
}).strict();

/**
 * Versão "update" — só data e payload editáveis. type, pet_id, recorded_by_uid
 * e shelter_club_id são imutáveis (impede fraude na timeline).
 */
export const timelineEventUpdateSchema = z.object({
  event_date: z.string().datetime().optional(),
  data: z.unknown().optional(),
}).strict();

// ─── Labels pt-BR (UI) ──────────────────────────────────────────────────

export const TIMELINE_EVENT_LABELS = Object.freeze({
  intake: 'Entrada no abrigo',
  weight_measurement: 'Pesagem',
  vaccine: 'Vacina',
  deworming: 'Vermifugação',
  vet_visit: 'Consulta veterinária',
  medication: 'Medicação',
  status_change: 'Mudança de status',
  transfer: 'Transferência entre abrigos',
  microchip_registered: 'Microchip registrado',
  photo_added: 'Foto adicionada',
  note: 'Anotação',
  asilomar_assessment: 'Avaliação Asilomar',
  deceased: 'Óbito',
  returned: 'Devolvido pelo adotante',
});

export const TIMELINE_EVENT_ICONS = Object.freeze({
  intake: '🏠',
  weight_measurement: '⚖️',
  vaccine: '💉',
  deworming: '💊',
  vet_visit: '🩺',
  medication: '💊',
  status_change: '🔄',
  transfer: '↔️',
  microchip_registered: '🔖',
  photo_added: '📸',
  note: '📝',
  asilomar_assessment: '🏥',
  deceased: '⚰️',
  returned: '↩️',
});

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Valida o payload específico de um tipo. Lança ZodError se inválido.
 * Retorna o payload validado (com defaults aplicados).
 */
export function validateTimelinePayload(type, data) {
  if (!TIMELINE_EVENT_TYPES.includes(type)) {
    throw new Error(`Tipo de evento inválido: ${type}`);
  }
  const schema = PAYLOAD_SCHEMAS[type];
  if (!schema) {
    throw new Error(`Schema não encontrado para tipo: ${type}`);
  }
  return schema.parse(data);
}
