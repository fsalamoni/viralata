/**
 * Vínculo entre um VOLUNTÁRIO e os DOCUMENTOS/TERMOS do abrigo/plataforma
 * (Fase 2 — SHELTER_VOLUNTEERS_V2).
 *
 * Assim como `memberDocuments.js` (Fase 1), este módulo apenas EXPÕE quais
 * documentos/termos se aplicam ao voluntário e o LINK para a versão canônica,
 * além do status de aceite do Termo de Voluntariado (que já é snapshotado na
 * rostagem — `clubs/{clubId}/volunteers/{uid}.terms_accepted_at`). O
 * rastreamento profundo (hash, histórico) é aprofundado na Fase 6.
 *
 * É um mapeamento puro (sem React/Firebase), derivado do registro legal
 * (`legal/terms.js`).
 */

import {
  TERMS_TYPE,
  TERMS_TYPE_META,
  MANDATORY_TERMS_FOR_SIGNUP,
  getCurrentTermsVersion,
} from '@/modules/shelter/domain/legal/terms';

/**
 * Rota REAL do Termo de Voluntariado no app. O `section_path` do meta é
 * `/termos-voluntario`, mas a rota registrada em `App.jsx` é `/voluntarios/termo`
 * — usamos a real para não gerar link quebrado (mesma cautela da Fase 1).
 */
export const VOLUNTEER_TERM_ROUTE = '/voluntarios/termo';

function safeVersion(type) {
  try {
    return getCurrentTermsVersion(type);
  } catch {
    return '';
  }
}

/**
 * Documentos/termos aplicáveis a um voluntário.
 *  - Termo de Voluntariado (principal, com status de aceite vindo da rostagem).
 *  - Termos obrigatórios da plataforma (Uso, Privacidade, Conduta) — aceitos por
 *    todos os usuários no cadastro.
 *
 * @param {{ rosterEntry?: object }} [args] - rostagem per-shelter do voluntário
 *   (para derivar o status de aceite do termo de voluntariado).
 * @returns {Array<{type,label,short,path,version,required,accepted,accepted_at,accepted_version}>}
 */
export function volunteerDocuments({ rosterEntry } = {}) {
  const docs = [];

  const vMeta = TERMS_TYPE_META[TERMS_TYPE.VOLUNTEER] || {};
  const acceptedAt = rosterEntry?.terms_accepted_at || null;
  docs.push({
    type: TERMS_TYPE.VOLUNTEER,
    label: vMeta.label || 'Termo de Voluntariado',
    short: vMeta.short || '',
    path: VOLUNTEER_TERM_ROUTE,
    version: safeVersion(TERMS_TYPE.VOLUNTEER),
    required: true,
    accepted: Boolean(acceptedAt),
    accepted_at: acceptedAt,
    accepted_version: rosterEntry?.terms_version || null,
  });

  const seen = new Set([TERMS_TYPE.VOLUNTEER]);
  for (const type of MANDATORY_TERMS_FOR_SIGNUP) {
    if (seen.has(type)) continue;
    seen.add(type);
    const meta = TERMS_TYPE_META[type] || {};
    docs.push({
      type,
      label: meta.label || type,
      short: meta.short || '',
      path: meta.section_path || '',
      version: safeVersion(type),
      required: true,
      // Aceite dos termos gerais não é rastreado aqui (sem dado no roster).
      accepted: null,
      accepted_at: null,
      accepted_version: null,
    });
  }

  return docs;
}

/** Contagem de documentos aplicáveis (para a célula "Documentos"). */
export function volunteerDocumentsCount(args) {
  return volunteerDocuments(args).length;
}
