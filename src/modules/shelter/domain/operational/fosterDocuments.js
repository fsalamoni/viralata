/**
 * Vínculo entre um LAR TEMPORÁRIO e os DOCUMENTOS/TERMOS do abrigo/plataforma
 * (Fase 3 — SHELTER_FOSTER_V2).
 *
 * Assim como `volunteerDocuments.js` (Fase 2) e `memberDocuments.js` (Fase 1),
 * este módulo apenas EXPÕE quais documentos/termos se aplicam ao lar temporário
 * e o LINK para a versão canônica, além do status de aceite do Termo de Lar
 * Temporário (que já é snapshotado no placement — `foster_profile_snapshot
 * .terms_accepted_at`). O rastreamento profundo (hash, histórico) é aprofundado
 * na Fase 6.
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
 * Rota REAL relacionada ao Lar Temporário no app. O `section_path` do meta é
 * `/termos-lar-temporario`, mas NÃO há rota registrada com esse caminho — a
 * rota registrada em `App.jsx` é `/lares-temporarios` (programa de lares, onde
 * o termo/condições são apresentados). Usamos a real para não gerar link
 * quebrado (mesma cautela das Fases 1 e 2).
 */
export const FOSTER_TERM_ROUTE = '/lares-temporarios';

function safeVersion(type) {
  try {
    return getCurrentTermsVersion(type);
  } catch {
    return '';
  }
}

/**
 * Documentos/termos aplicáveis a um lar temporário.
 *  - Termo de Lar Temporário (principal, com status de aceite vindo do
 *    snapshot do placement mais recente do lar).
 *  - Termos obrigatórios da plataforma (Uso, Privacidade, Conduta) — aceitos por
 *    todos os usuários no cadastro.
 *
 * @param {{ home?: object }} [args] - registro agregado do lar (groupFosterHomes)
 *   para derivar o status de aceite do termo de lar temporário.
 * @returns {Array<{type,label,short,path,version,required,accepted,accepted_at,accepted_version}>}
 */
export function fosterDocuments({ home } = {}) {
  const docs = [];

  const fMeta = TERMS_TYPE_META[TERMS_TYPE.FOSTER] || {};
  const acceptedAt = home?.terms_accepted_at || null;
  docs.push({
    type: TERMS_TYPE.FOSTER,
    label: fMeta.label || 'Termo de Lar Temporário',
    short: fMeta.short || '',
    path: FOSTER_TERM_ROUTE,
    version: safeVersion(TERMS_TYPE.FOSTER),
    required: true,
    accepted: Boolean(acceptedAt),
    accepted_at: acceptedAt,
    accepted_version: home?.terms_version || null,
  });

  const seen = new Set([TERMS_TYPE.FOSTER]);
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
      // Aceite dos termos gerais não é rastreado aqui (sem dado no snapshot).
      accepted: null,
      accepted_at: null,
      accepted_version: null,
    });
  }

  return docs;
}

/** Contagem de documentos aplicáveis (para a célula "Documentos"). */
export function fosterDocumentsCount(args) {
  return fosterDocuments(args).length;
}
