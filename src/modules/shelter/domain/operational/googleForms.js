/**
 * @fileoverview Domínio: Google Forms webhook (Fase 5)
 *
 * Schema para o webhook que recebe respostas do Google Forms e converte
 * em applications. O abrigo configura um Google Form para captação
 * externa (visitante anônimo do site, sem login), e o webhook do Forms
 * envia pra cá.
 *
 * Config: `clubs/{clubId}/integrations/google_forms` armazena a config
 * (form_id, field_map, enabled, secret_token).
 *
 * Aplicação: webhook handler em Cloud Function valida e cria
 * `adoption_workflow/{appId}` com `source='google_forms'`.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 5 + § 11.3
 */

import { z } from 'zod';

// ─── Schema da config por abrigo ────────────────────────────────────────

/**
 * Mapeamento campo-do-Forms → campo-do-applicant_form. Cada abrigo
 * configura o seu, conforme os campos do Form dele.
 */
const fieldMapSchema = z.object({
  full_name: z.string().min(1),                  // "Nome completo"
  email: z.string().min(1).optional(),            // "E-mail"
  phone: z.string().min(1).optional(),            // "Telefone"
  reason_to_adopt: z.string().min(1),             // "Por que quer adotar?"
  has_yard: z.string().min(1).optional(),         // "Tem quintal?"
  household_size: z.string().min(1).optional(),   // "Quantas pessoas na casa"
  has_children: z.string().min(1).optional(),
  pet_id: z.string().min(1),                      // "Qual pet?" (hidden field, ID)
}).strict();

/**
 * Config global por abrigo. Habilita/desabilita a integração e define
 * o secret token que o webhook do Forms envia.
 */
export const googleFormsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  form_id: z.string().max(200).optional(),        // ID do Google Form
  form_url: z.string().url().optional(),           // URL pública
  field_map: fieldMapSchema,
  secret_token: z.string().min(16).max(128),      // token HMAC compartilhado com o Forms
  notify_on_new: z.boolean().default(true),        // notifica admins quando chega
  notify_email: z.string().email().optional(),
  auto_create_user: z.boolean().default(false),    // criar user automaticamente (se email não existir)
  last_received_at: z.string().datetime().optional(),
  total_received: z.number().int().nonnegative().default(0),
}).strict();

/**
 * Schema de update — secret_token e total_received NÃO são alteráveis
 * via update normal.
 */
export const updateGoogleFormsConfigSchema = googleFormsConfigSchema
  .omit({ secret_token: true, total_received: true })
  .partial();

// ─── Schema do payload do webhook ──────────────────────────────────────

/**
 * Payload que o Google Apps Script envia para nossa Cloud Function
 * quando uma resposta de Form é submetida. Formato:
 * {
 *   form_id: string,
 *   response_id: string,         // ID único da resposta no Forms
 *   timestamp: ISO 8601,
 *   responses: { [fieldName]: any },
 *   secret: string,              // HMAC ou shared secret
 * }
 */
export const formsWebhookPayloadSchema = z.object({
  form_id: z.string().min(1).max(200),
  response_id: z.string().min(1).max(200),
  timestamp: z.string().datetime(),
  responses: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).refine(
    (r) => Object.keys(r).length > 0,
    'responses não pode ser vazio',
  ),
  secret: z.string().min(16).max(128),
}).strict();

/**
 * Schema de "processamento" — após o webhook ser validado, convertemos
 * para applicant_form normal. Garante que TODOS os campos requeridos
 * estão presentes.
 */
export const processFormsResponseSchema = z.object({
  pet_id: z.string().min(1),
  responses: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])),
  field_map: fieldMapSchema,
}).strict();
