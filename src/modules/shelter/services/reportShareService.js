/**
 * @fileoverview reportShareService — compartilhamento seguro de relatórios
 * (TASK-155).
 *
 * **Fluxo**:
 * 1. Admin clica "Compartilhar relatório" no ReportsTab
 * 2. Sistema gera um token (URL-safe random) e salva em
 *    `report_shares/{token}` com:
 *    - `params` (tipo, período, options) — para regenerar o relatório
 *    - `expires_at` (default 24h)
 *    - `created_by`, `shelter_club_id`
 * 3. Sistema retorna URL pública: /relatorio/:token
 * 4. Veterinário/ONG acessa URL → visualiza read-only
 * 5. Audit log: cada acesso grava em `audit_log` (compartilhamento seguro)
 *
 * **Segurança**:
 * - Token tem 32 chars base64 (192 bits de entropia)
 * - Default expiração: 24h
 * - Max visualizações: opcional (padrão: ilimitado)
 * - Apenas dados do `report_*` (read-only, sem info sensível do abrigo)
 * - Auditoria: created, viewed (cada acesso), revoked
 */

import {
  collection, doc, getDoc, addDoc, updateDoc, serverTimestamp, query, where, limit, getDocs,
} from 'firebase/firestore';
import { z } from 'zod';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';

const REPORT_SHARES_COLLECTION = 'report_shares';

// ─── Helpers ────────────────────────────────────────────────────────────

/** Gera token URL-safe com 192 bits de entropia (32 chars base64url). */
export function generateShareToken() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(24); // 192 bits
    crypto.getRandomValues(bytes);
    return base64UrlEncode(bytes);
  }
  // Fallback (Node/SSR)
  // eslint-disable-next-line no-undef
  const nodeCrypto = require('node:crypto');
  return nodeCrypto.randomBytes(24).toString('base64url');
}

function base64UrlEncode(bytes) {
  if (typeof btoa !== 'undefined') {
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  // eslint-disable-next-line no-undef
  return Buffer.from(bytes).toString('base64url');
}

// ─── Schema Zod ────────────────────────────────────────────────────────

export const DEFAULT_EXPIRATION_HOURS = 24;

export const reportShareInputSchema = z.object({
  report_type: z.string().min(1).max(64),
  report_params: z.record(z.any()).default({}),
  period_type: z.enum(['month', 'quarter', 'year', 'all']).default('month'),
  reference_date: z.string().datetime().optional(),
  shelter_club_id: z.string().min(1).max(128),
  shelter_name: z.string().optional(),
  expires_in_hours: z.number().int().min(1).max(720).default(DEFAULT_EXPIRATION_HOURS), // max 30d
  max_views: z.number().int().min(0).optional(), // 0 = unlimited
  note: z.string().max(500).optional(),
}).strict();

export const reportShareSchema = z.object({
  id: z.string().optional(),
  token: z.string().min(16).max(64),
  report_type: z.string(),
  report_params: z.record(z.any()),
  period_type: z.string(),
  reference_date: z.string().optional(),
  shelter_club_id: z.string(),
  shelter_name: z.string().optional(),
  expires_at: z.unknown(), // Timestamp
  max_views: z.number().int().min(0).optional(),
  view_count: z.number().int().min(0).default(0),
  is_revoked: z.boolean().default(false),
  note: z.string().optional(),
  created_at: z.unknown().optional(),
  created_by: z.string().optional(),
  created_by_name: z.string().optional(),
}).strict();

// ─── Operações ─────────────────────────────────────────────────────────

/**
 * Cria um novo share de relatório. Retorna { token, url, expiresAt }.
 *
 * @param {object} input — validado contra reportShareInputSchema
 * @param {object} actor — { uid, displayName }
 * @returns {Promise<{ token: string, url: string, expiresAt: Date, id: string }>}
 */
export async function createReportShare(input, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const parsed = reportShareInputSchema.parse(input);
  const token = generateShareToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + parsed.expires_in_hours * 60 * 60 * 1000);

  const payload = {
    token,
    report_type: parsed.report_type,
    report_params: parsed.report_params,
    period_type: parsed.period_type,
    reference_date: parsed.reference_date || now.toISOString(),
    shelter_club_id: parsed.shelter_club_id,
    shelter_name: parsed.shelter_name || null,
    expires_at: expiresAt,
    max_views: parsed.max_views || null,
    view_count: 0,
    is_revoked: false,
    note: parsed.note || null,
    created_at: serverTimestamp(),
    created_by: actor.uid,
    created_by_name: actor.displayName || null,
  };

  const ref = await addDoc(collection(db, REPORT_SHARES_COLLECTION), payload);

  await createAuditLog({
    action: 'report_share_created',
    actor,
    details: {
      share_id: ref.id,
      token,
      report_type: parsed.report_type,
      shelter_club_id: parsed.shelter_club_id,
      expires_at: expiresAt.toISOString(),
      max_views: parsed.max_views || null,
    },
  }).catch((err) => logger.warn('reportShareService.createReportShare', {
    msg: 'audit failed (non-blocking)', err: String(err),
  }));

  return {
    id: ref.id,
    token,
    url: buildShareUrl(token),
    expiresAt,
  };
}

/**
 * Constrói URL pública do share.
 */
export function buildShareUrl(token) {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/relatorio/${token}`;
  }
  return `/relatorio/${token}`;
}

/**
 * Revoga um share (soft delete). Marca is_revoked=true.
 */
export async function revokeReportShare(token, actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');

  const q = query(
    collection(db, REPORT_SHARES_COLLECTION),
    where('token', '==', token),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Share não encontrado');
  const shareDoc = snap.docs[0];

  await updateDoc(shareDoc.ref, {
    is_revoked: true,
    revoked_at: serverTimestamp(),
    revoked_by: actor.uid,
  });

  await createAuditLog({
    action: 'report_share_revoked',
    actor,
    details: { share_id: shareDoc.id, token, shelter_club_id: shareDoc.data().shelter_club_id },
  }).catch(() => {});

  return { id: shareDoc.id, token, revoked: true };
}

/**
 * Incrementa view_count de um share (chamado no GET do relatório público).
 * Retorna false se o share está expirado/revoked/limite atingido.
 */
export async function recordReportShareView(token, viewerInfo = {}) {
  if (!db) return null;
  const q = query(
    collection(db, REPORT_SHARES_COLLECTION),
    where('token', '==', token),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const shareDoc = snap.docs[0];
  const data = shareDoc.data();

  // Validações
  if (data.is_revoked) return { valid: false, reason: 'revoked' };

  // expires_at
  const expiresAt = data.expires_at?.toDate
    ? data.expires_at.toDate()
    : (data.expires_at ? new Date(data.expires_at) : null);
  if (expiresAt && expiresAt < new Date()) {
    return { valid: false, reason: 'expired' };
  }

  // max_views
  if (data.max_views && data.view_count >= data.max_views) {
    return { valid: false, reason: 'max_views_reached' };
  }

  // Incrementa
  await updateDoc(shareDoc.ref, {
    view_count: (data.view_count || 0) + 1,
    last_viewed_at: serverTimestamp(),
  });

  await createAuditLog({
    action: 'report_share_viewed',
    actor: { uid: viewerInfo.uid || 'anonymous', displayName: viewerInfo.displayName || 'Visitante' },
    details: {
      share_id: shareDoc.id,
      token,
      shelter_club_id: data.shelter_club_id,
      report_type: data.report_type,
      ip_hint: viewerInfo.ip_hint || null,
    },
  }).catch(() => {});

  return {
    valid: true,
    share: { id: shareDoc.id, ...data },
  };
}

/**
 * Lista shares ativos de um abrigo (para o admin gerenciar).
 */
export async function listReportShares(shelterClubId) {
  if (!db || !shelterClubId) return [];
  const q = query(
    collection(db, REPORT_SHARES_COLLECTION),
    where('shelter_club_id', '==', shelterClubId),
    limit(50),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
