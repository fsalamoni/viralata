/**
 * @fileoverview Domínio: Galeria de Fotos (Fase 10).
 *
 * Coleção `pet_photos/{photoId}`. Multi-tenant via `shelter_club_id`
 * (não-multi-tenant na path, mas o campo é obrigatório para RLS).
 *
 * Implementa o §11.2 do roadmap: **soft delete + purge 30d no Storage**.
 * - Firestore: soft delete com `deleted_at` + `deleted_by_uid`. Lixeira
 *   restaura até 30d.
 * - Storage: ao soft-deletar, move o arquivo para `trash/{petId}/{photoId}.jpg`
 *   em bucket separado. Cloud Function agendada deleta fisicamente
 *   após 30d.
 * - Backup: trash bucket com lifecycle 60d para coldline, depois delete.
 *
 * @see docs/SHELTER_MGMT_ROADMAP.md § 11.2
 */

import { z } from 'zod';

// ─── Categorias ────────────────────────────────────────────────────────

export const PHOTO_CATEGORIES = Object.freeze([
  'rescue',         // momento do resgate
  'profile',        // foto principal do pet
  'health',         // exames, lesões, recuperação
  'foster',         // período em lar temporário
  'adoption',       // momento da adoção
  'post_adoption',  // acompanhamento pós-adoção
  'exhibition',     // vitrines
  'other',
]);

// ─── Schemas ───────────────────────────────────────────────────────────

/**
 * Schema do doc de foto.
 */
export const petPhotoSchema = z.object({
  pet_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),  // multi-tenant
  category: z.enum(PHOTO_CATEGORIES),
  url: z.string().url(),
  thumb_url: z.string().url().optional().nullable(),
  storage_path: z.string().min(1).max(500),     // path no Storage
  uploaded_by_uid: z.string().min(1).max(128),
  uploaded_by_name: z.string().max(120).optional(),
  caption: z.string().max(500).optional().nullable(),
  // Metadata original
  original_metadata: z.object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    size_bytes: z.number().int().nonnegative().optional(),
    mime_type: z.string().max(50).optional(),
  }).optional().nullable(),
  // Soft delete
  deleted_at: z.string().datetime().optional().nullable(),
  deleted_by_uid: z.string().max(128).optional().nullable(),
  // Audit
  created_at: z.unknown().optional(),
  updated_at: z.unknown().optional(),
}).strict();

/**
 * Schema para upload (criação) de uma foto.
 */
export const createPetPhotoSchema = z.object({
  pet_id: z.string().min(1).max(128),
  shelter_club_id: z.string().min(1).max(128),
  category: z.enum(PHOTO_CATEGORIES),
  url: z.string().url(),
  thumb_url: z.string().url().optional(),
  storage_path: z.string().min(1).max(500),
  caption: z.string().max(500).optional(),
  // TASK-144: vinculação automática com vitrines e adoções
  exhibition_id: z.string().min(1).max(128).optional(),
  adoption_id: z.string().min(1).max(128).optional(),
  // Auto-derived: se exhibition_id setado, category='exhibition' (se não setado)
  // Auto-derived: se adoption_id setado, category='adoption' (se não setado)
  original_metadata: z.object({
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
    size_bytes: z.number().int().nonnegative().optional(),
    mime_type: z.string().max(50).optional(),
  }).optional(),
}).strict();

/**
 * Schema para atualizar (caption/category apenas).
 */
export const updatePetPhotoSchema = z.object({
  category: z.enum(PHOTO_CATEGORIES).optional(),
  caption: z.string().max(500).optional(),
}).strict();

// ─── Helpers ──────────────────────────────────────────────────────────

export const PHOTO_CATEGORY_LABELS = Object.freeze({
  rescue: 'Resgate',
  profile: 'Perfil',
  health: 'Saúde',
  foster: 'Lar temporário',
  adoption: 'Adoção',
  post_adoption: 'Pós-adoção',
  exhibition: 'Vitrine',
  other: 'Outro',
});

/**
 * Calcula quantos dias faltam para o purge automático.
 * Retorna 0 se já passou, ou null se não está em trash.
 */
export function daysUntilPurge(deletedAt, nowMs = Date.now()) {
  if (!deletedAt) return null;
  const deleted = new Date(deletedAt).getTime();
  const PURGE_DAYS = 30;
  const elapsed = (nowMs - deleted) / (24 * 3600 * 1000);
  const remaining = PURGE_DAYS - elapsed;
  return Math.max(0, Math.ceil(remaining));
}

export const PURGE_DAYS = 30;
