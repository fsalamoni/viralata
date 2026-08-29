/**
 * Vínculo entre um MEMBRO da equipe e os DOCUMENTOS/TERMOS do abrigo/plataforma
 * (Fase 1 — SHELTER_TEAM_V2).
 *
 * A Fase 1 apenas EXPÕE quais documentos/termos se aplicam a cada membro (com
 * base no seu papel) e o LINK para a versão canônica na plataforma. O
 * rastreamento profundo de aceite (quem assinou, quando, hash) é aprofundado na
 * Fase 6 (Documentos do abrigo). Aqui não há escrita nem leitura de aceites —
 * é um mapeamento puro, derivado do registro legal (`legal/terms.js`).
 */

import {
  TERMS_TYPE,
  TERMS_TYPE_META,
  MANDATORY_TERMS_FOR_SIGNUP,
  getCurrentTermsVersion,
} from '@/modules/shelter/domain/legal/terms';

/**
 * Documentos/termos do abrigo aplicáveis a um membro, conforme o papel.
 *  - Todos os membros: termos obrigatórios da plataforma (Uso, Privacidade,
 *    Conduta).
 *  - Proprietário/administrador: também o Termo de Adesão do Abrigo (com DPA).
 *
 * @param {{ owner?: boolean, isAdmin?: boolean }} args
 * @returns {Array<{ type: string, label: string, short: string, path: string, version: string, required: boolean }>}
 */
export function shelterDocumentsForMember({ owner, isAdmin } = {}) {
  const types = [...MANDATORY_TERMS_FOR_SIGNUP];
  if (owner || isAdmin) types.push(TERMS_TYPE.SHELTER);

  // De-duplica preservando ordem.
  const seen = new Set();
  const unique = types.filter((t) => (seen.has(t) ? false : (seen.add(t), true)));

  return unique.map((type) => {
    const meta = TERMS_TYPE_META[type] || {};
    return {
      type,
      label: meta.label || type,
      short: meta.short || '',
      path: meta.section_path || '',
      version: safeVersion(type),
      required: true,
    };
  });
}

function safeVersion(type) {
  try {
    return getCurrentTermsVersion(type);
  } catch {
    return '';
  }
}

/** Contagem de documentos aplicáveis (para exibir na célula "Documentos"). */
export function shelterDocumentsCount(args) {
  return shelterDocumentsForMember(args).length;
}
