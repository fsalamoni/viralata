/**
 * Domínio da Central de Documentos do Abrigo V1 (ROADMAP · Fase 6 ·
 * SHELTER_DOCUMENTS_V1).
 *
 * Camada PURA (sem Firestore): enums, limites, sanitização (anti-XSS),
 * normalizadores, versionamento append-only e operações de lista para a
 * "central de documentos" — formulários, termos, contratos e políticas do
 * abrigo. Todos os dados são gravados de forma ADITIVA no MESMO documento
 * `clubs/{clubId}`, sob o campo `documents`:
 *
 *   documents = {
 *     items: Document[],          // definições/templates (SEM PII)
 *     updated_at, updated_by_uid,
 *   }
 *
 *   Document = {
 *     id, category, status, title, description,
 *     audience: string[],         // vínculo a fluxos (adotante/voluntário/…)
 *     acceptance_required: bool,
 *     legal_slugs: string[],      // vínculo ao catálogo legal (LEGAL_PAGES)
 *     body,                       // Markdown (termos/contratos/políticas)
 *     form_schema: { fields: FormField[] },  // formulário (adoção in-app)
 *     current_version, versions: Version[],  // metadados append-only + hash
 *     created_at, created_by_uid, updated_at, updated_by_uid,
 *   }
 *
 * Segurança:
 *  - **XSS**: nenhum HTML cru é aceito. `sanitizeText` remove tags na ESCRITA
 *    e a renderização usa Markdown + `skipHtml` (defesa em profundidade).
 *  - **Imutabilidade de termos aceitos**: `versions[]` é append-only — cada
 *    versão guarda um `content_hash` (SHA-256, calculado no service). Publicar
 *    uma edição cria uma NOVA versão; entradas existentes nunca são reescritas.
 *    A prova do que foi aceito é o hash registrado no aceite (fluxo existente).
 *  - **Sem PII**: o registry guarda apenas TEMPLATES/definições, então residir
 *    no doc `clubs/{clubId}` (mundo-legível) é seguro, como banners/produtos.
 *
 * Com a flag OFF este código não roda e o painel atual permanece idêntico.
 */

// ─── Enums ──────────────────────────────────────────────────────────────

/** Categorias de documento. */
export const DOC_CATEGORY = Object.freeze({
  FORM: 'form',
  TERMS: 'terms',
  CONTRACT: 'contract',
  POLICY: 'policy',
});

export const DOC_CATEGORY_LABELS = Object.freeze({
  [DOC_CATEGORY.FORM]: 'Formulário',
  [DOC_CATEGORY.TERMS]: 'Termo',
  [DOC_CATEGORY.CONTRACT]: 'Contrato',
  [DOC_CATEGORY.POLICY]: 'Política / Aviso',
});

/** Situação de um documento. */
export const DOC_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
});

export const DOC_STATUS_LABELS = Object.freeze({
  [DOC_STATUS.DRAFT]: 'Rascunho',
  [DOC_STATUS.PUBLISHED]: 'Publicado',
  [DOC_STATUS.ARCHIVED]: 'Arquivado',
});

/** Tipos de campo do construtor de formulário. */
export const FIELD_TYPE = Object.freeze({
  TEXT: 'text',
  TEXTAREA: 'textarea',
  EMAIL: 'email',
  PHONE: 'phone',
  NUMBER: 'number',
  DATE: 'date',
  SELECT: 'select',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
});

export const FIELD_TYPE_LABELS = Object.freeze({
  [FIELD_TYPE.TEXT]: 'Texto curto',
  [FIELD_TYPE.TEXTAREA]: 'Texto longo',
  [FIELD_TYPE.EMAIL]: 'E-mail',
  [FIELD_TYPE.PHONE]: 'Telefone',
  [FIELD_TYPE.NUMBER]: 'Número',
  [FIELD_TYPE.DATE]: 'Data',
  [FIELD_TYPE.SELECT]: 'Seleção (lista)',
  [FIELD_TYPE.RADIO]: 'Escolha única',
  [FIELD_TYPE.CHECKBOX]: 'Múltipla escolha',
});

/** Tipos de campo que possuem opções. */
export const FIELD_TYPES_WITH_OPTIONS = Object.freeze([
  FIELD_TYPE.SELECT,
  FIELD_TYPE.RADIO,
  FIELD_TYPE.CHECKBOX,
]);

/** Público/fluxo ao qual o documento se vincula. */
export const DOC_AUDIENCE = Object.freeze({
  ADOPTER: 'adopter',
  VOLUNTEER: 'volunteer',
  FOSTER: 'foster',
  MEMBER: 'member',
  DONOR: 'donor',
  PUBLIC: 'public',
});

export const DOC_AUDIENCE_LABELS = Object.freeze({
  [DOC_AUDIENCE.ADOPTER]: 'Adoção',
  [DOC_AUDIENCE.VOLUNTEER]: 'Voluntariado',
  [DOC_AUDIENCE.FOSTER]: 'Lar temporário',
  [DOC_AUDIENCE.MEMBER]: 'Equipe / Membro',
  [DOC_AUDIENCE.DONOR]: 'Doações',
  [DOC_AUDIENCE.PUBLIC]: 'Público geral',
});

// ─── Limites ────────────────────────────────────────────────────────────
//
// Os limites mantêm o campo `documents` bem abaixo do teto de 1 MB do doc
// Firestore. Pior caso ≈ 25 docs × ~16 KB ≈ 400 KB.

export const DOC_LIMITS = Object.freeze({
  DOCUMENTS_MAX: 25,
  VERSIONS_MAX: 30,
  FIELDS_MAX: 40,
  OPTIONS_MAX: 30,
  LINKS_MAX: 20,
  AUDIENCE_MAX: 6,
  TITLE_MAX: 200,
  DESCRIPTION_MAX: 1000,
  BODY_MAX: 16000,
  FIELD_LABEL_MAX: 200,
  FIELD_KEY_MAX: 64,
  OPTION_MAX: 120,
  CHANGE_SUMMARY_MAX: 500,
  SLUG_MAX: 80,
  NAME_MAX: 200,
  HASH_MAX: 120,
});

// ─── Predicados de enum ─────────────────────────────────────────────────

const DOC_CATEGORIES = Object.freeze(Object.values(DOC_CATEGORY));
const DOC_STATUSES = Object.freeze(Object.values(DOC_STATUS));
const FIELD_TYPES = Object.freeze(Object.values(FIELD_TYPE));
const DOC_AUDIENCES = Object.freeze(Object.values(DOC_AUDIENCE));

export function isValidCategory(v) { return DOC_CATEGORIES.includes(v); }
export function isValidStatus(v) { return DOC_STATUSES.includes(v); }
export function isValidFieldType(v) { return FIELD_TYPES.includes(v); }
export function isValidAudience(v) { return DOC_AUDIENCES.includes(v); }

/** Categorias que suportam corpo em Markdown (não-formulário). */
export function isBodyCategory(category) {
  return category === DOC_CATEGORY.TERMS
    || category === DOC_CATEGORY.CONTRACT
    || category === DOC_CATEGORY.POLICY;
}

/** Categorias que podem exigir aceite explícito (imutável). */
export function isAcceptanceCategory(category) {
  return category === DOC_CATEGORY.TERMS || category === DOC_CATEGORY.CONTRACT;
}

/** true se o tipo de campo possui opções. */
export function fieldTypeHasOptions(type) {
  return FIELD_TYPES_WITH_OPTIONS.includes(type);
}

// ─── Sanitização (anti-XSS) ─────────────────────────────────────────────

/**
 * Remove HTML cru de uma string: tags de abertura/fechamento, comentários e
 * declarações. Preserva o texto/Markdown restante (ex.: "a < b", "<3", listas
 * e títulos Markdown permanecem intactos, pois o regex exige uma letra logo
 * após "<"). A renderização usa Markdown com `skipHtml`, então isto é defesa
 * em profundidade — o HTML nunca é interpretado.
 *
 * A remoção é reaplicada até um **ponto fixo**: remover uma tag/comentário pode
 * revelar outro (ex.: "<scr<script>ipt>" → "<script>"), então iteramos até a
 * string estabilizar. Cada passo só remove caracteres, logo o laço converge.
 */
export function stripHtmlTags(value) {
  let out = String(value ?? '');
  let prev;
  do {
    prev = out;
    out = out
      .replace(/<!--[\s\S]*?-->/g, '')     // comentários HTML completos
      .replace(/<\/?[a-zA-Z][^>]*>/g, '')  // tags de abertura/fechamento
      .replace(/<![^>]*>/g, '')            // declarações (<!DOCTYPE …>)
      .replace(/<!--/g, '');               // abridor de comentário solto (sem fechamento)
  } while (out !== prev);
  return out;
}

/** Sanitiza + apara + limita uma string a `max` caracteres. */
export function sanitizeText(value, max) {
  return stripHtmlTags(value).trim().slice(0, max);
}

// ─── Coerção de primitivos ──────────────────────────────────────────────

/** ISO 8601 válido ou null. Aceita Date, number (ms) ou string. */
export function normalizeIsoOrNull(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  const ms = d.getTime();
  return Number.isFinite(ms) ? d.toISOString() : null;
}

/** Inteiro de versão ≥ 1, ou 0 quando inválido. */
export function clampVersionInt(value) {
  const n = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(n) || n < 1) return 0;
  return Math.min(n, 1_000_000);
}

/** true se o item tem um id string não-vazio. */
export function hasId(item) {
  return Boolean(item && typeof item.id === 'string' && item.id.length > 0);
}

/**
 * Normaliza uma lista de strings: sanitiza, remove vazias/duplicadas e limita
 * tamanho por item (`itemMax`) e quantidade (`listMax`).
 */
export function normalizeStringList(list, itemMax, listMax) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const v = sanitizeText(raw, itemMax);
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= listMax) break;
  }
  return out;
}

/** Normaliza a lista de públicos/fluxos, filtrando por valores válidos. */
export function normalizeAudienceList(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (!isValidAudience(raw) || seen.has(raw)) continue;
    seen.add(raw);
    out.push(raw);
    if (out.length >= DOC_LIMITS.AUDIENCE_MAX) break;
  }
  return out;
}

// ─── Normalizadores de formulário ───────────────────────────────────────

/** Normaliza um campo do construtor de formulário. */
export function normalizeFormField(input = {}) {
  const type = isValidFieldType(input.type) ? input.type : FIELD_TYPE.TEXT;
  const options = fieldTypeHasOptions(type)
    ? normalizeStringList(input.options, DOC_LIMITS.OPTION_MAX, DOC_LIMITS.OPTIONS_MAX)
    : [];
  return {
    id: sanitizeText(input.id, DOC_LIMITS.FIELD_KEY_MAX),
    type,
    label: sanitizeText(input.label, DOC_LIMITS.FIELD_LABEL_MAX),
    help: sanitizeText(input.help, DOC_LIMITS.FIELD_LABEL_MAX),
    required: input.required === true,
    options,
  };
}

/** Normaliza o esquema do formulário (lista de campos válidos). */
export function normalizeFormSchema(input = {}) {
  const rawFields = Array.isArray(input?.fields) ? input.fields : [];
  const fields = rawFields
    .map(normalizeFormField)
    .filter((f) => f.id && f.label)
    .slice(0, DOC_LIMITS.FIELDS_MAX);
  return { fields };
}

// ─── Versionamento (append-only, imutável) ──────────────────────────────

/** Normaliza os metadados de uma versão publicada. */
export function normalizeVersion(input = {}) {
  return {
    version: clampVersionInt(input.version),
    content_hash: sanitizeText(input.content_hash, DOC_LIMITS.HASH_MAX),
    change_summary: sanitizeText(input.change_summary, DOC_LIMITS.CHANGE_SUMMARY_MAX),
    effective_date: normalizeIsoOrNull(input.effective_date),
    published_at: normalizeIsoOrNull(input.published_at) || new Date().toISOString(),
    published_by_uid: sanitizeText(input.published_by_uid, 128),
    published_by_name: sanitizeText(input.published_by_name, DOC_LIMITS.NAME_MAX),
  };
}

/** Maior número de versão presente na lista (0 se vazia). */
export function maxVersion(versions) {
  if (!Array.isArray(versions)) return 0;
  return versions.reduce((mx, v) => {
    const n = clampVersionInt(v && v.version);
    return n > mx ? n : mx;
  }, 0);
}

/** Próximo número de versão a publicar. */
export function nextVersionNumber(versions) {
  return maxVersion(versions) + 1;
}

/**
 * Anexa uma versão à lista de forma IMUTÁVEL: se o número de versão já existe,
 * a lista é retornada inalterada (nunca sobrescreve). Ordena por versão e
 * mantém as `max` mais recentes (metadados são pequenos; corpos antigos não
 * são retidos no registry). Nunca muta a lista original.
 */
export function appendVersion(versions, entry, max = DOC_LIMITS.VERSIONS_MAX) {
  const arr = Array.isArray(versions) ? versions.slice() : [];
  const v = normalizeVersion(entry);
  if (v.version < 1) return arr;
  if (arr.some((it) => it && clampVersionInt(it.version) === v.version)) return arr;
  arr.push(v);
  arr.sort((a, b) => clampVersionInt(a.version) - clampVersionInt(b.version));
  return arr.length > max ? arr.slice(arr.length - max) : arr;
}

// ─── Normalizador de documento ──────────────────────────────────────────

/** Normaliza um documento completo do registry. */
export function normalizeDocument(input = {}) {
  const category = isValidCategory(input.category) ? input.category : DOC_CATEGORY.POLICY;
  const status = isValidStatus(input.status) ? input.status : DOC_STATUS.DRAFT;
  const isForm = category === DOC_CATEGORY.FORM;
  const nowIso = new Date().toISOString();

  const versions = (Array.isArray(input.versions) ? input.versions : [])
    .map(normalizeVersion)
    .filter((v) => v.version >= 1)
    .sort((a, b) => a.version - b.version)
    .slice(-DOC_LIMITS.VERSIONS_MAX);

  const currentVersion = clampVersionInt(input.current_version) || maxVersion(versions);

  return {
    id: sanitizeText(input.id, 64),
    category,
    status,
    title: sanitizeText(input.title, DOC_LIMITS.TITLE_MAX),
    description: sanitizeText(input.description, DOC_LIMITS.DESCRIPTION_MAX),
    audience: normalizeAudienceList(input.audience),
    acceptance_required: isAcceptanceCategory(category) && input.acceptance_required === true,
    legal_slugs: normalizeStringList(input.legal_slugs, DOC_LIMITS.SLUG_MAX, DOC_LIMITS.LINKS_MAX),
    body: isForm ? '' : sanitizeText(input.body, DOC_LIMITS.BODY_MAX),
    form_schema: isForm ? normalizeFormSchema(input.form_schema) : { fields: [] },
    current_version: currentVersion,
    versions,
    created_at: normalizeIsoOrNull(input.created_at) || nowIso,
    created_by_uid: sanitizeText(input.created_by_uid, 128),
    updated_at: normalizeIsoOrNull(input.updated_at) || nowIso,
    updated_by_uid: sanitizeText(input.updated_by_uid, 128),
  };
}

// ─── Operações de lista (puras) ─────────────────────────────────────────

/**
 * Insere ou atualiza `item` na lista por `id`. Se o id já existe, substitui;
 * senão, anexa ao fim respeitando `max`. Nunca muta a lista original. Itens
 * sem id são ignorados (o service deve gerar o id).
 */
export function upsertById(list, item, max = DOC_LIMITS.DOCUMENTS_MAX) {
  const arr = Array.isArray(list) ? list.slice() : [];
  if (!hasId(item)) return arr;
  const idx = arr.findIndex((it) => it && it.id === item.id);
  if (idx >= 0) {
    arr[idx] = item;
    return arr;
  }
  if (arr.length >= max) return arr;
  arr.push(item);
  return arr;
}

/** Remove o item de `id` da lista. Nunca muta a original. */
export function removeById(list, id) {
  if (!Array.isArray(list)) return [];
  return list.filter((it) => !(it && it.id === id));
}

/** Localiza um documento por id na lista. */
export function findById(list, id) {
  if (!Array.isArray(list) || !id) return null;
  return list.find((it) => it && it.id === id) || null;
}

/** Estrutura `documents` vazia/padrão. */
export function emptyRegistry() {
  return { items: [], updated_at: null, updated_by_uid: '' };
}
