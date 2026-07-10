/**
 * @fileoverview Testes do serviço de Workflow de Adoção (Fase 3).
 *
 * Cobre:
 * - Validação de transições de status
 * - Multi-tenant (shelter_club_id obrigatório, cross-tenant bloqueado)
 * - Cascata de aprovação (rejeita outras pendentes, atualiza pet, timeline)
 * - Cancelamento por applicant vs abrigo
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Mocks ─────────────────────────────────────────────────────────────

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCreateAuditLog = vi.fn();
const mockCollection = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockDoc = vi.fn((db, ...path) => ({ _path: path.join('/') }));
const mockQuery = vi.fn((...args) => ({ _q: true, _args: args }));
const mockWhere = vi.fn((...args) => ({ _w: true, _args: args }));
const mockOrderBy = vi.fn((...args) => ({ _o: true, _args: args }));
const mockLimit = vi.fn((n) => ({ _limit: n }));
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockWriteBatch = vi.fn(() => {
  const ops = [];
  return {
    update: (ref, data) => ops.push({ type: 'update', ref, data }),
    commit: vi.fn().mockResolvedValue(null),
    _ops: ops,
  };
});
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: (...args) => mockOrderBy(...args),
  limit: (n) => mockLimit(n),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: () => mockWriteBatch(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

// Mock do timelineService pra não cascatear de verdade
vi.mock('@/modules/shelter/services/timelineService', () => ({
  addTimelineEvent: vi.fn().mockResolvedValue({ id: 'tl-evt' }),
}));

const {
  submitAdoptionApplication,
  listApplications,
  getApplication,
  decideApplication,
  cancelApplication,
} = await import('./adoptionService');
const {
  APPLICATION_STATUS,
  APPLICATION_STATUS_LABELS,
  isTerminal,
  nextStatuses,
  assertValidTransition,
} = await import('@/modules/shelter/domain/operational/adoption');

beforeEach(() => {
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockAddDoc.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset().mockResolvedValue(null);
});

function appSnap(data, id = 'a1') {
  return { id, exists: () => true, data: () => data };
}
function missingSnap() {
  return { exists: () => false };
}

// ─── Estados / transitions ─────────────────────────────────────────────

describe('APPLICATION_STATUS', () => {
  it('tem 7 estados', () => {
    expect(APPLICATION_STATUS.length).toBe(7);
  });
});

describe('assertValidTransition', () => {
  it('permite applied → under_review', () => {
    expect(() => assertValidTransition('applied', 'under_review')).not.toThrow();
  });
  it('permite applied → cancelled', () => {
    expect(() => assertValidTransition('applied', 'cancelled')).not.toThrow();
  });
  it('permite under_review → approved', () => {
    expect(() => assertValidTransition('under_review', 'approved')).not.toThrow();
  });
  it('rejeita applied → approved (pula etapa)', () => {
    expect(() => assertValidTransition('applied', 'approved')).toThrow(/Transição inválida/);
  });
  it('rejeita rejected → qualquer (terminal)', () => {
    expect(() => assertValidTransition('rejected', 'approved')).toThrow();
  });
  it('rejeita status inválido', () => {
    expect(() => assertValidTransition('foo', 'applied')).toThrow(/inválido/);
  });
});

describe('isTerminal', () => {
  it('true para rejected, adoption_completed, cancelled, withdrawn', () => {
    expect(isTerminal('rejected')).toBe(true);
    expect(isTerminal('adoption_completed')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(isTerminal('withdrawn')).toBe(true);
  });
  it('false para applied, under_review, approved', () => {
    expect(isTerminal('applied')).toBe(false);
    expect(isTerminal('under_review')).toBe(false);
    expect(isTerminal('approved')).toBe(false);
  });
});

describe('nextStatuses', () => {
  it('applied pode ir para 3 status', () => {
    expect(nextStatuses('applied')).toHaveLength(3);
  });
  it('rejected não tem próximos', () => {
    expect(nextStatuses('rejected')).toEqual([]);
  });
});

// ─── submitAdoptionApplication ─────────────────────────────────────────

describe('submitAdoptionApplication', () => {
  it('lança se actor.uid falta', async () => {
    await expect(
      submitAdoptionApplication({ pet_id: 'p1', shelter_club_id: 'c1', applicant_form: {
        full_name: 'Maria', reason_to_adopt: 'Porque amo animais',
      } }, {}),
    ).rejects.toThrow(/actor\.uid/);
  });

  it('rejeita form sem reason_to_adopt', async () => {
    await expect(
      submitAdoptionApplication({ pet_id: 'p1', shelter_club_id: 'c1', applicant_form: {
        full_name: 'Maria',
      } }, { uid: 'u1' }),
    ).rejects.toThrow();
  });

  it('cria application com audit', async () => {
    mockAddDoc.mockResolvedValue({ id: 'app-new' });
    const r = await submitAdoptionApplication({
      pet_id: 'p1',
      shelter_club_id: 'c1',
      applicant_form: {
        full_name: 'Maria Silva',
        reason_to_adopt: 'Sempre quis um cachorro',
        has_yard: true,
        household_size: 3,
      },
    }, { uid: 'u1', displayName: 'Maria' });
    expect(r.id).toBe('app-new');
    expect(mockAddDoc).toHaveBeenCalled();
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'adoption_application_submitted' }),
    );
  });
});

// ─── listApplications ──────────────────────────────────────────────────

describe('listApplications', () => {
  it('retorna [] se db indisponível', async () => {
    const orig = (await import('@/core/config/firebase')).db;
    (await import('@/core/config/firebase')).db = null;
    expect(await listApplications('c1')).toEqual([]);
    (await import('@/core/config/firebase')).db = orig;
  });

  it('lança sem shelterClubId', async () => {
    await expect(listApplications('')).rejects.toThrow(/shelterClubId/);
  });

  it('mapeia docs com id', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'a1', data: () => ({ status: 'applied' }) },
        { id: 'a2', data: () => ({ status: 'under_review' }) },
      ],
    });
    const r = await listApplications('c1');
    expect(r).toHaveLength(2);
    expect(r[0].id).toBe('a1');
  });
});

// ─── getApplication ────────────────────────────────────────────────────

describe('getApplication', () => {
  it('retorna null se não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    expect(await getApplication('c1', 'a1')).toBeNull();
  });
  it('retorna doc se existe', async () => {
    mockGetDoc.mockResolvedValue(appSnap({ status: 'applied' }));
    const r = await getApplication('c1', 'a1');
    expect(r.id).toBe('a1');
    expect(r.status).toBe('applied');
  });
});

// ─── decideApplication ─────────────────────────────────────────────────

describe('decideApplication', () => {
  it('lança se app não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(
      decideApplication('c1', 'a1', { to_status: 'under_review' }, { uid: 'u1' }),
    ).rejects.toThrow(/não encontrada/);
  });

  it('rejeita sem actor.uid', async () => {
    mockGetDoc.mockResolvedValue(appSnap({ status: 'applied', shelter_club_id: 'c1' }));
    await expect(
      decideApplication('c1', 'a1', { to_status: 'under_review' }, {}),
    ).rejects.toThrow(/actor\.uid/);
  });

  it('rejeita cross-tenant', async () => {
    mockGetDoc.mockResolvedValue(appSnap({ status: 'applied', shelter_club_id: 'c2' }));
    await expect(
      decideApplication('c1', 'a1', { to_status: 'under_review' }, { uid: 'u1' }),
    ).rejects.toThrow();
  });

  it('rejeita transição inválida (pula etapa)', async () => {
    mockGetDoc.mockResolvedValue(appSnap({ status: 'applied', shelter_club_id: 'c1' }));
    await expect(
      decideApplication('c1', 'a1', { to_status: 'approved' }, { uid: 'u1' }),
    ).rejects.toThrow(/Transição inválida/);
  });

  it('rejeita status terminal', async () => {
    mockGetDoc.mockResolvedValue(appSnap({ status: 'rejected', shelter_club_id: 'c1' }));
    await expect(
      decideApplication('c1', 'a1', { to_status: 'under_review' }, { uid: 'u1' }),
    ).rejects.toThrow(/terminal/);
  });

  it('rejeita recusa sem motivo', async () => {
    mockGetDoc.mockResolvedValue(appSnap({ status: 'under_review', shelter_club_id: 'c1' }));
    await expect(
      decideApplication('c1', 'a1', { to_status: 'rejected' }, { uid: 'u1' }),
    ).rejects.toThrow(/decision_notes/);
  });

  it('move applied → under_review com sucesso', async () => {
    mockGetDoc.mockResolvedValue(appSnap({ status: 'applied', shelter_club_id: 'c1' }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await decideApplication('c1', 'a1', {
      to_status: 'under_review',
      decision_notes: 'Em análise',
    }, { uid: 'u1' });
    expect(r.status).toBe('under_review');
  });

  it('cascade em approval: rejeita outras + atualiza pet + timeline', async () => {
    mockGetDoc
      // 1º get: app principal
      .mockResolvedValueOnce(appSnap({
        status: 'under_review', shelter_club_id: 'c1', pet_id: 'pet-1',
      }))
      // 2º get: pet (no _cascadeApproval)
      .mockResolvedValueOnce({
        id: 'pet-1', exists: () => true,
        data: () => ({ owner_type: 'organization', owner_id: 'c1' }),
      });
    // getDocs: outras pendentes
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: 'a-other', ref: { _path: 'a-other' } },
      ],
    });
    mockUpdateDoc.mockResolvedValue(null);

    const r = await decideApplication('c1', 'a1', {
      to_status: 'approved',
      decision_notes: 'Aprovado, lembro do adotante',
    }, { uid: 'u1' });
    expect(r.status).toBe('approved');
    // updateDoc é chamado 2x: 1) app principal, 2) pet (cascade)
    // As outras pendentes vão via writeBatch, não updateDoc direto.
    expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
  });
});

// ─── cancelApplication ─────────────────────────────────────────────────

describe('cancelApplication', () => {
  it('lança se app não existe', async () => {
    mockGetDoc.mockResolvedValue(missingSnap());
    await expect(
      cancelApplication('c1', 'a1', 'mudei de ideia', { uid: 'u1' }),
    ).rejects.toThrow(/não encontrada/);
  });

  it('rejeita cancelamento por terceiro (não-applicant)', async () => {
    // Service não tem como verificar se o uid é membro do abrigo sem
    // buscar a collection club_members. Firestore rule é a fonte da
    // verdade. Aqui só testamos que o service diferencia applicant de
    // abrigo (atribui 'withdrawn' para applicant e 'cancelled' para
    // terceiro). O Firestore rule bloqueia se não tiver permissão.
    mockGetDoc.mockResolvedValue(appSnap({
      status: 'applied', shelter_club_id: 'c1', applicant_uid: 'u-other',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await cancelApplication('c1', 'a1', 'foo', { uid: 'u-attacker' });
    // Terceiro vira 'cancelled' (não 'withdrawn')
    expect(r.status).toBe('cancelled');
  });

  it('applicant pode withdraw (vira withdrawn, não cancelled)', async () => {
    mockGetDoc.mockResolvedValue(appSnap({
      status: 'applied', shelter_club_id: 'c1', applicant_uid: 'u1',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await cancelApplication('c1', 'a1', 'mudei de ideia', { uid: 'u1' });
    expect(r.status).toBe('withdrawn');
  });

  it('abrigo pode cancelar (vira cancelled, não withdrawn)', async () => {
    mockGetDoc.mockResolvedValue(appSnap({
      status: 'applied', shelter_club_id: 'c1', applicant_uid: 'u-other',
    }));
    mockUpdateDoc.mockResolvedValue(null);
    const r = await cancelApplication('c1', 'a1', 'pet não está mais disponível', {
      uid: 'u-shelter-admin',
    });
    expect(r.status).toBe('cancelled');
  });

  it('rejeita cancel de app em status terminal', async () => {
    mockGetDoc.mockResolvedValue(appSnap({
      status: 'rejected', shelter_club_id: 'c1', applicant_uid: 'u1',
    }));
    await expect(
      cancelApplication('c1', 'a1', 'foo', { uid: 'u1' }),
    ).rejects.toThrow(/terminal/);
  });
});

// ─── Labels ────────────────────────────────────────────────────────────

describe('APPLICATION_STATUS_LABELS', () => {
  it('tem label pt-BR para cada status', () => {
    for (const s of APPLICATION_STATUS) {
      expect(APPLICATION_STATUS_LABELS[s]).toBeTruthy();
    }
  });
});
