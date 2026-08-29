/**
 * @fileoverview Testes do serviço da Central de Documentos (Fase 6 ·
 * SHELTER_DOCUMENTS_V1). Verifica escrita ADITIVA por caminho pontilhado no doc
 * do clube, geração de ids, versionamento append-only imutável, hash SHA-256 e
 * trilha de auditoria — sem tocar em outros campos do clube nem exigir mudança
 * nas regras.
 */

import {
  describe, it, expect, beforeEach, vi,
} from 'vitest';

const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
let docCounter = 0;
const mockDoc = vi.fn((db, ...path) => {
  if (path.length === 0) {
    docCounter += 1;
    return { _path: `gen-${docCounter}`, id: `gen-${docCounter}` };
  }
  return { _path: path.join('/'), id: path[path.length - 1] };
});
const mockServerTimestamp = vi.fn(() => ({ _ts: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  query: (...args) => ({ _query: args }),
  limit: (n) => ({ _limit: n }),
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));
vi.mock('@/core/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const svc = await import('./shelterDocumentsService');

const CLUB = 'club1';
const ACTOR = { uid: 'u1', displayName: 'Ana' };

function mockClub(documents) {
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    id: CLUB,
    data: () => ({ name: 'Abrigo', created_by: 'owner1', documents }),
  });
}

/** Captura a lista `documents.items` do último updateDoc. */
function lastItems() {
  const call = mockUpdateDoc.mock.calls[mockUpdateDoc.mock.calls.length - 1];
  return call[1]['documents.items'];
}

beforeEach(() => {
  mockUpdateDoc.mockReset();
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockCreateAuditLog.mockReset();
  mockCreateAuditLog.mockResolvedValue(undefined);
  docCounter = 0;
});

describe('shelterDocumentsService', () => {
  describe('guards', () => {
    it('rejects when actor has no uid', async () => {
      await expect(svc.createDocument(CLUB, {}, {})).rejects.toThrow(/actor\.uid/);
    });

    it('throws when club not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      await expect(svc.createDocument(CLUB, { title: 'X' }, ACTOR)).rejects.toThrow(/não encontrado/);
    });

    it('throws when document not found', async () => {
      mockClub({ items: [] });
      await expect(svc.saveBody(CLUB, 'missing', 'x', ACTOR)).rejects.toThrow(/não encontrado/);
    });
  });

  describe('createDocument', () => {
    it('creates a draft with a minted id and writes via dot-path', async () => {
      mockClub({ items: [] });
      const created = await svc.createDocument(CLUB, {
        category: 'terms', title: 'Termo do abrigo', audience: ['adopter'],
      }, ACTOR);
      expect(created.id).toBe('gen-1');
      expect(created.status).toBe('draft');
      expect(created.current_version).toBe(0);
      const call = mockUpdateDoc.mock.calls[0][1];
      expect(call).toHaveProperty('documents.items');
      expect(call).toHaveProperty('documents.updated_at');
      expect(call).toHaveProperty('documents.updated_by_uid', 'u1');
      // NÃO grava created_by nem outros campos do clube
      expect(call).not.toHaveProperty('created_by');
      expect(call).not.toHaveProperty('name');
      expect(mockCreateAuditLog).toHaveBeenCalledWith(expect.objectContaining({ action: 'shelter_document_created' }));
    });

    it('rejects an empty title', async () => {
      mockClub({ items: [] });
      await expect(svc.createDocument(CLUB, { category: 'terms', title: '' }, ACTOR)).rejects.toThrow(/título/);
    });

    it('enforces the document cap', async () => {
      const items = Array.from({ length: 25 }, (_, i) => ({ id: `d${i}`, category: 'policy', title: `D${i}` }));
      mockClub({ items });
      await expect(svc.createDocument(CLUB, { category: 'policy', title: 'Extra' }, ACTOR)).rejects.toThrow(/Limite/);
    });
  });

  describe('saveBody / saveFormSchema', () => {
    it('saves a sanitized body for a terms doc', async () => {
      mockClub({ items: [{ id: 'd1', category: 'terms', title: 'T', status: 'draft' }] });
      const out = await svc.saveBody(CLUB, 'd1', '<script>x()</script># Termo', ACTOR);
      expect(out.body).toBe('x()# Termo');
      expect(out.body).not.toContain('<script>');
    });

    it('rejects saveBody on a form document', async () => {
      mockClub({ items: [{ id: 'f1', category: 'form', title: 'F', status: 'draft' }] });
      await expect(svc.saveBody(CLUB, 'f1', 'x', ACTOR)).rejects.toThrow(/não possui corpo/);
    });

    it('saves a form schema for a form doc', async () => {
      mockClub({ items: [{ id: 'f1', category: 'form', title: 'F', status: 'draft' }] });
      const out = await svc.saveFormSchema(CLUB, 'f1', {
        fields: [{ id: 'nome', type: 'text', label: 'Nome' }],
      }, ACTOR);
      expect(out.form_schema.fields).toHaveLength(1);
    });

    it('rejects saveFormSchema on a terms document', async () => {
      mockClub({ items: [{ id: 'd1', category: 'terms', title: 'T', status: 'draft' }] });
      await expect(svc.saveFormSchema(CLUB, 'd1', { fields: [] }, ACTOR)).rejects.toThrow(/não é um formulário/);
    });
  });

  describe('publishDocument (immutable versioning)', () => {
    it('appends version 1 with a sha256 hash and marks published', async () => {
      mockClub({ items: [{ id: 'd1', category: 'terms', title: 'T', status: 'draft', body: '# Termo' }] });
      const out = await svc.publishDocument(CLUB, 'd1', { change_summary: 'Primeira versão' }, ACTOR);
      expect(out.status).toBe('published');
      expect(out.current_version).toBe(1);
      expect(out.versions).toHaveLength(1);
      expect(out.versions[0].version).toBe(1);
      expect(out.versions[0].content_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(out.versions[0].published_by_uid).toBe('u1');
    });

    it('refuses to publish an empty body', async () => {
      mockClub({ items: [{ id: 'd1', category: 'terms', title: 'T', status: 'draft', body: '' }] });
      await expect(svc.publishDocument(CLUB, 'd1', {}, ACTOR)).rejects.toThrow(/Preencha o conteúdo/);
    });

    it('appends a NEW version on republish and keeps the previous one intact', async () => {
      mockClub({
        items: [{
          id: 'd1',
          category: 'terms',
          title: 'T',
          status: 'published',
          body: '# Termo v2',
          current_version: 1,
          versions: [{ version: 1, content_hash: 'sha256:orig', published_at: '2026-01-01T00:00:00.000Z' }],
        }],
      });
      const out = await svc.publishDocument(CLUB, 'd1', { change_summary: 'Ajuste' }, ACTOR);
      expect(out.current_version).toBe(2);
      expect(out.versions).toHaveLength(2);
      // versão anterior permanece inalterada (imutabilidade)
      const v1 = out.versions.find((v) => v.version === 1);
      expect(v1.content_hash).toBe('sha256:orig');
    });

    it('produces different hashes for different content', async () => {
      mockClub({ items: [{ id: 'a', category: 'terms', title: 'A', status: 'draft', body: 'conteudo A' }] });
      const a = await svc.publishDocument(CLUB, 'a', {}, ACTOR);
      mockClub({ items: [{ id: 'b', category: 'terms', title: 'B', status: 'draft', body: 'conteudo B' }] });
      const b = await svc.publishDocument(CLUB, 'b', {}, ACTOR);
      expect(a.versions[0].content_hash).not.toBe(b.versions[0].content_hash);
    });
  });

  describe('meta / lifecycle', () => {
    it('updates metadata without creating a version', async () => {
      mockClub({
        items: [{
          id: 'd1', category: 'terms', title: 'T', status: 'published', current_version: 1, versions: [{ version: 1, content_hash: 'sha256:x' }],
        }],
      });
      const out = await svc.updateDocumentMeta(CLUB, 'd1', { title: 'Novo título', audience: ['volunteer'] }, ACTOR);
      expect(out.title).toBe('Novo título');
      expect(out.audience).toEqual(['volunteer']);
      expect(out.versions).toHaveLength(1); // inalterado
    });

    it('archives, restores and deletes', async () => {
      mockClub({ items: [{ id: 'd1', category: 'policy', title: 'P', status: 'published' }] });
      const archived = await svc.archiveDocument(CLUB, 'd1', ACTOR);
      expect(archived.status).toBe('archived');

      mockClub({ items: [{ id: 'd1', category: 'policy', title: 'P', status: 'archived' }] });
      const restored = await svc.restoreDocument(CLUB, 'd1', ACTOR);
      expect(restored.status).toBe('draft');

      mockClub({ items: [{ id: 'd1', category: 'policy', title: 'P', status: 'archived' }, { id: 'd2', category: 'policy', title: 'Q' }] });
      await svc.deleteDocument(CLUB, 'd1', ACTOR);
      expect(lastItems().map((d) => d.id)).toEqual(['d2']);
    });
  });

  describe('getAcceptanceAnalytics', () => {
    it('aggregates from club-readable collections', async () => {
      // adoption_workflow, contracts, interviews (nesta ordem de chamada)
      mockGetDocs
        .mockResolvedValueOnce({ docs: [{ data: () => ({ terms_accepted_at: '2026-08-01T00:00:00.000Z' }) }, { data: () => ({}) }] })
        .mockResolvedValueOnce({ docs: [{ data: () => ({ status: 'fully_signed' }) }] })
        .mockResolvedValueOnce({ docs: [{ data: () => ({ status: 'completed' }) }] });
      const out = await svc.getAcceptanceAnalytics(CLUB);
      expect(out.adoption.termsAccepted).toBe(1);
      expect(out.contracts.fullySigned).toBe(1);
      expect(out.interviews.completed).toBe(1);
      expect(out.totalAcceptances).toBe(2);
    });

    it('degrades to zeros when a read is denied', async () => {
      mockGetDocs.mockRejectedValue(new Error('permission-denied'));
      const out = await svc.getAcceptanceAnalytics(CLUB);
      expect(out.totalAcceptances).toBe(0);
    });
  });
});
