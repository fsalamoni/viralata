/**
 * @fileoverview notificationTemplates — sistema de templates com variáveis
 * (TASK-175).
 *
 * Templates têm formato:
 *   { pet_name, shelter_name, adopter_name, days_remaining, ... }
 *
 * Substituição é feita via `{{var_name}}` (Mustache-lite).
 *
 * Persistência: `notification_templates/{templateId}` em Firestore.
 * Multi-tenant via `shelter_club_id` (null = template global do admin master).
 *
 * **Segurança**:
 *  - Variáveis não encontradas são deixadas como `{{var_name}}` (visíveis)
 *  - Comprimento máximo do subject: 200 chars
 *  - Comprimento máximo do body: 5000 chars
 *  - Sem HTML (escape automático de `<` `>` `&` no body)
 */

import { z } from 'zod';

// ─── Variáveis disponíveis ─────────────────────────────────────────────

/**
 * Catálogo de variáveis que admins podem usar em templates.
 * Cada uma tem `description` (UX) e `example` (preview).
 */
export const TEMPLATE_VARIABLES = Object.freeze([
  { key: 'pet_name',      description: 'Nome do pet',                     example: 'Rex' },
  { key: 'shelter_name',  description: 'Nome do abrigo',                  example: 'Abrigo Esperança' },
  { key: 'adopter_name',  description: 'Nome do adotante',                example: 'Maria Silva' },
  { key: 'volunteer_name',description: 'Nome do voluntário',              example: 'João Santos' },
  { key: 'days_remaining',description: 'Dias restantes para o evento',   example: '3' },
  { key: 'event_title',   description: 'Título do evento',                example: 'Feira de adoção' },
  { key: 'event_date',    description: 'Data do evento (ISO)',            example: '2026-07-20' },
  { key: 'application_id',description: 'ID da application de adoção',     example: 'abc-123' },
  { key: 'shelter_city',  description: 'Cidade do abrigo',                example: 'São Paulo' },
  { key: 'pet_species',   description: 'Espécie do pet',                  example: 'Cachorro' },
  { key: 'pet_age',       description: 'Idade do pet (filhote/adulto/idoso)', example: 'Filhote' },
  { key: 'platform_name', description: 'Nome da plataforma',             example: 'Viralata' },
]);

export const TEMPLATE_VARIABLE_KEYS = Object.freeze(
  TEMPLATE_VARIABLES.map((v) => v.key),
);

// ─── Schema Zod ────────────────────────────────────────────────────────

export const notificationTemplateSchema = z.object({
  id: z.string().min(1).max(128),
  name: z.string().min(3).max(80),
  subject: z.string().min(3).max(200),
  body: z.string().min(3).max(5000),
  category: z.enum(['adoption', 'foster', 'medication', 'event', 'general']),
  shelter_club_id: z.string().nullable(), // null = global
  variables: z.array(z.string()).default([]), // quais variáveis são usadas
  is_active: z.boolean().default(true),
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

export const notificationTemplateInputSchema = notificationTemplateSchema
  .omit({ id: true, created_at: true, updated_at: true })
  .strict();

// ─── Render / Substituição ────────────────────────────────────────────

const VAR_REGEX = /\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi;

/**
 * Substitui `{{var_name}}` pelos valores. Variáveis não encontradas
 * ficam como `{{var_name}}` (visíveis para debug). Escapa HTML.
 *
 * @param {string} text — texto com `{{var}}` placeholders
 * @param {Record<string,string|number>} vars
 * @returns {string}
 */
export function renderTemplate(text, vars = {}) {
  if (!text) return '';
  return text.replace(VAR_REGEX, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return escapeHtml(String(vars[key]));
    }
    return match; // mantém {{var}} se não encontrar
  });
}

/**
 * Escapa caracteres HTML perigosos.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Extrai as variáveis USADAS em um texto (para preencher o campo
 * `variables` do template e validar disponibilidade).
 *
 * @param {string} text
 * @returns {string[]} — chaves únicas na ordem de aparecimento
 */
export function extractVariables(text) {
  if (!text) return [];
  const found = [];
  const seen = new Set();
  let m;
  VAR_REGEX.lastIndex = 0;
  while ((m = VAR_REGEX.exec(text)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      found.push(m[1]);
    }
  }
  return found;
}

/**
 * Valida que todas as variáveis usadas estão no catálogo.
 *
 * @param {string[]} used — chaves encontradas em extractVariables
 * @returns {{ valid: boolean, unknown: string[] }}
 */
export function validateVariables(used) {
  const known = new Set(TEMPLATE_VARIABLE_KEYS);
  const unknown = (used || []).filter((k) => !known.has(k));
  return { valid: unknown.length === 0, unknown };
}

/**
 * Preview: renderiza um template com valores de exemplo.
 *
 * @param {object} template — { subject, body }
 * @returns {{ subject: string, body: string }}
 */
export function previewTemplate(template) {
  const sample = TEMPLATE_VARIABLES.reduce((acc, v) => {
    acc[v.key] = v.example;
    return acc;
  }, {});
  return {
    subject: renderTemplate(template.subject || '', sample),
    body: renderTemplate(template.body || '', sample),
  };
}

// ─── Templates pré-definidos (defaults) ────────────────────────────────

/**
 * Templates default que o sistema usa quando o abrigo não tem custom.
 * Esses são os textos atuais hardcoded nos services.
 */
export const DEFAULT_TEMPLATES = Object.freeze([
  {
    name: 'Adoção: interesse recebido',
    subject: '🐾 Novo interesse em {{pet_name}}',
    body: '{{adopter_name}} demonstrou interesse em adotar {{pet_name}}. Acesse o painel para revisar.',
    category: 'adoption',
    variables: ['pet_name', 'adopter_name'],
  },
  {
    name: 'Adoção: aprovado',
    subject: '🎉 Sua adoption foi aprovada!',
    body: 'Parabéns, {{adopter_name}}! Sua application para adotar {{pet_name}} foi aprovada por {{shelter_name}}. Próximo passo: assinatura do termo.',
    category: 'adoption',
    variables: ['adopter_name', 'pet_name', 'shelter_name'],
  },
  {
    name: 'Lar temporário: lembrete 24h',
    subject: '⏰ Sua escala de voluntário é amanhã',
    body: 'Olá {{volunteer_name}}, você tem uma escala marcada para {{event_date}} no abrigo {{shelter_name}}. Confirme sua presença.',
    category: 'foster',
    variables: ['volunteer_name', 'event_date', 'shelter_name'],
  },
  {
    name: 'Medicação: dose atrasada',
    subject: '⚠️ Dose atrasada para {{pet_name}}',
    body: 'A dose de medicação de {{pet_name}} ({{pet_age}}) está atrasada. Verifique com a equipe do {{shelter_name}}.',
    category: 'medication',
    variables: ['pet_name', 'pet_age', 'shelter_name'],
  },
  {
    name: 'Evento: novo evento publicado',
    subject: '📅 {{event_title}} em {{shelter_city}}',
    body: 'O {{shelter_name}} publicou "{{event_title}}" para {{event_date}}. Confirme sua participação na plataforma {{platform_name}}.',
    category: 'event',
    variables: ['event_title', 'shelter_city', 'shelter_name', 'event_date', 'platform_name'],
  },
]);
