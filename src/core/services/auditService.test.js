/**
 * @fileoverview Testes do auditService — foco em TASK-234:
 * safeCreateAuditLog NUNCA deve engolir erros em silêncio.
 *
 * LGPD Art. 37: o registro de tratamento de dados deve ser observável.
 * Wrapper deve (1) logar via logger.error, (2) incrementar contador,
 * (3) re-lançar o erro.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockCollection = vi.fn();
const mockServerTimestamp = vi.fn(() => ({ _isServerTimestamp: true }));
const mockDb = { _isDb: true };

vi.mock('firebase/firestore', () => ({
  addDoc: (...args) => mockAddDoc(...args),
  collection: (...args) => mockCollection(...args),
  serverTimestamp: () => mockServerTimestamp(),
}));

vi.mock('@/core/config/firebase', () => ({ db: mockDb }));

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};
vi.mock('@/core/lib/logger', () => ({ logger: mockLogger }));

const {
  safeCreateAuditLog,
  getAuditFailureStats,
  __resetAuditFailureCounter,
} = await import('./auditService');

const ACTOR = { uid: 'u-1', displayName: 'Tester', email: 't@x.com' };

beforeEach(() => {
  mockAddDoc.mockReset();
  mockCollection.mockReset();
  Object.values(mockLogger).forEach((fn) => fn.mockReset());
  __resetAuditFailureCounter();
});

describe('safeCreateAuditLog (TASK-234)', () => {
  it('resolve sem erro quando addDoc sucede', async () => {
    mockAddDoc.mockResolvedValue({ id: 'audit-1' });

    await expect(
      safeCreateAuditLog({ action: 'volunteer_joined_shelter', actor: ACTOR, details: { x: 1 } }),
    ).resolves.toEqual({ ok: true });

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('re-lança o erro original quando addDoc falha (NÃO silent)', async () => {
    const err = new Error('firestore offline');
    mockAddDoc.mockRejectedValue(err);

    await expect(
      safeCreateAuditLog({ action: 'volunteer_joined_shelter', actor: ACTOR }),
    ).rejects.toThrow('firestore offline');
  });

  it('loga via logger.error com tag [AUDIT_FAILURE] e action', async () => {
    const err = new Error('quota exceeded');
    mockAddDoc.mockRejectedValue(err);

    await expect(
      safeCreateAuditLog({ action: 'volunteer_check_in', actor: ACTOR }),
    ).rejects.toThrow();

    expect(mockLogger.error).toHaveBeenCalledWith(
      '[AUDIT_FAILURE]',
      expect.objectContaining({
        action: 'volunteer_check_in',
        err: 'quota exceeded',
        stack: expect.any(String),
      }),
    );
  });

  it('incrementa auditFailureCounter.total e byAction[action]', async () => {
    mockAddDoc.mockRejectedValue(new Error('boom'));

    await safeCreateAuditLog({ action: 'volunteer_participation_created', actor: ACTOR })
      .catch(() => {});
    await safeCreateAuditLog({ action: 'volunteer_participation_created', actor: ACTOR })
      .catch(() => {});
    await safeCreateAuditLog({ action: 'volunteer_check_out', actor: ACTOR })
      .catch(() => {});

    const stats = getAuditFailureStats();
    expect(stats.total).toBe(3);
    expect(stats.byAction.volunteer_participation_created).toBe(2);
    expect(stats.byAction.volunteer_check_out).toBe(1);
  });

  it('suporta payload sem action (no-op, sem contagem de falha)', async () => {
    // createAuditLog no-op quando não tem actor/action — não é uma falha,
    // é uma operação intencionalmente ignorada.
    mockAddDoc.mockResolvedValue({ id: 'audit-1' });

    await expect(
      safeCreateAuditLog({ actor: ACTOR }),
    ).resolves.toBeUndefined();

    const stats = getAuditFailureStats();
    expect(stats.total).toBe(0);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });
});
