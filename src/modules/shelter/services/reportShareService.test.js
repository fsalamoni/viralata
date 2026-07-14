/**
 * @fileoverview Tests do reportShareService (TASK-155).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAddDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockQuery = vi.fn(() => ({ _q: true }));
const mockWhere = vi.fn(() => ({ _w: true }));
const mockLimit = vi.fn(() => ({ _l: true }));
const mockCollection = vi.fn(() => ({ _c: true }));
const mockServerTimestamp = vi.fn(() => 'SERVER_TS');
const mockCreateAuditLog = vi.fn();

vi.mock('@/core/config/firebase', () => ({
  db: {},
}));

vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => Promise.resolve(mockCreateAuditLog(...args)),
}));

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => ({ _doc: true, ...args }),
  getDoc: vi.fn(),
  getDocs: (...args) => mockGetDocs(...args),
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: (...args) => mockQuery(...args),
  where: (...args) => mockWhere(...args),
  limit: (...args) => mockLimit(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

import {
  generateShareToken,
  buildShareUrl,
  createReportShare,
  revokeReportShare,
  recordReportShareView,
  reportShareInputSchema,
  DEFAULT_EXPIRATION_HOURS,
} from './reportShareService.js';

function makeActor() {
  return { uid: 'user-1', displayName: 'Maria' };
}

describe('reportShareService — generateShareToken (TASK-155)', () => {
  it('gera token com 32 chars', () => {
    const t = generateShareToken();
    expect(t).toHaveLength(32);
  });

  it('gera tokens únicos', () => {
    const tokens = new Set();
    for (let i = 0; i < 100; i++) tokens.add(generateShareToken());
    expect(tokens.size).toBe(100);
  });

  it('tokens são URL-safe (sem +, /, =)', () => {
    const t = generateShareToken();
    expect(t).not.toMatch(/[+/=]/);
  });
});

describe('reportShareService — buildShareUrl', () => {
  it('constrói URL com path /relatorio/:token', () => {
    const url = buildShareUrl('abc123def456');
    expect(url).toMatch(/\/relatorio\/abc123def456$/);
  });
});

describe('reportShareService — createReportShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'share-1' });
  });

  it('cria share com defaults (24h expiração)', async () => {
    const r = await createReportShare({
      report_type: 'rescues',
      report_params: { period: 'month' },
      shelter_club_id: 'shelter-1',
      shelter_name: 'Abrigo A',
    }, makeActor());

    expect(r.id).toBe('share-1');
    expect(r.token).toHaveLength(32);
    expect(r.url).toMatch(/\/relatorio\//);
    expect(r.expiresAt).toBeInstanceOf(Date);
    // 24h
    const diffMs = r.expiresAt.getTime() - Date.now();
    expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(diffMs).toBeLessThan(25 * 60 * 60 * 1000);
  });

  it('respeita expires_in_hours custom', async () => {
    const r = await createReportShare({
      report_type: 'adoptions',
      report_params: {},
      shelter_club_id: 'shelter-1',
      expires_in_hours: 1,
    }, makeActor());
    const diffMs = r.expiresAt.getTime() - Date.now();
    expect(diffMs).toBeLessThan(60 * 60 * 1100); // ~1h
  });

  it('grava audit log', async () => {
    await createReportShare({
      report_type: 'rescues',
      report_params: {},
      shelter_club_id: 'shelter-1',
    }, makeActor());
    expect(mockCreateAuditLog).toHaveBeenCalled();
  });

  it('rejeita expires_in_hours > 720 (30d)', async () => {
    await expect(createReportShare({
      report_type: 'rescues',
      report_params: {},
      shelter_club_id: 'shelter-1',
      expires_in_hours: 1000,
    }, makeActor())).rejects.toThrow();
  });
});

describe('reportShareService — recordReportShareView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna valid:true para share ativo', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'share-1',
        ref: { _id: 'share-1' },
        data: () => ({
          token: 'abc',
          is_revoked: false,
          expires_at: { toDate: () => futureDate },
          view_count: 0,
          shelter_club_id: 'shelter-1',
          report_type: 'rescues',
        }),
      }],
    });
    const r = await recordReportShareView('abc', { uid: 'viewer-1' });
    expect(r.valid).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalled();
  });

  it('retorna valid:false para share revogado', async () => {
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'share-1',
        data: () => ({ token: 'abc', is_revoked: true }),
      }],
    });
    const r = await recordReportShareView('abc');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('revoked');
  });

  it('retorna valid:false para share expirado', async () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000);
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'share-1',
        data: () => ({
          token: 'abc',
          is_revoked: false,
          expires_at: { toDate: () => pastDate },
          view_count: 0,
        }),
      }],
    });
    const r = await recordReportShareView('abc');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('expired');
  });

  it('retorna valid:false quando max_views atingido', async () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000);
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'share-1',
        data: () => ({
          token: 'abc',
          is_revoked: false,
          expires_at: { toDate: () => futureDate },
          view_count: 5,
          max_views: 5,
        }),
      }],
    });
    const r = await recordReportShareView('abc');
    expect(r.valid).toBe(false);
    expect(r.reason).toBe('max_views_reached');
  });

  it('retorna null para share inexistente', async () => {
    mockGetDocs.mockResolvedValueOnce({ empty: true, docs: [] });
    const r = await recordReportShareView('inexistente');
    expect(r).toBeNull();
  });
});

describe('reportShareService — revokeReportShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDocs.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'share-1',
        ref: { _id: 'share-1' },
        data: () => ({ token: 'abc', shelter_club_id: 'shelter-1' }),
      }],
    });
  });

  it('marca is_revoked=true', async () => {
    const r = await revokeReportShare('abc', makeActor());
    expect(r.revoked).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ is_revoked: true }),
    );
  });
});

describe('reportShareService — schema', () => {
  it('valida input correto', () => {
    const r = reportShareInputSchema.safeParse({
      report_type: 'rescues',
      shelter_club_id: 'shelter-1',
    });
    expect(r.success).toBe(true);
  });

  it('rejeita shelter_club_id vazio', () => {
    const r = reportShareInputSchema.safeParse({ report_type: 'r', shelter_club_id: '' });
    expect(r.success).toBe(false);
  });

  it('DEFAULT_EXPIRATION_HOURS é 24', () => {
    expect(DEFAULT_EXPIRATION_HOURS).toBe(24);
  });
});
