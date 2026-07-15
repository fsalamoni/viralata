/**
 * @fileoverview Tests do errorTracker (TASK-176).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/core/config/firebase', () => ({ db: {} }));

import {
  captureError, captureMessage, setUser, clearUser,
  getFallbackQueue, clearFallbackQueue, ERROR_TRACKER_CONFIG,
  captureVolunteerError,
} from './errorTracker.js';

describe('errorTracker — captureError (TASK-176)', () => {
  beforeEach(() => {
    clearFallbackQueue();
    vi.clearAllMocks();
  });

  it('captura Error object', () => {
    const err = new Error('test');
    captureError(err, { source: 'unit-test' });
    const q = getFallbackQueue();
    expect(q.length).toBe(1);
    expect(q[0].message).toBe('test');
    expect(q[0].type).toBe('error');
    expect(q[0].context).toEqual({ source: 'unit-test' });
  });

  it('captura string', () => {
    captureError('plain string error', { a: 1 });
    const q = getFallbackQueue();
    expect(q[0].message).toBe('plain string error');
  });

  it('inclui stack quando Error', () => {
    const err = new Error('with stack');
    captureError(err);
    const q = getFallbackQueue();
    expect(q[0].stack).toBeTruthy();
  });

  it('inclui timestamp ISO', () => {
    captureError(new Error('ts'));
    const q = getFallbackQueue();
    expect(q[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('errorTracker — captureVolunteerError (TASK-283)', () => {
  beforeEach(() => {
    clearFallbackQueue();
    vi.clearAllMocks();
  });

  it('captura erro com domain:volunteer na queue', () => {
    captureVolunteerError(new Error('service unavailable'));
    const q = getFallbackQueue();
    expect(q.length).toBe(1);
    expect(q[0].domain).toBe('volunteer');
    expect(q[0].message).toBe('service unavailable');
    expect(q[0].type).toBe('error');
  });

  it('inclui extraContext na fallback queue', () => {
    captureVolunteerError(new Error('boom'), { mutation: 'createParticipation', uid: 'u1' });
    const q = getFallbackQueue();
    expect(q[0].context).toEqual({ mutation: 'createParticipation', uid: 'u1' });
    expect(q[0].domain).toBe('volunteer');
  });

  it('captura string error', () => {
    captureVolunteerError('plain string');
    const q = getFallbackQueue();
    expect(q[0].message).toBe('plain string');
    expect(q[0].domain).toBe('volunteer');
  });

  it('não quebra sem localStorage', () => {
    // Chama sem localStorage — deve ser safe
    const orig = global.localStorage;
    delete global.localStorage;
    expect(() => captureVolunteerError(new Error('no storage'))).not.toThrow();
    global.localStorage = orig;
  });
});

describe('errorTracker — captureMessage', () => {
  beforeEach(() => {
    clearFallbackQueue();
  });

  it('captura info por default', () => {
    captureMessage('hello');
    const q = getFallbackQueue();
    expect(q[0].type).toBe('message');
    expect(q[0].level).toBe('info');
  });

  it('aceita level customizado', () => {
    captureMessage('warning here', 'warning');
    const q = getFallbackQueue();
    expect(q[0].level).toBe('warning');
  });

  it('suporta error level', () => {
    captureMessage('error here', 'error');
    const q = getFallbackQueue();
    expect(q[0].level).toBe('error');
  });
});

describe('errorTracker — setUser/clearUser (Sentry)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('setUser não quebra sem Sentry', () => {
    expect(() => setUser({ uid: 'u1', email: 'a@b.c' })).not.toThrow();
  });

  it('setUser(null) limpa', () => {
    expect(() => setUser(null)).not.toThrow();
  });

  it('clearUser não quebra', () => {
    expect(() => clearUser()).not.toThrow();
  });
});

describe('errorTracker — fallback queue', () => {
  beforeEach(() => {
    clearFallbackQueue();
  });

  it('queue começa vazia', () => {
    expect(getFallbackQueue()).toEqual([]);
  });

  it('queue acumula entries', () => {
    captureError(new Error('e1'));
    captureError(new Error('e2'));
    captureError(new Error('e3'));
    const q = getFallbackQueue();
    expect(q).toHaveLength(3);
  });

  it('queue respeita MAX_QUEUE (FIFO)', () => {
    for (let i = 0; i < ERROR_TRACKER_CONFIG.MAX_QUEUE + 10; i++) {
      captureError(new Error(`e${i}`));
    }
    const q = getFallbackQueue();
    expect(q).toHaveLength(ERROR_TRACKER_CONFIG.MAX_QUEUE);
    // FIFO - primeiras entries saem
    expect(q[0].message).toBe('e10');
  });

  it('clearFallbackQueue limpa tudo', () => {
    captureError(new Error('e1'));
    captureError(new Error('e2'));
    clearFallbackQueue();
    expect(getFallbackQueue()).toEqual([]);
  });
});
