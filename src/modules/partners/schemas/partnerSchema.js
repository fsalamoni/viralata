/**
 * @fileoverview Zod schemas for Partner module.
 *
 * @see docs/PARTNER_SPACES_PLAN.md §3
 */
import { z } from 'zod';
import { PARTNER_STATUS, PARTNER_CATEGORIES, BANNER_STATUS, BANNER_POSITIONS, BANNER_LIMITS } from '../domain/constants.js';

const optionalUrl = z
  .string()
  .trim()
  .url('URL inválida')
  .max(500, 'URL muito longa (max 500)')
  .or(z.literal(''))
  .optional();

const requiredUrl = z
  .string()
  .trim()
  .min(1, 'URL obrigatória')
  .url('URL inválida')
  .max(500, 'URL muito longa (max 500)');

const optionalEmail = z
  .string()
  .trim()
  .email('E-mail inválido')
  .max(200)
  .or(z.literal(''))
  .optional();

const optionalPhone = z
  .string()
  .trim()
  .max(30, 'Telefone muito longo (max 30)')
  .regex(/^[\d\s+()\-]*$/, 'Telefone inválido')
  .or(z.literal(''))
  .optional();

/**
 * Schema para criar/editar Parceiro.
 * Status padrão: pending_review.
 */
export const partnerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Nome muito curto (min 2)')
    .max(100, 'Nome muito longo (max 100)'),

  logoUrl: optionalUrl,

  siteUrl: requiredUrl,

  contactEmail: optionalEmail,

  contactPhone: optionalPhone,

  description: z
    .string()
    .trim()
    .max(280, 'Descrição muito longa (max 280)')
    .or(z.literal(''))
    .optional(),

  category: z.enum(
    PARTNER_CATEGORIES.map((c) => c.value),
    { errorMap: () => ({ message: 'Categoria inválida' }) },
  ),

  status: z
    .enum(Object.values(PARTNER_STATUS))
    .default(PARTNER_STATUS.PENDING_REVIEW),

  expiresAt: z
    .any() // Timestamp
    .nullable()
    .optional(),
});

/**
 * Schema para Partner completo (com campos auto-gerados).
 */
export const partnerDocSchema = partnerSchema.extend({
  id: z.string(),
  createdAt: z.any(),
  updatedAt: z.any(),
  activatedAt: z.any().nullable().optional(),
  totalClicks: z.number().int().min(0).default(0),
  totalViews: z.number().int().min(0).default(0),
  createdBy: z.string(),
});

/**
 * Schema para Banner.
 */
export const bannerSchema = z.object({
  partnerId: z.string().min(1),

  imageUrl: requiredUrl,

  imageUrlMobile: optionalUrl,

  alt: z
    .string()
    .trim()
    .min(1, 'Texto alternativo obrigatório (acessibilidade)')
    .max(200, 'Texto alternativo muito longo (max 200)'),

  linkUrl: requiredUrl,

  position: z.enum(
    BANNER_POSITIONS.map((p) => p.value),
    { errorMap: () => ({ message: 'Posição inválida' }) },
  ),

  startDate: z.any(), // Timestamp

  endDate: z.any(), // Timestamp

  weight: z
    .number()
    .int()
    .min(BANNER_LIMITS.MIN_WEIGHT, `Peso mínimo ${BANNER_LIMITS.MIN_WEIGHT}`)
    .max(BANNER_LIMITS.MAX_WEIGHT, `Peso máximo ${BANNER_LIMITS.MAX_WEIGHT}`)
    .default(BANNER_LIMITS.DEFAULT_WEIGHT),

  maxImpressions: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional(),

  maxClicks: z
    .number()
    .int()
    .min(0)
    .nullable()
    .optional(),

  status: z
    .enum(Object.values(BANNER_STATUS))
    .default(BANNER_STATUS.DRAFT),
});

export const bannerDocSchema = bannerSchema.extend({
  id: z.string(),
  currentImpressions: z.number().int().min(0).default(0),
  currentClicks: z.number().int().min(0).default(0),
  createdAt: z.any(),
  updatedAt: z.any(),
  createdBy: z.string(),
});

/**
 * Schema para evento de tracking.
 */
export const analyticsEventSchema = z.object({
  type: z.enum(['view', 'click']),
  userUid: z.string().nullable(),
  userAgent: z.string().max(300),
  referrer: z.string().max(500).or(z.literal('')),
  sessionId: z.string().min(1).max(100),
  ipHash: z.string().max(100).default(''),
  timestamp: z.any(),
  isBot: z.boolean().default(false),
  position: z.string().max(50),
  page: z.string().max(200),
});

/**
 * Helpers de validação (lançam erro se inválido).
 */
export function parsePartnerOrThrow(input) {
  return partnerSchema.parse(input);
}

export function parseBannerOrThrow(input) {
  return bannerSchema.parse(input);
}

export function parseAnalyticsEventOrThrow(input) {
  return analyticsEventSchema.parse(input);
}
