/**
 * @fileoverview Tests do rateLimitService (TASK-299).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/core/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// Mock localStorage
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStorage.get(k) || null,
  setItem: (k, v) => mockStorage.set(k, v),
  removeItem: (k) => mockStorage.delete(k),
  clear: () => mockStorage.clear(),
};

import {
  check, checkRate, reset, resetAll, inspect, formatRetryIn, RATE_LIMITS,
} from './rateLimitService';

describe('rateLimitService — check', () => {
  beforeEach(() => {
    resetAll();
    mockStorage.clear();
  });

  it('permite até max mutations', () => {
    for (let i = 0; i < 3; i++) {
      const r = check('test:user1', 3, 1000);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(3 - i);
    }
  });

  it('bloqueia após max mutations', () => {
    for (let i = 0; i < 3; i++) check('test:user2', 3, 1000);
    const r = check('test:user2', 3, 1000);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryInMs).toBeGreaterThan(0);
  });

  it('sliding window — após windowMs, libera', () => {
    for (let i = 0; i < 3; i++) check('test:user3', 3, 50);
    expect(check('test:user3', 3, 50).allowed).toBe(false);
    // Esperar 60ms
    return new Promise((resolve) => {
      setTimeout(() => {
        expect(check('test:user3', 3, 50).allowed).toBe(true);
        resolve();
      }, 60);
    });
  });

  it('chaves diferentes têm contadores independentes', () => {
    for (let i = 0; i < 3; i++) check('test:user4', 3, 1000);
    expect(check('test:user5', 3, 1000).allowed).toBe(true);
    expect(check('test:user4', 3, 1000).allowed).toBe(false);
  });
});

describe('rateLimitService — checkRate (RATE_LIMITS)', () => {
  beforeEach(() => {
    resetAll();
  });

  it('RATE_LIMITS tem 7 ações pré-definidas', () => {
    expect(Object.keys(RATE_LIMITS).length).toBe(7);
  });

  it('adoption_application = 5/min', () => {
    const limit = RATE_LIMITS.adoption_application;
    expect(limit.max).toBe(5);
    expect(limit.windowMs).toBe(60_000);
  });

  it('lgpd_export = 3/h', () => {
    const limit = RATE_LIMITS.lgpd_export;
    expect(limit.max).toBe(3);
    expect(limit.windowMs).toBe(3_600_000);
  });

  it('ação desconhecida = allow', () => {
    const r = checkRate('unknown_action', 'u1');
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(Infinity);
  });

  it('checkRate usa key composto (action:scope)', () => {
    checkRate('adoption_application', 'userA');
    checkRate('adoption_application', 'userA');
    expect(inspect('adoption_application:userA').count).toBe(2);
    expect(inspect('adoption_application:userB').count).toBe(0);
  });
});

describe('rateLimitService — helpers', () => {
  it('formatRetryIn: < 1s = "em instantes"', () => {
    expect(formatRetryIn(500)).toBe('em instantes');
  });

  it('formatRetryIn: < 60s = "em Xs"', () => {
    expect(formatRetryIn(5000)).toBe('em 5s');
  });

  it('formatRetryIn: >= 60s = "em Xmin"', () => {
    expect(formatRetryIn(120_000)).toBe('em 2min');
  });

  it('reset remove contador de uma key', () => {
    check('test', 1, 1000);
    check('test', 1, 1000);
    expect(check('test', 1, 1000).allowed).toBe(false);
    reset('test');
    expect(check('test', 1, 1000).allowed).toBe(true);
  });
});

describe('rateLimitService — inspect', () => {
  beforeEach(() => resetAll());

  it('retorna count e timestamps', () => {
    check('test:inspect', 5, 60_000);
    check('test:inspect', 5, 60_000);
    const info = inspect('test:inspect');
    expect(info.count).toBe(2);
    expect(info.oldest).toBeGreaterThan(0);
    expect(info.newest).toBeGreaterThan(0);
  });
});
