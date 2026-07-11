/**
 * @fileoverview Testes do trigger de alertas admin (Fase 21).
 */

import { describe, it, expect, beforeEach, beforeAll, afterEach, vi } from 'vitest';

const mockSet = vi.fn();
const mockGet = vi.fn();

const mockCollection = vi.fn(() => {
  const chain = {
    where: vi.fn(function () { return this; }),
    doc: vi.fn(() => ({ set: mockSet, get: mockGet })),
    get: mockGet,
  };
  return chain;
});

const mockDb = { collection: mockCollection, doc: vi.fn() };

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  default: { initializeApp: vi.fn() },
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  default: {
    getFirestore: () => mockDb,
    FieldValue: { serverTimestamp: () => ({ __serverTimestamp: true }) },
  },
}));

let mod;
beforeAll(async () => { mod = await import('./adminAlerts.js'); });

beforeEach(() => {
  mockSet.mockReset().mockResolvedValue(undefined);
  mockGet.mockReset();
  mod.setLogger(null);
});

describe('adminAlerts — pure helpers', () => {
  it('buildSlackPayload inclui emoji, current, threshold', () => {
    const payload = mod.buildSlackPayload({
      type: 'error_rate',
      current_value: 0.12,
      threshold: 0.05,
      severity: 'critical',
      message: 'Boom!',
      created_at_ms: 1_700_000_000_000,
    });
    expect(payload.text).toContain('rotating_light');
    expect(payload.text).toContain('error_rate');
    expect(payload.text).toContain('Boom!');
    expect(payload.attachments[0].fields).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Valor atual', value: '0.12' }),
      expect.objectContaining({ title: 'Threshold', value: '0.05' }),
    ]));
  });

  it('buildSlackPayload usa emoji de warning por padrão', () => {
    const payload = mod.buildSlackPayload({
      type: 'latency_p99',
      current_value: 1500,
      threshold: 1000,
      severity: 'invalid-severity',
      created_at_ms: 1_700_000_000_000,
    });
    expect(payload.text).toContain('warning');
  });

  it('buildEmailBody é texto plain', () => {
    const body = mod.buildEmailBody({
      type: 'uptime',
      current_value: 99.5,
      threshold: 99.9,
      severity: 'warning',
      message: 'SLA em risco',
    });
    expect(body).toContain('Alerta: uptime');
    expect(body).toContain('SLA em risco');
    expect(body).toContain('— Plataforma Viralata');
  });
});

describe('adminAlerts — dispatchChannel', () => {
  it('encaminha para slack', async () => {
    const result = await mod.dispatchChannel('slack', { type: 'x', current_value: 1, threshold: 1 }, [
      { id: 'c1', channels: ['slack'], destination: { slack_webhook_url: 'https://hooks.slack.com/x' } },
    ]);
    expect(result.channel).toBe('slack');
  });

  it('encaminha para email', async () => {
    const result = await mod.dispatchChannel('email', { type: 'x', current_value: 1, threshold: 1 }, [
      { id: 'c1', channels: ['email'], destination: { email_to: 'admin@example.com' } },
    ]);
    expect(result.channel).toBe('email');
    expect(result.ok).toBe(true);
  });

  it('canal desconhecido retorna erro', async () => {
    const result = await mod.dispatchChannel('telegram', {}, []);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('unknown_channel');
  });
});

describe('adminAlerts — dispatchSlack (SLACK_DRY_RUN)', () => {
  beforeEach(() => {
    process.env.SLACK_DRY_RUN = '1';
  });

  afterEach(() => {
    delete process.env.SLACK_DRY_RUN;
  });

  it('retorna dry_run=true sem fazer fetch', async () => {
    const result = await mod.dispatchSlack(
      { type: 'error_rate', current_value: 0.1, threshold: 0.05, severity: 'warning' },
      [{ destination: { slack_webhook_url: 'https://hooks.slack.com/test' } }],
    );
    expect(result.ok).toBe(true);
    expect(result.dry_run).toBe(true);
  });

  it('retorna no_webhook se nenhuma config tem url', async () => {
    const result = await mod.dispatchSlack(
      { type: 'error_rate', current_value: 0.1, threshold: 0.05 },
      [{ destination: {} }],
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_webhook');
  });
});

describe('adminAlerts — dispatchEmail (stub)', () => {
  it('retorna ok=true com lista de recipients', async () => {
    const result = await mod.dispatchEmail(
      { type: 'error_rate', current_value: 0.1, threshold: 0.05, severity: 'critical', message: 'msg' },
      [{ destination: { email_to: ['a@example.com', 'b@example.com'] } }],
    );
    expect(result.ok).toBe(true);
    expect(result.stub).toBe(true);
    expect(result.recipients).toEqual(['a@example.com', 'b@example.com']);
  });

  it('suporta email_to como string', async () => {
    const result = await mod.dispatchEmail(
      { type: 'error_rate', current_value: 0.1, threshold: 0.05 },
      [{ destination: { email_to: 'admin@example.com' } }],
    );
    expect(result.recipients).toEqual(['admin@example.com']);
  });

  it('retorna no_recipients se vazio', async () => {
    const result = await mod.dispatchEmail(
      { type: 'error_rate', current_value: 0.1, threshold: 0.05 },
      [{ destination: { email_to: '' } }],
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_recipients');
  });
});

describe('adminAlerts — runOnPlatformAlertEvent (integration)', () => {
  // Os 2 end-to-end tests rodam `runOnPlatformAlertEvent` que
  // internamente faz `loadConfigsForType` (já testado) e
  // `markEventStatus` (já testado). Aqui testamos `markEventStatus`
  // isoladamente — é o que interage com `mockSet` no caminho
  // "no_config".

  it('markEventStatus grava status e updated_at', async () => {
    await mod.markEventStatus('evt-1', 'no_config', {}, mockDb);
    expect(mockSet).toHaveBeenCalledTimes(1);
    const [payload, options] = mockSet.mock.calls[0];
    expect(payload.status).toBe('no_config');
    expect(payload.updated_at).toBeDefined();
    expect(options).toEqual({ merge: true });
  });

  it('markEventStatus aceita extra fields', async () => {
    await mod.markEventStatus('evt-2', 'sent', { channels: ['slack'], results: [{ channel: 'slack', ok: true }] }, mockDb);
    const [payload] = mockSet.mock.calls[0];
    expect(payload.status).toBe('sent');
    expect(payload.channels).toEqual(['slack']);
    expect(payload.results).toEqual([{ channel: 'slack', ok: true }]);
  });

  it('runOnPlatformAlertEvent marca como "no_config" sem configs', async () => {
    mockGet.mockResolvedValueOnce({ empty: true, docs: [] });
    await mod.runOnPlatformAlertEvent({
      params: { eventId: 'evt-1' },
      data: () => ({ type: 'error_rate', current_value: 0.1, threshold: 0.05 }),
    }, mockDb);
    expect(mockSet).toHaveBeenCalled();
    const [payload] = mockSet.mock.calls[0];
    expect(payload.status).toBe('no_config');
  });

  it('runOnPlatformAlertEvent dispara canais e marca "sent"', async () => {
    process.env.SLACK_DRY_RUN = '1';
    mockGet.mockResolvedValueOnce({
      empty: false,
      docs: [{
        id: 'cfg-1',
        data: () => ({
          type: 'error_rate',
          enabled: true,
          channels: ['slack', 'email'],
          destination: {
            slack_webhook_url: 'https://hooks.slack.com/test',
            email_to: 'admin@example.com',
          },
        }),
      }],
    });

    await mod.runOnPlatformAlertEvent({
      params: { eventId: 'evt-1' },
      data: () => ({
        type: 'error_rate', current_value: 0.1, threshold: 0.05,
        severity: 'critical', message: 'Boom',
      }),
    }, mockDb);

    expect(mockSet).toHaveBeenCalled();
    const lastPayload = mockSet.mock.calls[mockSet.mock.calls.length - 1][0];
    expect(lastPayload.status).toBe('sent');
    delete process.env.SLACK_DRY_RUN;
  });
});
