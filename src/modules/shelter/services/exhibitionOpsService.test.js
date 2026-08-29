/**
 * @fileoverview Testes do serviço de Operações de Vitrine (Fase 5 ·
 * SHELTER_EXHIBITION_OPS_V1). Verifica escrita ADITIVA por caminho pontilhado,
 * geração de ids, validações e trilha de auditoria — sem tocar campos da
 * vitrine nem exigir mudança nas regras.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockUpdateDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
let docCounter = 0;
const mockDoc = vi.fn((db, ...path) => {
  // doc(collectionRef) — sem segmento de path → gera um id
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
  updateDoc: (...args) => mockUpdateDoc(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));
vi.mock('@/core/lib/logger', () => ({ logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() } }));

const svc = await import('./exhibitionOpsService');

const CLUB = 'club1';
const EX = 'ex1';
const ACTOR = { uid: 'u1', displayName: 'Ana' };

function mockExhibition(ops) {
  mockGetDoc.mockResolvedValue({
    exists: () => true,
    id: EX,
    data: () => ({ shelter_club_id: CLUB, status: 'scheduled', ops }),
  });
}

beforeEach(() => {
  mockUpdateDoc.mockReset();
  mockGetDoc.mockReset();
  mockCreateAuditLog.mockReset();
  mockCreateAuditLog.mockResolvedValue(undefined);
  docCounter = 0;
});

describe('exhibitionOpsService', () => {
  describe('guards', () => {
    it('rejects when actor has no uid', async () => {
      await expect(svc.addChecklistItem(CLUB, EX, 'x', {})).rejects.toThrow(/actor\.uid/);
    });

    it('blocks cross-tenant access', async () => {
      mockGetDoc.mockResolvedValue({
        exists: () => true, id: EX, data: () => ({ shelter_club_id: 'other' }),
      });
      await expect(svc.addChecklistItem(CLUB, EX, 'x', ACTOR)).rejects.toThrow(/Cross-tenant/);
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('throws when exhibition not found', async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });
      await expect(svc.addChecklistItem(CLUB, EX, 'x', ACTOR)).rejects.toThrow(/não encontrada/);
    });
  });

  describe('planning', () => {
    it('updatePlanning writes dotted paths + meta and audits', async () => {
      mockExhibition({});
      await svc.updatePlanning(CLUB, EX, { venue_notes: 'Praça', budget_total: 1200 }, ACTOR);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch['ops.planning.venue_notes']).toBe('Praça');
      expect(patch['ops.planning.budget_total']).toBe(1200);
      expect(patch['ops.updated_by_uid']).toBe('u1');
      expect(patch['ops.updated_at']).toEqual({ _ts: true });
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'exhibition_ops_planning_updated' }),
      );
    });

    it('addChecklistItem generates id and appends', async () => {
      mockExhibition({ planning: { checklist: [{ id: 'c0', label: 'existente', done: false }] } });
      const item = await svc.addChecklistItem(CLUB, EX, 'Reservar praça', ACTOR);
      expect(item.id).toBe('gen-1');
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch['ops.planning.checklist']).toHaveLength(2);
      expect(patch['ops.planning.checklist'][1]).toMatchObject({ id: 'gen-1', label: 'Reservar praça', done: false });
    });

    it('addChecklistItem rejects empty label', async () => {
      mockExhibition({});
      await expect(svc.addChecklistItem(CLUB, EX, '   ', ACTOR)).rejects.toThrow(/Descreva/);
      expect(mockUpdateDoc).not.toHaveBeenCalled();
    });

    it('toggleChecklistItem sets done + done_at', async () => {
      mockExhibition({ planning: { checklist: [{ id: 'c1', label: 'x', done: false }] } });
      const item = await svc.toggleChecklistItem(CLUB, EX, 'c1', true, ACTOR);
      expect(item.done).toBe(true);
      expect(item.done_at).toBeTruthy();
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch['ops.planning.checklist'][0].done).toBe(true);
    });

    it('toggleChecklistItem throws for unknown id', async () => {
      mockExhibition({ planning: { checklist: [] } });
      await expect(svc.toggleChecklistItem(CLUB, EX, 'nope', true, ACTOR)).rejects.toThrow(/não encontrado/);
    });

    it('removeChecklistItem filters the list', async () => {
      mockExhibition({ planning: { checklist: [{ id: 'c1', label: 'x', done: false }, { id: 'c2', label: 'y', done: false }] } });
      await svc.removeChecklistItem(CLUB, EX, 'c1', ACTOR);
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch['ops.planning.checklist']).toEqual([{ id: 'c2', label: 'y', done: false }]);
    });
  });

  describe('logistics', () => {
    it('addLogisticsItem normalizes category/cost and appends', async () => {
      mockExhibition({ logistics: [] });
      const item = await svc.addLogisticsItem(CLUB, EX, { category: 'transport', label: 'Van', cost: '300,50' }, ACTOR);
      expect(item).toMatchObject({ id: 'gen-1', category: 'transport', label: 'Van', cost: 300.5, status: 'pending' });
      const patch = mockUpdateDoc.mock.calls[0][1];
      expect(patch['ops.logistics']).toHaveLength(1);
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'exhibition_ops_logistics_added' }),
      );
    });

    it('addLogisticsItem defaults invalid category to other', async () => {
      mockExhibition({ logistics: [] });
      const item = await svc.addLogisticsItem(CLUB, EX, { category: 'weird', label: 'Coisa' }, ACTOR);
      expect(item.category).toBe('other');
    });

    it('updateLogisticsItem preserves id and merges patch', async () => {
      mockExhibition({ logistics: [{ id: 'l1', category: 'food', label: 'Ração', cost: 100, status: 'pending' }] });
      const item = await svc.updateLogisticsItem(CLUB, EX, 'l1', { status: 'arranged' }, ACTOR);
      expect(item).toMatchObject({ id: 'l1', status: 'arranged', label: 'Ração' });
    });

    it('updateLogisticsItem throws for unknown id', async () => {
      mockExhibition({ logistics: [] });
      await expect(svc.updateLogisticsItem(CLUB, EX, 'x', { status: 'done' }, ACTOR)).rejects.toThrow(/não encontrado/);
    });

    it('removeLogisticsItem filters', async () => {
      mockExhibition({ logistics: [{ id: 'l1', category: 'food', label: 'x', cost: 0, status: 'pending' }] });
      await svc.removeLogisticsItem(CLUB, EX, 'l1', ACTOR);
      expect(mockUpdateDoc.mock.calls[0][1]['ops.logistics']).toEqual([]);
    });
  });

  describe('health', () => {
    it('addHealthTask normalizes type/status', async () => {
      mockExhibition({ health: [] });
      const item = await svc.addHealthTask(CLUB, EX, { pet_id: 'p1', pet_name: 'Rex', type: 'vaccine' }, ACTOR);
      expect(item).toMatchObject({ id: 'gen-1', pet_id: 'p1', type: 'vaccine', status: 'pending' });
      expect(mockUpdateDoc.mock.calls[0][1]['ops.health']).toHaveLength(1);
    });

    it('updateHealthTask changes status', async () => {
      mockExhibition({ health: [{ id: 'h1', pet_id: 'p1', pet_name: 'Rex', type: 'vaccine', status: 'pending' }] });
      const item = await svc.updateHealthTask(CLUB, EX, 'h1', { status: 'done' }, ACTOR);
      expect(item.status).toBe('done');
    });

    it('removeHealthTask filters', async () => {
      mockExhibition({ health: [{ id: 'h1', pet_id: 'p1', pet_name: 'Rex', type: 'vaccine', status: 'pending' }] });
      await svc.removeHealthTask(CLUB, EX, 'h1', ACTOR);
      expect(mockUpdateDoc.mock.calls[0][1]['ops.health']).toEqual([]);
    });
  });

  describe('adoption', () => {
    it('addAdoptionEntry requires applicant name', async () => {
      mockExhibition({ adoption: [] });
      await expect(svc.addAdoptionEntry(CLUB, EX, { pet_name: 'Rex' }, ACTOR)).rejects.toThrow(/interessado/);
    });

    it('addAdoptionEntry defaults stage to interested', async () => {
      mockExhibition({ adoption: [] });
      const item = await svc.addAdoptionEntry(CLUB, EX, { applicant_name: 'João', pet_name: 'Rex' }, ACTOR);
      expect(item).toMatchObject({ id: 'gen-1', applicant_name: 'João', stage: 'interested' });
      expect(item.created_at).toBeTruthy();
    });

    it('updateAdoptionEntry changes stage but preserves created_at', async () => {
      mockExhibition({ adoption: [{ id: 'a1', applicant_name: 'João', stage: 'interested', created_at: '2026-09-01T00:00:00.000Z' }] });
      const item = await svc.updateAdoptionEntry(CLUB, EX, 'a1', { stage: 'meeting' }, ACTOR);
      expect(item.stage).toBe('meeting');
      expect(item.created_at).toBe('2026-09-01T00:00:00.000Z');
    });

    it('updateAdoptionEntry coerces invalid stage to interested', async () => {
      mockExhibition({ adoption: [{ id: 'a1', applicant_name: 'João', stage: 'meeting', created_at: '2026-09-01T00:00:00.000Z' }] });
      const item = await svc.updateAdoptionEntry(CLUB, EX, 'a1', { stage: 'bogus' }, ACTOR);
      expect(item.stage).toBe('interested');
    });

    it('removeAdoptionEntry filters', async () => {
      mockExhibition({ adoption: [{ id: 'a1', applicant_name: 'João', stage: 'interested', created_at: '2026-09-01T00:00:00.000Z' }] });
      await svc.removeAdoptionEntry(CLUB, EX, 'a1', ACTOR);
      expect(mockUpdateDoc.mock.calls[0][1]['ops.adoption']).toEqual([]);
    });
  });
});
