/**
 * @fileoverview Testes do adminAlertsService — Fase 21.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAddDoc = vi.fn();
const mockUpdateDoc = vi.fn();
const mockDeleteDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockCollection = vi.fn((db, name) => ({
  where: vi.fn(() => ({
    where: vi.fn(() => ({
      get: mockGetDocs,
    })),
    get: mockGetDocs,
  })),
  orderBy: vi.fn(() => ({
    get: mockGetDocs,
  })),
  add: (...args) => mockAddDoc(...args),
  doc: vi.fn(() => ({ update: mockUpdateDoc, set: vi.fn() })),
}));
const mockDoc = vi.fn(() => ({
  update: mockUpdateDoc,
  set: vi.fn(),
  delete: mockDeleteDoc,
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  doc: mockDoc,
  addDoc: (...args) => mockAddDoc(...args),
  updateDoc: (...args) => mockUpdateDoc(...args),
  deleteDoc: (...args) => mockDeleteDoc(...args),
  getDocs: (...args) => mockGetDocs(...args),
  setDoc: vi.fn(),
  query: (...args) => ({ __query: true, args }),
  where: (...args) => ({ __where: true, args }),
  orderBy: (...args) => ({ __orderBy: true, args }),
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
  ALERT_TYPES,
  ALERT_CHANNELS,
  normalizeAlertConfig,
  configureAlert,
  updateAlert,
  setAlertEnabled,
  deleteAlert,
  getAlertConfigs,
  getAlertConfigsByType,
  triggerAlert,
  evaluateAlerts,
  getAlertEvents,
} = await import('./adminAlertsService.js');

beforeEach(() => {
  vi.clearAllMocks();
  mockAddDoc.mockResolvedValue({ id: 'config-1' });
  mockUpdateDoc.mockResolvedValue(undefined);
  mockDeleteDoc.mockResolvedValue(undefined);
  mockCreateAuditLog.mockReset();
  mockCreateAuditLog.mockResolvedValue(undefined);
});

describe('constants', () => {
  it('expõe os tipos e canais canônicos', () => {
    expect(ALERT_TYPES.ERROR_RATE).toBe('error_rate');
    expect(ALERT_TYPES.LATENCY_P99).toBe('latency_p99');
    expect(ALERT_TYPES.BILLING).toBe('billing');
    expect(ALERT_CHANNELS.SLACK).toBe('slack');
    expect(ALERT_CHANNELS.EMAIL).toBe('email');
  });
});

describe('normalizeAlertConfig', () => {
  it('normaliza payload válido', () => {
    const result = normalizeAlertConfig({
      type: 'error_rate',
      channels: ['slack', 'email'],
      threshold: 0.05,
      destination: {
        slack_webhook_url: 'https://hooks.slack.com/services/X',
        email_to: 'admin@example.com',
      },
      enabled: true,
      description: 'Alerta de error rate > 5%',
    });
    expect(result.type).toBe('error_rate');
    expect(result.channels).toEqual(['slack', 'email']);
    expect(result.threshold).toBe(0.05);
    expect(result.destination.slack_webhook_url).toContain('hooks.slack.com');
    expect(result.enabled).toBe(true);
  });

  it('lança erro para tipo inválido', () => {
    expect(() =>
      normalizeAlertConfig({ type: 'foo', channels: ['slack'], threshold: 1, destination: { slack_webhook_url: 'x' } })
    ).toThrow(/Tipo de alerta inválido/);
  });

  it('lança erro para canal inválido', () => {
    expect(() =>
      normalizeAlertConfig({ type: 'error_rate', channels: ['telegram'], threshold: 1 })
    ).toThrow(/Canal de alerta inválido/);
  });

  it('lança erro se slack sem webhook url', () => {
    expect(() =>
      normalizeAlertConfig({ type: 'error_rate', channels: ['slack'], threshold: 1 })
    ).toThrow(/requer destination\.slack_webhook_url/);
  });

  it('lança erro se email sem destinatário', () => {
    expect(() =>
      normalizeAlertConfig({ type: 'error_rate', channels: ['email'], threshold: 1 })
    ).toThrow(/requer destination\.email_to/);
  });

  it('lança erro para threshold negativo', () => {
    expect(() =>
      normalizeAlertConfig({
        type: 'error_rate', channels: ['slack'], threshold: -1,
        destination: { slack_webhook_url: 'x' },
      })
    ).toThrow(/Threshold/);
  });
});

describe('CRUD de configs', () => {
  it('configureAlert chama addDoc com payload normalizado', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-id' });
    const result = await configureAlert({
      type: 'latency_p99',
      channels: ['email'],
      threshold: 1500,
      destination: { email_to: 'admin@example.com' },
    }, { uid: 'u-1' });
    expect(result.id).toBe('new-id');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.type).toBe('latency_p99');
    expect(payload.threshold).toBe(1500);
    expect(payload.created_by).toBe('u-1');
  });

  it('updateAlert chama updateDoc', async () => {
    await updateAlert('cfg-1', {
      type: 'uptime',
      channels: ['slack'],
      threshold: 99.5,
      destination: { slack_webhook_url: 'https://hooks.slack.com/X' },
    }, { uid: 'u-2' });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [ref, payload] = mockUpdateDoc.mock.calls[0];
    expect(ref).toBeDefined();
    expect(payload.type).toBe('uptime');
    expect(payload.updated_by).toBe('u-2');
  });

  it('setAlertEnabled liga/desliga o alerta', async () => {
    await setAlertEnabled('cfg-1', true);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload.enabled).toBe(true);
  });

  it('deleteAlert chama deleteDoc', async () => {
    await deleteAlert('cfg-1');
    expect(mockDeleteDoc).toHaveBeenCalledTimes(1);
  });
});

describe('getAlertConfigs / getAlertConfigsByType', () => {
  it('lista todas as configs', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'c1', data: () => ({ type: 'error_rate', threshold: 0.05, enabled: true }) },
        { id: 'c2', data: () => ({ type: 'latency_p99', threshold: 1000, enabled: false }) },
      ],
    });
    const list = await getAlertConfigs();
    expect(list).toHaveLength(2);
    expect(list[0].id).toBe('c1');
  });

  it('filtra configs ativas por tipo', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'c1', data: () => ({ type: 'error_rate', threshold: 0.05, enabled: true }) },
      ],
    });
    const list = await getAlertConfigsByType('error_rate');
    expect(list).toHaveLength(1);
  });
});

describe('triggerAlert / evaluateAlerts', () => {
  it('triggerAlert grava evento com current_value e threshold', async () => {
    mockAddDoc.mockResolvedValue({ id: 'evt-1' });
    const result = await triggerAlert({
      type: 'error_rate',
      current_value: 0.12,
      threshold: 0.05,
      severity: 'critical',
      message: 'Boom',
    });
    expect(result.id).toBe('evt-1');
    expect(result.current_value).toBe(0.12);
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.severity).toBe('critical');
    expect(payload.status).toBe('pending');
  });

  it('triggerAlert normaliza severity inválida para warning', async () => {
    mockAddDoc.mockResolvedValue({ id: 'evt-1' });
    await triggerAlert({
      type: 'error_rate', current_value: 0.06, threshold: 0.05,
      severity: 'giga-critical',
    });
    const [, payload] = mockAddDoc.mock.calls[0];
    expect(payload.severity).toBe('warning');
  });

  it('evaluateAlerts dispara apenas quando value >= threshold', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'c1', data: () => ({ type: 'error_rate', threshold: 0.05, enabled: true }) },
        { id: 'c2', data: () => ({ type: 'error_rate', threshold: 0.20, enabled: true }) },
      ],
    });
    mockAddDoc.mockResolvedValue({ id: 'evt-x' });
    const { triggered } = await evaluateAlerts('error_rate', 0.08);
    expect(triggered).toHaveLength(1);
    expect(triggered[0].current_value).toBe(0.08);
  });
});

describe('getAlertEvents', () => {
  it('retorna os eventos mais recentes', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'e1', data: () => ({ type: 'error_rate', created_at_ms: 100 }) },
        { id: 'e2', data: () => ({ type: 'uptime', created_at_ms: 200 }) },
      ],
    });
    const events = await getAlertEvents({ limit: 10 });
    expect(events).toHaveLength(2);
    expect(events[1].id).toBe('e2');
  });
});
