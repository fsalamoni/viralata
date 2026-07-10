/**
 * @fileoverview Domínio: Prontuário / Registros Médicos (Fase 8)
 *
 * Subcoleção `pets/{petId}/medical/{recordId}`. Multi-tenant via
 * `shelter_club_id`. Os registros médicos do animal ficam isolados
 * por abrigo — abrigo A não vê prontuário do abrigo B, mesmo se o
 * animal for transferido (ver seção 11.1 do roadmap).
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 8 + § 11.1
 */

import { z } from 'zod';

// ─── Tipos de registro ────────────────────────────────────────────────

export const MEDICAL_RECORD_TYPES = Object.freeze([
  'consultation',        // Consulta clínica geral
  'vaccine',             // Vacina (também temos o tipo na timeline; aqui é versão clínica)
  'deworming',           // Vermifugação
  'exam',                // Exame (sangue, imagem, etc)
  'surgery',             // Cirurgia
  'hospitalization',     // Internação
  'dental',              // Limpeza dentária
  'grooming',            // Banho/tosa (veterinário)
  'follow_up',           // Retorno / acompanhamento
  'prescription',        // Prescrição médica
  'discharge',           // Alta
  'death',               // Óbito (legado — preferir Fase 1 timeline)
  'other',
]);

// ─── Schemas ────────────────────────────────────────────────────────────

const attachmentSchema = z.object({
  url: z.string().url(),
  type: z.enum(['image', 'pdf', 'video', 'audio', 'other']).default('other'),
  filename: z.string().max(200).optional(),
  size_bytes: z.number().int().nonnegative().optional(),
}).strict();

const examResultSchema = z.object({
  name: z.string().min(1).max(120),                    // ex: "Hemograma"
  value: z.string().max(200).optional(),              // ex: "12.5"
  unit: z.string().max(20).optional(),                // ex: "g/dL"
  reference_range: z.string().max(100).optional(),     // ex: "12-18 g/dL"
  is_abnormal: z.boolean().optional(),
}).strict();

/**
 * Schema do registro médico.
 */
export const medicalRecordSchema = z.object({
  pet_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),         // multi-tenant
  type: z.enum(MEDICAL_RECORD_TYPES),
  exam_date: z.string().datetime(),
  vet_uid: z.string().min(1).max(128),                  // quem registrou
  vet_name: z.string().max(120).optional(),
  vet_crmv: z.string().max(40).optional(),             // CRMV do veterinário
  // Conteúdo clínico
  chief_complaint: z.string().max(500).optional(),     // queixa principal
  diagnosis: z.string().max(2000).optional(),
  treatment: z.string().max(2000).optional(),
  prescription: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  // Resultados
  exam_results: z.array(examResultSchema).max(100).optional(),
  // Anexos
  attachments: z.array(attachmentSchema).max(20).optional(),
  // Custos
  cost_cents: z.number().int().nonnegative().optional(),
  paid_by: z.enum(['shelter', 'foster', 'adopter', 'donation', 'other']).optional(),
  // Próximo retorno
  next_visit_date: z.string().datetime().optional(),
  next_visit_notes: z.string().max(500).optional(),
  // Auditoria
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema para criar um novo registro. Não exige todos os campos
 * (consultas simples têm só queixa + diagnóstico).
 */
export const createMedicalRecordSchema = z.object({
  type: z.enum(MEDICAL_RECORD_TYPES),
  exam_date: z.string().datetime().optional(),         // default: now
  vet_name: z.string().max(120).optional(),
  vet_crmv: z.string().max(40).optional(),
  chief_complaint: z.string().max(500).optional(),
  diagnosis: z.string().max(2000).optional(),
  treatment: z.string().max(2000).optional(),
  prescription: z.string().max(2000).optional(),
  notes: z.string().max(5000).optional(),
  exam_results: z.array(examResultSchema).max(100).optional(),
  attachments: z.array(attachmentSchema).max(20).optional(),
  cost_cents: z.number().int().nonnegative().optional(),
  paid_by: z.enum(['shelter', 'foster', 'adopter', 'donation', 'other']).optional(),
  next_visit_date: z.string().datetime().optional(),
  next_visit_notes: z.string().max(500).optional(),
}).strict();

/**
 * Schema para atualizar. Não permite mudar type, pet_id, shelter_club_id.
 */
export const updateMedicalRecordSchema = createMedicalRecordSchema.partial();

// ─── Helpers ────────────────────────────────────────────────────────────

export const MEDICAL_RECORD_LABELS = Object.freeze({
  consultation: 'Consulta',
  vaccine: 'Vacina',
  deworming: 'Vermifugação',
  exam: 'Exame',
  surgery: 'Cirurgia',
  hospitalization: 'Internação',
  dental: 'Limpeza dentária',
  grooming: 'Banho/tosa',
  follow_up: 'Retorno',
  prescription: 'Prescrição',
  discharge: 'Alta',
  death: 'Óbito',
  other: 'Outro',
});

/**
 * Indica se o registro precisa de retorno agendado.
 */
export function needsFollowUp(record) {
  return Boolean(record?.next_visit_date);
}

/**
 * Formata custo em reais.
 */
export function formatCost(costCents) {
  if (costCents == null) return '—';
  return (costCents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}
