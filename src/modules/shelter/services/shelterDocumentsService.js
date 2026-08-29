/**
 * Serviço da Central de Documentos do Abrigo V1 (ROADMAP · Fase 6 ·
 * SHELTER_DOCUMENTS_V1).
 *
 * Grava de forma ADITIVA o campo `documents` no MESMO documento
 * `clubs/{clubId}` — um registry de TEMPLATES (formulários/termos/contratos/
 * políticas), SEM PII. Nenhuma subcoleção nova é criada e nenhuma regra do
 * Firestore precisa mudar: o ramo de `update` do clube (owner/admin) não usa
 * `hasOnly()` e só exige que `created_by` permaneça imutável — o que aqui nunca
 * tocamos. A própria regra já restringe a escrita a owner/admin do abrigo.
 *
 * Escrita por caminho pontilhado (`documents.items`, `documents.updated_at`)
 * para nunca sobrescrever outros campos do doc do clube. Com a flag OFF este
 * serviço não é chamado e o doc do clube permanece byte-a-byte idêntico.
 *
 * Imutabilidade: `publishDocument` calcula o `content_hash` (SHA-256) do corpo/
 * esquema e ANEXA uma nova versão (append-only). Editar um documento publicado
 * cria uma NOVA versão; versões anteriores nunca são reescritas. A prova do que
 * foi aceito é o hash registrado no fluxo de aceite existente.
 */

import {
  collection, doc, getDoc, getDocs, query, limit, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/core/config/firebase';
import { logger } from '@/core/lib/logger';
import { createAuditLog } from '@/core/services/auditService';
import { computeDocumentHash } from '@/modules/shelter/domain/legal/terms';
import {
  DOC_STATUS,
  DOC_LIMITS,
  isBodyCategory,
  sanitizeText,
  normalizeDocument,
  normalizeFormSchema,
  nextVersionNumber,
  appendVersion,
  upsertById,
  removeById,
  findById,
} from '@/modules/shelter/domain/documents/shelterDocuments';
import { getRegistry, computeAcceptanceAnalytics } from '@/modules/shelter/domain/documents/shelterDocumentsView';

const CLUBS_COLLECTION = 'clubs';
const DOCUMENTS_SUBPATH = 'documents';
const ANALYTICS_READ_LIMIT = 300;

// ─── Helpers internos ──────────────────────────────────────────────────

function _assertActor(actor) {
  if (!db) throw new Error('Firebase não disponível');
  if (!actor?.uid) throw new Error('actor.uid é obrigatório');
}

function _clubRef(shelterClubId) {
  return doc(db, CLUBS_COLLECTION, shelterClubId);
}

/** Gera um id local para documentos (sem criar documento no Firestore). */
function _mintId(shelterClubId) {
  return doc(collection(db, CLUBS_COLLECTION, shelterClubId, DOCUMENTS_SUBPATH)).id;
}

/** Lê o doc do clube, valida existência e retorna o registry atual. */
async function _loadRegistry(shelterClubId) {
  if (!shelterClubId) throw new Error('shelterClubId é obrigatório');
  const snap = await getDoc(_clubRef(shelterClubId));
  if (!snap.exists()) throw new Error('Abrigo não encontrado.');
  return getRegistry(snap.data());
}

/**
 * Persiste a lista completa de documentos (aditivo, por caminho pontilhado) +
 * metadados, e audita (best-effort, não bloqueante).
 */
async function _writeItems(shelterClubId, actor, nextItems, audit) {
  await updateDoc(_clubRef(shelterClubId), {
    'documents.items': nextItems,
    'documents.updated_at': serverTimestamp(),
    'documents.updated_by_uid': actor.uid,
  });
  await createAuditLog({
    action: audit.action,
    actor,
    details: { shelter_club_id: shelterClubId, ...(audit.details || {}) },
  }).catch((err) => {
    logger.warn('shelterDocumentsService', { msg: 'audit failed (non-blocking)', err: String(err) });
  });
}

/** Localiza um documento no registry ou lança. */
function _requireDoc(registry, docId) {
  const found = findById(registry.items, docId);
  if (!found) throw new Error('Documento não encontrado.');
  return found;
}

/** Conteúdo canônico usado para o hash de uma versão. */
function _contentForHash(document) {
  if (isBodyCategory(document.category)) return document.body || '';
  return JSON.stringify(document.form_schema || { fields: [] });
}

// ─── CRUD de documentos ────────────────────────────────────────────────

/**
 * Cria um novo documento (rascunho). `input` = { category, title, description,
 * audience, legal_slugs, acceptance_required, body?, form_schema? }.
 */
export async function createDocument(shelterClubId, input, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  if (registry.items.length >= DOC_LIMITS.DOCUMENTS_MAX) {
    throw new Error('Limite de documentos atingido.');
  }
  const document = normalizeDocument({
    ...input,
    id: _mintId(shelterClubId),
    status: DOC_STATUS.DRAFT,
    current_version: 0,
    versions: [],
    created_by_uid: actor.uid,
    updated_by_uid: actor.uid,
  });
  if (!document.title) throw new Error('Informe o título do documento.');
  const next = upsertById(registry.items, document, DOC_LIMITS.DOCUMENTS_MAX);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_created',
    details: { document_id: document.id, category: document.category },
  });
  return document;
}

/**
 * Atualiza os METADADOS de um documento (título/descrição/público/vínculos/
 * exigência de aceite). Não cria versão nem toca no corpo/esquema.
 */
export async function updateDocumentMeta(shelterClubId, docId, patch, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  const current = _requireDoc(registry, docId);
  const merged = normalizeDocument({
    ...current,
    title: patch?.title ?? current.title,
    description: patch?.description ?? current.description,
    audience: patch?.audience ?? current.audience,
    legal_slugs: patch?.legal_slugs ?? current.legal_slugs,
    acceptance_required: patch?.acceptance_required ?? current.acceptance_required,
    id: docId,
    updated_by_uid: actor.uid,
  });
  if (!merged.title) throw new Error('Informe o título do documento.');
  const next = upsertById(registry.items, merged);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_meta_updated',
    details: { document_id: docId },
  });
  return merged;
}

/**
 * Salva o corpo (Markdown) de um documento de termos/contrato/política. Edição
 * de rascunho — não cria versão (a versão é criada em `publishDocument`).
 */
export async function saveBody(shelterClubId, docId, body, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  const current = _requireDoc(registry, docId);
  if (!isBodyCategory(current.category)) {
    throw new Error('Este documento não possui corpo editável.');
  }
  const merged = normalizeDocument({
    ...current,
    body: sanitizeText(body, DOC_LIMITS.BODY_MAX),
    id: docId,
    updated_by_uid: actor.uid,
  });
  const next = upsertById(registry.items, merged);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_body_saved',
    details: { document_id: docId },
  });
  return merged;
}

/**
 * Salva o esquema de um documento do tipo formulário (construtor de campos).
 * Edição de rascunho — não cria versão.
 */
export async function saveFormSchema(shelterClubId, docId, formSchema, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  const current = _requireDoc(registry, docId);
  if (isBodyCategory(current.category)) {
    throw new Error('Este documento não é um formulário.');
  }
  const merged = normalizeDocument({
    ...current,
    form_schema: normalizeFormSchema(formSchema),
    id: docId,
    updated_by_uid: actor.uid,
  });
  const next = upsertById(registry.items, merged);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_form_saved',
    details: { document_id: docId, fields: merged.form_schema.fields.length },
  });
  return merged;
}

/**
 * Publica uma nova versão IMUTÁVEL: calcula o `content_hash` (SHA-256) do
 * corpo/esquema atual e ANEXA uma versão à trilha (append-only). Marca o
 * documento como publicado. Versões anteriores nunca são reescritas.
 */
export async function publishDocument(shelterClubId, docId, options, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  const current = _requireDoc(registry, docId);

  const content = _contentForHash(current);
  if (!content || (isBodyCategory(current.category) && !current.body)) {
    throw new Error('Preencha o conteúdo antes de publicar.');
  }
  const contentHash = await computeDocumentHash(content);
  const version = nextVersionNumber(current.versions);
  const versions = appendVersion(current.versions, {
    version,
    content_hash: contentHash,
    change_summary: options?.change_summary,
    effective_date: options?.effective_date,
    published_at: new Date().toISOString(),
    published_by_uid: actor.uid,
    published_by_name: actor.displayName || '',
  });

  const merged = normalizeDocument({
    ...current,
    status: DOC_STATUS.PUBLISHED,
    current_version: version,
    versions,
    id: docId,
    updated_by_uid: actor.uid,
  });
  const next = upsertById(registry.items, merged);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_published',
    details: { document_id: docId, version, content_hash: contentHash },
  });
  return merged;
}

/** Arquiva um documento (mantém histórico de versões). */
export async function archiveDocument(shelterClubId, docId, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  const current = _requireDoc(registry, docId);
  const merged = normalizeDocument({
    ...current, status: DOC_STATUS.ARCHIVED, id: docId, updated_by_uid: actor.uid,
  });
  const next = upsertById(registry.items, merged);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_archived',
    details: { document_id: docId },
  });
  return merged;
}

/** Restaura um documento arquivado para rascunho. */
export async function restoreDocument(shelterClubId, docId, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  const current = _requireDoc(registry, docId);
  const merged = normalizeDocument({
    ...current, status: DOC_STATUS.DRAFT, id: docId, updated_by_uid: actor.uid,
  });
  const next = upsertById(registry.items, merged);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_restored',
    details: { document_id: docId },
  });
  return merged;
}

/**
 * Remove um documento do registry. Não afeta registros de aceite já emitidos
 * (que vivem em coleções próprias e guardam o hash imutável do que foi aceito).
 */
export async function deleteDocument(shelterClubId, docId, actor) {
  _assertActor(actor);
  const registry = await _loadRegistry(shelterClubId);
  _requireDoc(registry, docId);
  const next = removeById(registry.items, docId);
  await _writeItems(shelterClubId, actor, next, {
    action: 'shelter_document_deleted',
    details: { document_id: docId },
  });
  return { id: docId };
}

// ─── Analytics de aceite (leitura de coleções legíveis pelo abrigo) ──────

/** Lê (best-effort, com cap) uma subcoleção do clube; nunca lança. */
async function _readClubSub(shelterClubId, sub) {
  try {
    const snap = await getDocs(
      query(collection(db, CLUBS_COLLECTION, shelterClubId, sub), limit(ANALYTICS_READ_LIMIT)),
    );
    return snap.docs.map((d) => d.data() || {});
  } catch (err) {
    logger.warn('shelterDocumentsService', { msg: `analytics read failed for ${sub}`, err: String(err) });
    return [];
  }
}

/**
 * Computa métricas de aceite a partir de coleções que o abrigo já pode ler
 * (adoption_workflow, contracts, interviews). Retorna apenas contagens/datas —
 * nenhum PII é persistido ou exposto. Falhas de leitura (regra/rede) degradam
 * para zeros por coleção, sem quebrar a central.
 */
export async function getAcceptanceAnalytics(shelterClubId) {
  if (!shelterClubId) return computeAcceptanceAnalytics();
  const [adoptionApplications, contracts, interviews] = await Promise.all([
    _readClubSub(shelterClubId, 'adoption_workflow'),
    _readClubSub(shelterClubId, 'contracts'),
    _readClubSub(shelterClubId, 'interviews'),
  ]);
  return computeAcceptanceAnalytics({ adoptionApplications, contracts, interviews });
}
