/**
 * @fileoverview Testes do `securityAlerts` (createSecurityAlertRecord e
 * validateAlertPayload).
 *
 * O Cloud Function `triggerSecurityAlert` é testado indiretamente via
 * `createSecurityAlertRecord` (núcleo puro, sem dependência do
 * firebase-functions/v2 onCall).
 */

import { describe, it, expect, vi } from 'vitest';
import {
  validateAlertPayload,
  createSecurityAlertRecord,
  ALLOWED_TYPES,
  ALLOWED_SEVERITIES,
  ALLOWED_SOURCES,
} from './securityAlertsCore';

describe('validateAlertPayload', () => {
  it('aceita payload mínimo válido (type + severity)', () => {
    const r = validateAlertPayload({ type: 'manual', severity: 'low' });
    expect(r.ok).toBe(true);
    expect(r.value).toEqual({
      type: 'manual',
      severity: 'low',
      source: 'client',
      context: {},
    });
  });

  it('aceita payload completo com context rico', () => {
    const r = validateAlertPayload({
      type: 'rate_limit_hit',
      severity: 'high',
      source: 'functions',
      context: { ip: '203.0.113.5', route: '/googleFormsWebhook', count: 250 },
    });
    expect(r.ok).toBe(true);
    expect(r.value.context.ip).toBe('203.0.113.5');
  });

  it('rejeita payload que não é objeto', () => {
    expect(validateAlertPayload(null).ok).toBe(false);
    expect(validateAlertPayload(undefined).ok).toBe(false);
    expect(validateAlertPayload('string').ok).toBe(false);
  });

  it('rejeita type inválido', () => {
    const r = validateAlertPayload({ type: 'nope', severity: 'low' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/type inválido/);
  });

  it('rejeita severity inválida', () => {
    const r = validateAlertPayload({ type: 'manual', severity: 'superhigh' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/severity inválida/);
  });

  it('rejeita source inválido', () => {
    const r = validateAlertPayload({ type: 'manual', severity: 'low', source: 'alien' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/source inválido/);
  });

  it('rejeita context que não é objeto', () => {
    const r = validateAlertPayload({ type: 'manual', severity: 'low', context: 'not-an-object' });
    expect(r.ok).toBe(false);
  });

  it('rejeita context que é array', () => {
    const r = validateAlertPayload({ type: 'manual', severity: 'low', context: [] });
    expect(r.ok).toBe(false);
  });
});

describe('createSecurityAlertRecord', () => {
  function makeMockDb() {
    const setMock = vi.fn(() => Promise.resolve());
    const docMock = vi.fn(() => ({ id: 'AUTO_ID_42', set: setMock }));
    const collectionMock = vi.fn(() => ({ doc: docMock }));
    return { db: { collection: collectionMock }, setMock, docMock, collectionMock };
  }

  it('cria o documento com schema correto e caller_uid no context', async () => {
    const { db, setMock, docMock, collectionMock } = makeMockDb();
    const result = await createSecurityAlertRecord({
      callerUid: 'admin-uid-1',
      alert: {
        type: 'rate_limit_hit',
        severity: 'high',
        source: 'functions',
        context: { ip: '203.0.113.5' },
      },
      db,
      idGenerator: () => 'SEC_ALERT_001',
    });

    expect(result).toEqual({ alert_id: 'SEC_ALERT_001' });
    expect(collectionMock).toHaveBeenCalledWith('platform_security_alerts');
    expect(docMock).toHaveBeenCalled();
    expect(setMock).toHaveBeenCalledTimes(1);

    const arg = setMock.mock.calls[0][0];
    expect(arg.type).toBe('rate_limit_hit');
    expect(arg.severity).toBe('high');
    expect(arg.source).toBe('functions');
    expect(arg.resolved).toBe(false);
    expect(arg.created_by).toBe('admin-uid-1');
    expect(arg.context.ip).toBe('203.0.113.5');
    expect(arg.context.caller_uid).toBe('admin-uid-1');
    // serverTimestamp é um sentinel — apenas checamos que está presente.
    expect(arg.created_at).toBeDefined();
  });

  it('preserva user_id do context original E adiciona caller_uid', async () => {
    const { db, setMock } = makeMockDb();
    await createSecurityAlertRecord({
      callerUid: 'admin-uid-1',
      alert: {
        type: 'login_suspicious',
        severity: 'critical',
        source: 'auth',
        context: { user_id: 'user-123', ip: '198.51.100.1' },
      },
      db,
      idGenerator: () => 'SEC_ALERT_002',
    });

    const arg = setMock.mock.calls[0][0];
    expect(arg.context.user_id).toBe('user-123');
    expect(arg.context.caller_uid).toBe('admin-uid-1');
    expect(arg.context.ip).toBe('198.51.100.1');
  });

  it('rejeita se callerUid vazio', async () => {
    const { db } = makeMockDb();
    await expect(
      createSecurityAlertRecord({
        callerUid: '',
        alert: { type: 'manual', severity: 'low', source: 'client', context: {} },
        db,
      }),
    ).rejects.toThrow(/callerUid/);
  });

  it('usa o idGenerator quando fornecido (para previsibilidade de teste)', async () => {
    const { db, docMock } = makeMockDb();
    const idGen = vi.fn((label) => `${label}-xyz`);
    const r = await createSecurityAlertRecord({
      callerUid: 'admin-1',
      alert: { type: 'manual', severity: 'low', source: 'client', context: {} },
      db,
      idGenerator: idGen,
    });
    expect(idGen).toHaveBeenCalledWith('sec_alert');
    expect(r.alert_id).toBe('sec_alert-xyz');
    // docMock É chamado com o id injetado (para abrir o doc e gravar)
    expect(docMock).toHaveBeenCalledWith('sec_alert-xyz');
  });
});

describe('constantes de allowed values', () => {
  it('expose os enums esperados', () => {
    expect(ALLOWED_TYPES.has('login_suspicious')).toBe(true);
    expect(ALLOWED_TYPES.has('rate_limit_hit')).toBe(true);
    expect(ALLOWED_TYPES.has('manual')).toBe(true);
    expect(ALLOWED_SEVERITIES.has('critical')).toBe(true);
    expect(ALLOWED_SOURCES.has('client')).toBe(true);
    expect(ALLOWED_SOURCES.has('functions')).toBe(true);
  });
});
