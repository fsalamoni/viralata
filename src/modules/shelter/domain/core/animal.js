/**
 * Domínio: Animal (núcleo do sistema de gestão do abrigo).
 *
 * Define o "Cadastro Único" do animal — a parte que segue o animal
 * independentemente do abrigo (Fase 1). Os dados clínicos, operacionais e
 * legais vivem em sub-coleções e são *tenant-specific* (veja seção 11.1 do
 * docs/SHELTER_MGMT_ROADMAP.md).
 *
 * Princípios:
 * 1. Append-only: nunca deletar/renomear campo. Migrações sempre aditivas.
 * 2. Soft-delete: nunca apagar; marcar `deleted_at`. Hardware purge em 30d.
 * 3. Backward-compat: campos novos são opcionais; leitores toleram ausência.
 * 4. Defesa em profundidade: schema aqui + service + Firestore rules.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § Fase 1 + § 11.1 (multi-tenant)
 */

import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────────────────────────

/**
 * Tipo de entrada do animal no abrigo.
 * `rescue` (carreira/fiscalização/denúncia), `born` (nasceu no abrigo),
 * `transfer` (veio de outro abrigo), `surrender` (entregue pelo tutor),
 * `purchase` (compra — raro, mas em abrigos que resgatam de canis comerciais).
 */
export const INTAKE_TYPES = Object.freeze([
  'rescue',
  'born',
  'transfer',
  'surrender',
  'purchase',
]);

/**
 * Status Asilomar — padrão internacional de categorização de saúde animal
 * em abrigos. Adotado por Petfinder, Maddie's Fund, ASPCA. Documentado em:
 * https://www.shelteranimalscount.org/what-is-asilomar
 */
export const ASILOMAR_STATUSES = Object.freeze([
  'healthy',                  // Saudável no momento da entrada
  'treatable_rehabilitatable',// Tratável e rehabilitável
  'treatable_manageable',     // Tratável mas requer manejo contínuo
  'unhealthy_untreatable',    // Doente sem possibilidade terapêutica
  'undetermined',             // Não avaliado ainda
]);

// ─── Schemas Zod (validação client + service) ───────────────────────────

/**
 * Local de resgate/endereço. Schema livre (não amarrado a serviço de
 * geocoding específico — Fase 1 não depende de lat/lng externo).
 */
const rescueLocationSchema = z.object({
  description: z.string().max(280).optional(),
  city: z.string().max(80).optional(),
  state: z.string().length(2).optional(), // UF brasileiro
  source: z.enum(['manual', 'geocoded', 'shared_link']).default('manual'),
}).strict();

/**
 * Cross-posting: links para outras plataformas (Petfinder, Adoção Responsável,
 * grupos de Facebook, etc). Cada abrigo gerencia os seus.
 */
const crossPostingSchema = z.object({
  petfinder_url: z.string().url().optional(),
  rescuegroups_url: z.string().url().optional(),
  facebook_url: z.string().url().optional(),
  other_urls: z.array(z.string().url()).max(10).default([]),
}).strict();

/**
 * Schema principal do Cadastro Único. Todos os campos da Fase 1 são
 * OPCIONAIS (não quebrar pets legados). O `petService.sanitizePet` aceita
 * docs antigos sem esses campos e adiciona defaults.
 */
export const shelterAnimalProfileSchema = z.object({
  // Identificação do resgate
  rescue_name: z.string().min(1).max(80).optional(),       // Nome na rua / como entrou
  rescue_date: z.string().datetime().optional(),            // ISO 8601
  rescue_by_uid: z.string().max(128).optional(),            // Quem resgatou (user.uid)
  rescue_by_name: z.string().max(80).optional(),            // Snapshots: nome de quem resgatou
  rescue_location: rescueLocationSchema.optional(),

  // Identificação física
  microchip_id: z.string().regex(/^[0-9]{15}$/, 'Microchip deve ter 15 dígitos (ISO 11784/11785)').optional(),

  // Tipo de entrada
  intake_type: z.enum(INTAKE_TYPES).optional(),
  intake_subtype: z.string().max(80).optional(),            // ex: "atroz", "carreira", "ninhada"
  intake_notes: z.string().max(2000).optional(),            // Notas de quem recebeu

  // Status Asilomar (avaliação inicial)
  asilomar_status: z.enum(ASILOMAR_STATUSES).default('undetermined'),
  asilomar_evaluated_at: z.string().datetime().optional(),
  asilomar_evaluated_by_uid: z.string().max(128).optional(),

  // Multi-tenant (Fase 1 inclui este campo; regras de tenancy aplicadas em Fases 2+)
  shelter_owner_club_id: z.string().max(128).optional(),    // shelter (ONG) que possui o animal

  // Cross-posting
  cross_posting: crossPostingSchema.optional(),

  // Status vital (Fase 1 inclui; funcionalidade de óbito só virá em Fase 8/21)
  deceased_at: z.string().datetime().optional(),
  death_cause: z.string().max(280).optional(),

  // Auditoria
  shelter_profile_updated_at: z.string().datetime().optional(),
  shelter_profile_updated_by_uid: z.string().max(128).optional(),
}).strict();

/**
 * Versão "merge" do schema de pet. Aceita pets legados (campos novos
 * opcionais) + pets com perfil de abrigo completo. Usado em
 * `petService.sanitizePet` para garantir que QUALQUER doc do Firestore
 * passa pela validação sem quebrar.
 */
export const shelterAnimalProfileUpdateSchema = shelterAnimalProfileSchema.partial();

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Default values para os campos novos. Aplicado em pets que não têm o
 * perfil de abrigo (backfill da Fase 1).
 */
export const SHELTER_ANIMAL_PROFILE_DEFAULTS = Object.freeze({
  asilomar_status: 'undetermined',
  shelter_profile_updated_at: null,
});

/**
 * Indica se o pet tem um perfil de abrigo preenchido (≥1 campo
 * significativo). Usado para esconder/mostrar a aba "Cadastro".
 */
export function hasShelterProfile(pet) {
  if (!pet) return false;
  return Boolean(
    pet.rescue_date ||
    pet.rescue_by_uid ||
    pet.microchip_id ||
    pet.intake_type ||
    pet.shelter_owner_club_id,
  );
}

/**
 * Compara dois perfis para detectar mudanças (audit log). Retorna lista
 * de campos alterados com old/new.
 */
export function diffShelterProfile(oldPet, newPet) {
  const fields = [
    'rescue_name', 'rescue_date', 'rescue_by_uid', 'rescue_by_name',
    'microchip_id', 'intake_type', 'intake_subtype', 'asilomar_status',
    'shelter_owner_club_id', 'deceased_at', 'death_cause',
  ];
  const changes = [];
  for (const f of fields) {
    const oldVal = oldPet?.[f] ?? null;
    const newVal = newPet?.[f] ?? null;
    if (oldVal !== newVal) {
      changes.push({ field: f, from: oldVal, to: newVal });
    }
  }
  return changes;
}
