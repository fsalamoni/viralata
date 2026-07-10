/**
 * @fileoverview Domínio: Perfil Completo do Adotante (Fase 4)
 *
 * O `applicantFormSchema` da Fase 3 é só o "mínimo viável" para iniciar
 * a application. Esta fase expande para um questionário completo que o
 * adotante preenche uma vez e é reaproveitado em todas as applications
 * futuras.
 *
 * **Subcoleção global** (NÃO multi-tenant): `users/{uid}/adopter_profile`.
 * O perfil pertence ao adotante, não ao abrigo. Cada abrigo pode ver
 * (com consentimento) o perfil completo nas applications.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 4
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────

export const LIVING_ARRANGEMENTS = Object.freeze([
  'house_owned',
  'house_rented',
  'apartment_owned',
  'apartment_rented',
  'rural_property',
  'other',
]);

export const PET_EXPERIENCE_LEVELS = Object.freeze([
  'none',           // Nunca teve pet
  'beginner',       // Teve 1-2 pets por curto período
  'intermediate',   // Teve vários pets ao longo da vida
  'experienced',    // Atualmente tem pets, conhece manejo
  'professional',   // Trabalha/Trabalhou com animais (veterinário, groomer, etc)
]);

export const HOME_TYPES = Object.freeze([
  'house',
  'apartment',
  'rural',
  'shared',
  'other',
]);

export const ADOPTER_CONSENT_TYPES = Object.freeze([
  'home_visit',           // Permite visita prévia do abrigo
  'post_adoption_followup', // Aceita follow-up pós-adoção
  'data_sharing',         // Concorda com compartilhamento de dados com o abrigo
  'photo_sharing',        // Permite que o abrigo use fotos do pet adotado
  'newsletter',           // Aceita receber comunicações do abrigo
  'research',             // Concorda em participar de pesquisa (anonimizado)
]);

// ─── Helpers reutilizáveis ─────────────────────────────────────────────

const brazilianStateSchema = z.string().length(2).regex(/^[A-Z]{2}$/, 'UF deve ter 2 letras maiúsculas');
const brazilianPhoneSchema = z.string().regex(/^\+?55?\s?\(?(\d{2})\)?\s?9?\d{4}-?\d{4}$/, 'Telefone inválido');
const cepSchema = z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido');

// ─── Schema principal do perfil ────────────────────────────────────────

/**
 * Perfil COMPLETO do adotante. Tudo opcional exceto `full_name` e `user_uid`.
 * Adotantes preenchem progressivamente; o abrigo pode requerer
 * campos específicos para validar a application.
 */
export const adopterProfileSchema = z.object({
  // Identidade
  user_uid: z.string().min(1).max(128),                  // dono do perfil
  full_name: z.string().min(2).max(120),
  cpf: z.string().regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, 'CPF inválido').optional(),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve ser YYYY-MM-DD').optional(),
  phone: brazilianPhoneSchema.optional(),
  email: z.string().email().optional(),

  // Endereço
  address: z.object({
    cep: cepSchema.optional(),
    street: z.string().max(200).optional(),
    number: z.string().max(20).optional(),
    complement: z.string().max(100).optional(),
    neighborhood: z.string().max(120).optional(),
    city: z.string().max(120).optional(),
    state: brazilianStateSchema.optional(),
  }).strict().optional(),

  // Composição familiar
  household_size: z.number().int().min(1).max(50).optional(),
  household_adults: z.number().int().min(0).max(50).optional(),
  household_children: z.number().int().min(0).max(50).optional(),
  children_ages: z.array(z.number().int().min(0).max(18)).max(20).optional(),

  // Sobre a casa
  home_type: z.enum(HOME_TYPES).optional(),
  has_yard: z.boolean().optional(),
  yard_size_m2: z.number().int().min(0).max(100000).optional(),
  has_fence: z.boolean().optional(),
  living_arrangement: z.enum(LIVING_ARRANGEMENTS).optional(),
  landlord_allows_pets: z.boolean().optional(),
  household_all_agree: z.boolean().optional(),            // todos na casa concordam

  // Experiência com pets
  pet_experience_level: z.enum(PET_EXPERIENCE_LEVELS).optional(),
  years_of_experience: z.number().int().min(0).max(80).optional(),
  current_pets: z.array(z.object({
    species: z.enum(['dog', 'cat', 'bird', 'other']),
    name: z.string().max(80),
    age_years: z.number().int().min(0).max(50).optional(),
    castrated: z.boolean().optional(),
    vaccinated: z.boolean().optional(),
  }).strict()).max(20).optional(),
  had_pets_before: z.boolean().optional(),
  previous_pets_deceased_or_given: z.string().max(1000).optional(),

  // Recursos para o pet
  monthly_income_range: z.enum(['lt_2k', '2k_5k', '5k_10k', '10k_20k', 'gt_20k', 'prefer_not_say']).optional(),
  willing_to_spend_vet: z.boolean().optional(),
  has_vet_reference: z.boolean().optional(),
  vet_name: z.string().max(120).optional(),
  vet_phone: brazilianPhoneSchema.optional(),

  // Sobre a adoção
  adoption_reason: z.string().min(10).max(2000).optional(),
  pet_preferences: z.object({
    species: z.array(z.enum(['dog', 'cat'])).max(2).optional(),
    size: z.array(z.enum(['small', 'medium', 'large', 'extra_large'])).max(4).optional(),
    age_range: z.enum(['puppy', 'young', 'adult', 'senior', 'any']).optional(),
    sex: z.enum(['male', 'female', 'any']).optional(),
    special_needs_ok: z.boolean().optional(),
  }).strict().optional(),

  // Disponibilidade
  hours_alone_per_day: z.number().int().min(0).max(24).optional(),
  exercise_time_per_day_minutes: z.number().int().min(0).max(600).optional(),
  has_transport: z.boolean().optional(),

  // Consentimentos (LGPD Art. 7º)
  consents: z.array(z.object({
    type: z.enum(ADOPTER_CONSENT_TYPES),
    granted: z.boolean(),
    granted_at: z.string().datetime().optional(),
  }).strict()).max(10).optional(),

  // Metadata
  profile_completeness: z.number().int().min(0).max(100).optional(),  // % preenchido
  is_public_to_shelters: z.boolean().default(false),                    // adotante top-level opt-in
  terms_accepted_at: z.string().datetime().optional(),                   // última aceitação dos termos (Fase 18)
  terms_version: z.string().max(20).optional(),
}).strict();

/**
 * Versão "create": usado quando o adotante cria o perfil pela primeira vez.
 * Apenas o user_uid é obrigatório (vindo do auth).
 */
export const createAdopterProfileSchema = z.object({
  full_name: z.string().min(2).max(120),
}).strict();

/**
 * Versão "update": qualquer campo exceto user_uid. Aceita `null` para
 * "limpar" um campo (o service converte em deleteField() do Firestore).
 *
 * Implementação: cada field opta por aceitar `null` explicitamente.
 * O service filtra nulls e gera deleteField() por campo.
 */
export const updateAdopterProfileSchema = adopterProfileSchema
  .partial()
  .omit({ user_uid: true });

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Calcula a completude do perfil (0-100%). Usado pra mostrar "perfil
 * 60% completo" e priorizar campos faltantes.
 */
export function computeProfileCompleteness(profile) {
  if (!profile) return 0;
  const requiredFields = [
    'full_name', 'phone', 'email',
    'address', 'household_size',
    'home_type', 'has_yard', 'landlord_allows_pets',
    'pet_experience_level', 'current_pets',
    'monthly_income_range', 'willing_to_spend_vet',
    'adoption_reason',
    'household_all_agree', 'hours_alone_per_day',
  ];
  const present = requiredFields.filter((f) => {
    const v = profile[f];
    if (v == null) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;
  return Math.round((present / requiredFields.length) * 100);
}

/**
 * Lista os campos que estão faltando (para sugerir ao adotante).
 */
export function getMissingFields(profile) {
  if (!profile) return ['full_name'];
  const required = [
    'phone', 'email',
    'address', 'household_size',
    'home_type', 'pet_experience_level',
    'monthly_income_range', 'adoption_reason',
  ];
  return required.filter((f) => {
    const v = profile[f];
    if (v == null) return true;
    if (Array.isArray(v) && v.length === 0) return true;
    return false;
  });
}
