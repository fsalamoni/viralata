/**
 * Derivações da Central de Documentos do Abrigo (ROADMAP · Fase 6 ·
 * SHELTER_DOCUMENTS_V1).
 *
 * Camada PURA de leitura/derivação (sem Firestore). Combina:
 *  - o registry ADITIVO do abrigo (`clubs/{clubId}.documents`) — templates de
 *    formulários/termos/contratos/políticas editados no abrigo; e
 *  - o catálogo legal versionado da plataforma (`LEGAL_PAGES`) — somente
 *    leitura, para vínculo/referência.
 *
 * Também computa **analytics de aceite** a partir de dados que o abrigo já
 * consegue ler (contratos, entrevistas e adoption_workflow) — sem tocar em
 * perfis globais de usuários (que o abrigo não pode ler) e sem persistir PII.
 */

import { LEGAL_PAGES, getLegalPageBySlug } from '../legal/index.js';
import {
  DOC_CATEGORY,
  DOC_STATUS,
  normalizeDocument,
  emptyRegistry,
} from './shelterDocuments.js';

// ─── Registry ───────────────────────────────────────────────────────────

/**
 * Extrai e normaliza o registry `documents` de um doc de clube, de forma
 * tolerante (legado/ausente/malformado → registry vazio). Nunca lança.
 */
export function getRegistry(clubDoc) {
  const raw = clubDoc && typeof clubDoc === 'object' ? clubDoc.documents : null;
  if (!raw || typeof raw !== 'object') return emptyRegistry();
  const items = Array.isArray(raw.items) ? raw.items.map(normalizeDocument) : [];
  return {
    items,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    updated_by_uid: typeof raw.updated_by_uid === 'string' ? raw.updated_by_uid : '',
  };
}

/** Documentos do abrigo ordenados (publicados primeiro, depois por título). */
export function sortDocuments(items) {
  const arr = Array.isArray(items) ? items.slice() : [];
  const rank = { [DOC_STATUS.PUBLISHED]: 0, [DOC_STATUS.DRAFT]: 1, [DOC_STATUS.ARCHIVED]: 2 };
  return arr.sort((a, b) => {
    const ra = rank[a?.status] ?? 3;
    const rb = rank[b?.status] ?? 3;
    if (ra !== rb) return ra - rb;
    return String(a?.title || '').localeCompare(String(b?.title || ''), 'pt-BR');
  });
}

/** Documentos que se vinculam a um determinado público/fluxo. */
export function documentsForAudience(registry, audience) {
  const items = registry && Array.isArray(registry.items) ? registry.items : [];
  return items.filter((d) => Array.isArray(d.audience) && d.audience.includes(audience));
}

/**
 * Resolve as páginas legais da plataforma referenciadas por um documento
 * (via `legal_slugs`), preservando apenas slugs válidos.
 */
export function resolveLinkedLegal(doc, legalPages = LEGAL_PAGES) {
  const slugs = doc && Array.isArray(doc.legal_slugs) ? doc.legal_slugs : [];
  const source = Array.isArray(legalPages) ? legalPages : LEGAL_PAGES;
  const out = [];
  for (const slug of slugs) {
    const page = source.find((p) => p.slug === slug) || getLegalPageBySlug(slug);
    if (page) out.push(page);
  }
  return out;
}

// ─── Visão unificada da central ─────────────────────────────────────────

/**
 * Monta a visão da central: documentos do abrigo (editáveis) + catálogo legal
 * da plataforma (referência somente leitura). Cada documento do abrigo carrega
 * as páginas legais que referencia em `linked_legal`.
 */
export function buildCentralView({ registry, legalPages = LEGAL_PAGES } = {}) {
  const reg = registry && Array.isArray(registry.items) ? registry : emptyRegistry();
  const shelter = sortDocuments(reg.items).map((doc) => ({
    ...doc,
    source: 'shelter',
    linked_legal: resolveLinkedLegal(doc, legalPages),
  }));
  const platform = (Array.isArray(legalPages) ? legalPages : LEGAL_PAGES).map((p) => ({
    source: 'platform',
    slug: p.slug,
    title: p.title,
    description: p.description,
    version: p.version,
    acceptance_required: p.acceptance_required === true,
    acceptance_target: p.acceptance_target || null,
  }));
  return { shelter, platform };
}

/** Sumário de contagens do registry para os cartões da central. */
export function summarizeRegistry(registry) {
  const items = registry && Array.isArray(registry.items) ? registry.items : [];
  const byCategory = {
    [DOC_CATEGORY.FORM]: 0,
    [DOC_CATEGORY.TERMS]: 0,
    [DOC_CATEGORY.CONTRACT]: 0,
    [DOC_CATEGORY.POLICY]: 0,
  };
  const byStatus = {
    [DOC_STATUS.DRAFT]: 0,
    [DOC_STATUS.PUBLISHED]: 0,
    [DOC_STATUS.ARCHIVED]: 0,
  };
  let acceptanceRequired = 0;
  for (const d of items) {
    if (byCategory[d.category] != null) byCategory[d.category] += 1;
    if (byStatus[d.status] != null) byStatus[d.status] += 1;
    if (d.acceptance_required) acceptanceRequired += 1;
  }
  return {
    total: items.length,
    byCategory,
    byStatus,
    acceptanceRequired,
    platformLegalTotal: LEGAL_PAGES.length,
  };
}

// ─── Analytics de aceite (a partir de dados legíveis pelo abrigo) ────────

const CONTRACT_FULLY_SIGNED = 'fully_signed';
const CONTRACT_CANCELLED = 'cancelled';
const INTERVIEW_COMPLETED = 'completed';
const INTERVIEW_EVALUATED = 'evaluated';

/** Escolhe a primeira data ISO válida entre uma lista de caminhos. */
function pickIso(obj, paths) {
  for (const path of paths) {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      cur = cur == null ? null : cur[p];
    }
    if (typeof cur === 'string' && cur) {
      const ms = new Date(cur).getTime();
      if (Number.isFinite(ms)) return cur;
    }
  }
  return null;
}

/** Mantém o ISO mais recente entre dois. */
function laterIso(a, b) {
  if (!a) return b || null;
  if (!b) return a || null;
  return new Date(a).getTime() >= new Date(b).getTime() ? a : b;
}

/**
 * Computa métricas de aceite a partir de coleções legíveis pelo abrigo:
 *  - `adoptionApplications` (clubs/{clubId}/adoption_workflow): aceite quando
 *    `terms_accepted_at` está preenchido;
 *  - `contracts` (clubs/{clubId}/contracts): aceite quando `fully_signed`;
 *  - `interviews` (clubs/{clubId}/interviews): progresso (completed/evaluated).
 *
 * Não recebe/retorna PII — apenas contagens e a data do último aceite.
 */
export function computeAcceptanceAnalytics({
  adoptionApplications = [],
  contracts = [],
  interviews = [],
} = {}) {
  const apps = Array.isArray(adoptionApplications) ? adoptionApplications : [];
  const ctr = Array.isArray(contracts) ? contracts : [];
  const itv = Array.isArray(interviews) ? interviews : [];

  let termsAccepted = 0;
  let lastAcceptanceAt = null;
  for (const a of apps) {
    const acceptedAt = pickIso(a, ['terms_accepted_at', 'terms.accepted_at']);
    if (acceptedAt) {
      termsAccepted += 1;
      lastAcceptanceAt = laterIso(lastAcceptanceAt, acceptedAt);
    }
  }

  let fullySigned = 0;
  let cancelledContracts = 0;
  for (const c of ctr) {
    if (c && c.status === CONTRACT_FULLY_SIGNED) {
      fullySigned += 1;
      const signedAt = pickIso(c, [
        'adopter_signature.signed_at',
        'shelter_signature.signed_at',
        'updated_at',
        'created_at',
      ]);
      lastAcceptanceAt = laterIso(lastAcceptanceAt, signedAt);
    } else if (c && c.status === CONTRACT_CANCELLED) {
      cancelledContracts += 1;
    }
  }

  let interviewsCompleted = 0;
  let interviewsEvaluated = 0;
  for (const i of itv) {
    if (i && i.status === INTERVIEW_COMPLETED) interviewsCompleted += 1;
    else if (i && i.status === INTERVIEW_EVALUATED) interviewsEvaluated += 1;
  }

  const totalApplications = apps.length;
  const acceptanceRate = totalApplications > 0
    ? Math.round((termsAccepted / totalApplications) * 100) / 100
    : 0;

  return {
    adoption: {
      totalApplications,
      termsAccepted,
      acceptanceRate,
    },
    contracts: {
      total: ctr.length,
      fullySigned,
      cancelled: cancelledContracts,
    },
    interviews: {
      total: itv.length,
      completed: interviewsCompleted,
      evaluated: interviewsEvaluated,
    },
    totalAcceptances: termsAccepted + fullySigned,
    lastAcceptanceAt,
  };
}
