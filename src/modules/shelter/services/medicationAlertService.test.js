/**
 * @fileoverview Tests do medicationAlertService (TASK-139).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGetDocs = vi.fn();
const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockQuery = vi.fn((...args) => ({ _q: args }));
const mockWhere = vi.fn((...args) => ({ _w: args }));
const mockCollection = vi.fn(() => ({ _c: true }));
const mockDoc = vi.fn(() => ({ _doc: true }));
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');

vi.mock('@/core/config/firebase', () => ({ db: {} }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock('@/core/services/auditService', () => ({ createAuditLog: vi.fn() }));
vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  orderBy: () => ({ _o: true }),
  limit: (n) => ({ _l: n }),
  serverTimestamp: () => mockServerTimestamp(),
}));

import {
  getUpcomingDosesInWindow,
  processAlerts,
  createDoseAlert,
} from './medicationAlertService.js';

function makePetDoc(id, data) {
  return { id, data: () => data };
}

describe('medicationAlertService — getUpcomingDosesInWindow (TASK-139)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna [] sem db', async () => {
    const r = await getUpcomingDosesInWindow('s1', 30);
    expect(r).toEqual([]);
  });

  it('lista doses futuras do abrigo', async () => {
    const future = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    // 1ª chamada: pets do abrigo
    mockGetDocs.mockResolvedValueOnce({
      docs: [makePetDoc('p1', { name: 'Rex', shelter_owner_club_id: 's1' })],
    });
    // 2ª: medications ativas
    mockGetDocs.mockResolvedValueOnce({
      docs: [makePetDoc('m1', { status: 'active', medication: 'Antibiótico' })],
    });
    // 3ª: doses pendentes
    mockGetDocs.mockResolvedValueOnce({
      docs: [{
        id: 'd1',
        data: () => ({
          scheduled_at: future,
          administered_at: null,
          skipped: false,
        }),
      }],
    });
    const r = await getUpcomingDosesInWindow('s1', 30);
    expect(r).toHaveLength(1);
    expect(r[0].petId).toBe('p1');
    expect(r[0].medId).toBe('m1');
    expect(r[0].doseId).toBe('d1');
  });

  it('ignora doses já alertadas', async () => {
    const future = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    mockGetDocs.mockResolvedValueOnce({
      docs: [makePetDoc('p1', { name: 'Rex', shelter_owner_club_id: 's1' })],
    });
    mockGetDocs.mockResolvedValueOnce({
      docs: [makePetDoc('m1', { status: 'active', medication: 'X' })],
    });
    mockGetDocs.mockResolvedValueOnce({
      docs: [{
        id: 'd1',
        data: () => ({
          scheduled_at: future,
          administered_at: null,
          skipped: false,
          alerted_at: '2026-07-13',  // já alertado
        }),
      }],
    });
    const r = await getUpcomingDosesInWindow('s1', 30);
    expect(r).toEqual([]);
  });

  it('ignora doses passadas', async () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    mockGetDocs.mockResolvedValueOnce({
      docs: [makePetDoc('p1', { shelter_owner_club_id: 's1' })],
    });
    mockGetDocs.mockResolvedValueOnce({
      docs: [makePetDoc('m1', { status: 'active' })],
    });
    mockGetDocs.mockResolvedValueOnce({
      docs: [{
        id: 'd1',
        data: () => ({
          scheduled_at: past,
          administered_at: null,
          skipped: false,
        }),
      }],
    });
    const r = await getUpcomingDosesInWindow('s1', 30);
    expect(r).toEqual([]);
  });

  it('retorna [] em caso de erro', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('permission denied'));
    const r = await getUpcomingDosesInWindow('s1', 30);
    expect(r).toEqual([]);
  });
});

describe('medicationAlertService — processAlerts (TASK-139)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna contadores', async () => {
    mockGetDocs.mockResolvedValue({ docs: [] });
    const r = await processAlerts('s1', 30, { uid: 'u1' });
    expect(r.alertsCreated).toBe(0);
    expect(r.dosesMarked).toBe(0);
  });
});
