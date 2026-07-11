/**
 * @fileoverview Testes do adminUsersService — Fase 21.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockUpdateDoc = vi.fn();
const mockCollection = vi.fn(() => ({
  where: vi.fn(() => ({
    get: mockGetDocs,
  })),
  doc: vi.fn(() => ({ update: mockUpdateDoc })),
}));
const mockDoc = vi.fn(() => ({ update: mockUpdateDoc, get: mockGetDoc }));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  query: (...args) => ({ __query: true, args }),
  where: (...args) => ({ __where: true, args }),
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));

vi.mock('@/core/config/firebase', () => ({ db: { __db: true } }));
vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

const mockCreateAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/core/services/auditService', () => ({
  createAuditLog: (...args) => mockCreateAuditLog(...args),
}));

const {
  isPlatformOwnerEmail,
  assertIsPlatformOwner,
  promoteToAdmin,
  demoteFromAdmin,
  listPlatformAdmins,
  PLATFORM_OWNER_EMAIL,
} = await import('./adminUsersService.js');

const OWNER = { uid: 'owner-1', email: PLATFORM_OWNER_EMAIL, displayName: 'Owner' };
const NON_OWNER_ADMIN = { uid: 'other-admin', email: 'someone@example.com', displayName: 'Other' };

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDoc.mockReset();
  mockGetDocs.mockReset();
  mockUpdateDoc.mockReset();
  mockCreateAuditLog.mockReset();
  mockCreateAuditLog.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
});

describe('isPlatformOwnerEmail / assertIsPlatformOwner', () => {
  it('reconhece o e-mail bootstrap', () => {
    expect(isPlatformOwnerEmail(PLATFORM_OWNER_EMAIL)).toBe(true);
    expect(isPlatformOwnerEmail('FSALAMONI@GMAIL.COM')).toBe(true);
  });

  it('rejeita outros e-mails', () => {
    expect(isPlatformOwnerEmail('someone@example.com')).toBe(false);
    expect(isPlatformOwnerEmail(undefined)).toBe(false);
  });

  it('assertIsPlatformOwner lança erro se não for owner', () => {
    expect(() => assertIsPlatformOwner(NON_OWNER_ADMIN)).toThrow(/dono fixo/);
  });

  it('assertIsPlatformOwner aceita o owner', () => {
    expect(() => assertIsPlatformOwner(OWNER)).not.toThrow();
  });
});

describe('promoteToAdmin', () => {
  it('lança NOT_PLATFORM_OWNER se actor não for owner', async () => {
    await expect(promoteToAdmin('target-1', NON_OWNER_ADMIN))
      .rejects.toMatchObject({ code: 'NOT_PLATFORM_OWNER' });
  });

  it('é idempotente quando o actor promove a si mesmo (já é admin)', async () => {
    const result = await promoteToAdmin(OWNER.uid, OWNER);
    expect(result).toEqual({ ok: true, already: true });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('promove e grava audit log', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'user', email: 'target@example.com', full_name: 'Target' }),
    });
    const result = await promoteToAdmin('target-1', OWNER);
    expect(result).toEqual({ ok: true, already: false });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload.role).toBe('platform_admin');
    expect(payload.promoted_by).toBe(OWNER.uid);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'platform_admin_promoted', userId: 'target-1' }),
    );
  });

  it('retorna already=true se alvo já é admin', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'platform_admin', email: 'target@example.com' }),
    });
    const result = await promoteToAdmin('target-1', OWNER);
    expect(result).toEqual({ ok: true, already: true });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('lança USER_NOT_FOUND se alvo não existe', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false, data: () => ({}) });
    await expect(promoteToAdmin('ghost', OWNER))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });
});

describe('demoteFromAdmin', () => {
  it('lança NOT_PLATFORM_OWNER se actor não for owner', async () => {
    await expect(demoteFromAdmin('target-1', NON_OWNER_ADMIN))
      .rejects.toMatchObject({ code: 'NOT_PLATFORM_OWNER' });
  });

  it('BLOQUEIA self-demote do owner', async () => {
    const result = await demoteFromAdmin(OWNER.uid, OWNER);
    expect(result.self_demote_blocked).toBe(true);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
    expect(mockCreateAuditLog).not.toHaveBeenCalled();
  });

  it('rebaixa admin e grava audit log', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'platform_admin', email: 'admin@example.com' }),
    });
    const result = await demoteFromAdmin('admin-1', OWNER);
    expect(result).toEqual({ ok: true, already: false });
    const [, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload.role).toBe('user');
    expect(payload.demoted_by).toBe(OWNER.uid);
    expect(mockCreateAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'platform_admin_demoted' }),
    );
  });

  it('retorna already=true se alvo já é user comum', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'user', email: 'someone@example.com' }),
    });
    const result = await demoteFromAdmin('user-1', OWNER);
    expect(result).toEqual({ ok: true, already: true });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

describe('listPlatformAdmins', () => {
  it('lista e ordena por nome/e-mail', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'u2', data: () => ({ email: 'b@example.com', full_name: 'Bruno' }) },
        { id: 'u1', data: () => ({ email: 'a@example.com', full_name: 'Alice' }) },
        { id: 'u3', data: () => ({ email: 'c@example.com', full_name: '' }) },
      ],
    });
    const list = await listPlatformAdmins();
    expect(list.map((u) => u.id)).toEqual(['u1', 'u2', 'u3']);
  });
});
