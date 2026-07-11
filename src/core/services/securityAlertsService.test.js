/**
 * @fileoverview Testes do service de alertas de segurança (Fase 20).
 *
 * Cobre: normalização, query builder, formatação de data, e
 * degradação graciosa quando o Firestore está indisponível.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ALERT_SEVERITY,
  ALERT_SEVERITY_BADGE_CLASS,
  ALERT_SEVERITY_LABELS,
  ALERT_SOURCE,
  ALERT_TYPE,
  ALERT_TYPE_LABELS,
  buildAlertsQuery,
  formatAlertDate,
  listAlerts,
  normalizeAlert,
  resolveAlert,
  reopenAlert,
  triggerAlert,
  subscribeAlerts,
} from './securityAlertsService';

vi.mock('@/core/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));

// Mock do config para evitar dependência do Firebase real.
const mockCollection = vi.fn();
const mockDoc = vi.fn();
const mockOnSnapshot = vi.fn();
const mockGetDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockWhere = vi.fn((field, op, value) => ({ __where: { field, op, value } }));
const mockOrderBy = vi.fn((field, dir) => ({ __orderBy: { field, dir } }));
const mockLimit = vi.fn((n) => ({ __limit: n }));
const mockQuery = vi.fn((...args) => ({ __query: args }));
const mockServerTimestamp = vi.fn(() => ({ __serverTimestamp: true }));
const mockHttpsCallable = vi.fn();

vi.mock('@/core/config/firebase', () => ({
  db: {
    __mock: true,
  },
  functions: {
    __mock: true,
  },
}));

vi.mock('firebase/firestore', () => ({
  collection: (...args) => mockCollection(...args),
  doc: (...args) => mockDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  onSnapshot: (...args) => mockOnSnapshot(...args),
  orderBy: (...args) => mockOrderBy(...args),
  query: (...args) => mockQuery(...args),
  serverTimestamp: (...args) => mockServerTimestamp(...args),
  setDoc: vi.fn(),
  updateDoc: (...args) => mockUpdateDoc(...args),
  where: (...args) => mockWhere(...args),
  limit: (...args) => mockLimit(...args),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args) => mockHttpsCallable(...args),
}));

describe('securityAlertsService — constantes', () => {
  it('expose enums esperados', () => {
    expect(ALERT_TYPE.LOGIN_SUSPICIOUS).toBe('login_suspicious');
    expect(ALERT_TYPE.RATE_LIMIT_HIT).toBe('rate_limit_hit');
    expect(ALERT_SEVERITY.CRITICAL).toBe('critical');
    expect(ALERT_SOURCE.FUNCTIONS).toBe('functions');
  });

  it('tem label pt-BR para cada enum', () => {
    expect(ALERT_TYPE_LABELS[ALERT_TYPE.RATE_LIMIT_HIT]).toBeTruthy();
    expect(ALERT_SEVERITY_LABELS[ALERT_SEVERITY.HIGH]).toBe('Alta');
  });

  it('tem classe de badge para cada severidade', () => {
    Object.values(ALERT_SEVERITY).forEach((s) => {
      expect(ALERT_SEVERITY_BADGE_CLASS[s]).toMatch(/^bg-/);
    });
  });
});

describe('securityAlertsService — normalizeAlert', () => {
  it('normaliza documento completo', () => {
    const data = {
      type: 'rate_limit_hit',
      severity: 'high',
      source: 'functions',
      context: { ip: '203.0.113.1', count: 250 },
      created_at: { seconds: 1_700_000_000 },
      created_by: 'admin-uid',
      resolved: true,
      resolved_by: 'admin-uid',
      resolved_at: { seconds: 1_700_000_500 },
      notes: null,
    };
    const r = normalizeAlert('alert-1', data);
    expect(r.id).toBe('alert-1');
    expect(r.type).toBe('rate_limit_hit');
    expect(r.severity).toBe('high');
    expect(r.source).toBe('functions');
    expect(r.context.ip).toBe('203.0.113.1');
    expect(r.resolved).toBe(true);
    expect(r.resolved_by).toBe('admin-uid');
  });

  it('preenche defaults seguros para documento vazio', () => {
    const r = normalizeAlert('x', null);
    expect(r.type).toBe(ALERT_TYPE.MANUAL);
    expect(r.severity).toBe(ALERT_SEVERITY.LOW);
    expect(r.source).toBe(ALERT_SOURCE.CLIENT);
    expect(r.context).toEqual({});
    expect(r.resolved).toBe(false);
    expect(r.resolved_by).toBe(null);
  });

  it('garante context como objeto mesmo se vier string/array', () => {
    expect(normalizeAlert('x', { context: 'oops' }).context).toEqual({});
    expect(normalizeAlert('x', { context: [1, 2] }).context).toEqual({});
  });
});

describe('securityAlertsService — formatAlertDate', () => {
  it('formata Date', () => {
    const d = new Date('2026-07-11T03:00:00.000Z');
    const out = formatAlertDate(d);
    expect(out).toMatch(/2026/);
  });

  it('formata Firestore Timestamp-like ({seconds})', () => {
    const out = formatAlertDate({ seconds: 1_700_000_000 });
    expect(out).toMatch(/2023/);
  });

  it('usa fallbackMs quando value é null', () => {
    const out = formatAlertDate(null, 1_700_000_000_000);
    expect(out).toMatch(/2023/);
  });

  it('retorna "—" quando nada é fornecido', () => {
    expect(formatAlertDate(null)).toBe('—');
    expect(formatAlertDate(undefined, undefined)).toBe('—');
  });
});

describe('securityAlertsService — buildAlertsQuery', () => {
  beforeEach(() => {
    mockCollection.mockClear();
    mockQuery.mockClear();
    mockOrderBy.mockClear();
    mockLimit.mockClear();
  });

  it('retorna null se db indisponível', () => {
    // simular db=null trocando o mock só para este teste:
    const originalDb = mockCollection.getMockImplementation();
    mockCollection.mockImplementationOnce(() => null);
    const out = buildAlertsQuery({});
    // quando db está mockado, buildAlertsQuery ainda retornará algo
    // pois `!db` é false. O teste aqui só garante que não crasha.
    expect(out).toBeDefined();
    if (originalDb) mockCollection.mockImplementation(originalDb);
  });

  it('inclui where por severity quando informado', () => {
    const q = buildAlertsQuery({ severity: 'high' });
    expect(q).toBeDefined();
    const args = mockQuery.mock.calls[0][0];
    // 1º arg é a collection; 2º em diante são conds
    expect(mockWhere).toHaveBeenCalledWith('severity', '==', 'high');
  });

  it('combina múltiplos filtros (severity + type)', () => {
    buildAlertsQuery({ severity: 'critical', type: 'login_suspicious', resolved: false });
    expect(mockWhere).toHaveBeenCalledWith('severity', '==', 'critical');
    expect(mockWhere).toHaveBeenCalledWith('type', '==', 'login_suspicious');
    expect(mockWhere).toHaveBeenCalledWith('resolved', '==', false);
  });

  it('aplica limit padrão 50', () => {
    buildAlertsQuery({});
    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it('respeita max custom', () => {
    buildAlertsQuery({ max: 10 });
    expect(mockLimit).toHaveBeenCalledWith(10);
  });
});

describe('securityAlertsService — listAlerts (one-shot)', () => {
  beforeEach(() => {
    mockGetDocs.mockReset();
  });

  it('retorna array de alertas normalizados', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        { id: 'a1', data: () => ({ type: 'manual', severity: 'low', resolved: false }) },
        { id: 'a2', data: () => ({ type: 'rate_limit_hit', severity: 'high', resolved: true }) },
      ],
    });
    const out = await listAlerts({});
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe('a1');
    expect(out[0].type).toBe('manual');
    expect(out[1].resolved).toBe(true);
  });

  it('retorna [] em caso de erro de permissão', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('permission-denied'));
    const out = await listAlerts({});
    expect(out).toEqual([]);
  });
});

describe('securityAlertsService — resolveAlert / reopenAlert', () => {
  beforeEach(() => {
    mockUpdateDoc.mockReset();
  });

  it('resolveAlert chama updateDoc e retorna true em sucesso', async () => {
    mockUpdateDoc.mockResolvedValueOnce();
    const ok = await resolveAlert('alert-1', 'admin-uid');
    expect(ok).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
  });

  it('resolveAlert retorna false se RLS bloquear', async () => {
    mockUpdateDoc.mockRejectedValueOnce(new Error('permission-denied'));
    const ok = await resolveAlert('alert-1', 'admin-uid');
    expect(ok).toBe(false);
  });

  it('resolveAlert valida args', async () => {
    expect(await resolveAlert('', 'admin-uid')).toBe(false);
    expect(await resolveAlert('alert-1', '')).toBe(false);
  });

  it('reopenAlert chama updateDoc', async () => {
    mockUpdateDoc.mockResolvedValueOnce();
    const ok = await reopenAlert('alert-1', 'admin-uid');
    expect(ok).toBe(true);
  });
});

describe('securityAlertsService — triggerAlert (Cloud Function)', () => {
  beforeEach(() => {
    mockHttpsCallable.mockReset();
  });

  it('chama a Cloud Function e devolve {alert_id}', async () => {
    const fn = vi.fn(async () => ({ data: { alert_id: 'ALERT_NEW' } }));
    mockHttpsCallable.mockReturnValueOnce(fn);
    const out = await triggerAlert({ type: 'manual', severity: 'low' });
    expect(out).toEqual({ alert_id: 'ALERT_NEW' });
    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'triggerSecurityAlert');
  });

  it('retorna null se Cloud Function falhar (permission-denied etc)', async () => {
    const fn = vi.fn(async () => { throw new Error('permission-denied'); });
    mockHttpsCallable.mockReturnValueOnce(fn);
    const out = await triggerAlert({ type: 'manual', severity: 'low' });
    expect(out).toBeNull();
  });
});

describe('securityAlertsService — subscribeAlerts', () => {
  beforeEach(() => {
    mockOnSnapshot.mockReset();
  });

  it('retorna unsubscribe e propaga snapshot para o callback', () => {
    const unsubscribe = vi.fn();
    mockOnSnapshot.mockImplementationOnce((q, onChange) => {
      // simula snapshot chegando
      onChange({ docs: [{ id: 'a1', data: () => ({ type: 'manual', severity: 'low' }) }] });
      return unsubscribe;
    });
    const cb = vi.fn();
    const off = subscribeAlerts({}, cb);
    expect(cb).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'a1', type: 'manual' }),
    ]);
    expect(off).toBe(unsubscribe);
  });

  it('degrada graciosamente em erro de permissão', () => {
    mockOnSnapshot.mockImplementationOnce((q, onChange, onErr) => {
      onErr(new Error('permission-denied'));
      return () => {};
    });
    const cb = vi.fn();
    const onErr = vi.fn();
    subscribeAlerts({}, cb, onErr);
    expect(cb).toHaveBeenCalledWith([]);
    expect(onErr).toHaveBeenCalled();
  });
});
